"use client";

import firebaseAppletConfig from "../firebase-applet-config.json";

export const GOOGLE_DRIVE_SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
] as const;

const GIS_SCRIPT_URL = "https://accounts.google.com/gsi/client";
const DRIVE_UPLOAD_ENDPOINT =
  "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink";

export interface CreatedGoogleDocResult {
  id: string;
  url: string;
  title: string;
}

export interface GoogleDriveAuthSnapshot {
  isConnected: boolean;
  isConfigured: boolean;
  expiresAt: number;
}

export class GoogleDocsClientError extends Error {
  code:
    | "MISSING_CLIENT_ID"
    | "SCRIPT_LOAD_FAILED"
    | "AUTH_CANCELLED"
    | "AUTH_ERROR"
    | "TOKEN_EXPIRED"
    | "API_ERROR";

  constructor(
    code: GoogleDocsClientError["code"],
    message: string
  ) {
    super(message);
    this.name = "GoogleDocsClientError";
    this.code = code;
  }
}

interface GisTokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface GisTokenClient {
  requestAccessToken: (overrideConfig?: { prompt?: string }) => void;
}

interface GoogleAccountsOAuth2 {
  initTokenClient: (config: {
    client_id: string;
    scope: string;
    callback: (response: GisTokenResponse) => void;
    error_callback?: (error: { type?: string; message?: string }) => void;
  }) => GisTokenClient;
  revoke?: (token: string, done?: () => void) => void;
}

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: GoogleAccountsOAuth2;
      };
    };
  }
}

// Strict in-memory OAuth access token cache (never written to localStorage/sessionStorage)
let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;
let gisScriptPromise: Promise<void> | null = null;

type AuthListener = (snapshot: GoogleDriveAuthSnapshot) => void;
const authListeners = new Set<AuthListener>();

export function getGoogleOAuthClientId(): string {
  const envClientId = (process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "").trim();
  if (envClientId) return envClientId;

  const provisionedClientId =
    typeof firebaseAppletConfig?.oAuthClientId === "string"
      ? firebaseAppletConfig.oAuthClientId.trim()
      : "";
  return provisionedClientId;
}

export function isGoogleDriveOAuthConfigured(): boolean {
  return getGoogleOAuthClientId().length > 0;
}

export function getCachedGoogleDriveToken(): string | null {
  if (!cachedAccessToken) return null;
  // Require at least 30s safety margin before expiry
  if (Date.now() >= cachedTokenExpiresAt - 30_000) {
    cachedAccessToken = null;
    cachedTokenExpiresAt = 0;
    notifyAuthListeners();
    return null;
  }
  return cachedAccessToken;
}

export function isGoogleDriveConnected(): boolean {
  return Boolean(getCachedGoogleDriveToken());
}

export function getGoogleDriveAuthSnapshot(): GoogleDriveAuthSnapshot {
  const connected = isGoogleDriveConnected();
  return {
    isConnected: connected,
    isConfigured: isGoogleDriveOAuthConfigured(),
    expiresAt: connected ? cachedTokenExpiresAt : 0,
  };
}

function notifyAuthListeners(): void {
  const snapshot = getGoogleDriveAuthSnapshot();
  authListeners.forEach((listener) => {
    try {
      listener(snapshot);
    } catch {
      // ignore individual listener errors
    }
  });
}

export function subscribeGoogleDriveAuth(listener: AuthListener): () => void {
  authListeners.add(listener);
  return () => {
    authListeners.delete(listener);
  };
}

export function clearCachedGoogleDriveToken(): void {
  cachedAccessToken = null;
  cachedTokenExpiresAt = 0;
  notifyAuthListeners();
}

export function disconnectGoogleDrive(): void {
  const tokenToRevoke = cachedAccessToken;
  clearCachedGoogleDriveToken();
  try {
    if (
      tokenToRevoke &&
      typeof window !== "undefined" &&
      window.google?.accounts?.oauth2?.revoke
    ) {
      window.google.accounts.oauth2.revoke(tokenToRevoke, () => {});
    }
  } catch {
    // ignore revoke failure
  }
}

/**
 * Lazily loads Google Identity Services (GIS) only when the user invokes Google Docs/Drive features.
 */
export function loadGoogleIdentityScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(
      new GoogleDocsClientError(
        "SCRIPT_LOAD_FAILED",
        "Google Identity Services hanya tersedia di browser."
      )
    );
  }

  if (window.google?.accounts?.oauth2?.initTokenClient) {
    return Promise.resolve();
  }

  if (gisScriptPromise) {
    return gisScriptPromise;
  }

  gisScriptPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SCRIPT_URL}"]`
    );

    const handleLoaded = () => {
      if (window.google?.accounts?.oauth2?.initTokenClient) {
        resolve();
      } else {
        gisScriptPromise = null;
        reject(
          new GoogleDocsClientError(
            "SCRIPT_LOAD_FAILED",
            "Script Google Identity Services termuat, tetapi modul OAuth2 tidak tersedia."
          )
        );
      }
    };

    if (existing) {
      existing.addEventListener("load", handleLoaded, { once: true });
      existing.addEventListener(
        "error",
        () => {
          gisScriptPromise = null;
          reject(
            new GoogleDocsClientError(
              "SCRIPT_LOAD_FAILED",
              "Gagal memuat script Google Identity Services."
            )
          );
        },
        { once: true }
      );
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = handleLoaded;
    script.onerror = () => {
      gisScriptPromise = null;
      reject(
        new GoogleDocsClientError(
          "SCRIPT_LOAD_FAILED",
          "Gagal memuat Google Identity Services. Periksa koneksi internet Anda."
        )
      );
    };
    document.head.appendChild(script);
  });

  return gisScriptPromise;
}

/**
 * Authenticates via GIS Token Client using minimal `drive.file` scope and caches token in memory.
 */
export async function connectGoogleDrive(
  prompt: "" | "consent" | "select_account" = ""
): Promise<string> {
  if (prompt !== "select_account" && prompt !== "consent") {
    const existing = getCachedGoogleDriveToken();
    if (existing) return existing;
  }

  const clientId = getGoogleOAuthClientId();
  if (!clientId) {
    throw new GoogleDocsClientError(
      "MISSING_CLIENT_ID",
      "NEXT_PUBLIC_GOOGLE_CLIENT_ID belum dikonfigurasi di environment."
    );
  }

  await loadGoogleIdentityScript();

  const oauth2 = window.google?.accounts?.oauth2;
  if (!oauth2?.initTokenClient) {
    throw new GoogleDocsClientError(
      "SCRIPT_LOAD_FAILED",
      "Modul Google Identity Services tidak tersedia di browser ini."
    );
  }

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const tokenClient = oauth2.initTokenClient({
      client_id: clientId,
      scope: GOOGLE_DRIVE_SCOPES.join(" "),
      callback: (res: GisTokenResponse) => {
        if (settled) return;
        settled = true;

        if (res.error || !res.access_token) {
          const isCancelled =
            res.error === "access_denied" ||
            res.error === "popup_closed_by_user";
          reject(
            new GoogleDocsClientError(
              isCancelled ? "AUTH_CANCELLED" : "AUTH_ERROR",
              res.error_description ||
                (isCancelled
                  ? "Izin akses Google Drive dibatalkan."
                  : `Gagal autentikasi Google Drive (${res.error || "unknown"}).`)
            )
          );
          return;
        }

        const expiresInSec =
          typeof res.expires_in === "number" && res.expires_in > 60
            ? res.expires_in
            : 3500;
        cachedAccessToken = res.access_token;
        cachedTokenExpiresAt = Date.now() + expiresInSec * 1000;
        notifyAuthListeners();
        resolve(res.access_token);
      },
      error_callback: (err: { type?: string; message?: string }) => {
        if (settled) return;
        settled = true;
        const isClosed =
          err?.type === "popup_closed" || err?.type === "popup_failed_to_open";
        reject(
          new GoogleDocsClientError(
            isClosed ? "AUTH_CANCELLED" : "AUTH_ERROR",
            err?.type === "popup_failed_to_open"
              ? "Popup login Google diblokir browser/iframe. Izinkan popup atau buka aplikasi di tab baru, atau gunakan unduh .doc instan."
              : "Jendela login Google Drive ditutup sebelum selesai."
          )
        );
      },
    });

    try {
      tokenClient.requestAccessToken({ prompt });
    } catch (err: unknown) {
      if (!settled) {
        settled = true;
        reject(
          new GoogleDocsClientError(
            "AUTH_ERROR",
            err instanceof Error
              ? err.message
              : "Gagal membuka jendela izin Google Drive."
          )
        );
      }
    }
  });
}

// ============================================================================
// MARKDOWN -> SEMANTIC GOOGLE DOCS HTML CONVERTER (TABLES, LISTS, HEADINGS)
// ============================================================================

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatInlineMarkdownToHtml(raw: string): string {
  const escaped = escapeHtml(raw);
  return escaped
    .replace(
      /\*\*([^*]+)\*\*/g,
      '<strong style="font-weight:600;color:#0B2B26;">$1</strong>'
    )
    .replace(
      /`([^`]+)`/g,
      '<code style="font-family:Consolas,Menlo,monospace;font-size:10pt;background-color:#E6F4F1;color:#0B2B26;padding:1px 4px;border-radius:3px;">$1</code>'
    )
    .replace(/\*([^*]+)\*/g, '<em style="font-style:italic;color:#2E524C;">$1</em>');
}

function isMarkdownTableSeparator(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-{2,}:?$/.test(c));
}

function splitTableRowCells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
}

function isNumericTableCell(raw: string): boolean {
  const cleaned = raw.replace(/[*_`~]/g, "").trim();
  if (!cleaned) return false;
  return /^(?:Rp\.?\s*)?[-+]?\d[\d.,\s]*(?:%|g|mg|ml|kg|cP|pH|°C|USD|IDR)?(?:\s*[-–]\s*\d[\d.,\s]*(?:%|g|mg|ml|kg|cP|pH|°C)?)?$/i.test(
    cleaned
  );
}

/**
 * Converts Markdown (headings, paragraphs, bullet/ordered lists, inline styles, and tables)
 * into clean semantic HTML with inline CSS optimized for Google Drive -> Google Docs conversion.
 */
export function markdownToCleanHtml(title: string, markdown: string): string {
  const safeTitle = (title || "Dokumen Formulasi R&D").trim();
  const lines = (markdown || "").replace(/\r\n/g, "\n").split("\n");
  const bodyChunks: string[] = [];
  let i = 0;

  while (i < lines.length) {
    const trimmed = lines[i].trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Horizontal rule
    if (/^[-*_]{3,}$/.test(trimmed)) {
      bodyChunks.push(
        '<hr style="border:none;border-top:1px solid #CBE3DD;margin:14px 0;" />'
      );
      i += 1;
      continue;
    }

    // Markdown table
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isMarkdownTableSeparator(lines[i + 1])
    ) {
      const headers = splitTableRowCells(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowLine = lines[i].trim();
        if (!rowLine || !rowLine.includes("|")) break;
        const cells = splitTableRowCells(rowLine);
        if (cells.length > 0) rows.push(cells);
        i += 1;
      }

      const theadHtml = headers
        .map(
          (header) =>
            `<th style="background-color:#E6F4F1;color:#0B2B26;font-weight:700;text-align:left;padding:8px 10px;border:1px solid #B8DBD3;font-size:10.5pt;">${formatInlineMarkdownToHtml(
              header
            )}</th>`
        )
        .join("");

      const tbodyHtml = rows
        .map((row, rowIdx) => {
          const rowBg = rowIdx % 2 === 1 ? "#F7FBF9" : "#FFFFFF";
          const cellsHtml = headers
            .map((_, colIdx) => {
              const val = row[colIdx] ?? "";
              const numeric = isNumericTableCell(val);
              const align = numeric ? "right" : "left";
              const fontFamily = numeric
                ? "font-family:Consolas,Menlo,monospace;"
                : "";
              const color = numeric ? "#0B2B26" : "#2E524C";
              return `<td style="background-color:${rowBg};color:${color};text-align:${align};${fontFamily}padding:7px 10px;border:1px solid #CFE5E0;font-size:10pt;vertical-align:top;">${formatInlineMarkdownToHtml(
                val
              )}</td>`;
            })
            .join("");
          return `<tr>${cellsHtml}</tr>`;
        })
        .join("");

      bodyChunks.push(
        `<table style="width:100%;border-collapse:collapse;margin:12px 0 16px 0;border:1px solid #B8DBD3;"><thead><tr>${theadHtml}</tr></thead><tbody>${tbodyHtml}</tbody></table>`
      );
      continue;
    }

    // Headings (#, ##, ###, ####)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const content = formatInlineMarkdownToHtml(headingMatch[2].trim());
      if (level === 1) {
        bodyChunks.push(
          `<h1 style="font-size:17pt;font-weight:700;color:#0B2B26;margin:16px 0 8px 0;">${content}</h1>`
        );
      } else if (level === 2) {
        bodyChunks.push(
          `<h2 style="font-size:13.5pt;font-weight:700;color:#0B2B26;margin:14px 0 6px 0;border-bottom:1px solid #D8ECE7;padding-bottom:4px;">${content}</h2>`
        );
      } else {
        bodyChunks.push(
          `<h3 style="font-size:11.5pt;font-weight:700;color:#0E807E;margin:12px 0 4px 0;">${content}</h3>`
        );
      }
      i += 1;
      continue;
    }

    // Unordered list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^[-*•]\s+/, "").trim();
        items.push(
          `<li style="margin:4px 0;color:#2E524C;">${formatInlineMarkdownToHtml(
            text
          )}</li>`
        );
        i += 1;
      }
      bodyChunks.push(
        `<ul style="margin:6px 0 12px 20px;padding:0;line-height:1.55;">${items.join(
          ""
        )}</ul>`
      );
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        const text = lines[i].trim().replace(/^\d+[.)]\s+/, "").trim();
        items.push(
          `<li style="margin:4px 0;color:#2E524C;">${formatInlineMarkdownToHtml(
            text
          )}</li>`
        );
        i += 1;
      }
      bodyChunks.push(
        `<ol style="margin:6px 0 12px 22px;padding:0;line-height:1.55;">${items.join(
          ""
        )}</ol>`
      );
      continue;
    }

    // Paragraph
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^[-*_]{3,}$/.test(cur) ||
        /^#{1,4}\s+/.test(cur) ||
        /^[-*•]\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        (cur.includes("|") &&
          i + 1 < lines.length &&
          isMarkdownTableSeparator(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }

    if (paraLines.length > 0) {
      bodyChunks.push(
        `<p style="margin:0 0 10px 0;color:#2E524C;line-height:1.62;">${formatInlineMarkdownToHtml(
          paraLines.join(" ")
        )}</p>`
      );
    }
  }

  const dateStamp = new Date().toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return [
    "<!DOCTYPE html>",
    '<html lang="id">',
    "<head>",
    '<meta charset="UTF-8" />',
    `<title>${escapeHtml(safeTitle)}</title>`,
    "</head>",
    '<body style="font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#0B2B26;line-height:1.6;margin:24px;">',
    '<div style="border-bottom:2px solid #0E807E;padding-bottom:10px;margin-bottom:16px;">',
    `<h1 style="margin:0 0 4px 0;font-size:19pt;font-weight:700;color:#0B2B26;">${escapeHtml(
      safeTitle
    )}</h1>`,
    `<p style="margin:0;font-size:9.5pt;color:#0E807E;">Formylab.ai · Cosmetic R&amp;D Lab Document · ${escapeHtml(
      dateStamp
    )}</p>`,
    "</div>",
    bodyChunks.join("\n"),
    "</body>",
    "</html>",
  ].join("\n");
}

/**
 * Creates a native Google Docs file in the user's Google Drive via Drive REST API v3 multipart upload.
 * Google Drive automatically converts the semantic HTML (including tables) into a native Google Doc.
 */
export async function createGoogleDocInDrive(params: {
  title: string;
  markdownContent: string;
  interactiveAuth?: boolean;
}): Promise<CreatedGoogleDocResult> {
  const cleanTitle = (params.title || "Dokumen Formulasi Formylab").trim();
  const cleanMarkdown = (params.markdownContent || "").trim();

  let accessToken = getCachedGoogleDriveToken();
  if (!accessToken) {
    if (params.interactiveAuth === false) {
      throw new GoogleDocsClientError(
        "AUTH_CANCELLED",
        "Google Drive belum terhubung di sesi ini."
      );
    }
    accessToken = await connectGoogleDrive("");
  }

  const htmlPayload = markdownToCleanHtml(cleanTitle, cleanMarkdown);
  const metadata = {
    name: cleanTitle,
    mimeType: "application/vnd.google-apps.document",
  };

  const boundary = `formylab_gdoc_${Date.now()}_${Math.random()
    .toString(36)
    .slice(2, 9)}`;

  const multipartBody = [
    `--${boundary}`,
    "Content-Type: application/json; charset=UTF-8",
    "",
    JSON.stringify(metadata),
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    htmlPayload,
    `--${boundary}--`,
  ].join("\r\n");

  const response = await fetch(DRIVE_UPLOAD_ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (response.status === 401) {
    clearCachedGoogleDriveToken();
    throw new GoogleDocsClientError(
      "TOKEN_EXPIRED",
      "Sesi Google Drive sudah kedaluwarsa. Klik hubungkan ulang untuk membuat dokumen."
    );
  }

  if (!response.ok) {
    let errDetail = `HTTP ${response.status}`;
    try {
      const errJson = (await response.json()) as {
        error?: { message?: string };
      };
      if (errJson?.error?.message) {
        errDetail = errJson.error.message;
      }
    } catch {
      // ignore json parse failure
    }
    throw new GoogleDocsClientError(
      "API_ERROR",
      `Gagal membuat Google Docs di Drive: ${errDetail}`
    );
  }

  const data = (await response.json()) as {
    id?: string;
    name?: string;
    webViewLink?: string;
  };

  if (!data?.id) {
    throw new GoogleDocsClientError(
      "API_ERROR",
      "Google Drive tidak mengembalikan ID dokumen."
    );
  }

  return {
    id: data.id,
    title: data.name || cleanTitle,
    url:
      data.webViewLink ||
      `https://docs.google.com/document/d/${encodeURIComponent(data.id)}/edit`,
  };
}

// ============================================================================
// SAFE FALLBACK HELPERS (INSTANT .DOC DOWNLOAD & RICH HTML CLIPBOARD PASTE)
// ============================================================================

export function downloadWordReadyDocFile(
  title: string,
  markdownContent: string
): void {
  if (typeof window === "undefined") return;
  const html = markdownToCleanHtml(title, markdownContent);
  const blob = new Blob(["\ufeff", html], {
    type: "application/msword;charset=utf-8",
  });
  const slug = (title || "dokumen-formylab")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slug || "dokumen-formylab"}.doc`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

export async function copyRichHtmlForGoogleDocs(
  title: string,
  markdownContent: string
): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard) {
    return false;
  }
  const html = markdownToCleanHtml(title, markdownContent);
  const plain = `${title}\n\n${markdownContent}`;

  try {
    if (
      typeof ClipboardItem !== "undefined" &&
      typeof navigator.clipboard.write === "function"
    ) {
      const item = new ClipboardItem({
        "text/html": new Blob([html], { type: "text/html" }),
        "text/plain": new Blob([plain], { type: "text/plain" }),
      });
      await navigator.clipboard.write([item]);
      return true;
    }
  } catch {
    // Fall back to plain text copy below
  }

  try {
    await navigator.clipboard.writeText(plain);
    return true;
  } catch {
    return false;
  }
}
