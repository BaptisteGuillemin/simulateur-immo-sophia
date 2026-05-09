// Constantes du marché français — ajustables ici pour évoluer facilement.
// Toutes les valeurs sont commentées avec leur origine (barème officiel, observation marché…).

// ---------------------------------------------------------------------------
// Frais & taux d'acquisition
// ---------------------------------------------------------------------------

/**
 * Frais de notaire indicatifs en France métropolitaine (taux global appliqué
 * au prix de vente). Source : barème notarial 2024-2025.
 */
export const FRAIS_NOTAIRE = {
  ancien: 0.075, // 7.5 %
  neuf: 0.025,   // 2.5 %
} as const;

/**
 * Plancher technique appliqué au taux de frais de notaire après réduction PAS.
 * Évite qu'une réduction excessive ne fasse passer le taux sous 0.5 %.
 */
export const TAUX_NOTAIRE_PLANCHER = 0.005; // 0.5 %

/**
 * Taux indicatifs marché (mai 2025-2026, primo-accédant France).
 * Clé = durée en années, valeur = taux nominal annuel en %.
 */
export const TAUX_INDICATIFS: Readonly<Record<number, number>> = {
  10: 2.4,
  15: 2.6,
  20: 2.8,
  25: 3.0,
};

/** Taux d'assurance emprunteur par défaut (annuel, sur capital initial). */
export const TAUX_ASSURANCE_DEFAULT = 0.0025; // 0.25 % annuel

/** Plafond du taux d'endettement HCSF (35 % des revenus, juillet 2024). */
export const ENDETTEMENT_MAX = 0.35; // 35 % HCSF

/** Même plafond exprimé en % (pour comparaison directe à un Resultats.taux_endettement). */
export const ENDETTEMENT_MAX_POURCENT = 35;

// ---------------------------------------------------------------------------
// Conversions temporelles
// ---------------------------------------------------------------------------

/** Nombre de mois dans une année (utilisé partout dans les conversions annuel↔mensuel). */
export const MOIS_PAR_AN = 12;

/** Horizon "court terme" pour les calculs de revente / TRI primo-accédant. */
export const ANNEES_HORIZON_REVENTE = 5;

/** Horizon de revente exprimé en mois (5 ans × 12). */
export const MOIS_HORIZON_REVENTE = ANNEES_HORIZON_REVENTE * MOIS_PAR_AN;

// ---------------------------------------------------------------------------
// PTZ (Prêt à Taux Zéro)
// ---------------------------------------------------------------------------

/**
 * PTZ : barème simplifié primo-accédant 2025.
 * Quotité = % du prix d'opération financé par le PTZ.
 */
export const PTZ_PARAMS = {
  quotite_max: 0.40, // jusqu'à 40 % du prix d'opération
  // Plafonds d'opération par zone (couple sans enfant, à ajuster selon foyer)
  plafond_operation: {
    A: 150000,
    Abis: 150000,
    B1: 135000,
    B2: 110000,
    C: 100000,
  } as Readonly<Record<string, number>>,
  // Tranche 2 (RFR ~25-31 k€/an, B1, 1 personne) : défaut réaliste primo-accédant Sophia
  duree_remboursement_default: 22,
  duree_differe_default: 8,
} as const;

/** Durées (en années) explorées par l'optimiseur de scénarios. */
export const DUREES_OPTIMIZER: readonly number[] = [10, 15, 20, 25] as const;

// ---------------------------------------------------------------------------
// Aides primo-accédant cumulables
// ---------------------------------------------------------------------------

/** Constantes des aides primo-accédant (barèmes 2024-2025 indicatifs). */
export const AIDES_DEFAULTS = {
  pas: {
    // PAS : pas un montant séparé, juste un flag réduisant les frais hypothécaires de ~0.4 %
    reduction_frais_notaire: 0.004,
  },
  pel: {
    montant_default: 30000,
    taux_default: 2.2,        // PEL ouvert récemment
    duree_annees: 15,
    plafond: 92000,
  },
  cel: {
    montant_default: 12000,
    taux_default: 2.0,
    duree_annees: 15,
    plafond: 23000,
  },
  action_logement: {
    montant_default: 30000,
    taux_default: 1.5,
    duree_annees: 25,
    plafond: 30000,
  },
  brs: {
    decote_pourcent_default: 35, // 30-50 % typique
    redevance_eur_par_m2_par_mois: 3.5,
  },
} as const;

// ---------------------------------------------------------------------------
// Hypothèses revente / projection
// ---------------------------------------------------------------------------

/** Évolution annuelle moyenne pour estimation revente (Sophia Antipolis, 2020-2025). */
export const EVOLUTION_ANNUELLE_PRIX = 0.025; // 2.5 % / an

/**
 * Frais de vente par défaut à la revente (commission agence + diagnostics + frais
 * de mainlevée d'hypothèque). 7 % est une moyenne haute prudente.
 */
export const FRAIS_VENTE_DEFAULT = 0.07; // 7 %

// ---------------------------------------------------------------------------
// Optimiseur — pondérations & scoring
// ---------------------------------------------------------------------------

/**
 * Poids appliqué à la mensualité dans le critère "compromis_ptz" de l'optimiseur :
 * on minimise (intérêts_totaux + POIDS × mensualité_totale), avec POIDS = 60 mois
 * (5 ans de mensualités équivalent à un coût brut comparable aux intérêts).
 */
export const POIDS_MENSUALITE_COMPROMIS = MOIS_HORIZON_REVENTE; // 60
