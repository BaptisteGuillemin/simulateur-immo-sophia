/**
 * Bridge vers le moteur de simulation de l'app Vite.
 * Réutilise tout le code de calcul sans duplication.
 */
export {
  simuler,
  calculPrixBien,
  calculPrixM2,
  calculEcartPrixM2,
  suggererPrixBien,
  comparerNeufAncien,
} from '@/calculators/simulation';

export {
  trouverScenarioOptimal,
  type CritereOptimisation,
  type ScenarioOptimal,
} from '@/calculators/optimizer';

export {
  calculPaliers,
  indexPicPalier,
  SOURCE_LABELS,
  SOURCE_COLORS,
} from '@/calculators/paliers';

export { estEligiblePTZ, calculPTZMax } from '@/calculators/ptz';

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

export const COMMUNES: Commune[] = communesJson as Commune[];

export function getCommune(nom: string): Commune {
  return COMMUNES.find((c) => c.commune === nom) ?? COMMUNES[0];
}
