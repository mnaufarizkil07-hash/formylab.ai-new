import { NextRequest, NextResponse } from "next/server";
import { formatTodayIndonesianDateWib } from "../../../components/liveVoiceHelpers";

export const dynamic = "force-dynamic";

const GEMINI_REST_BASE =
  "https://generativelanguage.googleapis.com/v1beta/models";
const PRIMARY_SEARCH_MODEL = "gemini-3.8-flash";
const PRIMARY_TIMEOUT_MS = 6_000;
const FALLBACK_FETCH_TIMEOUT_MS = 5_000;
const MAX_SOURCES = 3;
const MAX_NEWS_ITEMS = 5;
const MAX_WIKI_ITEMS = 3;
const BOT_USER_AGENT = "FormylabBot/1.0";

interface LiveSearchSource {
  title: string;
  url: string;
}

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

interface PrimarySearchAttempt {
  ok: boolean;
  httpStatus: number;
  summary: string;
  sources: LiveSearchSource[];
  errorCode: string;
  errorDetail: string;
}

interface NewsRssItem {
  title: string;
  pubDate: string;
  source: string;
  url: string;
}

interface WikiSearchItem {
  title: string;
  snippet: string;
  url: string;
  lang: "id" | "en";
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

function decodeHtmlEntities(input: string): string {
  if (!input) return "";
  return input
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;|&#x27;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec: string) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : "";
    })
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => {
      const code = Number.parseInt(hex, 16);
      return Number.isFinite(code) && code > 0 && code < 0x110000
        ? String.fromCodePoint(code)
        : "";
    });
}

function stripHtmlTags(input: string): string {
  return decodeHtmlEntities(input)
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isValidHttpUrl(url: string): boolean {
  return /^https?:\/\/[^\s]+$/i.test(url.trim());
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
): LiveSearchSource[] {
  const chunks = data?.candidates?.[0]?.groundingMetadata?.groundingChunks;
  if (!Array.isArray(chunks) || chunks.length === 0) return [];

  const seen = new Set<string>();
  const results: LiveSearchSource[] = [];

  for (const chunk of chunks) {
    if (results.length >= maxSources) break;
    const web = chunk?.web;
    const url = typeof web?.uri === "string" ? web.uri.trim() : "";
    if (!isValidHttpUrl(url)) continue;

    const dedupKey = url.toLowerCase();
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    let title = typeof web?.title === "string" ? web.title.trim() : "";
    if (!title) {
      try {
        title = new URL(url).hostname.replace(/^www\./i, "");
      } catch {
        title = "Sumber Web";
      }
    }
    results.push({ title, url });
  }

  return results;
}

/**
 * LAYER 1 (PRIMARY): Official Gemini REST API `models/gemini-3.8-flash`
 * with built-in Google Search grounding (`tools: [{ google_search: {} }]`).
 */
async function callGeminiPrimarySearch(params: {
  query: string;
  todayStr: string;
  apiKey: string;
}): Promise<PrimarySearchAttempt> {
  const { query, todayStr, apiKey } = params;
  if (!apiKey) {
    return {
      ok: false,
      httpStatus: 500,
      summary: "",
      sources: [],
      errorCode: "MISSING_API_KEY",
      errorDetail:
        "API key tidak ditemukan di environment server (GEMINI_API_KEY / GOOGLE_GENERATIVE_AI_API_KEY / API_KEY).",
    };
  }

  const endpoint = `${GEMINI_REST_BASE}/${PRIMARY_SEARCH_MODEL}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;
  const prompt = `Tanggal hari ini: ${todayStr}. Jawab singkat dan faktual dalam 2-3 kalimat Bahasa Indonesia berdasarkan hasil pencarian web terbaru untuk: ${query}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PRIMARY_TIMEOUT_MS);

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
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 320,
        },
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
        summary: "",
        sources: [],
        errorCode: apiErrStatus,
        errorDetail: sanitizeErrorDetail(
          `[${PRIMARY_SEARCH_MODEL} HTTP ${res.status}] ${apiErrMsg}`,
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
        summary: "",
        sources,
        errorCode: "EMPTY_RESPONSE",
        errorDetail: `[${PRIMARY_SEARCH_MODEL}] HTTP 200 namun teks jawaban kosong.`,
      };
    }

    return {
      ok: true,
      httpStatus: 200,
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
      summary: "",
      sources: [],
      errorCode: isAbort ? "UPSTREAM_TIMEOUT" : "FETCH_ERROR",
      errorDetail: sanitizeErrorDetail(
        isAbort
          ? `[${PRIMARY_SEARCH_MODEL}] Timeout setelah ${PRIMARY_TIMEOUT_MS}ms.`
          : `[${PRIMARY_SEARCH_MODEL}] ${rawMsg}`,
        apiKey
      ),
    };
  } finally {
    clearTimeout(timer);
  }
}

function formatShortPubDate(rawPubDate: string): string {
  const cleaned = rawPubDate.trim();
  if (!cleaned) return "";
  const parsed = new Date(cleaned);
  if (Number.isNaN(parsed.getTime())) {
    return cleaned.slice(0, 22);
  }
  try {
    return parsed.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    });
  } catch {
    return cleaned.slice(0, 22);
  }
}

function extractXmlTag(block: string, tagName: string): string {
  const re = new RegExp(`<${tagName}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/${tagName}>`, "i");
  const match = block.match(re);
  if (!match?.[1]) return "";
  return decodeHtmlEntities(match[1]).replace(/\s+/g, " ").trim();
}

function parseGoogleNewsRss(xml: string, maxItems = MAX_NEWS_ITEMS): NewsRssItem[] {
  if (!xml) return [];
  const items: NewsRssItem[] = [];
  const itemRegex = /<item\b[^>]*>([\s\S]*?)<\/item>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1] || "";
    const rawTitle = extractXmlTag(block, "title");
    const pubDate = formatShortPubDate(extractXmlTag(block, "pubDate"));
    const source = extractXmlTag(block, "source");
    const url = extractXmlTag(block, "link");

    if (!rawTitle) continue;

    // Remove trailing " - SourceName" if source is already parsed cleanly
    let cleanTitle = rawTitle;
    if (source && cleanTitle.toLowerCase().endsWith(` - ${source.toLowerCase()}`)) {
      cleanTitle = cleanTitle.slice(0, -(source.length + 3)).trim();
    }

    items.push({
      title: cleanTitle,
      pubDate,
      source,
      url: isValidHttpUrl(url) ? url : "",
    });
  }

  return items;
}

async function fetchGoogleNewsRss(
  query: string,
  timeoutMs = FALLBACK_FETCH_TIMEOUT_MS
): Promise<NewsRssItem[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
    query
  )}&hl=id&gl=ID&ceid=ID:id`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BOT_USER_AGENT,
        Accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.8",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const xml = await res.text();
    return parseGoogleNewsRss(xml, MAX_NEWS_ITEMS);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWikipediaByLang(
  query: string,
  lang: "id" | "en",
  timeoutMs: number
): Promise<WikiSearchItem[]> {
  const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    query
  )}&format=json&srlimit=${MAX_WIKI_ITEMS}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": BOT_USER_AGENT,
        Accept: "application/json",
      },
      signal: controller.signal,
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      query?: {
        search?: Array<{
          title?: string;
          snippet?: string;
        }>;
      };
    };
    const rows = json?.query?.search;
    if (!Array.isArray(rows) || rows.length === 0) return [];

    return rows
      .slice(0, MAX_WIKI_ITEMS)
      .map((row) => {
        const title = decodeHtmlEntities(String(row?.title ?? "")).trim();
        const snippet = stripHtmlTags(String(row?.snippet ?? "")).slice(0, 220);
        if (!title) return null;
        return {
          title,
          snippet,
          url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
            title.replace(/ /g, "_")
          )}`,
          lang,
        };
      })
      .filter((item): item is WikiSearchItem => item !== null);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWikipediaWithFallback(
  query: string,
  totalTimeoutMs = FALLBACK_FETCH_TIMEOUT_MS
): Promise<WikiSearchItem[]> {
  const startedAt = Date.now();
  const idResults = await fetchWikipediaByLang(
    query,
    "id",
    Math.min(3_200, totalTimeoutMs)
  );
  if (idResults.length > 0) return idResults;

  const remainingMs = totalTimeoutMs - (Date.now() - startedAt);
  if (remainingMs < 800) return [];

  return fetchWikipediaByLang(query, "en", remainingMs);
}

/**
 * LAYER 2 (ZERO-QUOTA FALLBACK): Pure server-side parallel web retrieval
 * via Google News RSS Indonesia + Wikipedia API (ID -> EN), synthesized in TypeScript
 * with ZERO Gemini API text calls.
 */
async function executeDirectWebZeroQuotaFallback(params: {
  query: string;
  todayStr: string;
}): Promise<{ summary: string; sources: LiveSearchSource[] } | null> {
  const { query, todayStr } = params;

  const [newsSettled, wikiSettled] = await Promise.allSettled([
    fetchGoogleNewsRss(query, FALLBACK_FETCH_TIMEOUT_MS),
    fetchWikipediaWithFallback(query, FALLBACK_FETCH_TIMEOUT_MS),
  ]);

  const newsItems =
    newsSettled.status === "fulfilled" ? newsSettled.value : [];
  const wikiItems =
    wikiSettled.status === "fulfilled" ? wikiSettled.value : [];

  if (newsItems.length === 0 && wikiItems.length === 0) {
    return null;
  }

  // Combine up to 5 concise, highest-signal items across Google News RSS & Wikipedia
  const facts: string[] = [];
  const maxNewsFacts = wikiItems.length > 0 ? 3 : 5;

  for (const item of newsItems.slice(0, maxNewsFacts)) {
    const metaParts = [item.source, item.pubDate].filter(Boolean);
    const metaSuffix = metaParts.length > 0 ? ` (${metaParts.join(", ")})` : "";
    facts.push(`${item.title}${metaSuffix}`);
  }

  const remainingSlots = Math.max(0, 5 - facts.length);
  for (const wiki of wikiItems.slice(0, Math.min(2, remainingSlots))) {
    const snippetPart = wiki.snippet ? `: ${wiki.snippet}` : "";
    facts.push(`Wikipedia - ${wiki.title}${snippetPart}`);
  }

  const factsText = facts.map((fact, idx) => `${idx + 1}. ${fact}`).join("; ");
  const summary = `Data web real-time per ${todayStr} untuk '${query}': ${factsText}. Sampaikan ringkasan faktual paling relevan ke user dalam 2 kalimat santai Bahasa Indonesia.`;

  // Collect max 3 deduplicated { title, url } sources
  const sources: LiveSearchSource[] = [];
  const seenUrls = new Set<string>();

  const pushSource = (title: string, url: string) => {
    if (sources.length >= MAX_SOURCES) return;
    if (!isValidHttpUrl(url)) return;
    const key = url.toLowerCase();
    if (seenUrls.has(key)) return;
    seenUrls.add(key);
    sources.push({
      title: (title || "Sumber Web").slice(0, 140),
      url,
    });
  };

  for (const item of newsItems.slice(0, 2)) {
    pushSource(
      item.source ? `${item.title} (${item.source})` : item.title,
      item.url
    );
  }
  for (const wiki of wikiItems) {
    pushSource(`Wikipedia: ${wiki.title}`, wiki.url);
  }
  for (const item of newsItems.slice(2)) {
    pushSource(
      item.source ? `${item.title} (${item.source})` : item.title,
      item.url
    );
  }

  return { summary, sources };
}

async function executeLiveSearch(rawQuery: string): Promise<NextResponse> {
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

  const apiKey = resolveGeminiApiKey();
  const todayStr = formatTodayIndonesianDateWib();

  // LAYER 1: Primary Gemini 3.8 Flash + Google Search Grounding
  const primary = await callGeminiPrimarySearch({
    query,
    todayStr,
    apiKey,
  });

  if (primary.ok) {
    return NextResponse.json(
      {
        ok: true,
        providerUsed: "gemini_3_8_grounding",
        query,
        summary: primary.summary,
        sources: primary.sources,
      },
      { status: 200 }
    );
  }

  // LAYER 2: Zero-Quota Direct Web Search Fallback (Google News RSS + Wikipedia ID/EN)
  const fallback = await executeDirectWebZeroQuotaFallback({
    query,
    todayStr,
  });

  if (fallback) {
    return NextResponse.json(
      {
        ok: true,
        providerUsed: "direct_web_zero_quota",
        query,
        summary: fallback.summary,
        sources: fallback.sources,
        primaryError: primary.errorDetail,
      },
      { status: 200 }
    );
  }

  const combinedDetail = `${primary.errorDetail} | Direct Web Fallback (Google News RSS & Wikipedia) tidak menemukan hasil.`;
  return NextResponse.json(
    {
      ok: false,
      errorCode: primary.errorCode || "SEARCH_FAILED",
      errorDetail: combinedDetail,
      summary: `GAGAL_SEARCH: ${combinedDetail}`,
    },
    { status: 502 }
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
