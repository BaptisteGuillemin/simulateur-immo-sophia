import { z } from 'zod';

const utilisateurSchema = z
  .object({
    salaire_net_mensuel: z.number().min(500).max(50000).optional(),
    apport: z.number().min(0).max(2_000_000).optional(),
    epargne_restante_cible: z.number().min(0).max(500_000).optional(),
    primo_accedant: z.boolean().optional(),
  })
  .optional();

const bienSchema = z
  .object({
    commune: z.string().optional(),
    surface: z.number().min(1).max(1000).optional(),
    prix_bien: z.number().min(0).max(10_000_000).optional(),
    type_bien: z.enum(['neuf', 'ancien']).optional(),
    frais_agence_actif: z.boolean().optional(),
    frais_agence_pourcent: z.number().min(0).max(15).optional(),
    loyer_mensuel_potentiel: z.number().min(0).optional(),
    assurance_habitation_annuelle: z.number().min(0).optional(),
    fonds_travaux_annuel: z.number().min(0).optional(),
    charges_copro_perso_actif: z.boolean().optional(),
    charges_copro_perso_annuelles: z.number().min(0).optional(),
  })
  .optional();

const pretSchema = z
  .object({
    duree_annees: z.number().min(5).max(30).optional(),
    taux_annuel: z.number().min(0).max(15).optional(),
    taux_assurance_annuel: z.number().min(0).max(0.05).optional(),
    ptz_actif: z.boolean().optional(),
    ptz_montant: z.number().min(0).optional(),
    ptz_duree_differe_annees: z.number().min(0).max(15).optional(),
    ptz_duree_remboursement_annees: z.number().min(5).max(30).optional(),
    pas_actif: z.boolean().optional(),
    pel_actif: z.boolean().optional(),
    pel_montant: z.number().min(0).optional(),
    pel_taux: z.number().min(0).max(15).optional(),
    pel_duree_annees: z.number().min(1).max(30).optional(),
    cel_actif: z.boolean().optional(),
    cel_montant: z.number().min(0).optional(),
    cel_taux: z.number().min(0).max(15).optional(),
    cel_duree_annees: z.number().min(1).max(30).optional(),
    action_logement_actif: z.boolean().optional(),
    action_logement_montant: z.number().min(0).optional(),
    action_logement_taux: z.number().min(0).max(15).optional(),
    action_logement_duree_annees: z.number().min(1).max(30).optional(),
    brs_actif: z.boolean().optional(),
    brs_decote_pourcent: z.number().min(0).max(60).optional(),
  })
  .optional();

export const simulationInputSchema = {
  utilisateur: utilisateurSchema,
  bien: bienSchema,
  pret: pretSchema,
};

export const findOptimalSchema = {
  ...simulationInputSchema,
  critere: z
    .enum(['cout_total', 'interets_min', 'mensualite_cible', 'compromis_ptz'])
    .default('compromis_ptz'),
  mensualite_cible: z.number().min(0).optional(),
};

export const compareCommunesSchema = {
  ...simulationInputSchema,
  communes: z
    .array(z.string())
    .optional()
    .describe('Liste des communes à comparer ; toutes par défaut'),
};

export const checkEligibilityPTZSchema = {
  type_bien: z.enum(['neuf', 'ancien']),
  zone_ptz: z.enum(['Abis', 'A', 'B1', 'B2', 'C']),
  primo_accedant: z.boolean().default(true),
  prix_operation: z.number().min(0).optional(),
};

export const saveScenarioSchema = {
  name: z.string().min(1).max(120),
  notes: z.string().max(500).optional(),
  ...simulationInputSchema,
};

export const idOrNameSchema = {
  id_or_name: z
    .string()
    .min(1)
    .describe("L'ID UUID OU le nom du scénario"),
};

export const compareScenariosSchema = {
  scenario_a: z.string().describe('ID ou nom du scénario A'),
  scenario_b: z.string().describe('ID ou nom du scénario B'),
};
