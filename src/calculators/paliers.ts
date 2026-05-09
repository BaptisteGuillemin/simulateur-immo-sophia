import type { PalierMensualite, PalierSource } from '@/types';

export interface LoanSegment {
  source: PalierSource;
  start_mois: number;   // 1-based, inclus
  end_mois: number;     // inclus
  mensualite: number;
}

/**
 * Calcule les paliers de mensualité sur la durée du financement.
 *
 * Un palier = intervalle de temps où la composition des prêts actifs est stable.
 * Les transitions ont lieu lorsque :
 *  - un prêt commence (fin différé PTZ par ex)
 *  - un prêt se termine (fin PEL court avant le prêt principal par ex)
 *
 * C'est le PIC sur tous les paliers que la banque retient pour le HCSF
 * (et non la somme brute, car certains prêts ne se chevauchent pas).
 */
export function calculPaliers(loans: LoanSegment[]): PalierMensualite[] {
  const actifs = loans.filter((l) => l.mensualite > 0 && l.end_mois >= l.start_mois);
  if (actifs.length === 0) return [];

  // Bornes : début de chaque prêt + (fin + 1) de chaque prêt
  const bornes = new Set<number>();
  actifs.forEach((l) => {
    bornes.add(l.start_mois);
    bornes.add(l.end_mois + 1);
  });
  const sorted = [...bornes].sort((a, b) => a - b);

  const paliers: PalierMensualite[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const debut = sorted[i];
    const fin = sorted[i + 1] - 1;
    if (debut > fin) continue;
    // Composition à cet intervalle
    const composantes = actifs
      .filter((l) => l.start_mois <= debut && l.end_mois >= fin)
      .map((l) => ({ source: l.source, mensualite: l.mensualite }));
    const total = composantes.reduce((s, c) => s + c.mensualite, 0);
    if (composantes.length === 0) continue;
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

/** Retourne l'indice (0-based) du palier au pic ; -1 si vide. */
export function indexPicPalier(paliers: PalierMensualite[]): number {
  if (paliers.length === 0) return -1;
  let maxI = 0;
  for (let i = 1; i < paliers.length; i++) {
    if (paliers[i].total > paliers[maxI].total) maxI = i;
  }
  return maxI;
}

/** Libellé lisible d'une source de mensualité. */
export const SOURCE_LABELS: Record<PalierSource, string> = {
  pret_banque: 'Prêt banque',
  assurance_emprunteur: 'Assurance emprunteur',
  ptz: 'PTZ',
  pel: 'PEL',
  cel: 'CEL',
  action_logement: 'Action Logement',
  redevance_brs: 'Redevance BRS',
};

/** Code couleur partagé entre chart et tableau. */
export const SOURCE_COLORS: Record<PalierSource, string> = {
  pret_banque: '#3b6fe0',          // bleu
  assurance_emprunteur: '#e11d48', // rouge
  ptz: '#10b981',                  // vert
  pel: '#06b6d4',                  // cyan
  cel: '#0891b2',                  // cyan foncé
  action_logement: '#14b8a6',      // teal
  redevance_brs: '#8b5cf6',        // violet
};
