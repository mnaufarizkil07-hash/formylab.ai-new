"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  AI_MODEL_OPTIONS,
  AiModelId,
  ModelIcon,
  getModelOption,
} from "./AiModelLogos";
import {
  ChatAttachment,
  createFallbackVoiceNoteWav,
  formatDuration,
  formatFileSize,
} from "../lib/chatStorage";

interface ChatComposerBarProps {
  selectedModel: AiModelId;
  onSelectModel: (model: AiModelId) => void;
  onSend: (text: string, attachments: ChatAttachment[]) => void;
  onStartVoiceCall?: () => void;
  isLoading: boolean;
  compact?: boolean;
  placeholder?: string;
}

export default function ChatComposerBar({
  selectedModel,
  onSelectModel,
  onSend,
  onStartVoiceCall,
  isLoading,
  compact = false,
  placeholder = "Tanya formylab.ai apa saja...",
}: ChatComposerBarProps) {
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    "popular" | "openai" | "google"
  >("popular");

  // Voice Note (VN) / Dictation Recording States
  const [isRecordingVn, setIsRecordingVn] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attachCounterRef = useRef(1);

  const currentModelOpt = getModelOption(selectedModel);

  // Auto-resize textarea height cleanly while keeping 1-line compact height by default
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "24px";
    const nextHeight = Math.min(el.scrollHeight, 112);
    el.style.height = `${Math.max(24, nextHeight)}px`;
  }, [inputText]);

  // Close model menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node)
      ) {
        setIsModelMenuOpen(false);
      }
    };
    if (isModelMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isModelMenuOpen]);

  // Cleanup recording interval on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newAttachments: ChatAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `att-${attachCounterRef.current++}`;
      const sizeLabel = formatFileSize(file.size);

      let dataUrl: string | undefined;
      let textPreview: string | undefined;

      if (
        file.type.startsWith("text/") ||
        file.name.endsWith(".csv") ||
        file.name.endsWith(".json") ||
        file.name.endsWith(".txt") ||
        file.name.endsWith(".md")
      ) {
        try {
          const rawText = await file.text();
          textPreview = rawText.slice(0, 4000);
        } catch {
          // ignore
        }
      }

      if (file.size <= 4 * 1024 * 1024) {
        dataUrl = await new Promise<string | undefined>((resolve) => {
          const reader = new FileReader();
          reader.onload = () =>
            resolve(
              typeof reader.result === "string" ? reader.result : undefined
            );
          reader.onerror = () => resolve(undefined);
          reader.readAsDataURL(file);
        });
      }

      newAttachments.push({
        id,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        sizeLabel,
        dataUrl,
        textPreview,
        isVoiceNote: file.type.startsWith("audio/"),
      });
    }

    setAttachments((prev) => [...prev, ...newAttachments]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const startVoiceNoteRecording = async () => {
    setIsRecordingVn(true);
    setRecordingSeconds(0);
    setLiveTranscript("");
    audioChunksRef.current = [];

    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);

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
          start: () => void;
          stop: () => void;
        };
      };
      const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
      if (SpeechRec) {
        const recognition = new SpeechRec();
        recognition.lang = "id-ID";
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.onresult = (event) => {
          let combined = "";
          for (let i = 0; i < event.results.length; i++) {
            combined += event.results[i][0].transcript + " ";
          }
          if (combined.trim()) {
            setLiveTranscript(combined.trim());
          }
        };
        recognition.start();
      }
    } catch {
      // SpeechRecognition optional
    }

    try {
      if (
        typeof navigator !== "undefined" &&
        navigator.mediaDevices &&
        navigator.mediaDevices.getUserMedia
      ) {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const recorder = new MediaRecorder(stream);
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        recorder.start();
      }
    } catch {
      mediaRecorderRef.current = null;
    }
  };

  const cancelVoiceNoteRecording = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    setIsRecordingVn(false);
    setRecordingSeconds(0);
    setLiveTranscript("");
  };

  const finishVoiceNoteRecording = async () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const durationSec = Math.max(1, recordingSeconds);
    let audioDataUrl: string | undefined;
    let mimeType = "audio/wav";

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const recorder = mediaRecorderRef.current;
      audioDataUrl = await new Promise<string | undefined>((resolve) => {
        recorder.onstop = () => {
          try {
            recorder.stream.getTracks().forEach((track) => track.stop());
          } catch {
            // ignore
          }
          if (audioChunksRef.current.length > 0) {
            const blob = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            mimeType = blob.type || "audio/webm";
            const reader = new FileReader();
            reader.onloadend = () =>
              resolve(
                typeof reader.result === "string" ? reader.result : undefined
              );
            reader.onerror = () => resolve(undefined);
            reader.readAsDataURL(blob);
          } else {
            resolve(undefined);
          }
        };
        recorder.stop();
      });
      mediaRecorderRef.current = null;
    }

    if (!audioDataUrl) {
      audioDataUrl = createFallbackVoiceNoteWav(durationSec);
      mimeType = "audio/wav";
    }

    const vnAttachment: ChatAttachment = {
      id: `vn-${attachCounterRef.current++}`,
      name: `Voice Note (${formatDuration(durationSec)})`,
      mimeType,
      sizeLabel: `${formatDuration(durationSec)} • Audio VN`,
      dataUrl: audioDataUrl,
      textPreview:
        liveTranscript.trim() ||
        "Pesan Suara (Voice Note) mengenai konsultasi formulasi kosmetik & R&D.",
      isVoiceNote: true,
      durationSec,
    };

    setAttachments((prev) => [...prev, vnAttachment]);
    setIsRecordingVn(false);
    setRecordingSeconds(0);
    setLiveTranscript("");
  };

  const hasContentToSend =
    inputText.trim().length > 0 || attachments.length > 0 || isRecordingVn;

  const handleSubmit = () => {
    if (isLoading) return;
    if (isRecordingVn) {
      finishVoiceNoteRecording();
      return;
    }
    if (!inputText.trim() && attachments.length === 0) return;

    onSend(inputText.trim(), attachments);
    setInputText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }
  };

  const handlePrimaryRightButtonClick = () => {
    if (isLoading) return;
    if (hasContentToSend) {
      handleSubmit();
    } else if (onStartVoiceCall) {
      onStartVoiceCall();
    } else {
      startVoiceNoteRecording();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const filteredModels = AI_MODEL_OPTIONS.filter((m) =>
    m.category.includes(activeCategory)
  );

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* POPOVER MODEL SELECTOR */}
      {isModelMenuOpen && (
        <div
          className={`absolute bottom-full mb-2.5 right-0 z-50 ${
            compact ? "w-[310px]" : "w-[330px] sm:w-[400px]"
          } bg-[#141517] text-white rounded-3xl p-3 shadow-[0_20px_50px_rgba(0,0,0,0.65)] border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150`}
        >
          {/* FILTER TABS (Popular | OpenAI | Google) */}
          <div className="flex items-center gap-1.5 pb-2.5 mb-2 border-b border-white/10 overflow-x-auto">
            {(
              [
                { id: "popular", label: "Popular" },
                { id: "openai", label: "OpenAI" },
                { id: "google", label: "Google" },
              ] as const
            ).map((tab) => {
              const isTabActive = activeCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id)}
                  className={`px-3.5 py-1 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
                    isTabActive
                      ? "bg-white text-black shadow-xs"
                      : "text-gray-300 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* MODEL LIST ITEMS */}
          <div className="space-y-1 max-h-[260px] overflow-y-auto pr-0.5">
            {filteredModels.map((modelOpt) => {
              const isSelected = currentModelOpt.id === modelOpt.id;
              return (
                <button
                  key={modelOpt.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(modelOpt.id);
                    setIsModelMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-2xl text-left transition cursor-pointer ${
                    isSelected ? "bg-[#22242a]" : "hover:bg-[#1a1c21]"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#17181c] border border-white/15 flex items-center justify-center shrink-0 text-white shadow-inner">
                      <ModelIcon
                        modelId={modelOpt.id}
                        className="w-4.5 h-4.5"
                        idSuffix={`menu-${modelOpt.id}`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-bold text-white truncate">
                          {modelOpt.name}
                        </span>
                        {modelOpt.isNew && (
                          <span className="text-[10px] font-extrabold tracking-wider text-[#3b82f6] uppercase">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        {modelOpt.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-[#3b82f6] shrink-0"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* COMPACT BLACK CHATGPT-STYLE PILL COMPOSER BAR */}
      <div className="w-full bg-[#1c1d20] text-gray-100 rounded-[28px] px-3 py-2 shadow-[0_6px_24px_rgba(0,0,0,0.18)] border border-white/10 transition-all">
        {/* HIDDEN FILE INPUT */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,audio/*,.pdf,.csv,.txt,.json,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* PREVIEW CHIP LAMPIRAN FILE & VOICE NOTE (VN) */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2 pb-1.5 border-b border-white/10">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-[#2b2d31] border border-white/10 rounded-2xl px-2.5 py-1 text-xs text-gray-100 max-w-full"
              >
                {att.isVoiceNote ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[11px]">
                      🎤
                    </span>
                    <span className="font-bold text-white text-[11px]">
                      {att.name}
                    </span>
                    {att.dataUrl && (
                      <audio
                        src={att.dataUrl}
                        controls
                        className="h-5 w-24 sm:w-32 ml-1"
                      />
                    )}
                  </div>
                ) : att.mimeType.startsWith("image/") && att.dataUrl ? (
                  <div className="flex items-center gap-1.5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-6 h-6 rounded-md object-cover border border-white/15"
                    />
                    <span className="font-semibold text-white text-[11px] truncate max-w-[130px]">
                      {att.name}
                    </span>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">📄</span>
                    <span className="font-semibold text-white text-[11px] truncate max-w-[140px]">
                      {att.name}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="w-4 h-4 rounded-full hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center text-[10px] transition cursor-pointer"
                  title="Hapus lampiran"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PANEL PEREKAM VOICE NOTE (VN) SAAT AKTIF */}
        {isRecordingVn ? (
          <div className="flex items-center justify-between gap-2 py-0.5 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
              <span className="text-xs font-bold text-red-400 truncate">
                Merekam VN • {formatDuration(recordingSeconds)}
              </span>
              {liveTranscript && (
                <span className="text-xs text-gray-300 truncate hidden sm:inline">
                  — &ldquo;{liveTranscript}&rdquo;
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={cancelVoiceNoteRecording}
                className="px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={finishVoiceNoteRecording}
                className="px-3 py-1 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold cursor-pointer transition"
              >
                ✓ Lampirkan
              </button>
            </div>
          </div>
        ) : (
          /* COMPACT SINGLE-ROW HORIZONTAL CHATGPT BAR: [+] [Input] [Model v] [Mic] [Blue Action] */
          <div className="flex items-center gap-2">
            {/* TOMBOL + UPLOAD FILE */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-8 h-8 rounded-full hover:bg-[#2b2d31] text-gray-300 hover:text-white flex items-center justify-center transition cursor-pointer shrink-0"
              title="Lampirkan File (Gambar, PDF, CSV Formulasi, Dokumen, Audio)"
              aria-label="Upload File"
            >
              <svg
                className="w-5 h-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>

            {/* TEXTAREA COMPACT */}
            <textarea
              ref={textareaRef}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              rows={1}
              className="flex-1 min-w-0 bg-transparent border-none text-sm text-gray-100 placeholder-gray-400 focus:outline-none resize-none font-sans leading-6 py-0.5 max-h-28 overflow-y-auto"
            />

            {/* KANAN: MODEL PICKER + MIC + DYNAMIC BLUE VOICE/SEND BUTTON */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {/* MODEL SELECTOR BUTTON */}
              <button
                type="button"
                onClick={() => setIsModelMenuOpen((prev) => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full hover:bg-[#2b2d31] text-gray-200 text-xs font-semibold transition cursor-pointer whitespace-nowrap"
                title="Pilih Model AI (Auto, GPT-6 Luna, Gemini 3.8 Flash, Gemini 3.8 Pro, GPT-6 Omni)"
              >
                <ModelIcon
                  modelId={currentModelOpt.id}
                  className="w-3.5 h-3.5 text-gray-100 shrink-0"
                  idSuffix={`bar-${compact ? "compact" : "main"}`}
                />
                <span className="hidden xs:inline sm:inline">
                  {currentModelOpt.shortName}
                </span>
                <svg
                  className={`w-3 h-3 text-gray-400 transition-transform ${
                    isModelMenuOpen ? "rotate-180" : ""
                  }`}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6 9 12 15 18 9" />
                </svg>
              </button>

              {/* TOMBOL MICROPHONE / VOICE NOTE (VN) */}
              <button
                type="button"
                onClick={startVoiceNoteRecording}
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-[#2b2d31] text-gray-300 hover:text-white transition cursor-pointer shrink-0"
                title="Rekam Pesan Suara / Dikte Mikrofon"
                aria-label="Voice Note"
              >
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  <line x1="12" y1="19" x2="12" y2="22" />
                </svg>
              </button>

              {/* TOMBOL BULAT BIRU DINAMIS (4-BAR VOICE WAVEFORM -> PANAH KIRIM ↑ SAAT MENGETIK) */}
              <button
                type="button"
                onClick={handlePrimaryRightButtonClick}
                disabled={isLoading}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-all shadow-sm shrink-0 ${
                  isLoading
                    ? "bg-[#2563eb]/50 text-white/60 cursor-not-allowed"
                    : "bg-[#2563eb] hover:bg-[#1d4ed8] active:scale-95 text-white cursor-pointer"
                }`}
                title={
                  hasContentToSend
                    ? "Kirim Pesan"
                    : "Mode Bicara Suara Interaktif (Seperti Teleponan dengan AI)"
                }
                aria-label={
                  hasContentToSend
                    ? "Send Message"
                    : "Start Interactive Voice Mode"
                }
              >
                {hasContentToSend ? (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <line x1="12" y1="19" x2="12" y2="5" />
                    <polyline points="5 12 12 5 19 12" />
                  </svg>
                ) : (
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <rect
                      x="4.5"
                      y="9"
                      width="2.6"
                      height="6"
                      rx="1.3"
                      fill="currentColor"
                    />
                    <rect
                      x="9.2"
                      y="5"
                      width="2.6"
                      height="14"
                      rx="1.3"
                      fill="currentColor"
                    />
                    <rect
                      x="13.9"
                      y="7"
                      width="2.6"
                      height="10"
                      rx="1.3"
                      fill="currentColor"
                    />
                    <rect
                      x="18.6"
                      y="9.5"
                      width="2.6"
                      height="5"
                      rx="1.3"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
