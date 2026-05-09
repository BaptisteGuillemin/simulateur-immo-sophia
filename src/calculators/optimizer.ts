import type { Commune, ParametresBien, ParametresPret, ParametresUtilisateur, Resultats } from '@/types';
import { simuler } from './simulation';
import { TAUX_INDICATIFS } from './constants';

export type CritereOptimisation = 'cout_total' | 'interets_min' | 'mensualite_cible' | 'compromis_ptz';

export interface ScenarioOptimal {
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
  resultats: Resultats;
  score: number;
  description: string;
}

/**
 * Cherche le meilleur scénario en explorant la grille (durée, PTZ on/off).
 * Garde les contraintes utilisateur (apport / salaire) intactes.
 */
export function trouverScenarioOptimal(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune,
  critere: CritereOptimisation,
  mensualiteCible: number = 0
): ScenarioOptimal {
  const dureesAnnees = [10, 15, 20, 25];
  const ptzOptions = [true, false];
  const candidats: ScenarioOptimal[] = [];

  for (const duree of dureesAnnees) {
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
      if (resultats.taux_endettement > 35) continue;
      if (resultats.cash_restant_apres_achat < 0) continue;

      let score = 0;
      let description = '';
      switch (critere) {
        case 'cout_total':
          score = -resultats.cout_total_credit;
          description = `Coût total ${formatEuro(resultats.cout_total_credit)} sur ${duree} ans${ptzActif ? ' avec PTZ' : ''}`;
          break;
        case 'interets_min':
          score = -resultats.interets_totaux;
          description = `Intérêts ${formatEuro(resultats.interets_totaux)} sur ${duree} ans${ptzActif ? ' avec PTZ' : ''}`;
          break;
        case 'mensualite_cible':
          score = -Math.abs(resultats.mensualite_totale - mensualiteCible);
          description = `Mensualité ${formatEuro(resultats.mensualite_totale)} (cible ${formatEuro(mensualiteCible)})`;
          break;
        case 'compromis_ptz':
          // Optimum mixte : minimise (intérêts + 5x mensualité)
          score = -(resultats.interets_totaux + resultats.mensualite_totale * 60);
          description = `Compromis PTZ/intérêts/mensualité — ${duree} ans${ptzActif ? ' avec PTZ' : ''}`;
          break;
      }

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

function formatEuro(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
}
