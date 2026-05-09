import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { formatPercent } from '@/utils/format';

/**
 * Bandeau HCSF compact — alerte de viabilité du dossier banque.
 * Le détail (mensualité pic, breakdown coûts, indicateurs...) est ailleurs :
 *  - Mensualités et paliers : <ChartPaliers />
 *  - Décomposition + total à débourser : <ChartCoutTotal />
 *  - Indicateurs : <SectionIndicateurs />
 */
export function SectionResultats() {
  const { resultats } = useSimulationResults();
  const ok = resultats.taux_endettement <= 35;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`p-3 rounded-xl border flex items-center gap-2.5 text-sm animate-slide-up ${
        ok
          ? 'bg-success/10 border-success/25 text-success'
          : 'bg-danger/10 border-danger/25 text-danger'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden="true" />
      )}
      <span className="text-text-muted">
        {ok ? (
          <>
            Dossier dans les clous HCSF · taux d'endettement{' '}
            <span className="font-medium text-success">{formatPercent(resultats.taux_endettement)}</span>
            (sous le plafond 35 %).
          </>
        ) : (
          <>
            Endettement <span className="font-medium text-danger">{formatPercent(resultats.taux_endettement)}</span>{' '}
            au pic (post-différé PTZ) — au-dessus du plafond HCSF de 35 %, refus probable des banques.
          </>
        )}
      </span>
    </div>
  );
}
