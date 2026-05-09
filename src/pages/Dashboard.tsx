import { lazy, Suspense } from 'react';
import { Building2, Github } from 'lucide-react';
import { SectionUtilisateur } from '@/components/sections/SectionUtilisateur';
import { SectionBien } from '@/components/sections/SectionBien';
import { SectionPret } from '@/components/sections/SectionPret';
import { SectionCharges } from '@/components/sections/SectionCharges';
import { SectionResultats } from '@/components/sections/SectionResultats';
import { ExportBar } from '@/components/ExportBar';
import { SideRail } from '@/components/SideRail';
import { useSimulationStore, getCommune } from '@/store/useSimulationStore';

const ChartCoutTotal = lazy(() =>
  import('@/components/charts/ChartCoutTotal').then((m) => ({ default: m.ChartCoutTotal }))
);
const ChartAmortissement = lazy(() =>
  import('@/components/charts/ChartAmortissement').then((m) => ({ default: m.ChartAmortissement }))
);
const ChartComparaison = lazy(() =>
  import('@/components/charts/ChartComparaison').then((m) => ({ default: m.ChartComparaison }))
);
const ChartPaliers = lazy(() =>
  import('@/components/charts/ChartPaliers').then((m) => ({ default: m.ChartPaliers }))
);

function ChartSkeleton() {
  return (
    <div className="card animate-pulse">
      <div className="h-4 w-48 bg-bg-subtle rounded mb-4" />
      <div className="h-80 bg-bg-subtle/60 rounded" />
    </div>
  );
}

export function Dashboard() {
  const bien = useSimulationStore((s) => s.bien);
  const commune = getCommune(bien.commune);

  return (
    <div className="min-h-screen pb-12">
      {/* Top bar */}
      <header className="sticky top-0 z-20 backdrop-blur-md bg-bg/70 border-b border-border-subtle">
        <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-text leading-tight">
                Simulateur Immo · Sophia Antipolis
              </h1>
              <p className="text-xs text-text-subtle">
                Primo-accédant · {commune.commune} · zone PTZ {commune.zone_ptz}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <ExportBar />
            <a
              href="https://github.com"
              className="btn-ghost"
              title="Code source"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="w-4 h-4" />
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-6 pr-16">
        <div className="grid grid-cols-12 gap-5">
          {/* Colonne gauche : paramètres */}
          <div className="col-span-12 xl:col-span-5 space-y-5">
            <SectionUtilisateur />
            <SectionBien />
            <SectionPret />
            <SectionCharges />
          </div>

          {/* Colonne droite : résultats + graphes */}
          <div className="col-span-12 xl:col-span-7 space-y-5">
            <SectionResultats />
            <Suspense fallback={<ChartSkeleton />}>
              <ChartPaliers />
            </Suspense>
            <Suspense fallback={<ChartSkeleton />}>
              <ChartCoutTotal />
            </Suspense>
            <Suspense fallback={<ChartSkeleton />}>
              <ChartAmortissement />
            </Suspense>
            <Suspense fallback={<ChartSkeleton />}>
              <ChartComparaison />
            </Suspense>
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-text-subtle">
          Simulation indicative — frais de notaire 7,5 %/2,5 % · taux marché 2025-2026 · PTZ neuf zones tendues.
          <br />
          Vérifier les conditions exactes auprès d'un courtier ou d'une banque.
        </footer>
      </main>

      {/* Side rail : optimizer + scénarios (hover to expand) */}
      <SideRail />
    </div>
  );
}
