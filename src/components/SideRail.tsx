import { useState } from 'react';
import { Sparkles, Bookmark, ChevronLeft } from 'lucide-react';
import { OptimizerPanel } from '@/components/sections/OptimizerPanel';
import { ScenariosManager } from '@/components/sections/ScenariosManager';
import { useSimulationStore } from '@/store/useSimulationStore';

type Tab = 'optimizer' | 'scenarios';

export function SideRail() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('optimizer');
  const scenariosCount = useSimulationStore((s) => s.scenarios.length);

  return (
    <div
      className="fixed top-1/2 -translate-y-1/2 right-0 z-30 flex items-stretch h-[80vh] max-h-[760px]"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      {/* Tab pegs (always visible) */}
      <div className="flex flex-col justify-center gap-1 py-3 px-1 bg-white border border-r-0 border-border rounded-l-xl shadow-[0_8px_24px_-12px_rgba(15,22,35,0.15)]">
        <button
          type="button"
          onClick={() => {
            setTab('optimizer');
            setOpen(true);
          }}
          className={`group flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-all ${
            tab === 'optimizer' && open
              ? 'bg-accent text-white'
              : 'text-text-muted hover:bg-bg-subtle hover:text-text'
          }`}
          title="Simulation automatique"
          aria-label="Simulation automatique"
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] font-medium [writing-mode:vertical-rl] rotate-180 tracking-wider">
            OPTIMISER
          </span>
        </button>
        <button
          type="button"
          onClick={() => {
            setTab('scenarios');
            setOpen(true);
          }}
          className={`relative group flex flex-col items-center justify-center gap-1 px-2 py-3 rounded-lg transition-all ${
            tab === 'scenarios' && open
              ? 'bg-accent text-white'
              : 'text-text-muted hover:bg-bg-subtle hover:text-text'
          }`}
          title="Mes scénarios"
          aria-label="Mes scénarios"
        >
          <Bookmark className="w-4 h-4" />
          <span className="text-[10px] font-medium [writing-mode:vertical-rl] rotate-180 tracking-wider">
            SCÉNARIOS
          </span>
          {scenariosCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-semibold flex items-center justify-center">
              {scenariosCount}
            </span>
          )}
        </button>
      </div>

      {/* Sliding panel */}
      <div
        className={`overflow-hidden transition-[width,opacity] duration-300 ease-out
          ${open ? 'w-[400px] opacity-100' : 'w-0 opacity-0'}`}
      >
        <div className="h-full overflow-y-auto p-3 bg-bg-surface border border-l-0 border-border rounded-r-xl shadow-[0_8px_24px_-12px_rgba(15,22,35,0.15)]">
          <div className="flex items-center justify-between mb-3 px-1">
            <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
              {tab === 'optimizer' ? 'Optimisation' : 'Scénarios sauvegardés'}
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-text-subtle hover:text-text"
              aria-label="Replier"
            >
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          </div>
          {tab === 'optimizer' ? <OptimizerPanel /> : <ScenariosManager />}
        </div>
      </div>
    </div>
  );
}
