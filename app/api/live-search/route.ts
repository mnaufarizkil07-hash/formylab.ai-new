import { NextRequest, NextResponse } from "next/server";
import {
  type WebSourceCitation,
  normalizeWebSourceCitation,
} from "../../../components/chatNoteUtils";
import { formatTodayIndonesianDateWib } from "../../../components/liveVoiceHelpers";

export const dynamic = "force-dynamic";

const GEMINI_REST_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const OVERALL_SEARCH_BUDGET_MS = 9_200;
const MAX_SOURCES = 3;

interface SearchModelCandidate {
  model: string;
  generationConfig: Record<string, unknown>;
  maxTimeoutMs: number;
}

/**
 * Ordered search model candidates:
 * 1. gemini-2.5-flash (thinkingBudget: 0) — user-specified primary for keys with 2.5 access (1-3s).
 * 2. gemini-3.1-flash-lite (thinkingLevel: MINIMAL) — ultra-fast active Gemini 3 fallback.
 * 3. gemini-4-hydrogen (thinkingLevel: LOW, no temperature) — active Gemini 4 fallback.
 */
const SEARCH_MODEL_CANDIDATES: readonly SearchModelCandidate[] = [
  {
    model: "gemini-2.5-flash",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingBudget: 0 },
    },
    maxTimeoutMs: 7_000,
  },
  {
    model: "gemini-3.1-flash-lite",
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 300,
      thinkingConfig: { thinkingLevel: "MINIMAL" },
    },
    maxTimeoutMs: 6_500,
  },
  {
    model: "gemini-4-hydrogen",
    generationConfig: {
      thinkingConfig: { thinkingLevel: "LOW" },
    },
    maxTimeoutMs: 6_500,
  },
];

interface GeminiRestPart {
  text?: string;
  thought?: boolean;
}

interface GeminiGroundingChunk {
  web?: {
    title?: string;
    uri?: string;
  };
}

interface GeminiRestResponse {
  candidates?: Array<{
    content?: {
      parts?: GeminiRestPart[];
    };
    groundingMetadata?: {
      groundingChunks?: GeminiGroundingChunk[];
    };
  }>;
  error?: {
    code?: number;
    status?: string;
    message?: string;
  };
}

interface SearchAttemptResult {
  ok: boolean;
  httpStatus: number;
  modelUsed: string;
  summary: string;
  sources: WebSourceCitation[];
  errorCode: string;
  errorDetail: string;
}

function resolveGeminiApiKey(): string {
  return (
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_GENERATIVE_AI_API_KEY ||
    process.env.API_KEY ||
    ""
  ).trim();
}

function sanitizeErrorDetail(raw: string, apiKey: string): string {
  let cleaned = (raw || "").replace(/\s+/g, " ").trim();
  if (apiKey) {
    cleaned = cleaned.split(apiKey).join("[REDACTED]");
  }
  cleaned = cleaned.replace(/([?&]key=)[^&\s]+/gi, "$1[REDACTED]");
  return cleaned.slice(0, 500);
}

function extractSummaryFromRestPayload(data: GeminiRestResponse): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts) || parts.length === 0) return "";

  const joined = parts
    .filter((p) => !p?.thought && typeof p?.text === "string")
    .map((p) => p.text as string)
    .filter(Boolean)
    .join(" ");

  return joined
    .replace(/[*#_`~]+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 900);
}

function extractTopSourcesFromRestPayload(
  data: GeminiRestResponse,
  maxSources = MAX_SOURCES
): WebSourceCitation[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks) || chunks.length === 0) return [];

  const seen = new Set<string>();
  const results: WebSourceCitation[] = [];

  for (const chunk of chunks) {
    if (results.length >= maxSources) break;
    const web = chunk?.web;
    if (!web?.uri) continue;
    const normalized = normalizeWebSourceCitation({
      title: web.title || "",
      uri: web.uri,
    });
    if (!normalized) continue;
    const dedupKey = normalized.url.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);
    results.push(normalized);
  }

  return results;
}

async function callGeminiRestSearch(params: {
  candidate: SearchModelCandidate;
  prompt: string;
  apiKey: string;
  timeoutMs: number;
}): Promise<SearchAttemptResult> {
  const { candidate, prompt, apiKey, timeoutMs } = params;
  const { model, generationConfig } = candidate;
  const endpoint = `${GEMINI_REST_BASE}/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "aistudio-build",
      },
      signal: controller.signal,
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ text: prompt }],
          },
        ],
        tools: [{ google_search: {} }],
        generationConfig,
      }),
    });

    const rawBody = await res.text();
    let parsed: GeminiRestResponse = {};
    try {
      parsed = JSON.parse(rawBody) as GeminiRestResponse;
    } catch {
      parsed = {};
    }

    if (!res.ok) {
      const apiErrStatus = parsed?.error?.status || `HTTP_${res.status}`;
      const apiErrMsg =
        parsed?.error?.message || rawBody || `HTTP ${res.status} dari Gemini API`;
      return {
        ok: false,
        httpStatus: res.status,
        modelUsed: model,
        summary: "",
        sources: [],
        errorCode: apiErrStatus,
        errorDetail: sanitizeErrorDetail(
          `[${model} HTTP ${res.status}] ${apiErrMsg}`,
          apiKey
        ),
      };
    }

    const summary = extractSummaryFromRestPayload(parsed);
    const sources = extractTopSourcesFromRestPayload(parsed, MAX_SOURCES);

    if (!summary) {
      return {
        ok: false,
        httpStatus: 502,
        modelUsed: model,
        summary: "",
        sources,
        errorCode: "EMPTY_RESPONSE",
        errorDetail: `[${model}] Respons Gemini API berhasil (HTTP 200) tetapi tidak menghasilkan teks jawaban.`,
      };
    }

    return {
      ok: true,
      httpStatus: 200,
      modelUsed: model,
      summary,
      sources,
      errorCode: "",
      errorDetail: "",
    };
  } catch (err: unknown) {
    const isAbort =
      err instanceof Error &&
      (err.name === "AbortError" || /abort/i.test(err.message));
    const rawMsg = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      httpStatus: isAbort ? 504 : 502,
      modelUsed: model,
      summary: "",
      sources: [],
      errorCode: isAbort ? "UPSTREAM_TIMEOUT" : "FETCH_ERROR",
      errorDetail: sanitizeErrorDetail(
        isAbort
          ? `[${model}] Timeout setelah ${timeoutMs}ms menunggu Gemini REST API.`
          : `[${model}] ${rawMsg}`,
        apiKey
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function executeLiveSearch(rawQuery: string): Promise<NextResponse> {
  const apiKey = resolveGeminiApiKey();
  if (!apiKey) {
    const detail =
      "API key tidak ditemukan di environment server (GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / API_KEY).";
    return NextResponse.json(
      {
        ok: false,
        errorCode: "MISSING_API_KEY",
        errorDetail: detail,
        summary: `GAGAL_SEARCH: ${detail}`,
      },
      { status: 500 }
    );
  }

  const query = (rawQuery || "").trim().slice(0, 320);
  if (!query || query.length < 2) {
    const detail =
      "Parameter query kosong atau terlalu pendek. Kirim POST { query } atau GET ?q=...";
    return NextResponse.json(
      {
        ok: false,
        errorCode: "EMPTY_QUERY",
        errorDetail: detail,
        summary: `GAGAL_SEARCH: ${detail}`,
      },
      { status: 400 }
    );
  }

  const todayStr = formatTodayIndonesianDateWib();
  const searchPrompt = `Tanggal hari ini: ${todayStr} (WIB). Gunakan Google Search untuk mencari fakta paling mutakhir bagi pertanyaan berikut (boleh topik umum, berita terbaru, pemerintahan/presiden, kuliner, pajak, regulasi, maupun bahan kosmetik). Jawab super singkat, jelas, dan faktual dalam 1 sampai 2 kalimat Bahasa Indonesia tanpa simbol markdown:\n\n${query}`;

  const deadlineMs = Date.now() + OVERALL_SEARCH_BUDGET_MS;
  const attempts: SearchAttemptResult[] = [];

  for (const candidate of SEARCH_MODEL_CANDIDATES) {
    const remainingMs = deadlineMs - Date.now();
    if (remainingMs < 1_500) break;

    const result = await callGeminiRestSearch({
      candidate,
      prompt: searchPrompt,
      apiKey,
      timeoutMs: Math.min(candidate.maxTimeoutMs, remainingMs),
    });

    if (result.ok) {
      return NextResponse.json(
        {
          ok: true,
          modelUsed: result.modelUsed,
          query,
          summary: result.summary,
          sources: result.sources,
        },
        { status: 200 }
      );
    }

    attempts.push(result);
  }

  const lastFailure = attempts[attempts.length - 1];
  const combinedDetail =
    attempts.map((a) => a.errorDetail).join(" | ") ||
    "Gagal menghubungi Gemini REST API.";
  const errorCode = lastFailure?.errorCode || "SEARCH_FAILED";
  const responseStatus =
    lastFailure && lastFailure.httpStatus >= 400 && lastFailure.httpStatus <= 599
      ? lastFailure.httpStatus
      : 502;

  return NextResponse.json(
    {
      ok: false,
      errorCode,
      errorDetail: combinedDetail,
      summary: `GAGAL_SEARCH: ${combinedDetail}`,
    },
    { status: responseStatus }
  );
}

export async function GET(req: NextRequest) {
  try {
    const q =
      req.nextUrl.searchParams.get("q") ||
      req.nextUrl.searchParams.get("query") ||
      "";
    return await executeLiveSearch(q);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        errorCode: "INTERNAL_ERROR",
        errorDetail: detail,
        summary: `GAGAL_SEARCH: ${detail}`,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let query = "";
    try {
      const body = await req.json();
      query =
        typeof body?.query === "string"
          ? body.query
          : typeof body?.q === "string"
            ? body.q
            : "";
    } catch {
      query = "";
    }
    return await executeLiveSearch(query);
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        errorCode: "INTERNAL_ERROR",
        errorDetail: detail,
        summary: `GAGAL_SEARCH: ${detail}`,
      },
      { status: 500 }
    );
  }
}
