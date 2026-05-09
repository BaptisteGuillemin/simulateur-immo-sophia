import { PTZ_PARAMS } from './constants';
import type { TypeBien, ZonePTZ } from '@/types';

/**
 * Zones PTZ considérées comme "tendues" — éligibles au PTZ neuf post-réforme 2024.
 */
const ZONES_PTZ_NEUF_ELIGIBLES: readonly ZonePTZ[] = ['A', 'Abis', 'B1'] as const;

/**
 * Éligibilité PTZ simplifiée pour un primo-accédant.
 *
 * Règles appliquées :
 *  - Réservé au neuf en zones tendues (A, Abis, B1) post-réforme 2024.
 *  - L'ancien éligible uniquement en zones B2/C avec travaux ≥ 25 % — non couvert ici.
 *
 * @param typeBien Type de bien (`'neuf'` | `'ancien'`).
 * @param zone     Zone PTZ de la commune.
 * @returns `true` si le bien peut bénéficier d'un PTZ.
 */
export function estEligiblePTZ(typeBien: TypeBien, zone: ZonePTZ): boolean {
  if (typeBien !== 'neuf') return false;
  return ZONES_PTZ_NEUF_ELIGIBLES.includes(zone);
}

/**
 * Calcul du montant PTZ maximal théorique.
 *
 * Formule : `PTZ_max = min(prix_opération, plafond_zone) × quotité`.
 *
 * @param prixOperation  Prix total de l'opération (€).
 * @param zone           Zone PTZ (A, Abis, B1, B2, C).
 * @param typeBien       Type de bien (`'neuf'` | `'ancien'`).
 * @param quotite        Quotité de financement (par défaut `PTZ_PARAMS.quotite_max`).
 *                       Le vrai barème dépend de la tranche de revenus.
 * @returns Montant PTZ maximal arrondi à l'euro ; 0 si non éligible.
 */
export function calculPTZMax(
  prixOperation: number,
  zone: ZonePTZ,
  typeBien: TypeBien,
  quotite: number = PTZ_PARAMS.quotite_max
): number {
  if (!estEligiblePTZ(typeBien, zone)) return 0;
  const plafond = PTZ_PARAMS.plafond_operation[zone] ?? 0;
  const baseFinancable = Math.min(prixOperation, plafond);
  return Math.round(baseFinancable * quotite);
}
