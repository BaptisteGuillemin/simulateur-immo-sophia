import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react';
import { useSimulationStore, getCommune } from '@/store/useSimulationStore';
import { trouverScenarioOptimal, type CritereOptimisation, type ScenarioOptimal } from '@/calculators/optimizer';
import { Select } from '@/components/ui/Select';
import { NumberField } from '@/components/ui/NumberField';
import { formatEuro, formatPercent } from '@/utils/format';

const CRITERES: { value: CritereOptimisation; label: string }[] = [
  { value: 'cout_total', label: 'Coût total minimal' },
  { value: 'interets_min', label: 'Intérêts minimaux' },
  { value: 'mensualite_cible', label: 'Atteindre une mensualité cible' },
  { value: 'compromis_ptz', label: 'Meilleur compromis PTZ / coût / mensualité' },
];

export function OptimizerPanel() {
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const bien = useSimulationStore((s) => s.bien);
  const pret = useSimulationStore((s) => s.pret);
  const applyAll = useSimulationStore((s) => s.applyAll);
  const commune = getCommune(bien.commune);

  const [critere, setCritere] = useState<CritereOptimisation>('compromis_ptz');
  const [mensualiteCible, setMensualiteCible] = useState(800);
  const [resultat, setResultat] = useState<ScenarioOptimal | null>(null);

  const optimiser = () => {
    const r = trouverScenarioOptimal(utilisateur, bien, pret, commune, critere, mensualiteCible);
    setResultat(r);
  };

  const appliquer = () => {
    if (!resultat) return;
    applyAll(resultat.utilisateur, resultat.bien, resultat.pret);
    setResultat(null);
  };

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <Sparkles className="w-4 h-4 text-accent" />
        Simulation automatique
      </h3>

      <div className="space-y-3">
        <Select
          label="Critère d'optimisation"
          value={critere}
          onChange={(v) => setCritere(v as CritereOptimisation)}
          options={CRITERES}
          tooltip="L'algorithme explore les durées (10/15/20/25 ans) et l'usage du PTZ pour trouver l'optimum."
        />

        {critere === 'mensualite_cible' && (
          <NumberField
            label="Mensualité cible"
            value={mensualiteCible}
            onChange={setMensualiteCible}
            suffix="€/mois"
            step={50}
          />
        )}

        <button className="btn-primary w-full" onClick={optimiser}>
          <Wand2 className="w-4 h-4" />
          Trouver le scénario optimal
        </button>

        {resultat && (
          <div className="p-3 rounded-lg bg-accent/10 border border-accent/30 space-y-2 animate-fade-in">
            <div className="text-sm font-medium text-text">{resultat.description}</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="text-text-subtle">Mensualité</div>
              <div className="text-right font-mono">{formatEuro(resultat.resultats.mensualite_totale)}</div>
              <div className="text-text-subtle">Intérêts totaux</div>
              <div className="text-right font-mono">{formatEuro(resultat.resultats.interets_totaux)}</div>
              <div className="text-text-subtle">PTZ</div>
              <div className="text-right font-mono">{formatEuro(resultat.resultats.ptz_montant)}</div>
              <div className="text-text-subtle">Endettement</div>
              <div className="text-right font-mono">{formatPercent(resultat.resultats.taux_endettement)}</div>
            </div>
            <button className="btn-secondary w-full mt-2" onClick={appliquer}>
              Appliquer ce scénario
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
