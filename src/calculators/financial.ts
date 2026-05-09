import type { AmortissementMois } from '@/types';
import {
  ANNEES_HORIZON_REVENTE,
  ENDETTEMENT_MAX,
  FRAIS_VENTE_DEFAULT,
  MOIS_PAR_AN,
} from './constants';

/**
 * Mensualité d'un prêt amortissable classique à taux fixe.
 *
 * Formule : `M = K × t / (1 − (1 + t)^(−n))`
 * où K = capital, t = taux mensuel, n = nombre de mensualités.
 * Cas dégénéré t = 0 (prêt à taux zéro) : `M = K / n`.
 *
 * @param capital      Montant emprunté (€).
 * @param tauxAnnuel   Taux nominal annuel en pourcentage (ex 2.8 pour 2.8 %).
 * @param dureeAnnees  Durée totale du prêt en années.
 * @returns Mensualité en € (hors assurance). 0 si capital ou durée non valides.
 */
export function calculMensualite(capital: number, tauxAnnuel: number, dureeAnnees: number): number {
  if (capital <= 0 || dureeAnnees <= 0) return 0;
  const nbMensualites = dureeAnnees * MOIS_PAR_AN;
  const tauxMensuel = tauxAnnuel / 100 / MOIS_PAR_AN;
  if (tauxMensuel === 0) return capital / nbMensualites;
  return (capital * tauxMensuel) / (1 - Math.pow(1 + tauxMensuel, -nbMensualites));
}

/**
 * Coût total d'un crédit (somme nominale des mensualités).
 *
 * Formule : `coût_total = mensualité × n`, avec n = durée_années × 12.
 *
 * @param mensualite   Mensualité (€).
 * @param dureeAnnees  Durée totale (années).
 * @returns Coût total brut payé sur la durée du prêt.
 */
export function calculCoutTotalCredit(mensualite: number, dureeAnnees: number): number {
  return mensualite * dureeAnnees * MOIS_PAR_AN;
}

/**
 * Intérêts totaux versés sur la durée du prêt (= coût total − capital).
 *
 * @param capital      Capital emprunté (€).
 * @param mensualite   Mensualité (€).
 * @param dureeAnnees  Durée (années).
 * @returns Total des intérêts en €. Borné à 0 par sécurité.
 */
export function calculInteretsTotaux(capital: number, mensualite: number, dureeAnnees: number): number {
  return Math.max(0, calculCoutTotalCredit(mensualite, dureeAnnees) - capital);
}

/**
 * Capacité d'emprunt maximale en respectant le taux d'endettement HCSF.
 *
 * Logique : on dérive d'abord la mensualité maximale autorisée
 * (`mensualité_max = salaire × plafond − charges`), puis on inverse la formule
 * d'amortissement pour retrouver le capital correspondant :
 * `K = M × (1 − (1 + t)^(−n)) / t`.
 *
 * @param salaireMensuel    Salaire net mensuel (€).
 * @param tauxAnnuel        Taux nominal du prêt (%).
 * @param dureeAnnees       Durée envisagée (années).
 * @param tauxEndettement   Plafond HCSF (par défaut 0.35).
 * @param chargesExistantes Mensualités déjà existantes (crédits conso, pension…).
 * @returns Capital empruntable maximal (€). 0 si la marge mensuelle est nulle.
 */
export function calculCapaciteEmprunt(
  salaireMensuel: number,
  tauxAnnuel: number,
  dureeAnnees: number,
  tauxEndettement = ENDETTEMENT_MAX,
  chargesExistantes = 0
): number {
  const mensualiteMax = salaireMensuel * tauxEndettement - chargesExistantes;
  if (mensualiteMax <= 0) return 0;
  const nbMensualites = dureeAnnees * MOIS_PAR_AN;
  const tauxMensuel = tauxAnnuel / 100 / MOIS_PAR_AN;
  if (tauxMensuel === 0) return mensualiteMax * nbMensualites;
  return (mensualiteMax * (1 - Math.pow(1 + tauxMensuel, -nbMensualites))) / tauxMensuel;
}

/**
 * Mensualité d'assurance emprunteur, méthode "capital initial constant" courante en France.
 *
 * Formule : `assurance_mensuelle = capital × taux_assurance_annuel / 12`.
 *
 * @param capital               Capital emprunté (€).
 * @param tauxAssuranceAnnuel   Taux d'assurance annuel (forme décimale, 0.0025 = 0.25 %).
 * @returns Cotisation mensuelle d'assurance (€).
 */
export function calculMensualiteAssurance(capital: number, tauxAssuranceAnnuel: number): number {
  return (capital * tauxAssuranceAnnuel) / MOIS_PAR_AN;
}

/**
 * Coût total de l'assurance emprunteur sur la durée du prêt.
 *
 * Formule : `coût_assurance = mensualité_assurance × durée_années × 12`.
 *
 * @param capital              Capital emprunté (€).
 * @param tauxAssuranceAnnuel  Taux annuel décimal (0.0025 = 0.25 %).
 * @param dureeAnnees          Durée du prêt (années).
 * @returns Coût total assurance (€).
 */
export function calculCoutTotalAssurance(
  capital: number,
  tauxAssuranceAnnuel: number,
  dureeAnnees: number
): number {
  return calculMensualiteAssurance(capital, tauxAssuranceAnnuel) * dureeAnnees * MOIS_PAR_AN;
}

/**
 * Frais de notaire : 7.5 % ancien / 2.5 % neuf (calcul simplifié sur prix net).
 *
 * Formule : `frais_notaire = prix_bien × taux_notaire`.
 *
 * @param prixBien     Prix d'achat net vendeur (€).
 * @param tauxNotaire  Taux global appliqué (forme décimale, ex 0.075).
 * @returns Frais de notaire estimés (€).
 */
export function calculFraisNotaire(prixBien: number, tauxNotaire: number): number {
  return prixBien * tauxNotaire;
}

/**
 * Mensualité PTZ — calcul simplifié (mensualité linéaire après différé).
 *
 * Le PTZ est sans intérêt : on amortit le capital de manière linéaire sur la durée
 * de remboursement (= durée_totale − durée_différé).
 *
 * Formule : `M_PTZ = K_PTZ / ((durée_totale − différé) × 12)`.
 *
 * @param ptzMontant            Capital PTZ (€).
 * @param dureeTotaleAnnees     Durée totale incluant le différé (années).
 * @param dureeDiffereAnnees    Période sans paiement (années).
 * @returns Mensualité PTZ après différé (€). 0 si capital nul.
 */
export function calculMensualitePTZ(
  ptzMontant: number,
  dureeTotaleAnnees: number,
  dureeDiffereAnnees: number
): number {
  if (ptzMontant <= 0) return 0;
  const dureeRemboursement = Math.max(1, dureeTotaleAnnees - dureeDiffereAnnees);
  return ptzMontant / (dureeRemboursement * MOIS_PAR_AN);
}

/**
 * Mensualité PTZ moyenne lissée sur toute la durée (différé inclus).
 *
 * Utile pour comparer le "coût mensuel moyen" du PTZ à d'autres aides amorties
 * sans différé. Formule : `M_lissée = K_PTZ / (durée_totale × 12)`.
 *
 * @param ptzMontant         Capital PTZ (€).
 * @param dureeTotaleAnnees  Durée totale du PTZ (années).
 * @returns Mensualité moyenne lissée (€).
 */
export function calculMensualitePTZLissee(
  ptzMontant: number,
  dureeTotaleAnnees: number
): number {
  if (ptzMontant <= 0 || dureeTotaleAnnees <= 0) return 0;
  return ptzMontant / (dureeTotaleAnnees * MOIS_PAR_AN);
}

/**
 * Tableau d'amortissement complet d'un prêt amortissable classique (mois par mois).
 *
 * Pour chaque mois m :
 *  - intérêts(m) = capital_restant(m−1) × taux_mensuel
 *  - capital_remboursé(m) = mensualité − intérêts(m)
 *  - capital_restant(m) = capital_restant(m−1) − capital_remboursé(m)
 *
 * @param capital      Capital initial (€).
 * @param tauxAnnuel   Taux nominal annuel (%).
 * @param dureeAnnees  Durée (années).
 * @returns Tableau ordonné de l'amortissement, longueur = durée_années × 12.
 */
export function tableauAmortissement(
  capital: number,
  tauxAnnuel: number,
  dureeAnnees: number
): AmortissementMois[] {
  const nbMensualites = dureeAnnees * MOIS_PAR_AN;
  const tauxMensuel = tauxAnnuel / 100 / MOIS_PAR_AN;
  const mensualite = calculMensualite(capital, tauxAnnuel, dureeAnnees);
  const tableau: AmortissementMois[] = [];

  let capitalRestant = capital;
  let cumulInterets = 0;
  let cumulCapital = 0;

  for (let mois = 1; mois <= nbMensualites; mois++) {
    const interets = capitalRestant * tauxMensuel;
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
 * Reste à vivre mensuel pour un foyer.
 *
 * Formule : `reste_à_vivre = salaire − mensualité_totale − charges_fixes`.
 *
 * @param salaireMensuel    Salaire net mensuel (€).
 * @param mensualiteTotale  Mensualité totale prêts + assurance + redevances (€).
 * @param chargesFixes      Charges propriétaire occupant (TF, copro, MRH…) (€).
 * @returns Reste à vivre mensuel (€). Peut être négatif si scénario non soutenable.
 */
export function calculResteAVivre(
  salaireMensuel: number,
  mensualiteTotale: number,
  chargesFixes: number
): number {
  return salaireMensuel - mensualiteTotale - chargesFixes;
}

/**
 * Rendement locatif brut annuel.
 *
 * Formule : `rendement_brut = (loyer_mensuel × 12) / coût_acquisition_total × 100`.
 *
 * @param loyerMensuel           Loyer mensuel potentiel (€).
 * @param coutAcquisitionTotal   Prix bien + frais notaire + frais agence (€).
 * @returns Rendement brut en % (0 si coût d'acquisition nul).
 */
export function calculRendementBrut(loyerMensuel: number, coutAcquisitionTotal: number): number {
  if (coutAcquisitionTotal <= 0) return 0;
  return ((loyerMensuel * MOIS_PAR_AN) / coutAcquisitionTotal) * 100;
}

/**
 * Rendement locatif net annuel (après charges courantes et taxe foncière).
 *
 * Formule :
 * `rendement_net = (loyer × 12 − charges × 12 − taxe_foncière_annuelle) / coût_total × 100`.
 *
 * @param loyerMensuel           Loyer mensuel (€).
 * @param chargesMensuelles      Charges mensuelles (€).
 * @param taxeFonciereAnnuelle   Taxe foncière (€/an).
 * @param coutAcquisitionTotal   Coût total d'acquisition (€).
 * @returns Rendement net en % (0 si coût d'acquisition nul).
 */
export function calculRendementNet(
  loyerMensuel: number,
  chargesMensuelles: number,
  taxeFonciereAnnuelle: number,
  coutAcquisitionTotal: number
): number {
  if (coutAcquisitionTotal <= 0) return 0;
  const revenuNetAnnuel =
    loyerMensuel * MOIS_PAR_AN - chargesMensuelles * MOIS_PAR_AN - taxeFonciereAnnuelle;
  return (revenuNetAnnuel / coutAcquisitionTotal) * 100;
}

/**
 * TRI patrimonial simplifié pour un primo-accédant qui revend après N années.
 *
 * Logique :
 *  - Cash investi T0 = apport + frais d'acquisition (notaire + agence).
 *  - Valeur nette de revente Tn = prix_revente × (1 − frais_vente) − capital_restant_dû.
 *  - Formule TRI : `(valeur_nette_revente / cash_investi)^(1/n) − 1`.
 *
 * Note : on ignore les loyers économisés vs location et les charges payées
 * durant la période — c'est un TRI patrimonial, pas un cash-flow TRI.
 *
 * @param apportInitial          Apport personnel à T0 (€).
 * @param fraisAcquisition       Frais notaire + agence (€).
 * @param pretPrincipalInitial   Capital initial du prêt principal (€).
 * @param prixReventeEstime      Prix de revente estimé à Tn (€).
 * @param capitalAmortiSur5Ans   Capital amorti à Tn (€).
 * @param fraisVente             Frais de vente (forme décimale, défaut 0.07).
 * @param duree_annees           Horizon (années, défaut 5).
 * @returns TRI annualisé en % ; -100 si valeur nette ≤ 0 (perte totale).
 */
export function calculTRISimplifie(
  apportInitial: number,
  fraisAcquisition: number,
  pretPrincipalInitial: number,
  prixReventeEstime: number,
  capitalAmortiSur5Ans: number,
  fraisVente: number = FRAIS_VENTE_DEFAULT,
  duree_annees: number = ANNEES_HORIZON_REVENTE
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
 * Estimation prix de revente après N années avec un taux annuel d'évolution constant.
 *
 * Formule : `prix_revente = prix_achat × (1 + évolution_annuelle)^n`.
 *
 * @param prixAchat            Prix d'achat (€).
 * @param evolutionAnnuelle    Taux annuel décimal (0.025 = +2.5 %/an).
 * @param annees               Horizon en années.
 * @returns Prix de revente estimé (€).
 */
export function estimationRevente(prixAchat: number, evolutionAnnuelle: number, annees: number): number {
  return prixAchat * Math.pow(1 + evolutionAnnuelle, annees);
}
