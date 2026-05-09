import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ParametresBien, ParametresPret, ParametresUtilisateur, Scenario } from '@/types';
import communesData from '@/data/communes.json';
import type { Commune } from '@/types';
import {
  TAUX_INDICATIFS,
  TAUX_ASSURANCE_DEFAULT,
  PTZ_PARAMS,
  AIDES_DEFAULTS,
} from '@/calculators/constants';
import { suggererPrixBien } from '@/calculators/simulation';

const COMMUNES: Commune[] = communesData as Commune[];

interface State {
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
  scenarios: Scenario[];

  setUtilisateur: (patch: Partial<ParametresUtilisateur>) => void;
  setBien: (patch: Partial<ParametresBien>) => void;
  setPret: (patch: Partial<ParametresPret>) => void;

  setDuree: (duree: number) => void; // ajuste auto le taux indicatif

  recalibrerPrixSurMoyenne: () => void; // remet le prix sur (moyenne commune × surface)

  reset: () => void;
  applyAll: (u: ParametresUtilisateur, b: ParametresBien, p: ParametresPret) => void;

  saveScenario: (nom: string) => void;
  deleteScenario: (id: string) => void;
  loadScenario: (id: string) => void;
}

const DEFAULT_UTILISATEUR: ParametresUtilisateur = {
  salaire_net_mensuel: 2300,
  apport: 40000,
  epargne_restante_cible: 10000,
  primo_accedant: true,
};

const DEFAULT_BIEN: ParametresBien = {
  commune: 'Valbonne',
  surface: 40,
  prix_bien: 232000,           // Valbonne neuf 40 m² ≈ 5800 €/m² × 40
  type_bien: 'neuf',
  frais_agence_actif: false,    // neuf par défaut → pas de frais d'agence
  frais_agence_pourcent: 4,
  loyer_mensuel_potentiel: 850,
  assurance_habitation_annuelle: 280,  // MRH propriétaire occupant ~250-350 €/an
  fonds_travaux_annuel: 0,             // optionnel, ALUR ~5 % charges/an si activé
  charges_copro_perso_actif: false,    // sinon moyenne commune
  charges_copro_perso_annuelles: 1800, // ~150 €/mois
};

const DEFAULT_PRET: ParametresPret = {
  duree_annees: 20,
  taux_annuel: TAUX_INDICATIFS[20],
  taux_assurance_annuel: TAUX_ASSURANCE_DEFAULT,
  ptz_actif: true,
  ptz_montant: undefined,
  ptz_duree_differe_annees: PTZ_PARAMS.duree_differe_default,        // 8 ans (tranche 2)
  ptz_duree_remboursement_annees: PTZ_PARAMS.duree_remboursement_default, // 22 ans

  // Aides désactivées par défaut, mais avec des montants/taux pré-réglés
  pas_actif: false,

  pel_actif: false,
  pel_montant: AIDES_DEFAULTS.pel.montant_default,
  pel_taux: AIDES_DEFAULTS.pel.taux_default,
  pel_duree_annees: AIDES_DEFAULTS.pel.duree_annees,

  cel_actif: false,
  cel_montant: AIDES_DEFAULTS.cel.montant_default,
  cel_taux: AIDES_DEFAULTS.cel.taux_default,
  cel_duree_annees: AIDES_DEFAULTS.cel.duree_annees,

  action_logement_actif: false,
  action_logement_montant: AIDES_DEFAULTS.action_logement.montant_default,
  action_logement_taux: AIDES_DEFAULTS.action_logement.taux_default,
  action_logement_duree_annees: AIDES_DEFAULTS.action_logement.duree_annees,

  brs_actif: false,
  brs_decote_pourcent: AIDES_DEFAULTS.brs.decote_pourcent_default,
};

export const useSimulationStore = create<State>()(
  persist(
    (set) => ({
      utilisateur: DEFAULT_UTILISATEUR,
      bien: DEFAULT_BIEN,
      pret: DEFAULT_PRET,
      scenarios: [],

      setUtilisateur: (patch) =>
        set((s) => ({ utilisateur: { ...s.utilisateur, ...patch } })),
      setBien: (patch) => set((s) => ({ bien: { ...s.bien, ...patch } })),
      setPret: (patch) => set((s) => ({ pret: { ...s.pret, ...patch } })),

      setDuree: (duree) =>
        set((s) => ({
          pret: {
            ...s.pret,
            duree_annees: duree,
            taux_annuel: TAUX_INDICATIFS[duree] ?? s.pret.taux_annuel,
          },
        })),

      recalibrerPrixSurMoyenne: () =>
        set((s) => {
          const commune = COMMUNES.find((c) => c.commune === s.bien.commune) ?? COMMUNES[0];
          return {
            bien: {
              ...s.bien,
              prix_bien: suggererPrixBien(s.bien.surface, s.bien.type_bien, commune),
            },
          };
        }),

      reset: () =>
        set({
          utilisateur: DEFAULT_UTILISATEUR,
          bien: DEFAULT_BIEN,
          pret: DEFAULT_PRET,
        }),

      applyAll: (u, b, p) => set({ utilisateur: u, bien: b, pret: p }),

      saveScenario: (nom) =>
        set((s) => ({
          scenarios: [
            ...s.scenarios,
            {
              id: crypto.randomUUID(),
              nom,
              date_creation: Date.now(),
              utilisateur: s.utilisateur,
              bien: s.bien,
              pret: s.pret,
            },
          ],
        })),

      deleteScenario: (id) =>
        set((s) => ({ scenarios: s.scenarios.filter((sc) => sc.id !== id) })),

      loadScenario: (id) =>
        set((s) => {
          const sc = s.scenarios.find((x) => x.id === id);
          if (!sc) return s;
          return {
            utilisateur: sc.utilisateur,
            bien: sc.bien,
            pret: sc.pret,
          };
        }),
    }),
    {
      name: 'simulateur-immo-sophia',
      version: 8,
      // Sur changement de version, on repart sur les defaults (le shape évolue trop).
      migrate: () => ({
        utilisateur: DEFAULT_UTILISATEUR,
        bien: DEFAULT_BIEN,
        pret: DEFAULT_PRET,
        scenarios: [],
      }),
    }
  )
);

export const getCommunes = (): Commune[] => COMMUNES;
export const getCommune = (nom: string): Commune =>
  COMMUNES.find((c) => c.commune === nom) ?? COMMUNES[0];
