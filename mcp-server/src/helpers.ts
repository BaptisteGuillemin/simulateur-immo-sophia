import {
  COMMUNES,
  getCommune,
  type ParametresUtilisateur,
  type ParametresBien,
  type ParametresPret,
  type Resultats,
} from './core.js';
import { DEFAULT_UTILISATEUR, DEFAULT_BIEN, DEFAULT_PRET, withDefaults } from './defaults.js';

export interface ResolvedInput {
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
}

interface PartialInput {
  utilisateur?: Partial<ParametresUtilisateur>;
  bien?: Partial<ParametresBien>;
  pret?: Partial<ParametresPret>;
}

/**
 * Complète les inputs partiels avec les defaults — l'utilisateur du MCP
 * peut ne passer que ce qu'il veut changer, le reste est cohérent.
 */
export function resolveInput(input: PartialInput): ResolvedInput {
  const utilisateur = withDefaults(DEFAULT_UTILISATEUR, input.utilisateur);
  const bien = withDefaults(DEFAULT_BIEN, input.bien);
  const pret = withDefaults(DEFAULT_PRET, input.pret);

  // Cohérences douces : si la commune n'existe pas, fallback sur la première
  if (!COMMUNES.find((c) => c.commune === bien.commune)) {
    bien.commune = COMMUNES[0].commune;
  }

  return { utilisateur, bien, pret };
}

/** Résumé court d'un Resultats (pour les listes / comparaisons) */
export function resumeResultats(r: Resultats): {
  prix_bien: number;
  cout_total_reel: number;
  mensualite_pic: number;
  endettement_pourcent: number;
  pret_principal: number;
  ptz: number;
  intérêts_banque: number;
} {
  return {
    prix_bien: r.prix_bien,
    cout_total_reel: r.cout_total_reel,
    mensualite_pic: r.pic_mensualite_palier,
    endettement_pourcent: r.taux_endettement,
    pret_principal: r.pret_principal_montant,
    ptz: r.ptz_montant,
    intérêts_banque: r.interets_totaux,
  };
}

export function getAllCommuneNames(): string[] {
  return COMMUNES.map((c) => c.commune);
}

export function resolveCommune(nom: string) {
  return getCommune(nom);
}
