"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Volume2,
  VolumeX,
  Square,
  Play,
  Pause,
  Globe,
  Loader2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import {
  GoogleGenAI,
  Modality,
  type LiveConnectConfig,
  type LiveServerMessage,
  type Session,
  type Tool,
} from "@google/genai";
import { cleanMarkdownForSpeech } from "../lib/interactiveAiEngine";
import {
  ChatNoteArtifact,
  GoogleDocArtifact,
  WebSourceCitation,
  extractWebSourcesFromGroundingMetadata,
  mergeUniqueWebSources,
  normalizeChatNoteArtifact,
  normalizeGoogleDocArtifact,
} from "./chatNoteUtils";
import {
  LIVE_STATUS_LABELS,
  LIVE_VOICE_OPTIONS,
  LiveConnectionStatus,
  LiveVoiceName,
  base64PcmToFloat32,
  classifyLiveVoicePillars,
  downsampleFloat32ToInt16Pcm,
  formatLiveConnectionError,
  hasGoogleSearchGrounding,
  int16PcmToBase64,
  parsePcmSampleRate,
} from "./liveVoiceHelpers";

export interface VoiceSynthesisState {
  autoSpeakEnabled: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  activeMessageId: string | null;
  currentSpokenText: string;
  speechRate: number;
  toggleAutoSpeak: () => void;
  speakMessage: (
    messageId: string,
    rawMarkdown: string,
    onDone?: () => void
  ) => void;
  pauseOrResumeSpeech: () => void;
  stopSpeech: () => void;
  cycleSpeechRate: () => void;
}

/**
 * Strips all markdown syntax, code fences, table pipes, excessive punctuation,
 * and decorative symbols so Indonesian TTS reads smoothly and naturally.
 */
export function sanitizeTextForSpeech(rawMarkdown: string): string {
  if (!rawMarkdown) return "";
  const base = cleanMarkdownForSpeech(rawMarkdown);
  return base
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*+•▪◦]+\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\|/g, ", ")
    .replace(/[*#_`~><\[\]{}\\]+/g, " ")
    .replace(/[—–]+/g, ", ")
    .replace(/\.{2,}/g, ". ")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/,{2,}/g, ",")
    .replace(/[:;]{2,}/g, ",")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Splits cleaned Indonesian text into natural conversational chunks (<= maxChunkLen)
 * at sentence, clause, and word boundaries so speechSynthesis never cuts off mid-sentence.
 */
export function splitSpeechIntoNaturalChunks(
  cleanText: string,
  maxChunkLen = 160
): string[] {
  const normalized = cleanText.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length <= maxChunkLen) {
      if (
        chunks.length > 0 &&
        chunks[chunks.length - 1].length + 1 + sentence.length <= maxChunkLen
      ) {
        chunks[chunks.length - 1] += " " + sentence;
      } else {
        chunks.push(sentence);
      }
      continue;
    }

    // Break long sentence along natural clause boundaries first
    const clauses = sentence.split(/(?<=[,;:])\s+/).filter(Boolean);
    let buffer = "";

    for (const rawClause of clauses) {
      const clause = rawClause.trim();
      if (!clause) continue;

      if ((buffer + " " + clause).trim().length <= maxChunkLen) {
        buffer = (buffer + " " + clause).trim();
      } else {
        if (buffer) {
          chunks.push(buffer);
          buffer = "";
        }
        if (clause.length <= maxChunkLen) {
          buffer = clause;
        } else {
          // Final fallback: split cleanly on word boundaries
          const words = clause.split(/\s+/);
          let wordBuf = "";
          for (const word of words) {
            if ((wordBuf + " " + word).trim().length <= maxChunkLen) {
              wordBuf = (wordBuf + " " + word).trim();
            } else {
              if (wordBuf) chunks.push(wordBuf);
              wordBuf = word;
            }
          }
          buffer = wordBuf;
        }
      }
    }

    if (buffer) {
      chunks.push(buffer);
    }
  }

  return chunks;
}

/**
 * Picks the clearest Indonesian voice (id-ID / id) available in the browser.
 */
function selectBestIndonesianVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | undefined {
  if (!voices || voices.length === 0) return undefined;

  const isIndonesianLang = (v: SpeechSynthesisVoice) => {
    const l = (v.lang || "").toLowerCase().replace("_", "-");
    return l === "id-id" || l === "id" || l.startsWith("id-");
  };

  return (
    voices.find(
      (v) =>
        isIndonesianLang(v) &&
        /(google|gadis|ardi|damayanti|natural|neural)/i.test(v.name)
    ) ||
    voices.find((v) =>
      /(google bahasa indonesia|microsoft gadis|microsoft ardi|damayanti|bahasa indonesia)/i.test(
        v.name
      )
    ) ||
    voices.find((v) => (v.lang || "").toLowerCase().replace("_", "-") === "id-id") ||
    voices.find((v) => isIndonesianLang(v)) ||
    voices.find((v) => /indonesia/i.test(v.name)) ||
    voices.find((v) => (v.lang || "").toLowerCase().startsWith("ms"))
  );
}

export function useInteractiveVoice(
  defaultAutoSpeak = true
): VoiceSynthesisState {
  const [autoSpeakEnabled, setAutoSpeakEnabled] =
    useState<boolean>(defaultAutoSpeak);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [currentSpokenText, setCurrentSpokenText] = useState<string>("");
  const [speechRate, setSpeechRate] = useState<number>(1.03);

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chunkWatchdogRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const keepAliveIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null
  );
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const activeRunIdRef = useRef<number>(0);

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem("formylab_auto_speak");
        if (saved !== null) {
          setAutoSpeakEnabled(saved === "true");
        }
      } catch {
        // ignore storage errors
      }
    });

    // Preload speechSynthesis voices in browser
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.getVoices();
      }
    } catch {
      // ignore
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (fallbackTimerRef.current) {
      clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (chunkWatchdogRef.current) {
      clearTimeout(chunkWatchdogRef.current);
      chunkWatchdogRef.current = null;
    }
    if (keepAliveIntervalRef.current) {
      clearInterval(keepAliveIntervalRef.current);
      keepAliveIntervalRef.current = null;
    }
  }, []);

  const stopSpeech = useCallback(() => {
    activeRunIdRef.current += 1;
    clearTimers();
    if (abortControllerRef.current) {
      try {
        abortControllerRef.current.abort();
      } catch {
        // ignore
      }
      abortControllerRef.current = null;
    }
    if (audioPlayerRef.current) {
      try {
        audioPlayerRef.current.onended = null;
        audioPlayerRef.current.onerror = null;
        audioPlayerRef.current.onloadedmetadata = null;
        audioPlayerRef.current.pause();
        audioPlayerRef.current.src = "";
      } catch {
        // ignore
      }
      audioPlayerRef.current = null;
    }
    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    } catch {
      // ignore
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setActiveMessageId(null);
    setCurrentSpokenText("");
  }, [clearTimers]);

  useEffect(() => {
    return () => {
      stopSpeech();
    };
  }, [stopSpeech]);

  const speakWithIndonesianWebSpeech = useCallback(
    (
      runId: number,
      sentences: string[],
      rate: number,
      onComplete: () => void
    ) => {
      if (typeof window === "undefined" || !("speechSynthesis" in window)) {
        onComplete();
        return;
      }

      const startQueueWithVoices = (voices: SpeechSynthesisVoice[]) => {
        if (activeRunIdRef.current !== runId) return;
        try {
          window.speechSynthesis.cancel();
          const idVoice = selectBestIndonesianVoice(voices);
          let index = 0;

          // Chrome keep-alive prevents speechSynthesis from stalling on longer replies
          if (keepAliveIntervalRef.current) {
            clearInterval(keepAliveIntervalRef.current);
          }
          keepAliveIntervalRef.current = setInterval(() => {
            try {
              if (
                window.speechSynthesis.speaking &&
                !window.speechSynthesis.paused
              ) {
                window.speechSynthesis.pause();
                window.speechSynthesis.resume();
              }
            } catch {
              // ignore
            }
          }, 9000);

          const speakNextSentence = () => {
            if (activeRunIdRef.current !== runId) return;
            if (chunkWatchdogRef.current) {
              clearTimeout(chunkWatchdogRef.current);
              chunkWatchdogRef.current = null;
            }
            if (index >= sentences.length) {
              onComplete();
              return;
            }

            const cleanChunk = sanitizeTextForSpeech(sentences[index++]);
            if (!cleanChunk) {
              speakNextSentence();
              return;
            }

            let advanced = false;
            const advanceOnce = () => {
              if (advanced || activeRunIdRef.current !== runId) return;
              advanced = true;
              if (chunkWatchdogRef.current) {
                clearTimeout(chunkWatchdogRef.current);
                chunkWatchdogRef.current = null;
              }
              speakNextSentence();
            };

            const utterance = new SpeechSynthesisUtterance(cleanChunk);
            utterance.lang = idVoice?.lang || "id-ID";
            utterance.rate = rate;
            utterance.pitch = 1.0;
            if (idVoice) {
              utterance.voice = idVoice;
            }

            utterance.onend = advanceOnce;
            utterance.onerror = advanceOnce;

            // Per-chunk watchdog so headless/stalled browsers never hang forever
            const perChunkMaxMs = Math.max(
              10000,
              Math.round((cleanChunk.length / 6) * (1000 / Math.max(0.7, rate))) +
                5000
            );
            chunkWatchdogRef.current = setTimeout(advanceOnce, perChunkMaxMs);

            window.speechSynthesis.speak(utterance);
          };

          speakNextSentence();
        } catch {
          onComplete();
        }
      };

      try {
        const existingVoices = window.speechSynthesis.getVoices();
        if (existingVoices && existingVoices.length > 0) {
          startQueueWithVoices(existingVoices);
        } else {
          let started = false;
          const handleVoicesChanged = () => {
            if (started) return;
            started = true;
            window.speechSynthesis.removeEventListener(
              "voiceschanged",
              handleVoicesChanged
            );
            startQueueWithVoices(window.speechSynthesis.getVoices() || []);
          };
          window.speechSynthesis.addEventListener(
            "voiceschanged",
            handleVoicesChanged
          );
          setTimeout(() => {
            if (!started) {
              started = true;
              window.speechSynthesis.removeEventListener(
                "voiceschanged",
                handleVoicesChanged
              );
              startQueueWithVoices(window.speechSynthesis.getVoices() || []);
            }
          }, 450);
        }
      } catch {
        onComplete();
      }
    },
    []
  );

  const speakMessage = useCallback(
    (messageId: string, rawMarkdown: string, onDone?: () => void) => {
      stopSpeech();

      const spokenText = sanitizeTextForSpeech(rawMarkdown);
      if (!spokenText) {
        onDone?.();
        return;
      }

      const naturalChunks = splitSpeechIntoNaturalChunks(spokenText, 160);
      if (naturalChunks.length === 0) {
        onDone?.();
        return;
      }

      const runId = activeRunIdRef.current;
      setActiveMessageId(messageId);
      setCurrentSpokenText(spokenText);
      setIsSpeaking(true);
      setIsPaused(false);

      const finishCleanly = () => {
        if (activeRunIdRef.current !== runId) return;
        clearTimers();
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveMessageId(null);
        setCurrentSpokenText("");
        onDone?.();
      };

      const estimatedMs = Math.min(
        180000,
        Math.max(
          9000,
          Math.round((spokenText.length / 7) * (1000 / Math.max(0.7, speechRate))) +
            8000
        )
      );

      // Generous global safety timeout so long answers play completely without freezing in headless browsers
      fallbackTimerRef.current = setTimeout(() => {
        finishCleanly();
      }, estimatedMs);

      const fallbackToWebSpeech = (serverChunks?: unknown) => {
        if (activeRunIdRef.current !== runId) return;
        const normalizedServerChunks =
          Array.isArray(serverChunks) && serverChunks.length > 0
            ? serverChunks
                .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
                .flatMap((c) => splitSpeechIntoNaturalChunks(sanitizeTextForSpeech(c), 160))
            : [];
        const queue =
          normalizedServerChunks.length > 0 ? normalizedServerChunks : naturalChunks;
        speakWithIndonesianWebSpeech(runId, queue, speechRate, finishCleanly);
      };

      // 1. Primary: Fetch genuine Indonesian Neural TTS MP3 stream from /api/tts so it NEVER speaks with an English OS voice
      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: spokenText, lang: "id" }),
        signal: controller.signal,
      })
        .then((res) => res.json())
        .then((data) => {
          if (activeRunIdRef.current !== runId) return;

          if (data?.success && data?.audioDataUrl) {
            const audio = new Audio(data.audioDataUrl);
            audio.playbackRate = speechRate;
            audioPlayerRef.current = audio;

            audio.onloadedmetadata = () => {
              if (activeRunIdRef.current !== runId) return;
              if (Number.isFinite(audio.duration) && audio.duration > 0) {
                if (fallbackTimerRef.current) {
                  clearTimeout(fallbackTimerRef.current);
                }
                fallbackTimerRef.current = setTimeout(() => {
                  finishCleanly();
                }, Math.ceil((audio.duration / Math.max(0.7, speechRate)) * 1000) + 5000);
              }
            };

            audio.onended = () => {
              finishCleanly();
            };

            audio.onerror = () => {
              fallbackToWebSpeech(data.chunks);
            };

            audio.play().catch(() => {
              fallbackToWebSpeech(data.chunks);
            });
            return;
          }

          fallbackToWebSpeech(data?.chunks);
        })
        .catch(() => {
          if (activeRunIdRef.current !== runId) return;
          fallbackToWebSpeech();
        });
    },
    [clearTimers, speakWithIndonesianWebSpeech, speechRate, stopSpeech]
  );

  const pauseOrResumeSpeech = useCallback(() => {
    if (!isSpeaking) return;

    if (audioPlayerRef.current) {
      try {
        if (isPaused) {
          audioPlayerRef.current.play();
          setIsPaused(false);
        } else {
          audioPlayerRef.current.pause();
          setIsPaused(true);
        }
        return;
      } catch {
        // ignore
      }
    }

    try {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        if (isPaused) {
          window.speechSynthesis.resume();
          setIsPaused(false);
        } else {
          window.speechSynthesis.pause();
          setIsPaused(true);
        }
        return;
      }
    } catch {
      // ignore
    }
    setIsPaused((prev) => !prev);
  }, [isPaused, isSpeaking]);

  const toggleAutoSpeak = useCallback(() => {
    setAutoSpeakEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("formylab_auto_speak", String(next));
      } catch {
        // ignore
      }
      if (!next && isSpeaking) {
        stopSpeech();
      }
      return next;
    });
  }, [isSpeaking, stopSpeech]);

  const cycleSpeechRate = useCallback(() => {
    setSpeechRate((prev) => {
      const next = prev < 1.1 ? 1.15 : prev < 1.24 ? 1.25 : 1.0;
      if (audioPlayerRef.current) {
        try {
          audioPlayerRef.current.playbackRate = next;
        } catch {
          // ignore
        }
      }
      return next;
    });
  }, []);

  return {
    autoSpeakEnabled,
    isSpeaking,
    isPaused,
    activeMessageId,
    currentSpokenText,
    speechRate,
    toggleAutoSpeak,
    speakMessage,
    pauseOrResumeSpeech,
    stopSpeech,
    cycleSpeechRate,
  };
}

interface InteractiveVoiceHeaderControlProps {
  voice: VoiceSynthesisState;
}

export default function InteractiveVoiceHeaderControl({
  voice,
}: InteractiveVoiceHeaderControlProps) {
  return (
    <div className="flex items-center gap-1.5 bg-[var(--surface-liquid-deep)] border border-[var(--color-liquid-teal)]/40 rounded-[6px] px-2.5 py-1">
      {/* AUTO-SPEAK TOGGLE BUTTON */}
      <button
        type="button"
        onClick={voice.toggleAutoSpeak}
        className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-[6px] transition cursor-pointer whitespace-nowrap shrink-0 ${
          voice.autoSpeakEnabled
            ? "bg-[var(--color-liquid-teal)] text-[var(--color-platinum)]"
            : "text-[var(--color-silver-mist)] hover:bg-[var(--surface-liquid-kelp)] hover:text-[var(--color-platinum)]"
        }`}
        title={
          voice.autoSpeakEnabled
            ? "Suara Natural Bahasa Indonesia Aktif (Klik untuk Nonaktifkan)"
            : "Aktifkan Suara Natural Bahasa Indonesia Otomatis"
        }
      >
        {voice.autoSpeakEnabled ? (
          <Volume2 className="w-3.5 h-3.5" />
        ) : (
          <VolumeX className="w-3.5 h-3.5" />
        )}
        <span>
          {voice.autoSpeakEnabled ? "Suara Indonesia: ON" : "Suara Indonesia: OFF"}
        </span>
      </button>

      {/* SPEED SELECTOR */}
      <button
        type="button"
        onClick={voice.cycleSpeechRate}
        className="text-[11px] font-mono font-medium text-[var(--color-silver-mist)] hover:text-[var(--color-platinum)] px-1.5 py-0.5 rounded-[6px] hover:bg-[var(--surface-liquid-kelp)] transition cursor-pointer tabular-nums whitespace-nowrap shrink-0"
        title="Kecepatan Suara AI (Klik untuk Ubah)"
      >
        {voice.speechRate.toFixed(2).replace(/\.?0+$/, "")}x
      </button>

      {/* ACTIVE SPEAKING CONTROLS (PAUSE/RESUME + STOP) */}
      {voice.isSpeaking && (
        <div className="flex items-center gap-1 pl-1.5 border-l border-[var(--color-liquid-teal)]/40">
          <button
            type="button"
            onClick={voice.pauseOrResumeSpeech}
            className="p-1 rounded-[6px] bg-[var(--surface-liquid-kelp)] text-[var(--color-aurora-cyan)] hover:bg-[var(--color-liquid-teal)] hover:text-[var(--color-platinum)] transition cursor-pointer"
            title={voice.isPaused ? "Lanjutkan Suara" : "Jeda Suara"}
            aria-label={voice.isPaused ? "Lanjutkan Suara" : "Jeda Suara"}
          >
            {voice.isPaused ? (
              <Play className="w-3 h-3" />
            ) : (
              <Pause className="w-3 h-3" />
            )}
          </button>
          <button
            type="button"
            onClick={voice.stopSpeech}
            className="p-1 rounded-[6px] bg-[var(--surface-liquid-abyss)] text-[var(--color-lavender-phosphor)] border border-[var(--color-lavender-phosphor)]/40 hover:bg-[var(--color-lavender-phosphor)]/15 transition cursor-pointer"
            title="Hentikan Suara"
            aria-label="Hentikan Suara"
          >
            <Square className="w-3 h-3" />
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// INLINE CHAT-ROOM AI VOICE MODE (COMPACT 3D PARTICLE SPHERE + LIVE STREAM)
// ============================================================================

export interface VoiceCallReplyAudio {
  base64: string;
  mimeType: string;
}

export interface VoiceCallTurnPayload {
  reply: string | null;
  transcript?: string;
  replyAudio?: VoiceCallReplyAudio | null;
  createdNotes?: ChatNoteArtifact[];
  createdGoogleDocs?: GoogleDocArtifact[];
  sources?: WebSourceCitation[];
}

export interface VoiceCallTranscriptItem {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

type LivingOrbPhase = "listening" | "thinking" | "speaking";

interface InteractiveVoiceCallOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  voice?: VoiceSynthesisState;
  isMicMuted?: boolean;
  recentChatContext?: string;
  onLiveUserStream?: (turnId: string, text: string) => void;
  onLiveAssistantStream?: (turnId: string, text: string) => void;
  onLiveTurnComplete?: (payload: {
    userTurnId?: string;
    userText?: string;
    assistantTurnId?: string;
    assistantText?: string;
    activePillars: string[];
    usedGoogleSearch: boolean;
  }) => void;
  onLiveWebSources?: (turnId: string, sources: WebSourceCitation[]) => void;
  onCreateChatNote?: (note: ChatNoteArtifact) => void;
  onCreateGoogleDoc?: (doc: GoogleDocArtifact) => void;
}

interface LiveTokenApiResponse {
  success?: boolean;
  token?: string;
  model?: string;
  voiceName?: LiveVoiceName;
  systemInstruction?: string;
  tools?: Tool[];
  thinkingConfig?: LiveConnectConfig["thinkingConfig"];
  realtimeInputConfig?: LiveConnectConfig["realtimeInputConfig"];
  toolMode?: "hybrid" | "search_only";
  remainingCandidatesCount?: number;
  error?: string;
}

const LIVE_TRANSCRIPT_THROTTLE_MS = 90;
const LIVE_FIRST_CHUNK_LEAD_SEC = 0.02;

// Short-lived in-memory cooldown for models that failed WS setup (e.g., quota 1011)
// so subsequent voice sessions connect on the first attempt without extra round-trip latency.
const LIVE_MODEL_COOLDOWN_MS = 5 * 60 * 1000;
const recentlyFailedLiveModels = new Map<string, number>();

function getRecentlyFailedLiveModels(): string[] {
  const now = Date.now();
  const active: string[] = [];
  recentlyFailedLiveModels.forEach((failedAt, modelId) => {
    if (now - failedAt < LIVE_MODEL_COOLDOWN_MS) {
      active.push(modelId);
    } else {
      recentlyFailedLiveModels.delete(modelId);
    }
  });
  return active;
}

/**
 * Off-main-thread 16kHz Int16 PCM Mic Capture AudioWorklet:
 * Downsamples hardware microphone input (e.g., 48kHz -> 16kHz) inside the AudioWorklet thread
 * and emits ultra-low-latency 30ms packets (480 samples @ 16kHz) for near-instant turn-taking.
 */
const PCM_CAPTURE_WORKLET_CODE = `
class FormylabLivePcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._targetRate = 16000;
    this._ratio = Math.max(0.25, sampleRate / this._targetRate);
    this._packetSamples = 480; // 30ms @ 16kHz (within 20-40ms low-latency window)
    this._out = new Int16Array(this._packetSamples);
    this._outIndex = 0;
    this._phase = 0;
    this._lastSample = 0;
  }

  process(inputs) {
    const input = inputs[0];
    if (!input || !input[0] || input[0].length === 0) {
      return true;
    }
    const ch = input[0];
    const len = ch.length;

    if (Math.abs(this._ratio - 1.0) < 0.001) {
      for (let i = 0; i < len; i++) {
        const clamped = Math.max(-1, Math.min(1, ch[i]));
        this._out[this._outIndex++] =
          clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
        if (this._outIndex >= this._packetSamples) {
          const packet = this._out;
          this._out = new Int16Array(this._packetSamples);
          this._outIndex = 0;
          this.port.postMessage(packet, [packet.buffer]);
        }
      }
      this._lastSample = ch[len - 1];
      return true;
    }

    let pos = this._phase;
    while (pos < len) {
      const idx0 = Math.floor(pos);
      const frac = pos - idx0;
      const s0 = idx0 < 0 ? this._lastSample : ch[idx0];
      const s1 = idx0 + 1 < len ? ch[idx0 + 1] : ch[len - 1];
      const interp = s0 + (s1 - s0) * frac;
      const clamped = Math.max(-1, Math.min(1, interp));
      this._out[this._outIndex++] =
        clamped < 0 ? Math.round(clamped * 0x8000) : Math.round(clamped * 0x7fff);
      if (this._outIndex >= this._packetSamples) {
        const packet = this._out;
        this._out = new Int16Array(this._packetSamples);
        this._outIndex = 0;
        this.port.postMessage(packet, [packet.buffer]);
      }
      pos += this._ratio;
    }
    this._phase = pos - len;
    this._lastSample = ch[len - 1];
    return true;
  }
}
registerProcessor("formylab-live-pcm-capture", FormylabLivePcmCaptureProcessor);
`;

function isMicPermissionDenied(err: unknown): boolean {
  if (!err) return false;
  if (typeof err === "string") {
    return /not-allowed|service-not-allowed|permission/i.test(err);
  }
  const e = err as { name?: string; message?: string };
  const name = (e.name || "").toLowerCase();
  const msg = (e.message || "").toLowerCase();
  return (
    name === "notallowederror" ||
    name === "permissiondeniederror" ||
    name === "securityerror" ||
    msg.includes("permission") ||
    msg.includes("not allowed") ||
    msg.includes("denied")
  );
}

const VOICE_SPHERE_WEBGL_COUNT = 7600;
const VOICE_SPHERE_2D_COUNT = 1600;
const VOICE_SPHERE_FLOATS = 6; // a_position (3) + a_random (3)

const VOICE_SPHERE_VERTEX_SHADER = `
precision highp float;

attribute vec3 a_position;
attribute vec3 a_random;

uniform float u_time;
uniform float u_rotAngle;
uniform float u_audioLevel;
uniform float u_bandLow;
uniform float u_bandMid;
uniform float u_bandHigh;
uniform float u_speakMix;
uniform float u_thinkMix;
uniform float u_motionScale;
uniform float u_dpr;

varying float v_depth;
varying float v_rim;
varying float v_wave;
varying float v_tonePick;
varying float v_gradX;
varying float v_alpha;
varying float v_speakGlow;

mat3 rotateY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
}

mat3 rotateX(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    1.0, 0.0, 0.0,
    0.0, c, -s,
    0.0, s, c
  );
}

void main() {
  // 1. Smooth upright 3D rotation matching Landing Page ParticleSphere (subtle tilt only when thinking)
  float tiltX = sin(u_time * 0.55) * 0.06 * u_motionScale + u_thinkMix * 0.14 * sin(u_time * 1.1);
  vec3 rotated = rotateX(tiltX) * (rotateY(u_rotAngle) * a_position);
  vec3 normalRot = normalize(rotated);

  // 2. Per-particle 3D organic waves (identical harmonic style to Landing Page + live audio reactivity)
  float phase = a_random.y * 6.2831853;
  float waveSpeed = 1.0 + u_speakMix * 0.85 + u_thinkMix * 0.65;

  float waveA = sin(rotated.x * 4.2 + rotated.y * 3.1 - u_time * 1.45 * waveSpeed + phase * 0.25);
  float waveB = cos(rotated.y * 5.0 - rotated.z * 3.6 + u_time * 1.15 * waveSpeed + phase * 0.35);
  float waveC = sin((rotated.x - rotated.z) * 3.4 + rotated.y * 2.4 + u_time * 0.95 * waveSpeed);
  float microPulse = sin(u_time * 2.2 + phase) * 0.20;

  // Ambient wave baseline
  float baseWave = (waveA * 0.45 + waveB * 0.35 + waveC * 0.28 + microPulse) * 0.042 * u_motionScale;

  // Listening state: gentle radius expansion & soft shimmer synced to user mic volume
  float listenMix = max(0.0, 1.0 - u_speakMix - u_thinkMix);
  float micExpansion = listenMix * u_audioLevel * 0.095 * u_motionScale;
  float micRipple = listenMix * u_audioLevel * (waveA * 0.55 + waveB * 0.45) * 0.055 * u_motionScale;

  // Thinking state: subtle concentric contraction/pulse toward center
  float thinkPulse = u_thinkMix * (-0.055 + sin(u_time * 3.4 - length(rotated.xy) * 2.2) * 0.042) * u_motionScale;

  // Speaking state: organic multi-band 3D surface waves driven by real-time AI audio spectrum
  float speakRippleLat = sin(rotated.y * 6.5 - u_time * 4.6 + phase * 0.18) * u_bandLow;
  float speakRippleLon = cos(rotated.x * 5.8 + rotated.z * 4.4 + u_time * 3.8) * u_bandMid;
  float speakRippleFine = sin((rotated.x + rotated.y - rotated.z) * 8.2 - u_time * 5.4 + phase) * u_bandHigh;
  float speakDisplacement = u_speakMix * (
    u_audioLevel * 0.085 +
    (speakRippleLat * 0.075 + speakRippleLon * 0.065 + speakRippleFine * 0.045)
  ) * u_motionScale;

  float radialScale = 1.0 + micExpansion + thinkPulse;
  float totalWave = baseWave + micRipple + speakDisplacement;
  vec3 displaced = rotated * radialScale + normalRot * totalWave;

  // 3. True 1:1 Perspective Projection centered cleanly inside compact square canvas (zero clipping)
  float cameraZ = 3.25;
  float viewZ = max(cameraZ - displaced.z, 0.95);
  float radiusNDC = 0.74;
  float fovScale = radiusNDC / 0.32338;

  float projX = (displaced.x * fovScale) / viewZ;
  float projY = (displaced.y * fovScale) / viewZ;
  float projZ = clamp((viewZ - 1.2) / 4.2, 0.0, 1.0) * 2.0 - 1.0;

  gl_Position = vec4(projX, projY, projZ, 1.0);

  // 4. Depth, rim shading, and crisp Retina point sizing
  float depthNorm = clamp((displaced.z + 1.08) / 2.16, 0.0, 1.0);
  float rim = pow(max(0.0, 1.0 - abs(normalRot.z)), 1.48);

  float sizeBase = mix(1.35, 2.75, a_random.x);
  float depthScale = clamp(3.20 / max(viewZ, 1.25), 0.78, 1.28);
  float waveSizeBoost = 1.0 + clamp(totalWave * 3.6 + u_speakMix * u_audioLevel * 0.22, -0.14, 0.34);
  gl_PointSize = clamp(sizeBase * depthScale * waveSizeBoost * u_dpr, 1.2 * u_dpr, 4.2 * u_dpr);

  float backDim = mix(0.36, 0.98, depthNorm);
  float rimBoost = mix(0.90, 1.22, rim);

  v_depth = depthNorm;
  v_rim = rim;
  v_wave = clamp(totalWave * 9.5 + 0.5, 0.0, 1.0);
  v_tonePick = a_random.z;
  // Left-to-right spatial gradient (teal-emerald on left -> mint-green-lime on right)
  v_gradX = clamp(0.5 + rotated.x * 0.56 - rotated.y * 0.16, 0.0, 1.0);
  v_alpha = clamp(backDim * rimBoost, 0.22, 0.98);
  v_speakGlow = clamp(u_speakMix * (u_audioLevel * 0.85 + max(0.0, totalWave) * 3.2), 0.0, 1.0);
}
`;

const VOICE_SPHERE_FRAGMENT_SHADER = `
precision highp float;

varying float v_depth;
varying float v_rim;
varying float v_wave;
varying float v_tonePick;
varying float v_gradX;
varying float v_alpha;
varying float v_speakGlow;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  // Crisp circular radial dot with defined luminous micro-core (identical to Landing Page)
  float halo = smoothstep(0.5, 0.06, dist);
  float core = exp(-dist * dist * 14.0);
  float shape = mix(halo * 0.72, 1.0, core);

  // Landing Page spatial palette: Deep Teal-Emerald (left) -> Rich Aqua/Mint -> Soft Mint-Lime (right)
  vec3 deepTeal     = vec3(0.055, 0.502, 0.494); // #0E807E
  vec3 richTeal     = vec3(0.078, 0.722, 0.651); // #14B8A6
  vec3 aquaAccent   = vec3(0.247, 0.776, 0.773); // #3FC6C5
  vec3 richMint     = vec3(0.173, 0.651, 0.533); // #2CA688
  vec3 freshMint    = vec3(0.290, 0.871, 0.502); // #4ADE80
  vec3 freshLime    = vec3(0.486, 0.769, 0.298); // #7CC44C
  vec3 softMintGlow = vec3(0.525, 0.937, 0.675); // #86EFAC

  float gradT = clamp(v_gradX + (v_wave - 0.5) * 0.14, 0.0, 1.0);

  vec3 band1 = mix(deepTeal, richTeal, smoothstep(0.0, 0.30, gradT));
  vec3 band2 = mix(band1, richMint, smoothstep(0.24, 0.54, gradT));
  vec3 band3 = mix(band2, freshMint, smoothstep(0.48, 0.80, gradT));
  vec3 color = mix(band3, mix(freshLime, softMintGlow, 0.52), smoothstep(0.74, 1.0, gradT));

  // Saturated wave-crest accents (keeps contrast crisp on light atmospheric glass)
  float accentPick = step(0.76, v_tonePick);
  vec3 waveAccent = mix(aquaAccent, softMintGlow, smoothstep(0.32, 0.90, gradT));
  color = mix(color, waveAccent, accentPick * 0.38 * smoothstep(0.25, 0.92, v_wave));

  // Subtle brightness lift when AI speaks (real-time organic energy)
  color = mix(color, mix(aquaAccent, softMintGlow, gradT), v_speakGlow * 0.32);

  // Anchor left/front silhouette contour with Deep Teal for unmistakable 3D depth
  float contourAnchor = smoothstep(0.42, 0.95, v_rim) * (1.0 - gradT * 0.48);
  color = mix(color, deepTeal, contourAnchor * 0.38);

  // Volumetric depth shading (front hemisphere pops sharply over back hemisphere)
  color = mix(color * 0.84, color, v_depth);

  float finalAlpha = shape * v_alpha;
  if (finalAlpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(color, finalAlpha);
}
`;

function voiceMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildCompactFibonacciSphere(count: number): Float32Array {
  const data = new Float32Array(count * VOICE_SPHERE_FLOATS);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const rand = voiceMulberry32(202607);

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const yBase = 1.0 - 2.0 * t;
    const rBase = Math.sqrt(Math.max(0, 1.0 - yBase * yBase));
    const theta = goldenAngle * i + (rand() - 0.5) * 0.14;

    const jitter = 0.016;
    const xRaw = Math.cos(theta) * rBase + (rand() - 0.5) * jitter;
    const yRaw = yBase + (rand() - 0.5) * jitter;
    const zRaw = Math.sin(theta) * rBase + (rand() - 0.5) * jitter;

    const len = Math.sqrt(xRaw * xRaw + yRaw * yRaw + zRaw * zRaw) || 1.0;
    const shell = 0.985 + rand() * 0.03;

    const offset = i * VOICE_SPHERE_FLOATS;
    data[offset] = (xRaw / len) * shell;
    data[offset + 1] = (yRaw / len) * shell;
    data[offset + 2] = (zRaw / len) * shell;
    data[offset + 3] = rand(); // size variation
    data[offset + 4] = rand(); // wave phase
    data[offset + 5] = rand(); // accent tone pick
  }

  return data;
}

function compileVoiceSphereShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createVoiceSphereProgram(
  gl: WebGLRenderingContext
): WebGLProgram | null {
  const vs = compileVoiceSphereShader(
    gl,
    gl.VERTEX_SHADER,
    VOICE_SPHERE_VERTEX_SHADER
  );
  const fs = compileVoiceSphereShader(
    gl,
    gl.FRAGMENT_SHADER,
    VOICE_SPHERE_FRAGMENT_SHADER
  );
  if (!vs || !fs) {
    if (vs) gl.deleteShader(vs);
    if (fs) gl.deleteShader(fs);
    return null;
  }
  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    return null;
  }
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }
  return program;
}

/**
 * Compact Audio-Reactive 3D Particle Sphere for Voice Call Mode.
 * Matches the Landing Page ParticleSphere (Fibonacci 3D sphere, teal-emerald -> mint -> soft green-lime
 * spatial gradient, volumetric depth shading) and reacts in real time to Web Audio AnalyserNode levels
 * across listening, thinking, and speaking states. Uses WebGL1 GPU shaders with automatic 2D Canvas fallback.
 */
function LivingVoiceOrb({
  phase,
  analyserRef,
  speechPulseRef,
}: {
  phase: LivingOrbPhase;
  analyserRef: React.RefObject<AnalyserNode | null>;
  speechPulseRef: React.RefObject<number>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallbackCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const phaseRef = useRef<LivingOrbPhase>(phase);

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  useEffect(() => {
    const container = containerRef.current;
    const webglCanvas = webglCanvasRef.current;
    const fallbackCanvas = fallbackCanvasRef.current;
    if (!container || !webglCanvas || !fallbackCanvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const motionScale = prefersReducedMotion ? 0.28 : 1.0;

    let rafId = 0;
    let lastTs = performance.now();
    let elapsed = 0;
    let rotAngle = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Smoothed audio & state interpolators (zero React re-renders)
    let smoothLevel = 0.04;
    let smoothLow = 0;
    let smoothMid = 0;
    let smoothHigh = 0;
    let smoothSpeakMix = 0;
    let smoothThinkMix = 0;
    const freqData = new Uint8Array(128);
    const timeData = new Uint8Array(128);

    // Initialize WebGL1 first (identical shader architecture to Landing Page ParticleSphere)
    const gl = webglCanvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    });
    const program = gl ? createVoiceSphereProgram(gl) : null;

    let vbo: WebGLBuffer | null = null;
    let useWebGL = false;
    let posLoc = -1;
    let randLoc = -1;
    let uTimeLoc: WebGLUniformLocation | null = null;
    let uRotAngleLoc: WebGLUniformLocation | null = null;
    let uAudioLevelLoc: WebGLUniformLocation | null = null;
    let uBandLowLoc: WebGLUniformLocation | null = null;
    let uBandMidLoc: WebGLUniformLocation | null = null;
    let uBandHighLoc: WebGLUniformLocation | null = null;
    let uSpeakMixLoc: WebGLUniformLocation | null = null;
    let uThinkMixLoc: WebGLUniformLocation | null = null;
    let uMotionScaleLoc: WebGLUniformLocation | null = null;
    let uDprLoc: WebGLUniformLocation | null = null;

    if (gl && program) {
      vbo = gl.createBuffer();
      if (vbo) {
        const sphereData = buildCompactFibonacciSphere(VOICE_SPHERE_WEBGL_COUNT);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, sphereData, gl.STATIC_DRAW);

        posLoc = gl.getAttribLocation(program, "a_position");
        randLoc = gl.getAttribLocation(program, "a_random");
        uTimeLoc = gl.getUniformLocation(program, "u_time");
        uRotAngleLoc = gl.getUniformLocation(program, "u_rotAngle");
        uAudioLevelLoc = gl.getUniformLocation(program, "u_audioLevel");
        uBandLowLoc = gl.getUniformLocation(program, "u_bandLow");
        uBandMidLoc = gl.getUniformLocation(program, "u_bandMid");
        uBandHighLoc = gl.getUniformLocation(program, "u_bandHigh");
        uSpeakMixLoc = gl.getUniformLocation(program, "u_speakMix");
        uThinkMixLoc = gl.getUniformLocation(program, "u_thinkMix");
        uMotionScaleLoc = gl.getUniformLocation(program, "u_motionScale");
        uDprLoc = gl.getUniformLocation(program, "u_dpr");

        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
          gl.SRC_ALPHA,
          gl.ONE_MINUS_SRC_ALPHA,
          gl.ONE,
          gl.ONE_MINUS_SRC_ALPHA
        );
        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        webglCanvas.style.display = "block";
        fallbackCanvas.style.display = "none";
        useWebGL = true;
      }
    }

    // Automatic crisp 2D Canvas fallback when WebGL1 is unavailable
    let ctx2d: CanvasRenderingContext2D | null = null;
    let fallbackPoints: Float32Array | null = null;
    if (!useWebGL) {
      webglCanvas.style.display = "none";
      fallbackCanvas.style.display = "block";
      ctx2d = fallbackCanvas.getContext("2d", { alpha: true });
      fallbackPoints = buildCompactFibonacciSphere(VOICE_SPHERE_2D_COUNT);
    }

    const activeCanvas = useWebGL ? webglCanvas : fallbackCanvas;

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      const cssW = Math.max(96, rect.width || 96);
      const cssH = Math.max(96, rect.height || 96);
      const targetW = Math.round(cssW * dpr);
      const targetH = Math.round(cssH * dpr);
      if (activeCanvas.width !== targetW || activeCanvas.height !== targetH) {
        activeCanvas.width = targetW;
        activeCanvas.height = targetH;
      }
      if (useWebGL && gl) {
        gl.viewport(0, 0, targetW, targetH);
      }
    };

    resize();
    window.addEventListener("resize", resize, { passive: true });
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => resize())
        : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    const sampleAudioSpectrum = (curPhase: LivingOrbPhase) => {
      let measuredLevel = 0;
      let rawLow = 0;
      let rawMid = 0;
      let rawHigh = 0;

      const analyser = analyserRef.current;
      if (analyser && (curPhase === "listening" || curPhase === "speaking")) {
        try {
          analyser.getByteFrequencyData(freqData);
          analyser.getByteTimeDomainData(timeData);

          const binCount = Math.min(64, analyser.frequencyBinCount);
          const lowEnd = Math.min(10, binCount);
          const midEnd = Math.min(28, binCount);

          let lowSum = 0;
          let midSum = 0;
          let highSum = 0;

          for (let i = 0; i < lowEnd; i++) lowSum += freqData[i];
          for (let i = lowEnd; i < midEnd; i++) midSum += freqData[i];
          for (let i = midEnd; i < binCount; i++) highSum += freqData[i];

          rawLow = lowEnd > 0 ? lowSum / (lowEnd * 255) : 0;
          rawMid = midEnd > lowEnd ? midSum / ((midEnd - lowEnd) * 255) : 0;
          rawHigh =
            binCount > midEnd ? highSum / ((binCount - midEnd) * 255) : 0;

          let rmsAcc = 0;
          const tLen = Math.min(timeData.length, analyser.fftSize);
          for (let i = 0; i < tLen; i++) {
            const centered = (timeData[i] - 128) / 128;
            rmsAcc += centered * centered;
          }
          const rms = Math.sqrt(rmsAcc / Math.max(1, tLen));

          const avgBand = rawLow * 0.45 + rawMid * 0.4 + rawHigh * 0.15;
          measuredLevel = Math.min(1, Math.max(avgBand * 2.1, rms * 3.5));
        } catch {
          measuredLevel = 0;
        }
      }

      // Include SpeechRecognition interim speech pulse when browser restricts dual mic stream
      if (speechPulseRef.current > 0.005) {
        measuredLevel = Math.max(measuredLevel, speechPulseRef.current);
        rawLow = Math.max(rawLow, speechPulseRef.current * 0.75);
        rawMid = Math.max(rawMid, speechPulseRef.current * 0.65);
        speechPulseRef.current *= 0.9;
      }

      // Organic baseline modulation when speaking via speechSynthesis fallback (no AnalyserNode)
      if (curPhase === "speaking" && !analyser) {
        const synthWave =
          0.32 +
          Math.sin(elapsed * 7.4) * 0.16 +
          Math.cos(elapsed * 11.2) * 0.12;
        measuredLevel = Math.max(measuredLevel, synthWave);
        rawLow = Math.max(rawLow, 0.36 + Math.sin(elapsed * 5.2) * 0.18);
        rawMid = Math.max(rawMid, 0.34 + Math.cos(elapsed * 8.6) * 0.18);
        rawHigh = Math.max(rawHigh, 0.24 + Math.sin(elapsed * 12.1) * 0.12);
      }

      const targetLevel =
        curPhase === "thinking"
          ? 0.22 + Math.sin(elapsed * 3.1) * 0.06
          : curPhase === "speaking"
            ? Math.max(0.14, measuredLevel)
            : Math.max(0.02, measuredLevel);

      smoothLevel += (targetLevel - smoothLevel) * 0.18;
      smoothLow += (Math.min(1, rawLow * 1.9) - smoothLow) * 0.2;
      smoothMid += (Math.min(1, rawMid * 2.1) - smoothMid) * 0.2;
      smoothHigh += (Math.min(1, rawHigh * 2.2) - smoothHigh) * 0.2;
      smoothSpeakMix +=
        ((curPhase === "speaking" ? 1 : 0) - smoothSpeakMix) * 0.1;
      smoothThinkMix +=
        ((curPhase === "thinking" ? 1 : 0) - smoothThinkMix) * 0.1;
    };

    const renderWebGL = () => {
      if (!gl || !program || !vbo) return;
      const stride = VOICE_SPHERE_FLOATS * Float32Array.BYTES_PER_ELEMENT;

      gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      if (posLoc >= 0) {
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
      }
      if (randLoc >= 0) {
        gl.enableVertexAttribArray(randLoc);
        gl.vertexAttribPointer(
          randLoc,
          3,
          gl.FLOAT,
          false,
          stride,
          3 * Float32Array.BYTES_PER_ELEMENT
        );
      }

      if (uTimeLoc) gl.uniform1f(uTimeLoc, elapsed);
      if (uRotAngleLoc) gl.uniform1f(uRotAngleLoc, rotAngle);
      if (uAudioLevelLoc) gl.uniform1f(uAudioLevelLoc, smoothLevel);
      if (uBandLowLoc) gl.uniform1f(uBandLowLoc, smoothLow);
      if (uBandMidLoc) gl.uniform1f(uBandMidLoc, smoothMid);
      if (uBandHighLoc) gl.uniform1f(uBandHighLoc, smoothHigh);
      if (uSpeakMixLoc) gl.uniform1f(uSpeakMixLoc, smoothSpeakMix);
      if (uThinkMixLoc) gl.uniform1f(uThinkMixLoc, smoothThinkMix);
      if (uMotionScaleLoc) gl.uniform1f(uMotionScaleLoc, motionScale);
      if (uDprLoc) gl.uniform1f(uDprLoc, dpr);

      gl.drawArrays(gl.POINTS, 0, VOICE_SPHERE_WEBGL_COUNT);
    };

    const renderFallback2D = () => {
      if (!ctx2d || !fallbackPoints) return;
      const w = fallbackCanvas.width;
      const h = fallbackCanvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.5;
      const radius = Math.min(w, h) * 0.37;
      const cosY = Math.cos(rotAngle);
      const sinY = Math.sin(rotAngle);
      const waveSpeed = 1.0 + smoothSpeakMix * 0.85 + smoothThinkMix * 0.65;
      const listenMix = Math.max(0, 1 - smoothSpeakMix - smoothThinkMix);

      for (let i = 0; i < VOICE_SPHERE_2D_COUNT; i++) {
        const o = i * VOICE_SPHERE_FLOATS;
        const px = fallbackPoints[o];
        const py = fallbackPoints[o + 1];
        const pz = fallbackPoints[o + 2];
        const rSize = fallbackPoints[o + 3];
        const phase = fallbackPoints[o + 4] * Math.PI * 2;

        const rx = px * cosY + pz * sinY;
        const ry = py;
        const rz = -px * sinY + pz * cosY;

        const wA = Math.sin(
          rx * 4.2 + ry * 3.1 - elapsed * 1.45 * waveSpeed + phase * 0.25
        );
        const wB = Math.cos(
          ry * 5.0 - rz * 3.6 + elapsed * 1.15 * waveSpeed + phase * 0.35
        );
        const baseWave = (wA * 0.48 + wB * 0.36) * 0.042 * motionScale;
        const micExp = listenMix * smoothLevel * 0.095 * motionScale;
        const thinkPulse =
          smoothThinkMix *
          (-0.055 + Math.sin(elapsed * 3.4) * 0.04) *
          motionScale;
        const speakWave =
          smoothSpeakMix *
          (smoothLevel * 0.085 +
            Math.sin(ry * 6.5 - elapsed * 4.6) * smoothLow * 0.075 +
            Math.cos(rx * 5.8 + elapsed * 3.8) * smoothMid * 0.065) *
          motionScale;

        const totalScale = 1 + micExp + thinkPulse + baseWave + speakWave;
        const fx = rx * totalScale;
        const fy = ry * totalScale;
        const fz = rz * totalScale;

        const viewZ = Math.max(3.25 - fz, 0.95);
        const scale = 3.09 / viewZ;
        const sx = cx + fx * radius * scale;
        const sy = cy - fy * radius * scale;

        const depthNorm = Math.max(0, Math.min(1, (fz + 1.08) / 2.16));
        const gradX = Math.max(0, Math.min(1, 0.5 + rx * 0.56 - ry * 0.16));

        if (gradX < 0.22) {
          ctx2d.fillStyle = "#0E807E";
        } else if (gradX < 0.44) {
          ctx2d.fillStyle = "#14B8A6";
        } else if (gradX < 0.64) {
          ctx2d.fillStyle = "#2CA688";
        } else if (gradX < 0.84) {
          ctx2d.fillStyle = "#4ADE80";
        } else {
          ctx2d.fillStyle = "#86EFAC";
        }

        const speakBoost = 1 + smoothSpeakMix * smoothLevel * 0.2;
        const dotR = (0.95 + rSize * 1.05) * speakBoost * dpr;
        ctx2d.globalAlpha = Math.max(
          0.22,
          Math.min(0.96, 0.36 + depthNorm * 0.6)
        );
        ctx2d.beginPath();
        ctx2d.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;
    };

    const tick = (now: number) => {
      if (document.hidden) {
        lastTs = now;
        rafId = requestAnimationFrame(tick);
        return;
      }

      const dt = Math.min(0.05, Math.max(0, (now - lastTs) * 0.001));
      lastTs = now;
      elapsed += dt;

      const curPhase = phaseRef.current;
      sampleAudioSpectrum(curPhase);

      // Smooth angular velocity: slow idle/listening, slightly faster when thinking, lively when speaking
      const rotSpeed =
        (0.16 + smoothThinkMix * 0.42 + smoothSpeakMix * 0.16) *
        (prefersReducedMotion ? 0.25 : 1.0);
      rotAngle += dt * rotSpeed;

      if (useWebGL) {
        renderWebGL();
      } else {
        renderFallback2D();
      }

      rafId = requestAnimationFrame(tick);
    };

    sampleAudioSpectrum(phaseRef.current);
    if (useWebGL) {
      renderWebGL();
    } else {
      renderFallback2D();
    }
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener("resize", resize);
      if (resizeObserver) resizeObserver.disconnect();
      if (useWebGL && gl) {
        if (vbo) gl.deleteBuffer(vbo);
        if (program) gl.deleteProgram(program);
      }
    };
  }, [analyserRef, speechPulseRef]);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full pointer-events-none select-none bg-transparent"
      aria-hidden="true"
    >
      <canvas
        ref={webglCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none bg-transparent"
        style={{ transform: "translateZ(0)" }}
      />
      <canvas
        ref={fallbackCanvasRef}
        className="absolute inset-0 w-full h-full block pointer-events-none bg-transparent"
        style={{ display: "none", transform: "translateZ(0)" }}
      />
    </div>
  );
}

/**
 * Ultra-Low-Latency Inline Chat-Room Gemini Live Voice Mode:
 * - Connects directly from the browser via `@google/genai` `ai.live.connect(...)` using a short-lived
 *   server-minted Ephemeral Token (`/api/live-token`) — 100% Vercel compatible.
 * - ZERO `SpeechRecognition`, ZERO HTTP REST `/api/chat`, ZERO `window.speechSynthesis` fallback.
 * - Streams 16kHz Int16 PCM mic audio in 30ms packets via inline-Blob `AudioWorkletNode`.
 * - Plays 24kHz PCM AI output immediately on the very first chunk via `AudioBufferSourceNode` queue
 *   with instant barge-in (`serverContent.interrupted` -> immediate `.stop()` + queue clear).
 * - Streams user & AI transcripts + Google Search grounding + 0ms `PILAR AI AKTIF` asynchronously
 *   to the main chat room without ever blocking the audio thread.
 */
export function InteractiveVoiceCallOverlay({
  isOpen,
  voice,
  isMicMuted = false,
  recentChatContext,
  onLiveUserStream,
  onLiveAssistantStream,
  onLiveTurnComplete,
  onLiveWebSources,
  onCreateChatNote,
  onCreateGoogleDoc,
}: InteractiveVoiceCallOverlayProps) {
  const [liveStatus, setLiveStatus] =
    useState<LiveConnectionStatus>("connecting");
  const [selectedVoice, setSelectedVoice] = useState<LiveVoiceName>("Aoede");
  const [liveError, setLiveError] = useState<string>("");

  // Core lifecycle refs (zero stale closures in audio/WS callbacks)
  const callActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const isMicMutedRef = useRef(isMicMuted);
  const selectedVoiceRef = useRef<LiveVoiceName>(selectedVoice);
  const liveStatusRef = useRef<LiveConnectionStatus>("connecting");
  const recentContextRef = useRef<string>(recentChatContext || "");

  // Latest callback refs
  const onLiveUserStreamRef = useRef(onLiveUserStream);
  const onLiveAssistantStreamRef = useRef(onLiveAssistantStream);
  const onLiveTurnCompleteRef = useRef(onLiveTurnComplete);
  const onLiveWebSourcesRef = useRef(onLiveWebSources);
  const onCreateChatNoteRef = useRef(onCreateChatNote);
  const onCreateGoogleDocRef = useRef(onCreateGoogleDoc);
  const voiceStopSpeechRef = useRef(voice?.stopSpeech);

  useEffect(() => {
    onLiveUserStreamRef.current = onLiveUserStream;
  }, [onLiveUserStream]);

  useEffect(() => {
    onLiveAssistantStreamRef.current = onLiveAssistantStream;
  }, [onLiveAssistantStream]);

  useEffect(() => {
    onLiveTurnCompleteRef.current = onLiveTurnComplete;
  }, [onLiveTurnComplete]);

  useEffect(() => {
    onLiveWebSourcesRef.current = onLiveWebSources;
  }, [onLiveWebSources]);

  useEffect(() => {
    onCreateChatNoteRef.current = onCreateChatNote;
  }, [onCreateChatNote]);

  useEffect(() => {
    onCreateGoogleDocRef.current = onCreateGoogleDoc;
  }, [onCreateGoogleDoc]);

  useEffect(() => {
    voiceStopSpeechRef.current = voice?.stopSpeech;
  }, [voice]);

  useEffect(() => {
    recentContextRef.current = recentChatContext || "";
  }, [recentChatContext]);

  useEffect(() => {
    selectedVoiceRef.current = selectedVoice;
  }, [selectedVoice]);

  // Gemini Live SDK Session & Dual AudioContext Refs
  const sessionRef = useRef<Session | null>(null);
  const sessionGenerationRef = useRef(0);
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveMicSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveMicAnalyserRef = useRef<AnalyserNode | null>(null);
  const liveOutputAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeAnalyserRef = useRef<AnalyserNode | null>(null);
  const speechPulseRef = useRef<number>(0);

  const liveWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const liveWorkletUrlRef = useRef<string | null>(null);
  const liveScriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const liveSilentGainRef = useRef<GainNode | null>(null);

  // Zero-Wait 24kHz AudioBufferSourceNode Streaming Queue Refs
  const liveScheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveNextPlayTimeRef = useRef<number>(0);
  const liveTurnCompleteRef = useRef<boolean>(true);

  // Asynchronous Transcript & Google Search Grounding Refs (never block audio)
  const userTurnIdRef = useRef<string | null>(null);
  const userTurnTextRef = useRef<string>("");
  const userTurnCommittedRef = useRef<boolean>(false);
  const userFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userLastFlushMsRef = useRef<number>(0);

  const assistantTurnIdRef = useRef<string | null>(null);
  const assistantTurnTextRef = useRef<string>("");
  const assistantFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const assistantLastFlushMsRef = useRef<number>(0);

  const turnPendingSourcesRef = useRef<WebSourceCitation[]>([]);
  const turnUsedGoogleSearchRef = useRef<boolean>(false);

  const startLiveSessionRef = useRef<() => Promise<void>>(async () => {});

  const updateLiveStatus = useCallback((next: LiveConnectionStatus) => {
    liveStatusRef.current = next;
    setLiveStatus(next);
  }, []);

  const ensureUserTurnId = useCallback((): string => {
    if (!userTurnIdRef.current) {
      userTurnIdRef.current = `live-u-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
    }
    return userTurnIdRef.current;
  }, []);

  const ensureAssistantTurnId = useCallback((): string => {
    if (!assistantTurnIdRef.current) {
      assistantTurnIdRef.current = `live-ai-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
    }
    return assistantTurnIdRef.current;
  }, []);

  const flushUserTranscriptNow = useCallback(() => {
    if (userFlushTimerRef.current) {
      clearTimeout(userFlushTimerRef.current);
      userFlushTimerRef.current = null;
    }
    const clean = userTurnTextRef.current.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const turnId = ensureUserTurnId();
    userLastFlushMsRef.current = performance.now();
    queueMicrotask(() => {
      onLiveUserStreamRef.current?.(turnId, clean);
    });
  }, [ensureUserTurnId]);

  const scheduleUserTranscriptFlush = useCallback(() => {
    const now = performance.now();
    const elapsed = now - userLastFlushMsRef.current;
    if (elapsed >= LIVE_TRANSCRIPT_THROTTLE_MS) {
      flushUserTranscriptNow();
      return;
    }
    if (!userFlushTimerRef.current) {
      const waitMs = Math.max(16, LIVE_TRANSCRIPT_THROTTLE_MS - elapsed);
      userFlushTimerRef.current = setTimeout(() => {
        userFlushTimerRef.current = null;
        flushUserTranscriptNow();
      }, waitMs);
    }
  }, [flushUserTranscriptNow]);

  const emitPendingSourcesAsync = useCallback((turnId: string) => {
    if (turnPendingSourcesRef.current.length === 0) return;
    const snapshot = [...turnPendingSourcesRef.current];
    queueMicrotask(() => {
      onLiveWebSourcesRef.current?.(turnId, snapshot);
    });
  }, []);

  const flushAssistantTranscriptNow = useCallback(() => {
    if (assistantFlushTimerRef.current) {
      clearTimeout(assistantFlushTimerRef.current);
      assistantFlushTimerRef.current = null;
    }
    const clean = assistantTurnTextRef.current.replace(/\s+/g, " ").trim();
    if (!clean) return;
    const turnId = ensureAssistantTurnId();
    assistantLastFlushMsRef.current = performance.now();
    queueMicrotask(() => {
      onLiveAssistantStreamRef.current?.(turnId, clean);
    });
    emitPendingSourcesAsync(turnId);
  }, [emitPendingSourcesAsync, ensureAssistantTurnId]);

  const scheduleAssistantTranscriptFlush = useCallback(() => {
    const now = performance.now();
    const elapsed = now - assistantLastFlushMsRef.current;
    if (elapsed >= LIVE_TRANSCRIPT_THROTTLE_MS) {
      flushAssistantTranscriptNow();
      return;
    }
    if (!assistantFlushTimerRef.current) {
      const waitMs = Math.max(16, LIVE_TRANSCRIPT_THROTTLE_MS - elapsed);
      assistantFlushTimerRef.current = setTimeout(() => {
        assistantFlushTimerRef.current = null;
        flushAssistantTranscriptNow();
      }, waitMs);
    }
  }, [flushAssistantTranscriptNow]);

  const commitUserTurnIfPending = useCallback(() => {
    if (userTurnCommittedRef.current) return;
    const clean = userTurnTextRef.current.replace(/\s+/g, " ").trim();
    if (!clean) return;
    userTurnCommittedRef.current = true;
    flushUserTranscriptNow();
  }, [flushUserTranscriptNow]);

  const finalizeCurrentTurnAsync = useCallback(() => {
    if (userFlushTimerRef.current) {
      clearTimeout(userFlushTimerRef.current);
      userFlushTimerRef.current = null;
    }
    if (assistantFlushTimerRef.current) {
      clearTimeout(assistantFlushTimerRef.current);
      assistantFlushTimerRef.current = null;
    }

    const finalUserText = userTurnTextRef.current.replace(/\s+/g, " ").trim();
    const finalUserId = finalUserText ? ensureUserTurnId() : undefined;

    const finalAiText = assistantTurnTextRef.current
      .replace(/\s+/g, " ")
      .trim();
    const finalAiId = finalAiText ? ensureAssistantTurnId() : undefined;
    const usedGoogleSearch =
      turnUsedGoogleSearchRef.current ||
      turnPendingSourcesRef.current.length > 0;
    const sourcesSnapshot = [...turnPendingSourcesRef.current];

    // Reset turn buffers immediately so next speech turn never collides
    userTurnIdRef.current = null;
    userTurnTextRef.current = "";
    userTurnCommittedRef.current = false;
    assistantTurnIdRef.current = null;
    assistantTurnTextRef.current = "";
    turnPendingSourcesRef.current = [];
    turnUsedGoogleSearchRef.current = false;

    if (!finalUserText && !finalAiText) return;

    // 100% asynchronous UI & localStorage persistence (0 ms audio impact)
    queueMicrotask(() => {
      if (finalUserId && finalUserText) {
        onLiveUserStreamRef.current?.(finalUserId, finalUserText);
      }
      if (finalAiId && finalAiText) {
        onLiveAssistantStreamRef.current?.(finalAiId, finalAiText);
      }
      if (finalAiId && sourcesSnapshot.length > 0) {
        onLiveWebSourcesRef.current?.(finalAiId, sourcesSnapshot);
      }
      const activePillars = classifyLiveVoicePillars(
        finalUserText,
        finalAiText,
        usedGoogleSearch
      );
      onLiveTurnCompleteRef.current?.({
        userTurnId: finalUserId,
        userText: finalUserText || undefined,
        assistantTurnId: finalAiId,
        assistantText: finalAiText || undefined,
        activePillars,
        usedGoogleSearch,
      });
    });
  }, [ensureAssistantTurnId, ensureUserTurnId]);

  /**
   * Instant Barge-In:
   * Immediately stops every scheduled/playing AudioBufferSourceNode, clears the queue,
   * and resets `nextPlayTime = audioContext.currentTime` with 0ms delay.
   */
  const interruptLiveAudioPlayback = useCallback(() => {
    liveScheduledSourcesRef.current.forEach((node) => {
      try {
        node.onended = null;
        node.stop();
        node.disconnect();
      } catch {
        // Node already ended
      }
    });
    liveScheduledSourcesRef.current.clear();

    const outCtx = liveOutputCtxRef.current;
    liveNextPlayTimeRef.current =
      outCtx && outCtx.state !== "closed" ? outCtx.currentTime : 0;
    liveTurnCompleteRef.current = true;

    if (liveMicAnalyserRef.current) {
      activeAnalyserRef.current = liveMicAnalyserRef.current;
    }
  }, []);

  /**
   * Zero-Wait 24kHz PCM Streaming Playback:
   * Decodes each incoming Int16 LE PCM chunk immediately and schedules it on the
   * 24kHz AudioContext timeline (`Math.max(currentTime + 0.02, nextPlayTime)`).
   */
  const enqueueLivePcmChunk = useCallback(
    (base64Pcm: string, mimeType?: string) => {
      const outCtx = liveOutputCtxRef.current;
      const outAnalyser = liveOutputAnalyserRef.current;
      if (!outCtx || !outAnalyser || !callActiveRef.current) return;

      try {
        if (outCtx.state === "suspended") {
          outCtx.resume().catch(() => {});
        }

        const float32 = base64PcmToFloat32(base64Pcm);
        if (float32.length === 0) return;

        const sampleRate = parsePcmSampleRate(mimeType, 24000);
        const audioBuffer = outCtx.createBuffer(1, float32.length, sampleRate);
        audioBuffer.copyToChannel(new Float32Array(float32), 0);

        const sourceNode = outCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(outAnalyser);

        const startAt = Math.max(
          outCtx.currentTime + LIVE_FIRST_CHUNK_LEAD_SEC,
          liveNextPlayTimeRef.current
        );
        liveNextPlayTimeRef.current = startAt + audioBuffer.duration;
        liveTurnCompleteRef.current = false;

        activeAnalyserRef.current = outAnalyser;
        if (liveStatusRef.current !== "speaking") {
          updateLiveStatus("speaking");
        }

        liveScheduledSourcesRef.current.add(sourceNode);
        sourceNode.onended = () => {
          liveScheduledSourcesRef.current.delete(sourceNode);
          if (
            liveScheduledSourcesRef.current.size === 0 &&
            liveTurnCompleteRef.current &&
            isMountedRef.current &&
            callActiveRef.current
          ) {
            liveNextPlayTimeRef.current = outCtx.currentTime;
            activeAnalyserRef.current = liveMicAnalyserRef.current;
            if (liveStatusRef.current !== "error") {
              updateLiveStatus("listening");
            }
          }
        };

        sourceNode.start(startAt);
      } catch {
        // Ignore single malformed audio frame without tearing down live stream
      }
    },
    [updateLiveStatus]
  );

  const cleanupLiveResources = useCallback(
    (options?: { keepMicAndAudioCtx?: boolean }) => {
      const keepAudio = options?.keepMicAndAudioCtx === true;

      interruptLiveAudioPlayback();
      finalizeCurrentTurnAsync();

      if (sessionRef.current) {
        const s = sessionRef.current;
        sessionRef.current = null;
        try {
          s.close();
        } catch {
          // ignore
        }
      }

      if (keepAudio) return;

      if (liveWorkletNodeRef.current) {
        try {
          liveWorkletNodeRef.current.port.onmessage = null;
          liveWorkletNodeRef.current.disconnect();
        } catch {
          // ignore
        }
        liveWorkletNodeRef.current = null;
      }

      if (liveWorkletUrlRef.current) {
        try {
          URL.revokeObjectURL(liveWorkletUrlRef.current);
        } catch {
          // ignore
        }
        liveWorkletUrlRef.current = null;
      }

      if (liveScriptNodeRef.current) {
        try {
          liveScriptNodeRef.current.onaudioprocess = null;
          liveScriptNodeRef.current.disconnect();
        } catch {
          // ignore
        }
        liveScriptNodeRef.current = null;
      }

      if (liveSilentGainRef.current) {
        try {
          liveSilentGainRef.current.disconnect();
        } catch {
          // ignore
        }
        liveSilentGainRef.current = null;
      }

      if (liveMicSourceRef.current) {
        try {
          liveMicSourceRef.current.disconnect();
        } catch {
          // ignore
        }
        liveMicSourceRef.current = null;
      }

      if (liveMicStreamRef.current) {
        try {
          liveMicStreamRef.current.getTracks().forEach((track) => track.stop());
        } catch {
          // ignore
        }
        liveMicStreamRef.current = null;
      }

      if (liveInputCtxRef.current) {
        const ctx = liveInputCtxRef.current;
        liveInputCtxRef.current = null;
        try {
          if (ctx.state !== "closed") {
            ctx.close().catch(() => {});
          }
        } catch {
          // ignore
        }
      }

      if (liveOutputCtxRef.current) {
        const ctx = liveOutputCtxRef.current;
        liveOutputCtxRef.current = null;
        try {
          if (ctx.state !== "closed") {
            ctx.close().catch(() => {});
          }
        } catch {
          // ignore
        }
      }

      liveMicAnalyserRef.current = null;
      liveOutputAnalyserRef.current = null;
      activeAnalyserRef.current = null;
    },
    [finalizeCurrentTurnAsync, interruptLiveAudioPlayback]
  );

  /**
   * Captures 16kHz mono PCM 16-bit audio via inline-Blob AudioWorkletNode (30ms / 480 samples)
   * and streams continuously into the active Gemini Live SDK session.
   */
  const attachMicCapturePipeline = useCallback(
    async (stream: MediaStream, generation: number) => {
      if (!callActiveRef.current || sessionGenerationRef.current !== generation) {
        return;
      }

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) {
        throw new Error("Browser tidak mendukung Web Audio API.");
      }

      let inputCtx: AudioContext;
      try {
        inputCtx = new AudioCtx({ sampleRate: 16000 });
      } catch {
        inputCtx = new AudioCtx();
      }
      liveInputCtxRef.current = inputCtx;
      if (inputCtx.state === "suspended") {
        await inputCtx.resume().catch(() => {});
      }

      const micSource = inputCtx.createMediaStreamSource(stream);
      liveMicSourceRef.current = micSource;

      const micAnalyser = inputCtx.createAnalyser();
      micAnalyser.fftSize = 256;
      micAnalyser.smoothingTimeConstant = 0.78;
      micSource.connect(micAnalyser);
      liveMicAnalyserRef.current = micAnalyser;
      if (liveStatusRef.current !== "speaking") {
        activeAnalyserRef.current = micAnalyser;
      }

      const sendPcmChunkToSession = (int16: Int16Array) => {
        const activeSession = sessionRef.current;
        if (
          !activeSession ||
          !callActiveRef.current ||
          sessionGenerationRef.current !== generation ||
          isMicMutedRef.current ||
          int16.length === 0
        ) {
          return;
        }
        const base64Audio = int16PcmToBase64(int16);
        try {
          activeSession.sendRealtimeInput({
            audio: {
              data: base64Audio,
              mimeType: "audio/pcm;rate=16000",
            },
          });
        } catch {
          // Ignore if session closed mid-frame
        }
      };

      let workletAttached = false;
      if (
        typeof AudioWorkletNode !== "undefined" &&
        inputCtx.audioWorklet &&
        typeof inputCtx.audioWorklet.addModule === "function"
      ) {
        try {
          const blob = new Blob([PCM_CAPTURE_WORKLET_CODE], {
            type: "application/javascript",
          });
          const workletUrl = URL.createObjectURL(blob);
          liveWorkletUrlRef.current = workletUrl;
          await inputCtx.audioWorklet.addModule(workletUrl);

          if (
            !callActiveRef.current ||
            sessionGenerationRef.current !== generation ||
            inputCtx.state === "closed"
          ) {
            try {
              URL.revokeObjectURL(workletUrl);
            } catch {
              // ignore
            }
            if (liveWorkletUrlRef.current === workletUrl) {
              liveWorkletUrlRef.current = null;
            }
            return;
          }

          const workletNode = new AudioWorkletNode(
            inputCtx,
            "formylab-live-pcm-capture"
          );
          liveWorkletNodeRef.current = workletNode;
          workletNode.port.onmessage = (event: MessageEvent) => {
            if (event.data instanceof Int16Array) {
              sendPcmChunkToSession(event.data);
            }
          };

          const silentGain = inputCtx.createGain();
          silentGain.gain.value = 0;
          liveSilentGainRef.current = silentGain;

          micSource.connect(workletNode);
          workletNode.connect(silentGain);
          silentGain.connect(inputCtx.destination);
          workletAttached = true;
        } catch {
          if (liveWorkletUrlRef.current) {
            try {
              URL.revokeObjectURL(liveWorkletUrlRef.current);
            } catch {
              // ignore
            }
            liveWorkletUrlRef.current = null;
          }
        }
      }

      // Legacy fallback only when browser lacks AudioWorkletNode (still streams pure 16kHz PCM to Live API)
      if (!workletAttached && typeof inputCtx.createScriptProcessor === "function") {
        const scriptNode = inputCtx.createScriptProcessor(512, 1, 1);
        liveScriptNodeRef.current = scriptNode;

        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;
        liveSilentGainRef.current = silentGain;

        scriptNode.onaudioprocess = (ev: AudioProcessingEvent) => {
          const ch0 = ev.inputBuffer.getChannelData(0);
          if (ch0 && ch0.length > 0) {
            const int16 = downsampleFloat32ToInt16Pcm(
              new Float32Array(ch0),
              inputCtx.sampleRate,
              16000
            );
            sendPcmChunkToSession(int16);
          }
        };

        micSource.connect(scriptNode);
        scriptNode.connect(silentGain);
        silentGain.connect(inputCtx.destination);
      }
    },
    []
  );

  const startLiveVoiceSession = useCallback(async () => {
    const generation = ++sessionGenerationRef.current;
    cleanupLiveResources();
    voiceStopSpeechRef.current?.();

    if (!isMountedRef.current || !callActiveRef.current || !isOpen) return;

    setLiveError("");
    updateLiveStatus("connecting");

    // 1. Acquire microphone with hardware echo cancellation, noise suppression, auto gain
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setLiveError(
        "Browser tidak mengizinkan akses mikrofon (butuh HTTPS / tab penuh)."
      );
      updateLiveStatus("error");
      return;
    }

    let micStream: MediaStream;
    try {
      micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err: unknown) {
      if (isMicPermissionDenied(err)) {
        setLiveError(formatLiveConnectionError("NotAllowedError"));
      } else {
        setLiveError(formatLiveConnectionError("NotFoundError"));
      }
      updateLiveStatus("error");
      return;
    }

    if (
      !isMountedRef.current ||
      !callActiveRef.current ||
      !isOpen ||
      sessionGenerationRef.current !== generation
    ) {
      micStream.getTracks().forEach((t) => t.stop());
      return;
    }

    liveMicStreamRef.current = micStream;
    micStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMutedRef.current;
    });

    // 2. Prepare dedicated 24kHz Output AudioContext + AnalyserNode for zero-wait playback
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      cleanupLiveResources();
      setLiveError("Browser tidak mendukung Web Audio API untuk audio Live 24kHz.");
      updateLiveStatus("error");
      return;
    }

    let outCtx: AudioContext;
    try {
      outCtx = new AudioCtx({ sampleRate: 24000 });
    } catch {
      outCtx = new AudioCtx();
    }
    liveOutputCtxRef.current = outCtx;
    if (outCtx.state === "suspended") {
      await outCtx.resume().catch(() => {});
    }

    const outAnalyser = outCtx.createAnalyser();
    outAnalyser.fftSize = 256;
    outAnalyser.smoothingTimeConstant = 0.78;
    outAnalyser.connect(outCtx.destination);
    liveOutputAnalyserRef.current = outAnalyser;
    liveNextPlayTimeRef.current = outCtx.currentTime;
    liveTurnCompleteRef.current = true;

    // 3. Attach 16kHz AudioWorklet mic pipeline so AnalyserNode & PCM packets are ready immediately
    try {
      await attachMicCapturePipeline(micStream, generation);
    } catch (err: unknown) {
      cleanupLiveResources();
      setLiveError(
        formatLiveConnectionError(
          err instanceof Error ? err.message : String(err)
        )
      );
      updateLiveStatus("error");
      return;
    }

    if (
      !isMountedRef.current ||
      !callActiveRef.current ||
      !isOpen ||
      sessionGenerationRef.current !== generation
    ) {
      return;
    }

    // 4. Request Ephemeral Token from `/api/live-token` & open direct browser `ai.live.connect(...)`
    const fetchLiveToken = async (opts?: {
      excludeModels?: string[];
      searchOnlyTools?: boolean;
      disableThinkingConfig?: boolean;
      disableCustomVad?: boolean;
    }): Promise<LiveTokenApiResponse> => {
      const res = await fetch("/api/live-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceName: selectedVoiceRef.current,
          recentContext: recentContextRef.current,
          ...(opts?.excludeModels && opts.excludeModels.length > 0
            ? { excludeModels: opts.excludeModels }
            : {}),
          ...(opts?.searchOnlyTools ? { searchOnlyTools: true } : {}),
          ...(opts?.disableThinkingConfig ? { disableThinkingConfig: true } : {}),
          ...(opts?.disableCustomVad ? { disableCustomVad: true } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as LiveTokenApiResponse;
      if (!res.ok || !data.success || !data.token || !data.model) {
        return {
          success: false,
          error:
            data.error ||
            `Gagal mengambil token sesi Live (HTTP ${res.status}).`,
        };
      }
      return data;
    };

    const excludedModels: string[] = getRecentlyFailedLiveModels();
    let lastErrorReason = "";
    let lastCloseCode: number | undefined = undefined;
    let searchOnlyTools = false;
    let disableThinkingConfig = false;
    let disableCustomVad = false;

    const MAX_LIVE_ATTEMPTS = 5;

    for (let attempt = 0; attempt < MAX_LIVE_ATTEMPTS; attempt++) {
      if (
        !isMountedRef.current ||
        !callActiveRef.current ||
        !isOpen ||
        sessionGenerationRef.current !== generation
      ) {
        return;
      }

      let tokenCfg: LiveTokenApiResponse;
      try {
        tokenCfg = await fetchLiveToken({
          excludeModels: excludedModels,
          searchOnlyTools,
          disableThinkingConfig,
          disableCustomVad,
        });
      } catch (err: unknown) {
        lastErrorReason = err instanceof Error ? err.message : String(err);
        break;
      }

      if (!tokenCfg.success || !tokenCfg.token || !tokenCfg.model) {
        lastErrorReason =
          tokenCfg.error || "Token Gemini Live tidak tersedia dari server.";
        // If all cached excluded models ran out, retry once with empty exclusions
        if (excludedModels.length > 0 && attempt === 0) {
          excludedModels.length = 0;
          recentlyFailedLiveModels.clear();
          continue;
        }
        break;
      }

      const liveConfig: LiveConnectConfig = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: tokenCfg.voiceName || selectedVoiceRef.current,
            },
          },
        },
        ...(tokenCfg.systemInstruction
          ? { systemInstruction: tokenCfg.systemInstruction }
          : {}),
        ...(Array.isArray(tokenCfg.tools) && tokenCfg.tools.length > 0
          ? { tools: tokenCfg.tools }
          : {}),
        ...(tokenCfg.thinkingConfig
          ? { thinkingConfig: tokenCfg.thinkingConfig }
          : {}),
        ...(tokenCfg.realtimeInputConfig
          ? { realtimeInputConfig: tokenCfg.realtimeInputConfig }
          : {}),
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      };

      const ai = new GoogleGenAI({
        apiKey: tokenCfg.token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      let connectedSession: Session | null = null;
      let unexpectedCloseCode: number | undefined = undefined;
      let unexpectedCloseReason = "";

      try {
        connectedSession = await ai.live.connect({
          model: tokenCfg.model,
          config: liveConfig,
          callbacks: {
            onopen: () => {
              // WebSocket opened; setupComplete resolves ai.live.connect()
            },
            onmessage: (message: LiveServerMessage) => {
              if (
                !callActiveRef.current ||
                sessionGenerationRef.current !== generation
              ) {
                return;
              }

              // 1. Handle real-time tool calls (`create_chat_note`, `create_google_doc`)
              const functionCalls = message.toolCall?.functionCalls;
              if (Array.isArray(functionCalls) && functionCalls.length > 0) {
                commitUserTurnIfPending();
                const functionResponses: Array<{
                  id: string;
                  name: string;
                  response: Record<string, unknown>;
                }> = [];

                for (const call of functionCalls) {
                  const callId = call.id || `tool-${Date.now()}`;
                  const callName = call.name || "unknown";
                  if (callName === "create_chat_note") {
                    const normalized = normalizeChatNoteArtifact(call.args);
                    if (normalized) {
                      queueMicrotask(() => {
                        onCreateChatNoteRef.current?.(normalized);
                      });
                      functionResponses.push({
                        id: callId,
                        name: callName,
                        response: {
                          status: "success",
                          title: normalized.title,
                          message: "Catatan sudah ditampilkan di room chat.",
                        },
                      });
                    } else {
                      functionResponses.push({
                        id: callId,
                        name: callName,
                        response: { status: "error", message: "Catatan kosong." },
                      });
                    }
                  } else if (callName === "create_google_doc") {
                    const normalized = normalizeGoogleDocArtifact(call.args);
                    if (normalized) {
                      queueMicrotask(() => {
                        onCreateGoogleDocRef.current?.(normalized);
                      });
                      functionResponses.push({
                        id: callId,
                        name: callName,
                        response: {
                          status: "success",
                          title: normalized.title,
                          message:
                            "Dokumen Google Docs sudah siap di room chat.",
                        },
                      });
                    } else {
                      functionResponses.push({
                        id: callId,
                        name: callName,
                        response: { status: "error", message: "Dokumen kosong." },
                      });
                    }
                  } else {
                    functionResponses.push({
                      id: callId,
                      name: callName,
                      response: {
                        status: "error",
                        message: `Tool ${callName} tidak tersedia.`,
                      },
                    });
                  }
                }

                if (sessionRef.current && functionResponses.length > 0) {
                  try {
                    sessionRef.current.sendToolResponse({ functionResponses });
                  } catch {
                    // ignore send error on closing session
                  }
                }
                return;
              }

              const content = message.serverContent;
              if (!content) return;

              // 2. Google Search grounding metadata (non-blocking)
              if (content.groundingMetadata) {
                if (hasGoogleSearchGrounding(content.groundingMetadata)) {
                  turnUsedGoogleSearchRef.current = true;
                  if (liveStatusRef.current === "listening") {
                    updateLiveStatus("searching");
                  }
                }
                const sources = extractWebSourcesFromGroundingMetadata(
                  content.groundingMetadata,
                  6
                );
                if (sources.length > 0) {
                  turnPendingSourcesRef.current = mergeUniqueWebSources(
                    turnPendingSourcesRef.current,
                    sources
                  );
                  if (assistantTurnIdRef.current) {
                    emitPendingSourcesAsync(assistantTurnIdRef.current);
                  }
                }
              }

              // 3. Instant server-side Barge-In: user spoke over AI -> stop all active nodes immediately
              if (content.interrupted) {
                interruptLiveAudioPlayback();
                finalizeCurrentTurnAsync();
                updateLiveStatus("listening");
                return;
              }

              // 4. Streaming User Speech Transcription -> async update right-side bubble
              if (content.inputTranscription?.text) {
                if (liveStatusRef.current === "speaking") {
                  interruptLiveAudioPlayback();
                  finalizeCurrentTurnAsync();
                  updateLiveStatus("listening");
                }
                if (userTurnCommittedRef.current) {
                  userTurnCommittedRef.current = false;
                  userTurnIdRef.current = null;
                  userTurnTextRef.current = "";
                }
                userTurnTextRef.current += content.inputTranscription.text;
                speechPulseRef.current = 0.6;
                scheduleUserTranscriptFlush();
              }

              // 5. Streaming AI Speech Transcription -> async update left-side bubble (`Auto · Suara`)
              if (content.outputTranscription?.text) {
                commitUserTurnIfPending();
                assistantTurnTextRef.current += content.outputTranscription.text;
                ensureAssistantTurnId();
                scheduleAssistantTranscriptFlush();
              }

              // 6. Zero-Wait 24kHz PCM Output Playback (plays on chunk #1, never waits for turnComplete)
              const parts = content.modelTurn?.parts;
              if (Array.isArray(parts)) {
                let receivedAudio = false;
                for (const part of parts) {
                  if (part.inlineData?.data) {
                    receivedAudio = true;
                    enqueueLivePcmChunk(
                      part.inlineData.data,
                      part.inlineData.mimeType
                    );
                  }
                }
                if (receivedAudio) {
                  commitUserTurnIfPending();
                }
              }

              // 7. Turn Complete -> finalize room chat + 0ms PILAR AI AKTIF + Google Search badge + localStorage
              if (content.turnComplete) {
                liveTurnCompleteRef.current = true;
                finalizeCurrentTurnAsync();
                if (liveScheduledSourcesRef.current.size === 0) {
                  const ctx = liveOutputCtxRef.current;
                  liveNextPlayTimeRef.current =
                    ctx && ctx.state !== "closed" ? ctx.currentTime : 0;
                  activeAnalyserRef.current = liveMicAnalyserRef.current;
                  updateLiveStatus("listening");
                }
              }
            },
            onerror: (errEvent: ErrorEvent) => {
              unexpectedCloseReason =
                errEvent?.message || "WebSocket error pada sesi Live.";
            },
            onclose: (closeEvent: CloseEvent) => {
              unexpectedCloseCode = closeEvent?.code;
              unexpectedCloseReason = closeEvent?.reason || "";

              // If session was already live and closed unexpectedly, show clear visible error (NO silent fallback)
              if (
                callActiveRef.current &&
                sessionGenerationRef.current === generation &&
                sessionRef.current !== null &&
                closeEvent?.code !== 1000
              ) {
                sessionRef.current = null;
                interruptLiveAudioPlayback();
                finalizeCurrentTurnAsync();
                setLiveError(
                  formatLiveConnectionError(
                    closeEvent?.reason || unexpectedCloseReason,
                    closeEvent?.code
                  )
                );
                updateLiveStatus("error");
              }
            },
          },
        });

        // Successfully connected & setupComplete received!
        if (
          !isMountedRef.current ||
          !callActiveRef.current ||
          !isOpen ||
          sessionGenerationRef.current !== generation
        ) {
          connectedSession.close();
          return;
        }

        sessionRef.current = connectedSession;
        setLiveError("");
        updateLiveStatus("listening");
        return;
      } catch (connectErr: unknown) {
        const msg =
          connectErr instanceof Error ? connectErr.message : String(connectErr);
        const codeMatch = msg.match(/code\s+(\d{4})/i);
        const parsedCode =
          unexpectedCloseCode ??
          (codeMatch ? Number.parseInt(codeMatch[1], 10) : undefined);

        lastErrorReason = unexpectedCloseReason || msg;
        lastCloseCode = parsedCode;

        const isConfigRejection =
          parsedCode === 1007 ||
          parsedCode === 1008 ||
          /invalid argument|unsupported|not supported|thinking/i.test(
            lastErrorReason
          );

        // Clean progressive parameter adjustment on SAME Live model before switching models
        if (isConfigRejection && !disableThinkingConfig && tokenCfg.thinkingConfig) {
          disableThinkingConfig = true;
          continue;
        }
        if (isConfigRejection && !disableCustomVad && tokenCfg.realtimeInputConfig) {
          disableCustomVad = true;
          continue;
        }
        if (isConfigRejection && !searchOnlyTools && tokenCfg.toolMode === "hybrid") {
          searchOnlyTools = true;
          continue;
        }

        // Otherwise exclude failed model (e.g., quota 1011 or unavailable model) and try next Live Native Audio model
        if (tokenCfg.model && !excludedModels.includes(tokenCfg.model)) {
          excludedModels.push(tokenCfg.model);
          if (parsedCode === 1011 || parsedCode === 1008) {
            recentlyFailedLiveModels.set(tokenCfg.model, Date.now());
          }
        }
        searchOnlyTools = false;
        disableThinkingConfig = false;
        disableCustomVad = false;
      }
    }

    // All Live Audio connection attempts failed -> show clear explicit error UI (ZERO silent fallback)
    if (
      isMountedRef.current &&
      callActiveRef.current &&
      sessionGenerationRef.current === generation
    ) {
      cleanupLiveResources({ keepMicAndAudioCtx: true });
      setLiveError(formatLiveConnectionError(lastErrorReason, lastCloseCode));
      updateLiveStatus("error");
    }
  }, [
    attachMicCapturePipeline,
    cleanupLiveResources,
    commitUserTurnIfPending,
    emitPendingSourcesAsync,
    enqueueLivePcmChunk,
    ensureAssistantTurnId,
    finalizeCurrentTurnAsync,
    interruptLiveAudioPlayback,
    isOpen,
    scheduleAssistantTranscriptFlush,
    scheduleUserTranscriptFlush,
    updateLiveStatus,
  ]);

  useEffect(() => {
    startLiveSessionRef.current = startLiveVoiceSession;
  }, [startLiveVoiceSession]);

  // Synchronize controlled mute state from ChatComposerBar
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
    if (liveMicStreamRef.current) {
      liveMicStreamRef.current.getAudioTracks().forEach((track) => {
        track.enabled = !isMicMuted;
      });
    }
  }, [isMicMuted]);

  // Open / close lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    callActiveRef.current = isOpen;

    if (!isOpen) {
      sessionGenerationRef.current += 1;
      queueMicrotask(() => {
        setLiveError("");
        cleanupLiveResources();
      });
      return;
    }

    const bootTimer = setTimeout(() => {
      if (!isMountedRef.current || !callActiveRef.current) return;
      void startLiveSessionRef.current();
    }, 20);

    return () => {
      isMountedRef.current = false;
      callActiveRef.current = false;
      sessionGenerationRef.current += 1;
      clearTimeout(bootTimer);
      cleanupLiveResources();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVoiceChange = (nextVoice: LiveVoiceName) => {
    if (nextVoice === selectedVoice) return;
    selectedVoiceRef.current = nextVoice;
    setSelectedVoice(nextVoice);
    if (callActiveRef.current) {
      void startLiveSessionRef.current();
    }
  };

  const handleOrbInteract = () => {
    if (liveStatus === "error") {
      void startLiveSessionRef.current();
      return;
    }
    if (liveOutputCtxRef.current?.state === "suspended") {
      liveOutputCtxRef.current.resume().catch(() => {});
    }
    if (liveInputCtxRef.current?.state === "suspended") {
      liveInputCtxRef.current.resume().catch(() => {});
    }
    // Manual barge-in when tapping orb while AI is speaking
    if (liveStatus === "speaking") {
      interruptLiveAudioPlayback();
      finalizeCurrentTurnAsync();
      updateLiveStatus("listening");
    }
  };

  const orbPhase: LivingOrbPhase =
    liveStatus === "speaking"
      ? "speaking"
      : liveStatus === "connecting" || liveStatus === "searching"
        ? "thinking"
        : "listening";

  const statusText = isMicMuted
    ? "Live · Mikrofon Dibisukan"
    : LIVE_STATUS_LABELS[liveStatus];

  const orbAriaLabel =
    liveStatus === "error"
      ? "Koneksi Live terputus, ketuk untuk menghubungkan ulang"
      : isMicMuted
        ? "Mikrofon dibisukan"
        : liveStatus === "speaking"
          ? "AI sedang berbicara, ketuk Orb untuk menyela"
          : liveStatus === "searching"
            ? "AI sedang mencari di Google"
            : liveStatus === "connecting"
              ? "Menghubungkan ke Gemini Live Audio"
              : "Live aktif dan mendengarkan suara Anda";

  return (
    <div
      className="pointer-events-none flex flex-col items-center justify-center gap-1.5 select-none"
      role="region"
      aria-label="Mode Suara Gemini Live Formylab"
      data-live-status={liveStatus}
    >
      {/* Compact Frameless Audio-Reactive 3D Particle Sphere floating above composer */}
      <button
        type="button"
        onClick={handleOrbInteract}
        aria-label={orbAriaLabel}
        title={orbAriaLabel}
        className={`pointer-events-auto relative w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-pointer outline-none bg-transparent border-0 p-0 focus-visible:ring-2 focus-visible:ring-[#0E807E]/60 transition-all duration-300 active:scale-[0.95] ${
          isMicMuted || liveStatus === "error" ? "opacity-55" : "opacity-100"
        }`}
      >
        <LivingVoiceOrb
          phase={orbPhase}
          analyserRef={activeAnalyserRef}
          speechPulseRef={speechPulseRef}
        />
      </button>

      {/* Compact Live Connection Status Indicator + Voice Switcher (Aoede / Zephyr) */}
      <div className="pointer-events-auto flex items-center gap-1.5 flex-wrap justify-center">
        <div
          role="status"
          aria-live="polite"
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium backdrop-blur-md border transition-colors ${
            liveStatus === "error"
              ? "bg-[#fef2f2]/95 text-[#b91c1c] border-[#b91c1c]/25"
              : liveStatus === "searching"
                ? "bg-[#eff6ff]/95 text-[#0369a1] border-[#0369a1]/25"
                : "bg-white/90 text-[#0B2B26] border-[#0B2B26]/12"
          }`}
        >
          {liveStatus === "connecting" ? (
            <Loader2
              className="w-3 h-3 text-[#0E807E] animate-spin shrink-0"
              aria-hidden="true"
            />
          ) : liveStatus === "searching" ? (
            <Globe
              className="w-3 h-3 text-[#0369a1] animate-pulse shrink-0"
              aria-hidden="true"
            />
          ) : liveStatus === "error" ? (
            <AlertCircle
              className="w-3 h-3 text-[#b91c1c] shrink-0"
              aria-hidden="true"
            />
          ) : (
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isMicMuted
                  ? "bg-slate-400"
                  : liveStatus === "speaking"
                    ? "bg-[#0E807E] animate-pulse"
                    : "bg-[#10B981] animate-pulse"
              }`}
              aria-hidden="true"
            />
          )}
          <span className="whitespace-nowrap">{statusText}</span>
        </div>

        {/* Minimal Voice Switcher (Aoede / Zephyr) */}
        <div
          className="inline-flex items-center rounded-full bg-white/88 backdrop-blur-md border border-[#0B2B26]/12 p-0.5"
          role="group"
          aria-label="Pilih suara AI Live"
        >
          {LIVE_VOICE_OPTIONS.map((opt) => {
            const active = selectedVoice === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handleVoiceChange(opt.id)}
                title={`${opt.label} — ${opt.hint}`}
                aria-pressed={active}
                className={`px-2 py-0.5 rounded-full text-[10.5px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  active
                    ? "bg-[#0E807E] text-white"
                    : "text-[#2E524C] hover:text-[#0B2B26]"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explicit Visible Error Banner (NEVER silently falls back to robotic TTS or REST) */}
      {liveError && (
        <div
          role="alert"
          className="pointer-events-auto mt-0.5 flex items-center gap-2 max-w-md px-3 py-1.5 rounded-xl bg-[#fef2f2]/95 border border-[#b91c1c]/25 text-[#991b1b] text-[11px] leading-snug backdrop-blur-md"
        >
          <span className="flex-1">{liveError}</span>
          <button
            type="button"
            onClick={() => void startLiveSessionRef.current()}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#b91c1c] hover:bg-[#991b1b] text-white text-[10.5px] font-medium whitespace-nowrap cursor-pointer transition-colors shrink-0"
          >
            <RefreshCw className="w-3 h-3" aria-hidden="true" />
            <span>Coba Lagi</span>
          </button>
        </div>
      )}
    </div>
  );
}
