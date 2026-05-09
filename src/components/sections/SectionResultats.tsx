import { memo } from 'react';
import { TrendingUp, AlertTriangle, CheckCircle2, Wallet } from 'lucide-react';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Stat } from '@/components/ui/Stat';
import { Tooltip } from '@/components/ui/Tooltip';
import { FormulaTip } from '@/components/ui/FormulaTip';
import { formatEuro, formatPercent } from '@/utils/format';
import type { Resultats } from '@/types';

export function SectionResultats() {
  const { resultats } = useSimulationResults();
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const pret = useSimulationStore((s) => s.pret);

  const endettementVariant =
    resultats.taux_endettement > 35
      ? 'danger'
      : resultats.taux_endettement > 30
      ? 'warning'
      : 'success';

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <TrendingUp className="w-4 h-4 text-accent" />
        Résultats financiers
      </h3>

      {/* En-tête : alerte de viabilité */}
      <div className="mb-4">
        {resultats.taux_endettement > 35 ? (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-danger/10 border border-danger/20 text-sm text-danger">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            Taux d'endettement &gt; 35% — refus probable des banques (règle HCSF).
          </div>
        ) : (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-sm text-success">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
            Dossier dans les clous HCSF · taux d'endettement {formatPercent(resultats.taux_endettement)}.
          </div>
        )}
      </div>

      {/* COÛT TOTAL RÉEL — encart pédagogique très visible */}
      <CoutTotalReel resultats={resultats} />


      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Mensualité totale"
          value={formatEuro(resultats.mensualite_totale)}
          hint={`dont ${formatEuro(resultats.mensualite_assurance)} assurance${
            resultats.mensualite_ptz > 0
              ? ` · +${formatEuro(resultats.mensualite_ptz)} PTZ post-différé`
              : ''
          }`}
          variant="accent"
          large
          tooltipWide
          tooltip={
            <FormulaTip
              description="Mensualité prêt principal + assurance + aides (hors PTZ pendant son différé)."
              formula="M = K × t / (1 − (1+t)^(−n)) ;  t = taux/12, n = mois"
              values={[
                { label: 'Capital prêt principal (K)', value: formatEuro(resultats.pret_principal_montant) },
                { label: 'Taux annuel', value: `${pret.taux_annuel.toFixed(2)} %` },
                { label: 'Durée (n)', value: `${pret.duree_annees * 12} mois` },
                { label: '→ Mensualité principale', value: formatEuro(resultats.mensualite_principale) },
                { label: '+ Assurance', value: formatEuro(resultats.mensualite_assurance) },
                ...(resultats.mensualite_pel > 0
                  ? [{ label: '+ PEL', value: formatEuro(resultats.mensualite_pel) }]
                  : []),
                ...(resultats.mensualite_cel > 0
                  ? [{ label: '+ CEL', value: formatEuro(resultats.mensualite_cel) }]
                  : []),
                ...(resultats.mensualite_action_logement > 0
                  ? [{ label: '+ Action Logement', value: formatEuro(resultats.mensualite_action_logement) }]
                  : []),
                ...(resultats.mensualite_brs_redevance > 0
                  ? [{ label: '+ Redevance BRS', value: formatEuro(resultats.mensualite_brs_redevance) }]
                  : []),
              ]}
              result={{ label: 'Mensualité totale (hors PTZ)', value: formatEuro(resultats.mensualite_totale) }}
              footnote={
                resultats.mensualite_ptz > 0
                  ? `+ ${formatEuro(resultats.mensualite_ptz)}/mois PTZ après ${pret.ptz_duree_differe_annees} ans de différé`
                  : null
              }
            />
          }
        />
        <Stat
          label="Coût total du crédit"
          value={formatEuro(resultats.cout_total_credit)}
          hint={`dont ${formatEuro(resultats.interets_totaux)} d'intérêts`}
          tooltipWide
          tooltip={
            <FormulaTip
              description="Somme des mensualités du prêt principal sur toute la durée."
              formula="Coût = Mensualité × n ;  Intérêts = Coût − K"
              values={[
                { label: 'Mensualité × n mois', value: `${formatEuro(resultats.mensualite_principale)} × ${pret.duree_annees * 12}` },
                { label: 'Capital initial', value: formatEuro(resultats.pret_principal_montant) },
              ]}
              result={{ label: 'Intérêts totaux', value: formatEuro(resultats.interets_totaux) }}
            />
          }
        />
        <Stat
          label="Prêt principal"
          value={formatEuro(resultats.pret_principal_montant)}
          hint={resultats.ptz_montant > 0 ? `+ PTZ ${formatEuro(resultats.ptz_montant)}` : undefined}
          tooltipWide
          tooltip={
            <FormulaTip
              description="Ce qu'il reste à emprunter à la banque après apport, PTZ et aides complémentaires."
              formula="Prêt = Coût acquisition − Apport − PTZ − Aides"
              values={[
                { label: 'Coût acquisition total', value: formatEuro(resultats.cout_acquisition_total) },
                { label: '− Apport', value: formatEuro(utilisateur.apport) },
                ...(resultats.ptz_montant > 0
                  ? [{ label: '− PTZ', value: formatEuro(resultats.ptz_montant) }]
                  : []),
                ...(resultats.pel_capital > 0
                  ? [{ label: '− PEL', value: formatEuro(resultats.pel_capital) }]
                  : []),
                ...(resultats.cel_capital > 0
                  ? [{ label: '− CEL', value: formatEuro(resultats.cel_capital) }]
                  : []),
                ...(resultats.action_logement_capital > 0
                  ? [{ label: '− Action Logement', value: formatEuro(resultats.action_logement_capital) }]
                  : []),
              ]}
              result={{ label: '= Prêt principal', value: formatEuro(resultats.pret_principal_montant) }}
            />
          }
        />
        <Stat
          label="Endettement"
          value={formatPercent(resultats.taux_endettement)}
          hint={`Plafond HCSF : 35 % · pic post-différé PTZ`}
          variant={endettementVariant}
          tooltipWide
          tooltip={
            <FormulaTip
              description="Pic d'endettement = post-différé PTZ. C'est ce que la banque retient pour le HCSF."
              formula="Endettement = (Mensualité totale + PTZ) / Salaire net"
              values={[
                { label: 'Mensualité (hors PTZ)', value: formatEuro(resultats.mensualite_totale) },
                { label: '+ PTZ post-différé', value: formatEuro(resultats.mensualite_ptz) },
                { label: '÷ Salaire net mensuel', value: formatEuro(utilisateur.salaire_net_mensuel) },
              ]}
              result={{ label: '= Taux endettement', value: formatPercent(resultats.taux_endettement) }}
              footnote="Plafond HCSF : 35 % (sauf dérogation 20 % des dossiers)"
            />
          }
        />
        <Stat
          label="Reste à vivre (post-différé)"
          value={formatEuro(resultats.reste_a_vivre)}
          hint={`pendant différé : ${formatEuro(resultats.reste_a_vivre_pendant_differe_ptz)}`}
          tooltipWide
          tooltip={
            <FormulaTip
              description="Ce qui reste APRÈS le crédit et les charges du logement. À comparer à votre coût de vie hors logement (alimentation, transport, loisirs)."
              formula="Reste = Salaire − (Mensualités + PTZ) − Charges proprio"
              values={[
                { label: 'Salaire net mensuel', value: formatEuro(utilisateur.salaire_net_mensuel) },
                { label: '− Mensualité totale', value: formatEuro(resultats.mensualite_totale) },
                ...(resultats.mensualite_ptz > 0
                  ? [{ label: '− Mensualité PTZ', value: `${formatEuro(resultats.mensualite_ptz)} (post-différé)` }]
                  : []),
                { label: '− Charges propriétaire', value: formatEuro(resultats.charges_mensuelles_proprietaire) },
              ]}
              result={{ label: 'Reste à vivre', value: formatEuro(resultats.reste_a_vivre) }}
              footnote={
                resultats.mensualite_ptz > 0
                  ? `Pendant les ${pret.ptz_duree_differe_annees} ans de différé PTZ : ${formatEuro(resultats.reste_a_vivre_pendant_differe_ptz)}/mois`
                  : null
              }
            />
          }
        />
        <Stat
          label="Capacité max d'emprunt"
          value={formatEuro(resultats.capacite_emprunt_max)}
          hint="à 35 % d'endettement"
          tooltipWide
          tooltip={
            <FormulaTip
              description="Capital max qu'une banque vous prêterait à votre salaire actuel (35 % d'endettement)."
              formula="C = M × (1 − (1+t)^(−n)) / t ;  M = Salaire × 35 %"
              values={[
                { label: 'Mensualité max', value: `${formatEuro(utilisateur.salaire_net_mensuel * 0.35)} (35 % × salaire)` },
                { label: 'Taux', value: `${pret.taux_annuel.toFixed(2)} %` },
                { label: 'Durée', value: `${pret.duree_annees} ans` },
              ]}
              result={{ label: 'Capacité max', value: formatEuro(resultats.capacite_emprunt_max) }}
            />
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-border-subtle">
        <Stat
          label="Rendement brut"
          value={formatPercent(resultats.rendement_locatif_brut)}
          hint="si mis en location"
          tooltipWide
          tooltip={
            <FormulaTip
              description="Rendement locatif brut annuel sur le coût d'acquisition total."
              formula="R = (Loyer × 12) / Coût acquisition"
              values={[
                { label: 'Loyer mensuel', value: formatEuro(resultats.rendement_locatif_brut > 0 ? Math.round((resultats.rendement_locatif_brut / 100) * resultats.cout_acquisition_total / 12) : 0) },
                { label: '× 12', value: '/ an' },
                { label: '÷ Coût acquisition', value: formatEuro(resultats.cout_acquisition_total) },
              ]}
              result={{ label: 'Rendement brut', value: formatPercent(resultats.rendement_locatif_brut) }}
            />
          }
        />
        <Stat
          label="Rendement net"
          value={formatPercent(resultats.rendement_locatif_net)}
          hint="charges & TF déduites"
          tooltipWide
          tooltip={
            <FormulaTip
              description="Rendement après charges copro et taxe foncière (hors fiscalité revenus fonciers)."
              formula="R = (Loyer × 12 − Charges − TF) / Coût acquisition"
              values={[
                { label: 'Charges copro / mois', value: formatEuro(resultats.charge_copro_mensuelle) },
                { label: 'Taxe foncière / an', value: formatEuro(resultats.charge_taxe_fonciere_mensuelle * 12) },
              ]}
              result={{ label: 'Rendement net', value: formatPercent(resultats.rendement_locatif_net) }}
            />
          }
        />
        <Stat
          label="TRI 5 ans"
          value={formatPercent(resultats.tri_simplifie_5_ans)}
          hint={`Revente estimée : ${formatEuro(resultats.prix_revente_estime_5_ans)}`}
          tooltipWide
          tooltip={
            <FormulaTip
              description="Taux de retour annualisé sur l'apport + frais d'acquisition, en cas de revente à 5 ans (appréciation du marché + remboursement du capital)."
              formula="TRI = (Valeur nette revente / Cash investi)^(1/5) − 1"
              values={[
                { label: 'Cash investi', value: `${formatEuro(utilisateur.apport)} + frais` },
                { label: 'Prix revente 5 ans', value: formatEuro(resultats.prix_revente_estime_5_ans) },
                { label: '− Frais vente (~7 %)', value: formatEuro(Math.round(resultats.prix_revente_estime_5_ans * 0.07)) },
                { label: '− Capital restant dû', value: 'à 5 ans' },
              ]}
              result={{ label: 'TRI annualisé', value: formatPercent(resultats.tri_simplifie_5_ans) }}
              footnote="Hypothèse : prix immobilier +2,5 %/an. Hors loyers économisés vs location."
            />
          }
        />
      </div>
    </div>
  );
}

const CoutTotalReel = memo(function CoutTotalReel({ resultats }: { resultats: Resultats }) {
  // Source de vérité unique — partagée avec le camembert
  const coutTotalReel = resultats.cout_total_reel;

  const surcout = coutTotalReel - resultats.prix_bien;
  const surcoutPourcent =
    resultats.prix_bien > 0 ? (surcout / resultats.prix_bien) * 100 : 0;

  const lignes = [
    { label: 'Prix du bien (FAI)', value: resultats.prix_bien, color: 'text-text', bold: true },
    ...(resultats.brs_decote_euros > 0
      ? [
          {
            label: '− Décote BRS',
            value: -resultats.brs_decote_euros,
            color: 'text-success',
            hint: 'foncier en bail',
          },
        ]
      : []),
    { label: '+ Frais de notaire', value: resultats.frais_notaire, color: 'text-text-muted' },
    ...(resultats.frais_agence > 0
      ? [{ label: "+ Frais d'agence", value: resultats.frais_agence, color: 'text-text-muted' }]
      : []),
    {
      label: '+ Intérêts du crédit',
      value: resultats.interets_totaux,
      color: 'text-warning',
      hint: 'sur toute la durée',
    },
    {
      label: '+ Assurance emprunteur',
      value: resultats.cout_total_assurance,
      color: 'text-warning',
      hint: 'sur toute la durée',
    },
    ...(resultats.interets_aides_total > 0
      ? [
          {
            label: '+ Intérêts aides (PEL/CEL/AL)',
            value: resultats.interets_aides_total,
            color: 'text-warning',
            hint: 'taux préférentiels',
          },
        ]
      : []),
    ...(resultats.cout_total_brs_redevance > 0
      ? [
          {
            label: '+ Redevance BRS',
            value: resultats.cout_total_brs_redevance,
            color: 'text-warning',
            hint: 'sur durée du prêt',
          },
        ]
      : []),
  ];

  return (
    <div className="mb-4 p-4 rounded-xl border-2 border-accent/30 bg-gradient-to-br from-accent/5 to-bg-surface">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-accent" />
        <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
          Coût total réel — ce que vous paierez vraiment
        </div>
        <Tooltip content="Somme de tout ce que vous décaissez : prix d'achat + tous les frais d'acquisition + intérêts + assurance, sur la durée totale du crédit." />
      </div>

      <div className="space-y-1 mb-3">
        {lignes.map((l) => (
          <div key={l.label} className="flex items-center justify-between text-sm">
            <div className={`${l.bold ? 'font-medium text-text' : l.color}`}>
              {l.label}
              {l.hint && <span className="text-text-subtle text-xs ml-1.5">· {l.hint}</span>}
            </div>
            <div className={`font-mono tabular-nums ${l.bold ? 'text-text font-semibold' : l.color}`}>
              {formatEuro(l.value)}
            </div>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t-2 border-accent/20 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-text-subtle uppercase tracking-wider">Total à débourser</div>
          <div className="text-3xl font-mono font-bold text-accent tabular-nums">
            {formatEuro(coutTotalReel)}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-subtle uppercase tracking-wider">Surcoût vs prix bien</div>
          <div className="text-base font-mono font-semibold text-warning tabular-nums">
            +{formatEuro(surcout)}
          </div>
          <div className="text-xs font-medium text-warning">
            +{surcoutPourcent.toFixed(1)} %
          </div>
        </div>
      </div>
    </div>
  );
});
