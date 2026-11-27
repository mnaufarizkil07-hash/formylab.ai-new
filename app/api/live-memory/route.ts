import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MEMORY_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-4-hydrogen",
] as const;

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, summary: "", error: "GEMINI_API_KEY tidak tersedia." },
        { status: 500 }
      );
    }

    let previousSummary = "";
    let transcript = "";
    try {
      const body = await req.json();
      previousSummary =
        typeof body?.previousSummary === "string"
          ? body.previousSummary.trim().slice(0, 1200)
          : "";
      transcript =
        typeof body?.transcript === "string"
          ? body.transcript.trim().slice(0, 4500)
          : "";
    } catch {
      return NextResponse.json(
        { success: false, summary: "", error: "JSON tidak valid." },
        { status: 400 }
      );
    }

    if (!transcript) {
      return NextResponse.json({
        success: true,
        summary: previousSummary,
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = [
      "Ringkas fakta penting dari percakapan R&D kosmetik berikut menjadi maksimal 5 poin singkat padat (total < 140 kata) dalam Bahasa Indonesia.",
      "Wajib bedakan dengan jelas antara: nama pengguna (jika disebutkan), jenis kulit/target pengguna, produk yang sedang dirancang, bahan aktif/batasan yang disepakati, dan keputusan terakhir.",
      "DILARANG mengarang nama atau mencampur nama bahan kosmetik sebagai nama pengguna.",
      previousSummary ? `\nRingkasan Fakta Sebelumnya:\n${previousSummary}` : "",
      `\nCuplikan Percakapan Terbaru:\n${transcript}`,
    ]
      .filter(Boolean)
      .join("\n");

    for (const model of MEMORY_MODELS) {
      try {
        const res = await ai.models.generateContent({
          model,
          contents: prompt,
        });
        const clean = (res.text || "")
          .replace(/[*#`]+/g, "")
          .trim()
          .slice(0, 1200);
        if (clean) {
          return NextResponse.json({
            success: true,
            summary: clean,
            model,
          });
        }
      } catch {
        // Try next candidate model
      }
    }

    return NextResponse.json({
      success: true,
      summary: previousSummary,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        summary: "",
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
