import type { Commune, ParametresBien, ParametresPret, ParametresUtilisateur, Resultats, TypeBien } from '@/types';
import {
  calculCapaciteEmprunt,
  calculCoutTotalAssurance,
  calculCoutTotalCredit,
  calculFraisNotaire,
  calculInteretsTotaux,
  calculMensualite,
  calculMensualiteAssurance,
  calculMensualitePTZ,
  calculRendementBrut,
  calculRendementNet,
  calculResteAVivre,
  calculTRISimplifie,
  estimationRevente,
  tableauAmortissement,
} from './financial';
import { calculPTZMax } from './ptz';
import {
  AIDES_DEFAULTS,
  ANNEES_HORIZON_REVENTE,
  EVOLUTION_ANNUELLE_PRIX,
  FRAIS_NOTAIRE,
  MOIS_HORIZON_REVENTE,
  MOIS_PAR_AN,
  TAUX_NOTAIRE_PLANCHER,
} from './constants';
import { calculPaliers, indexPicPalier, type LoanSegment } from './paliers';

/**
 * Prix du bien : entrée utilisateur primaire (ce qu'il négocie / ce qu'il voit en annonce).
 * Tout le reste (prix au m², frais notaire, capacité d'emprunt…) en découle.
 *
 * @param bien Paramètres bien.
 * @returns Prix du bien arrondi à l'euro, borné à 0.
 */
export function calculPrixBien(bien: ParametresBien): number {
  return Math.max(0, Math.round(bien.prix_bien));
}

/**
 * Prix au m² dérivé du prix saisi et de la surface.
 *
 * Formule : `prix_m² = prix_bien / surface`.
 *
 * @param bien Paramètres bien.
 * @returns Prix au m² arrondi (0 si surface invalide).
 */
export function calculPrixM2(bien: ParametresBien): number {
  if (bien.surface <= 0) return 0;
  return Math.round(bien.prix_bien / bien.surface);
}

/**
 * Forme retournée par `calculEcartPrixM2` : compare prix saisi vs moyenne commune.
 */
export interface EcartPrixM2 {
  prix_m2_calcule: number;
  prix_m2_reference: number;
  ecart_euros: number;
  ecart_pourcent: number;
}

/**
 * Écart entre le prix m² saisi et la moyenne de la commune (selon neuf/ancien).
 *
 * Formule : `écart_% = (prix_m²_calculé − prix_m²_référence) / prix_m²_référence × 100`.
 * Négatif = bonne affaire ; positif = au-dessus du marché.
 *
 * @param bien    Paramètres bien (utilise `surface`, `prix_bien`, `type_bien`).
 * @param commune Commune (fournit le prix m² de référence).
 * @returns Écart en € et en %, arrondi à 1 décimale pour le pourcentage.
 */
export function calculEcartPrixM2(bien: ParametresBien, commune: Commune): EcartPrixM2 {
  const prix_m2_calcule = calculPrixM2(bien);
  const prix_m2_reference =
    bien.type_bien === 'neuf' ? commune.prix_m2_neuf : commune.prix_m2_ancien;
  const ecart_euros = prix_m2_calcule - prix_m2_reference;
  const ecart_pourcent =
    prix_m2_reference > 0 ? (ecart_euros / prix_m2_reference) * 100 : 0;
  return {
    prix_m2_calcule,
    prix_m2_reference,
    ecart_euros,
    ecart_pourcent: Number(ecart_pourcent.toFixed(1)),
  };
}

/**
 * Suggère un prix de bien à partir de la moyenne commune × surface (utile pour reset).
 *
 * Formule : `prix_suggéré = prix_m²_moyen × surface`.
 *
 * @param surface   Surface en m².
 * @param type_bien Type de bien.
 * @param commune   Commune cible.
 * @returns Prix suggéré arrondi à l'euro.
 */
export function suggererPrixBien(
  surface: number,
  type_bien: TypeBien,
  commune: Commune
): number {
  const prixM2 = type_bien === 'neuf' ? commune.prix_m2_neuf : commune.prix_m2_ancien;
  return Math.round(prixM2 * surface);
}

// ---------------------------------------------------------------------------
// Helpers privés du moteur de simulation
// ---------------------------------------------------------------------------

/** Bloc "prix & frais d'acquisition" — étape 1 de la simulation. */
interface BlocAcquisition {
  prixBien: number;
  brsDecoteEuros: number;
  fraisNotaire: number;
  fraisAgence: number;
  coutAcquisitionTotal: number;
}

/**
 * Étape 1 — Calcule prix net (après décote BRS), frais de notaire (avec
 * éventuelle réduction PAS) et frais d'agence.
 */
function calculBlocAcquisition(bien: ParametresBien, pret: ParametresPret): BlocAcquisition {
  // Décote BRS appliquée AVANT les frais
  const brsDecoteMultiplier = pret.brs_actif ? 1 - pret.brs_decote_pourcent / 100 : 1;
  const prixBienBrut = calculPrixBien(bien);
  const prixBien = Math.round(prixBienBrut * brsDecoteMultiplier);
  const brsDecoteEuros = prixBienBrut - prixBien;

  const tauxNotaireBase = bien.type_bien === 'neuf' ? FRAIS_NOTAIRE.neuf : FRAIS_NOTAIRE.ancien;
  // PAS : réduction des frais d'hypothèque (~0.4 % du prix), bornée par un plancher
  const tauxNotaire = pret.pas_actif
    ? Math.max(TAUX_NOTAIRE_PLANCHER, tauxNotaireBase - AIDES_DEFAULTS.pas.reduction_frais_notaire)
    : tauxNotaireBase;
  const fraisNotaire = calculFraisNotaire(prixBien, tauxNotaire);

  const fraisAgence = bien.frais_agence_actif
    ? Math.round(prixBien * (bien.frais_agence_pourcent / 100))
    : 0;

  const coutAcquisitionTotal = prixBien + fraisNotaire + fraisAgence;

  return { prixBien, brsDecoteEuros, fraisNotaire, fraisAgence, coutAcquisitionTotal };
}

/** Capitaux mobilisés par chaque aide (PEL, CEL, Action Logement, PTZ). */
interface CapitauxAides {
  ptzMontant: number;
  pelCapital: number;
  celCapital: number;
  actionLogementCapital: number;
  aidesCapitalTotal: number;
}

/**
 * Étape 2 — Détermine les capitaux mobilisés par chaque aide, en respectant
 * leurs plafonds respectifs et les conditions d'éligibilité (primo-accédant, toggles).
 */
function calculCapitauxAides(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune,
  prixBien: number
): CapitauxAides {
  const ptzMax = utilisateur.primo_accedant
    ? calculPTZMax(prixBien, commune.zone_ptz, bien.type_bien)
    : 0;
  const ptzMontant = pret.ptz_actif ? Math.min(pret.ptz_montant ?? ptzMax, ptzMax) : 0;

  const pelCapital = pret.pel_actif ? Math.min(pret.pel_montant, AIDES_DEFAULTS.pel.plafond) : 0;
  const celCapital = pret.cel_actif ? Math.min(pret.cel_montant, AIDES_DEFAULTS.cel.plafond) : 0;
  const actionLogementCapital = pret.action_logement_actif
    ? Math.min(pret.action_logement_montant, AIDES_DEFAULTS.action_logement.plafond)
    : 0;
  const aidesCapitalTotal = pelCapital + celCapital + actionLogementCapital;

  return { ptzMontant, pelCapital, celCapital, actionLogementCapital, aidesCapitalTotal };
}

/**
 * Étape 3 — Construit la liste des segments temporels pour le calcul des paliers HCSF.
 * Chaque prêt et l'assurance sont des segments avec une fenêtre [start_mois, end_mois].
 * Le PIC (max sur tous les paliers) sera ce que la banque retient pour le HCSF.
 */
function construireSegmentsPaliers(
  pret: ParametresPret,
  mensualitePrincipale: number,
  mensualiteAssurance: number,
  mensualitePTZ: number,
  mensualitePEL: number,
  mensualiteCEL: number,
  mensualiteActionLogement: number,
  mensualiteBrsRedevance: number
): LoanSegment[] {
  const segments: LoanSegment[] = [];
  const finPretPrincipal = pret.duree_annees * MOIS_PAR_AN;

  if (mensualitePrincipale > 0) {
    segments.push({
      source: 'pret_banque',
      start_mois: 1,
      end_mois: finPretPrincipal,
      mensualite: mensualitePrincipale,
    });
  }
  if (mensualiteAssurance > 0) {
    segments.push({
      source: 'assurance_emprunteur',
      start_mois: 1,
      end_mois: finPretPrincipal,
      mensualite: mensualiteAssurance,
    });
  }
  if (mensualitePTZ > 0) {
    segments.push({
      source: 'ptz',
      start_mois: pret.ptz_duree_differe_annees * MOIS_PAR_AN + 1,
      end_mois: pret.ptz_duree_remboursement_annees * MOIS_PAR_AN,
      mensualite: mensualitePTZ,
    });
  }
  if (mensualitePEL > 0) {
    segments.push({
      source: 'pel',
      start_mois: 1,
      end_mois: pret.pel_duree_annees * MOIS_PAR_AN,
      mensualite: mensualitePEL,
    });
  }
  if (mensualiteCEL > 0) {
    segments.push({
      source: 'cel',
      start_mois: 1,
      end_mois: pret.cel_duree_annees * MOIS_PAR_AN,
      mensualite: mensualiteCEL,
    });
  }
  if (mensualiteActionLogement > 0) {
    segments.push({
      source: 'action_logement',
      start_mois: 1,
      end_mois: pret.action_logement_duree_annees * MOIS_PAR_AN,
      mensualite: mensualiteActionLogement,
    });
  }
  if (mensualiteBrsRedevance > 0) {
    // Redevance BRS : on l'évalue sur la durée du prêt principal pour la HCSF
    // (en réalité elle court tant que le bien reste en BRS).
    segments.push({
      source: 'redevance_brs',
      start_mois: 1,
      end_mois: finPretPrincipal,
      mensualite: mensualiteBrsRedevance,
    });
  }
  return segments;
}

/**
 * Charges propriétaire occupant détaillées en €/mois et leur somme.
 * Toutes les sources sont stockées en €/an dans le store, divisées par 12 ici.
 */
interface ChargesProprietaire {
  taxeFonciereMensuelle: number;
  coproMensuelle: number;
  coproAnnuelle: number;
  mrhMensuelle: number;
  fondsTravauxMensuelle: number;
  totalMensuel: number;
}

/** Étape — Calcule les charges propriétaire occupant à partir du bien et de la commune. */
function calculChargesProprietaire(bien: ParametresBien, commune: Commune): ChargesProprietaire {
  const taxeFonciereMensuelle = commune.taxe_fonciere_moyenne / MOIS_PAR_AN;
  const coproAnnuelle = bien.charges_copro_perso_actif
    ? bien.charges_copro_perso_annuelles
    : commune.charges_copro_annuelles_moyennes;
  const coproMensuelle = coproAnnuelle / MOIS_PAR_AN;
  const mrhMensuelle = bien.assurance_habitation_annuelle / MOIS_PAR_AN;
  const fondsTravauxMensuelle = bien.fonds_travaux_annuel / MOIS_PAR_AN;
  const totalMensuel =
    taxeFonciereMensuelle + coproMensuelle + mrhMensuelle + fondsTravauxMensuelle;
  return {
    taxeFonciereMensuelle,
    coproMensuelle,
    coproAnnuelle,
    mrhMensuelle,
    fondsTravauxMensuelle,
    totalMensuel,
  };
}

/**
 * Moteur de simulation principal — produit l'objet `Resultats` complet.
 *
 * Pipeline en étapes :
 *  1. Acquisition (prix net, frais notaire/agence, décote BRS, réduction PAS).
 *  2. Capitaux des aides (PTZ, PEL, CEL, Action Logement) selon plafonds & toggles.
 *  3. Mensualités de chaque prêt (principal, assurance, PTZ, aides, redevance BRS).
 *  4. Paliers HCSF : segments temporels → paliers → pic mensuel retenu.
 *  5. Charges propriétaire (TF, copro, MRH, fonds travaux).
 *  6. Reste à vivre (phase pré et post-différé PTZ).
 *  7. Indicateurs locatifs (rendement brut/net) + projection revente 5 ans (TRI).
 *
 * @param utilisateur  Paramètres foyer.
 * @param bien         Paramètres bien.
 * @param pret         Paramètres prêt.
 * @param commune      Commune cible.
 * @returns L'objet `Resultats` agrégé pour l'UI.
 */
export function simuler(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune
): Resultats {
  // ---- 1. Acquisition ----
  const { prixBien, brsDecoteEuros, fraisNotaire, fraisAgence, coutAcquisitionTotal } =
    calculBlocAcquisition(bien, pret);

  // ---- 2. Capitaux des aides + reste à financer ----
  const { ptzMontant, pelCapital, celCapital, actionLogementCapital, aidesCapitalTotal } =
    calculCapitauxAides(utilisateur, bien, pret, commune, prixBien);

  const pretPrincipal = Math.max(
    0,
    coutAcquisitionTotal - utilisateur.apport - ptzMontant - aidesCapitalTotal
  );

  // ---- 3. Mensualités ----
  const mensualitePrincipale = calculMensualite(pretPrincipal, pret.taux_annuel, pret.duree_annees);
  const mensualiteAssurance = calculMensualiteAssurance(pretPrincipal, pret.taux_assurance_annuel);
  const mensualitePTZ = calculMensualitePTZ(
    ptzMontant,
    pret.ptz_duree_remboursement_annees,
    pret.ptz_duree_differe_annees
  );
  const mensualitePEL = calculMensualite(pelCapital, pret.pel_taux, pret.pel_duree_annees);
  const mensualiteCEL = calculMensualite(celCapital, pret.cel_taux, pret.cel_duree_annees);
  const mensualiteActionLogement = calculMensualite(
    actionLogementCapital,
    pret.action_logement_taux,
    pret.action_logement_duree_annees
  );
  // BRS : redevance foncière mensuelle (~3,5 €/m²/mois, indépendante du prêt)
  const mensualiteBrsRedevance = pret.brs_actif
    ? Math.round(bien.surface * AIDES_DEFAULTS.brs.redevance_eur_par_m2_par_mois)
    : 0;

  const mensualiteAidesTotale =
    mensualitePEL + mensualiteCEL + mensualiteActionLogement + mensualiteBrsRedevance;
  const mensualiteTotale =
    mensualitePrincipale + mensualiteAssurance + mensualiteAidesTotale; // hors PTZ pendant différé

  // ---- Coûts cumulés du crédit ----
  const coutTotalCredit = calculCoutTotalCredit(mensualitePrincipale, pret.duree_annees);
  const interetsTotaux = calculInteretsTotaux(pretPrincipal, mensualitePrincipale, pret.duree_annees);
  const coutTotalAssurance = calculCoutTotalAssurance(
    pretPrincipal,
    pret.taux_assurance_annuel,
    pret.duree_annees
  );
  const coutTotalPEL = calculCoutTotalCredit(mensualitePEL, pret.pel_duree_annees);
  const coutTotalCEL = calculCoutTotalCredit(mensualiteCEL, pret.cel_duree_annees);
  const coutTotalActionLogement = calculCoutTotalCredit(
    mensualiteActionLogement,
    pret.action_logement_duree_annees
  );
  const interetsAidesTotal =
    Math.max(0, coutTotalPEL - pelCapital) +
    Math.max(0, coutTotalCEL - celCapital) +
    Math.max(0, coutTotalActionLogement - actionLogementCapital);
  const coutTotalBrsRedevance = mensualiteBrsRedevance * pret.duree_annees * MOIS_PAR_AN;

  // Coût total réel = ce qui sort de votre poche sur la durée totale
  // = prix vendeur + tous les frais d'acquisition + tous les surcoûts (intérêts/assurance/redevance)
  // Les capitaux remboursés (PTZ, PEL, CEL, AL) ne sont pas un coût net (vous les recevez puis les rendez)
  const coutTotalReel =
    prixBien +
    fraisNotaire +
    fraisAgence +
    interetsTotaux +
    coutTotalAssurance +
    interetsAidesTotal +
    coutTotalBrsRedevance;

  // ---- 4. Paliers HCSF ----
  // Le PIC est le max sur la durée (ce que la banque retient pour HCSF) — pas la
  // somme brute : si PTZ et prêt banque ne se chevauchent pas, le pic = max des deux.
  const segments = construireSegmentsPaliers(
    pret,
    mensualitePrincipale,
    mensualiteAssurance,
    mensualitePTZ,
    mensualitePEL,
    mensualiteCEL,
    mensualiteActionLogement,
    mensualiteBrsRedevance
  );
  const paliers = calculPaliers(segments);
  const picIdx = indexPicPalier(paliers);
  const picMensualitePalier = picIdx >= 0 ? paliers[picIdx].total : 0;

  const tauxEndettement =
    utilisateur.salaire_net_mensuel > 0
      ? (picMensualitePalier / utilisateur.salaire_net_mensuel) * 100
      : 0;

  const capaciteEmpruntMax = calculCapaciteEmprunt(
    utilisateur.salaire_net_mensuel,
    pret.taux_annuel,
    pret.duree_annees
  );

  const cashRestantApresAchat = utilisateur.apport - (coutAcquisitionTotal - pretPrincipal - ptzMontant);

  // ---- 5. Charges propriétaire ----
  const charges = calculChargesProprietaire(bien, commune);

  // ---- 6. Reste à vivre (deux phases si différé PTZ actif) ----
  // Phase 1 (pendant différé) : sans mensualité PTZ
  // Phase 2 (après différé)   : avec mensualité PTZ — c'est le worst case
  const resteAVivrePendantDiffere = calculResteAVivre(
    utilisateur.salaire_net_mensuel,
    mensualiteTotale,
    charges.totalMensuel
  );
  const resteAVivreApresDiffere = calculResteAVivre(
    utilisateur.salaire_net_mensuel,
    mensualiteTotale + mensualitePTZ,
    charges.totalMensuel
  );
  const resteAVivre = resteAVivreApresDiffere;

  // ---- 7. Indicateurs locatifs + projection revente ----
  const rendementBrut = calculRendementBrut(bien.loyer_mensuel_potentiel, coutAcquisitionTotal);
  const rendementNet = calculRendementNet(
    bien.loyer_mensuel_potentiel,
    charges.coproMensuelle,            // €/mois
    commune.taxe_fonciere_moyenne,     // €/an
    coutAcquisitionTotal
  );

  const prixReventeEstime = estimationRevente(
    prixBien,
    EVOLUTION_ANNUELLE_PRIX,
    ANNEES_HORIZON_REVENTE
  );
  const amort = tableauAmortissement(pretPrincipal, pret.taux_annuel, pret.duree_annees);
  // À l'index 59 (5 ans × 12 − 1) on lit le cumul amorti à la fin du 60ᵉ mois
  const indexFinHorizon = Math.min(MOIS_HORIZON_REVENTE - 1, amort.length - 1);
  const capitalAmorti5Ans = amort[indexFinHorizon]?.cumul_capital ?? 0;
  const triSimplifie = calculTRISimplifie(
    utilisateur.apport,
    fraisNotaire + fraisAgence,
    pretPrincipal,
    prixReventeEstime,
    capitalAmorti5Ans
  );

  return {
    prix_bien: prixBien,
    frais_notaire: Math.round(fraisNotaire),
    frais_agence: fraisAgence,
    cout_acquisition_total: Math.round(coutAcquisitionTotal),
    ptz_montant: ptzMontant,
    pret_principal_montant: Math.round(pretPrincipal),
    mensualite_principale: Math.round(mensualitePrincipale),
    mensualite_assurance: Math.round(mensualiteAssurance),
    mensualite_ptz: Math.round(mensualitePTZ),
    mensualite_totale: Math.round(mensualiteTotale),
    mensualite_pas: 0,
    mensualite_pel: Math.round(mensualitePEL),
    mensualite_cel: Math.round(mensualiteCEL),
    mensualite_action_logement: Math.round(mensualiteActionLogement),
    mensualite_brs_redevance: mensualiteBrsRedevance,
    pel_capital: Math.round(pelCapital),
    cel_capital: Math.round(celCapital),
    action_logement_capital: Math.round(actionLogementCapital),
    brs_decote_euros: brsDecoteEuros,
    cout_total_pel: Math.round(coutTotalPEL),
    cout_total_cel: Math.round(coutTotalCEL),
    cout_total_action_logement: Math.round(coutTotalActionLogement),
    cout_total_brs_redevance: Math.round(coutTotalBrsRedevance),
    interets_aides_total: Math.round(interetsAidesTotal),
    cout_total_reel: Math.round(coutTotalReel),
    cout_total_credit: Math.round(coutTotalCredit),
    interets_totaux: Math.round(interetsTotaux),
    cout_total_assurance: Math.round(coutTotalAssurance),
    taux_endettement: Number(tauxEndettement.toFixed(2)),
    paliers,
    pic_mensualite_palier: Math.round(picMensualitePalier),
    pic_palier_numero: picIdx + 1,
    capacite_emprunt_max: Math.round(capaciteEmpruntMax),
    cash_restant_apres_achat: Math.round(cashRestantApresAchat),
    reste_a_vivre: Math.round(resteAVivre),
    reste_a_vivre_pendant_differe_ptz: Math.round(resteAVivrePendantDiffere),
    reste_a_vivre_apres_differe_ptz: Math.round(resteAVivreApresDiffere),
    charges_mensuelles_proprietaire: Math.round(charges.totalMensuel),
    charge_taxe_fonciere_mensuelle: Math.round(charges.taxeFonciereMensuelle),
    charge_copro_mensuelle: Math.round(charges.coproMensuelle),
    charge_assurance_habitation_mensuelle: Math.round(charges.mrhMensuelle),
    charge_fonds_travaux_mensuelle: Math.round(charges.fondsTravauxMensuelle),
    rendement_locatif_brut: Number(rendementBrut.toFixed(2)),
    rendement_locatif_net: Number(rendementNet.toFixed(2)),
    tri_simplifie_5_ans: Number(triSimplifie.toFixed(2)),
    prix_revente_estime_5_ans: Math.round(prixReventeEstime),
  };
}

/**
 * Comparaison neuf vs ancien sur la même commune et surface.
 *
 * Pour chaque variante on suggère un prix = `prix_m²_moyen × surface`, puis
 * on simule indépendamment.
 *
 * @param utilisateur  Paramètres foyer.
 * @param bien         Bien de référence (sa surface est conservée).
 * @param pret         Paramètres prêt.
 * @param commune      Commune cible.
 * @returns Les deux objets `Resultats` (neuf + ancien).
 */
export function comparerNeufAncien(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune
): { neuf: Resultats; ancien: Resultats } {
  const bienNeuf: ParametresBien = {
    ...bien,
    type_bien: 'neuf',
    prix_bien: suggererPrixBien(bien.surface, 'neuf', commune),
  };
  const bienAncien: ParametresBien = {
    ...bien,
    type_bien: 'ancien',
    prix_bien: suggererPrixBien(bien.surface, 'ancien', commune),
  };
  return {
    neuf: simuler(utilisateur, bienNeuf, pret, commune),
    ancien: simuler(utilisateur, bienAncien, pret, commune),
  };
}
