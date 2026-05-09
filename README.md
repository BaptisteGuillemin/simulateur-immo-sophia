# 🏠 Simulateur Immo · Sophia Antipolis

> Simulateur immobilier interactif pour primo-accédants français autour de Sophia Antipolis (Côte d'Azur).
> Calculs en temps réel, optimiseur de scénarios, export PDF/JSON, et serveur MCP pour piloter le moteur depuis Claude.

![Capture d'écran du dashboard](docs/screenshot.png)

## Quick start

```bash
git clone https://github.com/BaptisteGuillemin/simulateur-immo-sophia.git
cd simulateur-immo-sophia
npm install
npm run dev
```

L'app tourne sur <http://localhost:5173>.

## Fonctionnalités

- Simulation prêt amortissable (mensualité, intérêts totaux, coût total crédit)
- Capacité d'emprunt avec plafond HCSF (35 %)
- Éligibilité et calcul **PTZ** (zones A / Abis / B1 / B2 / C, quotité 40 %, différé)
- Aides cumulables : **PEL**, **CEL**, **Action Logement**, **PAS** (réduction frais notaire)
- Mode **BRS** (Bail Réel Solidaire) avec décote et redevance foncière
- Frais de notaire ancien vs neuf, calcul des paliers de prêts (pic d'endettement)
- TRI 5 ans simplifié + estimation de revente
- Comparaison automatique **neuf vs ancien**
- Comparateur multi-communes (Sophia Antipolis et alentours)
- Optimiseur automatique : 4 critères (coût total, intérêts, mensualité cible, compromis PTZ)
- Sauvegarde de scénarios en localStorage + export PDF / JSON
- Serveur MCP local exposant le moteur à Claude Desktop / Claude Code

## Architecture

```
.
├── src/                       # App web React
│   ├── calculators/           # Moteur de calcul (financial, ptz, paliers, optimizer, simulation)
│   ├── components/            # UI primitives, sections, charts, ExportBar
│   ├── data/                  # communes.json (prix m², distances)
│   ├── hooks/                 # useSimulationResults, useDebouncedSetter
│   ├── pages/Dashboard.tsx    # Page principale 3 colonnes
│   ├── store/                 # Zustand + persist localStorage
│   ├── types/                 # Types partagés
│   └── utils/                 # format, exporters PDF/JSON
├── mcp-server/                # Serveur MCP stdio (réutilise src/calculators)
│   ├── src/                   # core, schemas, store, helpers
│   └── README.md              # doc dédiée du MCP
├── public/                    # Assets statiques
└── index.html
```

L'app web et le serveur MCP partagent le même moteur de calcul (`src/calculators/`) — toute mise à jour de logique métier est immédiatement reflétée des deux côtés. Les scénarios sauvegardés via MCP sont indépendants du localStorage de l'app web (fichier dans `~/.simulateur-immo-sophia/`).

## Stack technique

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (dark mode)
- **Zustand** (state + persist localStorage)
- **Recharts** (camembert, courbe d'amortissement, comparatif barres)
- **jsPDF** (export PDF structuré)
- **lucide-react** (icônes)
- **@modelcontextprotocol/sdk** (serveur MCP stdio)

## Calculs métier

| Calcul | Source | Référence |
|---|---|---|
| Mensualité prêt amortissable | `calculators/financial.ts` | Formule standard `M = C × t / (1 - (1+t)^-n)` |
| Paliers de prêt + pic d'endettement | `calculators/paliers.ts` | Combine prêt principal + PTZ + aides |
| Éligibilité et montant PTZ | `calculators/ptz.ts` | Barème post-réforme 2024 |
| Aides PEL / CEL / Action Logement | `calculators/financial.ts` | Constantes dans `constants.ts` |
| BRS (Bail Réel Solidaire) | `calculators/simulation.ts` | Décote 30-50 % + redevance €/m²/mois |
| TRI 5 ans simplifié | `calculators/simulation.ts` | Évolution prix 2,5 %/an, frais vente 7 % |
| Plafond HCSF | `calculators/financial.ts` | 35 % du revenu net |

Toutes les valeurs (taux marché, plafonds PTZ, frais de notaire) sont centralisées dans `src/calculators/constants.ts`.

## Communes couvertes

| Commune | Ancien (€/m²) | Neuf (€/m²) | Distance Sophia |
|---|---|---|---|
| Biot | 5 200 | 6 200 | 5 km |
| Valbonne | 4 400 | 5 800 | 2 km |
| Vallauris | 4 400 | 5 700 | 8 km |
| Le Cannet | 4 000 | 5 200 | 12 km |
| Mougins | 6 200 | 7 500 | 7 km |
| Antibes | 5 200 | 7 000 | 10 km |
| Villeneuve-Loubet | 6 000 | 7 500 | 13 km |

Pour ajouter une commune, voir [CONTRIBUTING.md](./CONTRIBUTING.md).

## Serveur MCP

Le projet inclut un serveur **Model Context Protocol** local (stdio) qui expose le moteur de simulation et la gestion de scénarios à Claude Desktop et Claude Code. Tu peux demander à Claude de simuler un achat, comparer des communes, optimiser une durée ou retrouver un scénario sauvé — tout via les tools MCP.

Voir [`mcp-server/README.md`](./mcp-server/README.md) pour l'installation, la liste des tools, resources, prompts, et la configuration Claude Desktop / Claude Code.

## Scripts npm

| Script | Action |
|---|---|
| `npm run dev` | Lance Vite en dev (hot reload, port 5173) |
| `npm run build` | Build production (`tsc -b && vite build`) |
| `npm run preview` | Preview du build dans un serveur statique |
| `npm run typecheck` | Vérification TypeScript sans émission |
| `npm run dev:mcp` | Lance le serveur MCP en mode dev (`tsx`) |
| `npm run build:all` | Build app web + build MCP server |

## Limitations connues

Le simulateur est **indicatif**. Les valeurs (taux marché, frais de notaire, plafonds PTZ, prix au m²) sont des estimations basées sur le marché 2025-2026 et le barème PTZ post-réforme 2024. Pour un projet réel, vérifie systématiquement les chiffres auprès d'un courtier ou d'une banque — eux seuls peuvent t'engager.

L'optimiseur explore un nombre fini de durées (10/15/20/25 ans) et combinaisons PTZ. Il sert à dégrossir, pas à remplacer un conseil personnalisé.

## Licence

[MIT](./LICENSE) — voir le fichier `LICENSE`.

## Auteur

Baptiste Guillemin — projet personnel, contributions bienvenues (voir [CONTRIBUTING.md](./CONTRIBUTING.md)).

Co-développé avec [Claude](https://claude.com/claude-code).
