import {
  getActiveUserAccount,
  isDemoAccountEmail,
  normalizeUserScopeId,
} from "./auth";

export interface SavedFormulationIngredient {
  name: string;
  category: string;
  conc: string;
  riskLevel: string;
  riskNote: string;
  supplier: string;
  isHalal: boolean;
  compatibilityScore?: number;
  casNumber?: string;
  molecularFormula?: string;
  functionalCategory?: string;
}

export interface SavedFormulationCandidate {
  id: string;
  title: string;
  badge: string;
  viscosity: string;
  ph: string;
  estCost: string;
  overallRisk: string;
  riskSummaryText: string;
  observationText: string;
  ingredients: SavedFormulationIngredient[];
}

export interface SavedFormulationRecord {
  id: string;
  createdAt: string;
  productType: string;
  skinTarget: string;
  targetPh: string;
  targetViscosity: string;
  batchSize: string;
  customIngredients: string[];
  candidates: SavedFormulationCandidate[];
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const SAVED_RUNS_KEY_PREFIX = "formylab_saved_runs_";
export const LEGACY_GLOBAL_STORAGE_KEY = "formylab_saved_formulations_v1";

/**
 * Sample R&D study shown ONLY for the Demo Account (rnd.chemist@formylab.ai).
 * Non-demo and newly created accounts always start with an empty repository [].
 */
export const DEMO_SEED_FORMULATIONS: SavedFormulationRecord[] = [
  {
    id: "FRM-LAB-001",
    createdAt: "2026-11-09T08:15:00.000Z",
    productType: "Facial Moisturizer (Cream)",
    skinTarget: "Sensitive & Redness",
    targetPh: "5.25",
    targetViscosity: "8500 - 15000 cPs",
    batchSize: "100",
    customIngredients: ["Niacinamide 4%", "Panthenol 2%", "Ceramide NP 1%"],
    candidates: [
      {
        id: "candidate-a",
        title: "Candidate A",
        badge: "Best match (Hypoallergenic)",
        viscosity: "8,950 cP",
        ph: "5.28",
        estCost: "Rp 34.850 (BOM)",
        overallRisk: "Low",
        riskSummaryText:
          "Dataset CSV baris F0004 + System A O/W Lamellar Emulsion (Stabilitas: Stable).",
        observationText:
          "AI R&D ANALYSIS: Terverifikasi supplier Halal LPPOM MUI & IFANCA dengan skor kompatibilitas 98%.",
        ingredients: [
          {
            name: "Water",
            category: "Base Formulation",
            conc: "63.13%",
            riskLevel: "Low",
            riskNote: "Aman berdasarkan dataset",
            supplier: "PT Otsuka Indonesia",
            isHalal: true,
            compatibilityScore: 99,
            casNumber: "7732-18-5",
            molecularFormula: "H₂O",
          },
          {
            name: "Glycerin",
            category: "Base Formulation",
            conc: "4.50%",
            riskLevel: "Low",
            riskNote: "Trihydric Humectant (USP Grade)",
            supplier: "PT SMART Tbk",
            isHalal: true,
            compatibilityScore: 98,
            casNumber: "56-81-5",
            molecularFormula: "C₃H₈O₃",
          },
          {
            name: "Cetyl Alcohol",
            category: "Base Formulation",
            conc: "4.50%",
            riskLevel: "Low",
            riskNote: "Lamellar Gel Network Stabilizer",
            supplier: "PT SMART Tbk",
            isHalal: true,
            compatibilityScore: 97,
            casNumber: "36653-82-4",
            molecularFormula: "C₁₆H₃₄O",
          },
          {
            name: "Niacinamide",
            category: "Custom Active Compound",
            conc: "4.00%",
            riskLevel: "Low",
            riskNote: "Barrier Ceramide Synthesis & Brightening",
            supplier: "DSM Nutritional Products",
            isHalal: true,
            compatibilityScore: 99,
            casNumber: "98-92-0",
            molecularFormula: "C₆H₆N₂O",
          },
          {
            name: "Panthenol",
            category: "Custom Active Compound",
            conc: "2.00%",
            riskLevel: "Low",
            riskNote: "Pro-Vitamin B5 Corneocyte Repair",
            supplier: "BASF SE",
            isHalal: true,
            compatibilityScore: 99,
            casNumber: "81-13-0",
            molecularFormula: "C₉H₁₉NO₄",
          },
          {
            name: "Phenoxyethanol (Safe Preservative)",
            category: "AI Safety Replacement",
            conc: "1.00%",
            riskLevel: "Low",
            riskNote: "Substitusi aman bebas paraben",
            supplier: "Schülke & Mayr",
            isHalal: true,
            compatibilityScore: 97,
            casNumber: "122-99-6",
            molecularFormula: "C₈H₁₀O₂",
          },
        ],
      },
    ],
  },
];

function getBrowserStorage(): StorageLike | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function getSavedRunsStorageKey(userEmailOrId?: string | null): string | null {
  const normalized = normalizeUserScopeId(userEmailOrId);
  if (!normalized) return null;
  return `${SAVED_RUNS_KEY_PREFIX}${normalized}`;
}

export function resolveEffectiveUserScope(userEmailOrId?: string | null): string | null {
  if (userEmailOrId !== undefined) {
    return normalizeUserScopeId(userEmailOrId);
  }
  return normalizeUserScopeId(getActiveUserAccount()?.email);
}

export function mergeUniqueFormulations(
  primary: SavedFormulationRecord[],
  secondary: SavedFormulationRecord[]
): SavedFormulationRecord[] {
  const map = new Map<string, SavedFormulationRecord>();
  for (const r of [...primary, ...secondary]) {
    if (r && r.id && !map.has(r.id)) {
      map.set(r.id, r);
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

/**
 * Ensures an account's per-user localStorage key is initialized cleanly:
 * - Demo account receives DEMO_SEED_FORMULATIONS only if not initialized yet.
 * - All other accounts (including newly registered accounts) initialize as [].
 */
export function initializeAccountSavedRuns(
  userEmailOrId?: string | null,
  storage: StorageLike | null = getBrowserStorage()
): SavedFormulationRecord[] {
  const scopeId = resolveEffectiveUserScope(userEmailOrId);
  const storageKey = getSavedRunsStorageKey(scopeId);
  if (!scopeId || !storageKey || !storage) return [];

  try {
    const existingRaw = storage.getItem(storageKey);
    if (existingRaw !== null) {
      const parsed = JSON.parse(existingRaw);
      if (Array.isArray(parsed)) return parsed;
    }

    const initialRecords = isDemoAccountEmail(scopeId)
      ? DEMO_SEED_FORMULATIONS.map((item) => ({ ...item }))
      : [];

    storage.setItem(storageKey, JSON.stringify(initialRecords));
    return initialRecords;
  } catch {
    return isDemoAccountEmail(scopeId) ? DEMO_SEED_FORMULATIONS : [];
  }
}

export function loadLocalFormulations(
  userEmailOrId?: string | null,
  storage: StorageLike | null = getBrowserStorage()
): SavedFormulationRecord[] {
  const scopeId = resolveEffectiveUserScope(userEmailOrId);
  const storageKey = getSavedRunsStorageKey(scopeId);
  if (!scopeId || !storageKey || !storage) return [];

  try {
    const raw = storage.getItem(storageKey);
    if (raw === null) {
      return initializeAccountSavedRuns(scopeId, storage);
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFormulations(
  records: SavedFormulationRecord[],
  userEmailOrId?: string | null,
  storage: StorageLike | null = getBrowserStorage()
) {
  const scopeId = resolveEffectiveUserScope(userEmailOrId);
  const storageKey = getSavedRunsStorageKey(scopeId);
  if (!scopeId || !storageKey || !storage) return;

  try {
    storage.setItem(storageKey, JSON.stringify(records.slice(0, 30)));
  } catch {
    // ignore storage quota errors
  }
}

export async function fetchSavedFormulations(
  userEmailOrId?: string | null
): Promise<SavedFormulationRecord[]> {
  const scopeId = resolveEffectiveUserScope(userEmailOrId);
  if (!scopeId) return [];

  const storage = getBrowserStorage();
  const storageKey = getSavedRunsStorageKey(scopeId);
  const hadLocalEntry = Boolean(storage && storageKey && storage.getItem(storageKey) !== null);
  const local = loadLocalFormulations(scopeId, storage);

  try {
    const res = await fetch(
      `/api/formulations?userId=${encodeURIComponent(scopeId)}`,
      { cache: "no-store" }
    );
    const data = await res.json();
    if (data.success && Array.isArray(data.records)) {
      const serverRecords = data.records as SavedFormulationRecord[];
      // If local already recorded explicit deletions (e.g. demo user cleared list),
      // respect server state when server also reflects scoped storage.
      const merged =
        hadLocalEntry && local.length === 0 && serverRecords.length === 0
          ? []
          : mergeUniqueFormulations(local, serverRecords);
      saveLocalFormulations(merged, scopeId, storage);
      return merged;
    }
  } catch {
    // Fallback strictly to this user's isolated localStorage bucket
  }
  return local;
}

export async function persistFormulationRun(
  record: Omit<SavedFormulationRecord, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  },
  userEmailOrId?: string | null
): Promise<SavedFormulationRecord> {
  const scopeId = resolveEffectiveUserScope(userEmailOrId);
  const fullRecord: SavedFormulationRecord = {
    ...record,
    id: record.id || `FRM-${Date.now().toString(36).toUpperCase()}`,
    createdAt: record.createdAt || new Date().toISOString(),
  };

  if (!scopeId) {
    return fullRecord;
  }

  const existing = loadLocalFormulations(scopeId);
  const deduped = [
    fullRecord,
    ...existing.filter((r) => r.id !== fullRecord.id),
  ].slice(0, 30);
  saveLocalFormulations(deduped, scopeId);

  try {
    await fetch("/api/formulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: scopeId, record: fullRecord }),
    });
  } catch {
    // Saved in user-scoped localStorage as fallback
  }

  return fullRecord;
}

export async function deleteSavedFormulation(
  id: string,
  userEmailOrId?: string | null
): Promise<SavedFormulationRecord[]> {
  const scopeId = resolveEffectiveUserScope(userEmailOrId);
  if (!scopeId) return [];

  const existing = loadLocalFormulations(scopeId).filter((r) => r.id !== id);
  saveLocalFormulations(existing, scopeId);

  try {
    await fetch(
      `/api/formulations?id=${encodeURIComponent(id)}&userId=${encodeURIComponent(scopeId)}`,
      { method: "DELETE" }
    );
  } catch {
    // ignore network errors
  }

  return existing;
}
