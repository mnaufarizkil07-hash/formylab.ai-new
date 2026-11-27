import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import {
  LIVE_NATIVE_AUDIO_MODELS,
  LiveVoiceName,
  createLiveVoiceConfig,
  normalizeLiveVoiceName,
} from "../../../components/liveVoiceHelpers";

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
      if (typeof body?.voiceName === "string") {
        requestedVoice = normalizeLiveVoiceName(body.voiceName);
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

      // Single Unified Config Factory across Aoede, Zephyr, Kore, Puck (zero voice-specific branches)
      const unified = createLiveVoiceConfig(requestedVoice, {
        memorySummary,
        modelId,
        disableThinkingConfig,
        disableCustomVad,
      });

      const thinkingPatch = unified.thinkingConfig
        ? { thinkingConfig: unified.thinkingConfig }
        : {};
      const vadPatch = unified.sdkRealtimeInputConfig
        ? { realtimeInputConfig: unified.sdkRealtimeInputConfig }
        : {};

      // Tier 1: Constrained Ephemeral Token with All 4 Unified Tools + Model-Aware Anti-Thinking + High-Sensitivity VAD
      try {
        const tokenRes = await ai.authTokens.create({
          config: {
            uses: 1,
            expireTime,
            newSessionExpireTime,
            liveConnectConstraints: {
              model: unified.model,
              config: {
                responseModalities: unified.responseModalities,
                speechConfig: unified.speechConfig,
                systemInstruction: unified.systemInstruction,
                tools: unified.tools,
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
            model: unified.model,
            voiceName: unified.voiceName,
            systemInstruction: unified.systemInstruction,
            tools: unified.tools,
            thinkingConfig: unified.thinkingConfig,
            realtimeInputConfig: unified.wsRealtimeInputConfig,
            playbackPrebufferMs: unified.playbackPrebufferMs,
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
              model: unified.model,
            },
          },
        });

        if (tokenRes?.name) {
          return NextResponse.json({
            success: true,
            token: tokenRes.name,
            model: unified.model,
            voiceName: unified.voiceName,
            systemInstruction: unified.systemInstruction,
            tools: unified.tools,
            thinkingConfig: unified.thinkingConfig,
            realtimeInputConfig: unified.wsRealtimeInputConfig,
            playbackPrebufferMs: unified.playbackPrebufferMs,
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
