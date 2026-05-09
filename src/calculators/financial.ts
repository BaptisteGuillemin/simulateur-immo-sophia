import type { AmortissementMois } from '@/types';

/**
 * Mensualité d'un prêt amortissable classique (formule standard).
 * @param capital  Montant emprunté
 * @param tauxAnnuel Taux nominal annuel (en %, ex 2.8)
 * @param dureeAnnees Durée en années
 */
export function calculMensualite(capital: number, tauxAnnuel: number, dureeAnnees: number): number {
  if (capital <= 0 || dureeAnnees <= 0) return 0;
  const n = dureeAnnees * 12;
  const t = tauxAnnuel / 100 / 12;
  if (t === 0) return capital / n;
  return (capital * t) / (1 - Math.pow(1 + t, -n));
}

/** Coût total du crédit (mensualités × n) */
export function calculCoutTotalCredit(mensualite: number, dureeAnnees: number): number {
  return mensualite * dureeAnnees * 12;
}

/** Intérêts totaux versés sur la durée du prêt */
export function calculInteretsTotaux(capital: number, mensualite: number, dureeAnnees: number): number {
  return Math.max(0, calculCoutTotalCredit(mensualite, dureeAnnees) - capital);
}

/**
 * Capacité d'emprunt maximale en respectant le taux d'endettement HCSF.
 * @param salaireMensuel salaire net mensuel
 * @param tauxAnnuel taux nominal du prêt (en %)
 * @param dureeAnnees durée
 * @param tauxEndettement plafond (default 35 %)
 * @param chargesExistantes mensualités déjà existantes (crédits conso, pension...)
 */
export function calculCapaciteEmprunt(
  salaireMensuel: number,
  tauxAnnuel: number,
  dureeAnnees: number,
  tauxEndettement = 0.35,
  chargesExistantes = 0
): number {
  const mensualiteMax = salaireMensuel * tauxEndettement - chargesExistantes;
  if (mensualiteMax <= 0) return 0;
  const n = dureeAnnees * 12;
  const t = tauxAnnuel / 100 / 12;
  if (t === 0) return mensualiteMax * n;
  return (mensualiteMax * (1 - Math.pow(1 + t, -n))) / t;
}

/**
 * Mensualité d'assurance emprunteur (sur capital initial, méthode courante).
 */
export function calculMensualiteAssurance(capital: number, tauxAssuranceAnnuel: number): number {
  return (capital * tauxAssuranceAnnuel) / 12;
}

/**
 * Coût total de l'assurance sur la durée.
 */
export function calculCoutTotalAssurance(
  capital: number,
  tauxAssuranceAnnuel: number,
  dureeAnnees: number
): number {
  return calculMensualiteAssurance(capital, tauxAssuranceAnnuel) * dureeAnnees * 12;
}

/**
 * Frais de notaire : 7.5 % ancien / 2.5 % neuf (calcul simplifié sur prix net).
 */
export function calculFraisNotaire(prixBien: number, tauxNotaire: number): number {
  return prixBien * tauxNotaire;
}

/**
 * PTZ — calcul simplifié (mensualité linéaire après différé).
 * Le PTZ est sans intérêt : on amortit le capital sur la durée hors différé.
 * @param ptzMontant capital PTZ
 * @param dureeTotaleAnnees durée totale (différé + remboursement)
 * @param dureeDiffereAnnees période sans paiement
 * @param moisActuel mois courant (pour savoir si on paie)
 */
export function calculMensualitePTZ(
  ptzMontant: number,
  dureeTotaleAnnees: number,
  dureeDiffereAnnees: number
): number {
  if (ptzMontant <= 0) return 0;
  const dureeRemb = Math.max(1, dureeTotaleAnnees - dureeDiffereAnnees);
  return ptzMontant / (dureeRemb * 12);
}

/**
 * Mensualité moyenne d'un PTZ lissée sur toute la durée (différé inclus) — utile pour le coût mensuel "moyen".
 */
export function calculMensualitePTZLissee(
  ptzMontant: number,
  dureeTotaleAnnees: number
): number {
  if (ptzMontant <= 0 || dureeTotaleAnnees <= 0) return 0;
  return ptzMontant / (dureeTotaleAnnees * 12);
}

/**
 * Tableau d'amortissement complet (mois par mois).
 */
export function tableauAmortissement(
  capital: number,
  tauxAnnuel: number,
  dureeAnnees: number
): AmortissementMois[] {
  const n = dureeAnnees * 12;
  const t = tauxAnnuel / 100 / 12;
  const mensualite = calculMensualite(capital, tauxAnnuel, dureeAnnees);
  const tableau: AmortissementMois[] = [];

  let capitalRestant = capital;
  let cumulInterets = 0;
  let cumulCapital = 0;

  for (let mois = 1; mois <= n; mois++) {
    const interets = capitalRestant * t;
    const capitalRembourse = mensualite - interets;
    capitalRestant = Math.max(0, capitalRestant - capitalRembourse);
    cumulInterets += interets;
    cumulCapital += capitalRembourse;

    tableau.push({
      mois,
      capital_rembourse: capitalRembourse,
      interets,
      capital_restant: capitalRestant,
      cumul_interets: cumulInterets,
      cumul_capital: cumulCapital,
    });
  }
  return tableau;
}

/**
 * Reste à vivre = salaire − mensualité − charges fixes.
 */
export function calculResteAVivre(
  salaireMensuel: number,
  mensualiteTotale: number,
  chargesFixes: number
): number {
  return salaireMensuel - mensualiteTotale - chargesFixes;
}

/**
 * Rendement locatif brut annuel = (loyer × 12) / prix d'achat.
 */
export function calculRendementBrut(loyerMensuel: number, coutAcquisitionTotal: number): number {
  if (coutAcquisitionTotal <= 0) return 0;
  return ((loyerMensuel * 12) / coutAcquisitionTotal) * 100;
}

/**
 * Rendement locatif net = (loyer − charges − taxe foncière) × 12 / prix.
 */
export function calculRendementNet(
  loyerMensuel: number,
  chargesMensuelles: number,
  taxeFonciereAnnuelle: number,
  coutAcquisitionTotal: number
): number {
  if (coutAcquisitionTotal <= 0) return 0;
  const revenuNetAnnuel = loyerMensuel * 12 - chargesMensuelles * 12 - taxeFonciereAnnuelle;
  return (revenuNetAnnuel / coutAcquisitionTotal) * 100;
}

/**
 * TRI simplifié 5 ans pour un primo-accédant qui revend à 5 ans.
 *
 * Logique :
 *  - Cash investi à T0 = apport + frais acquisition (notaire + agence)
 *  - Valeur nette de revente à T5 = prix_revente × (1 − frais_vente) − capital_restant_du
 *  - TRI = (valeur_nette_revente / cash_investi)^(1/durée) − 1
 *
 * Note : on ignore les loyers économisés vs location et les charges payées
 *        durant les 5 ans — c'est un TRI patrimonial, pas un cash-flow TRI.
 */
export function calculTRISimplifie(
  apportInitial: number,
  fraisAcquisition: number,
  pretPrincipalInitial: number,
  prixReventeEstime: number,
  capitalAmortiSur5Ans: number,
  fraisVente: number = 0.07,
  duree_annees: number = 5
): number {
  const cashInvesti = apportInitial + fraisAcquisition;
  if (cashInvesti <= 0) return 0;
  const capitalRestantDu = Math.max(0, pretPrincipalInitial - capitalAmortiSur5Ans);
  const valeurNetteRevente = prixReventeEstime * (1 - fraisVente) - capitalRestantDu;
  if (valeurNetteRevente <= 0) return -100; // perte totale
  const tri = Math.pow(valeurNetteRevente / cashInvesti, 1 / duree_annees) - 1;
  return tri * 100;
}

/**
 * Estimation prix de revente après N années avec taux annuel d'évolution.
 */
export function estimationRevente(prixAchat: number, evolutionAnnuelle: number, annees: number): number {
  return prixAchat * Math.pow(1 + evolutionAnnuelle, annees);
}
