/**
 * Bridge vers le moteur de simulation de l'app Vite.
 *
 * Ce module est l'unique point de couplage entre le serveur MCP et l'app web :
 * il re-exporte les calculateurs, types, constantes et données de communes
 * via le path mapping `@/*` (cf. `tsconfig.json`). Toute mise à jour des
 * formules dans `src/calculators/*` est automatiquement reflétée ici après
 * recompilation — zéro duplication de logique métier.
 */

/**
 * Moteur de simulation principal. `simuler()` calcule mensualités, paliers,
 * endettement et coût total pour un trio (utilisateur, bien, prêt) sur une
 * commune donnée.
 */
export {
  simuler,
  calculPrixBien,
  calculPrixM2,
  calculEcartPrixM2,
  suggererPrixBien,
  comparerNeufAncien,
} from '@/calculators/simulation';

/**
 * Optimiseur grid-search (durée × PTZ on/off) qui retourne le meilleur
 * scénario sous contraintes HCSF (endettement ≤ 35 %) et apport restant ≥ 0.
 */
export {
  trouverScenarioOptimal,
  type CritereOptimisation,
  type ScenarioOptimal,
} from '@/calculators/optimizer';

/**
 * Décomposition de la mensualité en phases temporelles (paliers).
 * Le pic de mensualité (max sur les paliers) est l'indicateur HCSF —
 * c'est ce qui doit rester ≤ 35 % du salaire net, pas la somme brute.
 */
export {
  calculPaliers,
  indexPicPalier,
  SOURCE_LABELS,
  SOURCE_COLORS,
} from '@/calculators/paliers';

/**
 * Règles d'éligibilité PTZ et calcul du montant maximum mobilisable
 * en fonction de la zone (Abis/A/B1/B2/C) et du type de bien (neuf/ancien).
 */
export { estEligiblePTZ, calculPTZMax } from '@/calculators/ptz';

/**
 * Constantes marché (taux indicatifs banque par durée, frais notaire,
 * paramètres PTZ) et defaults des aides primo-accédant (PEL, CEL,
 * Action Logement, BRS).
 */
export {
  TAUX_INDICATIFS,
  TAUX_ASSURANCE_DEFAULT,
  AIDES_DEFAULTS,
  PTZ_PARAMS,
  FRAIS_NOTAIRE,
  EVOLUTION_ANNUELLE_PRIX,
} from '@/calculators/constants';

export type {
  Commune,
  ParametresUtilisateur,
  ParametresBien,
  ParametresPret,
  Resultats,
  PalierMensualite,
  PalierSource,
  Scenario,
  ZonePTZ,
  TypeBien,
  Attractivite,
} from '@/types';

import communesJson from '@/data/communes.json';
import type { Commune } from '@/types';

/**
 * Référentiel des communes Sophia Antipolis (10 communes : prix m² neuf/ancien,
 * zone PTZ, attractivité, fiscalité, charges copro). Source : `src/data/communes.json`.
 */
export const COMMUNES: Commune[] = communesJson as Commune[];

/**
 * Récupère une commune par son nom exact (case-sensitive).
 * Si introuvable, fallback sur la première commune du référentiel
 * (Valbonne par défaut). Pour une recherche stricte avec erreur,
 * inspecter `COMMUNES` directement.
 *
 * @param nom Nom de la commune (ex: "Valbonne", "Mougins")
 * @returns L'objet `Commune` correspondant ou la première du référentiel
 */
export function getCommune(nom: string): Commune {
  return COMMUNES.find((c) => c.commune === nom) ?? COMMUNES[0];
}
