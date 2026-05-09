#!/usr/bin/env node
/**
 * Serveur MCP stdio — Simulateur Immo Sophia.
 *
 * Expose 11 tools (calcul + gestion scénarios), 4 resources et 1 prompt
 * au-dessus du moteur de simulation de l'app web parente. Tous les inputs
 * sont partiels : les defaults proviennent de `defaults.ts` (alignés sur
 * le store Zustand de l'app).
 *
 * Architecture :
 *   index.ts  — registre tools / resources / prompt + main()
 *   core.ts   — bridge vers @/calculators/* (path mapping)
 *   defaults.ts — defaults alignés sur le store Zustand
 *   helpers.ts  — resolveInput, resumeResultats, safeHandler, json/error
 *   schemas.ts  — schemas Zod (validation MCP)
 *   store.ts    — persistance JSON file-based dans ~/.simulateur-immo-sophia/
 *
 * Note : le serveur communique via stdio. **Aucun `console.log` sur stdout** :
 * stdout est dédié au protocole MCP (newline-delimited JSON). Le debug se
 * fait sur stderr.
 */
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
  deleteScenarioSchema,
} from './schemas.js';
import {
  resolveInput,
  resumeResultats,
  resolveCommune,
  json,
  errorResponse,
  safeHandler,
} from './helpers.js';
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

// ============================================================================
// CALCULATION TOOLS
// ============================================================================

server.registerTool(
  'simulate',
  {
    title: 'Simuler un achat immobilier',
    description:
      "Lance une simulation complète : mensualités, intérêts, paliers d'endettement, charges, rendement locatif, TRI 5 ans. " +
      "Tous les paramètres sont OPTIONNELS — les defaults sont alignés sur l'app web (Valbonne 232 k€, 40 m² neuf, salaire 2 300 €/mois, apport 40 k€). " +
      "À utiliser dès qu'on veut chiffrer un projet : il suffit de passer les champs qui changent (ex: bien.commune='Mougins', bien.prix_bien=350000).",
    inputSchema: simulationInputSchema,
  },
  async (args) =>
    safeHandler('simulate', async () => {
      const { utilisateur, bien, pret } = resolveInput(args);
      const commune = resolveCommune(bien.commune);
      const resultats = simuler(utilisateur, bien, pret, commune);
      return json({ utilisateur, bien, pret, commune, resultats });
    })
);

server.registerTool(
  'find_optimal_scenario',
  {
    title: 'Trouver le scénario optimal',
    description:
      "Explore la grille (durées 10/15/20/25 ans × PTZ on/off) sous contraintes HCSF (endettement ≤ 35 %, apport restant ≥ 0) et retourne le meilleur scénario selon le critère choisi. " +
      "Critères disponibles : 'cout_total' (coût total min), 'interets_min' (intérêts banque min), 'mensualite_cible' (mensualité cible fournie), 'compromis_ptz' (par défaut, équilibre intérêts/mensualité). " +
      "Si aucun scénario ne respecte les contraintes, retourne une erreur explicative au lieu d'un fallback silencieux.",
    inputSchema: findOptimalSchema,
  },
  async (args) =>
    safeHandler('find_optimal_scenario', async () => {
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

      // L'optimiseur retourne un fallback avec un score=0 et une description
      // explicite quand aucun scénario viable n'a été trouvé. On le détecte
      // pour renvoyer un message MCP clair au lieu de masquer l'échec.
      if (r.score === 0 && r.description.startsWith('Aucun scénario optimal')) {
        return errorResponse(
          'find_optimal_scenario',
          "Aucun scénario viable n'a été trouvé sous les contraintes HCSF (endettement ≤ 35 %, apport restant ≥ 0). " +
            "Pistes : augmenter l'apport, viser un bien moins cher, ou réduire le salaire requis.",
          {
            critere: args.critere,
            commune: bien.commune,
            prix_bien: bien.prix_bien,
            apport: utilisateur.apport,
            salaire_net_mensuel: utilisateur.salaire_net_mensuel,
            scenario_courant_resume: resumeResultats(r.resultats),
          }
        );
      }

      return json({
        description: r.description,
        score: r.score,
        pret: r.pret,
        resume: resumeResultats(r.resultats),
        resultats_complets: r.resultats,
      });
    })
);

server.registerTool(
  'compare_communes',
  {
    title: 'Comparer les communes',
    description:
      "Lance la même simulation sur plusieurs communes (toutes les 10 par défaut) et retourne un classement par coût total réel ascendant. " +
      "Utile pour répondre à : 'pour mon profil et un T3 350 k€, où est-ce le plus rentable entre Mougins et Valbonne ?'.",
    inputSchema: compareCommunesSchema,
  },
  async (args) =>
    safeHandler('compare_communes', async () => {
      const base = resolveInput(args);
      const requested = args.communes ?? COMMUNES.map((c) => c.commune);

      const valides = requested.filter((nom) => COMMUNES.find((c) => c.commune === nom));
      const inconnues = requested.filter((nom) => !COMMUNES.find((c) => c.commune === nom));

      if (valides.length === 0) {
        return errorResponse(
          'compare_communes',
          `Aucune commune reconnue parmi celles fournies. Communes disponibles : ${COMMUNES.map((c) => c.commune).join(', ')}.`,
          { communes_inconnues: inconnues }
        );
      }

      const results = valides.map((nom) => {
        const commune = resolveCommune(nom);
        const bien = { ...base.bien, commune: nom };
        const r = simuler(base.utilisateur, bien, base.pret, commune);
        return {
          commune: nom,
          zone_ptz: commune.zone_ptz,
          attractivite: commune.attractivite,
          prix_m2_reference:
            bien.type_bien === 'neuf' ? commune.prix_m2_neuf : commune.prix_m2_ancien,
          ...resumeResultats(r),
        };
      });
      results.sort((a, b) => a.cout_total_reel - b.cout_total_reel);
      return json({
        classement: results,
        ...(inconnues.length > 0 && { communes_ignorees_inconnues: inconnues }),
      });
    })
);

server.registerTool(
  'compute_paliers',
  {
    title: 'Calculer les paliers de mensualité',
    description:
      "Décompose la mensualité totale en phases temporelles (paliers) où la composition ne change pas — ex: phase avec PEL+CEL+PTZ différé, puis phase sans PEL, puis phase post-PTZ. " +
      "Indispensable pour comprendre le pic d'endettement HCSF (= max des paliers, PAS la somme brute). Retourne aussi le numéro du palier au pic et le taux d'endettement.",
    inputSchema: simulationInputSchema,
  },
  async (args) =>
    safeHandler('compute_paliers', async () => {
      const { utilisateur, bien, pret } = resolveInput(args);
      const commune = resolveCommune(bien.commune);
      const r = simuler(utilisateur, bien, pret, commune);
      return json({
        pic_mensualite: r.pic_mensualite_palier,
        pic_palier_numero: r.pic_palier_numero,
        taux_endettement: r.taux_endettement,
        paliers: r.paliers,
      });
    })
);

server.registerTool(
  'compare_neuf_vs_ancien',
  {
    title: 'Comparer neuf vs ancien',
    description:
      "Compare le même bien (même commune, même surface) en neuf vs ancien : delta frais notaire (~7,5 % vs 2,5 %), mensualité, intérêts, montant PTZ mobilisable. " +
      "Pratique pour arbitrer un projet : 'j'hésite entre un T2 neuf et un T2 ancien à Valbonne'.",
    inputSchema: simulationInputSchema,
  },
  async (args) =>
    safeHandler('compare_neuf_vs_ancien', async () => {
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
    })
);

server.registerTool(
  'check_ptz_eligibility',
  {
    title: 'Vérifier éligibilité PTZ',
    description:
      "Retourne l'éligibilité PTZ (booléen + raison) selon zone PTZ (Abis/A/B1/B2/C), type de bien (neuf/ancien) et statut primo-accédant. " +
      "Si `prix_operation` est fourni, calcule en plus le montant PTZ max mobilisable selon la quotité réglementaire et le plafond zone. " +
      "Rappel : neuf éligible en zones tendues A/Abis/B1, ancien éligible avec gros travaux en zones B2/C.",
    inputSchema: checkEligibilityPTZSchema,
  },
  async (args) =>
    safeHandler('check_ptz_eligibility', async () => {
      const eligibleZone = estEligiblePTZ(args.type_bien, args.zone_ptz);
      const eligible = eligibleZone && args.primo_accedant;
      const montant_max =
        eligible && typeof args.prix_operation === 'number'
          ? calculPTZMax(args.prix_operation, args.zone_ptz, args.type_bien)
          : 0;
      const reason = !args.primo_accedant
        ? 'PTZ réservé aux primo-accédants (pas de propriété principale dans les 2 dernières années)'
        : !eligibleZone
          ? `Type "${args.type_bien}" non éligible en zone ${args.zone_ptz} (neuf : A/Abis/B1 ; ancien avec travaux : B2/C)`
          : 'Éligible PTZ';
      return json({
        eligible,
        reason,
        zone_ptz: args.zone_ptz,
        type_bien: args.type_bien,
        plafond_operation_zone: PTZ_PARAMS.plafond_operation[args.zone_ptz] ?? null,
        quotite_max_pourcent: PTZ_PARAMS.quotite_max * 100,
        prix_operation_fourni: args.prix_operation ?? null,
        montant_max,
        ...(eligible && typeof args.prix_operation !== 'number'
          ? {
              note:
                "Pour calculer le montant PTZ max mobilisable, fournir `prix_operation` (prix total opération en €).",
            }
          : {}),
      });
    })
);

// ============================================================================
// SCENARIO TOOLS
// ============================================================================

server.registerTool(
  'save_scenario',
  {
    title: 'Sauvegarder un scénario',
    description:
      "Enregistre un scénario (utilisateur + bien + prêt) sous un nom. UPSERT par nom (insensible à la casse) : si un scénario du même nom existe, il est mis à jour en conservant son UUID et sa date de création. " +
      "Stocké dans ~/.simulateur-immo-sophia/scenarios.json (écriture atomique).",
    inputSchema: saveScenarioSchema,
  },
  async (args) =>
    safeHandler('save_scenario', async () => {
      if (!args.name?.trim()) {
        return errorResponse(
          'save_scenario',
          'Le nom du scénario est requis et ne peut pas être vide ou ne contenir que des espaces.'
        );
      }
      const { utilisateur, bien, pret } = resolveInput(args);
      try {
        const saved = saveScenario({
          name: args.name,
          notes: args.notes,
          utilisateur,
          bien,
          pret,
        });
        return json({ saved, store_path: getStorePath() });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        return errorResponse('save_scenario', message);
      }
    })
);

server.registerTool(
  'list_scenarios',
  {
    title: 'Lister les scénarios sauvegardés',
    description:
      "Retourne tous les scénarios persistés avec un résumé chiffré (commune, surface, type, mensualité pic, endettement, coût total) — la simulation est rejouée à chaque appel pour refléter d'éventuelles évolutions du moteur.",
    inputSchema: {},
  },
  async () =>
    safeHandler('list_scenarios', async () => {
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
    })
);

server.registerTool(
  'load_scenario',
  {
    title: 'Charger un scénario',
    description:
      "Charge un scénario par UUID OU par nom (insensible à la casse) et lance la simulation pour retourner les résultats à jour. Si non trouvé, retourne une erreur explicative.",
    inputSchema: idOrNameSchema,
  },
  async (args) =>
    safeHandler('load_scenario', async () => {
      const sc = findScenario(args.id_or_name);
      if (!sc) {
        return errorResponse(
          'load_scenario',
          `Aucun scénario trouvé avec l'identifiant "${args.id_or_name}". Utilise list_scenarios pour voir les scénarios disponibles.`
        );
      }
      const commune = resolveCommune(sc.bien.commune);
      const resultats = simuler(sc.utilisateur, sc.bien, sc.pret, commune);
      return json({
        scenario: sc,
        resultats,
        resume: resumeResultats(resultats),
      });
    })
);

server.registerTool(
  'delete_scenario',
  {
    title: 'Supprimer un scénario',
    description:
      "Supprime un scénario sauvegardé par UUID (pas par nom — pour éviter les ambiguïtés). Retourne une erreur explicative si l'UUID n'existe pas.",
    inputSchema: deleteScenarioSchema,
  },
  async (args) =>
    safeHandler('delete_scenario', async () => {
      const ok = deleteScenario(args.id);
      if (!ok) {
        return errorResponse(
          'delete_scenario',
          `Aucun scénario trouvé avec l'UUID "${args.id}". Utilise list_scenarios pour voir les UUIDs valides.`
        );
      }
      return json({
        deleted: true,
        id: args.id,
        message: `Scénario ${args.id} supprimé.`,
      });
    })
);

server.registerTool(
  'compare_scenarios',
  {
    title: 'Comparer deux scénarios',
    description:
      "Compare deux scénarios sauvegardés (par UUID ou par nom) et retourne les deltas sur les indicateurs clés : mensualité pic, coût total, intérêts banque, taux d'endettement. " +
      "delta = scenario_b − scenario_a (positif = b est plus cher / plus chargé).",
    inputSchema: compareScenariosSchema,
  },
  async (args) =>
    safeHandler('compare_scenarios', async () => {
      const a = findScenario(args.scenario_a);
      const b = findScenario(args.scenario_b);
      if (!a || !b) {
        const missing: string[] = [];
        if (!a) missing.push(`"${args.scenario_a}"`);
        if (!b) missing.push(`"${args.scenario_b}"`);
        return errorResponse(
          'compare_scenarios',
          `Scénario(s) introuvable(s) : ${missing.join(', ')}. Utilise list_scenarios pour voir les scénarios disponibles.`,
          { found_a: !!a, found_b: !!b }
        );
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
    })
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
    title: "Détails d'une commune",
    description:
      "Détails complets pour une commune donnée (auto-complétion sur les noms valides). Recherche insensible à la casse.",
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
          text: JSON.stringify(
            c ?? {
              error: `Commune "${nomStr}" introuvable`,
              communes_disponibles: COMMUNES.map((x) => x.commune),
            },
            null,
            2
          ),
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
              opérateurs_locaux_sophia: ['CASA Habitat', "COL Côte d'Azur"],
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

async function main(): Promise<void> {
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
