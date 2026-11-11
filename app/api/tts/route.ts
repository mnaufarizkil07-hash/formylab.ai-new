import { NextRequest, NextResponse } from "next/server";

/**
 * Splits spoken text into natural conversational breath chunks (<= 185 chars)
 * at sentence or clause boundaries so neural TTS audio streams smoothly without clipping.
 */
function splitIntoSmoothSpeechChunks(rawText: string, maxLen = 185): string[] {
  const cleaned = rawText
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/#{1,6}\s*/g, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[⚡🧪🔬🌐✨💬⚠️📊📋•]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleaned) return [];

  const rawSentences = cleaned.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxLen) {
      if (
        chunks.length > 0 &&
        chunks[chunks.length - 1].length + 1 + trimmed.length <= maxLen
      ) {
        chunks[chunks.length - 1] += " " + trimmed;
      } else {
        chunks.push(trimmed);
      }
    } else {
      // Split long sentence by comma/semicolon clauses
      const clauses = trimmed.split(/(?<=[,;:])\s+/);
      let current = "";
      for (const clause of clauses) {
        if ((current + " " + clause).trim().length <= maxLen) {
          current = (current + " " + clause).trim();
        } else {
          if (current) chunks.push(current);
          if (clause.length <= maxLen) {
            current = clause.trim();
          } else {
            // Hard split by words if a single clause is still > maxLen
            const words = clause.split(/\s+/);
            let wordBuf = "";
            for (const w of words) {
              if ((wordBuf + " " + w).trim().length <= maxLen) {
                wordBuf = (wordBuf + " " + w).trim();
              } else {
                if (wordBuf) chunks.push(wordBuf);
                wordBuf = w;
              }
            }
            current = wordBuf;
          }
        }
      }
      if (current) chunks.push(current);
    }
  }

  return chunks.slice(0, 12);
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rawText = typeof body?.text === "string" ? body.text : "";
    const lang = typeof body?.lang === "string" ? body.lang : "id";

    const chunks = splitIntoSmoothSpeechChunks(rawText);
    if (chunks.length === 0) {
      return NextResponse.json({
        success: false,
        chunks: [],
        audioSegments: [],
      });
    }

    // Fetch natural neural TTS MP3 buffers in parallel and concatenate them into one seamless MP3 stream
    const mp3Buffers: Buffer[] = [];
    for (const chunk of chunks) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3200);
        const url = `https://translate.googleapis.com/translate_tts?ie=UTF-8&tl=${encodeURIComponent(
          lang
        )}&client=tw-ob&q=${encodeURIComponent(chunk)}`;
        const res = await fetch(url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (res.ok) {
          const arrBuf = await res.arrayBuffer();
          if (arrBuf.byteLength > 200) {
            mp3Buffers.push(Buffer.from(arrBuf));
          }
        }
      } catch {
        // Fallback to client sentence-queued speech if upstream TTS is unreachable
      }
    }

    if (mp3Buffers.length > 0) {
      const combinedBuffer = Buffer.concat(mp3Buffers);
      const audioDataUrl = `data:audio/mpeg;base64,${combinedBuffer.toString(
        "base64"
      )}`;
      return NextResponse.json({
        success: true,
        audioDataUrl,
        chunks,
      });
    }

    return NextResponse.json({
      success: true,
      audioDataUrl: null,
      chunks,
    });
  } catch {
    return NextResponse.json({
      success: false,
      audioDataUrl: null,
      chunks: [],
    });
  }
}
