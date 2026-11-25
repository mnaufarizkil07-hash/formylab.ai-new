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
} from "../../../components/chatNoteUtils";
import {
  LiveVoiceName,
  buildLiveVoiceSystemInstruction,
} from "../../../components/liveVoiceHelpers";

/**
 * Native Audio Live models ordered for instant Vercel-compatible browser connections:
 * Gemini 2.5 Flash Native Audio models support Ephemeral Tokens, Google Search grounding,
 * responsive VAD, and `thinkingConfig: { thinkingBudget: 0 }` for sub-second TTFA.
 * `gemini-3.8-live` is included as a live audio fallback (without `thinkingConfig`).
 */
const LIVE_NATIVE_AUDIO_MODELS = [
  "gemini-2.5-flash-native-audio-preview-12-2025",
  "gemini-2.5-flash-native-audio-preview-09-2025",
  "gemini-3.8-live",
] as const;

const ALLOWED_VOICES = new Set<LiveVoiceName>(["Aoede", "Zephyr"]);

const SDK_LIVE_REALTIME_INPUT_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
    prefixPaddingMs: 100,
    silenceDurationMs: 250,
  },
  activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
};

const WS_LIVE_REALTIME_INPUT_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
    endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
    prefixPaddingMs: 100,
    silenceDurationMs: 250,
  },
  activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
};

const SDK_ARTIFACT_FUNCTION_TOOL: Tool = {
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
  ],
};

// Native Google Search grounding + Note/Google Docs tool declarations
const SDK_HYBRID_LIVE_TOOLS: Tool[] = [
  { googleSearch: {} },
  SDK_ARTIFACT_FUNCTION_TOOL,
];

const SDK_SEARCH_ONLY_TOOLS: Tool[] = [{ googleSearch: {} }];

const WS_HYBRID_LIVE_TOOLS = [
  { googleSearch: {} },
  {
    functionDeclarations: [
      CREATE_CHAT_NOTE_TOOL_DECLARATION,
      CREATE_GOOGLE_DOC_TOOL_DECLARATION,
    ],
  },
];

const WS_SEARCH_ONLY_TOOLS = [{ googleSearch: {} }];

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "GEMINI_API_KEY tidak ditemukan di environment server. Konfigurasikan variabel environment terlebih dahulu.",
        },
        { status: 500 }
      );
    }

    let recentContext = "";
    let requestedVoice: LiveVoiceName = "Aoede";
    let excludeModelSet = new Set<string>();
    let searchOnlyTools = false;
    let disableThinkingConfig = false;
    let disableCustomVad = false;

    try {
      const body = await req.json();
      if (typeof body?.recentContext === "string") {
        recentContext = body.recentContext;
      }
      if (
        typeof body?.voiceName === "string" &&
        ALLOWED_VOICES.has(body.voiceName as LiveVoiceName)
      ) {
        requestedVoice = body.voiceName as LiveVoiceName;
      }
      if (Array.isArray(body?.excludeModels)) {
        const known = new Set<string>(LIVE_NATIVE_AUDIO_MODELS);
        excludeModelSet = new Set(
          body.excludeModels
            .slice(0, 10)
            .filter(
              (m: unknown): m is string => typeof m === "string" && known.has(m)
            )
        );
      }
      if (body?.searchOnlyTools === true) searchOnlyTools = true;
      if (body?.disableThinkingConfig === true) disableThinkingConfig = true;
      if (body?.disableCustomVad === true) disableCustomVad = true;
    } catch {
      // Empty JSON body is allowed
    }

    const candidateModels = LIVE_NATIVE_AUDIO_MODELS.filter(
      (modelId) => !excludeModelSet.has(modelId)
    );
    if (candidateModels.length === 0) {
      return NextResponse.json(
        {
          success: false,
          remainingCandidatesCount: 0,
          error:
            "Seluruh model Gemini Live Native Audio telah dicoba dan tidak tersedia pada sesi ini.",
        },
        { status: 503 }
      );
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
      return NextResponse.json(
        {
          success: false,
          error:
            "SDK @google/genai pada server tidak mendukung penerbitan Ephemeral Token (authTokens.create).",
        },
        { status: 500 }
      );
    }

    const nowMs = Date.now();
    const expireTime = new Date(nowMs + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(nowMs + 90 * 1000).toISOString();
    const attemptErrors: string[] = [];

    for (let idx = 0; idx < candidateModels.length; idx++) {
      const modelId = candidateModels[idx];
      const remainingCandidatesCount = candidateModels.length - idx - 1;
      const supportsZeroThinkingBudget =
        /^gemini-2\.5/i.test(modelId) && !disableThinkingConfig;

      const thinkingPatch = supportsZeroThinkingBudget
        ? { thinkingConfig: { thinkingBudget: 0 } }
        : {};
      const vadPatch = disableCustomVad
        ? {}
        : { realtimeInputConfig: SDK_LIVE_REALTIME_INPUT_CONFIG };

      // Tier 1: Constrained Ephemeral Token with Google Search + Artifact tools
      if (!searchOnlyTools) {
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
                        voiceName: requestedVoice,
                      },
                    },
                  },
                  systemInstruction,
                  tools: SDK_HYBRID_LIVE_TOOLS,
                  inputAudioTranscription: {},
                  outputAudioTranscription: {},
                  ...thinkingPatch,
                  ...vadPatch,
                },
              },
            },
          });

          if (tokenRes?.name) {
            return NextResponse.json({
              success: true,
              token: tokenRes.name,
              model: modelId,
              voiceName: requestedVoice,
              systemInstruction,
              tools: WS_HYBRID_LIVE_TOOLS,
              thinkingConfig: supportsZeroThinkingBudget
                ? { thinkingBudget: 0 }
                : undefined,
              realtimeInputConfig: disableCustomVad
                ? undefined
                : WS_LIVE_REALTIME_INPUT_CONFIG,
              toolMode: "hybrid",
              expireTime,
              remainingCandidatesCount,
            });
          }
        } catch (err: unknown) {
          attemptErrors.push(
            `[${modelId}:hybrid] ${err instanceof Error ? err.message : String(err)}`
          );
        }
      }

      // Tier 2: Constrained Ephemeral Token with pure Google Search grounding (`[{ googleSearch: {} }]`)
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
                      voiceName: requestedVoice,
                    },
                  },
                },
                systemInstruction,
                tools: SDK_SEARCH_ONLY_TOOLS,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                ...thinkingPatch,
                ...vadPatch,
              },
            },
          },
        });

        if (tokenRes?.name) {
          return NextResponse.json({
            success: true,
            token: tokenRes.name,
            model: modelId,
            voiceName: requestedVoice,
            systemInstruction,
            tools: WS_SEARCH_ONLY_TOOLS,
            thinkingConfig: supportsZeroThinkingBudget
              ? { thinkingBudget: 0 }
              : undefined,
            realtimeInputConfig: disableCustomVad
              ? undefined
              : WS_LIVE_REALTIME_INPUT_CONFIG,
            toolMode: "google_search",
            expireTime,
            remainingCandidatesCount,
          });
        }
      } catch (err: unknown) {
        attemptErrors.push(
          `[${modelId}:search] ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Tier 3: Model-only constrained token (client sends Live setup via ai.live.connect)
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
            token: tokenRes.name,
            model: modelId,
            voiceName: requestedVoice,
            systemInstruction,
            tools: WS_SEARCH_ONLY_TOOLS,
            thinkingConfig: supportsZeroThinkingBudget
              ? { thinkingBudget: 0 }
              : undefined,
            realtimeInputConfig: disableCustomVad
              ? undefined
              : WS_LIVE_REALTIME_INPUT_CONFIG,
            toolMode: "google_search",
            expireTime,
            remainingCandidatesCount,
          });
        }
      } catch (err: unknown) {
        attemptErrors.push(
          `[${modelId}:model] ${err instanceof Error ? err.message : String(err)}`
        );
      }
    }

    return NextResponse.json(
      {
        success: false,
        remainingCandidatesCount: 0,
        error:
          attemptErrors[0] ||
          "Gagal menerbitkan Ephemeral Token Gemini Live Audio di server.",
      },
      { status: 502 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 }
    );
  }
}
