import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building2,
  GitCompare,
  Sparkles,
  Wrench,
  CheckCircle2,
  XCircle,
  TrendingDown,
  TrendingUp,
  Minus,
} from 'lucide-react';
import { useSimulationStore, getCommune, getCommunes } from '@/store/useSimulationStore';
import { simuler, suggererPrixBien } from '@/calculators/simulation';
import { estEligiblePTZ } from '@/calculators/ptz';
import { AIDES_DEFAULTS, MOIS_PAR_AN, TAUX_INDICATIFS } from '@/calculators/constants';
import { formatEuro, formatPercent } from '@/utils/format';
import { Toggle } from '@/components/ui/Toggle';
import { NumberField } from '@/components/ui/NumberField';
import { Select } from '@/components/ui/Select';
import { Tooltip } from '@/components/ui/Tooltip';
import { FormulaTip } from '@/components/ui/FormulaTip';
import type { ParametresBien, ParametresPret, ParametresUtilisateur, Resultats, TypeBien } from '@/types';

// ---------------------------------------------------------------------------
// Eco-PTZ : prêt à 0 % pour rénovation énergétique, plafond 50 000 €/20 ans
// (cumulable avec MaPrimeRénov' et CEE). Réservé à l'ancien.
// ---------------------------------------------------------------------------
const ECO_PTZ_DUREE_ANS = 20;
const ECO_PTZ_PLAFOND = 50_000;
const DUREES = [10, 15, 20, 25] as const;

const COMMUNES_OPTIONS = getCommunes().map((c) => ({
  value: c.commune,
  label: `${c.commune} · ${c.distance_sofia_km} km Sophia`,
}));

interface AidesNeuf {
  ptz: boolean;
  pas: boolean;
  pel: boolean;
  cel: boolean;
  action_logement: boolean;
}
interface AidesAncien {
  pas: boolean;
  pel: boolean;
  cel: boolean;
  action_logement: boolean;
  eco_ptz: boolean;
}

/**
 * Construit un trio (utilisateur, bien, pret) prêt pour `simuler()`, à partir
 * des paramètres partagés du comparateur et du type de scénario.
 */
function buildScenarioInputs(
  shared: SharedParams,
  type_bien: TypeBien,
  prix_bien: number,
  aides: AidesNeuf | AidesAncien
): { utilisateur: ParametresUtilisateur; bien: ParametresBien; pret: ParametresPret } {
  const utilisateur: ParametresUtilisateur = {
    salaire_net_mensuel: shared.salaire,
    apport: shared.apport,
    epargne_restante_cible: 10000,
    primo_accedant: shared.primo_accedant,
  };

  const bien: ParametresBien = {
    commune: shared.commune,
    surface: shared.surface,
    prix_bien,
    type_bien,
    frais_agence_actif: false,
    frais_agence_pourcent: 4,
    loyer_mensuel_potentiel: 0, // hors scope comparateur
    assurance_habitation_annuelle: 280,
    fonds_travaux_annuel: 0,
    charges_copro_perso_actif: false,
    charges_copro_perso_annuelles: 1800,
  };

  const ptzActif = type_bien === 'neuf' && (aides as AidesNeuf).ptz;
  const pret: ParametresPret = {
    duree_annees: shared.duree,
    taux_annuel: TAUX_INDICATIFS[shared.duree] ?? 2.8,
    taux_assurance_annuel: 0.0025,
    ptz_actif: ptzActif,
    ptz_montant: undefined,
    ptz_duree_differe_annees: 8,
    ptz_duree_remboursement_annees: 22,
    pas_actif: aides.pas,
    pel_actif: aides.pel,
    pel_montant: AIDES_DEFAULTS.pel.montant_default,
    pel_taux: AIDES_DEFAULTS.pel.taux_default,
    pel_duree_annees: AIDES_DEFAULTS.pel.duree_annees,
    cel_actif: aides.cel,
    cel_montant: AIDES_DEFAULTS.cel.montant_default,
    cel_taux: AIDES_DEFAULTS.cel.taux_default,
    cel_duree_annees: AIDES_DEFAULTS.cel.duree_annees,
    action_logement_actif: aides.action_logement,
    action_logement_montant: AIDES_DEFAULTS.action_logement.montant_default,
    action_logement_taux: AIDES_DEFAULTS.action_logement.taux_default,
    action_logement_duree_annees: AIDES_DEFAULTS.action_logement.duree_annees,
    brs_actif: false,
    brs_decote_pourcent: 35,
  };

  return { utilisateur, bien, pret };
}

interface SharedParams {
  commune: string;
  surface: number;
  duree: number;
  salaire: number;
  apport: number;
  primo_accedant: boolean;
}

/**
 * Calcule la part « travaux » du scénario ancien.
 * Si Eco-PTZ : le travaux net est financé à 0 % sur 20 ans (prêt séparé).
 * Sinon : le travaux net est ajouté au prix du bien (financé au taux marché).
 */
interface BlocTravaux {
  travaux_net: number;
  finance_via_eco_ptz: boolean;
  prix_bien_effectif: number;
  eco_ptz_capital: number;
  eco_ptz_mensualite: number;
  eco_ptz_cout_total: number;
}
function computeBlocTravaux(
  prixBienBase: number,
  travauxBrut: number,
  subventions: number,
  ecoPtzActif: boolean
): BlocTravaux {
  const travauxNet = Math.max(0, travauxBrut - subventions);
  if (ecoPtzActif && travauxNet > 0) {
    const capital = Math.min(travauxNet, ECO_PTZ_PLAFOND);
    // Eco-PTZ à 0 % → mensualité linéaire
    const mensualite = capital / (ECO_PTZ_DUREE_ANS * MOIS_PAR_AN);
    // Si le travaux dépasse le plafond Eco-PTZ, l'excédent est financé via le prêt principal
    const excedent = Math.max(0, travauxNet - capital);
    return {
      travaux_net: travauxNet,
      finance_via_eco_ptz: true,
      prix_bien_effectif: prixBienBase + excedent,
      eco_ptz_capital: capital,
      eco_ptz_mensualite: mensualite,
      eco_ptz_cout_total: capital, // 0 % d'intérêts
    };
  }
  return {
    travaux_net: travauxNet,
    finance_via_eco_ptz: false,
    prix_bien_effectif: prixBienBase + travauxNet,
    eco_ptz_capital: 0,
    eco_ptz_mensualite: 0,
    eco_ptz_cout_total: 0,
  };
}

export function ComparateurNeufVsAncien() {
  // -----------------------------------------------------------------------
  // Initialisation depuis le store principal (préremplissage)
  // -----------------------------------------------------------------------
  const mainBien = useSimulationStore((s) => s.bien);
  const mainUtilisateur = useSimulationStore((s) => s.utilisateur);
  const mainPret = useSimulationStore((s) => s.pret);

  const [commune, setCommune] = useState(mainBien.commune);
  const [surface, setSurface] = useState(mainBien.surface);
  const [duree, setDuree] = useState(mainPret.duree_annees);
  const [salaire, setSalaire] = useState(mainUtilisateur.salaire_net_mensuel);
  const [apport, setApport] = useState(mainUtilisateur.apport);
  const [primoAccedant, setPrimoAccedant] = useState(mainUtilisateur.primo_accedant);

  // Resolved commune
  const communeObj = useMemo(() => getCommune(commune), [commune]);

  // -----------------------------------------------------------------------
  // Scénario NEUF
  // -----------------------------------------------------------------------
  const [prixNeuf, setPrixNeuf] = useState(() => suggererPrixBien(mainBien.surface, 'neuf', communeObj));
  const [aidesNeuf, setAidesNeuf] = useState<AidesNeuf>({
    ptz: true,
    pas: false,
    pel: false,
    cel: false,
    action_logement: false,
  });

  // -----------------------------------------------------------------------
  // Scénario ANCIEN
  // -----------------------------------------------------------------------
  const [prixAncien, setPrixAncien] = useState(() => suggererPrixBien(mainBien.surface, 'ancien', communeObj));
  const [aidesAncien, setAidesAncien] = useState<AidesAncien>({
    pas: false,
    pel: false,
    cel: false,
    action_logement: false,
    eco_ptz: true,
  });
  const [travauxBrut, setTravauxBrut] = useState(15_000);
  const [subventions, setSubventions] = useState(5_000);

  // Boutons "Recaler sur la moyenne" : re-suggère le prix selon la commune/surface
  const handleResetPrixNeuf = () => setPrixNeuf(suggererPrixBien(surface, 'neuf', communeObj));
  const handleResetPrixAncien = () => setPrixAncien(suggererPrixBien(surface, 'ancien', communeObj));

  // -----------------------------------------------------------------------
  // Calculs
  // -----------------------------------------------------------------------
  const shared: SharedParams = { commune, surface, duree, salaire, apport, primo_accedant: primoAccedant };

  const resNeuf = useMemo(() => {
    const { utilisateur, bien, pret } = buildScenarioInputs(shared, 'neuf', prixNeuf, aidesNeuf);
    return simuler(utilisateur, bien, pret, communeObj);
  }, [shared, prixNeuf, aidesNeuf, communeObj]);

  const blocTravaux = useMemo(
    () => computeBlocTravaux(prixAncien, travauxBrut, subventions, aidesAncien.eco_ptz),
    [prixAncien, travauxBrut, subventions, aidesAncien.eco_ptz]
  );

  const resAncien = useMemo(() => {
    const { utilisateur, bien, pret } = buildScenarioInputs(
      shared,
      'ancien',
      blocTravaux.prix_bien_effectif,
      aidesAncien
    );
    const r = simuler(utilisateur, bien, pret, communeObj);
    // On ajoute l'Eco-PTZ par-dessus (capital + mensualité + coût total)
    return {
      ...r,
      // Surcharge pour intégrer Eco-PTZ
      mensualite_totale: r.mensualite_totale + blocTravaux.eco_ptz_mensualite,
      cout_total_reel: r.cout_total_reel + blocTravaux.eco_ptz_cout_total,
      pic_mensualite_palier: r.pic_mensualite_palier + blocTravaux.eco_ptz_mensualite,
      taux_endettement:
        salaire > 0
          ? ((r.pic_mensualite_palier + blocTravaux.eco_ptz_mensualite) / salaire) * 100
          : 0,
    };
  }, [shared, blocTravaux, aidesAncien, communeObj, salaire]);

  // -----------------------------------------------------------------------
  // Éligibilité PTZ neuf en temps réel
  // -----------------------------------------------------------------------
  const ptzEligibleNeuf = primoAccedant && estEligiblePTZ('neuf', communeObj.zone_ptz);
  const ptzEligibleAncien = primoAccedant && estEligiblePTZ('ancien', communeObj.zone_ptz); // toujours false en B1
  const ecoPtzMontantMax = Math.min(Math.max(0, travauxBrut - subventions), ECO_PTZ_PLAFOND);

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
            <Link
              to="/"
              className="btn-ghost !px-2"
              aria-label="Retour au dashboard"
              title="Retour au dashboard"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-accent" />
            </div>
            <div>
              <h1 className="text-base font-semibold text-text leading-tight">
                Comparer Neuf vs Ancien
              </h1>
              <p className="text-xs text-text-subtle">
                {communeObj.commune} · zone PTZ {communeObj.zone_ptz} ·{' '}
                <Link to="/" className="hover:text-text underline decoration-dotted">
                  retour dashboard
                </Link>
              </p>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="max-w-[1600px] mx-auto px-6 py-6 space-y-5">
        {/* PARAMÈTRES PARTAGÉS */}
        <section className="card">
          <h2 className="card-title">
            <Building2 className="w-4 h-4 text-accent" aria-hidden="true" />
            Paramètres communs
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <Select
              label="Commune"
              value={commune}
              onChange={setCommune}
              options={COMMUNES_OPTIONS}
            />
            <NumberField
              label="Surface"
              value={surface}
              onChange={(v) => setSurface(Math.max(1, v))}
              suffix="m²"
              step={1}
            />
            <NumberField
              label="Salaire net"
              value={salaire}
              onChange={(v) => setSalaire(Math.max(0, v))}
              suffix="€/mois"
              step={50}
            />
            <NumberField
              label="Apport"
              value={apport}
              onChange={(v) => setApport(Math.max(0, v))}
              suffix="€"
              step={1000}
            />
            <div>
              <div className="text-xs font-medium text-text-muted mb-1.5">Durée prêt</div>
              <div className="grid grid-cols-4 gap-1" role="group" aria-label="Durée du prêt">
                {DUREES.map((d) => {
                  const isActive = duree === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setDuree(d)}
                      aria-pressed={isActive}
                      className={`px-1.5 py-1.5 rounded text-xs font-medium border transition ${
                        isActive
                          ? 'bg-accent text-white border-accent'
                          : 'bg-white text-text-muted border-border hover:border-accent/50'
                      }`}
                    >
                      {d}a
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="flex items-end pb-1">
              <Toggle
                label="Primo-accédant"
                value={primoAccedant}
                onChange={setPrimoAccedant}
              />
            </div>
          </div>
        </section>

        {/* DEUX COLONNES NEUF / ANCIEN */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* ============ NEUF ============ */}
          <section className="card border-2 border-accent/30">
            <h2 className="card-title">
              <Sparkles className="w-4 h-4 text-accent" aria-hidden="true" />
              🏢 Neuf
            </h2>

            <NumberField
              label="Prix du bien (FAI)"
              value={prixNeuf}
              onChange={(v) => setPrixNeuf(Math.max(0, v))}
              suffix="€"
              step={1000}
              tooltip={`Prix moyen ${communeObj.commune} neuf : ${formatEuro(communeObj.prix_m2_neuf)}/m² × ${surface} m² = ${formatEuro(suggererPrixBien(surface, 'neuf', communeObj))}`}
            />
            <button
              type="button"
              onClick={handleResetPrixNeuf}
              className="btn-ghost text-xs !py-1 mt-1"
            >
              Caler sur la moyenne marché neuf
            </button>

            <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20 space-y-2">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Aides applicables
              </div>
              <AideRow
                label="PTZ (acquisition)"
                eligible={ptzEligibleNeuf}
                eligibleReason={ptzEligibleNeuf ? 'neuf zone tendue' : 'hors zone tendue ou non-primo'}
                value={aidesNeuf.ptz && ptzEligibleNeuf}
                onChange={(v) => setAidesNeuf({ ...aidesNeuf, ptz: v })}
              />
              <AideRow
                label="PAS (frais hypoth. réduits)"
                eligible
                value={aidesNeuf.pas}
                onChange={(v) => setAidesNeuf({ ...aidesNeuf, pas: v })}
              />
              <AideRow
                label="PEL (capital 30k @ 2,2 %)"
                eligible
                value={aidesNeuf.pel}
                onChange={(v) => setAidesNeuf({ ...aidesNeuf, pel: v })}
              />
              <AideRow
                label="CEL (capital 12k @ 2,0 %)"
                eligible
                value={aidesNeuf.cel}
                onChange={(v) => setAidesNeuf({ ...aidesNeuf, cel: v })}
              />
              <AideRow
                label="Action Logement (30k @ 1,5 %)"
                eligible
                value={aidesNeuf.action_logement}
                onChange={(v) => setAidesNeuf({ ...aidesNeuf, action_logement: v })}
              />
            </div>

            <ScenarioResults resultats={resNeuf} ecoPtzExtra={null} />
          </section>

          {/* ============ ANCIEN ============ */}
          <section className="card border-2 border-warning/30">
            <h2 className="card-title">
              <Wrench className="w-4 h-4 text-warning" aria-hidden="true" />
              🏠 Ancien
            </h2>

            <NumberField
              label="Prix du bien (FAI)"
              value={prixAncien}
              onChange={(v) => setPrixAncien(Math.max(0, v))}
              suffix="€"
              step={1000}
              tooltip={`Prix moyen ${communeObj.commune} ancien : ${formatEuro(communeObj.prix_m2_ancien)}/m² × ${surface} m² = ${formatEuro(suggererPrixBien(surface, 'ancien', communeObj))}`}
            />
            <button
              type="button"
              onClick={handleResetPrixAncien}
              className="btn-ghost text-xs !py-1 mt-1"
            >
              Caler sur la moyenne marché ancien
            </button>

            {/* TRAVAUX */}
            <div className="mt-4 p-3 rounded-lg bg-warning/5 border border-warning/20 space-y-3">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Travaux & aides associées
              </div>
              <div className="grid grid-cols-2 gap-3">
                <NumberField
                  label="Travaux bruts (TTC)"
                  value={travauxBrut}
                  onChange={(v) => setTravauxBrut(Math.max(0, v))}
                  suffix="€"
                  step={500}
                  tooltip="Coût total estimé des travaux de rénovation (énergétique, embellissement, mise aux normes)."
                />
                <NumberField
                  label="Subventions estimées"
                  value={subventions}
                  onChange={(v) => setSubventions(Math.max(0, v))}
                  suffix="€"
                  step={500}
                  tooltip={
                    <FormulaTip
                      description="Aides directes à déduire des travaux bruts pour obtenir le montant net à financer."
                      values={[
                        { label: "MaPrimeRénov'", value: 'selon revenus + geste' },
                        { label: 'CEE (énergie)', value: '~1-5k€ par geste' },
                        { label: 'TVA 5,5 %', value: 'sur travaux énergétiques' },
                        { label: 'Action Logement', value: 'jusqu\'à 20k€ ménages modestes' },
                      ]}
                      footnote="Estimation grossière à affiner avec un conseiller France Rénov'."
                    />
                  }
                />
              </div>
              <div className="text-xs flex items-center justify-between p-2 bg-bg-subtle/60 rounded">
                <span className="text-text-muted">Travaux net à financer</span>
                <span className="font-mono font-semibold text-text">
                  {formatEuro(blocTravaux.travaux_net)}
                </span>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-lg bg-bg-subtle/40 border border-border-subtle space-y-2">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
                Aides applicables
              </div>
              <AideRow
                label="PTZ acquisition"
                eligible={ptzEligibleAncien}
                eligibleReason="ancien : uniquement B2/C avec travaux ≥25 % — Sophia est B1"
                value={false}
                onChange={() => {}}
                disabled
              />
              <AideRow
                label={`Eco-PTZ travaux (0 %, 20 ans, plafond ${formatEuro(ECO_PTZ_PLAFOND)})`}
                eligible={travauxBrut > 0}
                eligibleReason={travauxBrut > 0 ? `finance ${formatEuro(ecoPtzMontantMax)} à 0 %` : 'aucun travaux saisi'}
                value={aidesAncien.eco_ptz}
                onChange={(v) => setAidesAncien({ ...aidesAncien, eco_ptz: v })}
              />
              <AideRow
                label="PAS (frais hypoth. réduits)"
                eligible
                value={aidesAncien.pas}
                onChange={(v) => setAidesAncien({ ...aidesAncien, pas: v })}
              />
              <AideRow
                label="PEL (capital 30k @ 2,2 %)"
                eligible
                value={aidesAncien.pel}
                onChange={(v) => setAidesAncien({ ...aidesAncien, pel: v })}
              />
              <AideRow
                label="CEL (capital 12k @ 2,0 %)"
                eligible
                value={aidesAncien.cel}
                onChange={(v) => setAidesAncien({ ...aidesAncien, cel: v })}
              />
              <AideRow
                label="Action Logement (30k @ 1,5 %)"
                eligible
                value={aidesAncien.action_logement}
                onChange={(v) => setAidesAncien({ ...aidesAncien, action_logement: v })}
              />
            </div>

            <ScenarioResults
              resultats={resAncien}
              ecoPtzExtra={
                blocTravaux.finance_via_eco_ptz
                  ? {
                      capital: blocTravaux.eco_ptz_capital,
                      mensualite: blocTravaux.eco_ptz_mensualite,
                    }
                  : null
              }
            />
          </section>
        </div>

        {/* TABLEAU DELTA */}
        <DeltaTable resNeuf={resNeuf} resAncien={resAncien} salaire={salaire} />
      </main>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

interface AideRowProps {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  eligible: boolean;
  eligibleReason?: string;
  disabled?: boolean;
}
function AideRow({ label, value, onChange, eligible, eligibleReason, disabled }: AideRowProps) {
  const inactif = disabled || !eligible;
  return (
    <div className={`flex items-center justify-between gap-3 py-1 ${inactif ? 'opacity-60' : ''}`}>
      <div className="flex items-center gap-1.5 text-xs">
        {eligible ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-success" aria-hidden="true" />
        ) : (
          <XCircle className="w-3.5 h-3.5 text-text-subtle" aria-hidden="true" />
        )}
        <span className="text-text-muted">{label}</span>
        {eligibleReason && (
          <Tooltip content={eligibleReason}>
            <span className="text-text-subtle text-[10px] cursor-help">ⓘ</span>
          </Tooltip>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value && eligible}
        disabled={inactif}
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:cursor-not-allowed
          ${value && eligible ? 'bg-accent' : 'bg-bg-subtle border border-border-subtle'}`}
      >
        <span
          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform
            ${value && eligible ? 'translate-x-5' : 'translate-x-1'}`}
        />
      </button>
    </div>
  );
}

interface ScenarioResultsProps {
  resultats: Resultats;
  ecoPtzExtra: { capital: number; mensualite: number } | null;
}
function ScenarioResults({ resultats, ecoPtzExtra }: ScenarioResultsProps) {
  return (
    <div className="mt-4 space-y-2.5">
      <div className="text-xs font-semibold text-text-muted uppercase tracking-wider">
        Résultats financiers
      </div>
      <ResultLine label="Frais de notaire" value={formatEuro(resultats.frais_notaire)} />
      <ResultLine
        label="Prêt principal banque"
        value={formatEuro(resultats.pret_principal_montant)}
        hint={
          resultats.ptz_montant > 0 ? `+ PTZ ${formatEuro(resultats.ptz_montant)}` : undefined
        }
      />
      {ecoPtzExtra && (
        <ResultLine
          label="Eco-PTZ travaux"
          value={`${formatEuro(ecoPtzExtra.capital)} (${formatEuro(ecoPtzExtra.mensualite)}/mois)`}
          hint="0 % sur 20 ans"
          color="text-success"
        />
      )}
      <ResultLine
        label="Mensualité totale"
        value={formatEuro(resultats.mensualite_totale)}
        bold
        color="text-accent"
      />
      <ResultLine
        label="Intérêts banque (sur durée)"
        value={formatEuro(resultats.interets_totaux)}
        color="text-warning"
      />
      <ResultLine
        label="Endettement (pic HCSF)"
        value={formatPercent(resultats.taux_endettement)}
        color={
          resultats.taux_endettement > 35
            ? 'text-danger'
            : resultats.taux_endettement > 30
            ? 'text-warning'
            : 'text-success'
        }
      />
      <ResultLine
        label="Total à débourser"
        value={formatEuro(resultats.cout_total_reel)}
        bold
        color="text-accent"
      />
    </div>
  );
}

function ResultLine({
  label,
  value,
  hint,
  bold,
  color = 'text-text',
}: {
  label: string;
  value: string;
  hint?: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 text-sm">
      <span className={bold ? 'font-medium text-text' : 'text-text-muted'}>
        {label}
        {hint && <span className="text-text-subtle text-xs ml-1.5">· {hint}</span>}
      </span>
      <span className={`font-mono tabular-nums ${bold ? 'font-semibold' : ''} ${color}`}>
        {value}
      </span>
    </div>
  );
}

interface DeltaTableProps {
  resNeuf: Resultats;
  resAncien: Resultats;
  salaire: number;
}
function DeltaTable({ resNeuf, resAncien, salaire }: DeltaTableProps) {
  const rows: Array<{ label: string; neuf: number; ancien: number; positiveIsBad: boolean }> = [
    {
      label: 'Mensualité totale',
      neuf: resNeuf.mensualite_totale,
      ancien: resAncien.mensualite_totale,
      positiveIsBad: true,
    },
    {
      label: 'Intérêts banque',
      neuf: resNeuf.interets_totaux,
      ancien: resAncien.interets_totaux,
      positiveIsBad: true,
    },
    {
      label: 'Frais de notaire',
      neuf: resNeuf.frais_notaire,
      ancien: resAncien.frais_notaire,
      positiveIsBad: true,
    },
    {
      label: 'Prêt principal banque',
      neuf: resNeuf.pret_principal_montant,
      ancien: resAncien.pret_principal_montant,
      positiveIsBad: false, // pas vraiment "mauvais" un prêt plus élevé en soi
    },
    {
      label: 'Total à débourser',
      neuf: resNeuf.cout_total_reel,
      ancien: resAncien.cout_total_reel,
      positiveIsBad: true,
    },
  ];

  const deltaCoutTotal = resAncien.cout_total_reel - resNeuf.cout_total_reel;
  const verdict =
    Math.abs(deltaCoutTotal) < 1000
      ? 'Coûts équivalents — décision selon préférences (qualité énergétique, charme ancien…).'
      : deltaCoutTotal < 0
      ? `L'ancien (travaux inclus) revient ${formatEuro(-deltaCoutTotal)} moins cher au total.`
      : `Le neuf revient ${formatEuro(deltaCoutTotal)} moins cher au total (frais notaire réduits + PTZ).`;

  return (
    <section className="card">
      <h2 className="card-title">
        <GitCompare className="w-4 h-4 text-accent" aria-hidden="true" />
        Comparaison directe
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-xs text-text-subtle uppercase tracking-wider">
            <tr className="border-b border-border-subtle">
              <th className="text-left py-2 font-medium">Critère</th>
              <th className="text-right py-2 font-medium">🏢 Neuf</th>
              <th className="text-right py-2 font-medium">🏠 Ancien</th>
              <th className="text-right py-2 font-medium">Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const delta = r.ancien - r.neuf;
              const ancienBetter = r.positiveIsBad ? delta < 0 : delta > 0;
              const isNeutral = Math.abs(delta) < 100;
              const Icon = isNeutral ? Minus : ancienBetter ? TrendingDown : TrendingUp;
              const colorClass = isNeutral
                ? 'text-text-muted'
                : ancienBetter
                ? 'text-success'
                : 'text-danger';
              return (
                <tr key={r.label} className="border-b border-border-subtle/50">
                  <td className="py-2 text-text">{r.label}</td>
                  <td className="text-right py-2 font-mono tabular-nums text-text">
                    {formatEuro(r.neuf)}
                  </td>
                  <td className="text-right py-2 font-mono tabular-nums text-text">
                    {formatEuro(r.ancien)}
                  </td>
                  <td className={`text-right py-2 font-mono tabular-nums ${colorClass}`}>
                    <span className="inline-flex items-center gap-1 justify-end">
                      <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                      {delta >= 0 ? '+' : ''}
                      {formatEuro(delta)}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Endettement check */}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <EndettementBadge type="Neuf" taux={resNeuf.taux_endettement} salaire={salaire} />
        <EndettementBadge type="Ancien" taux={resAncien.taux_endettement} salaire={salaire} />
      </div>

      <div className="mt-4 p-3 rounded-lg bg-accent/5 border border-accent/20 text-sm text-text">
        <strong className="text-accent">Verdict :</strong> {verdict}
      </div>

      <p className="mt-3 text-xs text-text-subtle italic">
        Note : la part « travaux » de l'ancien suppose les subventions saisies — affinez les
        montants réels avec un conseiller France Rénov' avant décision. Les loyers économisés vs
        location et la valeur de revente (qualité énergétique RT2020 du neuf) ne sont pas modélisés.
      </p>
    </section>
  );
}

function EndettementBadge({
  type,
  taux,
  salaire,
}: {
  type: string;
  taux: number;
  salaire: number;
}) {
  const ok = taux <= 35;
  return (
    <div
      className={`p-2 rounded-lg border text-xs flex items-center gap-2 ${
        ok ? 'bg-success/10 border-success/25' : 'bg-danger/10 border-danger/25'
      }`}
    >
      {ok ? (
        <CheckCircle2 className="w-4 h-4 text-success shrink-0" aria-hidden="true" />
      ) : (
        <XCircle className="w-4 h-4 text-danger shrink-0" aria-hidden="true" />
      )}
      <span className="text-text-muted">
        <strong className="text-text">{type}</strong> · endettement{' '}
        <span className={`font-mono ${ok ? 'text-success' : 'text-danger'}`}>
          {formatPercent(taux)}
        </span>{' '}
        {ok ? '(OK HCSF)' : `(au-dessus 35 % HCSF, salaire ${formatEuro(salaire)})`}
      </span>
    </div>
  );
}

