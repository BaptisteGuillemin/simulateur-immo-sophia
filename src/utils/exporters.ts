import type { Commune, ParametresBien, ParametresPret, ParametresUtilisateur, Resultats } from '@/types';
import { formatEuro, formatPercent } from './format';

interface ExportData {
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
  commune: Commune;
  resultats: Resultats;
}

export function exportJSON(data: ExportData) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `simulation-${data.bien.commune.toLowerCase()}-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPDF(data: ExportData) {
  const { default: jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const { utilisateur, bien, pret, commune, resultats } = data;

  // Header
  doc.setFillColor(91, 141, 239);
  doc.rect(0, 0, 210, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('Simulation Immobilière', 15, 15);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`Sophia Antipolis · ${commune.commune} · ${new Date().toLocaleDateString('fr-FR')}`, 15, 23);

  doc.setTextColor(20, 20, 20);
  let y = 42;

  const section = (title: string) => {
    doc.setFillColor(245, 247, 250);
    doc.rect(15, y - 5, 180, 7, 'F');
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(91, 141, 239);
    doc.text(title, 17, y);
    y += 7;
    doc.setTextColor(20, 20, 20);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
  };

  const row = (label: string, value: string) => {
    doc.text(label, 17, y);
    doc.setFont('helvetica', 'bold');
    doc.text(value, 195, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    y += 5.5;
  };

  section('Profil financier');
  row('Salaire net mensuel', formatEuro(utilisateur.salaire_net_mensuel));
  row('Apport personnel', formatEuro(utilisateur.apport));
  y += 3;

  section('Le bien');
  row('Commune', `${commune.commune} (zone ${commune.zone_ptz})`);
  row('Type', bien.type_bien === 'neuf' ? 'Neuf' : 'Ancien');
  row('Surface', `${bien.surface} m²`);
  row('Prix du bien', formatEuro(resultats.prix_bien));
  row('Frais notaire', formatEuro(resultats.frais_notaire));
  row('Frais agence', formatEuro(resultats.frais_agence));
  row('Coût acquisition total', formatEuro(resultats.cout_acquisition_total));
  y += 3;

  section('Financement');
  row('PTZ', resultats.ptz_montant > 0 ? formatEuro(resultats.ptz_montant) : 'Non');
  row('Prêt principal', formatEuro(resultats.pret_principal_montant));
  row('Durée', `${pret.duree_annees} ans`);
  row('Taux nominal', formatPercent(pret.taux_annuel, 2));
  row('Taux assurance', formatPercent(pret.taux_assurance_annuel * 100, 2));
  y += 3;

  section('Mensualités');
  row('Mensualité prêt principal', formatEuro(resultats.mensualite_principale));
  row('Mensualité assurance', formatEuro(resultats.mensualite_assurance));
  if (resultats.mensualite_ptz > 0) row('Mensualité PTZ (post-différé)', formatEuro(resultats.mensualite_ptz));
  row('Mensualité totale', formatEuro(resultats.mensualite_totale));
  row('Taux endettement', formatPercent(resultats.taux_endettement));
  y += 3;

  section('Coût total');
  row('Coût total du crédit', formatEuro(resultats.cout_total_credit));
  row('Intérêts totaux', formatEuro(resultats.interets_totaux));
  row('Coût total assurance', formatEuro(resultats.cout_total_assurance));
  y += 3;

  section('Indicateurs');
  row('Cash restant après achat', formatEuro(resultats.cash_restant_apres_achat));
  row('Reste à vivre', formatEuro(resultats.reste_a_vivre));
  row('Rendement locatif brut', formatPercent(resultats.rendement_locatif_brut));
  row('TRI 5 ans estimé', formatPercent(resultats.tri_simplifie_5_ans));
  row('Prix revente estimé 5 ans', formatEuro(resultats.prix_revente_estime_5_ans));

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(140, 140, 140);
  doc.text(
    'Simulation indicative — non contractuelle. Vérifier auprès d\'un courtier ou d\'une banque.',
    15,
    285
  );

  doc.save(`simulation-${bien.commune.toLowerCase()}-${Date.now()}.pdf`);
}
