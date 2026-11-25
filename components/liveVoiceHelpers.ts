export type LiveVoiceName = "Aoede" | "Zephyr";

export type LiveConnectionStatus =
  | "connecting"
  | "listening"
  | "speaking"
  | "searching"
  | "error";

export const LIVE_VOICE_OPTIONS: ReadonlyArray<{
  id: LiveVoiceName;
  label: string;
  hint: string;
}> = [
  { id: "Aoede", label: "Aoede", hint: "Hangat & natural" },
  { id: "Zephyr", label: "Zephyr", hint: "Jernih & ekspresif" },
];

export const LIVE_STATUS_LABELS: Record<LiveConnectionStatus, string> = {
  connecting: "Menghubungkan Live Audio...",
  listening: "Live · Mendengarkan",
  speaking: "Live · AI Berbicara",
  searching: "Live · Mencari di Google",
  error: "Koneksi Live Terputus",
};

/**
 * Concise, human-like Bahasa Indonesia voice system instruction engineered for
 * minimal Time-To-First-Audio (TTFA) on Gemini Live Native Audio.
 */
export function buildLiveVoiceSystemInstruction(
  recentContext?: string
): string {
  const lines = [
    "Kamu adalah asisten suara AI Formylab.ai berperan sebagai Senior Cosmetic R&D Chemist.",
    "Berbicaralah dalam Bahasa Indonesia yang santai, sopan, hangat, dan alami layaknya rekan kerja R&D sungguhan di telepon.",
    "Aturan wajib mode suara:",
    "- Langsung jawab ke inti dalam 1 hingga 3 kalimat padat dan jelas agar obrolan terasa cepat dan hidup, kecuali pengguna meminta penjelasan rinci.",
    "- DILARANG menyebutkan simbol markdown (bintang, pagar, garis miring, atau daftar bernomor panjang); ucapkan angka dan satuan secara lisan (misalnya 'lima persen', 'pH lima koma lima').",
    "- Gunakan Google Search otomatis setiap kali pengguna menanyakan berita terkini, regulasi BPOM/Halal terbaru, harga/tren bahan kosmetik, fakta spesifik, atau saat pengguna mengoreksi jawabanmu; akui singkat jika sebelumnya keliru lalu sampaikan fakta terverifikasi.",
    "- Jika diminta membuat catatan/tabel di chat, panggil `create_chat_note`; jika diminta membuat Google Docs, panggil `create_google_doc`, lalu konfirmasi singkat dalam 1 kalimat.",
  ];

  const cleanContext =
    typeof recentContext === "string"
      ? recentContext.replace(/\s+/g, " ").trim().slice(0, 380)
      : "";

  if (cleanContext) {
    lines.push(
      `Konteks obrolan terakhir (gunakan hanya bila relevan): "${cleanContext}"`
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

  // Ensure standard 3-pillar order when all are active, or clean deduplicated list
  return Array.from(new Set(pillars));
}

/**
 * Downsamples Float32 PCM audio from hardware sample rate (e.g. 48kHz / 44.1kHz)
 * to 16kHz signed 16-bit Little-Endian PCM for Gemini Live realtimeInput.
 */
export function downsampleFloat32ToInt16Pcm(
  input: Float32Array,
  sourceRate: number,
  targetRate = 16000
): Int16Array {
  if (input.length === 0) return new Int16Array(0);

  if (!sourceRate || Math.abs(sourceRate - targetRate) < 1) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const clamped = Math.max(-1, Math.min(1, input[i]));
      out[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    }
    return out;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const start = Math.floor(i * ratio);
    const end = Math.min(input.length, Math.floor((i + 1) * ratio));
    let sum = 0;
    let count = 0;
    for (let j = start; j < end; j++) {
      sum += input[j];
      count++;
    }
    const sample =
      count > 0 ? sum / count : input[Math.min(start, input.length - 1)];
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] = clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
  }
  return out;
}

/**
 * Encodes Int16Array PCM (little-endian) to Base64 without blowing the call stack.
 */
export function int16PcmToBase64(pcm: Int16Array): string {
  if (pcm.length === 0) return "";
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const chunkSize = 0x4000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
  }
  if (typeof btoa === "function") {
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

/**
 * Decodes Base64 16-bit Little-Endian PCM from Gemini Live (24kHz) into Float32Array [-1, 1].
 */
export function base64PcmToFloat32(base64: string): Float32Array {
  if (!base64) return new Float32Array(0);
  const clean = base64.replace(/^data:[^;]+;base64,/i, "").trim();
  if (!clean) return new Float32Array(0);

  let bytes: Uint8Array;
  if (typeof atob === "function") {
    const binary = atob(clean);
    bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
  } else {
    const buf = Buffer.from(clean, "base64");
    bytes = new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }

  const sampleCount = Math.floor(bytes.byteLength / 2);
  if (sampleCount === 0) return new Float32Array(0);

  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

/**
 * Extracts PCM sample rate from mimeType such as `audio/pcm;rate=24000`.
 */
export function parsePcmSampleRate(
  mimeType?: string,
  fallbackRate = 24000
): number {
  if (!mimeType) return fallbackRate;
  const match = mimeType.match(/rate=(\d{4,6})/i);
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed >= 8000 && parsed <= 96000) {
      return parsed;
    }
  }
  return fallbackRate;
}

/**
 * Detects whether a Gemini Live groundingMetadata object indicates Google Search
 * activity (either webSearchQueries or groundingChunks).
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
