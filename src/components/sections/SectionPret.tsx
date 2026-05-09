import { useCallback } from 'react';
import { Banknote, GraduationCap } from 'lucide-react';
import { Slider } from '@/components/ui/Slider';
import { Toggle } from '@/components/ui/Toggle';
import { NumberField } from '@/components/ui/NumberField';
import { InfoPopover } from '@/components/ui/InfoPopover';
import { useSimulationStore, getCommune } from '@/store/useSimulationStore';
import { useSimulationResults } from '@/hooks/useSimulationResults';
import { TAUX_INDICATIFS } from '@/calculators/constants';
import { formatEuro } from '@/utils/format';
import { estEligiblePTZ } from '@/calculators/ptz';

const DUREES = [10, 15, 20, 25] as const;
const formatTaux = (v: number) => `${v.toFixed(2)} %`;
const formatTauxAnnuel = (v: number) => `${v.toFixed(2)} % / an`;
const formatAns = (v: number) => `${v} ans`;
const formatPourcentBrs = (v: number) => `${v} %`;

export function SectionPret() {
  const utilisateur = useSimulationStore((s) => s.utilisateur);
  const setUtilisateur = useSimulationStore((s) => s.setUtilisateur);
  const pret = useSimulationStore((s) => s.pret);
  const setPret = useSimulationStore((s) => s.setPret);
  const setDuree = useSimulationStore((s) => s.setDuree);
  const bien = useSimulationStore((s) => s.bien);
  const commune = getCommune(bien.commune);
  const { ptzMax } = useSimulationResults();
  const eligiblePTZZone = estEligiblePTZ(bien.type_bien, commune.zone_ptz);
  const eligiblePTZ = eligiblePTZZone && utilisateur.primo_accedant;

  const onPrimoAccedant = useCallback(
    (v: boolean) => setUtilisateur({ primo_accedant: v }),
    [setUtilisateur]
  );
  const onTaux = useCallback((v: number) => setPret({ taux_annuel: v }), [setPret]);
  const onTauxAssurance = useCallback(
    (v: number) => setPret({ taux_assurance_annuel: v / 100 }),
    [setPret]
  );
  const onPtzActif = useCallback((v: boolean) => setPret({ ptz_actif: v }), [setPret]);
  const onPtzDiffere = useCallback(
    (v: number) => setPret({ ptz_duree_differe_annees: v }),
    [setPret]
  );
  const onPtzDuree = useCallback(
    (v: number) => setPret({ ptz_duree_remboursement_annees: v }),
    [setPret]
  );

  return (
    <div className="space-y-5">
        {/* Toggle Primo-accédant + popover info */}
        <div className="p-3 rounded-lg bg-accent/5 border border-accent/30">
          <div className="flex items-center justify-between gap-2 mb-1">
            <Toggle
              label="Je suis primo-accédant"
              value={utilisateur.primo_accedant}
              onChange={onPrimoAccedant}
              tooltip="Pas propriétaire de votre résidence principale dans les 2 dernières années."
            />
            <InfoPopover
              title="Primo-accédant — aides & conditions"
              trigger={
                <>
                  <GraduationCap className="w-3.5 h-3.5" />
                  Détails
                </>
              }
            >
              <p>
                <strong className="text-text">Qui est primo-accédant ?</strong> Vous n'avez pas été
                propriétaire de votre résidence principale au cours des{' '}
                <strong>2 dernières années</strong>. Le bien acheté doit devenir votre{' '}
                <strong>résidence principale</strong> dans l'année et le rester au moins{' '}
                <strong>6 ans</strong>.
              </p>

              <div>
                <strong className="text-text">Aides cumulables</strong>
                <ul className="mt-1.5 space-y-1.5 list-none">
                  <li>
                    <strong>PTZ</strong> — Prêt à Taux Zéro, neuf en zones tendues A/Abis/B1 ou
                    ancien avec gros travaux en B2/C. Plafonds revenus selon foyer (≈ 37 000 €/an
                    couple sans enfant en B1). Quotité jusqu'à 40 % du prix d'opération, durée
                    25 ans avec différé jusqu'à 15 ans.
                  </li>
                  <li>
                    <strong>PAS</strong> — Prêt à l'Accession Sociale, taux préférentiel + frais de
                    notaire réduits. Plafonds revenus identiques au PTZ.
                  </li>
                  <li>
                    <strong>Action Logement (1 % patronal)</strong> — Si employeur ≥ 10 salariés non
                    agricole, jusqu'à <strong>30 000 €</strong> à 1,5 % sur 25 ans.
                  </li>
                  <li>
                    <strong>PEL / CEL</strong> — Plan Épargne Logement → prêt à taux préférentiel
                    selon date d'ouverture du plan + prime d'État.
                  </li>
                  <li>
                    <strong>BRS</strong> — Bail Réel Solidaire, dissociation foncier/bâti, prix
                    réduit jusqu'à <strong>−50 %</strong>. Conditions revenus + résidence principale
                    6 ans minimum. Vérifier auprès de la CASA / Métropole Nice Côte d'Azur.
                  </li>
                  <li>
                    <strong>TVA 5,5 %</strong> au lieu de 20 % — Neuf dans une zone ANRU + plafonds
                    revenus PSLA. Marginal autour de Sophia.
                  </li>
                  <li>
                    <strong>Aides locales</strong> — Région PACA, CASA, mairie. À demander en
                    mairie.
                  </li>
                </ul>
              </div>

              <div>
                <strong className="text-text">À retenir pour Sophia / B1</strong>
                <ul className="mt-1.5 space-y-1 list-none">
                  <li>· PTZ neuf possible jusqu'à 40 % de l'opération plafonnée</li>
                  <li>· Frais notaire réduits (2,5 % vs 7,5 %) sur le neuf</li>
                  <li>· Cumul PTZ + PAS + Action Logement très efficace</li>
                </ul>
              </div>

              <p className="text-text-subtle italic pt-1 border-t border-border-subtle">
                Barèmes 2025 indicatifs — vérifier sur service-public.fr et auprès d'un courtier.
              </p>
            </InfoPopover>
          </div>
          {!utilisateur.primo_accedant && (
            <div className="text-xs text-text-subtle mt-1">
              Le PTZ et les aides primo-accédants sont désactivés.
            </div>
          )}
        </div>

        <div>
          <div className="field-label">
            <span>Durée du prêt</span>
            <span className="field-value text-accent">{pret.duree_annees} ans</span>
          </div>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label="Durée du prêt">
            {DUREES.map((d) => {
              const isActive = pret.duree_annees === d;
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuree(d)}
                  aria-pressed={isActive}
                  aria-label={`Durée ${d} ans, taux indicatif ${TAUX_INDICATIFS[d]}%`}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-all
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40
                    ${
                      isActive
                        ? 'bg-accent text-white border-accent shadow-[0_2px_8px_-2px_rgba(59,111,224,0.5)]'
                        : 'bg-white text-text-muted border-border hover:border-accent/50 hover:text-text'
                    }`}
                >
                  <div className="font-semibold">{d} ans</div>
                  <div className={`text-xs mt-0.5 ${isActive ? 'text-white/80' : 'text-text-subtle'}`}>
                    {TAUX_INDICATIFS[d]}%
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-2 text-xs text-text-subtle">
            Le taux indicatif s'ajuste automatiquement à la durée choisie.
          </div>
        </div>

        <Slider
          label="Taux annuel"
          value={pret.taux_annuel}
          onChange={onTaux}
          min={1.0}
          max={5.0}
          step={0.05}
          format={formatTaux}
          tooltip="Taux nominal annuel hors assurance. Préréglé selon la durée mais ajustable."
        />

        <Slider
          label="Taux assurance emprunteur (annuel)"
          value={pret.taux_assurance_annuel * 100}
          onChange={onTauxAssurance}
          min={0.1}
          max={0.6}
          step={0.01}
          format={formatTauxAnnuel}
          tooltip="Taux annuel appliqué au capital initial. Mensualité = capital × taux / 12. 0,25 % = moyenne marché jeune primo-accédant. Délégation autorisée (loi Lemoine 2022)."
        />

        <div className="border-t border-border-subtle pt-4 space-y-3">
          <Toggle
            label="Activer le PTZ"
            value={pret.ptz_actif}
            onChange={onPtzActif}
            tooltip="Prêt à Taux Zéro — réservé aux primo-accédants, neuf en zone tendue (A, Abis, B1)."
          />

          {!utilisateur.primo_accedant && pret.ptz_actif && (
            <div className="chip-warning text-xs">
              PTZ réservé aux primo-accédants
            </div>
          )}
          {utilisateur.primo_accedant && !eligiblePTZZone && pret.ptz_actif && (
            <div className="chip-warning text-xs">
              Bien non éligible PTZ ({bien.type_bien}, zone {commune.zone_ptz})
            </div>
          )}
          {eligiblePTZ && (
            <div className="chip-info text-xs">
              PTZ max théorique : {formatEuro(ptzMax)}
            </div>
          )}

          {pret.ptz_actif && eligiblePTZ && (
            <>
              <Slider
                label="Différé PTZ"
                value={pret.ptz_duree_differe_annees}
                onChange={onPtzDiffere}
                min={0}
                max={15}
                step={1}
                format={formatAns}
                tooltip="Période sans paiement du PTZ. Tranche 2 (RFR ~25-31k €) : 8 ans typique."
              />
              <Slider
                label="Durée totale PTZ"
                value={pret.ptz_duree_remboursement_annees}
                onChange={onPtzDuree}
                min={Math.max(pret.ptz_duree_differe_annees + 5, 15)}
                max={25}
                step={1}
                format={formatAns}
                tooltip="Durée totale (différé inclus). Tranche 2 : 22 ans typique."
              />
            </>
          )}
        </div>

        {/* AIDES CUMULABLES */}
        {utilisateur.primo_accedant && <AidesPanel />}
    </div>
  );
}

export const SectionPretIcon = Banknote;

// ---- Sous-composant : Aides cumulables (PAS / PEL / CEL / Action Logement / BRS) ----
function AidesPanel() {
  const pret = useSimulationStore((s) => s.pret);
  const setPret = useSimulationStore((s) => s.setPret);

  const onPas = useCallback((v: boolean) => setPret({ pas_actif: v }), [setPret]);
  const onPel = useCallback((v: boolean) => setPret({ pel_actif: v }), [setPret]);
  const onPelMontant = useCallback((v: number) => setPret({ pel_montant: v }), [setPret]);
  const onPelTaux = useCallback((v: number) => setPret({ pel_taux: v }), [setPret]);
  const onCel = useCallback((v: boolean) => setPret({ cel_actif: v }), [setPret]);
  const onCelMontant = useCallback((v: number) => setPret({ cel_montant: v }), [setPret]);
  const onCelTaux = useCallback((v: number) => setPret({ cel_taux: v }), [setPret]);
  const onAL = useCallback((v: boolean) => setPret({ action_logement_actif: v }), [setPret]);
  const onALMontant = useCallback(
    (v: number) => setPret({ action_logement_montant: v }),
    [setPret]
  );
  const onBrs = useCallback((v: boolean) => setPret({ brs_actif: v }), [setPret]);
  const onBrsDecote = useCallback(
    (v: number) => setPret({ brs_decote_pourcent: v }),
    [setPret]
  );

  return (
    <div className="border-t border-border-subtle pt-4 space-y-4">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Aides cumulables
      </div>

      {/* PAS */}
      <div className="p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle space-y-2">
        <Toggle
          label="PAS · Prêt à l'Accession Sociale"
          value={pret.pas_actif}
          onChange={onPas}
          tooltip="Plafonds RFR ~25 k€/an (B1, 1 pers). Réduit les frais d'hypothèque (~0.4 % du prix)."
        />
      </div>

      {/* PEL */}
      <div className="p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle space-y-2">
        <Toggle
          label="PEL · Plan Épargne Logement"
          value={pret.pel_actif}
          onChange={onPel}
          tooltip="Phase d'épargne min 4 ans. Plafond prêt 92 000 € sur 15 ans à taux préférentiel (~2.2 %)."
        />
        {pret.pel_actif && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
            <NumberField
              label="Capital PEL"
              value={pret.pel_montant}
              onChange={onPelMontant}
              suffix="€"
              step={1000}
            />
            <NumberField
              label="Taux PEL"
              value={pret.pel_taux}
              onChange={onPelTaux}
              suffix="%"
              step={0.1}
            />
          </div>
        )}
      </div>

      {/* CEL */}
      <div className="p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle space-y-2">
        <Toggle
          label="CEL · Compte Épargne Logement"
          value={pret.cel_actif}
          onChange={onCel}
          tooltip="Phase d'épargne min 18 mois. Plafond prêt 23 000 € sur 15 ans (~2.0 %)."
        />
        {pret.cel_actif && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle">
            <NumberField
              label="Capital CEL"
              value={pret.cel_montant}
              onChange={onCelMontant}
              suffix="€"
              step={500}
            />
            <NumberField
              label="Taux CEL"
              value={pret.cel_taux}
              onChange={onCelTaux}
              suffix="%"
              step={0.1}
            />
          </div>
        )}
      </div>

      {/* Action Logement */}
      <div className="p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle space-y-2">
        <Toggle
          label="Action Logement (1 % patronal)"
          value={pret.action_logement_actif}
          onChange={onAL}
          tooltip="Si employeur ≥ 10 salariés (hors agricole). Jusqu'à 30 000 € à 1.5 % sur 25 ans."
        />
        {pret.action_logement_actif && (
          <div className="pt-2 border-t border-border-subtle">
            <NumberField
              label="Montant Action Logement"
              value={pret.action_logement_montant}
              onChange={onALMontant}
              suffix="€"
              step={1000}
            />
          </div>
        )}
      </div>

      {/* BRS */}
      <div className="p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle space-y-2">
        <Toggle
          label="BRS · Bail Réel Solidaire"
          value={pret.brs_actif}
          onChange={onBrs}
          tooltip="Décote 30-50 % sur le prix (vous achetez le bâti, foncier en bail). Sophia : CASA Habitat / COL Côte d'Azur. Redevance ~3,5 €/m²/mois."
        />
        {pret.brs_actif && (
          <div className="pt-2 border-t border-border-subtle">
            <Slider
              label="Décote BRS sur le prix"
              value={pret.brs_decote_pourcent}
              onChange={onBrsDecote}
              min={20}
              max={55}
              step={5}
              format={formatPourcentBrs}
            />
          </div>
        )}
      </div>
    </div>
  );
}
