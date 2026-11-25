import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  DEMO_ACCOUNT_EMAIL,
  isDemoAccountEmail,
  normalizeUserScopeId,
} from "../../../lib/auth";
import {
  DEMO_SEED_FORMULATIONS,
  type SavedFormulationRecord,
} from "../../../lib/formulationStorage";

const STORAGE_PATH = path.join(process.cwd(), "data", "saved_formulations.json");
const TMP_STORAGE_PATH = "/tmp/saved_formulations_v2.json";

interface ScopedFormulationsStore {
  version: 2;
  byUser: Record<string, SavedFormulationRecord[]>;
}

let memoryStore: ScopedFormulationsStore | null = null;

function createEmptyStore(): ScopedFormulationsStore {
  return {
    version: 2,
    byUser: Object.create(null) as Record<string, SavedFormulationRecord[]>,
  };
}

function hydrateStore(raw: unknown): ScopedFormulationsStore {
  const store = createEmptyStore();

  // Legacy v1 flat array format: migrate strictly into the Demo account bucket only
  if (Array.isArray(raw)) {
    const valid = raw.filter(
      (item): item is SavedFormulationRecord =>
        Boolean(item && typeof item === "object" && "id" in item && "productType" in item)
    );
    store.byUser[DEMO_ACCOUNT_EMAIL] =
      valid.length > 0 ? valid.slice(0, 40) : [...DEMO_SEED_FORMULATIONS];
    return store;
  }

  if (
    raw &&
    typeof raw === "object" &&
    "byUser" in raw &&
    raw.byUser &&
    typeof raw.byUser === "object" &&
    !Array.isArray(raw.byUser)
  ) {
    const entries = Object.entries(raw.byUser as Record<string, unknown>);
    for (const [key, value] of entries) {
      const safeKey = normalizeUserScopeId(key);
      if (safeKey && Array.isArray(value)) {
        store.byUser[safeKey] = value
          .filter(
            (item): item is SavedFormulationRecord =>
              Boolean(
                item &&
                  typeof item === "object" &&
                  "id" in item &&
                  "productType" in item
              )
          )
          .slice(0, 40);
      }
    }
  }

  return store;
}

function readScopedStore(): ScopedFormulationsStore {
  if (memoryStore) return memoryStore;

  try {
    if (fs.existsSync(TMP_STORAGE_PATH)) {
      const tmpContent = fs.readFileSync(TMP_STORAGE_PATH, "utf-8");
      const hydrated = hydrateStore(JSON.parse(tmpContent));
      memoryStore = hydrated;
      return hydrated;
    }
    if (fs.existsSync(STORAGE_PATH)) {
      const content = fs.readFileSync(STORAGE_PATH, "utf-8");
      const hydrated = hydrateStore(JSON.parse(content));
      memoryStore = hydrated;
      return hydrated;
    }
  } catch {
    // Fall back to clean in-memory store
  }

  const fresh = createEmptyStore();
  memoryStore = fresh;
  return fresh;
}

function writeScopedStore(store: ScopedFormulationsStore) {
  memoryStore = store;
  const plainByUser: Record<string, SavedFormulationRecord[]> = {};
  for (const [key, value] of Object.entries(store.byUser)) {
    const safeKey = normalizeUserScopeId(key);
    if (safeKey && Array.isArray(value)) {
      plainByUser[safeKey] = value.slice(0, 40);
    }
  }

  const serialized = JSON.stringify(
    {
      version: 2,
      byUser: plainByUser,
    },
    null,
    2
  );

  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORAGE_PATH, serialized, "utf-8");
  } catch {
    try {
      fs.writeFileSync(TMP_STORAGE_PATH, serialized, "utf-8");
    } catch {
      // In-memory store already updated
    }
  }
}

function getRecordsForUser(
  store: ScopedFormulationsStore,
  userId: string
): SavedFormulationRecord[] {
  if (Object.prototype.hasOwnProperty.call(store.byUser, userId)) {
    return store.byUser[userId] || [];
  }
  // Only the Demo account receives default seed sample studies when uninitialized
  if (isDemoAccountEmail(userId)) {
    return [...DEMO_SEED_FORMULATIONS];
  }
  return [];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = normalizeUserScopeId(searchParams.get("userId"));

  // Never leak demo or global records if user scope is missing/invalid
  if (!userId) {
    return NextResponse.json({ success: true, records: [] });
  }

  const store = readScopedStore();
  const records = getRecordsForUser(store, userId);
  return NextResponse.json({ success: true, records });
}

export async function POST(request: Request) {
  try {
    const rawBody = (await request.json()) as {
      userId?: string;
      record?: SavedFormulationRecord;
    } & Partial<SavedFormulationRecord>;

    const userId = normalizeUserScopeId(rawBody?.userId);
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Valid user account scope is required" },
        { status: 400 }
      );
    }

    const payload = rawBody.record || rawBody;
    if (
      !payload ||
      typeof payload.productType !== "string" ||
      !payload.productType.trim() ||
      !Array.isArray(payload.candidates)
    ) {
      return NextResponse.json(
        { success: false, error: "Invalid formulation payload" },
        { status: 400 }
      );
    }

    const store = readScopedStore();
    const current = getRecordsForUser(store, userId);

    const record: SavedFormulationRecord = {
      id:
        typeof payload.id === "string" && payload.id.trim()
          ? payload.id.trim().slice(0, 64)
          : `FRM-${Date.now().toString(36).toUpperCase()}`,
      createdAt:
        typeof payload.createdAt === "string" && payload.createdAt.trim()
          ? payload.createdAt
          : new Date().toISOString(),
      productType: payload.productType.trim(),
      skinTarget: typeof payload.skinTarget === "string" ? payload.skinTarget : "",
      targetPh: typeof payload.targetPh === "string" ? payload.targetPh : "",
      targetViscosity:
        typeof payload.targetViscosity === "string" ? payload.targetViscosity : "",
      batchSize: typeof payload.batchSize === "string" ? payload.batchSize : "100",
      customIngredients: Array.isArray(payload.customIngredients)
        ? payload.customIngredients.filter((x): x is string => typeof x === "string")
        : [],
      candidates: payload.candidates,
    };

    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 40);
    store.byUser[userId] = updated;
    writeScopedStore(store);

    return NextResponse.json({ success: true, record, records: updated });
  } catch (err) {
    console.error("POST /api/formulations error:", err);
    return NextResponse.json(
      { success: false, error: "Failed to save formulation" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = normalizeUserScopeId(searchParams.get("userId"));

    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Valid user account scope is required" },
        { status: 400 }
      );
    }

    const store = readScopedStore();
    const current = getRecordsForUser(store, userId);
    const updated = id ? current.filter((r) => r.id !== id) : current;
    store.byUser[userId] = updated;
    writeScopedStore(store);

    return NextResponse.json({ success: true, records: updated });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to delete formulation" },
      { status: 500 }
    );
  }
}
