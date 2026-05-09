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

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button className="btn-secondary" onClick={handlePdf} disabled={isExportingPdf}>
        <FileDown className="w-4 h-4" />
        {isExportingPdf ? 'Export…' : 'Export PDF'}
      </button>
      <button className="btn-secondary" onClick={() => exportJSON(data)}>
        <FileJson className="w-4 h-4" />
        Export JSON
      </button>
      <button className="btn-ghost" onClick={reset} title="Réinitialiser tous les paramètres">
        <RotateCcw className="w-4 h-4" />
        Reset
      </button>
    </div>
  );
}
