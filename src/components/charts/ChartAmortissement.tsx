import { useMemo } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { formatEuro } from '@/utils/format';
import { LineChart as ChartIcon } from 'lucide-react';

export function ChartAmortissement() {
  const { amortissement } = useSimulationResults();

  // Sample par année pour lisibilité — mémoïsé sur la référence d'amortissement
  // (qui est elle-même mémoïsée dans useSimulationResults).
  const data = useMemo(
    () =>
      amortissement
        .filter((m) => m.mois % 12 === 0)
        .map((m) => ({
          annee: m.mois / 12,
          capital_restant: Math.round(m.capital_restant),
          cumul_capital: Math.round(m.cumul_capital),
          cumul_interets: Math.round(m.cumul_interets),
        })),
    [amortissement]
  );

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <ChartIcon className="w-4 h-4 text-accent" />
        Courbe d'amortissement
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <defs>
              <linearGradient id="capRest" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b6fe0" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b6fe0" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="interets" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#d97706" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#d97706" stopOpacity={0.04} />
              </linearGradient>
              <linearGradient id="capital" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.04} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
            <XAxis
              dataKey="annee"
              stroke="#8a92a3"
              tick={{ fontSize: 11, fill: '#525a6b' }}
              tickFormatter={(v) => `${v}a`}
            />
            <YAxis
              stroke="#8a92a3"
              tick={{ fontSize: 11, fill: '#525a6b' }}
              tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
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
              labelFormatter={(v) => `Année ${v}`}
              formatter={(v: number) => formatEuro(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#525a6b' }} />
            <Area
              type="monotone"
              dataKey="capital_restant"
              name="Capital restant dû"
              stroke="#3b6fe0"
              fillOpacity={1}
              fill="url(#capRest)"
            />
            <Area
              type="monotone"
              dataKey="cumul_capital"
              name="Capital remboursé"
              stroke="#10b981"
              fillOpacity={1}
              fill="url(#capital)"
            />
            <Area
              type="monotone"
              dataKey="cumul_interets"
              name="Intérêts cumulés"
              stroke="#d97706"
              fillOpacity={1}
              fill="url(#interets)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
