"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Volume2, VolumeX, Square, Play, Pause } from "lucide-react";
import { cleanMarkdownForSpeech } from "../lib/interactiveAiEngine";

export interface VoiceSynthesisState {
  autoSpeakEnabled: boolean;
  isSpeaking: boolean;
  isPaused: boolean;
  activeMessageId: string | null;
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

export function useInteractiveVoice(
  defaultAutoSpeak = true
): VoiceSynthesisState {
  const [autoSpeakEnabled, setAutoSpeakEnabled] =
    useState<boolean>(defaultAutoSpeak);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeMessageId, setActiveMessageId] = useState<string | null>(null);
  const [speechRate, setSpeechRate] = useState<number>(1.05);

  const fallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

      try {
        window.speechSynthesis.cancel();
        const voices = window.speechSynthesis.getVoices();
        // Strictly prefer authentic Indonesian voices (Damayanti, Google Bahasa Indonesia, Microsoft Gadis/Ardi)
        const idVoice =
          voices.find(
            (v) =>
              v.name.toLowerCase().includes("google bahasa indonesia") ||
              v.name.toLowerCase().includes("gadis") ||
              v.name.toLowerCase().includes("damayanti") ||
              v.name.toLowerCase().includes("indonesia")
          ) ||
          voices.find(
            (v) =>
              v.lang.toLowerCase() === "id-id" ||
              v.lang.toLowerCase() === "id_id" ||
              v.lang.toLowerCase().startsWith("id")
          ) ||
          voices.find((v) => v.lang.toLowerCase().startsWith("ms"));

        let index = 0;

        // Chrome keep-alive prevents speechSynthesis from freezing after 14s
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
        }, 8000);

        const speakNextSentence = () => {
          if (activeRunIdRef.current !== runId) return;
          if (index >= sentences.length) {
            onComplete();
            return;
          }

          const chunk = sentences[index++];
          const utterance = new SpeechSynthesisUtterance(chunk);
          utterance.lang = "id-ID";
          utterance.rate = rate;
          utterance.pitch = 1.02;
          if (idVoice) {
            utterance.voice = idVoice;
          }

          utterance.onend = () => {
            if (activeRunIdRef.current !== runId) return;
            speakNextSentence();
          };

          utterance.onerror = () => {
            if (activeRunIdRef.current !== runId) return;
            speakNextSentence();
          };

          window.speechSynthesis.speak(utterance);
        };

        speakNextSentence();
      } catch {
        onComplete();
      }
    },
    []
  );

  const speakMessage = useCallback(
    (messageId: string, rawMarkdown: string, onDone?: () => void) => {
      stopSpeech();

      const spokenText = cleanMarkdownForSpeech(rawMarkdown);
      if (!spokenText) {
        onDone?.();
        return;
      }

      const runId = activeRunIdRef.current;
      setActiveMessageId(messageId);
      setIsSpeaking(true);
      setIsPaused(false);

      const finishCleanly = () => {
        if (activeRunIdRef.current !== runId) return;
        clearTimers();
        setIsSpeaking(false);
        setIsPaused(false);
        setActiveMessageId(null);
        onDone?.();
      };

      const estimatedMs = Math.min(
        45000,
        Math.max(
          3500,
          Math.round((spokenText.length / 12) * (1000 / speechRate))
        )
      );

      // Safety timeout so UI never gets stuck in speaking state in headless browsers
      fallbackTimerRef.current = setTimeout(() => {
        finishCleanly();
      }, estimatedMs + 6000);

      // 1. Primary: Fetch genuine Indonesian Neural TTS MP3 stream from /api/tts so it NEVER speaks with an English OS voice!
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

            audio.onended = () => {
              finishCleanly();
            };

            audio.onerror = () => {
              const fallbackChunks =
                Array.isArray(data.chunks) && data.chunks.length > 0
                  ? data.chunks
                  : spokenText.split(/(?<=[.!?])\s+/).filter(Boolean);
              speakWithIndonesianWebSpeech(
                runId,
                fallbackChunks,
                speechRate,
                finishCleanly
              );
            };

            audio.play().catch(() => {
              const fallbackChunks =
                Array.isArray(data.chunks) && data.chunks.length > 0
                  ? data.chunks
                  : spokenText.split(/(?<=[.!?])\s+/).filter(Boolean);
              speakWithIndonesianWebSpeech(
                runId,
                fallbackChunks,
                speechRate,
                finishCleanly
              );
            });
            return;
          }

          // Fallback to sentence-chunked Indonesian Web Speech
          const fallbackChunks =
            Array.isArray(data?.chunks) && data.chunks.length > 0
              ? data.chunks
              : spokenText.split(/(?<=[.!?])\s+/).filter(Boolean);
          speakWithIndonesianWebSpeech(
            runId,
            fallbackChunks,
            speechRate,
            finishCleanly
          );
        })
        .catch(() => {
          if (activeRunIdRef.current !== runId) return;
          const sentences = spokenText.split(/(?<=[.!?])\s+/).filter(Boolean);
          speakWithIndonesianWebSpeech(
            runId,
            sentences,
            speechRate,
            finishCleanly
          );
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
    <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
      {/* AUTO-SPEAK TOGGLE BUTTON */}
      <button
        type="button"
        onClick={voice.toggleAutoSpeak}
        className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-lg transition cursor-pointer whitespace-nowrap shrink-0 ${
          voice.autoSpeakEnabled
            ? "bg-[#234e42] text-white"
            : "text-slate-600 hover:bg-slate-200/70"
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
        className="text-[11px] font-mono font-bold text-slate-600 hover:text-slate-900 px-1.5 py-0.5 rounded hover:bg-slate-200/60 transition cursor-pointer tabular-nums whitespace-nowrap shrink-0"
        title="Kecepatan Suara AI (Klik untuk Ubah)"
      >
        {voice.speechRate.toFixed(2).replace(/\.?0+$/, "")}x
      </button>

      {/* ACTIVE SPEAKING CONTROLS (PAUSE/RESUME + STOP) */}
      {voice.isSpeaking && (
        <div className="flex items-center gap-1 pl-1.5 border-l border-slate-200">
          <button
            type="button"
            onClick={voice.pauseOrResumeSpeech}
            className="p-1 rounded-lg bg-emerald-100 text-[#234e42] hover:bg-emerald-200 transition cursor-pointer"
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
            className="p-1 rounded-lg bg-rose-100 text-rose-700 hover:bg-rose-200 transition cursor-pointer"
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
