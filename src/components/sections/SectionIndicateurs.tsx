import { Activity } from 'lucide-react';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { useSimulationStore } from '@/store/useSimulationStore';
import { Tooltip } from '@/components/ui/Tooltip';
import { FormulaTip } from '@/components/ui/FormulaTip';
import { formatEuro, formatPercent } from '@/utils/format';
import type { Resultats } from '@/types';

export function SectionIndicateurs() {
  const { resultats } = useSimulationResults();
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const pret = useSimulationStore((s) => s.pret);

  const endettementVariant: ChipVariant =
    resultats.taux_endettement > 35
      ? 'danger'
      : resultats.taux_endettement > 30
      ? 'warning'
      : 'success';

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <Activity className="w-4 h-4 text-accent" />
        Indicateurs financiers
      </h3>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Mini
          label="Coût total crédit"
          value={formatEuro(resultats.cout_total_credit)}
          hint={`+${formatEuro(resultats.interets_totaux)} intérêts`}
          tooltip={
            <FormulaTip
              description="Somme des mensualités du prêt principal sur toute la durée."
              formula="Coût = Mensualité × n"
              values={[
                { label: 'Mensualité', value: formatEuro(resultats.mensualite_principale) },
                { label: 'Mois', value: String(pret.duree_annees * 12) },
              ]}
              result={{ label: 'Intérêts totaux', value: formatEuro(resultats.interets_totaux) }}
            />
          }
        />
        <Mini
          label="Prêt principal"
          value={formatEuro(resultats.pret_principal_montant)}
          hint={resultats.ptz_montant > 0 ? `+ PTZ ${formatEuro(resultats.ptz_montant)}` : undefined}
          tooltip={
            <FormulaTip
              description="Reste à emprunter à la banque après apport, PTZ et aides."
              formula="Prêt = Coût acquisition − Apport − PTZ − Aides"
              values={[
                { label: 'Coût acquisition', value: formatEuro(resultats.cout_acquisition_total) },
                { label: '− Apport', value: formatEuro(utilisateur.apport) },
                ...(resultats.ptz_montant > 0
                  ? [{ label: '− PTZ', value: formatEuro(resultats.ptz_montant) }]
                  : []),
              ]}
              result={{ label: '= Prêt principal', value: formatEuro(resultats.pret_principal_montant) }}
            />
          }
        />
        <Mini
          label="Endettement"
          value={formatPercent(resultats.taux_endettement)}
          hint="HCSF max 35 %"
          variant={endettementVariant}
          tooltip={
            <FormulaTip
              description="Pic d'endettement sur la durée — c'est ce que retient la banque."
              formula="Endettement = Mensualité pic / Salaire"
              values={[
                { label: 'Mensualité pic', value: formatEuro(resultats.pic_mensualite_palier) },
                { label: 'Salaire net', value: formatEuro(utilisateur.salaire_net_mensuel) },
              ]}
              result={{ label: 'Taux', value: formatPercent(resultats.taux_endettement) }}
            />
          }
        />
        <Mini
          label="Reste à vivre"
          value={formatEuro(resultats.reste_a_vivre)}
          hint={`pendant différé : ${formatEuro(resultats.reste_a_vivre_pendant_differe_ptz)}`}
          tooltip={
            <FormulaTip
              description="Salaire − mensualités totales − charges propriétaire (post-différé PTZ)."
              formula="Reste = Salaire − Mensualité totale − PTZ − Charges"
              values={[
                { label: 'Salaire', value: formatEuro(utilisateur.salaire_net_mensuel) },
                { label: '− Mensualité', value: formatEuro(resultats.mensualite_totale) },
                { label: '− PTZ post-différé', value: formatEuro(resultats.mensualite_ptz) },
                { label: '− Charges', value: formatEuro(resultats.charges_mensuelles_proprietaire) },
              ]}
              result={{ label: 'Reste', value: formatEuro(resultats.reste_a_vivre) }}
              footnote={
                resultats.mensualite_ptz > 0
                  ? `Pendant les ${pret.ptz_duree_differe_annees} ans de différé : ${formatEuro(resultats.reste_a_vivre_pendant_differe_ptz)}/mois`
                  : null
              }
            />
          }
        />
        <Mini
          label="Capacité max"
          value={formatEuro(resultats.capacite_emprunt_max)}
          hint={`${pret.duree_annees} ans · 35 %`}
          tooltip={
            <FormulaTip
              description="Capital max qu'une banque vous prêterait à votre salaire actuel."
              formula="C = M × (1 − (1+t)^(−n)) / t"
              values={[
                { label: 'M (35 % salaire)', value: formatEuro(utilisateur.salaire_net_mensuel * 0.35) },
                { label: 'Taux', value: `${pret.taux_annuel.toFixed(2)} %` },
                { label: 'Durée', value: `${pret.duree_annees} ans` },
              ]}
              result={{ label: 'Capacité', value: formatEuro(resultats.capacite_emprunt_max) }}
            />
          }
        />
        <Mini
          label="Rendement brut"
          value={formatPercent(resultats.rendement_locatif_brut)}
          hint="loyer × 12 / coût"
        />
        <Mini
          label="Rendement net"
          value={formatPercent(resultats.rendement_locatif_net)}
          hint="charges & TF déduites"
        />
        <Mini
          label="TRI 5 ans"
          value={formatPercent(resultats.tri_simplifie_5_ans)}
          hint={`Revente ${formatEuro(resultats.prix_revente_estime_5_ans)}`}
          variant="accent"
          tooltip={
            <FormulaTip
              description="Retour annualisé sur cash investi (apport + frais), revente à 5 ans."
              formula="TRI = (Valeur nette / Cash investi)^(1/5) − 1"
              values={[
                { label: 'Cash investi', value: formatEuro(utilisateur.apport + resultats.frais_notaire + resultats.frais_agence) },
                { label: 'Revente nette', value: formatEuro(Math.round(resultats.prix_revente_estime_5_ans * 0.93)) },
              ]}
              result={{ label: 'TRI', value: formatPercent(resultats.tri_simplifie_5_ans) }}
              footnote="Hypothèse +2,5 %/an. Hors loyers économisés."
            />
          }
        />
      </div>
    </div>
  );
}

type ChipVariant = 'default' | 'success' | 'warning' | 'danger' | 'accent';

const VARIANT_COLOR: Record<ChipVariant, string> = {
  default: 'text-text',
  success: 'text-success',
  warning: 'text-warning',
  danger: 'text-danger',
  accent: 'text-accent',
};

function Mini({
  label,
  value,
  hint,
  tooltip,
  variant = 'default',
}: {
  label: string;
  value: string;
  hint?: string;
  tooltip?: React.ReactNode;
  variant?: ChipVariant;
}) {
  return (
    <div className="p-2.5 rounded-lg bg-bg-subtle/40 border border-border-subtle hover:border-border transition">
      <div className="flex items-center gap-1 text-[10px] text-text-muted uppercase tracking-wider font-medium mb-0.5">
        <span className="truncate">{label}</span>
        {tooltip && <Tooltip content={tooltip} wide />}
      </div>
      <div className={`font-mono text-lg font-semibold tabular-nums leading-tight ${VARIANT_COLOR[variant]}`}>
        {value}
      </div>
      {hint && <div className="text-[10px] text-text-subtle mt-0.5 truncate">{hint}</div>}
    </div>
  );
}

// Eviter ESLint complaint sur Resultats import inutilisé
export type { Resultats };
