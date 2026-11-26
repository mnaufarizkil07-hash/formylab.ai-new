export type ChatNoteFormat = "paragraph" | "table" | "mixed";

export interface ChatNoteArtifact {
  title: string;
  format: ChatNoteFormat;
  markdownContent: string;
  createdAt?: string;
}

export const NOTE_ARTIFACT_OPEN_TAG = "[[NOTE_ARTIFACT]]";
export const NOTE_ARTIFACT_CLOSE_TAG = "[[/NOTE_ARTIFACT]]";

/**
 * Gemini Function Declaration for `create_chat_note` (compatible with both
 * Gemini Live API WebSocket `setup.tools` and `@google/genai` generateContent).
 */
export const CREATE_CHAT_NOTE_TOOL_DECLARATION = {
  name: "create_chat_note",
  description:
    "Membuat dan menampilkan kartu Catatan R&D terstruktur (paragraf, poin, dan/atau tabel Markdown) secara langsung ke dalam room chat Formylab.ai agar pengguna dapat membaca, menyalin, atau menyimpannya.",
  parameters: {
    type: "OBJECT",
    properties: {
      title: {
        type: "STRING",
        description:
          "Judul catatan yang singkat, jelas, dan spesifik (misal: 'Formula Serum Niacinamide 5% & Estimasi HPP').",
      },
      format: {
        type: "STRING",
        enum: ["paragraph", "table", "mixed"],
        description:
          "Format utama catatan: 'paragraph' untuk ringkasan naratif/poin, 'table' untuk tabel data/komposisi bahan, atau 'mixed' untuk gabungan paragraf, poin, dan tabel.",
      },
      markdownContent: {
        type: "STRING",
        description:
          "Isi catatan rapi dalam Markdown standar: mendukung heading kecil (###), paragraf terstruktur, daftar poin (- ), dan/atau tabel Markdown valid (| Kolom 1 | Kolom 2 |\\n| --- | --- |\\n| ... | ... |).",
      },
    },
    required: ["title", "format", "markdownContent"],
  },
} as const;

export const NOTE_ARTIFACT_LIVE_DIRECTIVE = [
  "ATURAN WAJIB SKILL BUAT CATATAN (`create_chat_note`):",
  "- Setiap kali pengguna meminta dibuatkan catatan, rangkuman poin, daftar bahan, atau tabel (misalnya: 'buatkan catatan', 'catat ini di chat', 'bikin tabel komposisi', 'rangkumkan jadi catatan'), kamu WAJIB memanggil function/tool `create_chat_note` dengan `title`, `format` ('paragraph' | 'table' | 'mixed'), dan `markdownContent` yang rapi & akurat.",
  "- Setelah memanggil `create_chat_note`, konfirmasi singkat secara lisan (1 kalimat natural) bahwa catatannya sudah tampil langsung di room chat.",
  "- DILARANG KERAS mengaku sudah menaruh atau membuat catatan di room chat tanpa benar-benar memanggil tool `create_chat_note`.",
].join("\n");

export const NOTE_ARTIFACT_FALLBACK_DIRECTIVE = [
  "ATURAN WAJIB SKILL BUAT CATATAN TERSTRUKTUR:",
  "- Jika dan hanya jika pengguna meminta dibuatkan catatan, ringkasan poin, atau tabel untuk ditaruh di room chat (misal: 'buatkan catatan', 'catat ini', 'buat tabel catatan', 'simpan catatan'), WAJIB sertakan blok JSON valid berikut (atau panggil tool `create_chat_note` jika tersedia):",
  `${NOTE_ARTIFACT_OPEN_TAG}{"title":"Judul Singkat","format":"paragraph|table|mixed","markdownContent":"Isi Markdown rapi dengan paragraf, poin, dan/atau tabel | Kolom 1 | Kolom 2 |"}${NOTE_ARTIFACT_CLOSE_TAG}`,
  "- Pastikan JSON di dalam blok tersebut valid (escape newline sebagai \\n di dalam string JSON) dan berikan kalimat konfirmasi singkat di luar blok bahwa catatan sudah tampil di room chat.",
  "- DILARANG mengaku sudah membuat atau menaruh catatan di room chat tanpa benar-benar memanggil tool `create_chat_note` atau menyertakan blok `[[NOTE_ARTIFACT]]...[[/NOTE_ARTIFACT]]`.",
].join("\n");

function normalizeNoteFormat(
  rawFormat: unknown,
  markdownContent: string
): ChatNoteFormat {
  const lower = String(rawFormat || "").toLowerCase().trim();
  if (lower === "paragraph" || lower === "table" || lower === "mixed") {
    return lower;
  }
  const hasTable = /\|.+\|\s*\n\s*\|[\s:-]+\|/m.test(markdownContent);
  const hasProse = markdownContent
    .split("\n")
    .some((line) => line.trim() && !line.trim().startsWith("|"));
  if (hasTable && hasProse) return "mixed";
  if (hasTable) return "table";
  return "paragraph";
}

export function normalizeChatNoteArtifact(
  input: unknown
): ChatNoteArtifact | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const markdownContent = String(
    raw.markdownContent ?? raw.content ?? raw.markdown ?? ""
  ).trim();
  if (!markdownContent) return null;

  const title =
    String(raw.title ?? "").trim() || "Catatan Formulasi R&D";
  const format = normalizeNoteFormat(raw.format, markdownContent);
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

  return {
    title,
    format,
    markdownContent,
    createdAt,
  };
}

export function encodeChatNoteMessage(note: ChatNoteArtifact): string {
  return `${NOTE_ARTIFACT_OPEN_TAG}${JSON.stringify(note)}${NOTE_ARTIFACT_CLOSE_TAG}`;
}

export function parseChatNoteMessage(content: string): ChatNoteArtifact | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (
    !trimmed.startsWith(NOTE_ARTIFACT_OPEN_TAG) ||
    !trimmed.endsWith(NOTE_ARTIFACT_CLOSE_TAG)
  ) {
    return null;
  }
  const inner = trimmed
    .slice(NOTE_ARTIFACT_OPEN_TAG.length, -NOTE_ARTIFACT_CLOSE_TAG.length)
    .trim();
  try {
    const parsed = JSON.parse(inner);
    return normalizeChatNoteArtifact(parsed);
  } catch {
    return null;
  }
}

export function extractNoteArtifactsFromReply(rawText: string): {
  cleanReplyText: string;
  notes: ChatNoteArtifact[];
} {
  if (!rawText || !rawText.includes(NOTE_ARTIFACT_OPEN_TAG)) {
    return { cleanReplyText: rawText, notes: [] };
  }

  const notes: ChatNoteArtifact[] = [];
  const regex = /\[\[NOTE_ARTIFACT\]\]([\s\S]*?)\[\[\/NOTE_ARTIFACT\]\]/gi;

  const stripped = rawText.replace(regex, (_, jsonPayload: string) => {
    const candidate = String(jsonPayload || "").trim();
    if (!candidate) return "";
    try {
      const parsed = JSON.parse(candidate);
      const normalized = normalizeChatNoteArtifact(parsed);
      if (normalized) {
        notes.push(normalized);
      }
    } catch {
      // Attempt gentle recovery if model emitted unescaped newlines inside JSON
      try {
        const sanitized = candidate.replace(/\r?\n/g, "\\n");
        const parsed = JSON.parse(sanitized);
        const normalized = normalizeChatNoteArtifact(parsed);
        if (normalized) {
          notes.push(normalized);
        }
      } catch {
        // Ignore malformed block
      }
    }
    return "";
  });

  return {
    cleanReplyText: stripped.replace(/\n{3,}/g, "\n\n").trim(),
    notes,
  };
}

export function formatNoteForHistoryContext(note: ChatNoteArtifact): string {
  return `[Catatan Room Chat — ${note.title}]\n${note.markdownContent}`;
}

// ============================================================================
// GOOGLE DOCS ARTIFACT PROTOCOL (`create_google_doc` / `[[GDOC_ARTIFACT]]`)
// ============================================================================

export type GoogleDocArtifactStatus = "draft" | "creating" | "created" | "error";

export interface GoogleDocArtifact {
  title: string;
  markdownContent: string;
  status?: GoogleDocArtifactStatus;
  docId?: string;
  docUrl?: string;
  createdAt?: string;
}

export const GDOC_ARTIFACT_OPEN_TAG = "[[GDOC_ARTIFACT]]";
export const GDOC_ARTIFACT_CLOSE_TAG = "[[/GDOC_ARTIFACT]]";

/**
 * Gemini Function Declaration for `create_google_doc` (compatible with both
 * Gemini Live API WebSocket `setup.tools` and `@google/genai` generateContent).
 */
export const CREATE_GOOGLE_DOC_TOOL_DECLARATION = {
  name: "create_google_doc",
  description:
    "Membuat file Google Docs asli yang terhubung ke Google Drive pengguna langsung dari room chat Formylab.ai, lengkap dengan judul, paragraf, daftar poin, dan/atau tabel Markdown rapi.",
  parameters: {
    type: "OBJECT",
    properties: {
      title: {
        type: "STRING",
        description:
          "Judul file Google Docs yang jelas dan profesional (misal: 'Formula Serum Niacinamide 5% & Estimasi HPP').",
      },
      markdownContent: {
        type: "STRING",
        description:
          "Konten lengkap dokumen dalam Markdown standar (heading ##/###, paragraf terstruktur, daftar poin, dan/atau tabel Markdown valid). Jika sebelumnya sudah ada catatan/formula/tabel di room chat, WAJIB masukkan seluruh isinya secara lengkap tanpa dikosongkan.",
      },
    },
    required: ["title", "markdownContent"],
  },
} as const;

export const GDOC_ARTIFACT_LIVE_DIRECTIVE = [
  "ATURAN WAJIB SKILL BUAT GOOGLE DOCS (`create_google_doc`):",
  "- Setiap kali pengguna meminta dibuatkan file Google Docs atau disimpan ke Google Drive (misal: 'buatkan Google Docs', 'simpan ke Google Drive', 'ekspor catatan ini ke Docs', 'bikin dokumen Google Docs dari formula ini'), kamu WAJIB memanggil function/tool `create_google_doc` dengan `title` dan `markdownContent` yang lengkap & rapi.",
  "- Jika sebelumnya sudah ada catatan, formula, atau tabel yang dibahas di percakapan, WAJIB sertakan seluruh isi catatan/formula/tabel tersebut secara lengkap ke dalam `markdownContent` (jangan dikosongkan atau hanya menulis ringkasan kosong).",
  "- Setelah memanggil `create_google_doc`, konfirmasi singkat secara lisan (1 kalimat natural) bahwa dokumen Google Docs sudah siap di room chat.",
  "- DILARANG KERAS mengaku sudah membuat file Google Docs atau menyimpan ke Google Drive tanpa benar-benar memanggil tool `create_google_doc`.",
].join("\n");

export const GDOC_ARTIFACT_FALLBACK_DIRECTIVE = [
  "ATURAN WAJIB SKILL BUAT GOOGLE DOCS:",
  "- Jika dan hanya jika pengguna meminta dibuatkan file Google Docs atau disimpan ke Google Drive (misal: 'buatkan Google Docs', 'simpan ke Google Drive', 'jadikan Google Docs'), WAJIB panggil tool `create_google_doc` jika tersedia ATAU sertakan blok JSON valid berikut:",
  `${GDOC_ARTIFACT_OPEN_TAG}{"title":"Judul Dokumen Google Docs","markdownContent":"Konten lengkap Markdown (heading, paragraf, poin, dan/atau tabel | Kolom 1 | Kolom 2 |)"}${GDOC_ARTIFACT_CLOSE_TAG}`,
  "- Jika sebelumnya sudah ada catatan/formula/tabel di riwayat chat, WAJIB masukkan seluruh isi catatan/formula/tabel tersebut secara lengkap ke dalam `markdownContent` (jangan dikosongkan).",
  "- Pastikan JSON valid (escape newline sebagai \\n) dan tulis 1 kalimat konfirmasi singkat di luar blok. DILARANG mengaku sudah membuat file Google Docs tanpa benar-benar memanggil tool atau menyertakan blok `[[GDOC_ARTIFACT]]...[[/GDOC_ARTIFACT]]`.",
].join("\n");

export function normalizeGoogleDocArtifact(
  input: unknown
): GoogleDocArtifact | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const markdownContent = String(
    raw.markdownContent ?? raw.content ?? raw.markdown ?? ""
  ).trim();
  if (!markdownContent) return null;

  const title =
    String(raw.title ?? "").trim() || "Dokumen Formulasi Formylab.ai";
  const rawStatus = String(raw.status ?? "").toLowerCase().trim();
  const status: GoogleDocArtifactStatus =
    rawStatus === "created" ||
    rawStatus === "creating" ||
    rawStatus === "error" ||
    rawStatus === "draft"
      ? rawStatus
      : raw.docUrl
        ? "created"
        : "draft";

  const docId =
    typeof raw.docId === "string" && raw.docId.trim()
      ? raw.docId.trim()
      : undefined;
  const docUrl =
    typeof raw.docUrl === "string" && raw.docUrl.trim()
      ? raw.docUrl.trim()
      : undefined;
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

  return {
    title,
    markdownContent,
    status,
    docId,
    docUrl,
    createdAt,
  };
}

export function encodeGoogleDocMessage(doc: GoogleDocArtifact): string {
  return `${GDOC_ARTIFACT_OPEN_TAG}${JSON.stringify(doc)}${GDOC_ARTIFACT_CLOSE_TAG}`;
}

export function parseGoogleDocMessage(
  content: string
): GoogleDocArtifact | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (
    !trimmed.startsWith(GDOC_ARTIFACT_OPEN_TAG) ||
    !trimmed.endsWith(GDOC_ARTIFACT_CLOSE_TAG)
  ) {
    return null;
  }
  const inner = trimmed
    .slice(GDOC_ARTIFACT_OPEN_TAG.length, -GDOC_ARTIFACT_CLOSE_TAG.length)
    .trim();
  try {
    const parsed = JSON.parse(inner);
    return normalizeGoogleDocArtifact(parsed);
  } catch {
    return null;
  }
}

export function extractGoogleDocArtifactsFromReply(rawText: string): {
  cleanReplyText: string;
  googleDocs: GoogleDocArtifact[];
} {
  if (!rawText || !rawText.includes(GDOC_ARTIFACT_OPEN_TAG)) {
    return { cleanReplyText: rawText, googleDocs: [] };
  }

  const googleDocs: GoogleDocArtifact[] = [];
  const regex = /\[\[GDOC_ARTIFACT\]\]([\s\S]*?)\[\[\/GDOC_ARTIFACT\]\]/gi;

  const stripped = rawText.replace(regex, (_, jsonPayload: string) => {
    const candidate = String(jsonPayload || "").trim();
    if (!candidate) return "";
    try {
      const parsed = JSON.parse(candidate);
      const normalized = normalizeGoogleDocArtifact(parsed);
      if (normalized) {
        googleDocs.push(normalized);
      }
    } catch {
      try {
        const sanitized = candidate.replace(/\r?\n/g, "\\n");
        const parsed = JSON.parse(sanitized);
        const normalized = normalizeGoogleDocArtifact(parsed);
        if (normalized) {
          googleDocs.push(normalized);
        }
      } catch {
        // Ignore malformed block
      }
    }
    return "";
  });

  return {
    cleanReplyText: stripped.replace(/\n{3,}/g, "\n\n").trim(),
    googleDocs,
  };
}

export function formatGoogleDocForHistoryContext(
  doc: GoogleDocArtifact
): string {
  const linkInfo = doc.docUrl ? ` (Google Docs: ${doc.docUrl})` : "";
  return `[Dokumen Google Docs — ${doc.title}${linkInfo}]\n${doc.markdownContent}`;
}

// ============================================================================
// GOOGLE SEARCH GROUNDING SOURCES & ANTI-KEKEH FACT-CHECK PROTOCOL
// ============================================================================

export interface WebSourceCitation {
  title: string;
  url: string;
  domain: string;
}

export const WEB_SEARCH_TOOL_DECLARATION = {
  name: "web_search",
  description:
    "Mencari informasi fakta terbaru dan terverifikasi dari internet (Google Search), termasuk regulasi BPOM/Halal terbaru, warna logo/makara institusi, berita terkini, harga bahan baku, profil organisasi/tokoh, serta memverifikasi ulang saat pengguna mengoreksi atau meragukan jawaban sebelumnya.",
  parameters: {
    type: "OBJECT",
    properties: {
      query: {
        type: "STRING",
        description:
          "Kata kunci pencarian Google yang spesifik, ringkas, dan akurat (misal: 'warna makara UI Fakultas Farmasi', 'batas aman BPOM Retinol kosmetik terbaru').",
      },
    },
    required: ["query"],
  },
} as const;

export const FACT_CHECK_ANTI_KEKEH_DIRECTIVE = [
  "ATURAN WAJIB VERIFIKASI FAKTA INTERNET & ANTI-KEKEH (ZERO HALLUCINATION):",
  "1. WAJIB CEK INTERNET UNTUK FAKTA SPESIFIK & TERBARU: Kapan pun pengguna menanyakan fakta spesifik atau terkini (misalnya warna logo/makara institusi atau kampus, regulasi BPOM/Halal terbaru, harga bahan baku terkini, berita, profil tokoh/perusahaan, tren pasar, atau detail apa pun yang kamu tidak 100% yakin), WAJIB gunakan pencarian internet (Google Search / tool `web_search`) terlebih dahulu sebelum menjawab.",
  "2. DILARANG KEKEH SAAT DIKOREKSI PENGGUNA (WAJIB CEK ULANG): Jika pengguna menyatakan jawabanmu keliru, meragukan, atau mengoreksimu (misal: 'Perasaan salah deh', 'Bukan itu', 'Masa sih?', 'Yakin?', 'Coba cek lagi'), DILARANG KERAS membela diri, ngeyel, atau mempertahankan jawaban lama. Segera lakukan pencarian internet ulang untuk memverifikasi fakta yang benar, akui kesalahanmu secara jujur dan rendah hati, lalu sampaikan informasi terverifikasi dengan jelas.",
  "3. JUJUR BILA BELUM TERVERIFIKASI: Jangan pernah mengarang fakta, angka regulasi, warna identitas, atau kutipan. Jika hasil pencarian tidak memuat informasi yang pasti, sampaikan secara transparan apa yang berhasil ditemukan.",
].join("\n");

export const WEB_SEARCH_LIVE_DIRECTIVE = [
  "ATURAN WAJIB PENCARIAN WEB REAL-TIME DI MODE SUARA (`web_search`):",
  "- Kapan pun pengguna menanyakan fakta spesifik/terbaru ATAU mengoreksi/meragukan jawabanmu (misal: 'Perasaan salah deh', 'Bukan itu', 'Masa sih?'), katakan dulu secara singkat dan natural seperti 'Bentar ya, aku cek dulu biar pasti', lalu WAJIB panggil tool `web_search` dengan query yang tepat.",
  "- Setelah menerima hasil dari `web_search`, jika sebelumnya jawabanmu keliru, akui kesalahanmu secara hangat dan langsung sampaikan fakta yang benar dari hasil pencarian.",
].join("\n");

function extractDisplayDomain(url: string, title?: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./i, "").toLowerCase();
    // Gemini Google Search grounding often returns vertexaisearch redirect URLs whose `title` holds the real publisher domain
    if (
      host.includes("vertexaisearch.cloud.google.com") ||
      host.includes("google.com")
    ) {
      const cleanTitle = (title || "").trim();
      const domainLikeMatch = cleanTitle.match(
        /([a-z0-9-]+(?:\.[a-z0-9-]+)+)/i
      );
      if (domainLikeMatch) {
        return domainLikeMatch[1].replace(/^www\./i, "").toLowerCase();
      }
      if (cleanTitle && cleanTitle.length <= 36) {
        return cleanTitle;
      }
    }
    return host;
  } catch {
    return (title || "sumber-web").trim().slice(0, 32);
  }
}

export function normalizeWebSourceCitation(
  input: unknown
): WebSourceCitation | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;
  const rawUrl = String(raw.url ?? raw.uri ?? "").trim();
  if (!/^https?:\/\//i.test(rawUrl)) return null;

  const rawTitle = String(raw.title ?? "").trim();
  const domain =
    typeof raw.domain === "string" && raw.domain.trim()
      ? raw.domain.trim().replace(/^www\./i, "")
      : extractDisplayDomain(rawUrl, rawTitle);
  const title = rawTitle || domain;

  return {
    title,
    url: rawUrl,
    domain,
  };
}

export function extractWebSourcesFromGroundingMetadata(
  groundingMetadata: unknown,
  maxSources = 6
): WebSourceCitation[] {
  if (!groundingMetadata || typeof groundingMetadata !== "object") return [];
  const meta = groundingMetadata as {
    groundingChunks?: Array<{
      web?: { uri?: string; title?: string };
      retrievedContext?: { uri?: string; title?: string };
    }>;
  };

  const chunks = Array.isArray(meta.groundingChunks)
    ? meta.groundingChunks
    : [];
  const seen = new Set<string>();
  const results: WebSourceCitation[] = [];

  for (const chunk of chunks) {
    const candidate = chunk?.web || chunk?.retrievedContext;
    if (!candidate?.uri) continue;
    const normalized = normalizeWebSourceCitation({
      url: candidate.uri,
      title: candidate.title,
    });
    if (!normalized) continue;

    const dedupeKey = `${normalized.domain.toLowerCase()}::${normalized.url}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    results.push(normalized);
    if (results.length >= maxSources) break;
  }

  return results;
}

export function mergeUniqueWebSources(
  first: WebSourceCitation[],
  second: WebSourceCitation[],
  maxSources = 6
): WebSourceCitation[] {
  const seen = new Set<string>();
  const merged: WebSourceCitation[] = [];
  for (const item of [...first, ...second]) {
    const normalized = normalizeWebSourceCitation(item);
    if (!normalized) continue;
    const key = `${normalized.domain.toLowerCase()}::${normalized.url}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(normalized);
      if (merged.length >= maxSources) break;
    }
  }
  return merged;
}

// ============================================================================
// STRUCTURED FORMULA TABLE ARTIFACT (`create_formula_table` / `[[FORMULA_TABLE]]`)
// ============================================================================

export interface FormulaTableArtifact {
  title: string;
  subtitle?: string;
  columns: string[];
  rows: string[][];
  notes?: string;
  createdAt?: string;
}

export const FORMULA_TABLE_OPEN_TAG = "[[FORMULA_TABLE]]";
export const FORMULA_TABLE_CLOSE_TAG = "[[/FORMULA_TABLE]]";

export function normalizeFormulaTableArtifact(
  input: unknown
): FormulaTableArtifact | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Record<string, unknown>;

  const rawColumns = Array.isArray(raw.columns)
    ? raw.columns.map((c) => String(c ?? "").trim()).filter(Boolean)
    : [];
  const rawRows = Array.isArray(raw.rows)
    ? raw.rows
        .filter((r) => Array.isArray(r))
        .map((r) => (r as unknown[]).map((cell) => String(cell ?? "").trim()))
        .filter((r) => r.some((cell) => cell.length > 0))
    : [];

  if (rawColumns.length === 0 || rawRows.length === 0) return null;

  const title =
    String(raw.title ?? "").trim() || "Tabel Formulasi Kosmetik R&D";
  const subtitle =
    typeof raw.subtitle === "string" && raw.subtitle.trim()
      ? raw.subtitle.trim()
      : undefined;
  const notes =
    typeof raw.notes === "string" && raw.notes.trim()
      ? raw.notes.trim()
      : undefined;
  const createdAt =
    typeof raw.createdAt === "string" && raw.createdAt.trim()
      ? raw.createdAt.trim()
      : new Date().toLocaleTimeString("id-ID", {
          hour: "2-digit",
          minute: "2-digit",
        });

  const normalizedRows = rawRows.map((row) =>
    rawColumns.map((_, idx) => row[idx] ?? "-")
  );

  return {
    title,
    subtitle,
    columns: rawColumns,
    rows: normalizedRows,
    notes,
    createdAt,
  };
}

export function encodeFormulaTableMessage(table: FormulaTableArtifact): string {
  return `${FORMULA_TABLE_OPEN_TAG}${JSON.stringify(table)}${FORMULA_TABLE_CLOSE_TAG}`;
}

export function parseFormulaTableMessage(
  content: string
): FormulaTableArtifact | null {
  if (!content) return null;
  const trimmed = content.trim();
  if (
    !trimmed.startsWith(FORMULA_TABLE_OPEN_TAG) ||
    !trimmed.endsWith(FORMULA_TABLE_CLOSE_TAG)
  ) {
    return null;
  }
  const inner = trimmed
    .slice(FORMULA_TABLE_OPEN_TAG.length, -FORMULA_TABLE_CLOSE_TAG.length)
    .trim();
  try {
    return normalizeFormulaTableArtifact(JSON.parse(inner));
  } catch {
    return null;
  }
}

function escapePipe(cell: string): string {
  return cell.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
}

export function formulaTableToMarkdown(table: FormulaTableArtifact): string {
  const lines: string[] = [`## ${table.title}`];
  if (table.subtitle) {
    lines.push(table.subtitle);
  }
  lines.push("");
  lines.push(`| ${table.columns.map(escapePipe).join(" | ")} |`);
  lines.push(`| ${table.columns.map(() => "---").join(" | ")} |`);
  for (const row of table.rows) {
    lines.push(
      `| ${table.columns.map((_, idx) => escapePipe(row[idx] ?? "-")).join(" | ")} |`
    );
  }
  if (table.notes) {
    lines.push("");
    lines.push(`**Catatan Proses & Keamanan:** ${table.notes}`);
  }
  return lines.join("\n");
}

export function formatFormulaTableForHistoryContext(
  table: FormulaTableArtifact
): string {
  return `[Tabel Formulasi — ${table.title}]\n${formulaTableToMarkdown(table)}`;
}

export function extractFormulatorDraftFromTable(table: FormulaTableArtifact): {
  formulaName: string;
  productType: string;
  skinTarget: string;
  primarySkinTarget: string;
  targetPh: string;
  customIngredients: string[];
  batchSize: string;
} {
  const combinedMeta = `${table.title} ${table.subtitle || ""} ${table.notes || ""}`;
  const lowerCols = table.columns.map((c) => c.toLowerCase());
  const ingColIdx = Math.max(
    0,
    lowerCols.findIndex((c) => /bahan|ingredient|inci|komponen|nama/i.test(c))
  );
  const pctColIdx = lowerCols.findIndex((c) => /%|persen|konsentrasi|dosis/i.test(c));

  const customIngredients: string[] = [];
  for (const row of table.rows) {
    const ing = (row[ingColIdx] || "").trim();
    if (!ing || /^(total|jumlah|subtotal|-)$/i.test(ing)) continue;
    const pct = pctColIdx >= 0 ? (row[pctColIdx] || "").trim() : "";
    customIngredients.push(pct && pct !== "-" ? `${ing} (${pct})` : ing);
  }

  const phMatch = combinedMeta.match(/pH\s*[:=]?\s*(\d+(?:[.,]\d+)?(?:\s*[-–]\s*\d+(?:[.,]\d+)?)?)/i);
  const targetPh = phMatch ? phMatch[1].replace(/,/g, ".") : "5.5";

  let skinTarget = "Sensitive";
  if (/berminyak|oily|acne|jerawat/i.test(combinedMeta)) skinTarget = "Oily / Acne-Prone";
  else if (/kering|dry|dehidrasi/i.test(combinedMeta)) skinTarget = "Dry";
  else if (/kusam|bright|cerah|flek/i.test(combinedMeta)) skinTarget = "Dull / Hyperpigmentation";
  else if (/aging|kerut|elastis/i.test(combinedMeta)) skinTarget = "Mature / Anti-Aging";
  else if (/normal|kombinasi|semua/i.test(combinedMeta)) skinTarget = "All Skin Types";

  return {
    formulaName: table.title,
    productType: table.title,
    skinTarget,
    primarySkinTarget: skinTarget,
    targetPh,
    customIngredients,
    batchSize: "100",
  };
}


