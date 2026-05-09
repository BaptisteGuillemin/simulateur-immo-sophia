import { useCallback, useId, useState } from 'react';
import { Sparkles, Bookmark, ChevronLeft } from 'lucide-react';
import { OptimizerPanel } from '@/components/sections/OptimizerPanel';
import { ScenariosManager } from '@/components/sections/ScenariosManager';
import { useSimulationStore } from '@/store/useSimulationStore';

type Tab = 'optimizer' | 'scenarios';

export function SideRail() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('optimizer');
  const scenariosCount = useSimulationStore((s) => s.scenarios.length);
  const panelId = useId();

  const handleEnter = useCallback(() => setOpen(true), []);
  const handleLeave = useCallback(() => setOpen(false), []);
  const handleClose = useCallback(() => setOpen(false), []);
  const selectOptimizer = useCallback(() => {
    setTab('optimizer');
    setOpen(true);
  }, []);
  const selectScenarios = useCallback(() => {
    setTab('scenarios');
    setOpen(true);
  }, []);

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 right-0 z-30 flex items-stretch h-[80vh] max-h-[760px]"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      {/* Tab pegs (always visible) */}
      <div
        role="tablist"
        aria-label="Outils auxiliaires"
        aria-orientation="vertical"
        className="flex flex-col justify-center gap-1 py-3 px-1 bg-white border border-r-0 border-border rounded-l-xl shadow-[0_8px_24px_-12px_rgba(15,22,35,0.15)]"
      >
        <button
          type="button"
          role="tab"
          id={`${panelId}-tab-optimizer`}
          aria-selected={tab === 'optimizer' && open}
          aria-controls={panelId}
          aria-expanded={open && tab === 'optimizer'}
          onClick={selectOptimizer}
          className={`group flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              tab === 'optimizer' && open
                ? 'bg-accent text-white'
                : 'text-text-muted hover:bg-bg-subtle hover:text-text'
            }`}
          title="Simulation automatique"
          aria-label="Simulation automatique"
        >
          <Sparkles className="w-4 h-4" aria-hidden="true" />
          <span className="text-[10px] font-medium [writing-mode:vertical-rl] rotate-180 tracking-wider">
            OPTIMISER
          </span>
        </button>
        <button
          type="button"
          role="tab"
          id={`${panelId}-tab-scenarios`}
          aria-selected={tab === 'scenarios' && open}
          aria-controls={panelId}
          aria-expanded={open && tab === 'scenarios'}
          onClick={selectScenarios}
          className={`relative group flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-all
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 ${
              tab === 'scenarios' && open
                ? 'bg-accent text-white'
                : 'text-text-muted hover:bg-bg-subtle hover:text-text'
            }`}
          title="Mes scénarios"
          aria-label={`Mes scénarios${scenariosCount > 0 ? ` (${scenariosCount})` : ''}`}
        >
          <Bookmark className="w-4 h-4" aria-hidden="true" />
          <span className="text-[10px] font-medium [writing-mode:vertical-rl] rotate-180 tracking-wider">
            SCÉNARIOS
          </span>
          {scenariosCount > 0 && (
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center"
            >
              {scenariosCount}
            </span>
          )}
        </button>
      </div>

      {/* Sliding panel */}
      <div
        id={panelId}
        role="tabpanel"
        aria-labelledby={`${panelId}-tab-${tab}`}
        aria-hidden={!open}
        className={`overflow-hidden transition-[width,opacity] duration-300 ease-out
          ${open ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="h-full overflow-y-auto p-3 bg-bg-surface border border-l-0 border-border rounded-r-xl shadow-[0_8px_24px_-12px_rgba(15,22,35,0.15)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {tab === 'optimizer' ? 'Optimisation' : 'Scénarios sauvegardés'}
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-text-subtle hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded"
              aria-label="Replier le panneau"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" aria-hidden="true" />
            </button>
          </div>
          {tab === 'optimizer' ? <OptimizerPanel /> : <ScenariosManager />}
        </div>
      </div>
    </div>
  );
}
