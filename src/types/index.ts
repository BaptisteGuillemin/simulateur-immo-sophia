/** Niveau d'attractivité commercial/qualitatif d'une commune. */
export type Attractivite = 'EXCELLENTE' | 'BONNE' | 'MOYENNE' | 'FAIBLE';

/** Zonage PTZ A/Abis/B1 (tendues, neuf éligible) — B2/C (détendues). */
export type ZonePTZ = 'A' | 'Abis' | 'B1' | 'B2' | 'C';

/** Type de bien immobilier (`'neuf'` ou `'ancien'`). */
export type TypeBien = 'neuf' | 'ancien';

/**
 * Données moyenne marché d'une commune. Sert de référence pour comparer
 * un prix saisi à la moyenne (cf. `calculEcartPrixM2`).
 */
export interface Commune {
  commune: string;
  zone_ptz: ZonePTZ;
  prix_m2_ancien: number;
  prix_m2_neuf: number;
  attractivite: Attractivite;
  distance_sofia_km: number;
  /** Taxe foncière moyenne (€/an). */
  taxe_fonciere_moyenne: number;
  /** Charges de copropriété moyennes (€/an). */
  charges_copro_annuelles_moyennes: number;
  /** Évolution du prix au m² sur 5 ans (forme décimale, ex 0.12 = +12 %). */
  evolution_5_ans: number;
}

/** Profil financier du foyer acheteur. */
export interface ParametresUtilisateur {
  salaire_net_mensuel: number;
  apport: number;
  /** Cible de cash résiduel souhaitée après acquisition (€). */
  epargne_restante_cible: number;
  /** Loyer mensuel actuel pour comparaison (optionnel). */
  cout_locatif_mensuel_compare?: number;
  /** Pas propriétaire dans les 2 dernières années → débloque PTZ. */
  primo_accedant: boolean;
}

/** Paramètres du bien visé. */
export interface ParametresBien {
  commune: string;
  surface: number;
  /** Input primaire — tout le reste en découle. */
  prix_bien: number;
  type_bien: TypeBien;
  frais_agence_actif: boolean;
  frais_agence_pourcent: number;
  loyer_mensuel_potentiel: number;
  // Charges propriétaire occupant
  assurance_habitation_annuelle: number;
  fonds_travaux_annuel: number;
  /** Si vrai : utilise `charges_copro_perso_annuelles` au lieu de la moyenne commune. */
  charges_copro_perso_actif: boolean;
  /** Charges copro personnalisées (€/an). */
  charges_copro_perso_annuelles: number;
}

/** Paramètres du financement (prêts cumulables et leurs durées/taux). */
export interface ParametresPret {
  duree_annees: number;
  /** Taux nominal annuel en %. */
  taux_annuel: number;
  /** Taux d'assurance annuel sur capital initial (forme décimale). */
  taux_assurance_annuel: number;

  ptz_actif: boolean;
  /** Capital PTZ (optionnel — sinon le moteur prend `calculPTZMax`). */
  ptz_montant?: number;
  ptz_duree_differe_annees: number;
  ptz_duree_remboursement_annees: number;

  // ---- Aides primo-accédant cumulables ----
  /** Prêt à l'Accession Sociale — réduit les frais hypothécaires. */
  pas_actif: boolean;

  /** Plan Épargne Logement. */
  pel_actif: boolean;
  pel_montant: number;
  pel_taux: number;
  pel_duree_annees: number;

  /** Compte Épargne Logement. */
  cel_actif: boolean;
  cel_montant: number;
  cel_taux: number;
  cel_duree_annees: number;

  /** 1 % patronal (Action Logement). */
  action_logement_actif: boolean;
  action_logement_montant: number;
  action_logement_taux: number;
  action_logement_duree_annees: number;

  /** Bail Réel Solidaire (décote sur le prix d'acquisition). */
  brs_actif: boolean;
  brs_decote_pourcent: number;
}

/** Composante (source + montant) qui contribue à un palier de mensualité. */
export interface ComposantePalier {
  source: PalierSource;
  mensualite: number;
}

/**
 * Un palier de mensualité = intervalle pendant lequel la composition
 * des prêts actifs est stable. Issu de `calculPaliers`.
 */
export interface PalierMensualite {
  numero: number;
  /** Mois de début (1-based, inclus). */
  debut_mois: number;
  /** Mois de fin (1-based, inclus). */
  fin_mois: number;
  duree_mois: number;
  composantes: ComposantePalier[];
  /** Somme des `mensualite` des composantes — utilisé pour le pic HCSF. */
  total: number;
}

/** Sources de mensualité tracées dans les paliers. */
export type PalierSource =
  | 'pret_banque'
  | 'assurance_emprunteur'
  | 'ptz'
  | 'pel'
  | 'cel'
  | 'action_logement'
  | 'redevance_brs';

/** Sortie consolidée de `simuler` — agrège tous les indicateurs pour l'UI. */
export interface Resultats {
  prix_bien: number;
  frais_notaire: number;
  frais_agence: number;
  cout_acquisition_total: number;
  ptz_montant: number;
  pret_principal_montant: number;
  mensualite_principale: number;
  mensualite_assurance: number;
  mensualite_ptz: number;
  mensualite_totale: number;
  // Mensualités des aides complémentaires (chacune 0 si non active)
  mensualite_pas: number;
  mensualite_pel: number;
  mensualite_cel: number;
  mensualite_action_logement: number;
  mensualite_brs_redevance: number;
  // Capitaux des aides
  pel_capital: number;
  cel_capital: number;
  action_logement_capital: number;
  brs_decote_euros: number;
  // Coût total de chaque aide sur la durée
  cout_total_pel: number;
  cout_total_cel: number;
  cout_total_action_logement: number;
  /** Redevance BRS × durée prêt. */
  cout_total_brs_redevance: number;
  interets_aides_total: number;
  /** Somme alignée sur le bloc "Coût total réel". */
  cout_total_reel: number;
  cout_total_credit: number;
  interets_totaux: number;
  cout_total_assurance: number;
  taux_endettement: number;
  // Paliers de mensualité (phases où la composition ne change pas)
  paliers: PalierMensualite[];
  /** Max sur tous les paliers. */
  pic_mensualite_palier: number;
  /** Index 1-based du palier au pic. */
  pic_palier_numero: number;
  capacite_emprunt_max: number;
  cash_restant_apres_achat: number;
  /** Reste à vivre post-différé PTZ (worst case). */
  reste_a_vivre: number;
  /** Reste à vivre pendant le différé PTZ. */
  reste_a_vivre_pendant_differe_ptz: number;
  /** Reste à vivre après le différé PTZ (= `reste_a_vivre`). */
  reste_a_vivre_apres_differe_ptz: number;
  charges_mensuelles_proprietaire: number;
  // Détail charges propriétaire
  charge_taxe_fonciere_mensuelle: number;
  charge_copro_mensuelle: number;
  charge_assurance_habitation_mensuelle: number;
  charge_fonds_travaux_mensuelle: number;
  rendement_locatif_brut: number;
  rendement_locatif_net: number;
  tri_simplifie_5_ans: number;
  prix_revente_estime_5_ans: number;
}

/** Scénario sauvegardé (snapshot des paramètres + métadonnées). */
export interface Scenario {
  id: string;
  nom: string;
  /** Timestamp Unix ms de création. */
  date_creation: number;
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
}

/** Une ligne du tableau d'amortissement (un mois). */
export interface AmortissementMois {
  mois: number;
  capital_rembourse: number;
  interets: number;
  capital_restant: number;
  cumul_interets: number;
  cumul_capital: number;
}
