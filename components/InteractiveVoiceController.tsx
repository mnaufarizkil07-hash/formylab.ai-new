"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, Square, Play, Pause } from "lucide-react";
import { cleanMarkdownForSpeech } from "../lib/interactiveAiEngine";
import {
  ChatNoteArtifact,
  GoogleDocArtifact,
  WebSourceCitation,
  extractWebSourcesFromGroundingMetadata,
  mergeUniqueWebSources,
  normalizeChatNoteArtifact,
  normalizeGoogleDocArtifact,
  normalizeWebSourceCitation,
} from "./chatNoteUtils";

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
  voice: VoiceSynthesisState;
  isMicMuted?: boolean;
  recentChatContext?: string;
  onSendSpokenPrompt: (
    spokenText: string
  ) => Promise<string | null | VoiceCallTurnPayload>;
  onSendSpokenAudio?: (audio: {
    base64: string;
    mimeType: string;
  }) => Promise<VoiceCallTurnPayload>;
  onLiveUserTurn?: (text: string) => void;
  onLiveAssistantStream?: (turnId: string, text: string) => void;
  onLiveWebSources?: (turnId: string, sources: WebSourceCitation[]) => void;
  onCreateChatNote?: (note: ChatNoteArtifact) => void;
  onCreateGoogleDoc?: (doc: GoogleDocArtifact) => void;
}

interface LiveSessionConfigResponse {
  success?: boolean;
  fallbackMode?: boolean;
  token?: string;
  model?: string;
  voiceName?: string;
  systemInstruction?: string;
  tools?: unknown[];
  wsUrl?: string;
  reason?: string;
}

const LIVE_TRANSCRIPT_THROTTLE_MS = 120;
const LIVE_FALLBACK_LOOKAHEAD_SEC = 0.16;

/**
 * Off-main-thread 16kHz Int16 PCM Mic Capture AudioWorklet:
 * Downsamples hardware microphone input (e.g., 48kHz -> 16kHz) inside the AudioWorklet thread
 * and emits stable ~90ms packets (1440 samples @ 16kHz) so WebSocket traffic stays smooth.
 */
const PCM_CAPTURE_WORKLET_CODE = `
class FormylabPcmCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._targetRate = 16000;
    this._ratio = Math.max(0.25, sampleRate / this._targetRate);
    this._packetSamples = 1440; // 90ms @ 16kHz (within 80ms-100ms ideal window)
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
registerProcessor("formylab-pcm-capture-processor", FormylabPcmCaptureProcessor);
`;

/**
 * Ultra-Smooth 24kHz Ring Buffer Playback AudioWorklet:
 * - 10-second circular Float32 ring buffer (eliminates micro-gaps between chunks)
 * - Adaptive ~180ms jitter pre-buffer on new AI turn (absorbs network jitter cleanly)
 * - 5ms micro cross-fade / soft ramp on start, underrun, and barge-in clear (zero clicks/pops)
 */
const PCM_PLAYBACK_WORKLET_CODE = `
class FormylabPcmRingPlayerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._capacity = Math.max(24000 * 10, Math.ceil(sampleRate * 10));
    this._buffer = new Float32Array(this._capacity);
    this._readIdx = 0;
    this._writeIdx = 0;
    this._available = 0;

    this._prebufferSamples = Math.round(sampleRate * 0.18); // 180ms adaptive jitter pre-buffer
    this._rebufferSamples = Math.round(sampleRate * 0.14);  // 140ms recovery pre-buffer
    this._fadeSamples = Math.max(16, Math.round(sampleRate * 0.005)); // 5ms soft ramp

    this._isPlaying = false;
    this._turnComplete = true;
    this._fadeInRemaining = 0;
    this._fadeOutRemaining = 0;
    this._clearAfterFadeOut = false;
    this._lastSample = 0;

    this.port.onmessage = (event) => {
      const msg = event.data;
      if (!msg || typeof msg !== "object") return;

      if (msg.type === "clear") {
        // Trigger 5ms soft ramp-out before flushing ring buffer to prevent speaker click/pop
        if (this._isPlaying && this._available > 0) {
          this._fadeOutRemaining = this._fadeSamples;
          this._clearAfterFadeOut = true;
        } else {
          this._resetBuffer();
        }
        return;
      }

      if (msg.type === "turnComplete") {
        this._turnComplete = true;
        // Release short utterances (< 180ms) immediately when server finishes turn
        if (!this._isPlaying && this._available > 0 && !this._clearAfterFadeOut) {
          this._isPlaying = true;
          this._fadeInRemaining = this._fadeSamples;
        } else if (!this._isPlaying && this._available === 0) {
          this.port.postMessage({ type: "drained" });
        }
        return;
      }

      if (msg.type === "push" && msg.samples instanceof Float32Array) {
        const chunk = msg.samples;
        if (chunk.length === 0) return;

        // If a previous clear fade was finishing, finish clearing cleanly for the new turn
        if (this._clearAfterFadeOut) {
          this._resetBuffer();
        }
        this._turnComplete = false;

        // Prevent overflow: if incoming exceeds free space, advance read pointer cleanly
        if (chunk.length > this._capacity - this._available) {
          const drop = chunk.length - (this._capacity - this._available);
          this._readIdx = (this._readIdx + drop) % this._capacity;
          this._available = Math.max(0, this._available - drop);
        }

        const firstPart = Math.min(chunk.length, this._capacity - this._writeIdx);
        this._buffer.set(chunk.subarray(0, firstPart), this._writeIdx);
        const remaining = chunk.length - firstPart;
        if (remaining > 0) {
          this._buffer.set(chunk.subarray(firstPart), 0);
        }
        this._writeIdx = (this._writeIdx + chunk.length) % this._capacity;
        this._available += chunk.length;

        if (!this._isPlaying && this._available >= this._prebufferSamples) {
          this._isPlaying = true;
          this._fadeInRemaining = this._fadeSamples;
        }
      }
    };
  }

  _resetBuffer() {
    this._readIdx = 0;
    this._writeIdx = 0;
    this._available = 0;
    this._isPlaying = false;
    this._turnComplete = true;
    this._fadeInRemaining = 0;
    this._fadeOutRemaining = 0;
    this._clearAfterFadeOut = false;
    this._lastSample = 0;
  }

  process(_inputs, outputs) {
    const output = outputs[0];
    if (!output || !output[0]) return true;
    const outCh = output[0];
    const frames = outCh.length;

    if (!this._isPlaying && this._fadeOutRemaining === 0) {
      outCh.fill(0);
      return true;
    }

    for (let i = 0; i < frames; i++) {
      // Soft 5ms fade-out during barge-in or stop
      if (this._fadeOutRemaining > 0) {
        const gain = this._fadeOutRemaining / this._fadeSamples;
        let sample = this._lastSample;
        if (this._available > 0) {
          sample = this._buffer[this._readIdx];
          this._readIdx = (this._readIdx + 1) % this._capacity;
          this._available--;
        }
        outCh[i] = sample * gain;
        this._lastSample = outCh[i];
        this._fadeOutRemaining--;
        if (this._fadeOutRemaining === 0 && this._clearAfterFadeOut) {
          this._resetBuffer();
          for (let j = i + 1; j < frames; j++) outCh[j] = 0;
          break;
        }
        continue;
      }

      if (this._available > 0) {
        let sample = this._buffer[this._readIdx];
        this._readIdx = (this._readIdx + 1) % this._capacity;
        this._available--;

        // Soft 5ms fade-in on start/resume
        if (this._fadeInRemaining > 0) {
          const progress = 1 - this._fadeInRemaining / this._fadeSamples;
          sample *= progress;
          this._fadeInRemaining--;
        } else if (this._available < this._fadeSamples && this._turnComplete) {
          // Gentle tail ramp on natural end of AI turn
          sample *= this._available / this._fadeSamples;
        }

        outCh[i] = sample;
        this._lastSample = sample;
      } else {
        // Buffer emptied
        if (this._turnComplete) {
          this._isPlaying = false;
          this._lastSample = 0;
          outCh[i] = 0;
          this.port.postMessage({ type: "drained" });
          for (let j = i + 1; j < frames; j++) outCh[j] = 0;
          break;
        } else {
          // Brief network jitter underrun -> soft decay to zero & arm recovery pre-buffer
          this._lastSample *= 0.85;
          outCh[i] = Math.abs(this._lastSample) > 1e-4 ? this._lastSample : 0;
          if (i === frames - 1) {
            this._isPlaying = false;
            this._prebufferSamples = this._rebufferSamples;
            this._lastSample = 0;
          }
        }
      }
    }

    // Mirror mono to any additional output channels
    for (let chIdx = 1; chIdx < output.length; chIdx++) {
      output[chIdx].set(outCh);
    }

    return true;
  }
}
registerProcessor("formylab-pcm-ring-player", FormylabPcmRingPlayerProcessor);
`;

function resampleFloat32Linear(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (!input.length || fromRate === toRate || fromRate <= 0 || toRate <= 0) {
    return input;
  }
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  for (let i = 0; i < outLen; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcPos - idx0;
    out[i] = input[idx0] + (input[idx1] - input[idx0]) * frac;
  }
  return out;
}

function downsampleFloat32ToInt16Pcm(
  input: Float32Array,
  inputSampleRate: number,
  targetSampleRate = 16000
): Int16Array {
  if (!input || input.length === 0) return new Int16Array(0);
  if (inputSampleRate === targetSampleRate || inputSampleRate <= 0) {
    const out = new Int16Array(input.length);
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
    }
    return out;
  }

  const ratio = inputSampleRate / targetSampleRate;
  const outputLength = Math.max(1, Math.floor(input.length / ratio));
  const out = new Int16Array(outputLength);
  for (let i = 0; i < outputLength; i++) {
    const srcPos = i * ratio;
    const idx0 = Math.floor(srcPos);
    const idx1 = Math.min(idx0 + 1, input.length - 1);
    const frac = srcPos - idx0;
    const sample = input[idx0] * (1 - frac) + input[idx1] * frac;
    const clamped = Math.max(-1, Math.min(1, sample));
    out[i] =
      clamped < 0
        ? Math.round(clamped * 0x8000)
        : Math.round(clamped * 0x7fff);
  }
  return out;
}

function int16PcmToBase64(pcm: Int16Array): string {
  const bytes = new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...sub);
  }
  return window.btoa(binary);
}

function base64PcmToFloat32(base64: string): Float32Array {
  const clean = stripVoiceDataUrlPrefix(base64);
  const binary = window.atob(clean);
  const byteLen = binary.length;
  const bytes = new Uint8Array(byteLen);
  for (let i = 0; i < byteLen; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const sampleCount = Math.floor(byteLen / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const float32 = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

function parsePcmRateFromMime(
  mimeType?: string,
  fallbackRate = 24000
): number {
  if (!mimeType) return fallbackRate;
  const match = mimeType.match(/rate=(\d{4,6})/i);
  if (match) {
    const parsed = Number(match[1]);
    if (Number.isFinite(parsed) && parsed >= 8000 && parsed <= 96000) {
      return parsed;
    }
  }
  return fallbackRate;
}

const PREFERRED_VOICE_CALL_MIMES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function detectVoiceCallAudioMime(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const mime of PREFERRED_VOICE_CALL_MIMES) {
    try {
      if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported(mime)
      ) {
        return mime;
      }
    } catch {
      // ignore
    }
  }
  return "";
}

function stripVoiceDataUrlPrefix(dataUrl: string): string {
  const idx = dataUrl.indexOf(",");
  if (dataUrl.startsWith("data:") && idx !== -1) {
    return dataUrl.slice(idx + 1).trim();
  }
  return dataUrl.replace(/^data:[^;]+;base64,/i, "").trim();
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const clean = stripVoiceDataUrlPrefix(base64);
  const binaryString = window.atob(clean);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

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
 * Inline Chat-Room AI Voice Mode:
 * - Zero full-screen blank overlay, zero modal cards, zero "Ekstrak Chat" button
 * - Floats a compact audio-reactive 3D Particle Sphere directly above the composer bar
 * - Streams every user & AI spoken turn live into the chat room + executes real `create_chat_note` tool calls
 */
export function InteractiveVoiceCallOverlay({
  isOpen,
  voice,
  isMicMuted = false,
  recentChatContext,
  onSendSpokenPrompt,
  onSendSpokenAudio,
  onLiveUserTurn,
  onLiveAssistantStream,
  onLiveWebSources,
  onCreateChatNote,
  onCreateGoogleDoc,
}: InteractiveVoiceCallOverlayProps) {
  const [phase, setPhase] = useState<LivingOrbPhase>("listening");
  const [micPermissionError, setMicPermissionError] = useState<string>("");

  // Core lifecycle & synchronization refs
  const callActiveRef = useRef(false);
  const isMountedRef = useRef(true);
  const isMicMutedRef = useRef(isMicMuted);
  const phaseRef = useRef<LivingOrbPhase>("listening");
  const isSubmittingTurnRef = useRef(false);
  const isFallbackAudioModeRef = useRef(false);
  const webSpeechSilentExitCountRef = useRef(0);
  const latestSpokenTextRef = useRef("");
  const recentContextRef = useRef<string>(recentChatContext || "");

  // Latest callback refs to avoid stale closures or re-creating WebSocket listeners
  const onLiveUserTurnRef = useRef(onLiveUserTurn);
  const onLiveAssistantStreamRef = useRef(onLiveAssistantStream);
  const onLiveWebSourcesRef = useRef(onLiveWebSources);
  const onCreateChatNoteRef = useRef(onCreateChatNote);
  const onCreateGoogleDocRef = useRef(onCreateGoogleDoc);

  useEffect(() => {
    onLiveUserTurnRef.current = onLiveUserTurn;
  }, [onLiveUserTurn]);

  useEffect(() => {
    onLiveAssistantStreamRef.current = onLiveAssistantStream;
  }, [onLiveAssistantStream]);

  useEffect(() => {
    onLiveWebSourcesRef.current = onLiveWebSources;
  }, [onLiveWebSources]);

  useEffect(() => {
    onCreateChatNoteRef.current = onCreateChatNote;
  }, [onCreateChatNote]);

  useEffect(() => {
    onCreateGoogleDocRef.current = onCreateGoogleDoc;
  }, [onCreateGoogleDoc]);

  // Gemini Live API Real-Time WebSocket & Dual-Clock AudioWorklet PCM Engine Refs
  const isLiveModeRef = useRef(false);
  const liveSetupReadyRef = useRef(false);
  const liveWsRef = useRef<WebSocket | null>(null);
  const liveConnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const liveInputCtxRef = useRef<AudioContext | null>(null);
  const liveOutputCtxRef = useRef<AudioContext | null>(null);
  const liveMicStreamRef = useRef<MediaStream | null>(null);
  const liveMicSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const liveMicAnalyserRef = useRef<AnalyserNode | null>(null);
  const liveOutputAnalyserRef = useRef<AnalyserNode | null>(null);
  const liveWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const liveWorkletUrlRef = useRef<string | null>(null);
  const livePlaybackWorkletNodeRef = useRef<AudioWorkletNode | null>(null);
  const livePlaybackWorkletUrlRef = useRef<string | null>(null);
  const liveScriptNodeRef = useRef<ScriptProcessorNode | null>(null);
  const liveSilentGainRef = useRef<GainNode | null>(null);
  const liveScheduledSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const liveNextPlayTimeRef = useRef<number>(0);
  const liveTurnCompleteRef = useRef<boolean>(true);
  const liveInputTurnTextRef = useRef<string>("");
  const liveOutputTurnTextRef = useRef<string>("");
  const liveAssistantTurnIdRef = useRef<string | null>(null);
  const liveUserCommittedRef = useRef<boolean>(false);
  const livePendingSourcesRef = useRef<WebSourceCitation[]>([]);
  const liveTranscriptFlushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const liveLastTranscriptFlushMsRef = useRef<number>(0);

  // SpeechRecognition + Timers (Fast-Path Fallback)
  const recognitionRef = useRef<{
    onresult: unknown;
    onerror: unknown;
    onend: unknown;
    start: () => void;
    stop: () => void;
    abort?: () => void;
  } | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Web Audio API (Playback + Analyser + Mic Visualizer + Fallback MediaRecorder)
  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeAnalyserRef = useRef<AnalyserNode | null>(null);
  const activeSourceNodeRef = useRef<AudioBufferSourceNode | null>(null);
  const fallbackHtmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const speechPulseRef = useRef<number>(0);

  const micStreamRef = useRef<MediaStream | null>(null);
  const micSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const fallbackRecorderRef = useRef<MediaRecorder | null>(null);
  const fallbackChunksRef = useRef<Blob[]>([]);
  const fallbackStartMsRef = useRef<number>(0);
  const vadRafRef = useRef<number>(0);

  // Latest handler refs to avoid stale closures
  const startListeningRef = useRef<() => void>(() => {});
  const startLiveSessionRef = useRef<() => Promise<void>>(async () => {});
  const submitSpokenTextRef = useRef<(text: string) => void>(() => {});
  const submitFallbackAudioRef = useRef<() => void>(() => {});

  useEffect(() => {
    recentContextRef.current = recentChatContext || "";
  }, [recentChatContext]);

  const updatePhase = useCallback((next: LivingOrbPhase) => {
    phaseRef.current = next;
    setPhase(next);
  }, []);

  const getOrCreateAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === "undefined") return null;
    try {
      if (
        audioCtxRef.current &&
        audioCtxRef.current.state !== "closed"
      ) {
        if (audioCtxRef.current.state === "suspended") {
          audioCtxRef.current.resume().catch(() => {});
        }
        return audioCtxRef.current;
      }
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      const ctx = new AudioCtx();
      audioCtxRef.current = ctx;
      if (ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      return ctx;
    } catch {
      return null;
    }
  }, []);

  const stopAiPlayback = useCallback(() => {
    if (activeSourceNodeRef.current) {
      try {
        activeSourceNodeRef.current.onended = null;
        activeSourceNodeRef.current.stop();
        activeSourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      activeSourceNodeRef.current = null;
    }
    if (fallbackHtmlAudioRef.current) {
      try {
        fallbackHtmlAudioRef.current.onended = null;
        fallbackHtmlAudioRef.current.onerror = null;
        fallbackHtmlAudioRef.current.pause();
        fallbackHtmlAudioRef.current.src = "";
      } catch {
        // ignore
      }
      fallbackHtmlAudioRef.current = null;
    }
    activeAnalyserRef.current = null;
    voice.stopSpeech();
  }, [voice]);

  const stopMicAndRecorder = useCallback(() => {
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = 0;
    }
    if (micSourceNodeRef.current) {
      try {
        micSourceNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      micSourceNodeRef.current = null;
    }
    if (fallbackRecorderRef.current) {
      try {
        fallbackRecorderRef.current.ondataavailable = null;
        fallbackRecorderRef.current.onstop = null;
        if (fallbackRecorderRef.current.state !== "inactive") {
          fallbackRecorderRef.current.stop();
        }
      } catch {
        // ignore
      }
      fallbackRecorderRef.current = null;
    }
    if (micStreamRef.current) {
      try {
        micStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      micStreamRef.current = null;
    }
    if (phaseRef.current !== "speaking") {
      activeAnalyserRef.current = null;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (reListenTimerRef.current) {
      clearTimeout(reListenTimerRef.current);
      reListenTimerRef.current = null;
    }
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      try {
        rec.onresult = null;
        rec.onerror = null;
        rec.onend = null;
        if (typeof rec.abort === "function") {
          rec.abort();
        } else {
          rec.stop();
        }
      } catch {
        // ignore
      }
    }
    stopMicAndRecorder();
  }, [stopMicAndRecorder]);

  const closeAudioContextCleanly = useCallback(() => {
    if (audioCtxRef.current) {
      const ctx = audioCtxRef.current;
      audioCtxRef.current = null;
      try {
        if (ctx.state !== "closed") {
          ctx.close().catch(() => {});
        }
      } catch {
        // ignore
      }
    }
  }, []);

  /**
   * Plays AI neural WAV audio through Web Audio API (AudioBufferSourceNode -> AnalyserNode -> destination)
   * so LivingVoiceOrb pulses in exact sync with the AI's voice, then automatically resumes listening after 250ms.
   */
  const playAiReplyAndRelisten = useCallback(
    async (replyText: string, replyAudio?: VoiceCallReplyAudio | null) => {
      if (!isMountedRef.current || !callActiveRef.current) return;

      // Strict anti-echo: guarantee mic & SpeechRecognition are 100% off while AI speaks
      stopListening();
      stopAiPlayback();
      updatePhase("speaking");

      const scheduleAutoRelisten = () => {
        activeSourceNodeRef.current = null;
        activeAnalyserRef.current = null;
        if (!isMountedRef.current || !callActiveRef.current) return;
        reListenTimerRef.current = setTimeout(() => {
          if (isMountedRef.current && callActiveRef.current) {
            startListeningRef.current();
          }
        }, 250);
      };

      // Primary path: Play Gemini Native Neural WAV via Web Audio API + AnalyserNode
      if (replyAudio?.base64) {
        const audioCtx = getOrCreateAudioContext();
        if (audioCtx) {
          try {
            if (audioCtx.state === "suspended") {
              await audioCtx.resume();
            }
            const arrayBuf = base64ToArrayBuffer(replyAudio.base64);
            const decodedBuffer = await audioCtx.decodeAudioData(
              arrayBuf.slice(0)
            );
            if (!isMountedRef.current || !callActiveRef.current) return;

            const sourceNode = audioCtx.createBufferSource();
            sourceNode.buffer = decodedBuffer;

            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            analyser.smoothingTimeConstant = 0.78;

            sourceNode.connect(analyser);
            analyser.connect(audioCtx.destination);

            activeSourceNodeRef.current = sourceNode;
            activeAnalyserRef.current = analyser;

            sourceNode.onended = () => {
              if (activeSourceNodeRef.current === sourceNode) {
                scheduleAutoRelisten();
              }
            };

            sourceNode.start(0);
            return;
          } catch {
            // Secondary audio path if decodeAudioData fails: direct HTML Audio playback
            try {
              const dataUrl = `data:${replyAudio.mimeType || "audio/wav"};base64,${stripVoiceDataUrlPrefix(replyAudio.base64)}`;
              const htmlAudio = new Audio(dataUrl);
              fallbackHtmlAudioRef.current = htmlAudio;
              htmlAudio.onended = () => {
                if (fallbackHtmlAudioRef.current === htmlAudio) {
                  fallbackHtmlAudioRef.current = null;
                  scheduleAutoRelisten();
                }
              };
              htmlAudio.onerror = () => {
                fallbackHtmlAudioRef.current = null;
                voice.speakMessage(
                  `voice-call-fallback-${Date.now()}`,
                  replyText,
                  scheduleAutoRelisten
                );
              };
              await htmlAudio.play();
              return;
            } catch {
              // Fall through to browser speechSynthesis fallback below
            }
          }
        }
      }

      // Fallback ONLY when replyAudio is null or unplayable
      voice.speakMessage(
        `voice-call-tts-${Date.now()}`,
        replyText,
        scheduleAutoRelisten
      );
    },
    [getOrCreateAudioContext, stopAiPlayback, stopListening, updatePhase, voice]
  );

  /**
   * Fallback MediaRecorder mode (used automatically when SpeechRecognition is unsupported/fails).
   * Streams mic into AnalyserNode for both real-time Living Orb motion and 1.1s silence VAD.
   */
  const startFallbackAudioCapture = useCallback(async () => {
    stopMicAndRecorder();
    if (!callActiveRef.current || !isOpen) return;
    if (isMicMutedRef.current) {
      updatePhase("listening");
      return;
    }

    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setMicPermissionError(
        "Izinkan akses mikrofon di browser atau buka di tab penuh, lalu ketuk Orb."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!callActiveRef.current || !isOpen) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      micStreamRef.current = stream;
      setMicPermissionError("");
      isFallbackAudioModeRef.current = true;
      updatePhase("listening");

      const mime = detectVoiceCallAudioMime();
      const recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);

      fallbackRecorderRef.current = recorder;
      fallbackChunksRef.current = [];
      fallbackStartMsRef.current = Date.now();

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          fallbackChunksRef.current.push(ev.data);
        }
      };

      recorder.start(250);

      // Connect mic stream to Web Audio AnalyserNode for Orb animation + ~1.1s auto-turn VAD
      const audioCtx = getOrCreateAudioContext();
      if (audioCtx) {
        try {
          const source = audioCtx.createMediaStreamSource(stream);
          const analyser = audioCtx.createAnalyser();
          analyser.fftSize = 256;
          analyser.smoothingTimeConstant = 0.78;
          source.connect(analyser);

          micSourceNodeRef.current = source;
          activeAnalyserRef.current = analyser;

          const dataArr = new Uint8Array(analyser.frequencyBinCount);
          let hasDetectedVoice = false;
          let lastVoiceMs = Date.now();

          const monitorVad = () => {
            if (
              !callActiveRef.current ||
              !fallbackRecorderRef.current ||
              fallbackRecorderRef.current.state !== "recording"
            ) {
              return;
            }
            analyser.getByteFrequencyData(dataArr);
            let sum = 0;
            for (let i = 0; i < dataArr.length; i++) {
              sum += dataArr[i];
            }
            const avg = sum / dataArr.length;

            if (avg > 17) {
              hasDetectedVoice = true;
              lastVoiceMs = Date.now();
            } else if (
              hasDetectedVoice &&
              Date.now() - lastVoiceMs > 1100 &&
              Date.now() - fallbackStartMsRef.current > 850
            ) {
              submitFallbackAudioRef.current();
              return;
            }
            vadRafRef.current = requestAnimationFrame(monitorVad);
          };
          vadRafRef.current = requestAnimationFrame(monitorVad);
        } catch {
          // Tap Orb remains available if AudioContext is restricted
        }
      }
    } catch (err: unknown) {
      if (isMicPermissionDenied(err)) {
        setMicPermissionError(
          "Izin mikrofon ditolak. Aktifkan izin mikrofon lalu ketuk Orb."
        );
      } else {
        setMicPermissionError(
          "Mikrofon tidak terdeteksi. Periksa perangkat audio lalu ketuk Orb."
        );
      }
    }
  }, [getOrCreateAudioContext, isOpen, stopMicAndRecorder, updatePhase]);

  const finishAndSubmitFallbackAudio = useCallback(async () => {
    if (!fallbackRecorderRef.current || isSubmittingTurnRef.current) return;
    const recorder = fallbackRecorderRef.current;
    if (recorder.state === "inactive") return;

    isSubmittingTurnRef.current = true;
    if (vadRafRef.current) {
      cancelAnimationFrame(vadRafRef.current);
      vadRafRef.current = 0;
    }

    const elapsedMs = Date.now() - fallbackStartMsRef.current;
    const rawMime = recorder.mimeType || "audio/webm";

    const recordedBlob = await new Promise<Blob | null>((resolve) => {
      recorder.onstop = () => {
        stopMicAndRecorder();
        if (fallbackChunksRef.current.length > 0) {
          resolve(new Blob(fallbackChunksRef.current, { type: rawMime }));
        } else {
          resolve(null);
        }
      };
      try {
        recorder.stop();
      } catch {
        stopMicAndRecorder();
        resolve(null);
      }
    });

    if (elapsedMs < 450 || !recordedBlob || recordedBlob.size === 0) {
      isSubmittingTurnRef.current = false;
      if (isMountedRef.current && callActiveRef.current) {
        startFallbackAudioCapture();
      }
      return;
    }

    const dataUrl = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(recordedBlob);
    });

    if (!dataUrl || !onSendSpokenAudio) {
      isSubmittingTurnRef.current = false;
      if (isMountedRef.current && callActiveRef.current) {
        startFallbackAudioCapture();
      }
      return;
    }

    stopAiPlayback();
    updatePhase("thinking");

    try {
      const cleanBase64 = stripVoiceDataUrlPrefix(dataUrl);
      const cleanMime = rawMime.split(";")[0].trim() || "audio/webm";

      const result = await onSendSpokenAudio({
        base64: cleanBase64,
        mimeType: cleanMime,
      });

      if (!isMountedRef.current || !callActiveRef.current) return;

      const replyText = result.reply?.trim() || "";

      if (replyText) {
        await playAiReplyAndRelisten(replyText, result.replyAudio);
      } else {
        startFallbackAudioCapture();
      }
    } finally {
      isSubmittingTurnRef.current = false;
    }
  }, [
    onSendSpokenAudio,
    playAiReplyAndRelisten,
    startFallbackAudioCapture,
    stopAiPlayback,
    stopMicAndRecorder,
    updatePhase,
  ]);

  useEffect(() => {
    submitFallbackAudioRef.current = finishAndSubmitFallbackAudio;
  }, [finishAndSubmitFallbackAudio]);

  const handleSpokenTextTurn = useCallback(
    async (spokenText: string) => {
      const trimmed = spokenText.trim();
      if (!trimmed || isSubmittingTurnRef.current) return;

      isSubmittingTurnRef.current = true;
      latestSpokenTextRef.current = "";
      stopListening();
      stopAiPlayback();
      updatePhase("thinking");

      try {
        const rawResult = await onSendSpokenPrompt(trimmed);
        if (!isMountedRef.current || !callActiveRef.current) return;

        const normalized: VoiceCallTurnPayload =
          typeof rawResult === "string" || rawResult === null
            ? { reply: rawResult }
            : rawResult;

        const replyText = normalized.reply?.trim() || "";

        if (replyText) {
          await playAiReplyAndRelisten(replyText, normalized.replyAudio);
        } else {
          startListeningRef.current();
        }
      } finally {
        isSubmittingTurnRef.current = false;
      }
    },
    [
      onSendSpokenPrompt,
      playAiReplyAndRelisten,
      stopAiPlayback,
      stopListening,
      updatePhase,
    ]
  );

  useEffect(() => {
    submitSpokenTextRef.current = handleSpokenTextTurn;
  }, [handleSpokenTextTurn]);

  /**
   * Optional parallel microphone tap for Web Audio AnalyserNode visualizer while SpeechRecognition listens.
   * Non-blocking and safely ignored if the browser restricts concurrent audio streams.
   */
  const attachMicVisualizerTap = useCallback(async () => {
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (
        !callActiveRef.current ||
        !isOpen ||
        phaseRef.current !== "listening"
      ) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      micStreamRef.current = stream;
      const audioCtx = getOrCreateAudioContext();
      if (!audioCtx) return;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.8;
      source.connect(analyser);
      micSourceNodeRef.current = source;
      activeAnalyserRef.current = analyser;
    } catch {
      // SpeechRecognition still runs smoothly with interim speech pulse fallback
    }
  }, [getOrCreateAudioContext, isOpen]);

  const startListening = useCallback(() => {
    stopListening();
    if (!callActiveRef.current || !isOpen) return;

    // Ensure zero AI sound before activating mic (anti-echo)
    stopAiPlayback();

    if (isMicMutedRef.current) {
      updatePhase("listening");
      return;
    }

    if (isFallbackAudioModeRef.current) {
      startFallbackAudioCapture();
      return;
    }

    setMicPermissionError("");
    latestSpokenTextRef.current = "";
    updatePhase("listening");

    try {
      const w = window as unknown as {
        SpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult:
            | ((e: {
                results: ArrayLike<ArrayLike<{ transcript: string }>>;
              }) => void)
            | null;
          onerror: ((e: { error?: string }) => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
          abort?: () => void;
        };
        webkitSpeechRecognition?: new () => {
          lang: string;
          continuous: boolean;
          interimResults: boolean;
          onresult:
            | ((e: {
                results: ArrayLike<ArrayLike<{ transcript: string }>>;
              }) => void)
            | null;
          onerror: ((e: { error?: string }) => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
          abort?: () => void;
        };
      };

      const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SpeechRec) {
        isFallbackAudioModeRef.current = true;
        startFallbackAudioCapture();
        return;
      }

      const rec = new SpeechRec();
      rec.lang = "id-ID";
      rec.continuous = true;
      rec.interimResults = true;

      let erroredOut = false;

      rec.onresult = (event) => {
        webSpeechSilentExitCountRef.current = 0;
        speechPulseRef.current = 0.65;
        let combined = "";
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + " ";
        }
        const cleaned = combined.trim();
        if (cleaned) {
          latestSpokenTextRef.current = cleaned;
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          // ~1.1s natural silence detector -> send automatically
          silenceTimerRef.current = setTimeout(() => {
            const finalSpoken = latestSpokenTextRef.current.trim();
            if (finalSpoken.length > 0 && !isSubmittingTurnRef.current) {
              submitSpokenTextRef.current(finalSpoken);
            }
          }, 1100);
        }
      };

      rec.onerror = (event) => {
        const errCode = event?.error || "";
        if (errCode === "aborted" || errCode === "no-speech") {
          return;
        }
        if (errCode === "not-allowed" || errCode === "service-not-allowed") {
          erroredOut = true;
          stopListening();
          setMicPermissionError(
            "Izin mikrofon ditolak. Izinkan mikrofon di browser lalu ketuk Orb."
          );
          return;
        }
        // Network / audio-capture / unsupported -> seamlessly switch to MediaRecorder fallback
        erroredOut = true;
        isFallbackAudioModeRef.current = true;
        startFallbackAudioCapture();
      };

      rec.onend = () => {
        if (recognitionRef.current !== rec) return;
        recognitionRef.current = null;

        if (
          erroredOut ||
          !callActiveRef.current ||
          !isOpen ||
          isSubmittingTurnRef.current
        ) {
          return;
        }

        const captured = latestSpokenTextRef.current.trim();
        if (captured.length > 0) {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
          submitSpokenTextRef.current(captured);
          return;
        }

        if (phaseRef.current === "listening") {
          webSpeechSilentExitCountRef.current += 1;
          if (webSpeechSilentExitCountRef.current >= 4) {
            isFallbackAudioModeRef.current = true;
            startFallbackAudioCapture();
            return;
          }
          reListenTimerRef.current = setTimeout(() => {
            if (
              isMountedRef.current &&
              callActiveRef.current &&
              isOpen &&
              phaseRef.current === "listening"
            ) {
              startListeningRef.current();
            }
          }, 220);
        }
      };

      recognitionRef.current = rec;
      rec.start();
      attachMicVisualizerTap();
    } catch (err: unknown) {
      if (isMicPermissionDenied(err)) {
        setMicPermissionError(
          "Izin mikrofon ditolak. Izinkan mikrofon di browser lalu ketuk Orb."
        );
        return;
      }
      isFallbackAudioModeRef.current = true;
      startFallbackAudioCapture();
    }
  }, [
    attachMicVisualizerTap,
    isOpen,
    startFallbackAudioCapture,
    stopAiPlayback,
    stopListening,
    updatePhase,
  ]);

  useEffect(() => {
    startListeningRef.current = startListening;
  }, [startListening]);

  // =========================================================================
  // GEMINI LIVE API REAL-TIME BIDIRECTIONAL AUDIO ENGINE (WEBSOCKET + PCM)
  // =========================================================================

  const ensureLiveAssistantTurnId = useCallback((): string => {
    if (!liveAssistantTurnIdRef.current) {
      liveAssistantTurnIdRef.current = `live-ai-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
    }
    return liveAssistantTurnIdRef.current;
  }, []);

  const emitPendingLiveWebSources = useCallback(
    (turnId: string) => {
      if (livePendingSourcesRef.current.length > 0) {
        onLiveWebSourcesRef.current?.(turnId, [...livePendingSourcesRef.current]);
      }
    },
    []
  );

  const flushThrottledAssistantTranscriptNow = useCallback(() => {
    if (liveTranscriptFlushTimerRef.current) {
      clearTimeout(liveTranscriptFlushTimerRef.current);
      liveTranscriptFlushTimerRef.current = null;
    }
    const streamingText = liveOutputTurnTextRef.current.trim();
    if (!streamingText) return;
    const turnId = ensureLiveAssistantTurnId();
    liveLastTranscriptFlushMsRef.current = performance.now();
    onLiveAssistantStreamRef.current?.(turnId, streamingText);
    emitPendingLiveWebSources(turnId);
  }, [emitPendingLiveWebSources, ensureLiveAssistantTurnId]);

  const scheduleThrottledAssistantTranscriptFlush = useCallback(() => {
    const now = performance.now();
    const elapsed = now - liveLastTranscriptFlushMsRef.current;
    if (elapsed >= LIVE_TRANSCRIPT_THROTTLE_MS) {
      flushThrottledAssistantTranscriptNow();
      return;
    }
    if (!liveTranscriptFlushTimerRef.current) {
      const waitMs = Math.max(16, LIVE_TRANSCRIPT_THROTTLE_MS - elapsed);
      liveTranscriptFlushTimerRef.current = setTimeout(() => {
        liveTranscriptFlushTimerRef.current = null;
        flushThrottledAssistantTranscriptNow();
      }, waitMs);
    }
  }, [flushThrottledAssistantTranscriptNow]);

  const commitLiveUserTurnIfPending = useCallback(() => {
    const userText = liveInputTurnTextRef.current.replace(/\s+/g, " ").trim();
    if (!userText || liveUserCommittedRef.current) return;
    liveUserCommittedRef.current = true;
    liveInputTurnTextRef.current = "";
    onLiveUserTurnRef.current?.(userText);
  }, []);

  const flushLiveTurnTranscripts = useCallback(() => {
    if (liveTranscriptFlushTimerRef.current) {
      clearTimeout(liveTranscriptFlushTimerRef.current);
      liveTranscriptFlushTimerRef.current = null;
    }
    commitLiveUserTurnIfPending();
    const aiText = liveOutputTurnTextRef.current.replace(/\s+/g, " ").trim();
    if (aiText) {
      const turnId = ensureLiveAssistantTurnId();
      onLiveAssistantStreamRef.current?.(turnId, aiText);
      emitPendingLiveWebSources(turnId);
    }
    liveInputTurnTextRef.current = "";
    liveOutputTurnTextRef.current = "";
    liveAssistantTurnIdRef.current = null;
    liveUserCommittedRef.current = false;
    livePendingSourcesRef.current = [];
  }, [commitLiveUserTurnIfPending, emitPendingLiveWebSources, ensureLiveAssistantTurnId]);

  const interruptLivePlayback = useCallback(() => {
    // Instantly flush AudioWorklet Ring Buffer (with 5ms soft ramp-out) so barge-in & close stop cleanly without clicks
    if (livePlaybackWorkletNodeRef.current) {
      try {
        livePlaybackWorkletNodeRef.current.port.postMessage({ type: "clear" });
      } catch {
        // ignore
      }
    }

    // Also clear any fallback AudioBufferSourceNode instances
    liveScheduledSourcesRef.current.forEach((node) => {
      try {
        node.onended = null;
        node.stop();
        node.disconnect();
      } catch {
        // ignore
      }
    });
    liveScheduledSourcesRef.current.clear();
    liveNextPlayTimeRef.current = 0;
    liveTurnCompleteRef.current = true;
    if (liveMicAnalyserRef.current) {
      activeAnalyserRef.current = liveMicAnalyserRef.current;
    }
  }, []);

  const cleanupLiveSessionResources = useCallback(() => {
    if (liveConnectTimerRef.current) {
      clearTimeout(liveConnectTimerRef.current);
      liveConnectTimerRef.current = null;
    }
    if (liveTranscriptFlushTimerRef.current) {
      clearTimeout(liveTranscriptFlushTimerRef.current);
      liveTranscriptFlushTimerRef.current = null;
    }

    interruptLivePlayback();
    flushLiveTurnTranscripts();

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

    if (livePlaybackWorkletNodeRef.current) {
      try {
        livePlaybackWorkletNodeRef.current.port.onmessage = null;
        livePlaybackWorkletNodeRef.current.disconnect();
      } catch {
        // ignore
      }
      livePlaybackWorkletNodeRef.current = null;
    }

    if (livePlaybackWorkletUrlRef.current) {
      try {
        URL.revokeObjectURL(livePlaybackWorkletUrlRef.current);
      } catch {
        // ignore
      }
      livePlaybackWorkletUrlRef.current = null;
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

    if (liveWsRef.current) {
      const ws = liveWsRef.current;
      liveWsRef.current = null;
      try {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        if (
          ws.readyState === WebSocket.OPEN ||
          ws.readyState === WebSocket.CONNECTING
        ) {
          ws.close(1000, "Voice call ended");
        }
      } catch {
        // ignore
      }
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
    isLiveModeRef.current = false;
    liveSetupReadyRef.current = false;
  }, [flushLiveTurnTranscripts, interruptLivePlayback]);

  const scheduleLivePcmOutputChunk = useCallback(
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

        const sourceRate = parsePcmRateFromMime(mimeType, 24000);
        liveTurnCompleteRef.current = false;
        activeAnalyserRef.current = outAnalyser;
        if (phaseRef.current !== "speaking") {
          updatePhase("speaking");
        }

        // Primary path: Ultra-smooth AudioWorklet Ring Buffer Player (180ms jitter pre-buffer + 5ms soft ramp)
        const playbackWorklet = livePlaybackWorkletNodeRef.current;
        if (playbackWorklet) {
          const samplesForCtx =
            Math.abs(outCtx.sampleRate - sourceRate) > 1
              ? resampleFloat32Linear(float32, sourceRate, outCtx.sampleRate)
              : float32;
          const transferable = new Float32Array(samplesForCtx);
          playbackWorklet.port.postMessage(
            { type: "push", samples: transferable },
            [transferable.buffer]
          );
          return;
        }

        // Fallback path ONLY when AudioWorklet is unavailable: AudioBufferSourceNode with >= 160ms lookahead
        const audioBuffer = outCtx.createBuffer(1, float32.length, sourceRate);
        audioBuffer.copyToChannel(new Float32Array(float32), 0);

        const sourceNode = outCtx.createBufferSource();
        sourceNode.buffer = audioBuffer;
        sourceNode.connect(outAnalyser);

        const now = outCtx.currentTime;
        const startAt =
          liveNextPlayTimeRef.current > now + 0.01
            ? liveNextPlayTimeRef.current
            : now + LIVE_FALLBACK_LOOKAHEAD_SEC;
        liveNextPlayTimeRef.current = startAt + audioBuffer.duration;

        liveScheduledSourcesRef.current.add(sourceNode);
        sourceNode.onended = () => {
          liveScheduledSourcesRef.current.delete(sourceNode);
          if (
            liveScheduledSourcesRef.current.size === 0 &&
            liveTurnCompleteRef.current &&
            isMountedRef.current &&
            callActiveRef.current
          ) {
            liveNextPlayTimeRef.current = 0;
            activeAnalyserRef.current = liveMicAnalyserRef.current;
            updatePhase("listening");
          }
        };

        sourceNode.start(startAt);
      } catch {
        // Ignore individual malformed chunk without breaking the live stream
      }
    },
    [updatePhase]
  );

  const startLiveMicStreaming = useCallback(
    async (ws: WebSocket, stream: MediaStream) => {
      if (!callActiveRef.current || ws.readyState !== WebSocket.OPEN) return;

      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return;

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
      if (phaseRef.current !== "speaking") {
        activeAnalyserRef.current = micAnalyser;
      }

      const sendInt16PcmToLiveWs = (int16: Int16Array) => {
        if (
          !callActiveRef.current ||
          !liveSetupReadyRef.current ||
          isMicMutedRef.current ||
          liveWsRef.current !== ws ||
          ws.readyState !== WebSocket.OPEN ||
          int16.length === 0
        ) {
          return;
        }
        const base64Audio = int16PcmToBase64(int16);
        try {
          ws.send(
            JSON.stringify({
              realtimeInput: {
                audio: {
                  data: base64Audio,
                  mimeType: "audio/pcm;rate=16000",
                },
              },
            })
          );
        } catch {
          // Socket closed mid-frame
        }
      };

      const sendFloatChunkFallback = (floatChunk: Float32Array) => {
        const int16 = downsampleFloat32ToInt16Pcm(
          floatChunk,
          inputCtx.sampleRate,
          16000
        );
        sendInt16PcmToLiveWs(int16);
      };

      // Primary path: Off-main-thread AudioWorklet (downsamples to 16kHz Int16 in ~90ms packets)
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
            liveWsRef.current !== ws ||
            inputCtx.state === "closed"
          ) {
            return;
          }

          const workletNode = new AudioWorkletNode(
            inputCtx,
            "formylab-pcm-capture-processor"
          );
          liveWorkletNodeRef.current = workletNode;
          workletNode.port.onmessage = (event: MessageEvent) => {
            if (event.data instanceof Int16Array) {
              sendInt16PcmToLiveWs(event.data);
            } else if (event.data instanceof Float32Array) {
              sendFloatChunkFallback(event.data);
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
          // Fall back seamlessly to ScriptProcessorNode below
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

      // Fallback path ONLY when AudioWorklet is unavailable
      if (!workletAttached && typeof inputCtx.createScriptProcessor === "function") {
        const scriptNode = inputCtx.createScriptProcessor(2048, 1, 1);
        liveScriptNodeRef.current = scriptNode;

        const silentGain = inputCtx.createGain();
        silentGain.gain.value = 0;
        liveSilentGainRef.current = silentGain;

        scriptNode.onaudioprocess = (ev: AudioProcessingEvent) => {
          const ch0 = ev.inputBuffer.getChannelData(0);
          if (ch0 && ch0.length > 0) {
            sendFloatChunkFallback(new Float32Array(ch0));
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
    cleanupLiveSessionResources();
    stopListening();
    stopAiPlayback();

    if (!isMountedRef.current || !callActiveRef.current || !isOpen) return;

    setMicPermissionError("");
    updatePhase("listening");

    // 1. Fetch short-lived Gemini Live ephemeral token & config from server
    let sessionConfig: LiveSessionConfigResponse | null = null;
    try {
      const res = await fetch("/api/live-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recentContext: recentContextRef.current,
        }),
      });
      if (res.ok) {
        sessionConfig = (await res.json()) as LiveSessionConfigResponse;
      }
    } catch {
      sessionConfig = { fallbackMode: true };
    }

    if (!isMountedRef.current || !callActiveRef.current || !isOpen) return;

    // Automatic fast-path HTTP voice fallback when Live ephemeral token isn't available
    if (
      !sessionConfig ||
      sessionConfig.fallbackMode ||
      !sessionConfig.wsUrl ||
      !sessionConfig.token ||
      typeof WebSocket === "undefined"
    ) {
      isLiveModeRef.current = false;
      getOrCreateAudioContext();
      startListeningRef.current();
      return;
    }

    // 2. Request microphone stream with echo cancellation & noise suppression
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setMicPermissionError(
        "Izinkan akses mikrofon di browser atau buka di tab penuh, lalu ketuk Orb."
      );
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
        setMicPermissionError(
          "Izin mikrofon ditolak. Izinkan mikrofon di browser lalu ketuk Orb."
        );
      } else {
        setMicPermissionError(
          "Mikrofon tidak terdeteksi. Periksa perangkat audio lalu ketuk Orb."
        );
      }
      return;
    }

    if (!isMountedRef.current || !callActiveRef.current || !isOpen) {
      micStream.getTracks().forEach((t) => t.stop());
      return;
    }

    liveMicStreamRef.current = micStream;
    micStream.getAudioTracks().forEach((track) => {
      track.enabled = !isMicMutedRef.current;
    });

    // 3. Prepare dedicated 24kHz Output AudioContext + AnalyserNode for gapless AI speech
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) {
      micStream.getTracks().forEach((t) => t.stop());
      liveMicStreamRef.current = null;
      startListeningRef.current();
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
    liveNextPlayTimeRef.current = 0;
    liveTurnCompleteRef.current = true;

    // Attach 24kHz Ring Buffer AudioWorklet Player (180ms jitter pre-buffer + 5ms soft cross-fade)
    if (
      typeof AudioWorkletNode !== "undefined" &&
      outCtx.audioWorklet &&
      typeof outCtx.audioWorklet.addModule === "function"
    ) {
      try {
        const playerBlob = new Blob([PCM_PLAYBACK_WORKLET_CODE], {
          type: "application/javascript",
        });
        const playerUrl = URL.createObjectURL(playerBlob);
        livePlaybackWorkletUrlRef.current = playerUrl;
        await outCtx.audioWorklet.addModule(playerUrl);

        if (callActiveRef.current && outCtx.state !== "closed") {
          const playerNode = new AudioWorkletNode(
            outCtx,
            "formylab-pcm-ring-player"
          );
          playerNode.connect(outAnalyser);
          playerNode.port.onmessage = (ev: MessageEvent) => {
            if (
              ev.data?.type === "drained" &&
              liveTurnCompleteRef.current &&
              isMountedRef.current &&
              callActiveRef.current
            ) {
              activeAnalyserRef.current = liveMicAnalyserRef.current;
              updatePhase("listening");
            }
          };
          livePlaybackWorkletNodeRef.current = playerNode;
        }
      } catch {
        // Cleanly falls back to lookahead AudioBufferSourceNode scheduler
        if (livePlaybackWorkletUrlRef.current) {
          try {
            URL.revokeObjectURL(livePlaybackWorkletUrlRef.current);
          } catch {
            // ignore
          }
          livePlaybackWorkletUrlRef.current = null;
        }
      }
    }

    // 4. Open Native WebSocket to Gemini Live BidiGenerateContentConstrained
    const fallbackToFastHttpVoice = () => {
      if (!isMountedRef.current || !callActiveRef.current || !isOpen) return;
      cleanupLiveSessionResources();
      getOrCreateAudioContext();
      startListeningRef.current();
    };

    try {
      isLiveModeRef.current = true;
      liveSetupReadyRef.current = false;

      const ws = new WebSocket(sessionConfig.wsUrl);
      liveWsRef.current = ws;

      // Safety watchdog: if Live handshake doesn't finish in 7s, gracefully switch to fast fallback
      liveConnectTimerRef.current = setTimeout(() => {
        if (
          callActiveRef.current &&
          liveWsRef.current === ws &&
          !liveSetupReadyRef.current
        ) {
          fallbackToFastHttpVoice();
        }
      }, 7000);

      const liveModelPath = (sessionConfig.model || "gemini-3.8-live").startsWith(
        "models/"
      )
        ? sessionConfig.model!
        : `models/${sessionConfig.model || "gemini-3.8-live"}`;

      ws.onopen = () => {
        if (!callActiveRef.current || liveWsRef.current !== ws) return;
        const setupPayload = {
          setup: {
            model: liveModelPath,
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: {
                  prebuiltVoiceConfig: {
                    voiceName: sessionConfig?.voiceName || "Aoede",
                  },
                },
              },
            },
            ...(sessionConfig?.systemInstruction
              ? {
                  systemInstruction: {
                    parts: [{ text: sessionConfig.systemInstruction }],
                  },
                }
              : {}),
            ...(Array.isArray(sessionConfig?.tools) &&
            sessionConfig.tools.length > 0
              ? { tools: sessionConfig.tools }
              : {}),
            inputAudioTranscription: {},
            outputAudioTranscription: {},
          },
        };
        try {
          ws.send(JSON.stringify(setupPayload));
        } catch {
          fallbackToFastHttpVoice();
        }
      };

      ws.onmessage = async (event: MessageEvent) => {
        if (!callActiveRef.current || liveWsRef.current !== ws) return;

        let rawText = "";
        try {
          if (typeof event.data === "string") {
            rawText = event.data;
          } else if (event.data instanceof Blob) {
            rawText = await event.data.text();
          } else if (event.data instanceof ArrayBuffer) {
            rawText = new TextDecoder().decode(event.data);
          }
        } catch {
          return;
        }
        if (!rawText) return;

        let msg: {
          setupComplete?: unknown;
          toolCall?: {
            functionCalls?: Array<{
              id?: string;
              name?: string;
              args?: Record<string, unknown>;
            }>;
          };
          serverContent?: {
            interrupted?: boolean;
            turnComplete?: boolean;
            inputTranscription?: { text?: string };
            outputTranscription?: { text?: string };
            groundingMetadata?: unknown;
            modelTurn?: {
              parts?: Array<{
                text?: string;
                inlineData?: { data?: string; mimeType?: string };
              }>;
            };
          };
        };
        try {
          msg = JSON.parse(rawText);
        } catch {
          return;
        }

        // Handshake complete -> begin continuous 16kHz PCM mic stream
        if (msg.setupComplete !== undefined) {
          if (liveConnectTimerRef.current) {
            clearTimeout(liveConnectTimerRef.current);
            liveConnectTimerRef.current = null;
          }
          liveSetupReadyRef.current = true;
          updatePhase("listening");
          await startLiveMicStreaming(ws, micStream);
          return;
        }

        // Real Gemini Live Tool Execution (`create_chat_note`, `create_google_doc`, `web_search`)
        if (
          msg.toolCall?.functionCalls &&
          Array.isArray(msg.toolCall.functionCalls) &&
          msg.toolCall.functionCalls.length > 0
        ) {
          commitLiveUserTurnIfPending();
          const functionResponses: Array<{
            id: string;
            name: string;
            response: Record<string, unknown>;
          }> = [];

          for (const call of msg.toolCall.functionCalls) {
            const callId = call.id || `tool-${Date.now()}`;
            const callName = call.name || "unknown";
            if (callName === "create_chat_note") {
              const normalized = normalizeChatNoteArtifact(call.args);
              if (normalized) {
                onCreateChatNoteRef.current?.(normalized);
                functionResponses.push({
                  id: callId,
                  name: callName,
                  response: {
                    status: "success",
                    title: normalized.title,
                    format: normalized.format,
                    message: "Catatan sudah ditampilkan langsung di room chat.",
                  },
                });
              } else {
                functionResponses.push({
                  id: callId,
                  name: callName,
                  response: {
                    status: "error",
                    message: "Isi catatan kosong.",
                  },
                });
              }
            } else if (callName === "create_google_doc") {
              const normalized = normalizeGoogleDocArtifact(call.args);
              if (normalized) {
                onCreateGoogleDocRef.current?.(normalized);
                functionResponses.push({
                  id: callId,
                  name: callName,
                  response: {
                    status: "success",
                    title: normalized.title,
                    message:
                      "Kartu Google Docs sudah ditampilkan langsung di room chat dan siap disimpan ke Google Drive.",
                  },
                });
              } else {
                functionResponses.push({
                  id: callId,
                  name: callName,
                  response: {
                    status: "error",
                    message: "Isi dokumen Google Docs kosong.",
                  },
                });
              }
            } else if (callName === "web_search") {
              const query = String(
                (call.args as Record<string, unknown> | undefined)?.query ?? ""
              ).trim();
              if (!query) {
                functionResponses.push({
                  id: callId,
                  name: callName,
                  response: {
                    status: "error",
                    message: "Kata kunci pencarian kosong.",
                  },
                });
              } else {
                updatePhase("thinking");
                try {
                  const searchRes = await fetch("/api/web-search", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ query }),
                  });
                  const searchData = await searchRes.json().catch(() => ({}));
                  const extractedSources: WebSourceCitation[] = Array.isArray(
                    searchData?.sources
                  )
                    ? (searchData.sources as unknown[])
                        .map((item) => normalizeWebSourceCitation(item))
                        .filter(
                          (item): item is WebSourceCitation => item !== null
                        )
                    : [];

                  if (extractedSources.length > 0) {
                    livePendingSourcesRef.current = mergeUniqueWebSources(
                      livePendingSourcesRef.current,
                      extractedSources
                    );
                    if (liveAssistantTurnIdRef.current) {
                      emitPendingLiveWebSources(liveAssistantTurnIdRef.current);
                    }
                  }

                  if (searchData?.success && searchData?.summary) {
                    functionResponses.push({
                      id: callId,
                      name: callName,
                      response: {
                        status: "success",
                        query,
                        summary: searchData.summary,
                        sources: extractedSources.map((s) => ({
                          domain: s.domain,
                          title: s.title,
                          url: s.url,
                        })),
                      },
                    });
                  } else {
                    functionResponses.push({
                      id: callId,
                      name: callName,
                      response: {
                        status: "error",
                        query,
                        message:
                          searchData?.error ||
                          "Pencarian internet belum menemukan hasil pasti.",
                      },
                    });
                  }
                } catch {
                  functionResponses.push({
                    id: callId,
                    name: callName,
                    response: {
                      status: "error",
                      query,
                      message: "Gagal menghubungi layanan pencarian internet.",
                    },
                  });
                }
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

          if (ws.readyState === WebSocket.OPEN && functionResponses.length > 0) {
            try {
              ws.send(
                JSON.stringify({
                  toolResponse: {
                    functionResponses,
                  },
                })
              );
            } catch {
              // ignore send error on closing socket
            }
          }
          return;
        }

        const content = msg.serverContent;
        if (!content) return;

        // Native Gemini Live Google Search grounding metadata (when hybrid mode is active)
        if (content.groundingMetadata) {
          const nativeSources = extractWebSourcesFromGroundingMetadata(
            content.groundingMetadata,
            6
          );
          if (nativeSources.length > 0) {
            livePendingSourcesRef.current = mergeUniqueWebSources(
              livePendingSourcesRef.current,
              nativeSources
            );
            if (liveAssistantTurnIdRef.current) {
              emitPendingLiveWebSources(liveAssistantTurnIdRef.current);
            }
          }
        }

        // True server-side Barge-In: user spoke over AI -> flush AudioWorklet ring buffer immediately
        if (content.interrupted) {
          interruptLivePlayback();
          flushLiveTurnTranscripts();
          updatePhase("listening");
          return;
        }

        // Real-time user speech transcription -> accumulated & committed cleanly to right-side bubble
        if (content.inputTranscription?.text) {
          if (liveUserCommittedRef.current) {
            liveUserCommittedRef.current = false;
            liveInputTurnTextRef.current = "";
          }
          liveInputTurnTextRef.current += content.inputTranscription.text;
          speechPulseRef.current = 0.55;
        }

        // Real-time AI speech transcription -> throttled max every 120ms so React never janks audio
        if (content.outputTranscription?.text) {
          commitLiveUserTurnIfPending();
          liveOutputTurnTextRef.current += content.outputTranscription.text;
          ensureLiveAssistantTurnId();
          scheduleThrottledAssistantTranscriptFlush();
        }

        // Real-time 24kHz PCM audio output chunks -> AudioWorklet Ring Buffer Player
        const parts = content.modelTurn?.parts;
        if (Array.isArray(parts)) {
          let hasAudioChunk = false;
          for (const part of parts) {
            if (part.inlineData?.data) {
              hasAudioChunk = true;
              scheduleLivePcmOutputChunk(
                part.inlineData.data,
                part.inlineData.mimeType
              );
            }
          }
          if (hasAudioChunk) {
            commitLiveUserTurnIfPending();
          }
        }

        // Turn complete -> finalize live chat bubble & signal worklet to drain remaining ring buffer
        if (content.turnComplete) {
          liveTurnCompleteRef.current = true;
          flushLiveTurnTranscripts();
          if (livePlaybackWorkletNodeRef.current) {
            try {
              livePlaybackWorkletNodeRef.current.port.postMessage({
                type: "turnComplete",
              });
            } catch {
              // ignore
            }
          } else if (liveScheduledSourcesRef.current.size === 0) {
            liveNextPlayTimeRef.current = 0;
            activeAnalyserRef.current = liveMicAnalyserRef.current;
            updatePhase("listening");
          }
        }
      };

      ws.onerror = () => {
        if (callActiveRef.current && liveWsRef.current === ws) {
          fallbackToFastHttpVoice();
        }
      };

      ws.onclose = () => {
        if (callActiveRef.current && liveWsRef.current === ws) {
          fallbackToFastHttpVoice();
        }
      };
    } catch {
      fallbackToFastHttpVoice();
    }
  }, [
    cleanupLiveSessionResources,
    commitLiveUserTurnIfPending,
    emitPendingLiveWebSources,
    ensureLiveAssistantTurnId,
    flushLiveTurnTranscripts,
    getOrCreateAudioContext,
    interruptLivePlayback,
    isOpen,
    scheduleLivePcmOutputChunk,
    scheduleThrottledAssistantTranscriptFlush,
    startLiveMicStreaming,
    stopAiPlayback,
    stopListening,
    updatePhase,
  ]);

  useEffect(() => {
    startLiveSessionRef.current = startLiveVoiceSession;
  }, [startLiveVoiceSession]);

  // Synchronize controlled mute state from ChatComposerBar
  useEffect(() => {
    isMicMutedRef.current = isMicMuted;
    if (!isOpen || !callActiveRef.current) return;

    if (isLiveModeRef.current) {
      if (liveMicStreamRef.current) {
        liveMicStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !isMicMuted;
        });
      }
      return;
    }

    if (isMicMuted) {
      stopListening();
    } else if (
      phaseRef.current !== "speaking" &&
      phaseRef.current !== "thinking" &&
      !isSubmittingTurnRef.current
    ) {
      startListeningRef.current();
    }
  }, [isMicMuted, isOpen, stopListening]);

  // Open / close lifecycle
  useEffect(() => {
    isMountedRef.current = true;
    callActiveRef.current = isOpen;

    if (!isOpen) {
      queueMicrotask(() => {
        isSubmittingTurnRef.current = false;
        isFallbackAudioModeRef.current = false;
        webSpeechSilentExitCountRef.current = 0;
        latestSpokenTextRef.current = "";
        setMicPermissionError("");
        cleanupLiveSessionResources();
        stopListening();
        stopAiPlayback();
        closeAudioContextCleanly();
      });
      return;
    }

    // Boot directly into Real-Time Gemini Live WebSocket (with seamless fast-path fallback)
    const bootTimer = setTimeout(() => {
      if (!isMountedRef.current || !callActiveRef.current) return;
      isSubmittingTurnRef.current = false;
      webSpeechSilentExitCountRef.current = 0;
      liveInputTurnTextRef.current = "";
      liveOutputTurnTextRef.current = "";
      liveAssistantTurnIdRef.current = null;
      liveUserCommittedRef.current = false;
      setMicPermissionError("");
      startLiveSessionRef.current();
    }, 30);

    return () => {
      isMountedRef.current = false;
      callActiveRef.current = false;
      isSubmittingTurnRef.current = false;
      clearTimeout(bootTimer);
      cleanupLiveSessionResources();
      stopListening();
      stopAiPlayback();
      closeAudioContextCleanly();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOrbInteract = async () => {
    // Retry mic permission if previously denied
    if (micPermissionError) {
      setMicPermissionError("");
      webSpeechSilentExitCountRef.current = 0;
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === "function"
      ) {
        try {
          const probe = await navigator.mediaDevices.getUserMedia({
            audio: true,
          });
          probe.getTracks().forEach((t) => t.stop());
        } catch (err: unknown) {
          if (isMicPermissionDenied(err)) {
            setMicPermissionError(
              "Izin mikrofon masih diblokir. Izinkan akses mikrofon browser lalu ketuk Orb."
            );
            return;
          }
        }
      }
      startLiveSessionRef.current();
      return;
    }

    // Live WebSocket mode: tapping particle sphere interrupts AI playback immediately (manual barge-in)
    if (isLiveModeRef.current) {
      if (liveOutputCtxRef.current?.state === "suspended") {
        liveOutputCtxRef.current.resume().catch(() => {});
      }
      if (liveInputCtxRef.current?.state === "suspended") {
        liveInputCtxRef.current.resume().catch(() => {});
      }
      if (phase === "speaking") {
        interruptLivePlayback();
        flushLiveTurnTranscripts();
        updatePhase("listening");
      }
      return;
    }

    getOrCreateAudioContext();

    // Fallback mode barge-in: tapping sphere while AI speaks stops audio & listens
    if (phase === "speaking") {
      stopAiPlayback();
      startListening();
      return;
    }

    // Fallback mode listening: submit captured fallback audio or spoken text immediately if present
    if (phase === "listening" && !isMicMutedRef.current) {
      if (
        isFallbackAudioModeRef.current &&
        fallbackRecorderRef.current?.state === "recording"
      ) {
        finishAndSubmitFallbackAudio();
        return;
      }
      const captured = latestSpokenTextRef.current.trim();
      if (captured.length > 0) {
        handleSpokenTextTurn(captured);
        return;
      }
      startListening();
    }
  };

  const orbAriaLabel = micPermissionError
    ? "Ketuk Orb untuk meminta ulang izin mikrofon"
    : isMicMuted
      ? "Mikrofon dibisukan"
      : phase === "speaking"
        ? "AI sedang berbicara, ketuk Orb untuk menyela dan langsung bicara"
        : phase === "thinking"
          ? "AI sedang memproses jawaban Anda"
          : "Mendengarkan suara Anda, ketuk Orb untuk mengirim atau menyela";

  return (
    <div
      className="pointer-events-none flex flex-col items-center justify-center select-none"
      role="region"
      aria-label="Mode Suara AI Inline Formylab"
    >
      {/* Compact Frameless Audio-Reactive 3D Particle Sphere floating above composer */}
      <div
        role="button"
        tabIndex={0}
        onClick={handleOrbInteract}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleOrbInteract();
          }
        }}
        aria-label={orbAriaLabel}
        title={orbAriaLabel}
        className={`pointer-events-auto relative w-24 h-24 sm:w-28 sm:h-28 rounded-full cursor-pointer outline-none bg-transparent focus-visible:ring-2 focus-visible:ring-[#0E807E]/60 transition-all duration-300 active:scale-[0.95] ${
          isMicMuted ? "opacity-55" : "opacity-100"
        }`}
      >
        <LivingVoiceOrb
          phase={phase}
          analyserRef={activeAnalyserRef}
          speechPulseRef={speechPulseRef}
        />
      </div>

      {/* Micro-exception ONLY on fatal browser mic permission error */}
      {micPermissionError && (
        <p
          role="status"
          className="pointer-events-auto mt-1 text-[11px] font-medium text-[#2E524C] text-center max-w-xs leading-snug bg-white/90 backdrop-blur-md px-3 py-1 rounded-full border border-[#0B2B26]/12"
        >
          {micPermissionError}
        </p>
      )}
    </div>
  );
}
