export type Attractivite = 'EXCELLENTE' | 'BONNE' | 'MOYENNE' | 'FAIBLE';
export type ZonePTZ = 'A' | 'Abis' | 'B1' | 'B2' | 'C';
export type TypeBien = 'neuf' | 'ancien';

export interface Commune {
  commune: string;
  zone_ptz: ZonePTZ;
  prix_m2_ancien: number;
  prix_m2_neuf: number;
  attractivite: Attractivite;
  distance_sofia_km: number;
  taxe_fonciere_moyenne: number;          // €/an
  charges_copro_annuelles_moyennes: number; // €/an
  evolution_5_ans: number;
}

export interface ParametresUtilisateur {
  salaire_net_mensuel: number;
  apport: number;
  epargne_restante_cible: number;
  cout_locatif_mensuel_compare?: number;
  primo_accedant: boolean;       // pas propriétaire dans les 2 dernières années → débloque PTZ
}

export interface ParametresBien {
  commune: string;
  surface: number;
  prix_bien: number;          // input primaire — tout le reste en découle
  type_bien: TypeBien;
  frais_agence_actif: boolean;
  frais_agence_pourcent: number;
  loyer_mensuel_potentiel: number;
  // Charges propriétaire occupant
  assurance_habitation_annuelle: number;
  fonds_travaux_annuel: number;
  // Override charges copro (sinon moyenne commune) — €/an
  charges_copro_perso_actif: boolean;
  charges_copro_perso_annuelles: number;
}

export interface ParametresPret {
  duree_annees: number;
  taux_annuel: number;
  taux_assurance_annuel: number;
  ptz_actif: boolean;
  ptz_montant?: number;
  ptz_duree_differe_annees: number;
  ptz_duree_remboursement_annees: number;

  // ---- Aides primo-accédant cumulables ----
  pas_actif: boolean;                     // Prêt à l'Accession Sociale (frais hypoth. réduits)

  pel_actif: boolean;                     // Plan Épargne Logement
  pel_montant: number;
  pel_taux: number;
  pel_duree_annees: number;

  cel_actif: boolean;                     // Compte Épargne Logement
  cel_montant: number;
  cel_taux: number;
  cel_duree_annees: number;

  action_logement_actif: boolean;         // 1 % patronal
  action_logement_montant: number;
  action_logement_taux: number;
  action_logement_duree_annees: number;

  brs_actif: boolean;                     // Bail Réel Solidaire (décote sur prix)
  brs_decote_pourcent: number;
}

export interface PalierMensualite {
  numero: number;
  debut_mois: number;          // 1-based, inclus
  fin_mois: number;            // inclus
  duree_mois: number;
  composantes: Array<{ source: PalierSource; mensualite: number }>;
  total: number;
}

export type PalierSource =
  | 'pret_banque'
  | 'assurance_emprunteur'
  | 'ptz'
  | 'pel'
  | 'cel'
  | 'action_logement'
  | 'redevance_brs';

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
  cout_total_brs_redevance: number;     // redevance × durée prêt
  interets_aides_total: number;
  cout_total_reel: number;              // somme alignée sur le bloc "Coût total réel"
  cout_total_credit: number;
  interets_totaux: number;
  cout_total_assurance: number;
  taux_endettement: number;
  // Paliers de mensualité (phases où la composition ne change pas)
  paliers: PalierMensualite[];
  pic_mensualite_palier: number;   // max sur tous les paliers
  pic_palier_numero: number;       // index du palier au pic
  capacite_emprunt_max: number;
  cash_restant_apres_achat: number;
  reste_a_vivre: number;                       // post-différé PTZ (worst case)
  reste_a_vivre_pendant_differe_ptz: number;   // pendant le différé PTZ
  reste_a_vivre_apres_differe_ptz: number;     // identique à reste_a_vivre
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

export interface Scenario {
  id: string;
  nom: string;
  date_creation: number;
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
}

export interface AmortissementMois {
  mois: number;
  capital_rembourse: number;
  interets: number;
  capital_restant: number;
  cumul_interets: number;
  cumul_capital: number;
}
