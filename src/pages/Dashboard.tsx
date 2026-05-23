import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { Building2, GitCompare, Github } from 'lucide-react';
import { CollapsibleCard } from '@/components/ui/CollapsibleCard';
import {
  SectionUtilisateur,
  SectionUtilisateurIcon,
} from '@/components/sections/SectionUtilisateur';
import { SectionBien, SectionBienIcon } from '@/components/sections/SectionBien';
import { SectionPret, SectionPretIcon } from '@/components/sections/SectionPret';
import { SectionCharges, SectionChargesIcon } from '@/components/sections/SectionCharges';
import { SectionResultats } from '@/components/sections/SectionResultats';
import { SectionIndicateurs } from '@/components/sections/SectionIndicateurs';
import { ExportBar } from '@/components/ExportBar';
import { SideRail } from '@/components/SideRail';
import { useSimulationStore, getCommune } from '@/store/useSimulationStore';

const ChartCoutTotal = lazy(() =>
  import('@/components/charts/ChartCoutTotal').then((m) => ({ default: m.ChartCoutTotal }))
);
const ChartAmortissement = lazy(() =>
  import('@/components/charts/ChartAmortissement').then((m) => ({ default: m.ChartAmortissement }))
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

const ICON_CLS = 'w-4 h-4 text-accent';

export function Dashboard() {
  const bien = useSimulationStore((s) => s.bien);
  const commune = getCommune(bien.commune);

  return (
    <div className="min-h-screen pb-12 overflow-x-hidden">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50
                   focus:bg-white focus:text-text focus:border focus:border-accent
                   focus:rounded-lg focus:px-3 focus:py-2 focus:shadow-lg focus:outline-none"
      >
        Aller au contenu principal
      </a>
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
            <Link
              to="/compare/neuf-vs-ancien"
              className="btn-secondary"
              title="Ouvre le comparateur (Cmd/Ctrl + clic pour un nouvel onglet)"
            >
              <GitCompare className="w-4 h-4" aria-hidden="true" />
              Comparer Neuf vs Ancien
            </Link>
            <ExportBar />
            <a
              href="https://github.com"
              className="btn-ghost"
              title="Code source"
              aria-label="Code source (GitHub)"
              target="_blank"
              rel="noreferrer"
            >
              <Github className="w-4 h-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-[1600px] mx-auto px-6 py-6 pr-16">
        <div className="grid grid-cols-12 gap-5">
          {/* Colonne gauche : paramètres collapsibles */}
          <div className="col-span-12 xl:col-span-5 space-y-3">
            <CollapsibleCard
              title="Profil financier"
              icon={<SectionUtilisateurIcon className={ICON_CLS} />}
            >
              <SectionUtilisateur />
            </CollapsibleCard>

            <CollapsibleCard
              title="Le bien"
              icon={<SectionBienIcon className={ICON_CLS} />}
            >
              <SectionBien />
            </CollapsibleCard>

            <CollapsibleCard
              title="Le prêt"
              icon={<SectionPretIcon className={ICON_CLS} />}
            >
              <SectionPret />
            </CollapsibleCard>

            <CollapsibleCard
              title="Charges"
              icon={<SectionChargesIcon className={ICON_CLS} />}
            >
              <SectionCharges />
            </CollapsibleCard>
          </div>

          {/* Colonne droite : résultats + graphes + indicateurs */}
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
            <SectionIndicateurs />
          </div>
        </div>

        <footer className="mt-10 text-center text-xs text-text-subtle">
          Simulation indicative — frais de notaire 7,5 %/2,5 % · taux marché 2025-2026 · PTZ neuf zones tendues.
          <br />
          Vérifier les conditions exactes auprès d'un courtier ou d'une banque.
        </footer>
      </main>

      <SideRail />
    </div>
  );
}
