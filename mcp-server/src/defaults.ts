import type { ParametresUtilisateur, ParametresBien, ParametresPret } from './core.js';
import { TAUX_INDICATIFS, TAUX_ASSURANCE_DEFAULT, PTZ_PARAMS, AIDES_DEFAULTS } from './core.js';

/**
 * Valeurs par défaut alignées sur le store Zustand de l'app web
 * (cf. `src/store/simulationStore.ts`). Quand un appelant MCP passe un
 * input partiel, ces defaults complètent les champs manquants pour que
 * le résultat reste cohérent et reproductible.
 *
 * Profil par défaut : primo-accédant célibataire, salaire 2 300 €/mois,
 * apport 40 k€, T2 neuf de 40 m² à Valbonne (232 k€).
 */
export const DEFAULT_UTILISATEUR: ParametresUtilisateur = {
  salaire_net_mensuel: 2300,
  apport: 40000,
  epargne_restante_cible: 10000,
  primo_accedant: true,
};

/**
 * Bien par défaut : T2 neuf de 40 m² à Valbonne, sans frais d'agence,
 * loyer locatif potentiel 850 €/mois (utilisé pour le calcul de TRI).
 */
export const DEFAULT_BIEN: ParametresBien = {
  commune: 'Valbonne',
  surface: 40,
  prix_bien: 232000,
  type_bien: 'neuf',
  frais_agence_actif: false,
  frais_agence_pourcent: 4,
  loyer_mensuel_potentiel: 850,
  assurance_habitation_annuelle: 280,
  fonds_travaux_annuel: 0,
  charges_copro_perso_actif: false,
  charges_copro_perso_annuelles: 1800,
};

/**
 * Prêt par défaut : 20 ans au taux marché indicatif, PTZ activé,
 * autres aides cumulables désactivées (à activer explicitement par
 * l'appelant si pertinent).
 */
export const DEFAULT_PRET: ParametresPret = {
  duree_annees: 20,
  taux_annuel: TAUX_INDICATIFS[20],
  taux_assurance_annuel: TAUX_ASSURANCE_DEFAULT,
  ptz_actif: true,
  ptz_montant: undefined,
  ptz_duree_differe_annees: PTZ_PARAMS.duree_differe_default,
  ptz_duree_remboursement_annees: PTZ_PARAMS.duree_remboursement_default,

  pas_actif: false,

  pel_actif: false,
  pel_montant: AIDES_DEFAULTS.pel.montant_default,
  pel_taux: AIDES_DEFAULTS.pel.taux_default,
  pel_duree_annees: AIDES_DEFAULTS.pel.duree_annees,

  cel_actif: false,
  cel_montant: AIDES_DEFAULTS.cel.montant_default,
  cel_taux: AIDES_DEFAULTS.cel.taux_default,
  cel_duree_annees: AIDES_DEFAULTS.cel.duree_annees,

  action_logement_actif: false,
  action_logement_montant: AIDES_DEFAULTS.action_logement.montant_default,
  action_logement_taux: AIDES_DEFAULTS.action_logement.taux_default,
  action_logement_duree_annees: AIDES_DEFAULTS.action_logement.duree_annees,

  brs_actif: false,
  brs_decote_pourcent: AIDES_DEFAULTS.brs.decote_pourcent_default,
};

/**
 * Merge superficiel d'un objet partiel sur un objet de defaults.
 * Les champs `undefined` du partiel ne remplacent PAS les defaults
 * (sauf si explicitement définis à `undefined`, ce que `Partial<T>` permet).
 *
 * @param defaults Objet complet servant de base
 * @param partial Champs à surcharger (peut être `undefined`)
 * @returns Un nouvel objet `T` avec les valeurs fusionnées
 */
export function withDefaults<T extends object>(defaults: T, partial?: Partial<T>): T {
  return { ...defaults, ...(partial ?? {}) };
}
