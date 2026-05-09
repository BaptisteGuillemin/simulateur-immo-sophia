import { useState } from 'react';
import { Bookmark, Trash2, Download } from 'lucide-react';
import { useSimulationStore } from '@/store/useSimulationStore';
import { formatDate } from '@/utils/format';

export function ScenariosManager() {
  const scenarios = useSimulationStore((s) => s.scenarios);
  const saveScenario = useSimulationStore((s) => s.saveScenario);
  const deleteScenario = useSimulationStore((s) => s.deleteScenario);
  const loadScenario = useSimulationStore((s) => s.loadScenario);
  const [nom, setNom] = useState('');

  const handleSave = () => {
    const finalNom = nom.trim() || `Scénario ${scenarios.length + 1}`;
    saveScenario(finalNom);
    setNom('');
  };

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <Bookmark className="w-4 h-4 text-accent" />
        Mes scénarios
      </h3>

      <div className="flex gap-2 mb-4">
        <input
          type="text"
          className="input"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder="Ex : Biot 40m² PTZ 70k"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <button className="btn-primary" onClick={handleSave}>
          Sauvegarder
        </button>
      </div>

      {scenarios.length === 0 ? (
        <div className="text-sm text-text-subtle text-center py-6 border border-dashed border-border-subtle rounded-lg">
          Aucun scénario sauvegardé. Configurez votre simulation puis cliquez sur Sauvegarder.
        </div>
      ) : (
        <ul className="space-y-2">
          {scenarios.map((sc) => (
            <li
              key={sc.id}
              className="flex items-center justify-between gap-2 p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle hover:border-accent/40 transition"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-text truncate">{sc.nom}</div>
                <div className="text-xs text-text-subtle">
                  {sc.bien.commune} · {sc.bien.surface}m² · {sc.bien.type_bien} · {formatDate(sc.date_creation)}
                </div>
              </div>
              <button
                className="btn-ghost px-2"
                onClick={() => loadScenario(sc.id)}
                title="Charger ce scénario"
              >
                <Download className="w-4 h-4" />
              </button>
              <button
                className="btn-ghost px-2 hover:text-danger"
                onClick={() => deleteScenario(sc.id)}
                title="Supprimer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
