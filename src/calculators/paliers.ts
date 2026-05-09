import type { PalierMensualite, PalierSource } from '@/types';

/**
 * Un segment temporel de prêt ou redevance, avec sa fenêtre d'activité (en mois)
 * et la mensualité associée. Sert d'entrée à `calculPaliers`.
 */
export interface LoanSegment {
  source: PalierSource;
  /** Mois de début (1-based, inclus). */
  start_mois: number;
  /** Mois de fin (1-based, inclus). */
  end_mois: number;
  /** Mensualité (€) du segment, supposée constante sur sa fenêtre. */
  mensualite: number;
}

/**
 * Calcule les paliers de mensualité sur la durée du financement.
 *
 * Un palier = intervalle de temps où la composition des prêts actifs est stable.
 * Les transitions ont lieu lorsque :
 *  - un prêt commence (par ex. fin du différé PTZ),
 *  - un prêt se termine (par ex. fin du PEL avant le prêt principal).
 *
 * C'est le PIC sur tous les paliers que la banque retient pour le HCSF
 * (et non la somme brute, car certains prêts ne se chevauchent pas).
 *
 * @param loans  Liste des segments de prêts/redevances actifs.
 * @returns Paliers ordonnés chronologiquement, numérotés à partir de 1.
 */
export function calculPaliers(loans: readonly LoanSegment[]): PalierMensualite[] {
  const segmentsActifs = loans.filter((l) => l.mensualite > 0 && l.end_mois >= l.start_mois);
  if (segmentsActifs.length === 0) return [];

  // Bornes : début de chaque prêt + (fin + 1) de chaque prêt
  const bornes = new Set<number>();
  segmentsActifs.forEach((l) => {
    bornes.add(l.start_mois);
    bornes.add(l.end_mois + 1);
  });
  const bornesTriees = [...bornes].sort((a, b) => a - b);

  const paliers: PalierMensualite[] = [];
  for (let i = 0; i < bornesTriees.length - 1; i++) {
    const debut = bornesTriees[i];
    const fin = bornesTriees[i + 1] - 1;
    if (debut > fin) continue;
    const composantes = segmentsActifs
      .filter((l) => l.start_mois <= debut && l.end_mois >= fin)
      .map((l) => ({ source: l.source, mensualite: l.mensualite }));
    if (composantes.length === 0) continue;
    const total = composantes.reduce((acc, c) => acc + c.mensualite, 0);
    paliers.push({
      numero: paliers.length + 1,
      debut_mois: debut,
      fin_mois: fin,
      duree_mois: fin - debut + 1,
      composantes,
      total,
    });
  }
  return paliers;
}

/**
 * Retourne l'indice (0-based) du palier au pic mensuel ; -1 si la liste est vide.
 *
 * @param paliers  Liste de paliers (typiquement issue de `calculPaliers`).
 * @returns Indice du palier dont `total` est maximal, ou -1.
 */
export function indexPicPalier(paliers: readonly PalierMensualite[]): number {
  if (paliers.length === 0) return -1;
  let indexMax = 0;
  for (let i = 1; i < paliers.length; i++) {
    if (paliers[i].total > paliers[indexMax].total) indexMax = i;
  }
  return indexMax;
}

/** Libellé lisible d'une source de mensualité (UI / exports / tooltip). */
export const SOURCE_LABELS: Readonly<Record<PalierSource, string>> = {
  pret_banque: 'Prêt banque',
  assurance_emprunteur: 'Assurance emprunteur',
  ptz: 'PTZ',
  pel: 'PEL',
  cel: 'CEL',
  action_logement: 'Action Logement',
  redevance_brs: 'Redevance BRS',
};

/** Code couleur partagé entre chart et tableau pour chaque source. */
export const SOURCE_COLORS: Readonly<Record<PalierSource, string>> = {
  pret_banque: '#3b6fe0',          // bleu
  assurance_emprunteur: '#e11d48', // rouge
  ptz: '#10b981',                  // vert
  pel: '#06b6d4',                  // cyan
  cel: '#0891b2',                  // cyan foncé
  action_logement: '#14b8a6',      // teal
  redevance_brs: '#8b5cf6',        // violet
};
