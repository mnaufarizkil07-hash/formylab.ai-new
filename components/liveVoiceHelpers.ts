import { Type, type FunctionDeclaration } from "@google/genai";
import {
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

export const LIVE_INPUT_TARGET_SAMPLE_RATE = 16000;
export const LIVE_INPUT_CHUNK_SAMPLES = 640; // exact 40ms @ 16kHz
export const LIVE_TRANSCRIPT_THROTTLE_MS = 80;
export const LIVE_ECHO_GUARD_TAIL_MS = 220;
export const LIVE_SPEECH_QUIET_CONFIRM_MS = 300;
export const LIVE_STANDBY_PREWARM_TURN = 2;
export const LIVE_HOTSWAP_TARGET_TURN = 3;
export const LIVE_STANDBY_MAX_AGE_MS = 55_000;
export const LIVE_TURN_WATCHDOG_MS = 5_000;
export const LIVE_TOOL_TIMEOUT_MS = 12_000;
export const LIVE_MAX_AUTO_RECONNECTS = 2;

export interface LiveMemoryMessage {
  role: "user" | "assistant";
  content: string;
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
 * Summarizes up to the last 8 room chat messages into a compact plain-text memory
 * string (~350 words max) for `[MEMORI PERCAKAPAN SEBELUMNYA]` during background
 * standby session pre-warming & reconnects (NEVER carries raw audio tokens).
 */
export function buildConversationMemorySummary(
  messages: ReadonlyArray<LiveMemoryMessage> | undefined,
  maxMessages = 8,
  maxWords = 350
): string {
  if (!Array.isArray(messages) || messages.length === 0) return "";

  const recent = messages.slice(-maxMessages);
  const lines: string[] = [];

  for (const msg of recent) {
    const raw = (msg?.content || "").trim();
    if (!raw) continue;

    let readable = raw;
    const parsedTable = parseFormulaTableMessage(raw);
    if (parsedTable) {
      readable = formatFormulaTableForHistoryContext(parsedTable);
    } else {
      const parsedNote = parseChatNoteMessage(raw);
      if (parsedNote) {
        readable = formatNoteForHistoryContext(parsedNote);
      } else {
        const parsedDoc = parseGoogleDocMessage(raw);
        if (parsedDoc) {
          readable = formatGoogleDocForHistoryContext(parsedDoc);
        }
      }
    }

    const compact = readable.replace(/\s+/g, " ").trim().slice(0, 360);
    if (!compact) continue;
    const prefix = msg.role === "user" ? "User" : "AI";
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
 * Unified Function Declarations for Gemini Live Voice Mode.
 * ALL skills (`create_formula_table`, `save_to_google_docs`, and conditional `search_web_info`)
 * live inside ONE `functionDeclarations` array so there is ZERO WebSocket conflict across
 * all 4 voice chips (`Aoede`, `Zephyr`, `Kore`, `Puck`).
 */
export function buildLiveVoiceFunctionDeclarations(
  enableSearch = false
): FunctionDeclaration[] {
  const declarations: FunctionDeclaration[] = [
    {
      name: "create_formula_table",
      description:
        "Membuat dan menampilkan tabel terstruktur (resep formulasi kosmetik, daftar bahan & persentase, fungsi, pH, atau perbandingan) langsung di room chat.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: {
            type: Type.STRING,
            description:
              "Judul tabel (misal: 'Formula Dasar Moisturizer Kulit Sensitif').",
          },
          subtitle: {
            type: Type.STRING,
            description: "Ringkasan target kulit, target pH, atau tekstur produk.",
          },
          columns: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description:
              "Nama kolom tabel (misal: ['Fase', 'Bahan', 'Persentase (%)', 'Fungsi']).",
          },
          rows: {
            type: Type.ARRAY,
            items: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            description: "Baris data tabel sesuai urutan kolom.",
          },
          notes: {
            type: Type.STRING,
            description:
              "Catatan proses pembuatan, stabilitas, atau keamanan BPOM/Halal.",
          },
        },
        required: ["title", "columns", "rows"],
      },
    },
    {
      name: "save_to_google_docs",
      description:
        "Menyimpan resep, tabel formulasi terakhir, atau catatan diskusi ke dokumen Google Docs di Google Drive user.",
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
              "Jika true, otomatis ikutkan data tabel formulasi terakhir yang tampil di chat ke dalam dokumen Google Docs.",
          },
        },
        required: ["title", "content"],
      },
    },
  ];

  if (enableSearch) {
    declarations.push({
      name: "search_web_info",
      description:
        "Mencari informasi fakta terkini dari web (Google Search) seperti regulasi BPOM/Halal terbaru, harga bahan baku, berita, atau tren pasar kosmetik.",
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
    });
  }

  return declarations;
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
 * Cleans user speech transcription by stripping `<noise>`/`<inaudible>` tags AND
 * stray leading punctuation (e.g. `". Oke, langsung buat resepnya."` -> `"Oke, langsung buat resepnya."`).
 */
export function sanitizeLiveUserTranscript(raw: string): string {
  const withoutTags = sanitizeLiveTranscriptText(raw);
  if (!withoutTags) return "";
  return withoutTags.replace(/^[.,!?;:\s]+/, "").trim();
}

/**
 * Module 4: GPT-Voice-grade natural Indonesian spoken persona + explicit Unified Tool awareness
 * + optional `[MEMORI PERCAKAPAN SEBELUMNYA]` text memory for O(1) Hot-Swap continuity.
 */
export function buildLiveVoiceSystemInstruction(
  memorySummary?: string,
  enableSearch = false
): string {
  const lines = [
    "Kamu adalah partner R&D kosmetik Formylab.ai yang sedang mengobrol langsung lewat telepon dengan pengguna.",
    "Gaya bicara wajib sangat natural seperti rekan kerja manusia di telepon, BUKAN membacakan artikel:",
    "- Gunakan Bahasa Indonesia lisan sehari-hari yang hangat, santai, luwes, dan langsung ke inti dalam 1 sampai 2 kalimat padat per giliran bicara.",
    "- Gunakan koma sebagai jeda napas alami (misal 'Oke, gampangnya gini...', 'Nah, kalau buat kulit sensitif...', 'Boleh banget...').",
    "- DILARANG membacakan simbol markdown, tanda kurung, atau daftar tabel/persentase panjang lewat suara.",
    "KEMAMPUAN TOOL AKTIF (WAJIB DIGUNAKAN SAAT DIMINTA):",
    `- Kamu memiliki tool aktif untuk membuat tabel langsung di chat (\`create_formula_table\`), menyimpan ke Google Docs (\`save_to_google_docs\`), ${
      enableSearch
        ? "dan mencari info web terkini (`search_web_info`)."
        : "(dan `search_web_info` jika pengguna menyalakan toggle Search)."
    }`,
    "- Kapan pun user meminta tabel, resep terstruktur, daftar bahan & persen, atau perbandingan bahan, JANGAN PERNAH menolak—langsung panggil `create_formula_table`, lalu sampaikan lewat suara secara santai dalam 1 kalimat bahwa tabelnya sudah tampil di layar.",
    "- Kapan pun user meminta simpan ke Google Docs atau Google Drive, langsung panggil `save_to_google_docs` (set `include_latest_table: true` jika merujuk tabel terakhir di chat).",
  ];

  if (enableSearch) {
    lines.push(
      "- Kapan pun user menanyakan berita terkini, harga bahan terbaru, atau regulasi/fakta aktual, panggil `search_web_info` lalu jawab singkat berdasarkan hasilnya. Untuk obrolan biasa dan formulasi umum, jawab langsung tanpa memanggil search."
    );
  }

  const cleanMemory =
    typeof memorySummary === "string" ? memorySummary.trim() : "";
  if (cleanMemory) {
    lines.push("");
    lines.push("[MEMORI PERCAKAPAN SEBELUMNYA]");
    lines.push(cleanMemory);
    lines.push(
      "Lanjutkan percakapan secara mulus tanpa mengulang salam pembuka jika konteks di atas sudah berjalan."
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
    /\b(ph|hlb|viskositas|viscosity|stabilitas|emulsi|bpom|halal|persen|%|gram|ml|mg|hpp|bom|harga|regulasi|audit|uji|batch|konsentrasi|kompatibilitas|iritasi|toksisitas|spf|uv|rumus|hitung|perbandingan|bandingkan|cari|berita|terbaru|fakta|data|riset|studi|jurnal)\b/i;

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
  const turn1To3 = metrics.filter((m) => m.turn >= 1 && m.turn <= 3 && m.firstAudioMs > 0);
  const turn4Plus = metrics.filter((m) => m.turn >= 4 && m.firstAudioMs > 0);

  const avg = (arr: VoiceTurnMetric[]) =>
    arr.length === 0
      ? null
      : Math.round(arr.reduce((sum, item) => sum + item.firstAudioMs, 0) / arr.length);

  return {
    totalTurns: metrics.length,
    avgFirstAudioTurn1To3Ms: avg(turn1To3),
    avgFirstAudioTurn4PlusMs: avg(turn4Plus),
    hotSwapCount: metrics.filter((m) => m.hotSwapped === "ya").length,
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
 * ready for immediate Web Audio `AudioBufferSourceNode` scheduling.
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
  if (lower.includes("quota") || lower.includes("resource_exhausted") || closeCode === 1011) {
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
 * Records `lastSpeechEndedAtMs` when user speech drops to quiet level for 300ms.
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
