import { NextRequest, NextResponse } from "next/server";
import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  Tool,
} from "@google/genai";
import {
  LiveVoiceName,
  buildLiveVoiceSystemInstruction,
} from "../../../components/liveVoiceHelpers";

/**
 * Native Audio Live models ordered for instant Vercel-compatible browser connections:
 * Gemini 2.5 Flash Native Audio models support Ephemeral Tokens, Native Server VAD,
 * `thinkingConfig: { thinkingBudget: 0 }`, `contextWindowCompression` sliding window,
 * `enableAffectiveDialog`, and optional Google Search grounding.
 */
const LIVE_NATIVE_AUDIO_MODELS = [
  "gemini-2.5-flash-native-audio-preview-12-2025",
  "gemini-2.5-flash-native-audio-preview-09-2025",
  "gemini-3.8-live",
] as const;

const ALLOWED_VOICES = new Set<LiveVoiceName>([
  "Aoede",
  "Zephyr",
  "Kore",
  "Puck",
]);

// 100% Pure Native Server VAD
const SDK_SERVER_VAD_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
    prefixPaddingMs: 100,
    silenceDurationMs: 250,
  },
  activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
};

const WS_SERVER_VAD_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
    endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
    prefixPaddingMs: 100,
    silenceDurationMs: 250,
  },
  activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
};

// Sliding-window context compression keeps multi-turn audio latency fast on turn #2, #3, #N
const CONTEXT_WINDOW_COMPRESSION_CONFIG = {
  triggerTokens: "12000",
  slidingWindow: {
    targetTokens: "6000",
  },
};

// ONLY attached when the user explicitly toggles Search ON (zero custom function declarations!)
const SDK_SEARCH_ONLY_TOOLS: Tool[] = [{ googleSearch: {} }];
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
    let enableSearch = false;
    let excludeModelSet = new Set<string>();
    let disableThinkingConfig = false;
    let disableCustomVad = false;
    let disableContextCompression = false;
    let disableAffectiveDialog = false;

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
      if (body?.enableSearch === true) {
        enableSearch = true;
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
      if (body?.disableThinkingConfig === true) disableThinkingConfig = true;
      if (body?.disableCustomVad === true) disableCustomVad = true;
      if (body?.disableContextCompression === true) {
        disableContextCompression = true;
      }
      if (body?.disableAffectiveDialog === true) {
        disableAffectiveDialog = true;
      }
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

    const systemInstruction = buildLiveVoiceSystemInstruction(
      recentContext,
      enableSearch
    );

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
        : { realtimeInputConfig: SDK_SERVER_VAD_CONFIG };
      const compressionPatch = disableContextCompression
        ? {}
        : { contextWindowCompression: CONTEXT_WINDOW_COMPRESSION_CONFIG };
      const affectivePatch = disableAffectiveDialog
        ? {}
        : { enableAffectiveDialog: true };
      const sdkToolsPatch = enableSearch ? { tools: SDK_SEARCH_ONLY_TOOLS } : {};
      const wsTools = enableSearch ? WS_SEARCH_ONLY_TOOLS : undefined;

      // Tier 1: Constrained Ephemeral Token with Context Compression + Affective Dialog + Pure Voice / Search
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
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                ...sdkToolsPatch,
                ...thinkingPatch,
                ...vadPatch,
                ...compressionPatch,
                ...affectivePatch,
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
            enableSearch,
            systemInstruction,
            ...(wsTools ? { tools: wsTools } : {}),
            thinkingConfig: supportsZeroThinkingBudget
              ? { thinkingBudget: 0 }
              : undefined,
            realtimeInputConfig: disableCustomVad
              ? undefined
              : WS_SERVER_VAD_CONFIG,
            contextWindowCompression: disableContextCompression
              ? undefined
              : CONTEXT_WINDOW_COMPRESSION_CONFIG,
            enableAffectiveDialog: !disableAffectiveDialog,
            expireTime,
            remainingCandidatesCount,
          });
        }
      } catch (err: unknown) {
        attemptErrors.push(
          `[${modelId}:${enableSearch ? "search" : "pure"}] ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Tier 2: Model-only constrained token (client sends Live setup via ai.live.connect)
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
            enableSearch,
            systemInstruction,
            ...(wsTools ? { tools: wsTools } : {}),
            thinkingConfig: supportsZeroThinkingBudget
              ? { thinkingBudget: 0 }
              : undefined,
            realtimeInputConfig: disableCustomVad
              ? undefined
              : WS_SERVER_VAD_CONFIG,
            contextWindowCompression: disableContextCompression
              ? undefined
              : CONTEXT_WINDOW_COMPRESSION_CONFIG,
            enableAffectiveDialog: !disableAffectiveDialog,
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
