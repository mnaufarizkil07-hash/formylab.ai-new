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

const LOCAL_STORAGE_KEY = "formylab_saved_formulations_v1";

export function loadLocalFormulations(): SavedFormulationRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveLocalFormulations(records: SavedFormulationRecord[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(records.slice(0, 30)));
  } catch {
    // ignore storage quota errors
  }
}

export async function fetchSavedFormulations(): Promise<SavedFormulationRecord[]> {
  try {
    const res = await fetch("/api/formulations", { cache: "no-store" });
    const data = await res.json();
    if (data.success && Array.isArray(data.records)) {
      const local = loadLocalFormulations();
      // Merge unique by id
      const map = new Map<string, SavedFormulationRecord>();
      for (const r of [...local, ...data.records]) {
        if (r && r.id && !map.has(r.id)) {
          map.set(r.id, r);
        }
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveLocalFormulations(merged);
      return merged;
    }
  } catch {
    // Fallback to localStorage
  }
  return loadLocalFormulations();
}

export async function persistFormulationRun(
  record: Omit<SavedFormulationRecord, "id" | "createdAt"> & { id?: string; createdAt?: string }
): Promise<SavedFormulationRecord> {
  const fullRecord: SavedFormulationRecord = {
    ...record,
    id: record.id || `FRM-${Date.now().toString(36).toUpperCase()}`,
    createdAt: record.createdAt || new Date().toISOString(),
  };

  const existing = loadLocalFormulations();
  const deduped = [fullRecord, ...existing.filter((r) => r.id !== fullRecord.id)].slice(0, 30);
  saveLocalFormulations(deduped);

  try {
    await fetch("/api/formulations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(fullRecord),
    });
  } catch {
    // Saved in localStorage as fallback
  }

  return fullRecord;
}

export async function deleteSavedFormulation(id: string): Promise<SavedFormulationRecord[]> {
  const existing = loadLocalFormulations().filter((r) => r.id !== id);
  saveLocalFormulations(existing);
  try {
    await fetch(`/api/formulations?id=${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch {
    // ignore
  }
  return existing;
}
