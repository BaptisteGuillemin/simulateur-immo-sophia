import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from 'recharts';
import { Layers, AlertTriangle } from 'lucide-react';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { SOURCE_COLORS, SOURCE_LABELS } from '@/calculators/paliers';
import { formatEuro } from '@/utils/format';
import type { PalierMensualite, PalierSource } from '@/types';

const SOURCE_KEYS: PalierSource[] = [
  'pret_banque',
  'assurance_emprunteur',
  'ptz',
  'pel',
  'cel',
  'action_logement',
  'redevance_brs',
];

interface BarRow {
  label: string;
  numero: number;
  duree: string;
  total: number;
  isPic: boolean;
  pret_banque: number;
  assurance_emprunteur: number;
  ptz: number;
  pel: number;
  cel: number;
  action_logement: number;
  redevance_brs: number;
}

function moisAuLabel(start: number, end: number): string {
  const sa = ((start - 1) / 12).toFixed(1);
  const ea = (end / 12).toFixed(1);
  return `${sa}–${ea} ans`;
}

function moisAuLabelCourt(start: number, end: number): string {
  const sa = Math.round((start - 1) / 12);
  const ea = Math.round(end / 12);
  return `${sa === 0 ? 0 : sa}–${ea}a`;
}

function paliersToBarData(paliers: PalierMensualite[], picNumero: number): BarRow[] {
  return paliers.map((p) => {
    const row: BarRow = {
      label: `Palier ${p.numero}`,
      numero: p.numero,
      duree: moisAuLabel(p.debut_mois, p.fin_mois),
      total: p.total,
      isPic: p.numero === picNumero,
      pret_banque: 0,
      assurance_emprunteur: 0,
      ptz: 0,
      pel: 0,
      cel: 0,
      action_logement: 0,
      redevance_brs: 0,
    };
    p.composantes.forEach((c) => {
      row[c.source] = c.mensualite;
    });
    return row;
  });
}

export function ChartPaliers() {
  const { resultats } = useSimulationResults();

  const data = useMemo(
    () => paliersToBarData(resultats.paliers, resultats.pic_palier_numero),
    [resultats.paliers, resultats.pic_palier_numero]
  );

  if (data.length === 0) {
    return null;
  }

  const totalMaxBar = Math.max(...data.map((d) => d.total));
  const chartHeight = Math.max(180, data.length * 50 + 80);

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <Layers className="w-4 h-4 text-accent" />
        Paliers de mensualité — composition par phase
      </h3>

      <p className="text-xs text-text-muted mb-3">
        Quand un prêt commence ou se termine, la composition de votre mensualité change.
        La banque retient le <strong className="text-text">pic</strong> (palier le plus haut)
        pour l'endettement HCSF, et non la somme brute.
      </p>

      <div style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 8, right: 80, bottom: 4, left: 8 }}
            stackOffset="none"
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" horizontal={false} />
            <XAxis
              type="number"
              stroke="#8a92a3"
              tick={{ fontSize: 11, fill: '#525a6b' }}
              tickFormatter={(v) => formatEuro(v)}
              domain={[0, Math.ceil(totalMaxBar * 1.15)]}
            />
            <YAxis
              type="category"
              dataKey="duree"
              stroke="#8a92a3"
              tick={(props) => {
                const { x, y, payload, index } = props as { x: number; y: number; payload: { value: string }; index: number };
                const row = data[index];
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text
                      x={-6}
                      y={0}
                      dy={4}
                      textAnchor="end"
                      fontSize="11"
                      fontWeight={row?.isPic ? 700 : 500}
                      fill={row?.isPic ? '#3b6fe0' : '#525a6b'}
                    >
                      {payload.value}
                    </text>
                  </g>
                );
              }}
              width={70}
            />
            <RTooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #d8dde7',
                borderRadius: 8,
                color: '#0f1623',
                fontSize: 12,
                boxShadow: '0 8px 24px -12px rgba(15,22,35,0.12)',
              }}
              cursor={{ fill: 'rgba(59,111,224,0.05)' }}
              formatter={(v: number, name: string) => [formatEuro(v), SOURCE_LABELS[name as PalierSource]]}
              labelFormatter={(v) => `Période ${v}`}
            />
            <Legend
              wrapperStyle={{ fontSize: 11, color: '#525a6b' }}
              formatter={(v) => SOURCE_LABELS[v as PalierSource] ?? v}
            />
            {SOURCE_KEYS.map((src) => (
              <Bar
                key={src}
                dataKey={src}
                stackId="mensualite"
                name={src}
                fill={SOURCE_COLORS[src]}
                radius={src === 'redevance_brs' ? [0, 4, 4, 0] : 0}
              >
                {data.map((d, i) => (
                  <Cell key={i} fill={SOURCE_COLORS[src]} fillOpacity={d.isPic ? 1 : 0.7} />
                ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tableau détaillé des paliers */}
      <div className="mt-4 border border-border-subtle rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg-subtle/60 text-text-subtle">
            <tr>
              <th className="px-3 py-2 text-left font-medium">Palier</th>
              <th className="px-3 py-2 text-left font-medium">Période</th>
              <th className="px-3 py-2 text-left font-medium">Composantes actives</th>
              <th className="px-3 py-2 text-right font-medium">Mensualité</th>
            </tr>
          </thead>
          <tbody>
            {resultats.paliers.map((p) => (
              <tr
                key={p.numero}
                className={`border-t border-border-subtle ${
                  p.numero === resultats.pic_palier_numero
                    ? 'bg-accent/5 font-medium'
                    : ''
                }`}
              >
                <td className="px-3 py-2 text-text">
                  {p.numero}
                  {p.numero === resultats.pic_palier_numero && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-[10px] text-accent">
                      <AlertTriangle className="w-3 h-3" />
                      PIC
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-text-muted font-mono">
                  {moisAuLabelCourt(p.debut_mois, p.fin_mois)}
                  <span className="text-text-subtle ml-1">({p.duree_mois} mois)</span>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap gap-1">
                    {p.composantes.map((c) => (
                      <span
                        key={c.source}
                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                        style={{
                          background: SOURCE_COLORS[c.source] + '22',
                          color: SOURCE_COLORS[c.source],
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: SOURCE_COLORS[c.source] }}
                        />
                        {SOURCE_LABELS[c.source]} {formatEuro(c.mensualite)}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-mono tabular-nums text-text">
                  {formatEuro(p.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-text-subtle">
        💡 <strong className="text-text-muted">Endettement HCSF</strong> = pic des paliers ÷
        salaire net. Si vos prêts ne se chevauchent pas (ex : prêt banque court + PTZ avec long
        différé), votre endettement réel peut être bien inférieur à la somme brute.
      </div>
    </div>
  );
}
