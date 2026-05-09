import { memo, useCallback } from 'react';
import { Receipt } from 'lucide-react';
import { NumberField } from '@/components/ui/NumberField';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { formatEuro } from '@/utils/format';

export function SectionCharges() {
  const bien = useSimulationStore((s) => s.bien);
  const setBien = useSimulationStore((s) => s.setBien);
  const { resultats, commune } = useSimulationResults();

  const onAssurance = useCallback(
    (v: number) => setBien({ assurance_habitation_annuelle: Math.max(0, v) }),
    [setBien]
  );
  const onFondsTravaux = useCallback(
    (v: number) => setBien({ fonds_travaux_annuel: Math.max(0, v) }),
    [setBien]
  );

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <Receipt className="w-4 h-4 text-accent" />
        Charges propriétaire
      </h3>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Assurance habitation"
            value={bien.assurance_habitation_annuelle}
            onChange={onAssurance}
            suffix="€/an"
            step={20}
            tooltip="MRH propriétaire occupant. ~250-350 €/an pour un T2/T3 standard."
          />
          <NumberField
            label="Fonds travaux ALUR"
            value={bien.fonds_travaux_annuel}
            onChange={onFondsTravaux}
            suffix="€/an"
            step={50}
            tooltip="Loi ALUR : provision obligatoire ≥ 5 % du budget annuel charges (copropriétés > 10 lots, sauf neuf < 5 ans)."
          />
        </div>

        <div className="p-3 rounded-lg bg-bg-subtle/60 border border-border-subtle">
          <div className="text-xs text-text-subtle uppercase tracking-wider mb-2">
            Charges mensuelles totales · {commune.commune}
          </div>
          <div className="space-y-1.5 text-xs">
            <Row
              label="Taxe foncière"
              value={resultats.charge_taxe_fonciere_mensuelle}
              hint={`${formatEuro(commune.taxe_fonciere_moyenne)}/an (TEOM incluse)`}
            />
            <Row
              label="Charges copropriété"
              value={resultats.charge_copro_mensuelle}
              hint={
                bien.charges_copro_perso_actif
                  ? `${formatEuro(bien.charges_copro_perso_annuelles)}/an (perso)`
                  : `${formatEuro(commune.charges_copro_annuelles_moyennes)}/an (moyenne ${commune.commune})`
              }
            />
            <Row
              label="Assurance habitation"
              value={resultats.charge_assurance_habitation_mensuelle}
              hint={`${formatEuro(bien.assurance_habitation_annuelle)}/an`}
            />
            {bien.fonds_travaux_annuel > 0 && (
              <Row
                label="Fonds travaux ALUR"
                value={resultats.charge_fonds_travaux_mensuelle}
                hint={`${formatEuro(bien.fonds_travaux_annuel)}/an`}
              />
            )}
          </div>
          <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between">
            <span className="text-xs font-medium text-text">Total / mois</span>
            <span className="font-mono text-sm font-semibold text-accent">
              {formatEuro(resultats.charges_mensuelles_proprietaire)}
            </span>
          </div>
          <div className="mt-1 text-xs text-text-subtle">
            Taxe d'habitation supprimée pour la résidence principale depuis 2023.
          </div>
        </div>
      </div>
    </div>
  );
}

const Row = memo(function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-text-muted">{label}</span>
        {hint && <span className="text-text-subtle ml-1.5">· {hint}</span>}
      </div>
      <span className="font-mono text-text tabular-nums">{value} €</span>
    </div>
  );
});
