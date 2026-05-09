import { memo, useCallback } from 'react';
import { Receipt } from 'lucide-react';
import { NumberField } from '@/components/ui/NumberField';
import { Toggle } from '@/components/ui/Toggle';
import { Slider } from '@/components/ui/Slider';
import { useSimulationStore } from '@/store/useSimulationStore';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { formatEuro, formatPercent } from '@/utils/format';
import { FRAIS_NOTAIRE } from '@/calculators/constants';

const formatPourcent = (v: number) => `${v} %`;

export function SectionCharges() {
  const bien = useSimulationStore((s) => s.bien);
  const setBien = useSimulationStore((s) => s.setBien);
  const { resultats, commune } = useSimulationResults();

  const tauxNotaire = bien.type_bien === 'neuf' ? FRAIS_NOTAIRE.neuf : FRAIS_NOTAIRE.ancien;

  const onAssurance = useCallback(
    (v: number) => setBien({ assurance_habitation_annuelle: Math.max(0, v) }),
    [setBien]
  );
  const onFondsTravaux = useCallback(
    (v: number) => setBien({ fonds_travaux_annuel: Math.max(0, v) }),
    [setBien]
  );
  const onChargesCoproActif = useCallback(
    (v: boolean) => setBien({ charges_copro_perso_actif: v }),
    [setBien]
  );
  const onChargesCoproMontant = useCallback(
    (v: number) => setBien({ charges_copro_perso_annuelles: Math.max(0, v) }),
    [setBien]
  );
  const onFraisAgenceActif = useCallback(
    (v: boolean) => setBien({ frais_agence_actif: v }),
    [setBien]
  );
  const onFraisAgencePourcent = useCallback(
    (v: number) => setBien({ frais_agence_pourcent: v }),
    [setBien]
  );

  return (
    <div className="space-y-4">
      {/* FRAIS DE NOTAIRE — display block */}
      <div
        className={`p-3 rounded-lg border ${
          bien.type_bien === 'neuf'
            ? 'bg-success/5 border-success/25'
            : 'bg-bg-subtle/60 border-border-subtle'
        }`}
      >
        <div className="flex items-center gap-2 mb-2">
          <Receipt
            aria-hidden="true"
            className={`w-4 h-4 ${bien.type_bien === 'neuf' ? 'text-success' : 'text-text-muted'}`}
          />
          <div className="flex-1">
            <div className="text-xs text-text-subtle uppercase tracking-wider">Frais de notaire</div>
            <div className="text-sm text-text font-medium">
              {bien.type_bien === 'neuf' ? 'Bien neuf — frais réduits' : 'Bien ancien — frais classiques'}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-subtle">
          <div>
            <div className="text-xs text-text-subtle">Taux appliqué</div>
            <div className="text-base font-mono font-semibold text-text">
              {formatPercent(tauxNotaire * 100, 1)}
            </div>
          </div>
          <div>
            <div className="text-xs text-text-subtle">Montant estimé</div>
            <div
              className={`text-base font-mono font-semibold ${
                bien.type_bien === 'neuf' ? 'text-success' : 'text-text'
              }`}
            >
              {formatEuro(resultats.frais_notaire)}
            </div>
          </div>
        </div>
        {bien.type_bien === 'ancien' && (
          <div className="mt-2 text-xs text-text-subtle">
            💡 Passer en neuf économiserait{' '}
            <span className="text-success font-medium">
              {formatEuro(resultats.prix_bien * (FRAIS_NOTAIRE.ancien - FRAIS_NOTAIRE.neuf))}
            </span>{' '}
            de frais de notaire.
          </div>
        )}
      </div>

      {/* FRAIS D'AGENCE */}
      <div className="space-y-2">
        <Toggle
          label="Frais d'agence"
          value={bien.frais_agence_actif}
          onChange={onFraisAgenceActif}
          tooltip="Activer si l'achat passe par une agence (souvent absent dans le neuf en VEFA)."
        />
        {bien.frais_agence_actif && (
          <Slider
            label="% frais d'agence"
            value={bien.frais_agence_pourcent}
            onChange={onFraisAgencePourcent}
            min={0}
            max={8}
            step={0.5}
            format={formatPourcent}
            tooltip="Souvent 4-7 % du prix net vendeur."
          />
        )}
      </div>

      {/* CHARGES COPRO */}
      <div className="space-y-2">
        <Toggle
          label="Charges copro perso"
          value={bien.charges_copro_perso_actif}
          onChange={onChargesCoproActif}
          tooltip={`Activer pour saisir les charges réelles. Sinon : moyenne ${commune.commune} (${formatEuro(commune.charges_copro_annuelles_moyennes)}/an = ${formatEuro(Math.round(commune.charges_copro_annuelles_moyennes / 12))}/mois).`}
        />
        {bien.charges_copro_perso_actif && (
          <NumberField
            label={`Charges copro annuelles (≈ ${formatEuro(Math.round(bien.charges_copro_perso_annuelles / 12))}/mois)`}
            value={bien.charges_copro_perso_annuelles}
            onChange={onChargesCoproMontant}
            suffix="€/an"
            step={50}
            tooltip="Voir les comptes prévisionnels de la copro lors d'un compromis. T2/T3 standard avec ascenseur : 1500-2400 €/an."
          />
        )}
      </div>

      {/* ASSURANCE HABITATION + FONDS TRAVAUX */}
      <div className="grid grid-cols-2 gap-3">
        <NumberField
          label="Assurance habitation"
          value={bien.assurance_habitation_annuelle}
          onChange={onAssurance}
          suffix="€/an"
          step={20}
          tooltip="MRH propriétaire occupant. ~250-350 €/an pour un T2/T3 standard."
        />
        <NumberField
          label="Fonds travaux ALUR"
          value={bien.fonds_travaux_annuel}
          onChange={onFondsTravaux}
          suffix="€/an"
          step={50}
          tooltip="Loi ALUR : provision obligatoire ≥ 5 % du budget annuel charges (copropriétés > 10 lots, sauf neuf < 5 ans)."
        />
      </div>

      {/* RÉCAP CHARGES MENSUELLES */}
      <div className="p-3 rounded-lg bg-bg-subtle/60 border border-border-subtle">
        <div className="text-xs text-text-subtle uppercase tracking-wider mb-2">
          Charges mensuelles totales · {commune.commune}
        </div>
        <div className="space-y-1.5 text-xs">
          <Row
            label="Taxe foncière"
            value={resultats.charge_taxe_fonciere_mensuelle}
            hint={`${formatEuro(commune.taxe_fonciere_moyenne)}/an (TEOM incluse)`}
          />
          <Row
            label="Charges copropriété"
            value={resultats.charge_copro_mensuelle}
            hint={
              bien.charges_copro_perso_actif
                ? `${formatEuro(bien.charges_copro_perso_annuelles)}/an (perso)`
                : `${formatEuro(commune.charges_copro_annuelles_moyennes)}/an (moyenne ${commune.commune})`
            }
          />
          <Row
            label="Assurance habitation"
            value={resultats.charge_assurance_habitation_mensuelle}
            hint={`${formatEuro(bien.assurance_habitation_annuelle)}/an`}
          />
          {bien.fonds_travaux_annuel > 0 && (
            <Row
              label="Fonds travaux ALUR"
              value={resultats.charge_fonds_travaux_mensuelle}
              hint={`${formatEuro(bien.fonds_travaux_annuel)}/an`}
            />
          )}
        </div>
        <div className="mt-2 pt-2 border-t border-border-subtle flex items-center justify-between">
          <span className="text-xs font-medium text-text">Total / mois</span>
          <span className="font-mono text-sm font-semibold text-accent">
            {formatEuro(resultats.charges_mensuelles_proprietaire)}
          </span>
        </div>
        <div className="mt-1 text-xs text-text-subtle">
          Taxe d'habitation supprimée pour la résidence principale depuis 2023.
        </div>
      </div>
    </div>
  );
}

export const SectionChargesIcon = Receipt;

const Row = memo(function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint?: string;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-text-muted">{label}</span>
        {hint && <span className="text-text-subtle ml-1.5">· {hint}</span>}
      </div>
      <span className="font-mono text-text tabular-nums">{value} €</span>
    </div>
  );
});
