import type { ParametresUtilisateur, ParametresBien, ParametresPret } from './core.js';
import { TAUX_INDICATIFS, TAUX_ASSURANCE_DEFAULT, PTZ_PARAMS, AIDES_DEFAULTS } from './core.js';

/**
 * Valeurs par défaut alignées sur le store Zustand de l'app web.
 * L'utilisateur du MCP peut passer des paramètres partiels — on complète avec ces defaults.
 */
export const DEFAULT_UTILISATEUR: ParametresUtilisateur = {
  salaire_net_mensuel: 2300,
  apport: 40000,
  epargne_restante_cible: 10000,
  primo_accedant: true,
};

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

export function withDefaults<T extends object>(defaults: T, partial?: Partial<T>): T {
  return { ...defaults, ...(partial ?? {}) };
}
