#!/usr/bin/env node
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

import {
  simuler,
  comparerNeufAncien,
  trouverScenarioOptimal,
  estEligiblePTZ,
  calculPTZMax,
  COMMUNES,
  AIDES_DEFAULTS,
  PTZ_PARAMS,
  TAUX_INDICATIFS,
  FRAIS_NOTAIRE,
} from './core.js';
import {
  simulationInputSchema,
  findOptimalSchema,
  compareCommunesSchema,
  checkEligibilityPTZSchema,
  saveScenarioSchema,
  idOrNameSchema,
  compareScenariosSchema,
} from './schemas.js';
import { resolveInput, resumeResultats, resolveCommune } from './helpers.js';
import {
  saveScenario,
  listScenarios,
  findScenario,
  deleteScenario,
  getStorePath,
} from './store.js';

const server = new McpServer({
  name: 'simulateur-immo-sophia',
  version: '1.0.0',
});

// Helper to wrap any JSON result as a content[] response
const json = (data: unknown) => ({
  content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }],
});

// ============================================================================
// CALCULATION TOOLS
// ============================================================================

server.registerTool(
  'simulate',
  {
    title: 'Simuler un achat immobilier',
    description:
      "Lance une simulation complète : mensualités, intérêts, endettement par paliers, charges, rendement, TRI 5 ans. Tous les paramètres sont optionnels — les defaults sont alignés sur l'app web (Valbonne 232 k€, 40 m², 2 300 €/mois salaire, 40 k€ apport).",
    inputSchema: simulationInputSchema,
  },
  async (args) => {
    const { utilisateur, bien, pret } = resolveInput(args);
    const commune = resolveCommune(bien.commune);
    const resultats = simuler(utilisateur, bien, pret, commune);
    return json({ utilisateur, bien, pret, commune, resultats });
  }
);

server.registerTool(
  'find_optimal_scenario',
  {
    title: 'Trouver le scénario optimal',
    description:
      "Explore les durées (10/15/20/25 ans) × PTZ on/off et retourne le meilleur scénario selon le critère choisi (coût total min, intérêts min, mensualité cible, ou compromis).",
    inputSchema: findOptimalSchema,
  },
  async (args) => {
    const { utilisateur, bien, pret } = resolveInput(args);
    const commune = resolveCommune(bien.commune);
    const r = trouverScenarioOptimal(
      utilisateur,
      bien,
      pret,
      commune,
      args.critere,
      args.mensualite_cible ?? 0
    );
    return json({
      description: r.description,
      score: r.score,
      pret: r.pret,
      resume: resumeResultats(r.resultats),
      resultats_complets: r.resultats,
    });
  }
);

server.registerTool(
  'compare_communes',
  {
    title: 'Comparer les communes',
    description:
      "Lance la même simulation sur plusieurs communes (toutes par défaut) et retourne un classement par coût total réel.",
    inputSchema: compareCommunesSchema,
  },
  async (args) => {
    const base = resolveInput(args);
    const cibles = (args.communes ?? COMMUNES.map((c) => c.commune)).filter((nom) =>
      COMMUNES.find((c) => c.commune === nom)
    );

    const results = cibles.map((nom) => {
      const commune = resolveCommune(nom);
      const bien = { ...base.bien, commune: nom };
      const r = simuler(base.utilisateur, bien, base.pret, commune);
      return {
        commune: nom,
        zone_ptz: commune.zone_ptz,
        attractivite: commune.attractivite,
        prix_m2_reference: bien.type_bien === 'neuf' ? commune.prix_m2_neuf : commune.prix_m2_ancien,
        ...resumeResultats(r),
      };
    });
    results.sort((a, b) => a.cout_total_reel - b.cout_total_reel);
    return json({ classement: results });
  }
);

server.registerTool(
  'compute_paliers',
  {
    title: 'Calculer les paliers de mensualité',
    description:
      "Retourne les phases temporelles où la composition de la mensualité ne change pas. Utile pour comprendre l'endettement HCSF (= pic des paliers, pas la somme brute).",
    inputSchema: simulationInputSchema,
  },
  async (args) => {
    const { utilisateur, bien, pret } = resolveInput(args);
    const commune = resolveCommune(bien.commune);
    const r = simuler(utilisateur, bien, pret, commune);
    return json({
      pic_mensualite: r.pic_mensualite_palier,
      pic_palier_numero: r.pic_palier_numero,
      taux_endettement: r.taux_endettement,
      paliers: r.paliers,
    });
  }
);

server.registerTool(
  'compare_neuf_vs_ancien',
  {
    title: 'Comparer neuf vs ancien',
    description:
      "Compare le même bien (commune + surface) en neuf vs ancien : frais notaire, mensualité, intérêts, PTZ.",
    inputSchema: simulationInputSchema,
  },
  async (args) => {
    const { utilisateur, bien, pret } = resolveInput(args);
    const commune = resolveCommune(bien.commune);
    const { neuf, ancien } = comparerNeufAncien(utilisateur, bien, pret, commune);
    return json({
      neuf: resumeResultats(neuf),
      ancien: resumeResultats(ancien),
      delta_cout_total_reel: neuf.cout_total_reel - ancien.cout_total_reel,
      delta_frais_notaire: neuf.frais_notaire - ancien.frais_notaire,
      delta_ptz: neuf.ptz_montant - ancien.ptz_montant,
    });
  }
);

server.registerTool(
  'check_ptz_eligibility',
  {
    title: 'Vérifier éligibilité PTZ',
    description:
      "Retourne l'éligibilité PTZ et le montant max théorique selon la zone, le type de bien et le statut primo-accédant.",
    inputSchema: checkEligibilityPTZSchema,
  },
  async (args) => {
    const eligibleZone = estEligiblePTZ(args.type_bien, args.zone_ptz);
    const eligible = eligibleZone && args.primo_accedant;
    const montant_max =
      eligible && args.prix_operation
        ? calculPTZMax(args.prix_operation, args.zone_ptz, args.type_bien)
        : 0;
    const reason = !args.primo_accedant
      ? 'PTZ réservé aux primo-accédants'
      : !eligibleZone
        ? `${args.type_bien} non éligible en zone ${args.zone_ptz}`
        : 'Éligible';
    return json({
      eligible,
      reason,
      zone_ptz: args.zone_ptz,
      type_bien: args.type_bien,
      plafond_operation_zone: PTZ_PARAMS.plafond_operation[args.zone_ptz] ?? null,
      quotite_max_pourcent: PTZ_PARAMS.quotite_max * 100,
      montant_max,
    });
  }
);

// ============================================================================
// SCENARIO TOOLS
// ============================================================================

server.registerTool(
  'save_scenario',
  {
    title: 'Sauvegarder un scénario',
    description:
      "Enregistre un scénario (apport / bien / prêt) sous un nom. Si le nom existe déjà, le scénario est mis à jour. Stocké dans ~/.simulateur-immo-sophia/scenarios.json.",
    inputSchema: saveScenarioSchema,
  },
  async (args) => {
    const { utilisateur, bien, pret } = resolveInput(args);
    const saved = saveScenario({
      name: args.name,
      notes: args.notes,
      utilisateur,
      bien,
      pret,
    });
    return json({ saved, store_path: getStorePath() });
  }
);

server.registerTool(
  'list_scenarios',
  {
    title: 'Lister les scénarios sauvegardés',
    description:
      "Retourne tous les scénarios sauvegardés avec un résumé (commune, surface, prix, mensualité pic, endettement).",
    inputSchema: {},
  },
  async () => {
    const list = listScenarios().map((s) => {
      const commune = resolveCommune(s.bien.commune);
      const r = simuler(s.utilisateur, s.bien, s.pret, commune);
      return {
        id: s.id,
        name: s.name,
        notes: s.notes,
        created_at: s.created_at,
        updated_at: s.updated_at,
        commune: s.bien.commune,
        surface: s.bien.surface,
        type_bien: s.bien.type_bien,
        ...resumeResultats(r),
      };
    });
    return json({ count: list.length, scenarios: list, store_path: getStorePath() });
  }
);

server.registerTool(
  'load_scenario',
  {
    title: 'Charger un scénario',
    description:
      "Charge un scénario par ID UUID ou par nom et lance la simulation pour retourner les résultats à jour.",
    inputSchema: idOrNameSchema,
  },
  async (args) => {
    const sc = findScenario(args.id_or_name);
    if (!sc) {
      return json({ error: `Scénario introuvable : "${args.id_or_name}"` });
    }
    const commune = resolveCommune(sc.bien.commune);
    const resultats = simuler(sc.utilisateur, sc.bien, sc.pret, commune);
    return json({
      scenario: sc,
      resultats,
      resume: resumeResultats(resultats),
    });
  }
);

server.registerTool(
  'delete_scenario',
  {
    title: 'Supprimer un scénario',
    description: 'Supprime un scénario sauvegardé par ID UUID.',
    inputSchema: { id: z.string().min(1) },
  },
  async (args) => {
    const ok = deleteScenario(args.id);
    return json({
      deleted: ok,
      message: ok ? `Scénario ${args.id} supprimé` : `Aucun scénario avec l'ID ${args.id}`,
    });
  }
);

server.registerTool(
  'compare_scenarios',
  {
    title: 'Comparer deux scénarios',
    description:
      "Compare deux scénarios sauvegardés (ID ou nom). Retourne les deltas sur les indicateurs clés (mensualité, coût total, intérêts, endettement).",
    inputSchema: compareScenariosSchema,
  },
  async (args) => {
    const a = findScenario(args.scenario_a);
    const b = findScenario(args.scenario_b);
    if (!a || !b) {
      return json({
        error: 'Scénario(s) introuvable(s)',
        found_a: !!a,
        found_b: !!b,
      });
    }
    const ra = simuler(a.utilisateur, a.bien, a.pret, resolveCommune(a.bien.commune));
    const rb = simuler(b.utilisateur, b.bien, b.pret, resolveCommune(b.bien.commune));
    return json({
      scenario_a: { name: a.name, ...resumeResultats(ra) },
      scenario_b: { name: b.name, ...resumeResultats(rb) },
      delta: {
        cout_total_reel: rb.cout_total_reel - ra.cout_total_reel,
        mensualite_pic: rb.pic_mensualite_palier - ra.pic_mensualite_palier,
        endettement_pourcent: rb.taux_endettement - ra.taux_endettement,
        intérêts_banque: rb.interets_totaux - ra.interets_totaux,
      },
    });
  }
);

// ============================================================================
// RESOURCES
// ============================================================================

server.registerResource(
  'communes-list',
  'immo://communes',
  {
    title: 'Liste des communes',
    description:
      'Toutes les communes Sophia Antipolis avec prix m² (neuf/ancien), zone PTZ, attractivité, taxe foncière, charges copro annuelles, évolution 5 ans.',
    mimeType: 'application/json',
  },
  async () => ({
    contents: [
      {
        uri: 'immo://communes',
        mimeType: 'application/json',
        text: JSON.stringify(COMMUNES, null, 2),
      },
    ],
  })
);

server.registerResource(
  'commune-details',
  new ResourceTemplate('immo://commune/{nom}', {
    list: undefined,
    complete: {
      nom: () => COMMUNES.map((c) => c.commune),
    },
  }),
  {
    title: 'Détails d\'une commune',
    description: 'Détails complets pour une commune donnée (auto-complétion sur les noms valides).',
    mimeType: 'application/json',
  },
  async (uri, { nom }) => {
    const nomStr = Array.isArray(nom) ? nom[0] : nom;
    const c = COMMUNES.find((x) => x.commune.toLowerCase() === nomStr.toLowerCase());
    return {
      contents: [
        {
          uri: uri.href,
          mimeType: 'application/json',
          text: JSON.stringify(c ?? { error: `Commune ${nomStr} introuvable` }, null, 2),
        },
      ],
    };
  }
);

server.registerResource(
  'aides-primo-accedant',
  'immo://aides/primo-accedant',
  {
    title: 'Aides primo-accédant',
    description:
      'Conditions, plafonds et défauts des aides cumulables : PTZ, PAS, PEL, CEL, Action Logement, BRS.',
    mimeType: 'application/json',
  },
  async () => ({
    contents: [
      {
        uri: 'immo://aides/primo-accedant',
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            description:
              "Aides cumulables pour primo-accédants en France (2025). Source-vérité de l'app : src/calculators/constants.ts.",
            ptz: {
              description:
                'Prêt à Taux Zéro — neuf en zones tendues A/Abis/B1, ancien avec gros travaux en B2/C',
              quotite_max_pourcent: PTZ_PARAMS.quotite_max * 100,
              plafond_operation_par_zone: PTZ_PARAMS.plafond_operation,
              durees_par_tranche: {
                tranche_1_RFR_25k: { differe_ans: 10, total_ans: 25, quotite_pourcent: 50 },
                tranche_2_RFR_31k: { differe_ans: 8, total_ans: 22, quotite_pourcent: 40 },
                tranche_3_RFR_36k: { differe_ans: 2, total_ans: 20, quotite_pourcent: 40 },
                tranche_4_RFR_49k: { differe_ans: 0, total_ans: 12, quotite_pourcent: 20 },
              },
            },
            pas: {
              description:
                "Prêt à l'Accession Sociale — taux préférentiel + frais hypothécaires réduits",
              reduction_frais_notaire_pourcent: AIDES_DEFAULTS.pas.reduction_frais_notaire * 100,
              plafonds_RFR_zone_B1: { une_personne: 25000, couple: 33000 },
            },
            pel: AIDES_DEFAULTS.pel,
            cel: AIDES_DEFAULTS.cel,
            action_logement: AIDES_DEFAULTS.action_logement,
            brs: {
              ...AIDES_DEFAULTS.brs,
              description:
                'Bail Réel Solidaire : achat du bâti uniquement, foncier en bail. Décote 30-50 %, redevance mensuelle. Plafonds revenus PSLA.',
              opérateurs_locaux_sophia: ['CASA Habitat', 'COL Côte d\'Azur'],
            },
            cumul: {
              ptz_pas_pel_cel_action_logement: true,
              brs_avec_ptz: true,
              brs_avec_pas: false,
              note: "Limite globale : somme des prêts ≤ 100 % de l'opération.",
            },
          },
          null,
          2
        ),
      },
    ],
  })
);

server.registerResource(
  'constants-marche',
  'immo://constants',
  {
    title: 'Constantes marché',
    description:
      'Taux indicatifs banque par durée, frais de notaire neuf/ancien, évolution annuelle prix.',
    mimeType: 'application/json',
  },
  async () => ({
    contents: [
      {
        uri: 'immo://constants',
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            taux_indicatifs_par_duree_ans: TAUX_INDICATIFS,
            frais_notaire: {
              neuf_pourcent: FRAIS_NOTAIRE.neuf * 100,
              ancien_pourcent: FRAIS_NOTAIRE.ancien * 100,
            },
            endettement_max_HCSF_pourcent: 35,
            evolution_annuelle_prix_pourcent: 2.5,
            note: "Taux marché 2025-2026 indicatifs. Vérifier auprès d'un courtier.",
          },
          null,
          2
        ),
      },
    ],
  })
);

// ============================================================================
// PROMPTS
// ============================================================================

server.registerPrompt(
  'analyze_property',
  {
    title: 'Analyser un bien',
    description:
      "Génère une analyse pédagogique complète d'un bien : prix m², écart marché, capacité de financement, aides applicables, paliers d'endettement, recommandations.",
    argsSchema: {
      commune: z.string().optional(),
      prix_bien: z.string().optional(),
      surface: z.string().optional(),
      type_bien: z.enum(['neuf', 'ancien']).optional(),
    },
  },
  ({ commune, prix_bien, surface, type_bien }) => ({
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Tu es un expert en immobilier français primo-accédant. Analyse ce bien :

- Commune : ${commune ?? '(non précisée)'}
- Prix annoncé : ${prix_bien ? prix_bien + ' €' : '(non précisé)'}
- Surface : ${surface ? surface + ' m²' : '(non précisée)'}
- Type : ${type_bien ?? '(non précisé)'}

Étapes :
1. Appelle le tool "simulate" avec ces paramètres pour avoir les chiffres (prix m², frais notaire, mensualité pic, endettement, paliers).
2. Appelle "compute_paliers" pour comprendre la structure d'endettement par phases.
3. Vérifie l'éligibilité PTZ avec "check_ptz_eligibility".
4. Recommande 1-2 optimisations concrètes (durée, aides cumulables, autre commune…).
5. Conclus avec un score de viabilité (HCSF, reste à vivre).

Sois pédagogique et chiffré. Cite les valeurs exactes.`,
        },
      },
    ],
  })
);

// ============================================================================
// START
// ============================================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Note : pas de console.log sur stdout (occupé par le protocole MCP).
  // Pour debug, on peut écrire sur stderr.
  console.error('[simulateur-immo-mcp] connecté via stdio');
}

main().catch((err) => {
  console.error('[simulateur-immo-mcp] fatal error:', err);
  process.exit(1);
});
