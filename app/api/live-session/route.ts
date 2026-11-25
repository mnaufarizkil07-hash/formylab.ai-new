import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Modality, Tool, Type } from "@google/genai";
import {
  CREATE_CHAT_NOTE_TOOL_DECLARATION,
  CREATE_GOOGLE_DOC_TOOL_DECLARATION,
  FACT_CHECK_ANTI_KEKEH_DIRECTIVE,
  GDOC_ARTIFACT_LIVE_DIRECTIVE,
  NOTE_ARTIFACT_LIVE_DIRECTIVE,
  WEB_SEARCH_LIVE_DIRECTIVE,
  WEB_SEARCH_TOOL_DECLARATION,
} from "../../../components/chatNoteUtils";

const LIVE_AUDIO_MODELS = [
  "gemini-3.8-live",
  "gemini-2.5-flash-native-audio-preview-12-2025",
  "gemini-2.5-flash-native-audio-preview-09-2025",
] as const;

const PREFERRED_LIVE_VOICES = ["Aoede", "Kore"] as const;

const SDK_LIVE_FUNCTION_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: CREATE_CHAT_NOTE_TOOL_DECLARATION.name,
        description: CREATE_CHAT_NOTE_TOOL_DECLARATION.description,
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description:
                CREATE_CHAT_NOTE_TOOL_DECLARATION.parameters.properties.title
                  .description,
            },
            format: {
              type: Type.STRING,
              enum: ["paragraph", "table", "mixed"],
              description:
                CREATE_CHAT_NOTE_TOOL_DECLARATION.parameters.properties.format
                  .description,
            },
            markdownContent: {
              type: Type.STRING,
              description:
                CREATE_CHAT_NOTE_TOOL_DECLARATION.parameters.properties
                  .markdownContent.description,
            },
          },
          required: ["title", "format", "markdownContent"],
        },
      },
      {
        name: CREATE_GOOGLE_DOC_TOOL_DECLARATION.name,
        description: CREATE_GOOGLE_DOC_TOOL_DECLARATION.description,
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description:
                CREATE_GOOGLE_DOC_TOOL_DECLARATION.parameters.properties.title
                  .description,
            },
            markdownContent: {
              type: Type.STRING,
              description:
                CREATE_GOOGLE_DOC_TOOL_DECLARATION.parameters.properties
                  .markdownContent.description,
            },
          },
          required: ["title", "markdownContent"],
        },
      },
      {
        name: WEB_SEARCH_TOOL_DECLARATION.name,
        description: WEB_SEARCH_TOOL_DECLARATION.description,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description:
                WEB_SEARCH_TOOL_DECLARATION.parameters.properties.query
                  .description,
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];

// Hybrid toolset (native googleSearch + functionDeclarations). If rejected by a Live model,
// we automatically fall back to SDK_LIVE_FUNCTION_TOOLS where `web_search` invokes `/api/web-search`
// backed by real Gemini `googleSearch: {}` grounding without any tool conflict.
const SDK_LIVE_HYBRID_TOOLS: Tool[] = [
  { googleSearch: {} },
  ...SDK_LIVE_FUNCTION_TOOLS,
];

const WS_LIVE_FUNCTION_TOOLS = [
  {
    functionDeclarations: [
      CREATE_CHAT_NOTE_TOOL_DECLARATION,
      CREATE_GOOGLE_DOC_TOOL_DECLARATION,
      WEB_SEARCH_TOOL_DECLARATION,
    ],
  },
];

const WS_LIVE_HYBRID_TOOLS = [
  { googleSearch: {} },
  ...WS_LIVE_FUNCTION_TOOLS,
];

function buildLiveVoiceSystemInstruction(recentContext?: string): string {
  const baseLines = [
    "Kamu adalah asisten suara AI Formylab.ai berperan sebagai Senior Cosmetic R&D Chemist.",
    "Gaya bicara WAJIB alami, hangat, luwes, dan santai profesional dalam Bahasa Indonesia seperti rekan kerja R&D di telepon.",
    "Aturan percakapan telepon real-time:",
    "1. Jawab langsung ke inti dalam 1 sampai 3 kalimat singkat yang enak didengar; hindari monolog panjang, gaya artikel, atau bahasa kaku/robotik.",
    "2. Untuk sapaan ringan seperti 'Halo' atau 'Apa kabar', balas ramah dan singkat dalam 1 kalimat lalu tanyakan ada yang bisa dibantu.",
    "3. Untuk pertanyaan teknis formulasi kosmetik & skincare (BPOM, Halal, pH, HLB, viskositas, stabilitas emulsi, bahan aktif, substitusi bahan, estimasi HPP), jawab akurat, praktis, dan berbasis ilmu kimia kosmetik.",
    "4. Kamu juga fleksibel menjawab pertanyaan umum di luar kosmetik secara natural dan membantu.",
    "5. Jangan pernah membaca simbol markdown, tanda bintang, pagar, atau daftar poin kaku; ucapkan angka dan satuan secara lisan (misalnya 'lima persen', 'pH lima koma lima').",
    "",
    FACT_CHECK_ANTI_KEKEH_DIRECTIVE,
    "",
    WEB_SEARCH_LIVE_DIRECTIVE,
    "",
    NOTE_ARTIFACT_LIVE_DIRECTIVE,
    "",
    GDOC_ARTIFACT_LIVE_DIRECTIVE,
  ];

  const trimmedContext =
    typeof recentContext === "string"
      ? recentContext.replace(/\s+/g, " ").trim().slice(0, 750)
      : "";

  if (trimmedContext) {
    baseLines.push(
      "",
      `Konteks diskusi chat terakhir pengguna (gunakan hanya jika relevan dengan obrolan telepon): "${trimmedContext}"`
    );
  }

  return baseLines.join("\n");
}

function buildLiveWsUrl(tokenName: string): string {
  return `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained?access_token=${encodeURIComponent(
    tokenName
  )}`;
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        fallbackMode: true,
        reason: "GEMINI_API_KEY tidak tersedia di server.",
      });
    }

    let recentContext = "";
    try {
      const body = await req.json();
      if (typeof body?.recentContext === "string") {
        recentContext = body.recentContext;
      }
    } catch {
      // Empty body is valid
    }

    const systemInstruction = buildLiveVoiceSystemInstruction(recentContext);

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        apiVersion: "v1alpha",
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    if (!ai.authTokens || typeof ai.authTokens.create !== "function") {
      return NextResponse.json({
        success: false,
        fallbackMode: true,
        reason: "SDK authTokens.create tidak tersedia pada versi saat ini.",
      });
    }

    const nowMs = Date.now();
    const expireTime = new Date(nowMs + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(nowMs + 90 * 1000).toISOString();
    const attemptErrors: string[] = [];

    for (const modelId of LIVE_AUDIO_MODELS) {
      for (const voiceName of PREFERRED_LIVE_VOICES) {
        // Attempt 1A: Try constrained ephemeral token with hybrid tools (native googleSearch + functionDeclarations)
        try {
          const tokenRes = await ai.authTokens.create({
            config: {
              uses: 1,
              expireTime,
              newSessionExpireTime,
              liveConnectConstraints: {
                model: modelId,
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName,
                      },
                    },
                  },
                  systemInstruction,
                  tools: SDK_LIVE_HYBRID_TOOLS,
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
                },
              },
            },
          });

          if (tokenRes?.name) {
            return NextResponse.json({
              success: true,
              fallbackMode: false,
              token: tokenRes.name,
              model: modelId,
              voiceName,
              systemInstruction,
              tools: WS_LIVE_HYBRID_TOOLS,
              wsUrl: buildLiveWsUrl(tokenRes.name),
              expireTime,
              lockedConfig: true,
              searchMode: "hybrid",
            });
          }
        } catch (hybridErr: unknown) {
          const msg =
            hybridErr instanceof Error ? hybridErr.message : String(hybridErr);
          attemptErrors.push(`[${modelId}/${voiceName}:hybrid] ${msg}`);
        }

        // Attempt 1B: Safe compatibility fallback -> functionDeclarations only (includes `web_search` backed by Gemini googleSearch)
        try {
          const tokenRes = await ai.authTokens.create({
            config: {
              uses: 1,
              expireTime,
              newSessionExpireTime,
              liveConnectConstraints: {
                model: modelId,
                config: {
                  responseModalities: [Modality.AUDIO],
                  speechConfig: {
                    voiceConfig: {
                      prebuiltVoiceConfig: {
                        voiceName,
                      },
                    },
                  },
                  systemInstruction,
                  tools: SDK_LIVE_FUNCTION_TOOLS,
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
                },
              },
            },
          });

          if (tokenRes?.name) {
            return NextResponse.json({
              success: true,
              fallbackMode: false,
              token: tokenRes.name,
              model: modelId,
              voiceName,
              systemInstruction,
              tools: WS_LIVE_FUNCTION_TOOLS,
              wsUrl: buildLiveWsUrl(tokenRes.name),
              expireTime,
              lockedConfig: true,
              searchMode: "function_tool",
            });
          }
        } catch (lockedErr: unknown) {
          const msg =
            lockedErr instanceof Error ? lockedErr.message : String(lockedErr);
          attemptErrors.push(`[${modelId}/${voiceName}:locked] ${msg}`);
        }

        // Attempt 2: Model-constrained ephemeral token (client sends safe functionDeclarations setup payload)
        try {
          const tokenRes = await ai.authTokens.create({
            config: {
              uses: 1,
              expireTime,
              newSessionExpireTime,
              liveConnectConstraints: {
                model: modelId,
              },
            },
          });

          if (tokenRes?.name) {
            return NextResponse.json({
              success: true,
              fallbackMode: false,
              token: tokenRes.name,
              model: modelId,
              voiceName,
              systemInstruction,
              tools: WS_LIVE_FUNCTION_TOOLS,
              wsUrl: buildLiveWsUrl(tokenRes.name),
              expireTime,
              lockedConfig: false,
              searchMode: "function_tool",
            });
          }
        } catch (modelOnlyErr: unknown) {
          const msg =
            modelOnlyErr instanceof Error
              ? modelOnlyErr.message
              : String(modelOnlyErr);
          attemptErrors.push(`[${modelId}/${voiceName}:model] ${msg}`);
          // If this model itself is rejected, move directly to the next candidate model
          break;
        }
      }
    }

    // Clean graceful fallback without HTTP 500 so Voice Call never dies
    return NextResponse.json({
      success: false,
      fallbackMode: true,
      reason:
        attemptErrors[0] ||
        "Ephemeral token Gemini Live tidak dapat diterbitkan di environment ini.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      fallbackMode: true,
      reason: msg,
    });
  }
}
