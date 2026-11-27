import { Type, type FunctionDeclaration } from "@google/genai";
import {
  type FormulaTableArtifact,
  formatFormulaTableForHistoryContext,
  formatGoogleDocForHistoryContext,
  formatNoteForHistoryContext,
  parseChatNoteMessage,
  parseFormulaTableMessage,
  parseGoogleDocMessage,
} from "./chatNoteUtils";

export type LiveVoiceName = "Aoede" | "Zephyr" | "Kore" | "Puck";

export type LiveVoiceFsmState =
  | "IDLE"
  | "CONNECTING"
  | "LISTENING"
  | "AI_SPEAKING"
  | "TOOL_EXECUTING"
  | "ERROR";

export type LiveConnectionStatus =
  | "connecting"
  | "listening"
  | "speaking"
  | "error";

export const LIVE_VOICE_OPTIONS: ReadonlyArray<{
  id: LiveVoiceName;
  label: string;
  hint: string;
}> = [
  { id: "Aoede", label: "Aoede", hint: "Hangat & luwes" },
  { id: "Zephyr", label: "Zephyr", hint: "Cerah & ramah" },
  { id: "Kore", label: "Kore", hint: "Tegas & jernih" },
  { id: "Puck", label: "Puck", hint: "Santai & ekspresif" },
];

export const LIVE_STATUS_LABELS: Record<LiveConnectionStatus, string> = {
  connecting: "Menghubungkan Live Audio...",
  listening: "Live · Mendengarkan",
  speaking: "Live · AI Berbicara",
  error: "Koneksi Live Terputus",
};

export const LIVE_FSM_STATUS_LABELS: Record<LiveVoiceFsmState, string> = {
  IDLE: "Live · Siap",
  CONNECTING: "Menghubungkan Live Audio...",
  LISTENING: "Live · Mendengarkan",
  AI_SPEAKING: "Live · AI Berbicara",
  TOOL_EXECUTING: "Live · Menyiapkan Aksi...",
  ERROR: "Koneksi Live Terputus",
};

// Audio capture & playback ring buffer constants
export const LIVE_INPUT_TARGET_SAMPLE_RATE = 16000;
export const LIVE_INPUT_CHUNK_SAMPLES = 320; // exact 20ms @ 16kHz
export const LIVE_HIGHPASS_CUTOFF_HZ = 100;
export const LIVE_HIGHPASS_Q = 0.7;

export const LIVE_PLAYBACK_SAMPLE_RATE = 24000;
export const LIVE_PLAYBACK_PREBUFFER_MS = 120;
export const LIVE_PLAYBACK_PREBUFFER_SAMPLES = 2880; // exact 120ms @ 24kHz
export const LIVE_PLAYBACK_RING_SECONDS = 30;
export const LIVE_PLAYBACK_FADE_IN_MS = 3;
export const LIVE_PLAYBACK_FADE_OUT_MS = 5;

// Echo guard, watchdogs, memory & rotation constants
export const LIVE_TRANSCRIPT_THROTTLE_MS = 80;
export const LIVE_ECHO_GUARD_TAIL_MS = 350;
export const LIVE_SPEECH_QUIET_CONFIRM_MS = 260;
export const LIVE_STANDBY_PREWARM_TURN = 7;
export const LIVE_HOTSWAP_TARGET_TURN = 8;
export const LIVE_STANDBY_MAX_AGE_MS = 150_000;
export const LIVE_TURN_WATCHDOG_MS = 10_000;
export const LIVE_TOOL_RECOVERY_MS = 8_000;
export const LIVE_TOOL_TIMEOUT_MS = 20_000;
export const LIVE_MAX_AUTO_RECONNECTS = 2;
export const LIVE_MEMORY_RECENT_MESSAGES = 16;

export const LIVE_CONTEXT_WINDOW_COMPRESSION = {
  triggerTokens: "12000",
  slidingWindow: {
    targetTokens: "6000",
  },
} as const;

export const NON_LATIN_HALLUCINATION_SCRIPT_RE =
  /[\u0E00-\u0E7F\u0600-\u06FF\u0400-\u04FF\u3040-\u30FF\u4E00-\u9FFF\uAC00-\uD7AF]/;

const SINGLE_WORD_FILLER_RE =
  /^(oh|ooh|halo|hallo|hai|hi|hey|oke|ok|okay|ya|iya|yup|yap|hm|hmm|hmmm|eh|eeh|ah|aah|nah|sip|siap|baik|tes|test|cek|check|apa|anu|wah|duh|yah)$/i;

export interface LiveMemoryMessage {
  role: "user" | "assistant";
  content: string;
}

export interface DeterministicMemoryInput {
  longTermSummary?: string;
  latestFormulaTable?: FormulaTableArtifact | null;
  recentMessages?: ReadonlyArray<LiveMemoryMessage>;
  fallbackContext?: string;
}

export interface VoiceTurnMetric {
  turn: number;
  sessionIndex: number;
  firstAudioMs: number;
  queueDelayMs: number;
  toolsCalled: string;
  hotSwapped: "ya" | "tidak";
}

export interface VoiceMetricsSummary {
  totalTurns: number;
  avgFirstAudioTurn1To3Ms: number | null;
  avgFirstAudioTurn4PlusMs: number | null;
  hotSwapCount: number;
}

/**
 * Checks whether a text contains any non-Latin script characters (Thai, Arabic,
 * Cyrillic, Japanese Kana, CJK/Mandarin, Korean Hangul).
 */
export function hasNonLatinScript(raw: string): boolean {
  if (!raw) return false;
  return NON_LATIN_HALLUCINATION_SCRIPT_RE.test(raw);
}

/**
 * Strips system/noise tags such as `<noise>` or `<inaudible>` from Gemini Live
 * transcriptions before rendering in the chat room.
 */
export function sanitizeLiveTranscriptText(raw: string): string {
  if (!raw) return "";
  return raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

/**
 * Joins streaming transcription fragments cleanly while preventing glued words or
 * missing spaces after punctuation (e.g. `"fokuskan?Atau"` -> `"fokuskan? Atau"`,
 * `"tertentuSorry"` -> `"tertentu Sorry"`).
 */
export function appendTranscriptFragment(
  existing: string,
  incoming: string
): string {
  if (!incoming) return existing;
  if (!existing) return incoming;

  const lastChar = existing[existing.length - 1];
  const firstChar = incoming[0];

  // Already separated by whitespace
  if (/\s/.test(lastChar) || /\s/.test(firstChar)) {
    return existing + incoming;
  }

  // Previous ended with sentence/clause punctuation and next begins a word/digit
  if (/[.?!,;:]/.test(lastChar) && /[A-Za-z0-9À-ÿ"'(]/.test(firstChar)) {
    return `${existing} ${incoming}`;
  }

  // CamelCase boundary across chunks (e.g. "tertentu" + "Sorry" or "skincare" + "Atau")
  if (/[a-zà-ÿ0-9]/.test(lastChar) && /[A-ZÀ-Ý]/.test(firstChar)) {
    return `${existing} ${incoming}`;
  }

  return existing + incoming;
}

/**
 * Detects non-Latin hallucination scripts (Thai, Arabic, Cyrillic, Japanese Kana,
 * CJK/Mandarin, Korean Hangul) caused by background mic noise.
 */
export function isNonLatinHallucinationFragment(raw: string): boolean {
  const withoutTags = sanitizeLiveTranscriptText(raw);
  if (!withoutTags) return false;
  return NON_LATIN_HALLUCINATION_SCRIPT_RE.test(withoutTags);
}

/**
 * Strict User Speech Sanitizer (Module 2):
 * - Strips `<noise>`, `<inaudible>`, and stray leading punctuation.
 * - If text contains ANY non-Latin script (Mandarin/CJK, Thai, Arabic, Cyrillic,
 *   Japanese, Korean), strictly returns `""` so it NEVER appears in chat or sidebar titles!
 */
export function sanitizeUserTranscript(raw: string): string {
  const withoutTags = sanitizeLiveTranscriptText(raw);
  if (!withoutTags) return "";
  if (NON_LATIN_HALLUCINATION_SCRIPT_RE.test(withoutTags)) {
    return "";
  }
  const cleaned = withoutTags.replace(/^[.,!?;:\s\-–—]+/, "").trim();
  if (!cleaned || /^[.,!?;:\s\-–—]+$/.test(cleaned)) {
    return "";
  }
  return cleaned;
}

// Backwards-compatible alias
export const sanitizeLiveUserTranscript = sanitizeUserTranscript;

/**
 * Returns true ONLY if a candidate title text is meaningful enough for an automatic
 * sidebar session title (rejects non-Latin hallucinations, single-word fillers like
 * "Oh.", "Halo.", "Oke.", and texts shorter than 5 alphanumeric letters).
 */
export function isValidAutoSessionTitle(raw: string): boolean {
  const cleaned = sanitizeUserTranscript(raw);
  if (!cleaned) return false;
  const alnumOnly = cleaned.replace(/[^A-Za-z0-9À-ÿ]/g, "");
  if (alnumOnly.length < 5) return false;
  const words = cleaned
    .replace(/[.,!?;:"'()]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 1 && SINGLE_WORD_FILLER_RE.test(words[0])) {
    return false;
  }
  return true;
}

/**
 * Sanitizes a stored or generated sidebar title: cleans legacy titles containing
 * non-Latin characters or mumbles by recovering the first valid Indonesian user
 * prompt in the session, or falling back cleanly to `"Obrolan Baru"`.
 */
export function sanitizeSidebarSessionTitle(
  rawTitle: string,
  messages?: ReadonlyArray<{ role: string; content: string }>,
  fallback = "Obrolan Baru"
): string {
  const trimmed = (rawTitle || "").trim();
  if (
    trimmed &&
    !hasNonLatinScript(trimmed) &&
    !/^(oh|halo|oke|ya|hm)[.!?]*$/i.test(trimmed)
  ) {
    return trimmed;
  }

  if (Array.isArray(messages)) {
    for (const m of messages) {
      if (m?.role !== "user") continue;
      const candidate = sanitizeUserTranscript(m.content || "");
      if (isValidAutoSessionTitle(candidate)) {
        const clean = candidate.replace(/\s+/g, " ").trim();
        return clean.length > 38 ? `${clean.slice(0, 38)}...` : clean;
      }
    }
  }

  return fallback;
}

function expandMessageToReadableMemoryText(
  rawContent: string,
  role?: "user" | "assistant"
): string {
  const raw = (rawContent || "").trim();
  if (!raw) return "";
  const parsedTable = parseFormulaTableMessage(raw);
  if (parsedTable) {
    if (parsedTable.isLoading) return "";
    const ingList = parsedTable.rows
      .slice(0, 12)
      .map((r) => {
        const name = r[1] || r[0] || "";
        const pct = r[2] || "";
        return pct && pct !== "-" ? `${name} (${pct})` : name;
      })
      .filter(Boolean)
      .join(", ");
    const phText = parsedTable.specs?.targetPh
      ? ` | pH: ${parsedTable.specs.targetPh}`
      : "";
    return `[Tabel Formula: ${parsedTable.title}${phText} | Bahan: ${ingList}]`;
  }
  const parsedNote = parseChatNoteMessage(raw);
  if (parsedNote) {
    return formatNoteForHistoryContext(parsedNote);
  }
  const parsedDoc = parseGoogleDocMessage(raw);
  if (parsedDoc) {
    return formatGoogleDocForHistoryContext(parsedDoc);
  }
  if (role === "user") {
    return sanitizeUserTranscript(raw);
  }
  const cleanAi = sanitizeLiveTranscriptText(raw);
  return hasNonLatinScript(cleanAi) ? "" : cleanAi;
}

/**
 * Extracts the latest completed `FormulaTableArtifact` from chat room history so
 * reopening Live Voice mode immediately remembers the active formulation table.
 */
export function extractLatestFormulaTableFromMessages(
  messages: ReadonlyArray<LiveMemoryMessage> | undefined
): FormulaTableArtifact | null {
  if (!Array.isArray(messages) || messages.length === 0) return null;
  for (let i = messages.length - 1; i >= 0; i--) {
    const parsed = parseFormulaTableMessage(messages[i]?.content || "");
    if (parsed && !parsed.isLoading && parsed.rows.length > 0) {
      return parsed;
    }
  }
  return null;
}

/**
 * Deterministic 0ms local fact summary extractor used as instant fallback whenever
 * `/api/live-memory` is slow or unavailable, ensuring long-term memory stays intact.
 */
export function extractLocalFactSummaryFallback(
  messages: ReadonlyArray<LiveMemoryMessage> | undefined,
  latestFormulaTable?: FormulaTableArtifact | null,
  previousSummary?: string
): string {
  const bullets: string[] = [];
  const prev = (previousSummary || "").trim();
  if (prev) {
    bullets.push(prev.slice(0, 500));
  }

  const cleanUserMsgs = (messages || [])
    .filter((m) => m.role === "user")
    .map((m) => sanitizeUserTranscript(m.content || ""))
    .filter((t) => t.length >= 5);

  const combined = cleanUserMsgs.join(" ");

  const nameMatch = combined.match(
    /\b(?:nama\s+(?:saya|aku|gue|ku)|panggil\s+(?:saya|aku))\s+([A-Z]?[a-z]{2,18})\b/i
  );
  if (nameMatch?.[1] && !prev.toLowerCase().includes(nameMatch[1].toLowerCase())) {
    bullets.push(`Nama pengguna: ${nameMatch[1]}.`);
  }

  const productMatches = combined.match(
    /\b(moisturizer|pelembap|serum|sunscreen|toner|cleanser|facial\s*wash|cream|krim|lotion|essence|masker|lip\s*balm|body\s*lotion)\b/gi
  );
  if (productMatches && productMatches.length > 0) {
    const uniqueProducts = Array.from(
      new Set(productMatches.map((p) => p.toLowerCase()))
    ).slice(0, 3);
    const line = `Produk yang dibahas: ${uniqueProducts.join(", ")}.`;
    if (!prev.toLowerCase().includes(uniqueProducts[0])) {
      bullets.push(line);
    }
  }

  const skinMatches = combined.match(
    /\b(kulit\s+sensitif|berjerawat|acne[\s-]?prone|berminyak|oily|kering|dry|kombinasi|kusam|skin\s*barrier|bebas\s+parfum|bebas\s+alkohol|halal|bpom)\b/gi
  );
  if (skinMatches && skinMatches.length > 0) {
    const uniqueSkin = Array.from(
      new Set(skinMatches.map((s) => s.toLowerCase()))
    ).slice(0, 4);
    const line = `Target & batasan: ${uniqueSkin.join(", ")}.`;
    if (!prev.toLowerCase().includes(uniqueSkin[0])) {
      bullets.push(line);
    }
  }

  const ingredientMatches = combined.match(
    /\b(niacinamide|ceramide|alpha[\s-]?arbutin|arbutin|panthenol|squalane|butylene\s+glycol|glycerin|hyaluronic\s+acid|salicylic\s+acid|glycolic\s+acid|tranexamic\s+acid|retinol|bakuchiol|centella|cica|vitamin\s*c|peptide|zinc\s+oxide|azelaic\s+acid|kojic\s+acid|allantoin|ectoin|probiotik)\b/gi
  );
  if (ingredientMatches && ingredientMatches.length > 0) {
    const uniqueIngredients = Array.from(
      new Set(ingredientMatches.map((ing) => ing.trim()))
    ).slice(0, 6);
    const line = `Bahan pilihan: ${uniqueIngredients.join(", ")}.`;
    if (!prev.toLowerCase().includes(uniqueIngredients[0].toLowerCase())) {
      bullets.push(line);
    }
  }

  if (latestFormulaTable && !latestFormulaTable.isLoading) {
    const line = `Formula aktif terakhir: ${latestFormulaTable.title}${
      latestFormulaTable.specs?.targetPh
        ? ` (pH ${latestFormulaTable.specs.targetPh})`
        : ""
    }.`;
    if (!prev.toLowerCase().includes(latestFormulaTable.title.toLowerCase().slice(0, 18))) {
      bullets.push(line);
    }
  }

  return bullets.join("\n").trim().slice(0, 1100);
}

/**
 * Summarizes up to the last `maxMessages` room chat messages into a compact plain-text
 * memory string for backwards compatibility and tests (NEVER carries raw audio tokens).
 */
export function buildConversationMemorySummary(
  messages: ReadonlyArray<LiveMemoryMessage> | undefined,
  maxMessages = LIVE_MEMORY_RECENT_MESSAGES,
  maxWords = 500
): string {
  if (!Array.isArray(messages) || messages.length === 0) return "";

  const recent = messages.slice(-maxMessages);
  const lines: string[] = [];

  for (const msg of recent) {
    const readable = expandMessageToReadableMemoryText(msg?.content || "", msg.role);
    const compact = readable.replace(/\s+/g, " ").trim().slice(0, 380);
    if (!compact) continue;
    const prefix = msg.role === "user" ? "User" : "Formylab AI";
    lines.push(`${prefix}: ${compact}`);
  }

  if (lines.length === 0) return "";

  const joined = lines.join("\n");
  const words = joined.split(/\s+/);
  if (words.length <= maxWords) {
    return joined;
  }
  return words.slice(words.length - maxWords).join(" ");
}

/**
 * Deterministic 0ms synchronous memory prompt builder injected on INITIAL connect,
 * Hot-Swap, AND Reconnect so Voice AI remembers 100% of prior context from second 1:
 * 1) `[RINGKASAN FAKTA JANGKA PANJANG]` (persisted per chat room + local fallback)
 * 2) `[TABEL FORMULA AKTIF]` (title, all ingredients + percentages + specs + notes)
 * 3) `[16 PESAN DIALOG TERAKHIR]` (sanitized last 16 turns with `User:` / `Formylab AI:`)
 */
export function buildDeterministicMemoryPrompt(
  input: DeterministicMemoryInput
): string {
  const sections: string[] = [];

  const activeTable =
    (input.latestFormulaTable && !input.latestFormulaTable.isLoading
      ? input.latestFormulaTable
      : null) || extractLatestFormulaTableFromMessages(input.recentMessages);

  const cleanSummary =
    (input.longTermSummary || "").trim() ||
    extractLocalFactSummaryFallback(input.recentMessages, activeTable, "");

  if (cleanSummary) {
    sections.push(
      `[RINGKASAN FAKTA JANGKA PANJANG]\n${cleanSummary.slice(0, 1200)}`
    );
  }

  if (activeTable) {
    const lowerCols = activeTable.columns.map((c) => c.toLowerCase());
    const nameIdx = Math.max(
      0,
      lowerCols.findIndex((c) => /bahan|inci|ingredient|nama|komponen/i.test(c))
    );
    const pctIdx = lowerCols.findIndex((c) => /%|persen|konsentrasi/i.test(c));
    const phaseIdx = lowerCols.findIndex((c) => /fase|phase/i.test(c));
    const funcIdx = lowerCols.findIndex((c) => /fungsi|function/i.test(c));

    const tableLines: string[] = [`Judul: ${activeTable.title}`];
    if (activeTable.subtitle) {
      tableLines.push(`Ringkasan: ${activeTable.subtitle}`);
    }
    if (activeTable.specs) {
      const specParts = [
        activeTable.specs.targetPh ? `pH ${activeTable.specs.targetPh}` : "",
        activeTable.specs.texture ? `Tekstur: ${activeTable.specs.texture}` : "",
        activeTable.specs.bpomHalalNote
          ? `BPOM/Halal: ${activeTable.specs.bpomHalalNote}`
          : "",
      ].filter(Boolean);
      if (specParts.length > 0) {
        tableLines.push(`Spesifikasi: ${specParts.join(" | ")}`);
      }
    }
    const ingredientSummaries = activeTable.rows
      .map((row) => {
        const phase = phaseIdx >= 0 && row[phaseIdx] ? `[${row[phaseIdx]}] ` : "";
        const name = row[nameIdx] || row[0] || "-";
        const pct = pctIdx >= 0 && row[pctIdx] ? ` ${row[pctIdx]}` : "";
        const fn = funcIdx >= 0 && row[funcIdx] ? ` (${row[funcIdx]})` : "";
        return `- ${phase}${name}${pct}${fn}`;
      })
      .join("\n");
    if (ingredientSummaries) {
      tableLines.push(
        `Komposisi (${activeTable.totalPercentage || "100.00%"}):\n${ingredientSummaries}`
      );
    }
    if (activeTable.notes) {
      tableLines.push(`Catatan: ${activeTable.notes}`);
    }
    sections.push(`[TABEL FORMULA AKTIF]\n${tableLines.join("\n").slice(0, 2200)}`);
  }

  const dialogLines: string[] = [];
  if (Array.isArray(input.recentMessages) && input.recentMessages.length > 0) {
    const nonEmpty: Array<{ role: "user" | "assistant"; text: string }> = [];
    for (const msg of input.recentMessages) {
      const expanded = expandMessageToReadableMemoryText(
        msg?.content || "",
        msg.role
      )
        .replace(/\s+/g, " ")
        .trim();
      if (!expanded) continue;
      nonEmpty.push({
        role: msg.role,
        text: expanded.slice(0, 420),
      });
    }
    const last16 = nonEmpty.slice(-LIVE_MEMORY_RECENT_MESSAGES);
    for (const item of last16) {
      const speaker = item.role === "user" ? "User" : "Formylab AI";
      dialogLines.push(`${speaker}: ${item.text}`);
    }
  }

  if (dialogLines.length > 0) {
    sections.push(`[16 PESAN DIALOG TERAKHIR]\n${dialogLines.join("\n")}`);
  } else if (input.fallbackContext && input.fallbackContext.trim()) {
    const cleanFallback = sanitizeLiveTranscriptText(input.fallbackContext);
    if (cleanFallback && !hasNonLatinScript(cleanFallback)) {
      sections.push(
        `[16 PESAN DIALOG TERAKHIR]\nFormylab AI: ${cleanFallback.slice(0, 1200)}`
      );
    }
  }

  return sections.join("\n\n").trim().slice(0, 7200);
}

/**
 * Local <1ms keyword search over full chat history + active formula table for
 * the `recall_chat_history(keyword)` Live Voice tool.
 */
export function recallChatHistoryLocal(
  messages: ReadonlyArray<LiveMemoryMessage> | undefined,
  keyword: string,
  latestFormulaTable?: FormulaTableArtifact | null,
  maxMatches = 6
): string {
  const cleanKeyword = (keyword || "").trim().toLowerCase();
  const tokens = cleanKeyword
    .split(/[\s,.;:!?/\\-]+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const hits: Array<{ score: number; text: string }> = [];

  const effectiveTable =
    (latestFormulaTable && !latestFormulaTable.isLoading
      ? latestFormulaTable
      : null) || extractLatestFormulaTableFromMessages(messages);

  if (effectiveTable) {
    const tableText = formatFormulaTableForHistoryContext(effectiveTable);
    const lowerTable = tableText.toLowerCase();
    const score =
      tokens.length === 0
        ? 1
        : tokens.reduce((acc, tok) => acc + (lowerTable.includes(tok) ? 2 : 0), 0);
    if (score > 0) {
      hits.push({
        score: score + 2,
        text: `[Tabel Formula Aktif] ${effectiveTable.title}: ${effectiveTable.rows
          .map((r) => `${r[1] || r[0]} ${r[2] || ""}`.trim())
          .join(", ")
          .slice(0, 380)}`,
      });
    }
  }

  if (Array.isArray(messages)) {
    messages.forEach((msg, idx) => {
      const readable = expandMessageToReadableMemoryText(
        msg?.content || "",
        msg.role
      )
        .replace(/\s+/g, " ")
        .trim();
      if (!readable) return;
      const lower = readable.toLowerCase();
      const score =
        tokens.length === 0
          ? 1
          : tokens.reduce((acc, tok) => acc + (lower.includes(tok) ? 1 : 0), 0);
      if (score > 0) {
        const speaker = msg.role === "user" ? "User" : "Formylab AI";
        hits.push({
          score,
          text: `#${idx + 1} ${speaker}: ${readable.slice(0, 260)}`,
        });
      }
    });
  }

  if (hits.length === 0) {
    return `Tidak ditemukan arsip percakapan yang cocok dengan kata kunci "${keyword}".`;
  }

  const top = hits
    .sort((a, b) => b.score - a.score)
    .slice(0, maxMatches)
    .map((h) => h.text);

  return `Hasil pencarian arsip lokal untuk "${keyword}":\n${top.join("\n")}`;
}

/**
 * Unified Function Declarations for Gemini Live Voice Mode.
 * ALL 4 skills (`create_formula_table`, `save_to_google_docs`, `search_web_info`,
 * and `recall_chat_history`) are ALWAYS registered permanently & automatically across
 * ALL 4 voice chips (`Aoede`, `Zephyr`, `Kore`, `Puck`).
 */
export function buildLiveVoiceFunctionDeclarations(): FunctionDeclaration[] {
  return [
    {
      name: "create_formula_table",
      description:
        "Membuat dan menampilkan tabel R&D rinci & lengkap (8-12 bahan INCI valid 100.00%, target pH, tekstur, BPOM/Halal, dan prosedur pembuatan, atau tabel perbandingan mendalam) langsung di room chat.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          topic: {
            type: Type.STRING,
            description:
              "Jenis/judul produk atau topik perbandingan (misal: 'Moisturizer Barrier Kulit Sensitif dengan Butylene Glycol & Arbutin').",
          },
          key_ingredients: {
            type: Type.STRING,
            description:
              "Bahan aktif atau bahan utama yang diminta pengguna (opsional, misal: 'Butylene Glycol, Alpha Arbutin, Ceramide NP, Panthenol').",
          },
          constraints: {
            type: Type.STRING,
            description:
              "Target kulit, pH, tekstur, bebas alkohol/parfum, atau batasan khusus dari pengguna (opsional).",
          },
          table_type: {
            type: Type.STRING,
            enum: ["formulation", "comparison", "general"],
            description:
              "Jenis tabel: 'formulation' untuk resep formulasi kosmetik 100%, 'comparison' untuk perbandingan bahan/produk, atau 'general' untuk tabel informasi umum.",
          },
        },
        required: ["topic", "table_type"],
      },
    },
    {
      name: "save_to_google_docs",
      description:
        "Menyimpan resep, tabel formulasi terakhir, atau catatan diskusi lengkap ke dokumen Google Docs di Google Drive user.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description: "Judul file Google Docs yang jelas dan profesional.",
          },
          content: {
            type: Type.STRING,
            description:
              "Isi catatan atau formula yang terstruktur rapi (Markdown/paragraf/poin).",
          },
          include_latest_table: {
            type: Type.BOOLEAN,
            description:
              "Jika true, otomatis ikutkan data tabel formulasi lengkap terakhir yang tampil di chat ke dalam dokumen Google Docs.",
          },
        },
        required: ["title", "content"],
      },
    },
    {
      name: "search_web_info",
      description:
        "Mencari informasi terkini dan terverifikasi dari internet (Google Search) seperti tren skincare terbaru, berita terbaru, harga bahan baku terbaru, regulasi BPOM/Halal terbaru, atau fakta eksternal.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          query: {
            type: Type.STRING,
            description: "Kata kunci pencarian Google yang singkat dan spesifik.",
          },
        },
        required: ["query"],
      },
    },
    {
      name: "recall_chat_history",
      description:
        "Mencari arsip percakapan lama atau detail formula sebelumnya secara lokal (< 1ms) berdasarkan kata kunci.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          keyword: {
            type: Type.STRING,
            description:
              "Kata kunci yang ingin dicari di riwayat percakapan (misal: nama bahan, nama user, target pH, atau produk sebelumnya).",
          },
        },
        required: ["keyword"],
      },
    },
  ];
}

/**
 * Natural GPT-Voice Indonesian Persona (Module 2 + Module 5):
 * - Strict Indonesian language lock on line 1.
 * - Warm, smooth, conversational R&D partner rhythm with natural comma/period pauses.
 * - Automatic seamless tool calling across all 4 skills (`search_web_info`, `create_formula_table`,
 *   `save_to_google_docs`, `recall_chat_history`).
 * - Deterministic full memory injection from second 1 (`[RINGKASAN FAKTA JANGKA PANJANG]`,
 *   `[TABEL FORMULA AKTIF]`, `[16 PESAN DIALOG TERAKHIR]`).
 */
export function buildLiveVoiceSystemInstruction(
  memorySummary?: string
): string {
  const lines = [
    "ATURAN BAHASA MUTLAK: User selalu berbicara dalam Bahasa Indonesia (sesekali menyebut istilah bahan kosmetik/INCI berbahasa Inggris). Selalu tafsirkan ucapan user sebagai Bahasa Indonesia dan SELALU balas dalam Bahasa Indonesia lisan yang sangat natural. Abaikan noise/suara singkat yang tidak jelas tanpa perlu merespons atau meminta maaf.",
    "",
    "Kamu adalah rekan senior R&D kosmetik Formylab.ai yang sedang mengobrol santai lewat telepon dengan pengguna.",
    "Gaya bicara wajib mengalir mulus, hangat, dan manusiawi ala GPT Voice (BUKAN kaku seperti membaca teks formal):",
    "- Gunakan Bahasa Indonesia percakapan sehari-hari yang ramah, akrab, dan to the point (misal 'Oke siap', 'Nah kalau buat kulit sensitif...', 'Boleh banget, jadi gini...').",
    "- Gunakan tanda baca koma dan titik secara alami untuk jeda napas, maksimal 2 sampai 3 kalimat padat per giliran bicara.",
    "- DILARANG membacakan simbol markdown, tanda kurung, atau daftar tabel/persentase panjang lewat suara.",
    "- Jangan pernah menyapa user dengan nama bahan kosmetik.",
    "",
    "KEMAMPUAN TOOL OTOMATIS (SELALU AKTIF TANPA TOMBOL TERPISAH):",
    "- Jika user menanyakan tren skincare/kosmetik terbaru, harga bahan terkini, regulasi BPOM/Halal terbaru, berita, atau fakta eksternal, langsung panggil `search_web_info` tanpa ragu lalu sampaikan intinya dengan santai seolah baru saja mengecek data terbaru. Untuk obrolan biasa atau konsep dasar, jawab langsung tanpa memanggil search agar tetap super cepat.",
    "- Kapan pun user minta tabel resep detail, formula lengkap, atau perbandingan bahan, JANGAN PERNAH menolak—langsung panggil `create_formula_table` dengan `topic`, `key_ingredients`, `constraints`, dan `table_type` ('formulation' | 'comparison' | 'general'). Setelah tabel tampil di room chat, sampaikan ringkasan 1 sampai 2 kalimat hangat lewat suara.",
    "- Kapan pun user minta simpan ke Google Docs atau Google Drive, langsung panggil `save_to_google_docs` (set `include_latest_table: true` jika merujuk tabel terakhir di chat).",
    "- Kapan pun user menanyakan sesuatu yang dibahas jauh sebelumnya di chat ini, langsung panggil `recall_chat_history` dengan kata kunci terkait.",
  ];

  const cleanMemory =
    typeof memorySummary === "string" ? memorySummary.trim() : "";
  if (cleanMemory) {
    lines.push("");
    lines.push("[MEMORI PERCAKAPAN SEBELUMNYA]");
    lines.push(cleanMemory);
    lines.push(
      "Lanjutkan percakapan secara mulus tanpa mengulang salam pembuka jika konteks di atas sudah berjalan. Ingat penuh nama user, topik sebelumnya, bahan yang dipilih, dan tabel formula aktif di atas."
    );
  }

  return lines.join("\n");
}

/**
 * Zero-latency (0 ms) local keyword classifier for `PILAR AI AKTIF` badges
 * below voice turns — never makes a second LLM call.
 */
export function classifyLiveVoicePillars(
  userText: string,
  aiText: string,
  usedGoogleSearch = false
): string[] {
  const combined = `${userText || ""} ${aiText || ""}`.toLowerCase();
  const pillars: string[] = ["Interactive AI"];

  const analyticalPattern =
    /\b(ph|hlb|viskositas|viscosity|stabilitas|emulsi|bpom|halal|persen|%|gram|ml|mg|hpp|bom|harga|regulasi|audit|uji|batch|konsentrasi|kompatibilitas|iritasi|toksisitas|spf|uv|rumus|hitung|perbandingan|bandingkan|cari|berita|tren|terbaru|fakta|data|riset|studi|jurnal)\b/i;

  const generativePattern =
    /\b(buat|buatkan|racik|formulasi|formula|resep|serum|krim|cream|gel|toner|cleanser|sunscreen|moisturizer|pelembap|ide|konsep|alternatif|substitusi|ganti|rekomendasi|saran|catatan|tabel|dokumen|google docs|brief|strategi)\b/i;

  if (generativePattern.test(combined) || aiText.trim().length > 24) {
    pillars.push("Generative AI");
  }

  if (usedGoogleSearch || analyticalPattern.test(combined)) {
    pillars.push("Analytical AI");
  }

  return Array.from(new Set(pillars));
}

/**
 * Summarizes Turn #1-3 vs Turn #4+ latency averages for `window.__formylabVoiceStats()`.
 */
export function summarizeVoiceMetrics(
  metrics: ReadonlyArray<VoiceTurnMetric>
): VoiceMetricsSummary {
  const turn1To3 = metrics.filter(
    (m) => m.turn >= 1 && m.turn <= 3 && m.firstAudioMs > 0
  );
  const turn4Plus = metrics.filter((m) => m.turn >= 4 && m.firstAudioMs > 0);

  const avg = (arr: VoiceTurnMetric[]) =>
    arr.length === 0
      ? null
      : Math.round(
          arr.reduce((sum, item) => sum + item.firstAudioMs, 0) / arr.length
        );

  return {
    totalTurns: metrics.length,
    avgFirstAudioTurn1To3Ms: avg(turn1To3),
    avgFirstAudioTurn4PlusMs: avg(turn4Plus),
    hotSwapCount: metrics.filter((m) => m.hotSwapped === "ya").length,
  };
}

/**
 * Pure TypeScript reference implementation of our 24kHz Circular Ring Buffer Playback
 * engine (mirrors `FormylabLivePcmPlaybackProcessor` inside the AudioWorklet) so we can
 * deterministically unit-test 120ms pre-buffering, short-turn `turnComplete` flush,
 * 3ms fade-in, 5ms fade-out barge-in stop, and exact `bufferDrained` signaling.
 */
export interface PlaybackRingBufferEngine {
  push: (samples: Float32Array) => void;
  markTurnComplete: () => void;
  stopWithFadeOut: () => void;
  pullBlock: (frameSize?: number) => {
    output: Float32Array;
    drainedEvent: boolean;
    playing: boolean;
    bufferedSamples: number;
  };
  getBufferedSamples: () => number;
}

export function createPlaybackRingBufferEngine(
  sampleRate = LIVE_PLAYBACK_SAMPLE_RATE,
  prebufferMs = LIVE_PLAYBACK_PREBUFFER_MS,
  capacitySeconds = LIVE_PLAYBACK_RING_SECONDS
): PlaybackRingBufferEngine {
  const capacity = Math.max(4096, Math.round(sampleRate * capacitySeconds));
  const prebufferSamples = Math.max(
    128,
    Math.round((sampleRate * prebufferMs) / 1000)
  );
  const fadeInSamples = Math.max(
    1,
    Math.round((sampleRate * LIVE_PLAYBACK_FADE_IN_MS) / 1000)
  );
  const fadeOutSamples = Math.max(
    1,
    Math.round((sampleRate * LIVE_PLAYBACK_FADE_OUT_MS) / 1000)
  );

  const ring = new Float32Array(capacity);
  let readPos = 0;
  let writePos = 0;
  let available = 0;
  let playing = false;
  let hadAudio = false;
  let serverTurnComplete = false;
  let fadeInProgress = 0;
  let fadingOut = false;
  let fadeOutRemaining = 0;

  return {
    push(samples: Float32Array) {
      if (!samples || samples.length === 0) return;
      fadingOut = false;
      fadeOutRemaining = 0;
      serverTurnComplete = false;

      for (let i = 0; i < samples.length; i++) {
        if (available >= capacity) {
          // Drop oldest sample if 30s buffer ever overflows
          readPos = (readPos + 1) % capacity;
          available -= 1;
        }
        ring[writePos] = samples[i];
        writePos = (writePos + 1) % capacity;
        available += 1;
      }
      hadAudio = true;
    },
    markTurnComplete() {
      serverTurnComplete = true;
    },
    stopWithFadeOut() {
      if (playing && available > 0) {
        fadingOut = true;
        fadeOutRemaining = Math.min(fadeOutSamples, available);
      } else {
        readPos = 0;
        writePos = 0;
        available = 0;
        playing = false;
        hadAudio = false;
        serverTurnComplete = false;
        fadingOut = false;
        fadeOutRemaining = 0;
      }
    },
    pullBlock(frameSize = 128) {
      const output = new Float32Array(frameSize);
      let drainedEvent = false;

      if (fadingOut) {
        for (let i = 0; i < frameSize; i++) {
          if (fadeOutRemaining > 0 && available > 0) {
            const gain = fadeOutRemaining / fadeOutSamples;
            output[i] = ring[readPos] * gain;
            readPos = (readPos + 1) % capacity;
            available -= 1;
            fadeOutRemaining -= 1;
          } else {
            output[i] = 0;
          }
        }
        if (fadeOutRemaining <= 0) {
          readPos = 0;
          writePos = 0;
          available = 0;
          playing = false;
          hadAudio = false;
          serverTurnComplete = false;
          fadingOut = false;
        }
        return { output, drainedEvent: false, playing, bufferedSamples: available };
      }

      if (!playing) {
        if (
          available >= prebufferSamples ||
          (serverTurnComplete && available > 0)
        ) {
          playing = true;
          fadeInProgress = 0;
        } else if (serverTurnComplete && hadAudio && available === 0) {
          hadAudio = false;
          drainedEvent = true;
        }
      }

      if (playing) {
        for (let i = 0; i < frameSize; i++) {
          if (available > 0) {
            let s = ring[readPos];
            readPos = (readPos + 1) % capacity;
            available -= 1;
            if (fadeInProgress < fadeInSamples) {
              s *= fadeInProgress / fadeInSamples;
              fadeInProgress += 1;
            }
            output[i] = s;
          } else {
            output[i] = 0;
          }
        }

        if (available === 0) {
          playing = false;
          if (hadAudio) {
            hadAudio = false;
            drainedEvent = true;
          }
        }
      }

      return { output, drainedEvent, playing, bufferedSamples: available };
    },
    getBufferedSamples() {
      return available;
    },
  };
}

/**
 * Continuous fractional-phase accumulator resampler preserving `lastSample` and
 * `phase` seamlessly across 128-sample Web Audio blocks (zero clicks/stutters)
 * and emitting exact 320-sample (20ms @ 16kHz) Int16 mono PCM packets.
 */
export interface ContinuousResampler {
  pushBlock: (block: Float32Array) => Int16Array[];
  reset: () => void;
}

export function createContinuousResampler(
  inputSampleRate: number,
  targetSampleRate = LIVE_INPUT_TARGET_SAMPLE_RATE,
  packetSamples = LIVE_INPUT_CHUNK_SAMPLES
): ContinuousResampler {
  const safeInputRate =
    Number.isFinite(inputSampleRate) && inputSampleRate > 0
      ? inputSampleRate
      : targetSampleRate;
  const ratio = Math.max(0.25, safeInputRate / targetSampleRate);
  let phase = 0;
  let lastSample = 0;
  let outBuf = new Int16Array(packetSamples);
  let outIdx = 0;

  return {
    pushBlock(block: Float32Array): Int16Array[] {
      const packets: Int16Array[] = [];
      if (!block || block.length === 0) return packets;
      const len = block.length;

      const emit = (val: number) => {
        const clamped = Math.max(-1, Math.min(1, val));
        outBuf[outIdx++] =
          clamped < 0
            ? Math.round(clamped * 0x8000)
            : Math.round(clamped * 0x7fff);
        if (outIdx >= packetSamples) {
          packets.push(outBuf);
          outBuf = new Int16Array(packetSamples);
          outIdx = 0;
        }
      };

      if (Math.abs(ratio - 1) < 0.001) {
        for (let i = 0; i < len; i++) {
          emit(block[i]);
        }
        lastSample = block[len - 1];
        return packets;
      }

      // Virtual buffer V[0] = lastSample, V[1..len] = block[0..len-1]
      let pos = phase;
      while (pos < len) {
        const idx0 = Math.floor(pos);
        const frac = pos - idx0;
        const s0 = idx0 === 0 ? lastSample : block[idx0 - 1];
        const s1 = block[idx0];
        emit(s0 + (s1 - s0) * frac);
        pos += ratio;
      }
      phase = pos - len;
      lastSample = block[len - 1];
      return packets;
    },
    reset() {
      phase = 0;
      lastSample = 0;
      outBuf = new Int16Array(packetSamples);
      outIdx = 0;
    },
  };
}

/**
 * Mathematically linear-downsamples Float32 PCM audio from actual hardware
 * sampleRate (e.g., 48000 Hz or 44100 Hz) to exact 16000 Hz Int16 mono PCM.
 */
export function downsampleFloat32ToInt16Pcm(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = LIVE_INPUT_TARGET_SAMPLE_RATE
): Int16Array {
  if (!input || input.length === 0) return new Int16Array(0);
  const safeInputRate =
    Number.isFinite(inputSampleRate) && inputSampleRate > 0
      ? inputSampleRate
      : targetSampleRate;

  if (Math.abs(safeInputRate - targetSampleRate) < 1) {
    const direct = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      direct[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return direct;
  }

  const ratio = safeInputRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcPos - idx0;
    const interp = input[idx0] + (input[idx1] - input[idx0]) * frac;
    const clamped = Math.max(-1, Math.min(1, interp));
    output[i] =
      clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }

  return output;
}

/**
 * Converts Int16 PCM samples into base64 string (browser & Node compatible).
 */
export function int16PcmToBase64(int16: Int16Array): string {
  const bytes = new Uint8Array(int16.buffer, int16.byteOffset, int16.byteLength);
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...slice);
  }
  return btoa(binary);
}

/**
 * Decodes base64 Int16 LE PCM audio from Gemini Live (24kHz) into Float32 samples
 * ready for immediate 24kHz Ring Buffer AudioWorklet playback.
 */
export function base64PcmToFloat32(base64Pcm: string): Float32Array {
  if (!base64Pcm) return new Float32Array(0);
  let bytes: Uint8Array;
  if (typeof Buffer !== "undefined" && typeof atob === "undefined") {
    bytes = new Uint8Array(Buffer.from(base64Pcm, "base64"));
  } else {
    const binary = atob(base64Pcm);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  }

  const sampleCount = Math.floor(bytes.byteLength / 2);
  const float32 = new Float32Array(sampleCount);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);

  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }

  return float32;
}

/**
 * Extracts sample rate from MIME strings like `audio/pcm;rate=24000`.
 */
export function parsePcmSampleRate(
  mimeType?: string,
  fallbackRate = 24000
): number {
  if (!mimeType) return fallbackRate;
  const match = mimeType.match(/rate=(\d{4,6})/i);
  if (!match) return fallbackRate;
  const parsed = Number.parseInt(match[1], 10);
  return Number.isFinite(parsed) && parsed >= 8000 && parsed <= 96000
    ? parsed
    : fallbackRate;
}

/**
 * Detects whether a Live API `groundingMetadata` payload actually invoked Google Search.
 */
export function hasGoogleSearchGrounding(groundingMetadata: unknown): boolean {
  if (!groundingMetadata || typeof groundingMetadata !== "object") return false;
  const meta = groundingMetadata as {
    webSearchQueries?: unknown[];
    groundingChunks?: unknown[];
    searchEntryPoint?: unknown;
  };
  return Boolean(
    (Array.isArray(meta.webSearchQueries) && meta.webSearchQueries.length > 0) ||
      (Array.isArray(meta.groundingChunks) && meta.groundingChunks.length > 0) ||
      meta.searchEntryPoint
  );
}

/**
 * Translates Live API / WebSocket / Microphone errors into clear Indonesian UI
 * diagnostics (no silent fallback to robotic TTS).
 */
export function formatLiveConnectionError(
  rawReason?: string,
  closeCode?: number
): string {
  const lower = (rawReason || "").toLowerCase();

  if (
    lower.includes("notallowed") ||
    lower.includes("permission denied") ||
    lower.includes("izin mikrofon")
  ) {
    return "Izin mikrofon ditolak browser. Aktifkan akses mikrofon lalu klik Coba Lagi.";
  }
  if (
    lower.includes("notfound") ||
    lower.includes("no microphone") ||
    lower.includes("mikrofon tidak")
  ) {
    return "Mikrofon tidak terdeteksi pada perangkat Anda. Periksa perangkat audio lalu coba lagi.";
  }
  if (
    lower.includes("quota") ||
    lower.includes("resource_exhausted") ||
    closeCode === 1011
  ) {
    return "Kuota Gemini Live Audio pada API key saat ini sedang penuh (kode 1011). Periksa kuota/billing atau coba lagi beberapa saat.";
  }
  if (lower.includes("gemini_api_key") || lower.includes("api key")) {
    return "GEMINI_API_KEY belum terkonfigurasi di server. Pastikan environment variable aktif.";
  }
  if (lower.includes("timeout")) {
    return "Koneksi WebSocket Gemini Live melewati batas waktu. Periksa koneksi internet Anda lalu klik Coba Lagi.";
  }
  if (closeCode === 1007 || closeCode === 1008) {
    return `Sesi Gemini Live ditolak server (${closeCode}${rawReason ? `: ${rawReason.slice(0, 120)}` : ""}). Klik Coba Lagi.`;
  }
  if (rawReason && rawReason.trim().length > 0) {
    return `Koneksi Gemini Live Audio gagal: ${rawReason.trim().slice(0, 160)}`;
  }
  return "Koneksi WebSocket Gemini Live Audio gagal tersambung. Periksa jaringan Anda lalu klik Coba Lagi.";
}

/**
 * Builds a deterministic per-account localStorage key so voice & text chat history
 * stays isolated per logged-in user and persists across page reloads.
 */
export function getScopedChatStorageKey(
  baseKey: string,
  userEmail?: string | null
): string {
  const normalized = (userEmail || "").trim().toLowerCase();
  if (!normalized) return baseKey;
  return `${baseKey}::${normalized}`;
}

/**
 * Builds a per-chat-room localStorage key for long-term factual voice memory.
 */
export function getVoiceMemoryStorageKey(
  chatSessionId?: string | null,
  userEmail?: string | null
): string {
  const base = getScopedChatStorageKey("formylab_voice_memory_v1", userEmail);
  const room = (chatSessionId || "default").trim();
  return `${base}::${room}`;
}

/**
 * Computes normalized RMS amplitude [0..1] from a 16-bit signed PCM frame.
 * Used strictly for read-only latency profiling (NEVER modifies or gates audio).
 */
export function computeInt16PcmRms(samples: Int16Array): number {
  if (!samples || samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const norm = samples[i] / 32768;
    sumSq += norm * norm;
  }
  return Math.sqrt(sumSq / samples.length);
}

export interface SpeechEndProfilerState {
  noiseFloor: number;
  userSpeaking: boolean;
  quietSinceMs: number | null;
  lastSpeechEndedAtMs: number;
}

export function createSpeechEndProfilerState(
  initialNoiseFloor = 0.008
): SpeechEndProfilerState {
  return {
    noiseFloor: Math.max(0.003, Math.min(0.03, initialNoiseFloor)),
    userSpeaking: false,
    quietSinceMs: null,
    lastSpeechEndedAtMs: 0,
  };
}

/**
 * Pure read-only RMS speech-end profiler for millisecond latency diagnostics.
 * Records `lastSpeechEndedAtMs` when user speech drops to quiet level.
 * NEVER modifies audio and NEVER sends manual VAD signals.
 */
export function observeMicRmsForProfiler(
  state: SpeechEndProfilerState,
  rms: number,
  nowMs: number,
  quietConfirmMs = LIVE_SPEECH_QUIET_CONFIRM_MS
): SpeechEndProfilerState {
  const speechThreshold = Math.max(0.018, state.noiseFloor * 2.4);

  if (rms >= speechThreshold) {
    return {
      ...state,
      userSpeaking: true,
      quietSinceMs: null,
    };
  }

  const nextNoiseFloor = Math.max(
    0.003,
    Math.min(0.03, state.noiseFloor * 0.94 + rms * 0.06)
  );

  if (!state.userSpeaking) {
    return {
      ...state,
      noiseFloor: nextNoiseFloor,
    };
  }

  const quietSince = state.quietSinceMs ?? nowMs;
  if (nowMs - quietSince >= quietConfirmMs) {
    return {
      noiseFloor: nextNoiseFloor,
      userSpeaking: false,
      quietSinceMs: null,
      lastSpeechEndedAtMs: quietSince,
    };
  }

  return {
    ...state,
    noiseFloor: nextNoiseFloor,
    quietSinceMs: quietSince,
  };
}
