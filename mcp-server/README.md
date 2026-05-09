# Simulateur Immo Sophia — Serveur MCP

Serveur **Model Context Protocol** (stdio, local) qui expose le moteur de simulation immobilière + la gestion de scénarios à Claude Desktop / Claude Code.

Réutilise directement le code de l'app web (`../src/calculators/`) — zéro duplication.

## Architecture

```
+---------------------------+        path-mapped imports        +---------------------+
|  Claude Desktop / Code    |   <-- stdio (newline-JSON) -->    |  mcp-server/        |
|  (client MCP)             |                                   |  - index.ts         |
+---------------------------+                                   |  - core.ts ---------+--> @/calculators/* (app web)
                                                                |  - schemas.ts (Zod) |    @/types
                                                                |  - helpers.ts       |    @/data/communes.json
                                                                |  - defaults.ts      |
                                                                |  - store.ts -------> ~/.simulateur-immo-sophia/scenarios.json
                                                                +---------------------+
```

`core.ts` est le seul point de couplage avec l'app parente : il re-exporte les calculateurs via le path mapping `@/*` configuré dans `tsconfig.json`. Toute mise à jour de `src/calculators/*` est automatiquement reflétée après recompilation.

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

## Exemples d'usage avec Claude

Une fois le serveur connecté, parle naturellement à Claude — il choisit lui-même les tools à appeler.

- « Simule l'achat d'un T3 de 65 m² à Mougins à 380 k€ avec 50 k€ d'apport et 3 200 € de salaire net. »
- « Compare Mougins vs Valbonne pour un T3 350 k€, mon profil. »
- « Trouve-moi le scénario optimal en coût total pour le bien de Vallauris. »
- « Sauve ce scénario sous le nom "Mougins T3 ref" puis compare-le à "Valbonne T3 ref". »
- « Suis-je éligible PTZ pour un bien neuf en zone B1 ? Quel est le montant max sur 320 k€ ? »
- « Décompose les paliers de mensualité du scénario courant — où est le pic d'endettement HCSF ? »
- « Liste mes scénarios sauvegardés et classe-les par coût total. »

Tous les inputs sont **partiels** : tu ne précises que ce qui change, le reste est complété avec les defaults (Valbonne 232 k€, 40 m², 2 300 €/mois, 40 k€ apport).

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
| `list_scenarios` | Liste avec résumé chiffré (simulation rejouée). |
| `load_scenario` | Charge par UUID ou par nom + lance la simulation. |
| `delete_scenario` | Supprime par UUID. |
| `compare_scenarios` | Delta entre deux scénarios. |

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

Format atomique (write tmp + rename) — robuste aux crashes. En cas de fichier corrompu, il est automatiquement renommé en `.corrupt-<timestamp>` et un store vide est recréé.

Les scénarios MCP sont **indépendants** du localStorage de l'app web. Pour synchroniser, utilise les exports JSON de l'app puis charge via `save_scenario`.

## Test avec MCP Inspector

```bash
npm run inspector
```

Ouvre une UI web pour tester chaque tool/resource sans Claude.

## Smoke test stdio

Vérifie que le serveur démarre et expose bien la liste des tools :

```bash
npm run smoke
```

Le script envoie `initialize`, `notifications/initialized`, puis `tools/list` et affiche les 3 premières lignes JSON de réponse.

## Dépannage

### Le serveur ne démarre pas

- Vérifie que `npm install` a réussi (notamment `@modelcontextprotocol/sdk` et `tsx`).
- Lance `npm run typecheck` pour vérifier la compilation TypeScript (le path mapping `@/*` doit résoudre les fichiers de l'app parente).
- Lance `npm run dev` directement et regarde stderr — le serveur log `[simulateur-immo-mcp] connecté via stdio` au démarrage.

### Claude ne voit pas les tools

- Redémarre Claude Desktop / recharge Claude Code après modification de la config.
- Vérifie le path absolu dans la config (pas de `~`, pas de tilde — les MCP servers sont lancés sans expansion shell).
- Regarde les logs Claude Desktop (`~/Library/Logs/Claude/`) pour voir si le serveur s'est bien connecté.

### Une erreur dans un tool retourne un message « Erreur interne »

C'est volontaire : les exceptions sont capturées et converties en réponse MCP propre (jamais de stack trace exposée). Pour le détail, lance le serveur en dev (`npm run dev`) et observe stderr — l'erreur originale y est conservée par Node.

### Les calculs ne correspondent pas à l'app web

- Le code est partagé via les imports `@/calculators/*` — toute mise à jour de l'app web est immédiatement reflétée après rebuild du MCP server (`npm run build`).
- Vérifie que les **defaults** du MCP (`src/defaults.ts`) sont alignés sur le store Zustand de l'app (`src/store/simulationStore.ts`). Les tools acceptent des inputs partiels et complètent avec ces defaults.

### Erreur « Aucune commune reconnue » dans `compare_communes`

Les noms doivent matcher exactement le référentiel `src/data/communes.json` (case-sensitive). Utilise la resource `immo://communes` ou le tool `simulate` sans paramètre pour découvrir les noms valides.

### Erreur « Aucun scénario viable » dans `find_optimal_scenario`

Les contraintes HCSF (endettement ≤ 35 % du salaire net, apport restant ≥ 0) ne sont pas respectées sur la grille explorée. Pistes : augmenter `utilisateur.apport`, réduire `bien.prix_bien`, ou activer des aides cumulables (`pret.pas_actif`, `pret.action_logement_actif`).
