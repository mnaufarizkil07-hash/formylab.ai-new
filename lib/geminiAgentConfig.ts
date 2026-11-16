import {
  Content,
  FunctionDeclaration,
  Part,
  Schema,
  Tool,
  Type,
} from "@google/genai";
import { ChatAttachment } from "./chatStorage";
import { AiModelId } from "../components/AiModelLogos";
import {
  INGREDIENT_PROFILES,
  VALIDATED_PRODUCT_TYPES,
} from "./cosmeticChemistryData";

export type UserIntentCategory =
  | "INFORMATIONAL"
  | "ANALYTICAL"
  | "CONVERSATIONAL";

export interface StructuredIntentResponse {
  intent: UserIntentCategory;
  response_text: string;
  thoughtProcess?: string;
  intentCategory?: UserIntentCategory;
  finalResponse?: string;
}

export interface IntentClassificationResult {
  intentCategory: UserIntentCategory;
  thoughtProcess: string;
  formattingDirective: string;
}

export interface ApiChatMessage {
  role: "user" | "assistant" | "model" | "system";
  content?: string;
  parts?: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }>;
  attachments?: ChatAttachment[];
}

export interface OpenAiChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      >;
}

/**
 * Extracts text from an ApiChatMessage regardless of whether it uses
 * `{ content: '...' }` or the official Gemini API schema `{ parts: [{ text: '...' }] }`.
 */
export function getMessageText(msg?: ApiChatMessage | null): string {
  if (!msg) return "";
  if (typeof msg.content === "string" && msg.content.trim().length > 0) {
    return msg.content.trim();
  }
  if (Array.isArray(msg.parts) && msg.parts.length > 0) {
    return msg.parts
      .map((p) => (typeof p?.text === "string" ? p.text : ""))
      .filter(Boolean)
      .join("\n")
      .trim();
  }
  return typeof msg.content === "string" ? msg.content : "";
}

/**
 * Normalizes incoming request payloads (`body.contents`, `body.messages`, or `body.history`)
 * into a unified multi-turn conversation array where every entry has both `content` and `parts: [{ text }]`
 * and roles strictly mapped for Gemini (`'user'` / `'model'`).
 */
export function normalizeIncomingChatMessages(
  body: Record<string, unknown> | null | undefined
): ApiChatMessage[] {
  if (!body || typeof body !== "object") return [];

  const rawArray =
    Array.isArray(body.contents) && body.contents.length > 0
      ? body.contents
      : Array.isArray(body.messages) && body.messages.length > 0
        ? body.messages
        : Array.isArray(body.history) && body.history.length > 0
          ? body.history
          : [];

  const normalized: ApiChatMessage[] = [];
  for (const item of rawArray) {
    if (!item || typeof item !== "object") continue;
    const rawMsg = item as ApiChatMessage;
    const rawRole = String(rawMsg.role || "user").toLowerCase();
    if (rawRole === "system") continue;

    const role: "user" | "model" =
      rawRole === "model" || rawRole === "assistant" ? "model" : "user";
    const text = getMessageText(rawMsg);
    const parts =
      Array.isArray(rawMsg.parts) && rawMsg.parts.length > 0
        ? rawMsg.parts.map((p) => ({
            ...(typeof p?.text === "string" ? { text: p.text } : {}),
            ...(p?.inlineData ? { inlineData: p.inlineData } : {}),
          }))
        : [{ text }];

    normalized.push({
      role,
      content: text,
      parts,
      attachments: rawMsg.attachments,
    });
  }

  return normalized;
}

/**
 * 1. SYSTEM INSTRUCTION BERSIH & NATURAL
 * Sesuai arsitektur pemanggilan Gemini API dengan Google Search Grounding bawaan
 * dan pengiriman riwayat obrolan (contents) secara utuh.
 */
export const CLEAN_NATURAL_SYSTEM_INSTRUCTION =
  "Kamu adalah asisten AI yang cerdas dan natural. Selalu perhatikan konteks obrolan sebelumnya. Jawab dengan paragraf yang mengalir, dan HANYA buat tabel Markdown jika pengguna secara eksplisit meminta 'tabel' atau 'perbandingan'. Gunakan fitur Google Search bawaan untuk mencari fakta terkini dan ceritakan kembali dengan bahasamu sendiri.";

export const CORE_PRINCIPLE_SYSTEM_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const INTENT_BASED_FORMATTING_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const INTENT_STRUCTURED_OUTPUT_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    intent: {
      type: Type.STRING,
      enum: ["INFORMATIONAL", "ANALYTICAL", "CONVERSATIONAL"],
    },
    response_text: {
      type: Type.STRING,
    },
  },
  required: ["intent", "response_text"],
};

export const RESPONSE_SCHEMA = INTENT_STRUCTURED_OUTPUT_SCHEMA;

export const VERSATILE_SYSTEM_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const MANDATORY_SEARCH_GROUNDING_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const SEARCH_AND_MATH_FILTER_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const NO_DANGLING_MARKDOWN_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const NO_SNIPPET_DATE_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

export const PACING_AND_CONTEXT_INSTRUCTION = CLEAN_NATURAL_SYSTEM_INSTRUCTION;

/**
 * Clean System Instruction for Gemini & OpenAI API calls.
 */
export const ADAPTIVE_SYSTEM_INSTRUCTION =
  "Kamu adalah asisten AI yang cerdas dan natural. Selalu perhatikan konteks obrolan sebelumnya. Jawab dengan paragraf yang mengalir, dan HANYA buat tabel Markdown jika pengguna secara eksplisit meminta 'tabel' atau 'perbandingan'. Gunakan fitur Google Search bawaan untuk mencari fakta terkini dan ceritakan kembali dengan bahasamu sendiri.";

export const EMPATHETIC_CONSULTANT_SYSTEM_INSTRUCTION = ADAPTIVE_SYSTEM_INSTRUCTION;

export const FLEXIBLE_CONSULTANT_SYSTEM_INSTRUCTION = ADAPTIVE_SYSTEM_INSTRUCTION;

export const GEMINI_MODEL_SYSTEM_INSTRUCTION = ADAPTIVE_SYSTEM_INSTRUCTION;

export const OPENAI_MODEL_SYSTEM_MESSAGE = ADAPTIVE_SYSTEM_INSTRUCTION;

export const CORE_SYSTEM_INSTRUCTION = ADAPTIVE_SYSTEM_INSTRUCTION;

export const CONCISE_SYSTEM_INSTRUCTION = ADAPTIVE_SYSTEM_INSTRUCTION;

export const UNIVERSAL_BEHAVIOR_AND_LOGIC_GUIDE = ADAPTIVE_SYSTEM_INSTRUCTION;

export const OPENAI_CHAT_COMPLETIONS_ENDPOINT =
  "https://api.openai.com/v1/chat/completions";

export const DOMAIN_BEHAVIOR_GUIDELINES = ADAPTIVE_SYSTEM_INSTRUCTION;

export const BASE_SYSTEM_INSTRUCTION = ADAPTIVE_SYSTEM_INSTRUCTION;

/**
 * Classifies the user's latest prompt (in the context of the conversation history)
 * into one of the 3 Intent-Based Formatting categories:
 * - INFORMATIONAL (Fakta, Definisi, Padanan): Output HANYA paragraf natural.
 * - ANALYTICAL (Permintaan eksplisit untuk tabel/perbandingan multi-variabel): Output menggunakan tabel Markdown.
 * - CONVERSATIONAL (Opini, saran, ngobrol santai): Output mengalir santai tanpa format kaku.
 */
export function classifyUserQueryIntent(
  messages: ApiChatMessage[]
): IntentClassificationResult {
  const lastMsg = messages[messages.length - 1];
  const lastText = getMessageText(lastMsg);
  const lower = lastText.toLowerCase();

  // 1. Check for explicit ANALYTICAL intent (explicit table or multi-variable comparison request)
  const isEquivalenceOnly =
    /\b(padanan(?:nya)?|ekuivalen(?:nya)?|equivalent|setara|sejenis|contoh\s+lain(?:nya)?|alternatif(?:nya)?)\b/i.test(
      lower
    ) &&
    !/\b(ba?n?dingkan|bandinkan|bandingkn|buatkan\s+perbandi[n]?gan|perbandi[n]?gan|perbadingan|tab[e]?l+|table|komparasi)\b/i.test(
      lower
    );

  const hasExplicitAnalyticalCommand =
    !isEquivalenceOnly &&
    (/\b(ba?n?dingkan|bandinkan|bandingkn|buatkan\s+perbandi[n]?gan|perbandi[n]?gan|perbadingan|perbed[a]+n|beda(?:nya)?|vs\.?|versus|komparasi|dibanding(?:kan)?|dalam\s+bentuk\s+tab[e]?l+|bentuk\s+tab[e]?l+|format\s+tab[e]?l+|buat(?:kan|kn)?\s+tab[e]?l+|bikin(?:kan)?\s+tab[e]?l+|sajikan\s+(?:dalam\s+)?tab[e]?l+|tampilkan\s+(?:dalam\s+)?tab[e]?l+|\btab[e]?l+\b|\btable\b|buatkan\s+formula\s+lengkap|rancang\s+formula|estimasi\s+hpp|hitung\s+hpp|cek\s+bpom|rekomendasi\s+moisturizer)\b/i.test(
      lower
    ) ||
      (/\b(cetaphil)\b/i.test(lower) && /\b(kahf)\b/i.test(lower)));

  if (hasExplicitAnalyticalCommand) {
    return {
      intentCategory: "ANALYTICAL",
      thoughtProcess:
        "Pengguna secara eksplisit meminta perbandingan multi-variabel atau penyajian dalam bentuk tabel. Kategori intent: ANALYTICAL.",
      formattingDirective:
        "[INTENT: ANALYTICAL] Gunakan tabel Markdown yang rapi untuk menyajikan perbandingan atau analisis multi-variabel sesuai permintaan pengguna.",
    };
  }

  // 2. Check for CONVERSATIONAL intent (opini, saran, rekomendasi santai, ngobrol santai)
  const hasConversationalIntent =
    !isEquivalenceOnly &&
    /\b(menurut(?:mu|nya)?|menurut\s+kamu|pendapat(?:mu)?|opini(?:mu)?|saran(?:mu|nya)?|kasih\s+saran|minta\s+saran|sebaiknya\s+(?:saya|aku|pilih|pakai)|mending\s+(?:pakai|pilih)|cocok\s+yang\s+mana|pilih\s+yang\s+mana|halo|hai|pagi|siang|sore|malam|apa\s+kabar|terima\s+kasih|makasih|thanks|thank\s+you|ngobrol|curhat|gimana\s+ya|bagusnya\s+gimana)\b/i.test(
      lower
    );

  if (hasConversationalIntent) {
    return {
      intentCategory: "CONVERSATIONAL",
      thoughtProcess:
        "Pengguna meminta opini, saran praktis, atau mengobrol santai tanpa meminta tabel. Kategori intent: CONVERSATIONAL.",
      formattingDirective:
        "[INTENT: CONVERSATIONAL] Jawab mengalir santai, ramah, dan natural tanpa format kaku dan TANPA tabel Markdown.",
    };
  }

  // 3. Default to INFORMATIONAL intent (Fakta, Definisi, Lokasi, Sejarah, Padanan/Ekuivalen)
  return {
    intentCategory: "INFORMATIONAL",
    thoughtProcess:
      "Pengguna menanyakan fakta, definisi, lokasi, sejarah, atau padanan konsep. Kategori intent: INFORMATIONAL.",
    formattingDirective:
      "[INTENT: INFORMATIONAL] Output HANYA paragraf natural yang jelas dan informatif. JANGAN gunakan tabel Markdown.",
  };
}

/**
 * Converts any accidental Markdown table in an INFORMATIONAL or CONVERSATIONAL response
 * into natural narrative sentences so tables are NEVER forced when not requested.
 */
export function convertUnrequestedTableToNarrative(text: string): string {
  if (!text.includes("|")) return text;

  const lines = text.split("\n");
  const outLines: string[] = [];
  let headers: string[] = [];
  const narrativeItems: string[] = [];

  const flushTableToParagraph = () => {
    if (narrativeItems.length > 0) {
      outLines.push(narrativeItems.join(" "));
      narrativeItems.length = 0;
    }
    headers = [];
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      const isSeparator = cells.every((c) => /^:?-{2,}:?$/.test(c));
      if (isSeparator) continue;

      if (headers.length === 0) {
        headers = cells.map((h) => h.replace(/\*\*/g, "").trim());
      } else {
        const aspect = cells[0]?.replace(/\*\*/g, "").trim() || "";
        const details = cells
          .slice(1)
          .map((val, idx) => {
            const colName = headers[idx + 1] || "";
            const cleanVal = val.trim();
            if (!cleanVal) return "";
            return colName ? `${colName}: ${cleanVal}` : cleanVal;
          })
          .filter(Boolean)
          .join("; ");
        if (aspect && details) {
          narrativeItems.push(`Dari sisi ${aspect.toLowerCase()}, ${details}.`);
        } else if (aspect || details) {
          narrativeItems.push(`${aspect} ${details}`.trim() + ".");
        }
      }
    } else {
      flushTableToParagraph();
      outLines.push(rawLine);
    }
  }
  flushTableToParagraph();

  return outLines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Parses model output matching `responseSchema: { intent: string, response_text: string }`
 * (as well as legacy `{ thoughtProcess, intentCategory, finalResponse }` or raw text)
 * and guarantees that `response_text` strictly adheres to the `intent` formatting rules.
 */
export function parseIntentBasedModelOutput(
  rawText: string,
  fallbackIntent: UserIntentCategory = "INFORMATIONAL"
): {
  intent: UserIntentCategory;
  response_text: string;
  reply: string;
  intentCategory: UserIntentCategory;
  thoughtProcess: string;
} {
  const trimmed = (rawText || "").trim();
  if (!trimmed) {
    return {
      intent: fallbackIntent,
      response_text: "",
      reply: "",
      intentCategory: fallbackIntent,
      thoughtProcess: "",
    };
  }

  // 1. Parse Structured Output JSON (`{ "intent": "...", "response_text": "..." }`)
  const jsonCandidate = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  if (jsonCandidate.startsWith("{") && jsonCandidate.endsWith("}")) {
    try {
      const parsed = JSON.parse(jsonCandidate) as Partial<StructuredIntentResponse>;
      const candidateResponseText =
        typeof parsed.response_text === "string" && parsed.response_text.trim()
          ? parsed.response_text.trim()
          : typeof parsed.finalResponse === "string" && parsed.finalResponse.trim()
            ? parsed.finalResponse.trim()
            : "";

      if (candidateResponseText) {
        const rawIntent = String(
          parsed.intent || parsed.intentCategory || ""
        ).toUpperCase();
        const resolvedIntent: UserIntentCategory =
          rawIntent === "ANALYTICAL" ||
          rawIntent === "CONVERSATIONAL" ||
          rawIntent === "INFORMATIONAL"
            ? (rawIntent as UserIntentCategory)
            : fallbackIntent;

        // If the backend classifier determined INFORMATIONAL or CONVERSATIONAL (user did NOT ask for a table),
        // enforce non-table formatting even if the model over-classified as ANALYTICAL.
        const effectiveIntent: UserIntentCategory =
          fallbackIntent !== "ANALYTICAL" ? fallbackIntent : resolvedIntent;

        const cleanReply =
          effectiveIntent === "INFORMATIONAL" ||
          effectiveIntent === "CONVERSATIONAL"
            ? convertUnrequestedTableToNarrative(candidateResponseText)
            : candidateResponseText;

        return {
          intent: effectiveIntent,
          response_text: cleanReply,
          reply: cleanReply,
          intentCategory: effectiveIntent,
          thoughtProcess:
            typeof parsed.thoughtProcess === "string"
              ? parsed.thoughtProcess.trim()
              : "",
        };
      }
    } catch {
      // Not valid JSON, fall through to inline tag extraction
    }
  }

  // 2. Strip any inline hidden chain-of-thought tags (`<thought>...</thought>`, `[THOUGHT]...[/THOUGHT]`, `[INTENT: ...]`)
  let thoughtProcess = "";
  const thoughtMatch = trimmed.match(/<thought>([\s\S]*?)<\/thought>/i);
  if (thoughtMatch) {
    thoughtProcess = thoughtMatch[1].trim();
  }

  let detectedIntent = fallbackIntent;
  const intentTagMatch = trimmed.match(
    /\[?\s*INTENT(?:_CATEGORY)?\s*:\s*(INFORMATIONAL|ANALYTICAL|CONVERSATIONAL)\s*\]?/i
  );
  if (intentTagMatch && fallbackIntent === "ANALYTICAL") {
    detectedIntent = intentTagMatch[1].toUpperCase() as UserIntentCategory;
  }

  let cleanedReply = trimmed
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/\[THOUGHT\][\s\S]*?\[\/THOUGHT\]/gi, "")
    .replace(
      /^\[?\s*INTENT(?:_CATEGORY)?\s*:\s*(?:INFORMATIONAL|ANALYTICAL|CONVERSATIONAL)\s*\]?\s*/gim,
      ""
    )
    .trim();

  if (
    detectedIntent === "INFORMATIONAL" ||
    detectedIntent === "CONVERSATIONAL"
  ) {
    cleanedReply = convertUnrequestedTableToNarrative(cleanedReply);
  }

  return {
    intent: detectedIntent,
    response_text: cleanedReply,
    reply: cleanedReply,
    intentCategory: detectedIntent,
    thoughtProcess,
  };
}

export const GEMINI_FALLBACK_MODEL_CHAIN = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
  "gemini-3-flash-preview",
  "gemini-2.5-flash-lite",
  "gemini-1.5-flash",
] as const;

export type OfficialGeminiSdkModel = string;

export const PRIMARY_GEMINI_SDK_MODEL: OfficialGeminiSdkModel =
  GEMINI_FALLBACK_MODEL_CHAIN[0];

export const OPENAI_STYLE_PERSONA_INSTRUCTION =
  "Karakteristik Model Aktif (Gaya OpenAI — GPT-6 Luna / GPT-6 Omni): Meresponslah dengan gaya bahasa yang ringkas, analitis, tajam, dan to-the-point layaknya model OpenAI tanpa basa-basi.";

export const GEMINI_STYLE_PERSONA_INSTRUCTION =
  "Karakteristik Model Aktif (Gaya Google Gemini — Gemini 3.8 Flash / Gemini 3.8 Pro): Gunakan gaya penjelasan yang mengalir luwes, komprehensif, kontekstual, dan mudah dipahami.";

/**
 * Mengembalikan daftar urutan kandidat model (Fallback Chain) yang dicoba secara berurutan:
 * ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-1.5-flash"]
 */
export function getGeminiFallbackModelChain(): string[] {
  return [...GEMINI_FALLBACK_MODEL_CHAIN];
}

export function mapUiModelToGeminiSdkModel(
  _uiModel?: string | null
): OfficialGeminiSdkModel {
  return PRIMARY_GEMINI_SDK_MODEL;
}

export interface GoogleListModelsEntry {
  name?: string;
  supportedGenerationMethods?: string[];
}

/**
 * Filter untuk menyaring model khusus (vision/embedding/imagen/veo/tts/audio) saat melakukan
 * Deteksi Model Dinamis (ListModels Fallback) agar hanya memilih model teks/chat yang valid.
 */
export function isSupportedDynamicChatModel(
  entry: GoogleListModelsEntry
): boolean {
  if (!entry || typeof entry.name !== "string") return false;
  if (
    !Array.isArray(entry.supportedGenerationMethods) ||
    !entry.supportedGenerationMethods.includes("generateContent")
  ) {
    return false;
  }
  const lowerName = entry.name.toLowerCase();
  // Abaikan model vision/embedding/imagen/aqa/tts/veo khusus
  if (
    /\b(vision|embedding|embed|imagen|veo|aqa|tts|audio|whisper|bisheng|robotics)\b/i.test(
      lowerName
    ) ||
    lowerName.includes("-vision") ||
    lowerName.includes("embedding") ||
    lowerName.includes("-tts") ||
    lowerName.includes("-image")
  ) {
    return false;
  }
  return true;
}

/**
 * Deteksi Model Dinamis (ListModels Fallback):
 * Melakukan fetch ke https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}
 * dan mencari model di dalam respons JSON yang memiliki "generateContent" pada
 * array supportedGenerationMethods (selain model vision/embedding khusus).
 */
export async function discoverDynamicGeminiModels(
  apiKey: string
): Promise<string[]> {
  if (!apiKey) return [];
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(
      `ListModels gagal dengan status HTTP ${res.status}: ${await res.text()}`
    );
  }
  const data = (await res.json()) as { models?: GoogleListModelsEntry[] };
  const modelsList = Array.isArray(data?.models) ? data.models : [];

  const validModels: string[] = [];
  for (const m of modelsList) {
    if (isSupportedDynamicChatModel(m) && m.name) {
      const normalizedModelName = m.name.replace(/^models\//i, "").trim();
      if (normalizedModelName && !validModels.includes(normalizedModelName)) {
        validModels.push(normalizedModelName);
      }
    }
  }
  return validModels;
}

export const REALTIME_SEARCH_GROUNDING_RULE =
  "Untuk pertanyaan mengenai berita, kejadian terkini, pejabat publik, atau fakta sejarah/tanggal spesifik, kamu WAJIB menggunakan alat googleSearch untuk mencari informasi terbaru hingga waktu present sebelum menjawab.";

export function getPresentTimeContextInstruction(now: Date = new Date()): string {
  const formattedIdDate = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(now);
  return `Konteks Waktu Saat Ini (Present): ${formattedIdDate} (${now.toISOString()}). ${REALTIME_SEARCH_GROUNDING_RULE}`;
}

/**
 * 2B. BEDAKAN KARAKTERISTIK MODEL UI LEWAT SYSTEM INSTRUCTION
 * - Saat pengguna memilih GPT-6 Luna atau GPT-6 Omni: berikan instruksi khusus untuk merespons
 *   dengan gaya bahasa yang ringkas, analitis, dan to-the-point layaknya model OpenAI.
 * - Saat memilih Gemini 3.8 Flash atau Gemini 3.8 Pro: gunakan gaya penjelasan yang mengalir dan komprehensif.
 * - Saat memilih Auto: tentukan rute secara dinamis berdasarkan kompleksitas pertanyaan dan terapkan karakteristiknya.
 * - Menyisipkan konteks waktu saat ini (present) dan kewajiban menggunakan googleSearch untuk informasi terkini.
 */
export function getSystemInstructionForUiModel(
  uiModel?: string | null,
  messages: ApiChatMessage[] = [],
  now: Date = new Date()
): string {
  const normalized = (uiModel || "").trim().toLowerCase();

  let effectiveUiModel = normalized;
  if (!effectiveUiModel || effectiveUiModel === "auto") {
    effectiveUiModel =
      messages.length > 0 ? resolveAutoModelRoute(messages) : "gemini-3.8-flash";
  }

  const isOpenAiPersona =
    effectiveUiModel === "gpt-6-luna" ||
    effectiveUiModel === "gpt-6 luna" ||
    effectiveUiModel === "gpt-6-omni" ||
    effectiveUiModel === "gpt-6 omni" ||
    effectiveUiModel === "gpt";

  const personaInstruction = isOpenAiPersona
    ? OPENAI_STYLE_PERSONA_INSTRUCTION
    : GEMINI_STYLE_PERSONA_INSTRUCTION;

  const presentTimeContext = getPresentTimeContextInstruction(now);

  return `${ADAPTIVE_SYSTEM_INSTRUCTION}\n\n${presentTimeContext}\n\n${personaInstruction}`;
}

/**
 * FUNGSI PENENTU DYNAMIC ROUTING UNTUK MODEL 'AUTO'
 * Merutekan pertanyaan pengguna secara dinamis:
 * - Ke 'gemini-3.8-flash' untuk pertanyaan sederhana/cepat.
 * - Ke 'gemini-3.8-pro' atau 'gpt-6-omni' untuk pertanyaan yang membutuhkan penalaran kompleks.
 */
export function resolveAutoModelRoute(
  messages: ApiChatMessage[]
): Exclude<AiModelId, "auto"> {
  const lastMsg = messages[messages.length - 1];
  const text = getMessageText(lastMsg);
  const lower = text.toLowerCase();
  const hasAttachments = Boolean(
    lastMsg?.attachments && lastMsg.attachments.length > 0
  );

  const wordCount = text.split(/\s+/).filter(Boolean).length;

  const isDeepMarketOrArchitectureQuery =
    /\b(master\s+blueprint|arsitektur|strategi\s+bisnis|hpp|cogs|moq|scale[\s-]?up|industri|benchmark\s+global|komparasi\s+lengkap|bandingkan\s+secara\s+mendalam)\b/i.test(
      lower
    );

  const isComplexScientificOrMathQuery =
    hasAttachments ||
    wordCount >= 18 ||
    /\b(formula\s+lengkap|fase\s+a|hlb|viskositas|kompatibilitas|interaksi\s+kimia|stabilitas|bpom|halal|persamaan|pecahan|pemdas|bodmas|integral|turunan|logaritma|analisis|jelaskan\s+secara\s+detail|mengapa|bagaimana\s+mekanisme)\b/i.test(
      lower
    ) ||
    /[÷×/:+-].*[÷×/:+-]/.test(text);

  if (isDeepMarketOrArchitectureQuery) {
    return "gpt-6-omni";
  }

  if (isComplexScientificOrMathQuery) {
    return "gemini-3.8-pro";
  }

  return "gemini-3.8-flash";
}

/**
 * 3. SCAFFOLDING FUNCTION CALLING (Ekosistem Function Calling / External Tools)
 */
export const EXTERNAL_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [];

export function buildGeminiToolsConfig(options?: {
  enableGoogleSearch?: boolean;
  enableCodeExecution?: boolean;
  functionDeclarations?: FunctionDeclaration[];
}): Tool[] {
  const enableSearch = options?.enableGoogleSearch ?? true;
  const enableCodeExec = options?.enableCodeExecution ?? true;
  const fnDecls =
    options?.functionDeclarations ?? EXTERNAL_FUNCTION_DECLARATIONS;

  const tools: Tool[] = [{ googleSearch: {} }];
  if (!enableSearch) {
    // Tetap pastikan googleSearch: {} selalu aktif untuk akurasi faktual sesuai arsitektur Search Grounding
  }
  if (enableCodeExec) {
    tools.push({ codeExecution: {} });
  }
  if (fnDecls.length > 0) {
    tools.push({ functionDeclarations: fnDecls });
  }
  return tools;
}

function escapeWordRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Internal RAG context ONLY activates when the user explicitly discusses
 * cosmetic formulation, INCI ingredients, or skincare R&D — NEVER on general or tech topics.
 */
export function buildInternalRagContext(messages: ApiChatMessage[]): string {
  const combinedRecent = messages
    .slice(-4)
    .map((m) => getMessageText(m))
    .join(" ")
    .toLowerCase();

  const hasExplicitCosmeticIntent =
    /\b(skincare|kosmetik|formulasi|formula|inci|bpom|maklon|emulsi|hlb|viskositas|moisturizer|pelembap|sunscreen|cleanser|serum\s+wajah|toner\s+wajah|kulit\s+wajah|skin\s+barrier|niacinamide|ceramide|salicylic\s+acid|hyaluronic\s+acid|panthenol|phenoxyethanol|alpha\s+arbutin|bakuchiol|retinol)\b/i.test(
      combinedRecent
    );

  if (!hasExplicitCosmeticIntent) {
    return "";
  }

  const matchedIngredients: string[] = [];
  for (const profile of Object.values(INGREDIENT_PROFILES)) {
    const keyTerm = profile.key.replace(/_/g, " ").toLowerCase();
    const inciTerm = profile.inciName.split("(")[0].trim().toLowerCase();
    const terms = [keyTerm, inciTerm].filter((t) => t.length >= 5);
    if (
      terms.some((t) =>
        new RegExp(`\\b${escapeWordRegex(t)}\\b`, "i").test(combinedRecent)
      )
    ) {
      matchedIngredients.push(
        `- ${profile.inciName} (CAS ${profile.casNumber}): Fungsi=${profile.functionalCategory}, Dosis=${profile.typicalUsageRate}, pH Optimal=${profile.optimalPhRange}, Fase=${profile.solubilityPhase}, Sinergis=${profile.synergisticWith.join(", ")}, Hindari=${profile.avoidWith.join(", ")}, Sertifikasi=${profile.certifications.join(", ")}`
      );
    }
  }

  const matchedProducts: string[] = [];
  for (const prod of VALIDATED_PRODUCT_TYPES) {
    const prodTerms = [prod.name.toLowerCase(), prod.shortName.toLowerCase()].filter(
      (kw) => kw.length >= 6
    );
    if (
      prodTerms.some((kw) =>
        new RegExp(`\\b${escapeWordRegex(kw)}\\b`, "i").test(combinedRecent)
      )
    ) {
      matchedProducts.push(
        `- Produk ${prod.name}: Sistem=${prod.systemType}, Target pH=${prod.targetPh} (${prod.validPhRange}), Viskositas=${prod.targetViscosity}, rHLB=${prod.requiredHlb}`
      );
    }
  }

  if (matchedIngredients.length === 0 && matchedProducts.length === 0) {
    return "";
  }

  return `\n[INTERNAL RAG KNOWLEDGE BASE — DATA FORMULASI & REGULASI FORMYLAB]:\n${[
    ...matchedIngredients.slice(0, 6),
    ...matchedProducts.slice(0, 2),
  ].join("\n")}`;
}

export function extractMessageParts(
  msg: ApiChatMessage,
  fallbackAttachments?: ChatAttachment[],
  extraContextText?: string
): Part[] {
  const parts: Part[] = [];
  const attachmentsToUse =
    msg.attachments && msg.attachments.length > 0
      ? msg.attachments
      : fallbackAttachments || [];

  const textDescriptions: string[] = [];

  for (const att of attachmentsToUse) {
    if (att.isVoiceNote) {
      textDescriptions.push(
        `[User mengirim Voice Note (VN): ${att.name} (${att.sizeLabel})${
          att.textPreview ? ` - Transkrip: "${att.textPreview}"` : ""
        }]`
      );
    } else if (att.textPreview) {
      textDescriptions.push(
        `[Lampiran file "${att.name}" (${att.sizeLabel})]:\n\`\`\`\n${att.textPreview}\n\`\`\``
      );
    } else {
      textDescriptions.push(
        `[Lampiran gambar/file "${att.name}" (${att.mimeType}, ${att.sizeLabel})]`
      );
    }

    if (att.dataUrl && att.dataUrl.startsWith("data:")) {
      const commaIdx = att.dataUrl.indexOf(",");
      if (commaIdx !== -1) {
        const header = att.dataUrl.slice(5, commaIdx);
        const mimeType = header.split(";")[0] || att.mimeType;
        const base64Data = att.dataUrl.slice(commaIdx + 1);
        if (
          base64Data &&
          (mimeType.startsWith("image/") ||
            mimeType.startsWith("audio/") ||
            mimeType === "application/pdf")
        ) {
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }
    }
  }

  // Also preserve any inlineData passed directly in msg.parts
  if (Array.isArray(msg.parts)) {
    for (const p of msg.parts) {
      if (p?.inlineData?.data && p?.inlineData?.mimeType) {
        parts.push({
          inlineData: {
            mimeType: p.inlineData.mimeType,
            data: p.inlineData.data,
          },
        });
      }
    }
  }

  const baseMessageText = getMessageText(msg);
  const combinedText = [
    ...textDescriptions,
    baseMessageText,
    extraContextText || "",
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (combinedText || parts.length === 0) {
    parts.push({ text: combinedText || "..." });
  }

  return parts;
}

export interface ConversationalFollowUpResolution {
  isFollowUp: boolean;
  isTableRequest: boolean;
  previousUserTopic: string;
  previousModelReply: string;
  effectiveSearchQuery: string;
  contextualReminderForAi: string;
}

const PURE_FORMATTING_NOISE_REGEX =
  /\b(tolong|tlng|tlong|coba|cba|bisa|mohon|buatkan|buatkn|buat|bikin|bikinkan|sajikan|ubah|rubah|tampilkan|berikan|kasih|jadi|menjadi|ke|dalam|dlm|dalm|bentuk|bntuk|format|tabel|table|tabelnya|tablenya|tbel|tabell|poin|poin-poin|bullet|list|daftar|ringkasan|rangkuman|rangkum|ringkas|lebih|detail|lengkap|jelas|lanjut|lanjutkan|dong|ya|kak|bro|min)\b/gi;

/**
 * Resolves follow-up instructions (e.g. "buatkan dalam bentuk tabel", "jelaskan lebih detail",
 * "bandingkan dengan X", or follow-ups containing typos) against the preceding conversation history
 * so context is never lost.
 */
export function resolveConversationalFollowUp(
  messages: ApiChatMessage[]
): ConversationalFollowUpResolution {
  const userAndModelMsgs = messages.filter(
    (m) => m.role === "user" || m.role === "assistant" || m.role === "model"
  );
  const lastMsg = userAndModelMsgs[userAndModelMsgs.length - 1];
  const lastUserText = getMessageText(lastMsg);
  const lowerLast = lastUserText.toLowerCase();

  const isTableRequest =
    /\b(dalam\s+bentuk\s+tab[e]?l+|bentuk\s+tab[e]?l+|format\s+tab[e]?l+|buat(?:kan|kn)?\s+tab[e]?l+(?:nya)?|bikin(?:kan)?\s+tab[e]?l+(?:nya)?|sajikan\s+(?:dalam\s+)?tab[e]?l+|ubah\s+ke\s+tab[e]?l+|tampilkan\s+(?:dalam\s+)?tab[e]?l+|tab[e]?l+(?:nya)?\s+(?:dong|ya|aja|saja)|pakai\s+tab[e]?l+|gunakan\s+tab[e]?l+|^tab[e]?l+$|\btable\b)\b/i.test(
      lowerLast
    );

  // Find the most recent prior substantive user message & model reply
  let previousUserTopic = "";
  let previousModelReply = "";

  for (let i = userAndModelMsgs.length - 2; i >= 0; i--) {
    const msg = userAndModelMsgs[i];
    const role =
      msg.role === "assistant" || msg.role === "model" ? "model" : "user";
    const text = getMessageText(msg);
    if (!text) continue;

    if (role === "model" && !previousModelReply) {
      previousModelReply = text;
    } else if (role === "user" && !previousUserTopic) {
      const strippedPrev = text
        .replace(PURE_FORMATTING_NOISE_REGEX, " ")
        .replace(/[?!.,:;]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      if (strippedPrev.length >= 2) {
        previousUserTopic = text;
      }
    }

    if (previousUserTopic && previousModelReply) {
      break;
    }
  }

  const strippedCurrentTopic = lastUserText
    .replace(PURE_FORMATTING_NOISE_REGEX, " ")
    .replace(/[?!.,:;]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const wordCount = lastUserText.split(/\s+/).filter(Boolean).length;
  const hasPronounOrContinuation =
    /\b(itu|ini|tersebut|keduanya|dua-duanya|nya|tadi|lanjut|lanjutkan|detailnya|kelebihannya|kekurangannya|manfaatnya|harganya|lokasinya|alamatnya|sejarahnya|pendirinya|berdirinya|didirikan|kapan\s+berdiri|kapan\s+didirikan|tanggal\s+berapa|tahun\s+berapa|bedanya|perbedaannya|perbandi[n]?gan(?:nya)?|dibanding(?:kan)?|ba?n?dingkan|bandinkan|padanan(?:nya)?|ekuivalen(?:nya)?|equivalent|contoh\s+lain(?:nya)?)\b/i.test(
      lowerLast
    );

  const isEquivalenceOrExampleRequest =
    /\b(padanan(?:nya)?|ekuivalen(?:nya)?|equivalent|setara|sejenis|contoh\s+lain(?:nya)?|alternatif(?:nya)?)\b/i.test(
      lowerLast
    ) &&
    !/\b(ba?n?dingkan|bandinkan|bandingkn|buatkan\s+perbandi[n]?gan|perbandi[n]?gan|perbadingan|tab[e]?l+|table|komparasi)\b/i.test(
      lowerLast
    );

  const isFollowUp =
    Boolean(previousUserTopic || previousModelReply) &&
    (isTableRequest ||
      isEquivalenceOrExampleRequest ||
      strippedCurrentTopic.length < 3 ||
      (wordCount <= 12 && hasPronounOrContinuation));

  const effectiveSearchQuery = isFollowUp
    ? [previousUserTopic, strippedCurrentTopic]
        .filter(Boolean)
        .join(" ")
        .trim() || lastUserText
    : lastUserText;

  const contextualReminderForAi = isFollowUp
    ? `\n[KONTEKS RIWAYAT OBROLAN SEBELUMNYA — WAJIB DIPERTAHANKAN]:
Pertanyaan pengguna sebelumnya: "${previousUserTopic}"
Instruksi lanjutan pengguna saat ini: "${lastUserText}"
${
  isTableRequest
    ? "INSTRUKSI FORMAT (ON-DEMAND TABLE): Pengguna secara eksplisit meminta perbandingan/tabel dari obrolan sebelumnya disajikan dalam bentuk TABEL MARKDOWN yang rapi dan akurat. Gunakan seluruh informasi dari obrolan sebelumnya tanpa kehilangan konteks, toleransi salah ketik (typo), dan JANGAN PERNAH berasumsi produk kecantikan."
    : isEquivalenceOrExampleRequest
      ? "INSTRUKSI PACING (JAWAB SESUAI PORSI — TANPA TABEL): Pengguna hanya menanyakan 'padanan', 'ekuivalen', atau 'contoh lain'. Jawab HANYA dengan paragraf penjelasan naratif yang memetakan konsep tersebut terhadap topik sebelumnya. DILARANG mengeluarkan tabel perbandingan penuh."
      : "INSTRUKSI KONTEKS & ANTI-REDUNDANSI: Jawab instruksi lanjutan ini sebagai kelanjutan natural dari obrolan sebelumnya dengan menoleransi salah ketik (typo). Jangan mengulang struktur format/tabel yang persis sama dengan respons sebelumnya, dan jangan mengeluarkan tabel kecuali diminta secara eksplisit."
}`
    : "";

  return {
    isFollowUp,
    isTableRequest,
    previousUserTopic,
    previousModelReply,
    effectiveSearchQuery,
    contextualReminderForAi,
  };
}

/**
 * 4A. MANAJEMEN KONTEKS GLOBAL UNTUK GEMINI (Multi-Turn `contents` Array)
 * Mengirimkan seluruh alur obrolan sesuai skema resmi Gemini API:
 * `contents: [{ role: 'user', parts: [{ text: '...' }] }, { role: 'model', parts: [{ text: '...' }] }]`
 */
export function buildGeminiConversationHistory(
  messages: ApiChatMessage[],
  extraLatestTurnContext = ""
): {
  contents: Content[];
  hasAnyAttachment: boolean;
} {
  const recentMessages = messages.slice(-40);

  let recentImageAttachments: ChatAttachment[] | undefined;
  const lastMsg = recentMessages[recentMessages.length - 1];
  if (!lastMsg?.attachments || lastMsg.attachments.length === 0) {
    for (
      let i = recentMessages.length - 2;
      i >= Math.max(0, recentMessages.length - 6);
      i--
    ) {
      const prevAtts = recentMessages[i]?.attachments;
      if (prevAtts && prevAtts.some((a) => a.mimeType?.startsWith("image/"))) {
        recentImageAttachments = prevAtts;
        break;
      }
    }
  }

  let hasAnyAttachment = Boolean(recentImageAttachments?.length);
  const contents: Content[] = [];

  const combinedLatestContext = (extraLatestTurnContext || "").trim();

  for (let i = 0; i < recentMessages.length; i++) {
    const m = recentMessages[i];
    if (m.role === "system") continue;

    if (m.attachments && m.attachments.length > 0) {
      hasAnyAttachment = true;
    }
    const isLast = i === recentMessages.length - 1;
    const normalizedRole: "user" | "model" =
      m.role === "assistant" || m.role === "model" ? "model" : "user";

    const parts = extractMessageParts(
      m,
      isLast && normalizedRole === "user" ? recentImageAttachments : undefined,
      isLast && normalizedRole === "user" && combinedLatestContext
        ? combinedLatestContext
        : undefined
    );

    const prevContent = contents[contents.length - 1];
    if (prevContent && prevContent.role === normalizedRole && prevContent.parts) {
      prevContent.parts.push(...parts);
    } else {
      contents.push({
        role: normalizedRole,
        parts,
      });
    }
  }

  while (contents.length > 1 && contents[0].role !== "user") {
    contents.shift();
  }

  return { contents, hasAnyAttachment };
}

/**
 * 4B. MANAJEMEN KONTEKS GLOBAL UNTUK OPENAI (Multi-Turn `messages` Array)
 */
export function buildOpenAiConversationMessages(
  messages: ApiChatMessage[],
  extraSystemContext = ""
): OpenAiChatMessage[] {
  const combinedExtraSystem = (extraSystemContext || "").trim();

  const systemContent = combinedExtraSystem
    ? `${ADAPTIVE_SYSTEM_INSTRUCTION}\n\n${combinedExtraSystem}`
    : ADAPTIVE_SYSTEM_INSTRUCTION;

  const openAiMessages: OpenAiChatMessage[] = [
    {
      role: "system",
      content: systemContent,
    },
  ];

  const recentMessages = messages.slice(-40);
  for (const m of recentMessages) {
    if (m.role === "system") continue;
    const normalizedRole: "user" | "assistant" =
      m.role === "assistant" || m.role === "model" ? "assistant" : "user";
    const textContent = getMessageText(m);

    const imageAttachments = (m.attachments || []).filter(
      (a) => a.dataUrl && a.dataUrl.startsWith("data:image/")
    );

    if (normalizedRole === "user" && imageAttachments.length > 0) {
      const contentParts: Array<
        | { type: "text"; text: string }
        | { type: "image_url"; image_url: { url: string } }
      > = [
        {
          type: "text",
          text: textContent || "Analisis gambar berikut secara mendetail.",
        },
      ];
      for (const img of imageAttachments) {
        if (img.dataUrl) {
          contentParts.push({
            type: "image_url",
            image_url: { url: img.dataUrl },
          });
        }
      }
      openAiMessages.push({
        role: "user",
        content: contentParts,
      });
    } else {
      openAiMessages.push({
        role: normalizedRole,
        content: textContent || "...",
      });
    }
  }

  return openAiMessages;
}
