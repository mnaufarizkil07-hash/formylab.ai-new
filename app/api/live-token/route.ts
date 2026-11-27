import { NextRequest, NextResponse } from "next/server";
import {
  ActivityHandling,
  EndSensitivity,
  GoogleGenAI,
  Modality,
  StartSensitivity,
  type Tool,
} from "@google/genai";
import {
  LiveVoiceName,
  buildLiveVoiceFunctionDeclarations,
  buildLiveVoiceSystemInstruction,
  getLiveThinkingConfigForModel,
} from "../../../components/liveVoiceHelpers";

/**
 * Native Audio Live models ordered for ultra-low-latency (< 1s) Vercel-compatible connections:
 * Supports Ephemeral Tokens, High-Sensitivity Server VAD, model-aware anti-thinking config,
 * and ALL 4 Unified Skills permanently active across all 4 voice chips.
 * (No contextWindowCompression overhead — Hot-Swap every 8 turns keeps context lightweight.)
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

// High-Sensitivity Native Server VAD paired with client Adaptive Soft Noise Attenuator (0.08x + 160ms pre-roll):
// Catches normal-volume "halo" 100% instantly while cutting turn latency under 1s.
const SDK_SERVER_VAD_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
    endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_HIGH,
    prefixPaddingMs: 60,
    silenceDurationMs: 180,
  },
  activityHandling: ActivityHandling.START_OF_ACTIVITY_INTERRUPTS,
};

const WS_SERVER_VAD_CONFIG = {
  automaticActivityDetection: {
    disabled: false,
    startOfSpeechSensitivity: "START_SENSITIVITY_HIGH",
    endOfSpeechSensitivity: "END_SENSITIVITY_HIGH",
    prefixPaddingMs: 60,
    silenceDurationMs: 180,
  },
  activityHandling: "START_OF_ACTIVITY_INTERRUPTS",
};

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

    let memorySummary = "";
    let requestedVoice: LiveVoiceName = "Aoede";
    let excludeModelSet = new Set<string>();
    let disableThinkingConfig = false;
    let disableCustomVad = false;

    try {
      const body = await req.json();
      if (typeof body?.memorySummary === "string" && body.memorySummary.trim()) {
        memorySummary = body.memorySummary.trim().slice(0, 7500);
      } else if (
        typeof body?.recentContext === "string" &&
        body.recentContext.trim()
      ) {
        memorySummary = body.recentContext.trim().slice(0, 7500);
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

    const systemInstruction = buildLiveVoiceSystemInstruction(memorySummary);

    // Unified Tool Array: ALL 4 skills (`create_formula_table`, `save_to_google_docs`,
    // `search_web_info`, `recall_chat_history`) permanently active on EVERY voice chip!
    const unifiedTools: Tool[] = [
      {
        functionDeclarations: buildLiveVoiceFunctionDeclarations(),
      },
    ];

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
      const resolvedThinkingConfig = disableThinkingConfig
        ? undefined
        : getLiveThinkingConfigForModel(modelId);

      const thinkingPatch = resolvedThinkingConfig
        ? { thinkingConfig: resolvedThinkingConfig }
        : {};
      const vadPatch = disableCustomVad
        ? {}
        : { realtimeInputConfig: SDK_SERVER_VAD_CONFIG };

      // Tier 1: Constrained Ephemeral Token with All 4 Unified Tools + Model-Aware Anti-Thinking + High-Sensitivity VAD
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
                tools: unifiedTools,
                inputAudioTranscription: {},
                outputAudioTranscription: {},
                ...thinkingPatch,
                ...vadPatch,
              } as Record<string, unknown>,
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
            tools: unifiedTools,
            thinkingConfig: resolvedThinkingConfig,
            realtimeInputConfig: disableCustomVad
              ? undefined
              : WS_SERVER_VAD_CONFIG,
            expireTime,
            remainingCandidatesCount,
          });
        }
      } catch (err: unknown) {
        attemptErrors.push(
          `[${modelId}:unified] ${err instanceof Error ? err.message : String(err)}`
        );
      }

      // Tier 2: Model-only constrained token (client sends unified setup via ai.live.connect)
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
            tools: unifiedTools,
            thinkingConfig: resolvedThinkingConfig,
            realtimeInputConfig: disableCustomVad
              ? undefined
              : WS_SERVER_VAD_CONFIG,
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
