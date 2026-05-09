import { useCallback, useMemo } from 'react';
import {
  Home,
  Landmark,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  Equal,
  RotateCw,
  Tag,
} from 'lucide-react';
import { Select } from '@/components/ui/Select';
import { NumberField } from '@/components/ui/NumberField';
import { getCommune, getCommunes, useSimulationStore } from '@/store/useSimulationStore';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { calculEcartPrixM2 } from '@/calculators/simulation';
import { formatEuro } from '@/utils/format';
import { estEligiblePTZ } from '@/calculators/ptz';
import type { ZonePTZ } from '@/types';

const ZONE_LABELS: Record<ZonePTZ, string> = {
  Abis: 'A bis · Paris ultra tendue',
  A: 'A · grandes métropoles tendues',
  B1: 'B1 · agglos tendues (PTZ ✓)',
  B2: 'B2 · zones moyennement tendues',
  C: 'C · reste du territoire',
};

const ZONE_PTZ_OK: ZonePTZ[] = ['Abis', 'A', 'B1'];

const TYPE_BIEN_OPTIONS = [
  { value: 'neuf', label: 'Neuf · frais notaire 2,5 % · PTZ possible' },
  { value: 'ancien', label: 'Ancien · frais notaire 7,5 %' },
];

const COMMUNES_OPTIONS = getCommunes().map((c) => ({
  value: c.commune,
  label: `${c.commune} · ${c.distance_sofia_km} km Sophia · ${c.attractivite}`,
}));

export function SectionBien() {
  const bien = useSimulationStore((s) => s.bien);
  const setBien = useSimulationStore((s) => s.setBien);
  const recalibrer = useSimulationStore((s) => s.recalibrerPrixSurMoyenne);
  const commune = getCommune(bien.commune);
  const { ptzMax } = useSimulationResults();

  const eligiblePTZ = estEligiblePTZ(bien.type_bien, commune.zone_ptz);
  const zoneTendue = ZONE_PTZ_OK.includes(commune.zone_ptz);

  const ecart = useMemo(() => calculEcartPrixM2(bien, commune), [bien, commune]);
  const ecartAbs = Math.abs(ecart.ecart_pourcent);
  const isUnder = ecart.ecart_pourcent < -1.5;
  const isOver = ecart.ecart_pourcent > 1.5;

  const ecartIcon = isUnder ? (
    <TrendingDown className="w-4 h-4 text-success" aria-hidden="true" />
  ) : isOver ? (
    <TrendingUp className="w-4 h-4 text-danger" aria-hidden="true" />
  ) : (
    <Equal className="w-4 h-4 text-text-muted" aria-hidden="true" />
  );
  const ecartColor = isUnder ? 'text-success' : isOver ? 'text-danger' : 'text-text-muted';
  const ecartLabel = isUnder
    ? `Sous le marché — ${ecartAbs.toFixed(1)} %`
    : isOver
    ? `Au-dessus du marché — +${ecartAbs.toFixed(1)} %`
    : 'Au prix du marché';

  const onCommune = useCallback((v: string) => setBien({ commune: v }), [setBien]);
  const onTypeBien = useCallback(
    (v: string) => setBien({ type_bien: v as 'neuf' | 'ancien' }),
    [setBien]
  );
  const onPrixBien = useCallback(
    (v: number) => setBien({ prix_bien: Math.max(0, v) }),
    [setBien]
  );
  const onSurface = useCallback(
    (v: number) => setBien({ surface: Math.max(1, v) }),
    [setBien]
  );
  const onLoyer = useCallback(
    (v: number) => setBien({ loyer_mensuel_potentiel: v }),
    [setBien]
  );

  return (
    <div className="space-y-4">
      {/* 1) INPUTS PRIMAIRES — en haut */}
      <div className="p-3 rounded-lg border-2 border-accent/30 bg-accent/5 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Tag className="w-4 h-4 text-accent" aria-hidden="true" />
          <div className="text-xs text-text-muted uppercase tracking-wider font-semibold">
            Le bien que vous visez
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <NumberField
            label="Prix du bien (FAI)"
            value={bien.prix_bien}
            onChange={onPrixBien}
            min={0}
            step={1000}
            suffix="€"
            tooltip="Prix affiché sur l'annonce, frais d'agence inclus (FAI). Source de vérité — tout en découle."
          />
          <NumberField
            label="Surface"
            value={bien.surface}
            onChange={onSurface}
            min={1}
            max={500}
            step={1}
            suffix="m²"
          />
        </div>

        <div className="pt-3 border-t border-border-subtle space-y-2">
          <div className="flex items-end justify-between">
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wider">
                Prix au m² calculé
              </div>
              <div className="text-2xl font-mono font-semibold text-text">
                {formatEuro(ecart.prix_m2_calcule)}
                <span className="text-sm text-text-muted">/m²</span>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-text-subtle uppercase tracking-wider">
                Moyenne {bien.type_bien} {bien.commune}
              </div>
              <div className="text-sm font-mono text-text-muted">
                {formatEuro(ecart.prix_m2_reference)}/m²
              </div>
            </div>
          </div>

          <div
            className={`flex items-center justify-between p-2 rounded-md ${
              isUnder ? 'bg-success/10' : isOver ? 'bg-danger/10' : 'bg-bg-subtle/60'
            }`}
          >
            <div className="flex items-center gap-1.5 text-xs">
              {ecartIcon}
              <span className={`font-medium ${ecartColor}`}>{ecartLabel}</span>
            </div>
            <div className={`font-mono text-xs tabular-nums ${ecartColor}`}>
              {ecart.ecart_euros >= 0 ? '+' : ''}
              {formatEuro(ecart.ecart_euros)}/m²
            </div>
          </div>

          <button
            type="button"
            onClick={recalibrer}
            className="btn-ghost w-full text-xs py-1.5"
            title="Met le prix sur la moyenne du marché commune × surface"
          >
            <RotateCw className="w-3 h-3" aria-hidden="true" />
            Caler sur la moyenne du marché ({formatEuro(ecart.prix_m2_reference * bien.surface)})
          </button>
        </div>
      </div>

      {/* 2) Commune + zone PTZ */}
      <Select
        label="Commune"
        value={bien.commune}
        onChange={onCommune}
        options={COMMUNES_OPTIONS}
        tooltip="Communes autour de Sophia Antipolis triées par attractivité."
      />

      <div
        className={`p-3 rounded-lg border ${
          zoneTendue ? 'bg-accent/5 border-accent/30' : 'bg-warning/5 border-warning/25'
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <Landmark className={`w-4 h-4 ${zoneTendue ? 'text-accent' : 'text-warning'}`} aria-hidden="true" />
            <div>
              <div className="text-xs text-text-subtle uppercase tracking-wider">Zone PTZ</div>
              <div className="text-sm font-semibold text-text">{ZONE_LABELS[commune.zone_ptz]}</div>
            </div>
          </div>
          <span className={zoneTendue ? 'chip-info' : 'chip-warning'}>{commune.zone_ptz}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          {eligiblePTZ ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-hidden="true" />
              <span className="text-text-muted">
                PTZ <span className="text-success font-medium">éligible</span> jusqu'à{' '}
                <span className="font-mono text-text">{formatEuro(ptzMax)}</span>
              </span>
            </>
          ) : (
            <>
              <XCircle className="w-3.5 h-3.5 text-text-subtle" aria-hidden="true" />
              <span className="text-text-muted">
                PTZ <span className="text-text font-medium">non éligible</span> en{' '}
                {bien.type_bien} sur cette zone
              </span>
            </>
          )}
        </div>
      </div>

      {/* 3) Type de bien */}
      <Select
        label="Type de bien"
        value={bien.type_bien}
        onChange={onTypeBien}
        options={TYPE_BIEN_OPTIONS}
      />

      {/* 4) Loyer locatif */}
      <NumberField
        label="Loyer mensuel potentiel (rendement locatif)"
        value={bien.loyer_mensuel_potentiel}
        onChange={onLoyer}
        suffix="€/mois"
        step={50}
        tooltip="Loyer hors charges si vous louiez le bien. Sert au calcul du rendement et du TRI."
      />
    </div>
  );
}

export const SectionBienIcon = Home;
