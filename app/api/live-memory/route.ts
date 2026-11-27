import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const MEMORY_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-3-flash-preview",
  "gemini-4-hydrogen",
] as const;

const MEMORY_TIMEOUT_MS = 9_000;

function raceWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`LIVE_MEMORY_TIMEOUT_${timeoutMs}MS`));
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
  let previousSummary = "";
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          ok: false,
          success: false,
          summary: "",
          error: "GEMINI_API_KEY tidak tersedia.",
        },
        { status: 200 }
      );
    }

    let transcript = "";
    try {
      const body = await req.json();
      previousSummary =
        typeof body?.previousSummary === "string"
          ? body.previousSummary.trim().slice(0, 1200)
          : "";
      transcript =
        typeof body?.transcript === "string"
          ? body.transcript.trim().slice(0, 4800)
          : "";
    } catch {
      return NextResponse.json(
        { ok: false, success: false, summary: "", error: "JSON tidak valid." },
        { status: 200 }
      );
    }

    if (!transcript) {
      return NextResponse.json(
        { ok: true, success: true, summary: previousSummary },
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

    const prompt = [
      "Ringkas fakta penting dari percakapan R&D kosmetik berikut menjadi maksimal 5 poin singkat padat (total < 140 kata) dalam Bahasa Indonesia.",
      "Wajib bedakan dengan jelas antara: nama pengguna (jika disebutkan), jenis kulit/target pengguna, produk yang sedang dirancang, bahan aktif/batasan yang disepakati, dan keputusan terakhir.",
      "DILARANG mengarang nama atau mencampur nama bahan kosmetik sebagai nama pengguna.",
      previousSummary ? `\nRingkasan Fakta Sebelumnya:\n${previousSummary}` : "",
      `\nCuplikan Percakapan Terbaru:\n${transcript}`,
    ]
      .filter(Boolean)
      .join("\n");

    const deadlineMs = Date.now() + MEMORY_TIMEOUT_MS;

    for (const model of MEMORY_MODELS) {
      const remainingMs = deadlineMs - Date.now();
      if (remainingMs < 1500) break;

      try {
        const res = await raceWithTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              temperature: 0.1,
            },
          }),
          remainingMs
        );
        const clean = (res.text || "")
          .replace(/[*#`]+/g, "")
          .trim()
          .slice(0, 1200);
        if (clean) {
          return NextResponse.json(
            { ok: true, success: true, summary: clean, model },
            { status: 200 }
          );
        }
      } catch {
        // Try next candidate model
      }
    }

    return NextResponse.json(
      { ok: true, success: true, summary: previousSummary },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        summary: previousSummary,
        error: "MEMORY_UNAVAILABLE",
      },
      { status: 200 }
    );
  }
}
