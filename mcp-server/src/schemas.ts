import { z } from 'zod';

/**
 * Schemas Zod consommés par le serveur MCP. Chaque schema est exposé sous
 * forme d'objet `Record<string, ZodType>` (et non `z.object(...)`) car
 * le SDK MCP attend cette forme dans `inputSchema` pour générer le JSON
 * Schema des tools.
 *
 * Bornes :
 * - Montants (€) : >= 0, plafonnés à des valeurs raisonnables pour
 *   éviter les overflows / inputs absurdes.
 * - Durées (années) : >= 1 (sauf différé PTZ qui peut être 0), <= 30 ans
 *   pour rester dans les durées bancaires standard.
 * - Taux : >= 0, <= 15 % (fourchette généreuse pour absorber les
 *   variations marché ; les taux indicatifs réels sont autour de 3-4 %).
 */

const utilisateurSchema = z
  .object({
    salaire_net_mensuel: z.number().positive().max(50000).optional(),
    apport: z.number().min(0).max(2_000_000).optional(),
    epargne_restante_cible: z.number().min(0).max(500_000).optional(),
    primo_accedant: z.boolean().optional(),
  })
  .optional();

const bienSchema = z
  .object({
    commune: z.string().min(1).optional(),
    surface: z.number().positive().max(1000).optional(),
    prix_bien: z.number().positive().max(10_000_000).optional(),
    type_bien: z.enum(['neuf', 'ancien']).optional(),
    frais_agence_actif: z.boolean().optional(),
    frais_agence_pourcent: z.number().min(0).max(15).optional(),
    loyer_mensuel_potentiel: z.number().min(0).max(50_000).optional(),
    assurance_habitation_annuelle: z.number().min(0).max(20_000).optional(),
    fonds_travaux_annuel: z.number().min(0).max(50_000).optional(),
    charges_copro_perso_actif: z.boolean().optional(),
    charges_copro_perso_annuelles: z.number().min(0).max(50_000).optional(),
  })
  .optional();

const pretSchema = z
  .object({
    duree_annees: z.number().int().min(5).max(30).optional(),
    taux_annuel: z.number().min(0).max(15).optional(),
    taux_assurance_annuel: z.number().min(0).max(0.05).optional(),
    ptz_actif: z.boolean().optional(),
    ptz_montant: z.number().min(0).max(2_000_000).optional(),
    ptz_duree_differe_annees: z.number().int().min(0).max(15).optional(),
    ptz_duree_remboursement_annees: z.number().int().min(5).max(30).optional(),
    pas_actif: z.boolean().optional(),
    pel_actif: z.boolean().optional(),
    pel_montant: z.number().min(0).max(2_000_000).optional(),
    pel_taux: z.number().min(0).max(15).optional(),
    pel_duree_annees: z.number().int().min(1).max(30).optional(),
    cel_actif: z.boolean().optional(),
    cel_montant: z.number().min(0).max(2_000_000).optional(),
    cel_taux: z.number().min(0).max(15).optional(),
    cel_duree_annees: z.number().int().min(1).max(30).optional(),
    action_logement_actif: z.boolean().optional(),
    action_logement_montant: z.number().min(0).max(2_000_000).optional(),
    action_logement_taux: z.number().min(0).max(15).optional(),
    action_logement_duree_annees: z.number().int().min(1).max(30).optional(),
    brs_actif: z.boolean().optional(),
    brs_decote_pourcent: z.number().min(0).max(60).optional(),
  })
  .optional();

/** Trio standard utilisateur / bien / prêt accepté par la plupart des tools. */
export const simulationInputSchema = {
  utilisateur: utilisateurSchema,
  bien: bienSchema,
  pret: pretSchema,
};

/** Schema pour `find_optimal_scenario` : trio + critère + cible mensualité. */
export const findOptimalSchema = {
  ...simulationInputSchema,
  critere: z
    .enum(['cout_total', 'interets_min', 'mensualite_cible', 'compromis_ptz'])
    .default('compromis_ptz')
    .describe(
      "Critère d'optimisation : cout_total = minimise le coût total crédit, " +
        'interets_min = minimise les intérêts banque, mensualite_cible = vise ' +
        'la mensualité fournie, compromis_ptz = équilibre intérêts/mensualité.'
    ),
  mensualite_cible: z
    .number()
    .min(0)
    .max(20000)
    .optional()
    .describe('Mensualité cible en € (utilisée uniquement avec critere=mensualite_cible)'),
};

/** Schema pour `compare_communes` : trio + liste de communes (toutes par défaut). */
export const compareCommunesSchema = {
  ...simulationInputSchema,
  communes: z
    .array(z.string().min(1))
    .min(1)
    .optional()
    .describe('Liste des communes à comparer ; toutes par défaut'),
};

/**
 * Schema pour `check_ptz_eligibility`. `prix_operation` est optionnel :
 * sans lui, on retourne juste l'éligibilité (booléen) et le plafond zone ;
 * avec lui, on calcule en plus le `montant_max` PTZ mobilisable.
 */
export const checkEligibilityPTZSchema = {
  type_bien: z.enum(['neuf', 'ancien']),
  zone_ptz: z.enum(['Abis', 'A', 'B1', 'B2', 'C']),
  primo_accedant: z.boolean().default(true),
  prix_operation: z
    .number()
    .positive()
    .max(10_000_000)
    .optional()
    .describe('Prix total opération en € — requis pour calculer le montant PTZ max mobilisable'),
};

/** Schema pour `save_scenario` : nom + notes + trio. Le nom ne peut pas être vide. */
export const saveScenarioSchema = {
  name: z
    .string()
    .min(1)
    .max(120)
    .refine((s) => s.trim().length > 0, 'Le nom ne peut pas être vide ou ne contenir que des espaces')
    .describe('Nom du scénario (UPSERT par nom, insensible à la casse)'),
  notes: z.string().max(500).optional().describe('Notes libres associées au scénario'),
  ...simulationInputSchema,
};

/** Schema pour les tools qui acceptent UUID OU nom de scénario. */
export const idOrNameSchema = {
  id_or_name: z
    .string()
    .min(1)
    .describe("L'ID UUID OU le nom du scénario"),
};

/** Schema pour `compare_scenarios` : deux identifiants (UUID ou nom). */
export const compareScenariosSchema = {
  scenario_a: z.string().min(1).describe('ID ou nom du scénario A'),
  scenario_b: z.string().min(1).describe('ID ou nom du scénario B'),
};

/** Schema pour `delete_scenario`. */
export const deleteScenarioSchema = {
  id: z.string().min(1).describe('UUID du scénario à supprimer'),
};
