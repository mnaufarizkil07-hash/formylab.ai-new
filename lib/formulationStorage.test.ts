import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  DEMO_ACCOUNT_EMAIL,
  isDemoAccountEmail,
  normalizeUserScopeId,
} from "./auth";
import {
  DEMO_SEED_FORMULATIONS,
  SAVED_RUNS_KEY_PREFIX,
  getSavedRunsStorageKey,
  initializeAccountSavedRuns,
  loadLocalFormulations,
  mergeUniqueFormulations,
  saveLocalFormulations,
  type SavedFormulationRecord,
  type StorageLike,
} from "./formulationStorage";

function createMemoryStorage(): StorageLike & { store: Map<string, string> } {
  const store = new Map<string, string>();
  return {
    store,
    getItem(key: string) {
      return store.has(key) ? store.get(key)! : null;
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
    removeItem(key: string) {
      store.delete(key);
    },
  };
}

function makeRecord(id: string, productType: string, createdAt: string): SavedFormulationRecord {
  return {
    id,
    createdAt,
    productType,
    skinTarget: "Combination",
    targetPh: "5.5",
    targetViscosity: "3000 - 6000 cPs",
    batchSize: "100",
    customIngredients: ["Niacinamide 4%"],
    candidates: [],
  };
}

describe("User scope normalization & Demo detection", () => {
  it("normalizes valid emails and rejects prototype pollution or path traversal", () => {
    assert.equal(normalizeUserScopeId("  Chemist@Lab.ID "), "chemist@lab.id");
    assert.equal(normalizeUserScopeId("__proto__"), null);
    assert.equal(normalizeUserScopeId("constructor"), null);
    assert.equal(normalizeUserScopeId("prototype"), null);
    assert.equal(normalizeUserScopeId("../etc/passwd"), null);
    assert.equal(normalizeUserScopeId(""), null);
    assert.equal(normalizeUserScopeId(null), null);
  });

  it("identifies ONLY the official Demo account email as demo", () => {
    assert.equal(isDemoAccountEmail(DEMO_ACCOUNT_EMAIL), true);
    assert.equal(isDemoAccountEmail("RND.CHEMIST@FORMYLAB.AI"), true);
    assert.equal(isDemoAccountEmail("naufalrizki@gmail.com"), false);
    assert.equal(isDemoAccountEmail("new.user@company.co.id"), false);
    assert.equal(isDemoAccountEmail(null), false);
  });

  it("builds user-scoped localStorage keys and returns null when logged out", () => {
    assert.equal(
      getSavedRunsStorageKey("User.A@Lab.com"),
      `${SAVED_RUNS_KEY_PREFIX}user.a@lab.com`
    );
    assert.equal(getSavedRunsStorageKey(null), null);
    assert.equal(getSavedRunsStorageKey(""), null);
  });
});

describe("Per-account Saved Formulation Runs isolation", () => {
  it("initializes brand-new and non-demo accounts with empty [] (0 saved runs)", () => {
    const storage = createMemoryStorage();
    const newUserRuns = initializeAccountSavedRuns("chemist.baru@lab.id", storage);
    assert.deepEqual(newUserRuns, []);
    assert.equal(
      storage.getItem(`${SAVED_RUNS_KEY_PREFIX}chemist.baru@lab.id`),
      "[]"
    );

    const otherDefaultRuns = loadLocalFormulations("dewi@gmail.com", storage);
    assert.deepEqual(otherDefaultRuns, []);
  });

  it("seeds DEMO_SEED_FORMULATIONS exclusively for the Demo account", () => {
    const storage = createMemoryStorage();
    const demoRuns = initializeAccountSavedRuns(DEMO_ACCOUNT_EMAIL, storage);
    assert.equal(demoRuns.length, DEMO_SEED_FORMULATIONS.length);
    assert.equal(demoRuns[0].id, "FRM-LAB-001");

    // Non-demo account in the same browser storage must NOT see Demo seed runs
    const newUserRuns = loadLocalFormulations("other.user@lab.id", storage);
    assert.deepEqual(newUserRuns, []);
  });

  it("does not re-seed Demo account after Demo explicitly clears all saved runs", () => {
    const storage = createMemoryStorage();
    initializeAccountSavedRuns(DEMO_ACCOUNT_EMAIL, storage);
    saveLocalFormulations([], DEMO_ACCOUNT_EMAIL, storage);

    const afterClear = loadLocalFormulations(DEMO_ACCOUNT_EMAIL, storage);
    assert.deepEqual(afterClear, []);
  });

  it("keeps saved runs strictly isolated when switching between accounts", () => {
    const storage = createMemoryStorage();
    const runA = makeRecord("FRM-A-001", "Brightening Gel Serum", "2026-11-20T10:00:00.000Z");
    const runB = makeRecord("FRM-B-001", "Calming Barrier Toner", "2026-11-21T10:00:00.000Z");

    saveLocalFormulations([runA], "user.a@lab.id", storage);
    saveLocalFormulations([runB], "user.b@lab.id", storage);

    // User A sees only Run A
    const loadedA = loadLocalFormulations("user.a@lab.id", storage);
    assert.equal(loadedA.length, 1);
    assert.equal(loadedA[0].id, "FRM-A-001");

    // User B sees only Run B
    const loadedB = loadLocalFormulations("user.b@lab.id", storage);
    assert.equal(loadedB.length, 1);
    assert.equal(loadedB[0].id, "FRM-B-001");

    // A third brand-new account C starts at 0
    const loadedC = loadLocalFormulations("user.c@lab.id", storage);
    assert.deepEqual(loadedC, []);
  });

  it("merges unique formulation records sorted newest-first without duplicates", () => {
    const older = makeRecord("FRM-1", "Serum", "2026-11-10T08:00:00.000Z");
    const newer = makeRecord("FRM-2", "Cream", "2026-11-15T08:00:00.000Z");
    const merged = mergeUniqueFormulations([older, newer], [older]);
    assert.equal(merged.length, 2);
    assert.equal(merged[0].id, "FRM-2");
    assert.equal(merged[1].id, "FRM-1");
  });
});
