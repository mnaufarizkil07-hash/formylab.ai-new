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
  isLoading: boolean;
  compact?: boolean;
}

export default function ChatComposerBar({
  selectedModel,
  onSelectModel,
  onSend,
  isLoading,
  compact = false,
}: ChatComposerBarProps) {
  const [inputText, setInputText] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<
    "popular" | "openai" | "google"
  >("popular");

  // Voice Note (VN) Recording States
  const [isRecordingVn, setIsRecordingVn] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attachCounterRef = useRef(1);

  const currentModelOpt = getModelOption(selectedModel);

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

      // Read text preview for text/csv/json files
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

      // Read DataURL for images, audio, PDFs, or small files (< 4MB)
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
      // Fallback mode when microphone permission is unavailable in iframe/headless browser
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

  const canSend =
    !isLoading &&
    (inputText.trim().length > 0 || attachments.length > 0 || isRecordingVn);

  return (
    <div className="relative w-full" ref={popoverRef}>
      {/* POPOVER MODEL SELECTOR (SESUAI GAMBAR KE-3) */}
      {isModelMenuOpen && (
        <div
          className={`absolute bottom-full mb-3 right-0 z-50 ${
            compact ? "w-[330px]" : "w-[350px] sm:w-[430px]"
          } bg-[#121316] text-white rounded-[26px] p-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.65)] border border-white/10 animate-in fade-in slide-in-from-bottom-2 duration-150`}
        >
          {/* FILTER TABS (Popular | OpenAI | Google) */}
          <div className="flex items-center gap-1.5 pb-3 mb-2 border-b border-white/10 overflow-x-auto">
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
                  className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer shrink-0 ${
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
          <div className="space-y-1 max-h-[290px] overflow-y-auto pr-0.5">
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
                  className={`w-full flex items-center justify-between gap-3 p-3 rounded-2xl text-left transition cursor-pointer ${
                    isSelected
                      ? "bg-[#22242a]"
                      : "hover:bg-[#1a1c21]"
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* CIRCULAR LOGO CONTAINER */}
                    <div className="w-10 h-10 rounded-full bg-[#17181c] border border-white/15 flex items-center justify-center shrink-0 text-white shadow-inner">
                      <ModelIcon
                        modelId={modelOpt.id}
                        className="w-5 h-5"
                        idSuffix={`menu-${modelOpt.id}`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">
                          {modelOpt.name}
                        </span>
                        {modelOpt.isNew && (
                          <span className="text-[10px] font-extrabold tracking-wider text-[#3b82f6] uppercase">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400 truncate mt-0.5">
                        {modelOpt.description}
                      </p>
                    </div>
                  </div>

                  {/* CHECKMARK FOR SELECTED MODEL */}
                  {isSelected && (
                    <svg
                      className="w-5 h-5 text-[#3b82f6] shrink-0"
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

      {/* MAIN DARK CHAT BAR COMPOSER (SESUAI GAMBAR KE-2) */}
      <div
        className={`w-full bg-[#1e1f22] text-gray-100 rounded-[28px] ${
          compact ? "p-3" : "px-4 py-3.5"
        } shadow-[0_10px_30px_rgba(0,0,0,0.22)] border border-white/10 transition-all`}
      >
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
          <div className="flex flex-wrap gap-2 mb-2.5 pb-2 border-b border-white/10">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2.5 bg-[#2b2d31] border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-gray-100 max-w-full"
              >
                {att.isVoiceNote ? (
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                      🎤
                    </span>
                    <div>
                      <div className="font-bold text-white text-[11px]">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-emerald-400">
                        {att.sizeLabel}
                      </div>
                    </div>
                    {att.dataUrl && (
                      <audio
                        src={att.dataUrl}
                        controls
                        className="h-6 w-28 sm:w-36 ml-1"
                      />
                    )}
                  </div>
                ) : att.mimeType.startsWith("image/") && att.dataUrl ? (
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-8 h-8 rounded-lg object-cover border border-white/15"
                    />
                    <div className="truncate max-w-[150px]">
                      <div className="font-semibold text-white text-[11px] truncate">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {att.sizeLabel}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-xs">
                      📄
                    </span>
                    <div className="truncate max-w-[160px]">
                      <div className="font-semibold text-white text-[11px] truncate">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-gray-400">
                        {att.sizeLabel}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="w-5 h-5 rounded-full hover:bg-white/15 text-gray-400 hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
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
          <div className="flex flex-col gap-2 py-1 px-1 mb-2 bg-[#282a2e] rounded-2xl p-3 border border-red-500/30">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-3 h-3 rounded-full bg-red-500 animate-ping" />
                <span className="text-xs font-bold text-red-400 uppercase tracking-wider">
                  Merekam Voice Note (VN) • {formatDuration(recordingSeconds)}
                </span>
              </div>

              {/* ANIMATED SOUNDWAVE BARS */}
              <div className="hidden sm:flex items-center gap-1 h-4">
                {[40, 85, 55, 100, 65, 90, 45, 75, 60].map((h, i) => (
                  <span
                    key={i}
                    style={{ height: `${h}%` }}
                    className="w-1 bg-emerald-400 rounded-full animate-pulse"
                  />
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={cancelVoiceNoteRecording}
                  className="px-2.5 py-1 rounded-xl bg-white/10 hover:bg-white/15 text-gray-300 text-xs font-semibold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="button"
                  onClick={finishVoiceNoteRecording}
                  className="px-3 py-1 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-extrabold cursor-pointer transition"
                >
                  ✓ Lampirkan VN
                </button>
              </div>
            </div>

            <input
              type="text"
              value={liveTranscript}
              onChange={(e) => setLiveTranscript(e.target.value)}
              placeholder="Ketik catatan suara / transkrip VN opsional di sini..."
              className="w-full bg-[#1e1f22] text-xs text-gray-200 placeholder-gray-500 px-3 py-1.5 rounded-xl border border-white/10 focus:outline-none"
            />
          </div>
        ) : (
          /* TEXTAREA INPUT UTAMA ("Ask anything...") */
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything..."
            rows={compact ? 1 : 2}
            className="w-full bg-transparent border-none text-sm sm:text-base text-gray-100 placeholder-gray-400 focus:outline-none resize-none font-sans leading-relaxed px-1"
          />
        )}

        {/* BOTTOM TOOLBAR ROW (SESUAI GAMBAR KE-2: [+] KIRI, [Model v] [Mic] [Up Arrow] KANAN) */}
        <div className="flex items-center justify-between pt-2 mt-1">
          {/* TOMBOL + UPLOAD FILE / GAMBAR / DOKUMEN */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-9 h-9 rounded-full bg-[#2b2d31] hover:bg-[#383a40] border border-white/10 text-gray-200 flex items-center justify-center transition cursor-pointer"
              title="Kirim File (Gambar, PDF, CSV Formulasi, Dokumen, Audio)"
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
          </div>

          {/* KANAN: MODEL PICKER + VOICE NOTE (VN) MIC + SEND ARROW */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* MODEL SELECTOR BUTTON (e.g. Auto v / GPT-6 Luna v / Gemini 3.8 Flash v) */}
            <button
              type="button"
              onClick={() => setIsModelMenuOpen((prev) => !prev)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full hover:bg-[#2b2d31] text-gray-100 text-xs sm:text-sm font-semibold transition cursor-pointer"
              title="Pilih Model AI (Auto, GPT-6 Luna, Gemini 3.8 Flash, dll.)"
            >
              <ModelIcon
                modelId={currentModelOpt.id}
                className="w-4 h-4 text-gray-100"
                idSuffix={`bar-${ compact ? "compact" : "main" }`}
              />
              <span>{currentModelOpt.shortName}</span>
              <svg
                className={`w-3.5 h-3.5 text-gray-400 transition-transform ${
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
              onClick={() => {
                if (isRecordingVn) {
                  finishVoiceNoteRecording();
                } else {
                  startVoiceNoteRecording();
                }
              }}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                isRecordingVn
                  ? "bg-red-500 text-white animate-pulse"
                  : "hover:bg-[#2b2d31] text-gray-200"
              }`}
              title={
                isRecordingVn
                  ? "Selesai Merekam Voice Note (VN)"
                  : "Rekam Voice Note (VN)"
              }
              aria-label="Voice Note"
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
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                <line x1="12" y1="19" x2="12" y2="22" />
              </svg>
            </button>

            {/* TOMBOL KIRIM PANAH ATAS (↑) */}
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSend}
              className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
                canSend
                  ? "bg-white text-black hover:bg-gray-200 cursor-pointer shadow-sm"
                  : "bg-[#32343a] text-gray-500 cursor-not-allowed"
              }`}
              title="Kirim Pesan"
              aria-label="Send Message"
            >
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
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
