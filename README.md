# Simulateur Immo · Sophia Antipolis

Simulateur immobilier ultra interactif spécialisé **primo-accédant France / Sophia Antipolis**.

Modifie en temps réel apport, salaire, type de bien, commune, prix au m², surface, PTZ, taux, durée, frais notaire/agence, assurance, charges copro et taxe foncière — tous les calculs se mettent à jour automatiquement.

## Stack

- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** (dark mode premium)
- **Zustand** (state + persistance localStorage)
- **Recharts** (camembert, courbe d'amortissement, comparatif)
- **jsPDF** (export PDF)
- **lucide-react** (icônes)

## Lancement

```bash
npm install
npm run dev
```

Ouvre <http://localhost:5173>.

```bash
npm run build      # build production
npm run preview    # preview du build
npm run typecheck  # vérification TS uniquement
```

## Fonctionnalités

### Calculs métier (français)

- Mensualité prêt amortissable (formule standard)
- Coût total crédit + intérêts totaux
- Capacité d'emprunt (HCSF 35 %)
- **PTZ** : éligibilité (neuf zones A/Abis/B1), quotité 40 %, plafonds par zone, différé + remboursement
- Frais de notaire : **7,5 % ancien · 2,5 % neuf**
- Assurance emprunteur : 0,25 % annuel par défaut (ajustable)
- Reste à vivre, cash restant après achat
- Rendement locatif brut/net
- TRI 5 ans simplifié + estimation revente
- Comparaison **neuf vs ancien** automatique

### Communes (Sophia Antipolis)

Données pré-chargées dans `src/data/communes.json` :

| Commune | Ancien (€/m²) | Neuf (€/m²) | Distance Sophia |
|---|---|---|---|
| Biot | 5 200 | 6 200 | 5 km |
| Valbonne | 4 400 | 5 800 | 2 km |
| Vallauris | 4 400 | 5 700 | 8 km |
| Le Cannet | 4 000 | 5 200 | 12 km |
| Mougins | 6 200 | 7 500 | 7 km |
| Antibes | 5 200 | 7 000 | 10 km |
| Villeneuve-Loubet | 6 000 | 7 500 | 13 km |

### Interface

- Dashboard 3 colonnes responsive
- **Sliders dynamiques** + champs numériques + toggles
- **Tooltips pédagogiques** sur tous les paramètres
- Camembert décomposition coût total
- Courbe d'amortissement 20+ ans
- Comparatif barres neuf vs ancien
- **Optimiseur automatique** : 4 critères (coût total, intérêts, mensualité cible, compromis PTZ)
- **Scénarios sauvegardés** (localStorage)
- **Export PDF** structuré
- **Export JSON** pour archivage / partage

## Architecture

```
src/
├── data/                # JSON statique (communes)
├── types/               # Types TS partagés
├── calculators/
│   ├── constants.ts     # Frais notaire, taux, plafonds PTZ
│   ├── financial.ts     # Mensualité, amortissement, capacité, rendement
│   ├── ptz.ts           # Éligibilité + montant PTZ
│   ├── simulation.ts    # Moteur principal (assemble tout)
│   └── optimizer.ts     # Recherche scénario optimal
├── store/               # Zustand + persist
├── hooks/               # useSimulationResults
├── utils/               # format euro/%/date, exporters PDF/JSON
├── components/
│   ├── ui/              # Slider, Select, Toggle, NumberField, Tooltip, Stat
│   ├── sections/        # SectionUtilisateur, SectionBien, SectionPret, SectionResultats, OptimizerPanel, ScenariosManager
│   ├── charts/          # ChartCoutTotal, ChartAmortissement, ChartComparaison
│   └── ExportBar.tsx
└── pages/
    └── Dashboard.tsx
```

## Extension

- Ajouter une commune : éditer `src/data/communes.json`
- Ajuster taux marché : `src/calculators/constants.ts` (`TAUX_INDICATIFS`)
- Ajuster plafonds PTZ : `src/calculators/constants.ts` (`PTZ_PARAMS.plafond_operation`)
- Ajouter un critère d'optimisation : `src/calculators/optimizer.ts`

## Notes

Les valeurs (taux, frais, plafonds PTZ) sont des **estimations indicatives** basées sur le marché 2025-2026 et le barème PTZ post-réforme 2024. Toujours vérifier auprès d'un courtier ou d'une banque pour des chiffres engageants.
