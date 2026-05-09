import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RTooltip, Legend } from 'recharts';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { formatEuro } from '@/utils/format';
import { PieChart as PieIcon } from 'lucide-react';

const COLORS = [
  '#3b6fe0', // Prix du bien - bleu
  '#8b5cf6', // Frais notaire - violet
  '#ec4899', // Frais agence - rose
  '#d97706', // Intérêts banque - orange
  '#e11d48', // Assurance - rouge
  '#0891b2', // Intérêts aides - cyan foncé
  '#14b8a6', // Redevance BRS - teal
];

interface PieLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  value: number;
  name: string;
  percent: number;
}

function renderLabel({ cx, cy, midAngle, outerRadius, value, percent, name }: PieLabelProps) {
  if (percent < 0.012) return null;
  const RAD = Math.PI / 180;
  const r = outerRadius + 24;
  const x = cx + r * Math.cos(-midAngle * RAD);
  const y = cy + r * Math.sin(-midAngle * RAD);
  const anchor = x > cx ? 'start' : 'end';
  return (
    <g>
      <text
        x={x}
        y={y - 6}
        textAnchor={anchor}
        fill="#0f1623"
        fontSize="14"
        fontWeight="700"
        fontFamily="JetBrains Mono, monospace"
      >
        {formatEuro(value)}
      </text>
      <text
        x={x}
        y={y + 12}
        textAnchor={anchor}
        fill="#525a6b"
        fontSize="12"
        fontWeight="500"
      >
        {name} · {(percent * 100).toFixed(1)}%
      </text>
    </g>
  );
}

export function ChartCoutTotal() {
  const { resultats } = useSimulationResults();

  // Décomposition alignée sur le bloc "Coût total réel" : la somme = cout_total_reel
  // On montre uniquement les COÛTS NETS (les capitaux remboursés des prêts ne sont pas un coût)
  const { data, total } = useMemo(() => {
    const arr = [
      { name: 'Prix du bien', value: resultats.prix_bien },
      { name: 'Frais notaire', value: resultats.frais_notaire },
      { name: 'Frais agence', value: resultats.frais_agence },
      { name: 'Intérêts banque', value: resultats.interets_totaux },
      { name: 'Assurance emprunteur', value: resultats.cout_total_assurance },
      { name: 'Intérêts aides', value: resultats.interets_aides_total },
      { name: 'Redevance BRS', value: resultats.cout_total_brs_redevance },
    ].filter((d) => d.value > 0);
    return { data: arr, total: resultats.cout_total_reel };
  }, [
    resultats.prix_bien,
    resultats.frais_notaire,
    resultats.frais_agence,
    resultats.interets_totaux,
    resultats.cout_total_assurance,
    resultats.interets_aides_total,
    resultats.cout_total_brs_redevance,
    resultats.cout_total_reel,
  ]);

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <PieIcon className="w-4 h-4 text-accent" />
        Décomposition du coût total réel
      </h3>
      <p className="text-xs text-text-muted mb-3 -mt-2">
        Tout ce que vous décaissez sur la durée du prêt — somme alignée sur le bloc
        "Coût total réel". Les capitaux remboursés (PTZ, PEL, etc.) ne sont pas comptés :
        seuls leurs intérêts apparaissent.
      </p>
      <div className="h-[28rem]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart margin={{ top: 24, right: 120, bottom: 32, left: 120 }}>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={80}
              outerRadius={130}
              paddingAngle={2}
              label={renderLabel as never}
              labelLine={{ stroke: '#d8dde7', strokeWidth: 1 }}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="#ffffff" strokeWidth={2} />
              ))}
            </Pie>
            <RTooltip
              contentStyle={{
                background: '#ffffff',
                border: '1px solid #d8dde7',
                borderRadius: 8,
                color: '#0f1623',
                fontSize: 13,
                boxShadow: '0 8px 24px -12px rgba(15,22,35,0.12)',
              }}
              formatter={(v: number) => [formatEuro(v), '']}
            />
            <Legend
              verticalAlign="bottom"
              iconType="circle"
              wrapperStyle={{ fontSize: 13, color: '#525a6b', paddingTop: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="text-center mt-3">
        <div className="stat-label">Total</div>
        <div className="text-3xl font-mono font-bold text-accent tabular-nums">{formatEuro(total)}</div>
      </div>
    </div>
  );
}
