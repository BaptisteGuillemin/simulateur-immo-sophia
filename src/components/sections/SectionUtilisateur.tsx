import { useCallback } from 'react';
import { Wallet } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { useSimulationStore } from '@/store/useSimulationStore';
import { formatEuro } from '@/utils/format';

const formatEuroValue = (v: number) => formatEuro(v);

export function SectionUtilisateur() {
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const setUtilisateur = useSimulationStore((s) => s.setUtilisateur);

  const onSalaire = useCallback(
    (v: number) => setUtilisateur({ salaire_net_mensuel: v }),
    [setUtilisateur]
  );
  const onApport = useCallback(
    (v: number) => setUtilisateur({ apport: v }),
    [setUtilisateur]
  );
  const onEpargne = useCallback(
    (v: number) => setUtilisateur({ epargne_restante_cible: v }),
    [setUtilisateur]
  );

  return (
    <div className="card animate-slide-up">
      <h3 className="card-title">
        <Wallet className="w-4 h-4 text-accent" />
        Profil financier
      </h3>
      <div className="space-y-5">
        <Slider
          label="Salaire net mensuel"
          value={utilisateur.salaire_net_mensuel}
          onChange={onSalaire}
          min={1500}
          max={10000}
          step={50}
          format={formatEuroValue}
          tooltip="Salaire net après impôts. Si couple, additionnez les deux."
        />
        <Slider
          label="Apport personnel"
          value={utilisateur.apport}
          onChange={onApport}
          min={0}
          max={300000}
          step={1000}
          format={formatEuroValue}
          tooltip="Cash disponible pour l'achat (livret A, PEL, donation...). 10% minimum recommandé pour couvrir les frais."
        />
        <Slider
          label="Épargne restante cible"
          value={utilisateur.epargne_restante_cible}
          onChange={onEpargne}
          min={0}
          max={50000}
          step={500}
          format={formatEuroValue}
          tooltip="Combien vous voulez garder de côté après l'achat (matelas de sécurité)."
        />
      </div>
    </div>
  );
}
