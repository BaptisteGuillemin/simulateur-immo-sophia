import { mkdirSync, readFileSync, writeFileSync, existsSync, renameSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { randomUUID } from 'node:crypto';
import type { ParametresUtilisateur, ParametresBien, ParametresPret } from './core.js';

/**
 * Représentation d'un scénario persistant sur disque. Indépendant du
 * localStorage de l'app web — la persistance MCP vit dans le HOME de
 * l'utilisateur et survit aux mises à jour du serveur.
 */
export interface StoredScenario {
  id: string;
  name: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
}

interface Store {
  version: 1;
  scenarios: StoredScenario[];
}

const STORE_DIR = join(homedir(), '.simulateur-immo-sophia');
const STORE_PATH = join(STORE_DIR, 'scenarios.json');

function emptyStore(): Store {
  return { version: 1, scenarios: [] };
}

function ensureDir(): void {
  mkdirSync(STORE_DIR, { recursive: true });
}

function readStore(): Store {
  if (!existsSync(STORE_PATH)) return emptyStore();
  try {
    const raw = readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.scenarios)) {
      return emptyStore();
    }
    return parsed as Store;
  } catch {
    // Corrupted file — back it up and start fresh
    try {
      const backup = STORE_PATH + '.corrupt-' + Date.now();
      renameSync(STORE_PATH, backup);
    } catch {
      /* ignore */
    }
    return emptyStore();
  }
}

function writeStore(store: Store): void {
  ensureDir();
  const tmp = STORE_PATH + '.tmp';
  writeFileSync(tmp, JSON.stringify(store, null, 2), 'utf-8');
  // Atomic rename so we never see partial writes
  renameSync(tmp, STORE_PATH);
}

// Public API ---------------------------------------------------------------

/** Liste tous les scénarios persistés (lecture du fichier JSON). */
export function listScenarios(): StoredScenario[] {
  return readStore().scenarios;
}

/** Récupère un scénario par son UUID exact. `undefined` si absent. */
export function getScenarioById(id: string): StoredScenario | undefined {
  return readStore().scenarios.find((s) => s.id === id);
}

/**
 * Récupère un scénario par son nom (insensible à la casse, espaces ignorés).
 * `undefined` si absent.
 */
export function getScenarioByName(name: string): StoredScenario | undefined {
  const normalized = name.trim().toLowerCase();
  return readStore().scenarios.find((s) => s.name.trim().toLowerCase() === normalized);
}

/**
 * Recherche un scénario par UUID OU par nom. Pratique pour les tools
 * qui acceptent les deux formes d'identifiant côté MCP.
 */
export function findScenario(idOrName: string): StoredScenario | undefined {
  return getScenarioById(idOrName) ?? getScenarioByName(idOrName);
}

/** Payload accepté par `saveScenario` (les paramètres sont déjà résolus). */
export interface SaveInput {
  name: string;
  notes?: string;
  utilisateur: ParametresUtilisateur;
  bien: ParametresBien;
  pret: ParametresPret;
}

/**
 * Sauvegarde (UPSERT par nom, insensible à la casse). Si un scénario
 * portant le même nom existe déjà, on conserve son `id` et `created_at`
 * et on met à jour le reste. Sinon, génère un nouvel UUID v4.
 *
 * @throws {Error} Si le nom est vide ou ne contient que des espaces.
 * @returns Le scénario tel que stocké (avec id + timestamps).
 */
export function saveScenario(input: SaveInput): StoredScenario {
  if (!input.name?.trim()) {
    throw new Error('Le nom du scénario est requis et ne peut pas être vide.');
  }
  const store = readStore();
  const now = new Date().toISOString();

  // Si un scénario du même nom existe → update (UPSERT par nom)
  const existing = store.scenarios.findIndex(
    (s) => s.name.trim().toLowerCase() === input.name.trim().toLowerCase()
  );

  const scenario: StoredScenario = {
    id: existing >= 0 ? store.scenarios[existing].id : randomUUID(),
    name: input.name.trim(),
    notes: input.notes,
    created_at: existing >= 0 ? store.scenarios[existing].created_at : now,
    updated_at: now,
    utilisateur: input.utilisateur,
    bien: input.bien,
    pret: input.pret,
  };

  if (existing >= 0) store.scenarios[existing] = scenario;
  else store.scenarios.push(scenario);

  writeStore(store);
  return scenario;
}

/**
 * Supprime un scénario par UUID. Retourne `true` si une ligne a été
 * supprimée, `false` si l'UUID n'existait pas.
 */
export function deleteScenario(id: string): boolean {
  const store = readStore();
  const before = store.scenarios.length;
  store.scenarios = store.scenarios.filter((s) => s.id !== id);
  if (store.scenarios.length === before) return false;
  writeStore(store);
  return true;
}

/** Retourne le chemin absolu du fichier JSON de persistance. */
export function getStorePath(): string {
  return STORE_PATH;
}
