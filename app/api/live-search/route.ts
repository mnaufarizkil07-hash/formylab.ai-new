import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  WebSourceCitation,
  extractWebSourcesFromGroundingMetadata,
} from "../../../components/chatNoteUtils";
import {
  formatTodayIndonesianDateWib,
  hasGoogleSearchGrounding,
} from "../../../components/liveVoiceHelpers";

/**
 * Stable Vercel-safe Gemini Google Search grounding endpoint for Live Voice Mode.
 * - Injects dynamic Indonesian date (WIB) so search results always anchor to today's facts.
 * - Primary model: `gemini-2.5-flash` with `tools: [{ googleSearch: {} }]` & `temperature: 0.1`.
 * - Internal 9-second hard timeout (`Promise.race`) so Vercel Serverless NEVER times out with 502.
 * - NEVER instructs the Live model to fall back to stale offline/2024 knowledge: if real-time
 *   search fails, explicitly tells the model to state honestly that search is currently unavailable.
 */
const LIVE_SEARCH_TIMEOUT_MS = 9_000;
const SEARCH_UNAVAILABLE_NOTE =
  "Pencarian internet sedang gagal atau sibuk saat ini. Sampaikan dengan jujur ke pengguna bahwa pencarian internet sedang mengalami kendala sehingga kamu belum bisa memverifikasi data real-time, dan DILARANG menebak atau memakai fakta lama.";

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
          fallbackNote: SEARCH_UNAVAILABLE_NOTE,
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
          fallbackNote: SEARCH_UNAVAILABLE_NOTE,
          error: "Query pencarian kosong.",
        },
        { status: 200 }
      );
    }

    const todayStr = formatTodayIndonesianDateWib();
    const searchPrompt = `Tanggal hari ini: ${todayStr} (WIB). Cari informasi terbaru dan paling akurat di internet untuk pertanyaan berikut, lalu jawab singkat, tegas, dan faktual dalam 2-3 kalimat Bahasa Indonesia:\n\n${query}`;

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
            contents: searchPrompt,
            config: {
              tools: [{ googleSearch: {} }],
              temperature: 0.1,
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
        const grounded =
          sources.length > 0 || hasGoogleSearchGrounding(groundingMetadata);

        if (cleanedSummary) {
          return NextResponse.json(
            {
              ok: true,
              success: true,
              summary: cleanedSummary,
              sources,
              grounded,
              today: todayStr,
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
        today: todayStr,
        fallbackNote: SEARCH_UNAVAILABLE_NOTE,
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
        fallbackNote: SEARCH_UNAVAILABLE_NOTE,
        error: "SEARCH_UNAVAILABLE",
      },
      { status: 200 }
    );
  }
}
