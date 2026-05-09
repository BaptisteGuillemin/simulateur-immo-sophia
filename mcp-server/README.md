# Simulateur Immo Sophia — Serveur MCP

Serveur **Model Context Protocol** (stdio, local) qui expose le moteur de simulation immobilière + la gestion de scénarios à Claude Desktop / Claude Code.

Réutilise directement le code de l'app web (`../src/calculators/`) — zéro duplication.

## Installation

```bash
cd mcp-server
npm install
npm run build
```

ou pour un usage dev/sans build :

```bash
npm install
npm run dev    # tsx src/index.ts
```

## Configuration

### Claude Desktop

Édite `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) :

```json
{
  "mcpServers": {
    "simulateur-immo": {
      "command": "node",
      "args": ["/Users/baptiste.guillemin/Documents/App immo/mcp-server/dist/index.js"]
    }
  }
}
```

### Claude Code

```bash
claude mcp add simulateur-immo node "/Users/baptiste.guillemin/Documents/App immo/mcp-server/dist/index.js"
```

Ou avec `tsx` pour zéro étape de build :

```bash
claude mcp add simulateur-immo npx -- tsx "/Users/baptiste.guillemin/Documents/App immo/mcp-server/src/index.ts"
```

Redémarre Claude Desktop ou recharge la session Claude Code après.

## Tools exposés

### Calcul

| Nom | Rôle |
|---|---|
| `simulate` | Simulation complète (mensualités, intérêts, paliers, charges, TRI). |
| `find_optimal_scenario` | Optimum sur durée × PTZ selon critère (coût total / intérêts / cible / compromis). |
| `compare_communes` | Classement des communes pour un même bien. |
| `compute_paliers` | Phases temporelles + pic d'endettement. |
| `compare_neuf_vs_ancien` | Delta frais notaire / mensualité / PTZ entre neuf et ancien. |
| `check_ptz_eligibility` | Éligibilité PTZ + montant max selon zone et type. |

### Scénarios (persistés dans `~/.simulateur-immo-sophia/scenarios.json`)

| Nom | Rôle |
|---|---|
| `save_scenario` | Sauve un scénario sous un nom (UPSERT par nom). |
| `list_scenarios` | Liste avec résumé chiffré. |
| `load_scenario` | Charge par ID UUID ou par nom + lance la simulation. |
| `delete_scenario` | Supprime par ID. |
| `compare_scenarios` | Delta entre deux scénarios. |

Tous les inputs sont **partiels** : tu ne passes que ce que tu veux changer, le reste est complété avec les defaults (Valbonne 232 k€, 40 m², 2 300 €/mois, 40 k€ apport).

## Resources exposées

| URI | Contenu |
|---|---|
| `immo://communes` | Toutes les communes avec leurs données. |
| `immo://commune/{nom}` | Détails d'une commune (auto-complétion). |
| `immo://aides/primo-accedant` | Conditions, plafonds, durées des aides. |
| `immo://constants` | Taux marché, frais notaire, HCSF. |

## Prompts

| Nom | Rôle |
|---|---|
| `analyze_property` | Génère une analyse pédagogique complète à partir de prix/surface/commune. |

## Persistance des scénarios

Les scénarios sont stockés dans :

```
~/.simulateur-immo-sophia/scenarios.json
```

Format atomique (write tmp + rename) — les scénarios sont robustes aux crashes.

Les scénarios MCP sont **indépendants** du localStorage de l'app web. Pour synchroniser, utilise les exports JSON de l'app puis charge via `save_scenario`.

## Test avec MCP Inspector

```bash
npm run inspector
```

Ouvre une UI web pour tester chaque tool/resource sans Claude.

## Dépannage

**Le serveur ne démarre pas** :
- Vérifie que `npm install` a réussi
- Lance `npm run typecheck` pour vérifier la compilation
- Lance `npm run dev` directement et regarde stderr

**Claude ne voit pas les tools** :
- Redémarre Claude Desktop / recharge Claude Code
- Vérifie le path absolu dans la config (pas de `~`, pas de tilde)
- Regarde les logs Claude pour voir si le serveur s'est bien connecté

**Les calculs ne correspondent pas à l'app web** :
- Le code est partagé via les imports `@/calculators/*` — toute mise à jour de l'app web est immédiatement reflétée après rebuild du MCP server.
