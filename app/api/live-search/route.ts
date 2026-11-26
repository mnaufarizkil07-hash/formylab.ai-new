import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  WebSourceCitation,
  extractWebSourcesFromGroundingMetadata,
} from "../../../components/chatNoteUtils";

const SEARCH_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-4-hydrogen",
  "gemini-2.5-flash",
] as const;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY tidak tersedia di server.",
          summary: "",
          sources: [] as WebSourceCitation[],
        },
        { status: 500 }
      );
    }

    let query = "";
    try {
      const body = await req.json();
      query = typeof body?.query === "string" ? body.query.trim() : "";
    } catch {
      // invalid JSON handled below
    }

    if (!query || query.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Query pencarian tidak boleh kosong.",
          summary: "",
          sources: [] as WebSourceCitation[],
        },
        { status: 400 }
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

    const attemptErrors: string[] = [];

    for (const model of SEARCH_MODELS) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: query.slice(0, 320),
          config: {
            tools: [{ googleSearch: {} }],
            systemInstruction:
              "Kamu adalah asisten riset cepat. Gunakan Google Search untuk menjawab pertanyaan dengan fakta terkini yang akurat dalam Bahasa Indonesia lisan yang natural, maksimal 3 kalimat padat, tanpa simbol markdown, tanpa daftar panjang.",
            temperature: 0.2,
          },
        });

        const rawText = (response.text || "").trim();
        const cleanedSummary = rawText
          .replace(/[*#_`~]+/g, "")
          .replace(/\s+/g, " ")
          .trim();

        const groundingMetadata =
          response.candidates?.[0]?.groundingMetadata ?? null;
        const sources = extractWebSourcesFromGroundingMetadata(
          groundingMetadata,
          6
        );

        if (cleanedSummary) {
          return NextResponse.json({
            success: true,
            summary: cleanedSummary,
            sources,
            model,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptErrors.push(`[${model}] ${msg.slice(0, 180)}`);
      }
    }

    return NextResponse.json(
      {
        success: false,
        error: attemptErrors.join(" | ") || "Pencarian web tidak mengembalikan hasil.",
        summary: "",
        sources: [] as WebSourceCitation[],
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
        summary: "",
        sources: [] as WebSourceCitation[],
      },
      { status: 500 }
    );
  }
}
