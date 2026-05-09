import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from 'recharts';
import { useSimulationStore, getCommune } from '@/store/useSimulationStore';
import { comparerNeufAncien } from '@/calculators/simulation';
import { formatEuro } from '@/utils/format';
import { GitCompare } from 'lucide-react';

export function ChartComparaison() {
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const bien = useSimulationStore((s) => s.bien);
  const pret = useSimulationStore((s) => s.pret);
  const commune = getCommune(bien.commune);

  // Mémoïse le calcul lourd (deux simulations complètes neuf/ancien)
  // et la construction des données du graphe.
  const data = useMemo(() => {
    const { neuf, ancien } = comparerNeufAncien(utilisateur, bien, pret, commune);
    return [
      { critere: 'Mensualité', Neuf: neuf.mensualite_totale, Ancien: ancien.mensualite_totale },
      { critere: 'Frais notaire', Neuf: neuf.frais_notaire, Ancien: ancien.frais_notaire },
      { critere: 'Intérêts', Neuf: neuf.interets_totaux, Ancien: ancien.interets_totaux },
      { critere: 'Coût total', Neuf: neuf.cout_total_credit, Ancien: ancien.cout_total_credit },
      { critere: 'PTZ', Neuf: neuf.ptz_montant, Ancien: ancien.ptz_montant },
    ];
  }, [utilisateur, bien, pret, commune]);

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <GitCompare className="w-4 h-4 text-accent" />
        Neuf vs Ancien — {bien.commune}
      </h3>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e6eaf2" vertical={false} />
            <XAxis dataKey="critere" stroke="#8a92a3" tick={{ fontSize: 11, fill: '#525a6b' }} />
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
              cursor={{ fill: 'rgba(59,111,224,0.05)' }}
              formatter={(v: number) => formatEuro(v)}
            />
            <Legend wrapperStyle={{ fontSize: 11, color: '#525a6b' }} />
            <Bar dataKey="Neuf" fill="#3b6fe0" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Ancien" fill="#f59e0b" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
