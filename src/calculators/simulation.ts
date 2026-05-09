import type { Commune, ParametresBien, ParametresPret, ParametresUtilisateur, Resultats } from '@/types';
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
import { AIDES_DEFAULTS, EVOLUTION_ANNUELLE_PRIX, FRAIS_NOTAIRE } from './constants';
import { calculPaliers, indexPicPalier, type LoanSegment } from './paliers';

/**
 * Prix du bien : entrée utilisateur primaire (ce qu'il négocie / ce qu'il voit en annonce).
 * Tout le reste (prix au m², frais notaire, capacité d'emprunt...) en découle.
 */
export function calculPrixBien(bien: ParametresBien): number {
  return Math.max(0, Math.round(bien.prix_bien));
}

/**
 * Prix au m² dérivé du prix saisi et de la surface.
 */
export function calculPrixM2(bien: ParametresBien): number {
  if (bien.surface <= 0) return 0;
  return Math.round(bien.prix_bien / bien.surface);
}

/**
 * Écart en % entre le prix m² saisi et la moyenne de la commune (selon neuf/ancien).
 * Négatif = bonne affaire ; positif = au-dessus du marché.
 */
export function calculEcartPrixM2(bien: ParametresBien, commune: Commune): {
  prix_m2_calcule: number;
  prix_m2_reference: number;
  ecart_euros: number;
  ecart_pourcent: number;
} {
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
 */
export function suggererPrixBien(
  surface: number,
  type_bien: 'neuf' | 'ancien',
  commune: Commune
): number {
  const prixM2 = type_bien === 'neuf' ? commune.prix_m2_neuf : commune.prix_m2_ancien;
  return Math.round(prixM2 * surface);
}

/**
 * Moteur de simulation principal — produit l'objet Resultats complet.
 */
export function simuler(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune
): Resultats {
  // ---- Décote BRS appliquée AVANT les frais ---
  const brsDecoteMultiplier = pret.brs_actif ? 1 - pret.brs_decote_pourcent / 100 : 1;
  const prixBienBrut = calculPrixBien(bien);
  const prixBien = Math.round(prixBienBrut * brsDecoteMultiplier);
  const brsDecoteEuros = prixBienBrut - prixBien;

  const tauxNotaireBase = bien.type_bien === 'neuf' ? FRAIS_NOTAIRE.neuf : FRAIS_NOTAIRE.ancien;
  // PAS : réduction des frais d'hypothèque (~0.4 % du prix)
  const tauxNotaire = pret.pas_actif
    ? Math.max(0.005, tauxNotaireBase - AIDES_DEFAULTS.pas.reduction_frais_notaire)
    : tauxNotaireBase;
  const fraisNotaire = calculFraisNotaire(prixBien, tauxNotaire);

  // Frais d'agence : actif uniquement si toggle ON
  const fraisAgence = bien.frais_agence_actif
    ? Math.round(prixBien * (bien.frais_agence_pourcent / 100))
    : 0;

  const coutAcquisitionTotal = prixBien + fraisNotaire + fraisAgence;

  // PTZ — réservé aux primo-accédants
  const ptzMax = utilisateur.primo_accedant
    ? calculPTZMax(prixBien, commune.zone_ptz, bien.type_bien)
    : 0;
  const ptzMontant = pret.ptz_actif ? Math.min(pret.ptz_montant ?? ptzMax, ptzMax) : 0;

  // ---- Aides complémentaires : capitaux mobilisés ----
  const pelCapital = pret.pel_actif ? Math.min(pret.pel_montant, AIDES_DEFAULTS.pel.plafond) : 0;
  const celCapital = pret.cel_actif ? Math.min(pret.cel_montant, AIDES_DEFAULTS.cel.plafond) : 0;
  const actionLogementCapital = pret.action_logement_actif
    ? Math.min(pret.action_logement_montant, AIDES_DEFAULTS.action_logement.plafond)
    : 0;
  const aidesCapitalTotal = pelCapital + celCapital + actionLogementCapital;

  // Reste à financer = coût total − apport − PTZ − aides complémentaires
  const pretPrincipal = Math.max(
    0,
    coutAcquisitionTotal - utilisateur.apport - ptzMontant - aidesCapitalTotal
  );

  const mensualitePrincipale = calculMensualite(pretPrincipal, pret.taux_annuel, pret.duree_annees);
  const mensualiteAssurance = calculMensualiteAssurance(pretPrincipal, pret.taux_assurance_annuel);
  const mensualitePTZ = calculMensualitePTZ(
    ptzMontant,
    pret.ptz_duree_remboursement_annees,
    pret.ptz_duree_differe_annees
  );

  // ---- Mensualités des aides complémentaires (chacune amortie sur sa propre durée) ----
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

  const coutTotalCredit = calculCoutTotalCredit(mensualitePrincipale, pret.duree_annees);
  const interetsTotaux = calculInteretsTotaux(pretPrincipal, mensualitePrincipale, pret.duree_annees);
  const coutTotalAssurance = calculCoutTotalAssurance(
    pretPrincipal,
    pret.taux_assurance_annuel,
    pret.duree_annees
  );

  // Coûts totaux des aides
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

  // Redevance BRS sur la durée du prêt (si BRS actif)
  const coutTotalBrsRedevance = mensualiteBrsRedevance * pret.duree_annees * 12;

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

  // ---- PALIERS DE MENSUALITÉ ----
  // Construit la liste des prêts/redevances avec leur fenêtre temporelle.
  // Le PIC est le max sur la durée (ce que la banque retient pour HCSF).
  // Pas la somme brute : si PTZ et prêt banque ne se chevauchent pas, le pic est le max des deux.
  const segments: LoanSegment[] = [];
  if (mensualitePrincipale > 0) {
    segments.push({
      source: 'pret_banque',
      start_mois: 1,
      end_mois: pret.duree_annees * 12,
      mensualite: mensualitePrincipale,
    });
  }
  if (mensualiteAssurance > 0) {
    segments.push({
      source: 'assurance_emprunteur',
      start_mois: 1,
      end_mois: pret.duree_annees * 12,
      mensualite: mensualiteAssurance,
    });
  }
  if (mensualitePTZ > 0) {
    segments.push({
      source: 'ptz',
      start_mois: pret.ptz_duree_differe_annees * 12 + 1,
      end_mois: pret.ptz_duree_remboursement_annees * 12,
      mensualite: mensualitePTZ,
    });
  }
  if (mensualitePEL > 0) {
    segments.push({
      source: 'pel',
      start_mois: 1,
      end_mois: pret.pel_duree_annees * 12,
      mensualite: mensualitePEL,
    });
  }
  if (mensualiteCEL > 0) {
    segments.push({
      source: 'cel',
      start_mois: 1,
      end_mois: pret.cel_duree_annees * 12,
      mensualite: mensualiteCEL,
    });
  }
  if (mensualiteActionLogement > 0) {
    segments.push({
      source: 'action_logement',
      start_mois: 1,
      end_mois: pret.action_logement_duree_annees * 12,
      mensualite: mensualiteActionLogement,
    });
  }
  if (mensualiteBrsRedevance > 0) {
    // Redevance BRS : on l'évalue sur la durée du prêt principal pour la HCSF
    // (en réalité elle court tant que le bien reste en BRS)
    segments.push({
      source: 'redevance_brs',
      start_mois: 1,
      end_mois: pret.duree_annees * 12,
      mensualite: mensualiteBrsRedevance,
    });
  }
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

  // Détail des charges propriétaire occupant — TOUTES STOCKÉES EN €/AN, divisées par 12 pour mensuel
  const chargeTF = commune.taxe_fonciere_moyenne / 12;
  const chargeCoproAnnuelle = bien.charges_copro_perso_actif
    ? bien.charges_copro_perso_annuelles
    : commune.charges_copro_annuelles_moyennes;
  const chargeCopro = chargeCoproAnnuelle / 12;
  const chargeMRH = bien.assurance_habitation_annuelle / 12;
  const chargeFondsTravaux = bien.fonds_travaux_annuel / 12;
  const chargesMensuellesProprietaire =
    chargeTF + chargeCopro + chargeMRH + chargeFondsTravaux;

  // Reste à vivre : 2 phases si différé PTZ actif
  // Phase 1 (pendant différé) : sans mensualité PTZ
  // Phase 2 (après différé)   : avec mensualité PTZ
  const resteAVivrePendantDiffere = calculResteAVivre(
    utilisateur.salaire_net_mensuel,
    mensualiteTotale,
    chargesMensuellesProprietaire
  );
  const resteAVivreApresDiffere = calculResteAVivre(
    utilisateur.salaire_net_mensuel,
    mensualiteTotale + mensualitePTZ,
    chargesMensuellesProprietaire
  );
  // Pour la valeur principale : on prend la phase la moins favorable (post-différé)
  const resteAVivre = resteAVivreApresDiffere;

  const rendementBrut = calculRendementBrut(bien.loyer_mensuel_potentiel, coutAcquisitionTotal);
  const rendementNet = calculRendementNet(
    bien.loyer_mensuel_potentiel,
    chargeCopro,                       // €/mois
    commune.taxe_fonciere_moyenne,     // €/an
    coutAcquisitionTotal
  );

  // Estimation revente à 5 ans + TRI
  const prixReventeEstime = estimationRevente(
    prixBien,
    EVOLUTION_ANNUELLE_PRIX,
    5
  );
  const amort = tableauAmortissement(pretPrincipal, pret.taux_annuel, pret.duree_annees);
  const capitalAmorti5Ans = amort[Math.min(59, amort.length - 1)]?.cumul_capital ?? 0;
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
    charges_mensuelles_proprietaire: Math.round(chargesMensuellesProprietaire),
    charge_taxe_fonciere_mensuelle: Math.round(chargeTF),
    charge_copro_mensuelle: Math.round(chargeCopro),
    charge_assurance_habitation_mensuelle: Math.round(chargeMRH),
    charge_fonds_travaux_mensuelle: Math.round(chargeFondsTravaux),
    rendement_locatif_brut: Number(rendementBrut.toFixed(2)),
    rendement_locatif_net: Number(rendementNet.toFixed(2)),
    tri_simplifie_5_ans: Number(triSimplifie.toFixed(2)),
    prix_revente_estime_5_ans: Math.round(prixReventeEstime),
  };
}

/**
 * Comparaison neuf vs ancien sur la même commune et surface.
 */
export function comparerNeufAncien(
  utilisateur: ParametresUtilisateur,
  bien: ParametresBien,
  pret: ParametresPret,
  commune: Commune
): { neuf: Resultats; ancien: Resultats } {
  // Pour la comparaison neuf vs ancien, on prend la moyenne commune × surface.
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
