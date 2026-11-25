export interface UserAccount {
  email: string;
  password: string;
  name: string;
}

export const DEFAULT_ACCOUNTS: UserAccount[] = [
  { email: "rnd.chemist@formylab.ai", password: "12345", name: "R&D Lead Chemist" },
  { email: "naufalrizki@gmail.com", password: "12345", name: "Naufalrizki" },
  { email: "raisa@gmail.com", password: "12345", name: "Raisa" },
  { email: "humaidah@gmail.com", password: "12345", name: "Humaidah" },
  { email: "dewi@gmail.com", password: "12345", name: "Dewi" },
  { email: "jauja@gmail.com", password: "12345", name: "Jauja" },
];

export const DEMO_ACCOUNT_EMAIL = "rnd.chemist@formylab.ai";

export const ACCOUNTS_STORAGE_KEY = "formylabAccounts";
export const ACTIVE_USER_STORAGE_KEY = "formylabUser";
export const AUTH_CHANGE_EVENT = "formylab-auth-change";

const FORBIDDEN_SCOPE_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function normalizeUserScopeId(emailOrId?: string | null): string | null {
  if (typeof emailOrId !== "string") return null;
  const cleaned = emailOrId.trim().toLowerCase();
  if (!cleaned || cleaned.length > 160) return null;
  if (FORBIDDEN_SCOPE_KEYS.has(cleaned)) return null;
  // Restrict to safe identifier/email characters (blocks path traversal & control chars)
  if (!/^[a-z0-9._@+-]+$/.test(cleaned)) return null;
  return cleaned;
}

export function isDemoAccountEmail(email?: string | null): boolean {
  const normalized = normalizeUserScopeId(email);
  return normalized === DEMO_ACCOUNT_EMAIL;
}

export function getActiveUserAccount(): UserAccount | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<UserAccount> | null;
    if (!parsed || typeof parsed.email !== "string") return null;
    const normalizedEmail = normalizeUserScopeId(parsed.email);
    if (!normalizedEmail) return null;
    return {
      email: normalizedEmail,
      password: typeof parsed.password === "string" ? parsed.password : "",
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim()
          : formatNameFromEmail(normalizedEmail),
    };
  } catch {
    return null;
  }
}

export function setActiveUserSession(user: UserAccount): void {
  if (typeof window === "undefined") return;
  try {
    const normalizedEmail = normalizeUserScopeId(user.email) || user.email.trim().toLowerCase();
    const safeUser: UserAccount = {
      email: normalizedEmail,
      password: user.password,
      name: user.name?.trim() || formatNameFromEmail(normalizedEmail),
    };
    window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(safeUser));
    // Clear legacy global keys & transient studio drafts so previous account state never leaks
    window.localStorage.removeItem("formylab_saved_formulations_v1");
    window.localStorage.removeItem("currentFormulation");
    window.localStorage.removeItem("aiGeneratedCandidates");
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // Ignore storage write errors
  }
}

export function clearActiveUserSession(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(ACTIVE_USER_STORAGE_KEY);
    window.localStorage.removeItem("currentFormulation");
    window.localStorage.removeItem("aiGeneratedCandidates");
    window.dispatchEvent(new Event(AUTH_CHANGE_EVENT));
  } catch {
    // Ignore storage write errors
  }
}

export function formatNameFromEmail(email: string): string {
  const rawName = email.trim().split("@")[0] || "User";
  return rawName.charAt(0).toUpperCase() + rawName.slice(1);
}

export function getAllAccounts(customAccounts: UserAccount[] = []): UserAccount[] {
  const map = new Map<string, UserAccount>();
  for (const acc of DEFAULT_ACCOUNTS) {
    map.set(acc.email.toLowerCase(), acc);
  }
  for (const acc of customAccounts) {
    if (acc && acc.email && acc.password) {
      map.set(acc.email.trim().toLowerCase(), {
        email: acc.email.trim().toLowerCase(),
        password: acc.password,
        name: acc.name?.trim() || formatNameFromEmail(acc.email),
      });
    }
  }
  return Array.from(map.values());
}

export function authenticateUser(
  email: string,
  password: string,
  customAccounts: UserAccount[] = []
): { success: boolean; user?: UserAccount; error?: string; code?: "NOT_FOUND" | "WRONG_PASSWORD" | "INVALID_INPUT" } {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanPassword) {
    return {
      success: false,
      error: "Please enter both your email and password.",
      code: "INVALID_INPUT",
    };
  }

  const allAccounts = getAllAccounts(customAccounts);
  const found = allAccounts.find((a) => a.email.toLowerCase() === cleanEmail);

  if (!found) {
    return {
      success: false,
      error: "Account not registered yet. Please create a new account first.",
      code: "NOT_FOUND",
    };
  }

  if (found.password !== cleanPassword) {
    return {
      success: false,
      error: "Incorrect password. Please check your password and try again.",
      code: "WRONG_PASSWORD",
    };
  }

  return {
    success: true,
    user: found,
  };
}

export function registerUserAccount(
  email: string,
  password: string,
  customAccounts: UserAccount[] = [],
  name?: string
): {
  success: boolean;
  account?: UserAccount;
  updatedCustomAccounts?: UserAccount[];
  error?: string;
} {
  const cleanEmail = email.trim().toLowerCase();
  const cleanPassword = password.trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return {
      success: false,
      error: "Please enter a valid email address (e.g. name@yourlab.com).",
    };
  }

  if (!cleanPassword || cleanPassword.length < 3) {
    return {
      success: false,
      error: "Password must be at least 3 characters long.",
    };
  }

  const allAccounts = getAllAccounts(customAccounts);
  const existing = allAccounts.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existing) {
    return {
      success: false,
      error: "This email is already registered. Please sign in instead.",
    };
  }

  const newAccount: UserAccount = {
    email: cleanEmail,
    password: cleanPassword,
    name: name?.trim() ? name.trim() : formatNameFromEmail(cleanEmail),
  };

  return {
    success: true,
    account: newAccount,
    updatedCustomAccounts: [...customAccounts, newAccount],
  };
}
