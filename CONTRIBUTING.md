# Contribuer

Merci de l'intérêt pour le projet. Voici comment participer sans casser quoi que ce soit.

## Installation dev

```bash
git clone https://github.com/BaptisteGuillemin/simulateur-immo-sophia.git
cd simulateur-immo-sophia
npm install
npm run dev
```

Pour le serveur MCP :

```bash
cd mcp-server
npm install
npm run dev
```

## Avant un PR

Toujours vérifier que ces deux commandes passent :

```bash
npm run typecheck
npm run build
```

Si tu touches au MCP server :

```bash
cd mcp-server && npm run typecheck && npm run build
```

## Convention de commits

Format simple :

```
type: description courte à l'impératif
```

Types courants : `feat`, `fix`, `refactor`, `docs`, `chore`, `test`, `style`.

Exemples :
- `feat: ajoute le calcul BRS dans l'optimiseur`
- `fix: corrige le plafond PTZ zone B1`
- `docs: clarifie l'install MCP dans le README`

Une seule responsabilité par commit. Les PRs avec un seul commit propre sont les plus faciles à reviewer.

## Ajouter une commune

1. Ouvre `src/data/communes.json`
2. Ajoute un objet avec la même forme que les autres entrées (`nom`, `prix_m2_ancien`, `prix_m2_neuf`, `distance_sophia_km`, zone PTZ…).
3. Vérifie que `npm run typecheck` passe — les types dans `src/types/` te diront ce qui manque.
4. Pas besoin de toucher au MCP server : il lit le même JSON.

## Ajouter un tool MCP

1. Ouvre `mcp-server/src/index.ts` et ajoute la déclaration du tool.
2. Ajoute le schéma d'input dans `mcp-server/src/schemas.ts`.
3. Implémente l'appel dans `mcp-server/src/core.ts` (idéalement en réutilisant `src/calculators/`).
4. Documente le tool dans `mcp-server/README.md` (tableau des tools).
5. Teste avec `npm run inspector` depuis `mcp-server/`.

## Modifier les calculs métier

Le moteur est dans `src/calculators/`. C'est partagé avec le MCP server, donc tout changement y impacte les deux. Les constantes (taux marché, plafonds PTZ, frais notaire) sont centralisées dans `src/calculators/constants.ts` — privilégie une modif là plutôt que d'inliner des valeurs.

## Style

- TypeScript strict, pas de `any` non justifié.
- Composants UI : Tailwind, pas de CSS modules.
- État global : Zustand uniquement (`src/store/`).
- Pas d'ajout de dépendance sans discussion préalable.

## Questions

Ouvre une [issue GitHub](https://github.com/BaptisteGuillemin/simulateur-immo-sophia/issues) avant de commencer un gros chantier — c'est plus rapide qu'un PR rejeté.
