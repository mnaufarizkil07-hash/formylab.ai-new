import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  WebSourceCitation,
  extractWebSourcesFromGroundingMetadata,
} from "../../../components/chatNoteUtils";

const SEARCH_GROUNDED_MODELS = [
  "gemini-4-hydrogen",
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
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

    const body = await req.json().catch(() => ({}));
    const query =
      typeof body?.query === "string" ? body.query.trim().slice(0, 400) : "";

    if (!query) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter query pencarian kosong.",
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

    const systemInstruction = [
      "Kamu adalah mesin verifikasi fakta berbasis Google Search untuk Formylab.ai.",
      "Gunakan tool Google Search untuk mencari fakta akurat dan terkini atas query pengguna.",
      "Ringkas hasil temuan terverifikasi dalam 2-4 kalimat padat, jelas, faktual, dalam Bahasa Indonesia.",
      "Sertakan detail spesifik (warna, angka regulasi, tanggal, nama resmi) jika ditemukan di hasil pencarian.",
      "Jika hasil pencarian tidak menemukan informasi pasti, nyatakan terus terang tanpa mengarang.",
    ].join("\n");

    const attemptErrors: string[] = [];

    for (const modelName of SEARCH_GROUNDED_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: `Verifikasi fakta terkini melalui Google Search untuk query berikut: "${query}"`,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
          },
        });

        const summary = (res.text || "").trim();
        const sources = extractWebSourcesFromGroundingMetadata(
          res.candidates?.[0]?.groundingMetadata,
          6
        );

        if (summary) {
          return NextResponse.json({
            success: true,
            query,
            summary,
            sources,
            modelUsed: modelName,
          });
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptErrors.push(`[${modelName}]: ${msg}`);
      }
    }

    return NextResponse.json(
      {
        success: false,
        query,
        error:
          attemptErrors[0] ||
          "Pencarian Google Search tidak mengembalikan hasil saat ini.",
        summary: "",
        sources: [] as WebSourceCitation[],
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        error: msg,
        summary: "",
        sources: [] as WebSourceCitation[],
      },
      { status: 500 }
    );
  }
}
