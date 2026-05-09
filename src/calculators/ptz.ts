import { PTZ_PARAMS } from './constants';
import type { ZonePTZ } from '@/types';

/**
 * Éligibilité PTZ simplifiée :
 *  - Réservé au neuf en zones tendues (A, Abis, B1) post-réforme 2024.
 *  - Ancien éligible uniquement en zones B2/C avec travaux (non couvert ici).
 */
export function estEligiblePTZ(typeBien: 'neuf' | 'ancien', zone: ZonePTZ): boolean {
  if (typeBien === 'neuf') {
    return zone === 'A' || zone === 'Abis' || zone === 'B1';
  }
  return false;
}

/**
 * Calcul du montant PTZ maximal théorique :
 *  - Plafond d'opération selon zone
 *  - Quotité de financement (40 % par défaut, dépend tranche revenus dans le vrai barème)
 */
export function calculPTZMax(
  prixOperation: number,
  zone: ZonePTZ,
  typeBien: 'neuf' | 'ancien',
  quotite: number = PTZ_PARAMS.quotite_max
): number {
  if (!estEligiblePTZ(typeBien, zone)) return 0;
  const plafond = PTZ_PARAMS.plafond_operation[zone] ?? 0;
  const baseFinancable = Math.min(prixOperation, plafond);
  return Math.round(baseFinancable * quotite);
}
