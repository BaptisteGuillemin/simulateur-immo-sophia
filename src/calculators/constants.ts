// Constantes du marché français — ajustables ici pour évoluer facilement.

export const FRAIS_NOTAIRE = {
  ancien: 0.075, // 7.5 %
  neuf: 0.025,   // 2.5 %
} as const;

// Taux indicatifs marché (mai 2025-2026, primo-accédant France)
export const TAUX_INDICATIFS: Record<number, number> = {
  10: 2.4,
  15: 2.6,
  20: 2.8,
  25: 3.0,
};

export const TAUX_ASSURANCE_DEFAULT = 0.0025; // 0.25 % annuel
export const ENDETTEMENT_MAX = 0.35; // 35 % HCSF

// PTZ : barème simplifié primo-accédant 2025
// Quotité = % du prix d'opération financé par le PTZ
export const PTZ_PARAMS = {
  quotite_max: 0.40, // jusqu'à 40 % du prix d'opération
  // Plafonds d'opération par zone (couple sans enfant, à ajuster selon foyer)
  plafond_operation: {
    A: 150000,
    Abis: 150000,
    B1: 135000,
    B2: 110000,
    C: 100000,
  } as Record<string, number>,
  // Tranche 2 (RFR ~25-31 k€/an, B1, 1 personne) : défaut réaliste primo-accédant Sophia
  duree_remboursement_default: 22,
  duree_differe_default: 8,
} as const;

// Constantes des aides primo-accédant (barèmes 2024-2025 indicatifs)
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

// Évolution annuelle moyenne pour estimation revente (Sophia Antipolis)
export const EVOLUTION_ANNUELLE_PRIX = 0.025; // 2.5 % / an
