import type { Commune, ParametresBien, ParametresPret, ParametresUtilisateur, Resultats } from '@/types';
import { simuler } from './simulation';
import {
  DUREES_OPTIMIZER,
  ENDETTEMENT_MAX_POURCENT,
  POIDS_MENSUALITE_COMPROMIS,
  TAUX_INDICATIFS,
} from './constants';

/**
 * Critères d'optimisation supportés par `trouverScenarioOptimal`.
 *  - `cout_total`        : minimise le coût total du crédit.
 *  - `interets_min`      : minimise les intérêts payés.
 *  - `mensualite_cible`  : se rapproche le plus possible d'une mensualité cible.
 *  - `compromis_ptz`     : optimum mixte pondéré (intérêts + 60 × mensualité).
 */
export type CritereOptimisation = 'cout_total' | 'interets_min' | 'mensualite_cible' | 'compromis_ptz';

/**
 * Résultat retourné par l'optimiseur : scénario complet (paramètres + résultats),
 * son score et un libellé descriptif lisible.
 */
export interface ScenarioOptimal {
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
  resultats: Resultats;
  score: number;
  description: string;
}

/**
 * Cherche le meilleur scénario en explorant la grille (durée × PTZ on/off).
 *
 * Logique :
 *  1. Pour chaque durée de `DUREES_OPTIMIZER` et chaque variante PTZ on/off,
 *     on simule avec le taux indicatif marché correspondant.
 *  2. On filtre les scénarios non viables (HCSF > 35 % ou cash résiduel < 0).
 *  3. On score selon le critère choisi (plus haut = mieux).
 *  4. On renvoie le meilleur, ou un scénario par défaut si aucun n'est viable.
 *
 * Garde les contraintes utilisateur (apport / salaire) intactes.
 *
 * @param utilisateur     Paramètres foyer.
 * @param bien            Paramètres bien.
 * @param pret            Paramètres prêt courants (utilisés comme base).
 * @param commune         Commune ciblée.
 * @param critere         Critère d'optimisation.
 * @param mensualiteCible Cible utilisée seulement si `critere = 'mensualite_cible'`.
 * @returns Le scénario optimal trouvé (ou le scénario courant en fallback).
 */
export function trouverScenarioOptimal(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune,
  critere: CritereOptimisation,
  mensualiteCible: number = 0
): ScenarioOptimal {
  const ptzOptions: readonly boolean[] = [true, false] as const;
  const candidats: ScenarioOptimal[] = [];

  for (const duree of DUREES_OPTIMIZER) {
    for (const ptzActif of ptzOptions) {
      const tauxAuto = TAUX_INDICATIFS[duree] ?? pret.taux_annuel;
      const pretCandidat: ParametresPret = {
        ...pret,
        duree_annees: duree,
        taux_annuel: tauxAuto,
        ptz_actif: ptzActif,
        ptz_montant: undefined, // laisse le moteur prendre le max
      };

      const resultats = simuler(utilisateur, bien, pretCandidat, commune);

      // Filtre HCSF
      if (resultats.taux_endettement > ENDETTEMENT_MAX_POURCENT) continue;
      if (resultats.cash_restant_apres_achat < 0) continue;

      const { score, description } = scoreCandidat(critere, resultats, duree, ptzActif, mensualiteCible);

      candidats.push({
        utilisateur,
        bien,
        pret: pretCandidat,
        resultats,
        score,
        description,
      });
    }
  }

  if (candidats.length === 0) {
    // Aucun scénario viable — renvoie le scénario courant
    return {
      utilisateur,
      bien,
      pret,
      resultats: simuler(utilisateur, bien, pret, commune),
      score: 0,
      description: 'Aucun scénario optimal trouvé sous les contraintes (taux d\'endettement / apport).',
    };
  }

  candidats.sort((a, b) => b.score - a.score);
  return candidats[0];
}

/**
 * Calcule le score et le libellé d'un candidat selon le critère choisi.
 *
 * Convention : un score plus élevé = meilleur candidat. Pour les critères
 * "minimisation", on renvoie l'opposé de la grandeur à minimiser.
 */
function scoreCandidat(
  critere: CritereOptimisation,
  resultats: Resultats,
  duree: number,
  ptzActif: boolean,
  mensualiteCible: number
): { score: number; description: string } {
  const suffixePtz = ptzActif ? ' avec PTZ' : '';
  switch (critere) {
    case 'cout_total':
      return {
        score: -resultats.cout_total_credit,
        description: `Coût total ${formatEuro(resultats.cout_total_credit)} sur ${duree} ans${suffixePtz}`,
      };
    case 'interets_min':
      return {
        score: -resultats.interets_totaux,
        description: `Intérêts ${formatEuro(resultats.interets_totaux)} sur ${duree} ans${suffixePtz}`,
      };
    case 'mensualite_cible':
      return {
        score: -Math.abs(resultats.mensualite_totale - mensualiteCible),
        description: `Mensualité ${formatEuro(resultats.mensualite_totale)} (cible ${formatEuro(mensualiteCible)})`,
      };
    case 'compromis_ptz':
      // Optimum mixte : minimise (intérêts + POIDS × mensualité), POIDS = 60 mois.
      return {
        score: -(resultats.interets_totaux + resultats.mensualite_totale * POIDS_MENSUALITE_COMPROMIS),
        description: `Compromis PTZ/intérêts/mensualité — ${duree} ans${suffixePtz}`,
      };
  }
}

/** Formate un montant en euros (FR, sans décimale). */
function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
