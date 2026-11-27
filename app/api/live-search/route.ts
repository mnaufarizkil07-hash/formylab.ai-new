import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  WebSourceCitation,
  extractWebSourcesFromGroundingMetadata,
} from "../../../components/chatNoteUtils";

/**
 * Stable Vercel-safe Gemini Google Search grounding endpoint for Live Voice Mode.
 * Uses identical Next.js App Router + `@google/genai` patterns as `/api/live-token`.
 * - Primary model: `gemini-2.5-flash` (fast, stable, supports `googleSearch` tool).
 * - Internal 9-second hard timeout (`Promise.race`) so Vercel Serverless NEVER times out with 502.
 * - ALWAYS returns HTTP 200 JSON (`{ ok: true, summary, sources }` or `{ ok: false, fallbackNote }`).
 */
const LIVE_SEARCH_TIMEOUT_MS = 9_000;
const FALLBACK_NOTE =
  "Pencarian langsung sedang sibuk, jawab berdasarkan pengetahuan terkini yang kamu ketahui.";

function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`LIVE_SEARCH_TIMEOUT_${timeoutMs}MS`));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          summary: "",
          sources: [] as WebSourceCitation[],
          fallbackNote: FALLBACK_NOTE,
          error: "GEMINI_API_KEY tidak tersedia di server.",
        },
        { status: 200 }
      );
    }

    let query = "";
    try {
      const body = await req.json();
      query =
        typeof body?.query === "string" ? body.query.trim().slice(0, 320) : "";
    } catch {
      query = "";
    }

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          summary: "",
          sources: [] as WebSourceCitation[],
          fallbackNote: FALLBACK_NOTE,
          error: "Query pencarian kosong.",
        },
        { status: 200 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const deadlineMs = Date.now() + LIVE_SEARCH_TIMEOUT_MS;
    const candidateModels = [
      "gemini-2.5-flash",
      "gemini-2.5-flash-lite",
      "gemini-3-flash-preview",
      "gemini-4-hydrogen",
    ] as const;
    let lastErrCode = "";

    for (const model of candidateModels) {
      const remainingMs = deadlineMs - Date.now();
      if (remainingMs < 1500) break;

      try {
        const response = await raceWithTimeout(
          ai.models.generateContent({
            model,
            contents: query,
            config: {
              tools: [{ googleSearch: {} }],
              systemInstruction:
                "Kamu adalah asisten riset cepat Formylab.ai. Rangkum fakta terbaru dari hasil Google Search dalam 2 sampai 3 kalimat padat Bahasa Indonesia yang sangat natural dan informatif, tanpa simbol markdown, tanpa daftar panjang.",
              temperature: 0.2,
            },
          }),
          remainingMs
        );

        const rawText = (response.text || "").trim();
        const cleanedSummary = rawText
          .replace(/[*#_`~]+/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 900);

        const groundingMetadata =
          response.candidates?.[0]?.groundingMetadata ?? null;
        const sources = extractWebSourcesFromGroundingMetadata(
          groundingMetadata,
          6
        );

        if (cleanedSummary) {
          return NextResponse.json(
            {
              ok: true,
              success: true,
              summary: cleanedSummary,
              sources,
              model,
            },
            { status: 200 }
          );
        }
      } catch (err: unknown) {
        const rawMsg = err instanceof Error ? err.message : String(err);
        if (/429|RESOURCE_EXHAUSTED|quota/i.test(rawMsg)) {
          lastErrCode = "QUOTA_EXCEEDED";
        } else if (/TIMEOUT/i.test(rawMsg)) {
          lastErrCode = "SEARCH_TIMEOUT";
        } else {
          lastErrCode = "SEARCH_UNAVAILABLE";
        }
      }
    }

    return NextResponse.json(
      {
        ok: false,
        success: false,
        summary: "",
        sources: [] as WebSourceCitation[],
        fallbackNote: FALLBACK_NOTE,
        error: lastErrCode || "SEARCH_UNAVAILABLE",
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        summary: "",
        sources: [] as WebSourceCitation[],
        fallbackNote: FALLBACK_NOTE,
        error: "SEARCH_UNAVAILABLE",
      },
      { status: 200 }
    );
  }
}
