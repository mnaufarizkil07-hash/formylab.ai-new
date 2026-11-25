export type LiveVoiceName = "Aoede" | "Zephyr";

export type LiveVadMode = "explicit" | "auto_stream_end";

export type LiveConnectionStatus =
  | "connecting"
  | "listening"
  | "thinking"
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
  thinking: "Live · AI Berpikir...",
  speaking: "Live · AI Berbicara",
  searching: "Live · Mencari di Google",
  error: "Koneksi Live Terputus",
};

export const LIVE_INPUT_TARGET_SAMPLE_RATE = 16000;
export const LIVE_INPUT_CHUNK_SAMPLES = 320; // 20ms @ 16kHz
export const LIVE_NOISE_CALIBRATION_MS = 400;
export const LIVE_MIN_SPEECH_MS = 100;
export const LIVE_SPEECH_END_SILENCE_MS = 350;
export const LIVE_USER_LISTENING_PLACEHOLDER = "Mendengarkan...";

/**
 * Strips system/noise tags such as `<noise>` or `<inaudible>` from Gemini Live
 * transcriptions before rendering in the chat room.
 */
export function sanitizeLiveTranscriptText(raw: string): string {
  if (!raw) return "";
  return raw.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export interface AdaptiveVoiceDetectorState {
  calibrated: boolean;
  calibrationElapsedMs: number;
  calibrationRmsSum: number;
  calibrationFrameCount: number;
  noiseFloor: number;
  speechThreshold: number;
  silenceThreshold: number;
  speechElapsedMs: number;
  hasQualifiedSpeech: boolean;
  silenceElapsedMs: number;
  flushSentForTurn: boolean;
}

export function createAdaptiveVoiceDetectorState(): AdaptiveVoiceDetectorState {
  return {
    calibrated: false,
    calibrationElapsedMs: 0,
    calibrationRmsSum: 0,
    calibrationFrameCount: 0,
    noiseFloor: 0.004,
    speechThreshold: 0.0088,
    silenceThreshold: 0.0065,
    speechElapsedMs: 0,
    hasQualifiedSpeech: false,
    silenceElapsedMs: 0,
    flushSentForTurn: false,
  };
}

export function computeThresholdsFromNoiseFloor(noiseFloor: number): {
  noiseFloor: number;
  speechThreshold: number;
  silenceThreshold: number;
} {
  const clampedFloor = Math.max(0.001, Math.min(0.05, noiseFloor));
  const speechThreshold = Math.max(clampedFloor * 2.2, 0.008);
  const silenceThreshold = Math.min(
    Math.max(clampedFloor * 1.45, clampedFloor + 0.0025),
    speechThreshold * 0.82
  );
  return {
    noiseFloor: clampedFloor,
    speechThreshold,
    silenceThreshold,
  };
}

export function resetDetectorTurnFlush(
  state: AdaptiveVoiceDetectorState
): void {
  state.flushSentForTurn = false;
  state.hasQualifiedSpeech = false;
  state.speechElapsedMs = 0;
  state.silenceElapsedMs = 0;
}

export function computeFrameRms(samples: Float32Array): number {
  if (!samples || samples.length === 0) return 0;
  let sumSq = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sumSq += v * v;
  }
  return Math.sqrt(sumSq / samples.length);
}

/**
 * Pure client-side NON-DESTRUCTIVE RMS monitor for audioStreamEnd flushing:
 * - Never gates, mutes, or zeroes out audio frames.
 * - Calibrates room noise floor during the first 400ms.
 * - Requires RMS >= Math.max(noiseFloor * 2.2, 0.008) for >= 100ms, then
 *   return near noiseFloor for 350ms to emit `speech_end` ONCE.
 * - Will not emit `speech_end` again while silent until user speaks again
 *   or `resetDetectorTurnFlush` is called on `turnComplete`.
 */
export function stepAdaptiveVoiceDetector(
  state: AdaptiveVoiceDetectorState,
  rms: number,
  frameDurationMs: number,
  aiSpeaking = false
): {
  event: "none" | "calibrated" | "speech_start" | "speech_end";
  isSpeaking: boolean;
} {
  const dt = Math.max(0, frameDurationMs);

  // Phase 1: 400ms automatic noise-floor calibration
  if (!state.calibrated) {
    state.calibrationElapsedMs += dt;
    state.calibrationRmsSum += rms;
    state.calibrationFrameCount += 1;

    if (state.calibrationElapsedMs >= LIVE_NOISE_CALIBRATION_MS) {
      const avgFloor =
        state.calibrationFrameCount > 0
          ? state.calibrationRmsSum / state.calibrationFrameCount
          : 0.004;
      const thresholds = computeThresholdsFromNoiseFloor(avgFloor);
      state.noiseFloor = thresholds.noiseFloor;
      state.speechThreshold = thresholds.speechThreshold;
      state.silenceThreshold = thresholds.silenceThreshold;
      state.calibrated = true;
      return { event: "calibrated", isSpeaking: false };
    }
    return { event: "none", isSpeaking: false };
  }

  // Phase 2: Non-destructive speech activity & 350ms return-to-noise-floor detector
  const activeSpeechThreshold = aiSpeaking
    ? Math.max(state.speechThreshold * 1.8, 0.035)
    : state.speechThreshold;

  if (rms >= activeSpeechThreshold) {
    const wasQualified = state.hasQualifiedSpeech;
    state.speechElapsedMs += dt;
    state.silenceElapsedMs = 0;

    if (state.speechElapsedMs >= LIVE_MIN_SPEECH_MS) {
      state.hasQualifiedSpeech = true;
      state.flushSentForTurn = false;
      if (!wasQualified) {
        return { event: "speech_start", isSpeaking: true };
      }
    }
    return { event: "none", isSpeaking: state.hasQualifiedSpeech };
  }

  if (state.hasQualifiedSpeech) {
    if (rms <= state.silenceThreshold) {
      state.silenceElapsedMs += dt;
      if (
        state.silenceElapsedMs >= LIVE_SPEECH_END_SILENCE_MS &&
        !state.flushSentForTurn
      ) {
        state.flushSentForTurn = true;
        state.hasQualifiedSpeech = false;
        state.speechElapsedMs = 0;
        state.silenceElapsedMs = 0;
        return { event: "speech_end", isSpeaking: false };
      }
    } else {
      // Mid-level vocal tail — keep holding without resetting qualified speech
      state.silenceElapsedMs = 0;
    }
    return { event: "none", isSpeaking: true };
  }

  // Idle below speech threshold (not yet >= 100ms qualified speech)
  state.speechElapsedMs = 0;
  state.silenceElapsedMs = 0;
  if (!aiSpeaking) {
    const nextFloor = state.noiseFloor * 0.992 + rms * 0.008;
    const thresholds = computeThresholdsFromNoiseFloor(nextFloor);
    state.noiseFloor = thresholds.noiseFloor;
    state.speechThreshold = thresholds.speechThreshold;
    state.silenceThreshold = thresholds.silenceThreshold;
  }
  return { event: "none", isSpeaking: false };
}

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
    "- HANYA gunakan tool googleSearch jika user menanyakan berita terkini, harga terbaru, tanggal/kejadian aktual, atau fakta eksternal yang berubah-ubah. Untuk sapaan, diskusi umum, dan formulasi kosmetik standar, JAWAB LANGSUNG dengan suara secepat mungkin tanpa memanggil search.",
    "- Jika diminta membuat catatan/tabel di chat, panggil `create_chat_note`; jika diminta membuat Google Docs, panggil `create_google_doc`, lalu konfirmasi singkat dalam 1 kalimat.",
  ];

  // Lightweight initial context summary only (never re-inject long formula history)
  const cleanContext =
    typeof recentContext === "string"
      ? recentContext.replace(/\s+/g, " ").trim().slice(0, 220)
      : "";

  if (cleanContext) {
    lines.push(
      `Ringkasan singkat konteks terakhir (pakai hanya jika relevan): "${cleanContext}"`
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
 * Mathematically linear-downsamples Float32 PCM audio from actual hardware
 * sample rate (e.g. 48000 Hz or 44100 Hz) to exact 16000 Hz signed 16-bit
 * Little-Endian mono PCM for Gemini Live realtimeInput.
 */
export function downsampleFloat32ToInt16Pcm(
  input: Float32Array,
  sourceRate: number,
  targetRate = LIVE_INPUT_TARGET_SAMPLE_RATE
): Int16Array {
  if (input.length === 0) return new Int16Array(0);

  if (!sourceRate || Math.abs(sourceRate - targetRate) < 1) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const clamped = Math.max(-1, Math.min(1, input[i]));
      out[i] =
        clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
    }
    return out;
  }

  const ratio = sourceRate / targetRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcPos - idx0;
    const sample = input[idx0] + (input[idx1] - input[idx0]) * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] =
      clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
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
