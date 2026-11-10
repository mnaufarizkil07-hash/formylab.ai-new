import { AiModelId } from "../components/AiModelLogos";

export interface ChatAttachment {
  id: string;
  name: string;
  mimeType: string;
  sizeLabel: string;
  dataUrl?: string;
  textPreview?: string;
  isVoiceNote?: boolean;
  durationSec?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  modelBadge?: AiModelId | "gemini" | "gpt";
  timestamp: string;
  attachments?: ChatAttachment[];
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  model: AiModelId | "gemini" | "gpt";
  messages: ChatMessage[];
}

export const CHAT_SESSIONS_STORAGE_KEY = "formylab_chat_sessions";
export const ACTIVE_SESSION_STORAGE_KEY = "formylab_active_session_id";

export const INITIAL_DEFAULT_SESSION: ChatSession = {
  id: "session-initial",
  title: "Obrolan Baru",
  createdAt: "Hari ini",
  model: "auto",
  messages: [
    {
      id: "msg-welcome",
      role: "assistant",
      content:
        "Halo! Saya adalah **AI Chemist Consultant & R&D Formulation Advisor** untuk formylab.ai.\n\nAnda dapat berkonsultasi mengenai:\n- Formulasi skincare untuk iklim tropis & kulit sensitif (rosacea, jerawat, barrier repair).\n- Rekomendasi bahan baku, substitusi pengawet aman, dan status sertifikasi Halal.\n- Hitungan HLB, viskositas, titik pH, serta mengirim **File (CSV/PDF/Gambar)** maupun **Voice Note (VN)**.\n\n*Pilih model AI langsung dari bar chat di bawah (**Auto**, **GPT-6 Luna**, **Gemini 3.8 Flash**, **Gemini 3.8 Pro**, atau **GPT-6 Omni**).*",
      modelBadge: "auto",
      timestamp: "Sekarang",
    },
  ],
};

export function createDefaultSession(): ChatSession {
  return {
    ...INITIAL_DEFAULT_SESSION,
    id: "session-" + Math.random().toString(36).substring(2, 9),
    createdAt: new Date().toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

const FILLER_WORDS = new Set([
  "apa",
  "apakah",
  "bagaimana",
  "gimana",
  "berapa",
  "tolong",
  "bisa",
  "jelaskan",
  "buatkan",
  "cari",
  "carikan",
  "cara",
  "itu",
  "ini",
  "yang",
  "yg",
  "dan",
  "atau",
  "di",
  "ke",
  "dari",
  "untuk",
  "buat",
  "pada",
  "dengan",
  "dong",
  "ya",
  "kak",
  "bang",
  "pak",
  "bu",
  "saya",
  "aku",
  "gue",
  "gua",
  "mau",
  "ingin",
  "tanya",
  "nanya",
  "kalau",
  "kalo",
]);

function toTitleCase(str: string): string {
  return str
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.toUpperCase() === "HLB" || word.toUpperCase() === "PH") {
        return word.toUpperCase() === "PH" ? "pH" : "HLB";
      }
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

/**
 * Smart Session Title Generator:
 * Analyzes topic, intent, and domain context rather than copying the user's raw first message.
 */
export function generateSessionTitle(
  contextText: string,
  hasVoiceNote = false,
  hasFileAttachment = false
): string {
  const clean = contextText.trim().replace(/[\r\n]+/g, " ");
  const lower = clean.toLowerCase();

  if (hasVoiceNote && (!clean || lower.includes("voice note"))) {
    return "Konsultasi Pesan Suara (VN)";
  }
  if (hasFileAttachment && (!clean || lower.includes("mengirim"))) {
    return "Analisis Dokumen & Data R&D";
  }
  if (!clean) {
    return "Konsultasi Formulasi R&D";
  }

  // 1. Math / Arithmetic / Calculation intent (e.g. "1+2 berapa", "10 * 5")
  if (
    /\d+\s*[+\-*/x÷=]\s*\d+/.test(lower) ||
    (/\b(hitung|kalkulasi|jumlah|tambah|kurang|kali|bagi)\b/.test(lower) &&
      /\d/.test(lower) &&
      !/\b(hlb|ph|cps|viskositas|batch|gram|persen)\b/.test(lower))
  ) {
    return "Perhitungan & Kalkulasi Dasar";
  }

  // 2. Greetings / Casual opening intent
  if (
    /^(halo|hai|hi|hello|pagi|siang|sore|malam|assalamualaikum|permisi|tes|test|ping|apa kabar)\b/.test(
      lower
    ) &&
    clean.split(/\s+/).length <= 5
  ) {
    return "Sesi Diskusi & Konsultasi Umum";
  }

  // 3. Domain-Specific Cosmetic Chemistry & R&D Intents
  if (/\b(rosacea|kemerahan|iritasi|sensitif|calming|soothing)\b/.test(lower)) {
    return "Formulasi Kulit Sensitif & Rosacea";
  }
  if (
    /\b(paraben|pengawet|preservative|phenoxyethanol|antibakteri|antimikroba)\b/.test(
      lower
    )
  ) {
    return "Substitusi Pengawet & Keamanan";
  }
  if (/\b(halal|mui|bpjph|sertifikasi|sertifikat)\b/.test(lower)) {
    return "Verifikasi Bahan & Standar Halal";
  }
  if (
    /\b(hlb|emulgator|emulsifier|emulsi|surfactant|surfaktan|o\/w|w\/o)\b/.test(
      lower
    )
  ) {
    return "Keseimbangan HLB & Sistem Emulsi";
  }
  if (/\b(ceramide|barrier|niacinamide|hyaluronic|pelembap|moisturizer)\b/.test(lower)) {
    return "Riset Aktif & Optimasi Skin Barrier";
  }
  if (/\b(jerawat|acne|salicylic|bha|aha|tea tree|komedo|sebum)\b/.test(lower)) {
    return "Pengembangan Formula Anti-Acne";
  }
  if (/\b(ph|viskositas|viscosity|cps|rheologi|buffer|stabilitas)\b/.test(lower)) {
    return "Analisis Parameter pH & Viskositas";
  }
  if (/\b(sunscreen|tabir surya|spf|uv|uva|uvb|zinc oxide|titanium)\b/.test(lower)) {
    return "Formulasi Proteksi UV & Sunscreen";
  }
  if (/\b(serum|whitening|brightening|vitamin c|retinol|peptide|anti-aging)\b/.test(lower)) {
    return "Formulasi Serum & Bahan Aktif";
  }
  if (/\b(biaya|cost|bom|harga|supplier|distributor|batch)\b/.test(lower)) {
    return "Estimasi BOM & Evaluasi Supplier";
  }

  // 4. Smart Keyword Extraction for General Topics
  const words = clean
    .replace(/[?!.,;:"'()[\]{}]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !FILLER_WORDS.has(w.toLowerCase()));

  if (words.length === 0) {
    return "Topik Diskusi & Analisis AI";
  }

  const coreKeywords = toTitleCase(words.slice(0, 4).join(" "));
  const smartTitle =
    words.length <= 2 ? `Bahasan ${coreKeywords}` : coreKeywords;

  if (smartTitle.length <= 32) return smartTitle;
  return smartTitle.substring(0, 30).trim() + "...";
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
}

/**
 * Generates a short playable WAV audio Data URL fallback when microphone hardware
 * is unavailable in an iframe/headless browser so Voice Notes (VN) always play.
 */
export function createFallbackVoiceNoteWav(durationSec = 3): string {
  const sampleRate = 8000;
  const numSamples = Math.max(1, Math.min(durationSec, 10)) * sampleRate;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const envelope = Math.sin(Math.PI * (i / numSamples));
    const sample =
      Math.sin(2 * Math.PI * 440 * t) * 0.15 * envelope +
      Math.sin(2 * Math.PI * 554.37 * t) * 0.1 * envelope;
    view.setInt16(44 + i * 2, sample * 32767, true);
  }

  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(buffer).toString("base64");
  return `data:audio/wav;base64,${base64}`;
}

export function generateUniqueId(prefix = "id"): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).substring(2, 11)}`;
}

export function getStoredSessions(): ChatSession[] {
  try {
    const raw = localStorage.getItem(CHAT_SESSIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    const seenSessionIds = new Set<string>();
    return parsed.map((sess: ChatSession, sIdx: number) => {
      let sessionId = sess.id || `session-${sIdx}`;
      if (seenSessionIds.has(sessionId)) {
        sessionId = `${sessionId}-${sIdx}`;
      }
      seenSessionIds.add(sessionId);

      const seenMsgIds = new Set<string>();
      const sanitizedMessages = Array.isArray(sess.messages)
        ? sess.messages.map((m: ChatMessage, mIdx: number) => {
            let msgId = m.id || `msg-${mIdx}`;
            if (seenMsgIds.has(msgId)) {
              msgId = `${msgId}-${mIdx}`;
            }
            seenMsgIds.add(msgId);
            return { ...m, id: msgId };
          })
        : [];

      // Upgrade any legacy raw-chat titles (e.g. "1+2 berapa") to smart titles automatically
      const firstUserMsg = sanitizedMessages.find((m) => m.role === "user");
      let smartTitle = sess.title || "Obrolan Baru";
      if (
        firstUserMsg &&
        (smartTitle === firstUserMsg.content ||
          /\d+\s*[+\-*/]\s*\d+/.test(smartTitle) ||
          smartTitle.endsWith("?"))
      ) {
        smartTitle = generateSessionTitle(
          firstUserMsg.content,
          firstUserMsg.attachments?.some((a) => a.isVoiceNote),
          Boolean(firstUserMsg.attachments?.length)
        );
      }

      return {
        ...sess,
        id: sessionId,
        title: smartTitle,
        messages: sanitizedMessages,
      };
    });
  } catch {
    return [];
  }
}

export function saveStoredSessions(sessions: ChatSession[]): void {
  try {
    localStorage.setItem(CHAT_SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage quota error
  }
}
