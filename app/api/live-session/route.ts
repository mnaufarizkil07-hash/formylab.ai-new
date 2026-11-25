import { NextRequest, NextResponse } from "next/server";
import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  Tool,
  Type,
} from "@google/genai";
import {
  CREATE_CHAT_NOTE_TOOL_DECLARATION,
  CREATE_GOOGLE_DOC_TOOL_DECLARATION,
  WEB_SEARCH_TOOL_DECLARATION,
} from "../../../components/chatNoteUtils";

const LIVE_AUDIO_MODELS = [
  "gemini-3.8-live",
  "gemini-2.5-flash-native-audio-preview-12-2025",
  "gemini-2.5-flash-native-audio-preview-09-2025",
] as const;

const PREFERRED_LIVE_VOICES = ["Aoede", "Kore"] as const;

// Low-latency turn-taking & instant barge-in VAD config:
// ~420ms silence threshold responds almost immediately after user stops speaking
// while tolerating brief natural pauses/breaths (~150-350ms).
const SDK_LIVE_REALTIME_INPUT_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
    prefixPaddingMs: 120,
    silenceDurationMs: 420,
  },
  activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
};

const WS_LIVE_REALTIME_INPUT_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
    endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
    prefixPaddingMs: 120,
    silenceDurationMs: 420,
  },
  activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
};

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

/**
 * Concise, high-signal voice system instruction tuned for minimal time-to-first-audio (TTFA):
 * eliminates verbose boilerplate while preserving Senior Cosmetic R&D persona, Google Search grounding,
 * anti-hallucination fact-checking, and real Note/Google Docs tool calls.
 */
function buildLiveVoiceSystemInstruction(recentContext?: string): string {
  const baseLines = [
    "Kamu asisten suara AI Formylab.ai (Senior Cosmetic R&D Chemist). Berbicara Bahasa Indonesia alami, hangat, dan lugas seperti di telepon.",
    "Aturan respons cepat:",
    "- Langsung ke inti dalam 1-2 kalimat singkat tanpa pembukaan bertele-tele atau simbol markdown; ucapkan angka secara lisan (misal 'lima persen', 'pH lima koma lima').",
    "- Sapaan ringan: balas ramah 1 kalimat singkat.",
    "- Pertanyaan kosmetik/skincare (BPOM, Halal, pH, HLB, stabilitas, bahan aktif, HPP) maupun topik umum: jawab akurat dan praktis.",
    "- Fakta spesifik/terkini atau saat pengguna mengoreksi/meragukan jawabanmu: WAJIB cek Google Search / panggil `web_search` dulu (jangan ngeyel atau mengarang); jika keliru, akui singkat lalu koreksi sesuai fakta.",
    "- Diminta buat catatan/tabel di chat: WAJIB panggil `create_chat_note`. Diminta buat Google Docs/simpan ke Drive: WAJIB panggil `create_google_doc` (sertakan isi lengkap bila membahas catatan/formula sebelumnya). Konfirmasi 1 kalimat setelah tool selesai.",
  ];

  const trimmedContext =
    typeof recentContext === "string"
      ? recentContext.replace(/\s+/g, " ").trim().slice(0, 420)
      : "";

  if (trimmedContext) {
    baseLines.push(`Konteks chat terakhir (pakai bila relevan): "${trimmedContext}"`);
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
    let excludeModelSet = new Set<string>();
    let preferSimpleTools = false;
    let preferNoTools = false;
    let disableCustomVad = false;
    try {
      const body = await req.json();
      if (typeof body?.recentContext === "string") {
        recentContext = body.recentContext;
      }
      if (Array.isArray(body?.excludeModels)) {
        const validKnownModels = new Set<string>(LIVE_AUDIO_MODELS);
        excludeModelSet = new Set(
          body.excludeModels
            .slice(0, 10)
            .filter(
              (item: unknown): item is string =>
                typeof item === "string" && validKnownModels.has(item)
            )
        );
      }
      if (body?.preferSimpleTools === true) {
        preferSimpleTools = true;
      }
      if (body?.preferNoTools === true) {
        preferNoTools = true;
      }
      if (body?.disableCustomVad === true) {
        disableCustomVad = true;
      }
    } catch {
      // Empty body is valid
    }

    const candidateModels = LIVE_AUDIO_MODELS.filter(
      (modelId) => !excludeModelSet.has(modelId)
    );
    if (candidateModels.length === 0) {
      return NextResponse.json({
        success: false,
        fallbackMode: true,
        remainingCandidatesCount: 0,
        reason:
          "Seluruh kandidat model Gemini Live Audio telah dicoba pada sesi ini.",
      });
    }

    const systemInstruction = buildLiveVoiceSystemInstruction(recentContext);
    const sdkVadPatch = disableCustomVad
      ? {}
      : { realtimeInputConfig: SDK_LIVE_REALTIME_INPUT_CONFIG };
    const wsVadConfig = disableCustomVad
      ? undefined
      : WS_LIVE_REALTIME_INPUT_CONFIG;

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
        remainingCandidatesCount: 0,
        reason: "SDK authTokens.create tidak tersedia pada versi saat ini.",
      });
    }

    const nowMs = Date.now();
    const expireTime = new Date(nowMs + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(nowMs + 90 * 1000).toISOString();
    const attemptErrors: string[] = [];

    for (let idx = 0; idx < candidateModels.length; idx++) {
      const modelId = candidateModels[idx];
      const remainingCandidatesCount = candidateModels.length - idx - 1;

      for (const voiceName of PREFERRED_LIVE_VOICES) {
        // Attempt 1A: Try constrained ephemeral token with hybrid tools (native googleSearch + functionDeclarations)
        if (!preferSimpleTools && !preferNoTools) {
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
                    ...sdkVadPatch,
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
                realtimeInputConfig: wsVadConfig,
                wsUrl: buildLiveWsUrl(tokenRes.name),
                expireTime,
                lockedConfig: true,
                searchMode: "hybrid",
                remainingCandidatesCount,
              });
            }
          } catch (hybridErr: unknown) {
            const msg =
              hybridErr instanceof Error ? hybridErr.message : String(hybridErr);
            attemptErrors.push(`[${modelId}/${voiceName}:hybrid] ${msg}`);
          }
        }

        // Attempt 1B: Safe compatibility fallback -> functionDeclarations only (includes `web_search` backed by Gemini googleSearch)
        if (!preferNoTools) {
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
                    ...sdkVadPatch,
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
                realtimeInputConfig: wsVadConfig,
                wsUrl: buildLiveWsUrl(tokenRes.name),
                expireTime,
                lockedConfig: true,
                searchMode: "function_tool",
                remainingCandidatesCount,
              });
            }
          } catch (lockedErr: unknown) {
            const msg =
              lockedErr instanceof Error ? lockedErr.message : String(lockedErr);
            attemptErrors.push(`[${modelId}/${voiceName}:locked] ${msg}`);
          }
        }

        // Attempt 2: Model-constrained ephemeral token (pure audio or client-configured tools)
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
              tools: preferNoTools ? [] : WS_LIVE_FUNCTION_TOOLS,
              realtimeInputConfig: wsVadConfig,
              wsUrl: buildLiveWsUrl(tokenRes.name),
              expireTime,
              lockedConfig: false,
              searchMode: preferNoTools ? "none" : "function_tool",
              remainingCandidatesCount,
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
      remainingCandidatesCount: 0,
      reason:
        attemptErrors[0] ||
        "Ephemeral token Gemini Live tidak dapat diterbitkan di environment ini.",
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({
      success: false,
      fallbackMode: true,
      remainingCandidatesCount: 0,
      reason: msg,
    });
  }
}
