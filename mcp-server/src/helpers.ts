import {
  COMMUNES,
  getCommune,
  type Commune,
  type ParametresUtilisateur,
  type ParametresBien,
  type ParametresPret,
  type Resultats,
} from './core.js';
import { DEFAULT_UTILISATEUR, DEFAULT_BIEN, DEFAULT_PRET, withDefaults } from './defaults.js';

/** Trio fully-resolved utilisateur / bien / prêt prêt à être passé à `simuler()`. */
export interface ResolvedInput {
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
}

/** Trio d'inputs partiels acceptés en entrée des tools. */
export interface PartialInput {
  utilisateur?: Partial<ParametresUtilisateur>;
  bien?: Partial<ParametresBien>;
  pret?: Partial<ParametresPret>;
}

/**
 * Complète un input MCP partiel avec les defaults pour produire un trio
 * complet utilisable par le moteur. Si la commune fournie est inconnue,
 * fallback silencieux sur la première du référentiel — la recherche
 * stricte se fait via `resolveCommune()` qui retourne aussi un fallback
 * mais permet à l'appelant de comparer les noms s'il le souhaite.
 *
 * @param input Champs partiels (peuvent tous être omis)
 * @returns Trio complet `{ utilisateur, bien, pret }`
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

/** Forme aplatie d'un `Resultats` adaptée aux listes / classements / comparaisons. */
export interface ResumeResultats {
  prix_bien: number;
  cout_total_reel: number;
  mensualite_pic: number;
  endettement_pourcent: number;
  pret_principal: number;
  ptz: number;
  intérêts_banque: number;
}

/**
 * Construit un résumé court d'un `Resultats` pour les sorties de tools
 * (listes, classements, deltas). Garde uniquement les indicateurs clés
 * pour limiter la taille de la réponse JSON renvoyée au LLM.
 */
export function resumeResultats(r: Resultats): ResumeResultats {
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

/** Liste les noms exacts des communes disponibles dans le référentiel. */
export function getAllCommuneNames(): string[] {
  return COMMUNES.map((c) => c.commune);
}

/**
 * Récupère une commune par son nom (case-sensitive) avec fallback sur
 * la première du référentiel si introuvable. Alias plus expressif de
 * `getCommune()` à utiliser depuis le serveur MCP.
 */
export function resolveCommune(nom: string): Commune {
  return getCommune(nom);
}

/** Réponse standard d'un tool MCP : tableau de content typé `text`. */
export interface ToolResponse {
  [x: string]: unknown;
  content: Array<{ type: 'text'; text: string }>;
  isError?: boolean;
}

/** Sérialise un objet en JSON indenté dans la forme attendue par le SDK MCP. */
export function json(data: unknown): ToolResponse {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] };
}

/**
 * Construit une réponse d'erreur standard pour un tool MCP. Le LLM la lit
 * comme du texte JSON ; on n'expose jamais la stack trace, juste un message
 * français lisible et le nom du tool concerné.
 *
 * @param tool Nom du tool (pour traçabilité)
 * @param message Message d'erreur en français lisible
 * @param details Champ optionnel (ex: input invalide) ajouté tel quel
 */
export function errorResponse(
  tool: string,
  message: string,
  details?: Record<string, unknown>
): ToolResponse {
  return {
    isError: true,
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ error: true, tool, message, ...details }, null, 2),
      },
    ],
  };
}

/**
 * Wrapper try/catch standard pour les handlers de tool : capture toute
 * exception et la convertit en `errorResponse` lisible. Évite de propager
 * une stack trace brute au client MCP.
 *
 * @param tool Nom du tool (utilisé dans le message d'erreur)
 * @param fn Handler asynchrone à exécuter
 */
export async function safeHandler(
  tool: string,
  fn: () => Promise<ToolResponse>
): Promise<ToolResponse> {
  try {
    return await fn();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse(tool, `Erreur interne dans le tool "${tool}" : ${message}`);
  }
}
