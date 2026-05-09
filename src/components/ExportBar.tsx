import { useState } from 'react';
import { FileDown, FileJson, RotateCcw } from 'lucide-react';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { useSimulationStore } from '@/store/useSimulationStore';
import { exportJSON, exportPDF } from '@/utils/exporters';

export function ExportBar() {
  const { resultats, commune, utilisateur, bien, pret } = useSimulationResults();
  const reset = useSimulationStore((s) => s.reset);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const data = { utilisateur, bien, pret, commune, resultats };

  const handlePdf = async () => {
    if (isExportingPdf) return;
    setIsExportingPdf(true);
    try {
      await exportPDF(data);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleJson = () => exportJSON(data);

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        type="button"
        className="btn-secondary"
        onClick={handlePdf}
        disabled={isExportingPdf}
        aria-busy={isExportingPdf}
      >
        <FileDown className="w-4 h-4" aria-hidden="true" />
        {isExportingPdf ? 'Export…' : 'Export PDF'}
      </button>
      <button type="button" className="btn-secondary" onClick={handleJson}>
        <FileJson className="w-4 h-4" aria-hidden="true" />
        Export JSON
      </button>
      <button
        type="button"
        className="btn-ghost"
        onClick={reset}
        title="Réinitialiser tous les paramètres"
        aria-label="Réinitialiser tous les paramètres"
      >
        <RotateCcw className="w-4 h-4" aria-hidden="true" />
        Reset
      </button>
    </div>
  );
}
