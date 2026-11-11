"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { PhoneOff, Mic, MicOff, Volume2, Sparkles, Send } from "lucide-react";
import { VoiceSynthesisState } from "./InteractiveVoiceController";
import { cleanMarkdownForSpeech } from "../lib/interactiveAiEngine";

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  voice: VoiceSynthesisState;
  modelName: string;
  isAiThinking: boolean;
  latestAiReply: string;
  onSendSpokenPrompt: (spokenText: string) => Promise<string | null>;
}

type CallStatus = "greeting" | "listening" | "thinking" | "speaking";

export default function LiveVoiceCallModal({
  isOpen,
  onClose,
  voice,
  modelName,
  isAiThinking,
  onSendSpokenPrompt,
}: LiveVoiceCallModalProps) {
  const [callStatus, setCallStatus] = useState<CallStatus>("greeting");
  const [callSeconds, setCallSeconds] = useState(0);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [liveUserTranscript, setLiveUserTranscript] = useState("");
  const [manualInput, setManualInput] = useState("");
  const [currentSubtitle, setCurrentSubtitle] = useState(
    "Halo! Mode telepon suara interaktif formylab.ai sudah terhubung. Silakan bicarakan apa saja yang ingin Anda tanyakan."
  );

  const recognitionRef = useRef<{
    start: () => void;
    stop: () => void;
    abort?: () => void;
  } | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestTranscriptRef = useRef("");
  const isMountedRef = useRef(true);
  const handleTurnSubmitRef = useRef<(text: string) => void>(() => {});

  const stopListening = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    stopListening();
    if (!isOpen || isMicMuted) return;

    setCallStatus("listening");
    setLiveUserTranscript("");
    latestTranscriptRef.current = "";

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
          onerror: (() => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
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
          onerror: (() => void) | null;
          onend: (() => void) | null;
          start: () => void;
          stop: () => void;
        };
      };

      const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (!SpeechRec) return;

      const rec = new SpeechRec();
      rec.lang = "id-ID";
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (event) => {
        let combined = "";
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + " ";
        }
        const cleaned = combined.trim();
        if (cleaned) {
          latestTranscriptRef.current = cleaned;
          setLiveUserTranscript(cleaned);

          // Automatically send after 1.5s of pause in user speech (natural phone conversation turn-taking)
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
          }
          silenceTimerRef.current = setTimeout(() => {
            const finalSpoken = latestTranscriptRef.current.trim();
            if (finalSpoken.length >= 2) {
              handleTurnSubmitRef.current(finalSpoken);
            }
          }, 1500);
        }
      };

      rec.onerror = () => {
        // Keep listening UI active so user can also tap quick prompts or type
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {
      // Fallback when browser blocks mic in iframe
    }
  }, [isMicMuted, isOpen, stopListening]);

  const handleTurnSubmit = useCallback(
    async (spokenText: string) => {
      const trimmed = spokenText.trim();
      if (!trimmed || isAiThinking) return;

      stopListening();
      voice.stopSpeech();
      setLiveUserTranscript(trimmed);
      setManualInput("");
      setCallStatus("thinking");
      setCurrentSubtitle(`Anda: "${trimmed}" — Mencari data & menyusun jawaban...`);

      const replyText = await onSendSpokenPrompt(trimmed);
      if (!isMountedRef.current || !isOpen) return;

      if (replyText) {
        const spokenSummary = cleanMarkdownForSpeech(replyText);
        setCurrentSubtitle(spokenSummary);
        setCallStatus("speaking");

        // Speak in clear Bahasa Indonesia, then automatically return to listening mode!
        voice.speakMessage(`call-${Date.now()}`, replyText, () => {
          if (isMountedRef.current && isOpen) {
            setLiveUserTranscript("");
            startListening();
          }
        });
      } else {
        startListening();
      }
    },
    [isAiThinking, isOpen, onSendSpokenPrompt, startListening, stopListening, voice]
  );

  useEffect(() => {
    handleTurnSubmitRef.current = handleTurnSubmit;
  }, [handleTurnSubmit]);

  // Call timer & initial Indonesian voice greeting when call starts
  useEffect(() => {
    isMountedRef.current = true;
    if (!isOpen) {
      stopListening();
      return;
    }

    const startTimer = setTimeout(() => {
      if (!isMountedRef.current) return;
      setCallSeconds(0);
      const greeting =
        "Halo! Mode telepon suara interaktif formylab sudah terhubung. Silakan bicarakan apa saja yang ingin Anda tanyakan atau racik hari ini.";
      setCurrentSubtitle(greeting);
      setCallStatus("speaking");

      voice.speakMessage("call-greeting", greeting, () => {
        if (isMountedRef.current && isOpen) {
          startListening();
        }
      });
    }, 20);

    const interval = setInterval(() => {
      setCallSeconds((prev) => prev + 1);
    }, 1000);

    return () => {
      isMountedRef.current = false;
      clearTimeout(startTimer);
      clearInterval(interval);
      stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  if (!isOpen) return null;

  const mins = String(Math.floor(callSeconds / 60)).padStart(2, "0");
  const secs = String(callSeconds % 60).padStart(2, "0");

  const handleInterruptAndListen = () => {
    voice.stopSpeech();
    startListening();
  };

  const handleEndCall = () => {
    stopListening();
    voice.stopSpeech();
    setCallSeconds(0);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="Mode Telepon Suara Interaktif AI"
    >
      <div className="w-full max-w-lg bg-[#111318] text-white rounded-[2.5rem] p-6 sm:p-8 shadow-[0_25px_80px_rgba(0,0,0,0.85)] border border-white/10 flex flex-col items-center justify-between min-h-[540px]">
        {/* Top Call Header */}
        <div className="w-full flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 bg-white/10 px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-bold tracking-wide text-emerald-300">
              TELEPON AI AKTIF · {mins}:{secs}
            </span>
          </div>
          <span className="text-slate-400 font-semibold">
            {modelName} · Bahasa Indonesia Jernih
          </span>
        </div>

        {/* Center Animated Voice Orb (Like ChatGPT Live Voice Call) */}
        <div className="my-6 flex flex-col items-center text-center">
          <button
            type="button"
            onClick={
              callStatus === "speaking"
                ? handleInterruptAndListen
                : () => startListening()
            }
            className="relative group cursor-pointer focus:outline-none"
            title={
              callStatus === "speaking"
                ? "Klik untuk menyela & langsung bicara"
                : "Klik untuk mulai bicara"
            }
          >
            {/* Outer pulsing rings */}
            <span
              className={`absolute -inset-4 rounded-full transition-all duration-500 ${
                callStatus === "speaking"
                  ? "bg-blue-500/25 animate-ping"
                  : callStatus === "listening"
                    ? "bg-emerald-500/20 animate-pulse"
                    : "bg-indigo-500/15"
              }`}
            />
            <span
              className={`absolute -inset-2 rounded-full transition-all duration-300 ${
                callStatus === "speaking"
                  ? "bg-blue-500/30 scale-105"
                  : callStatus === "listening"
                    ? "bg-emerald-500/25 scale-100"
                    : "bg-indigo-500/20"
              }`}
            />

            {/* Main Orb */}
            <div
              className={`relative w-32 h-32 sm:w-36 sm:h-36 rounded-full flex flex-col items-center justify-center shadow-2xl transition-all duration-300 ${
                callStatus === "speaking"
                  ? "bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#06b6d4]"
                  : callStatus === "listening"
                    ? "bg-gradient-to-br from-[#059669] via-[#10b981] to-[#14b8a6]"
                    : "bg-gradient-to-br from-indigo-600 to-blue-600"
              }`}
            >
              {/* Animated 4-bar waveform inside orb */}
              <div className="flex items-center justify-center gap-1.5 h-12">
                {[0, 1, 2, 3].map((idx) => (
                  <span
                    key={idx}
                    className={`w-2 rounded-full bg-white transition-all duration-200 ${
                      callStatus === "speaking" || callStatus === "listening"
                        ? "animate-pulse"
                        : ""
                    }`}
                    style={{
                      height:
                        callStatus === "speaking"
                          ? idx % 2 === 0
                            ? "26px"
                            : "42px"
                          : callStatus === "listening"
                            ? idx % 2 === 0
                              ? "18px"
                              : "32px"
                            : "14px",
                      animationDelay: `${idx * 120}ms`,
                    }}
                  />
                ))}
              </div>
            </div>
          </button>

          {/* Status Label */}
          <div className="mt-6">
            <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider px-3 py-1 rounded-full bg-white/10 text-blue-300 mb-2">
              {callStatus === "listening" && (
                <>
                  <Mic className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                  <span>Mendengarkan Anda... (Silakan Bicara)</span>
                </>
              )}
              {callStatus === "thinking" && (
                <>
                  <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin" />
                  <span>Mencari di Internet &amp; Merangkum Jawaban...</span>
                </>
              )}
              {(callStatus === "speaking" || callStatus === "greeting") && (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-blue-300 animate-bounce" />
                  <span>AI Sedang Berbicara (Klik Bola untuk Menyela)</span>
                </>
              )}
            </span>

            {/* Live Transcript or AI Spoken Subtitle */}
            <div className="mt-2 max-h-28 overflow-y-auto px-3 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs sm:text-sm text-slate-200 leading-relaxed max-w-md">
              {liveUserTranscript ? (
                <span className="text-emerald-300 font-semibold">
                  &ldquo;{liveUserTranscript}&rdquo;
                </span>
              ) : (
                <span>{currentSubtitle}</span>
              )}
            </div>
          </div>
        </div>

        {/* Quick Spoken Prompts + Direct Voice Turn Input (Works even if mic is muted) */}
        <div className="w-full space-y-3">
          <div className="flex flex-wrap justify-center gap-1.5">
            {[
              "Apa merek moisturizer terbaik saat ini?",
              "Buatkan serum brightening pH 5.5",
              "Bahan aktif terbaik untuk skin barrier?",
            ].map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleTurnSubmit(sample)}
                disabled={callStatus === "thinking"}
                className="text-[11px] bg-white/10 hover:bg-white/20 text-slate-200 px-3 py-1.5 rounded-full transition cursor-pointer"
              >
                🗣️ &ldquo;{sample}&rdquo;
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (manualInput.trim()) {
                handleTurnSubmit(manualInput);
              } else if (liveUserTranscript.trim()) {
                handleTurnSubmit(liveUserTranscript);
              }
            }}
            className="flex items-center gap-2 bg-white/10 rounded-full px-3.5 py-1.5 border border-white/15"
          >
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="Atau ketik ucapan Anda di sini lalu tekan Enter..."
              className="flex-1 bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none"
            />
            <button
              type="submit"
              className="w-7 h-7 rounded-full bg-[#2563eb] hover:bg-[#1d4ed8] text-white flex items-center justify-center cursor-pointer"
              title="Kirim Ucapan"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Bottom Phone Call Controls (Mute / Interrupt / Hang Up) */}
          <div className="flex items-center justify-center gap-4 pt-2">
            <button
              type="button"
              onClick={() => {
                const nextMuted = !isMicMuted;
                setIsMicMuted(nextMuted);
                if (nextMuted) {
                  stopListening();
                } else {
                  startListening();
                }
              }}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition cursor-pointer ${
                isMicMuted
                  ? "bg-amber-500/20 text-amber-300 border border-amber-400/40"
                  : "bg-white/10 hover:bg-white/20 text-white"
              }`}
              title={isMicMuted ? "Aktifkan Mikrofon" : "Bisukan Mikrofon"}
            >
              {isMicMuted ? (
                <MicOff className="w-5 h-5" />
              ) : (
                <Mic className="w-5 h-5" />
              )}
            </button>

            {callStatus === "speaking" && (
              <button
                type="button"
                onClick={handleInterruptAndListen}
                className="px-4 py-2.5 rounded-full bg-white/15 hover:bg-white/25 text-white text-xs font-bold transition cursor-pointer"
              >
                Sela &amp; Bicara Sekarang
              </button>
            )}

            <button
              type="button"
              onClick={handleEndCall}
              className="px-6 py-3 rounded-full bg-rose-600 hover:bg-rose-500 text-white text-xs font-extrabold flex items-center gap-2 shadow-lg transition cursor-pointer"
              title="Akhiri Panggilan Suara"
            >
              <PhoneOff className="w-4 h-4" />
              <span>Akhiri Telepon</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
