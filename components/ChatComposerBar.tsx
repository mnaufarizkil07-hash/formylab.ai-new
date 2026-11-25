"use client";

import React, { useState, useRef, useEffect } from "react";
import { Mic, MicOff, X } from "lucide-react";
import {
  AI_MODEL_OPTIONS,
  AiModelId,
  ModelIcon,
  getModelOption,
} from "./AiModelLogos";
import {
  ChatAttachment,
  formatDuration,
  formatFileSize,
} from "../lib/chatStorage";
import { analyzeImageInBrowser } from "../lib/imageVisionEngine";

export interface MultimodalSendOptions {
  interactionMode?: "chat" | "voice_note" | "voice_call" | "vision";
  audio?: {
    base64: string;
    mimeType: string;
  };
  image?: {
    base64: string;
    mimeType: string;
    name?: string;
  };
}

interface ChatComposerBarProps {
  selectedModel: AiModelId;
  onSelectModel: (model: AiModelId) => void;
  onSend: (
    text: string,
    attachments: ChatAttachment[],
    options?: MultimodalSendOptions
  ) => void;
  onStartVoiceCall?: () => void;
  isVoiceActive?: boolean;
  isVoiceMicMuted?: boolean;
  onToggleVoiceMicMute?: () => void;
  onEndVoiceCall?: () => void;
  isLoading: boolean;
  compact?: boolean;
  placeholder?: string;
}

const PREFERRED_AUDIO_MIMES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
];

function detectSupportedAudioMimeType(): string {
  if (typeof window === "undefined" || typeof MediaRecorder === "undefined") {
    return "";
  }
  for (const candidate of PREFERRED_AUDIO_MIMES) {
    try {
      if (
        typeof MediaRecorder.isTypeSupported === "function" &&
        MediaRecorder.isTypeSupported(candidate)
      ) {
        return candidate;
      }
    } catch {
      // ignore
    }
  }
  return "";
}

function stripDataUrlHeader(dataUrl: string): string {
  const commaIdx = dataUrl.indexOf(",");
  if (dataUrl.startsWith("data:") && commaIdx !== -1) {
    return dataUrl.slice(commaIdx + 1).trim();
  }
  return dataUrl.replace(/^data:[^;]+;base64,/i, "").trim();
}

/**
 * Resize & compress image on client <canvas>:
 * - Longest side capped at 1400px (proportional scaling)
 * - Exported as image/jpeg with quality 0.85 (< 400KB, crisp INCI/COA text)
 */
async function resizeAndCompressImageForVision(
  sourceDataUrl: string,
  maxDimension = 1400,
  quality = 0.85
): Promise<{ dataUrl: string; base64: string; mimeType: string; byteSize: number }> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      const clean = stripDataUrlHeader(sourceDataUrl);
      resolve({
        dataUrl: sourceDataUrl,
        base64: clean,
        mimeType: "image/jpeg",
        byteSize: Math.round((clean.length * 3) / 4),
      });
      return;
    }

    const img = new window.Image();
    img.onload = () => {
      try {
        let targetW = img.naturalWidth || img.width || 800;
        let targetH = img.naturalHeight || img.height || 800;
        const longestSide = Math.max(targetW, targetH);

        if (longestSide > maxDimension) {
          const scale = maxDimension / longestSide;
          targetW = Math.max(1, Math.round(targetW * scale));
          targetH = Math.max(1, Math.round(targetH * scale));
        }

        const canvas = document.createElement("canvas");
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          const clean = stripDataUrlHeader(sourceDataUrl);
          resolve({
            dataUrl: sourceDataUrl,
            base64: clean,
            mimeType: "image/jpeg",
            byteSize: Math.round((clean.length * 3) / 4),
          });
          return;
        }

        // Fill white background for transparent PNGs before exporting to JPEG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, targetW, targetH);
        ctx.drawImage(img, 0, 0, targetW, targetH);

        const compressedDataUrl = canvas.toDataURL("image/jpeg", quality);
        const cleanBase64 = stripDataUrlHeader(compressedDataUrl);
        const estimatedBytes = Math.round((cleanBase64.length * 3) / 4);

        resolve({
          dataUrl: compressedDataUrl,
          base64: cleanBase64,
          mimeType: "image/jpeg",
          byteSize: estimatedBytes,
        });
      } catch {
        const clean = stripDataUrlHeader(sourceDataUrl);
        resolve({
          dataUrl: sourceDataUrl,
          base64: clean,
          mimeType: "image/jpeg",
          byteSize: Math.round((clean.length * 3) / 4),
        });
      }
    };
    img.onerror = () => {
      const clean = stripDataUrlHeader(sourceDataUrl);
      resolve({
        dataUrl: sourceDataUrl,
        base64: clean,
        mimeType: "image/jpeg",
        byteSize: Math.round((clean.length * 3) / 4),
      });
    };
    img.src = sourceDataUrl;
  });
}

export default function ChatComposerBar({
  selectedModel,
  onSelectModel,
  onSend,
  onStartVoiceCall,
  isVoiceActive = false,
  isVoiceMicMuted = false,
  onToggleVoiceMicMute,
  onEndVoiceCall,
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

  // Voice Note (VN) Recording States
  const [isRecordingVn, setIsRecordingVn] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [liveTranscript, setLiveTranscript] = useState("");
  const [composerNotice, setComposerNotice] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const speechRecRef = useRef<{ stop: () => void } | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const attachCounterRef = useRef(1);
  const pendingOcrMapRef = useRef<Map<string, Promise<string>>>(new Map());
  const resolvedOcrTextMapRef = useRef<Map<string, string>>(new Map());

  const currentModelOpt = getModelOption(selectedModel);

  const stopAllActiveStreamTracks = () => {
    if (mediaStreamRef.current) {
      try {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      } catch {
        // ignore
      }
      mediaStreamRef.current = null;
    }
    if (mediaRecorderRef.current?.stream) {
      try {
        mediaRecorderRef.current.stream
          .getTracks()
          .forEach((track) => track.stop());
      } catch {
        // ignore
      }
    }
    if (speechRecRef.current) {
      try {
        speechRecRef.current.stop();
      } catch {
        // ignore
      }
      speechRecRef.current = null;
    }
  };

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "24px";
    const nextHeight = Math.min(el.scrollHeight, 112);
    el.style.height = `${Math.max(24, nextHeight)}px`;
  }, [inputText]);

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

  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
      stopAllActiveStreamTracks();
    };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setComposerNotice("");
    const newAttachments: ChatAttachment[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const id = `att-${attachCounterRef.current++}`;
      let sizeLabel = formatFileSize(file.size);
      let finalMimeType = file.type || "application/octet-stream";

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

      if (file.size <= 15 * 1024 * 1024) {
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

      if (file.type.startsWith("image/") && dataUrl) {
        const [sig, compressed] = await Promise.all([
          analyzeImageInBrowser(dataUrl),
          resizeAndCompressImageForVision(dataUrl, 1400, 0.85),
        ]);
        dataUrl = compressed.dataUrl;
        finalMimeType = compressed.mimeType;
        sizeLabel = formatFileSize(compressed.byteSize);
        const sigBlock = sig ? `[VISUAL_SIGNATURE: ${JSON.stringify(sig)}]` : "";
        textPreview = sigBlock || undefined;
      }

      newAttachments.push({
        id,
        name: file.name,
        mimeType: finalMimeType,
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
    pendingOcrMapRef.current.delete(id);
    resolvedOcrTextMapRef.current.delete(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const startVoiceNoteRecording = async () => {
    setComposerNotice("");
    if (
      typeof navigator === "undefined" ||
      !navigator.mediaDevices ||
      typeof navigator.mediaDevices.getUserMedia !== "function"
    ) {
      setComposerNotice(
        "Browser ini tidak mendukung akses mikrofon (getUserMedia)."
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });
      mediaStreamRef.current = stream;

      const supportedMime = detectSupportedAudioMimeType();
      const recorder = supportedMime
        ? new MediaRecorder(stream, { mimeType: supportedMime })
        : new MediaRecorder(stream);

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      setIsRecordingVn(true);
      setRecordingSeconds(0);
      setLiveTranscript("");

      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.start(250);

      // Optional browser speech recognition preview while recording VN
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
          speechRecRef.current = recognition;
          recognition.start();
        }
      } catch {
        // SpeechRecognition preview is optional; actual transcription happens via Gemini inlineData
      }
    } catch {
      stopAllActiveStreamTracks();
      setIsRecordingVn(false);
      setComposerNotice(
        "Izin mikrofon ditolak atau perangkat audio tidak ditemukan. Mohon izinkan akses mikrofon di browser."
      );
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
      } catch {
        // ignore
      }
      mediaRecorderRef.current = null;
    }
    stopAllActiveStreamTracks();
    audioChunksRef.current = [];
    setIsRecordingVn(false);
    setRecordingSeconds(0);
    setLiveTranscript("");
  };

  const finishVoiceNoteRecording = async (sendImmediately = true) => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }

    const durationSec = Math.max(1, recordingSeconds);

    let recordedBlob: Blob | null = null;
    let rawMimeType = "audio/webm";
    let chunkCount = 0;

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      const recorder = mediaRecorderRef.current;
      rawMimeType = recorder.mimeType || "audio/webm";
      recordedBlob = await new Promise<Blob | null>((resolve) => {
        recorder.onstop = () => {
          stopAllActiveStreamTracks();
          chunkCount = audioChunksRef.current.length;
          if (chunkCount > 0) {
            const b = new Blob(audioChunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            });
            resolve(b);
          } else {
            resolve(null);
          }
        };
        try {
          recorder.stop();
        } catch {
          stopAllActiveStreamTracks();
          resolve(null);
        }
      });
      mediaRecorderRef.current = null;
    } else {
      stopAllActiveStreamTracks();
    }

    setIsRecordingVn(false);
    setRecordingSeconds(0);
    const fallbackPreview = liveTranscript.trim();
    setLiveTranscript("");

    // Guard against empty or < 500ms audio recording (chunks are emitted every 250ms)
    if (
      (recordingSeconds < 1 && chunkCount < 2) ||
      !recordedBlob ||
      recordedBlob.size === 0
    ) {
      setComposerNotice(
        "Rekaman Voice Note terlalu singkat (< 0.5 detik) atau kosong. Silakan rekam ulang pesan suara Anda."
      );
      return;
    }

    const cleanMime =
      (recordedBlob.type || rawMimeType || "audio/webm")
        .split(";")[0]
        .trim() || "audio/webm";

    const audioDataUrl = await new Promise<string | undefined>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () =>
        resolve(typeof reader.result === "string" ? reader.result : undefined);
      reader.onerror = () => resolve(undefined);
      reader.readAsDataURL(recordedBlob!);
    });

    if (!audioDataUrl) {
      setComposerNotice("Gagal memproses data audio Voice Note.");
      return;
    }

    const cleanBase64 = stripDataUrlHeader(audioDataUrl);
    if (!cleanBase64) {
      setComposerNotice("Data rekaman Voice Note kosong.");
      return;
    }

    const vnAttachment: ChatAttachment = {
      id: `vn-${attachCounterRef.current++}`,
      name: `Voice Note (${formatDuration(durationSec)})`,
      mimeType: cleanMime,
      sizeLabel: `${formatDuration(durationSec)} • ${formatFileSize(recordedBlob.size)}`,
      dataUrl: audioDataUrl,
      textPreview: fallbackPreview || undefined,
      isVoiceNote: true,
      durationSec,
    };

    if (sendImmediately) {
      const textToSend = inputText.trim();
      setInputText("");
      if (textareaRef.current) {
        textareaRef.current.style.height = "24px";
      }
      onSend(textToSend, [vnAttachment], {
        interactionMode: "voice_note",
        audio: {
          base64: cleanBase64,
          mimeType: cleanMime,
        },
      });
    } else {
      setAttachments((prev) => [...prev, vnAttachment]);
    }
  };

  const hasContentToSend =
    inputText.trim().length > 0 || attachments.length > 0 || isRecordingVn;

  const handleSubmit = async () => {
    if (isLoading) return;
    if (isRecordingVn) {
      await finishVoiceNoteRecording(true);
      return;
    }
    if (!inputText.trim() && attachments.length === 0) return;

    setComposerNotice("");
    const textToSend = inputText.trim();
    const currentAttachments = [...attachments];
    setInputText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "24px";
    }

    const pendingPromises: Promise<string>[] = [];
    for (const att of currentAttachments) {
      const p = pendingOcrMapRef.current.get(att.id);
      if (p) pendingPromises.push(p);
    }
    if (pendingPromises.length > 0) {
      try {
        await Promise.race([
          Promise.all(pendingPromises),
          new Promise((resolve) => setTimeout(resolve, 2200)),
        ]);
      } catch {
        // ignore
      }
    }

    const enrichedAttachments = currentAttachments.map((att) => {
      const resolvedMeta = resolvedOcrTextMapRef.current.get(att.id);
      if (resolvedMeta) {
        return { ...att, textPreview: resolvedMeta };
      }
      return att;
    });

    // Check if an audio VN or image attachment is included to set multimodal options
    const vnAtt = enrichedAttachments.find(
      (a) => (a.isVoiceNote || a.mimeType.startsWith("audio/")) && a.dataUrl
    );
    const imgAtt = enrichedAttachments.find(
      (a) => a.mimeType.startsWith("image/") && a.dataUrl
    );

    let options: MultimodalSendOptions | undefined;
    if (vnAtt && vnAtt.dataUrl) {
      options = {
        interactionMode: "voice_note",
        audio: {
          base64: stripDataUrlHeader(vnAtt.dataUrl),
          mimeType: vnAtt.mimeType.split(";")[0].trim() || "audio/webm",
        },
      };
    } else if (imgAtt && imgAtt.dataUrl) {
      options = {
        interactionMode: "vision",
        image: {
          base64: stripDataUrlHeader(imgAtt.dataUrl),
          mimeType: imgAtt.mimeType.split(";")[0].trim() || "image/jpeg",
          name: imgAtt.name,
        },
      };
    }

    onSend(textToSend, enrichedAttachments, options);
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
      {/* POPOVER MODEL SELECTOR — Optical Glass Panel */}
      {isModelMenuOpen && (
        <div
          className={`absolute bottom-full mb-2.5 right-0 z-50 ${
            compact ? "w-[310px]" : "w-[330px] sm:w-[400px]"
          } card-glass-optical card-glass-static text-[#0B2B26] p-3`}
        >
          {/* FILTER TABS (Popular | OpenAI | Google) */}
          <div className="flex items-center gap-1.5 pb-2.5 mb-2 border-b border-[#0B2B26]/10 overflow-x-auto">
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
                  className={`px-3 py-1 text-xs cursor-pointer shrink-0 ${
                    isTabActive ? "btn-glass-primary" : "btn-glass-compact"
                  }`}
                >
                  <span>{tab.label}</span>
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
                  className={`w-full flex items-center justify-between gap-3 p-2.5 rounded-[12px] text-left transition-colors cursor-pointer border ${
                    isSelected
                      ? "bg-[#eefbf7] border-[#47C4A5]"
                      : "hover:bg-[#f6fdfb] border-transparent"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#f4fbf8] border border-[#0B2B26]/10 flex items-center justify-center shrink-0 text-[#0B2B26]">
                      <ModelIcon
                        modelId={modelOpt.id}
                        className="w-4.5 h-4.5"
                        idSuffix={`menu-${modelOpt.id}`}
                      />
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-medium text-[#0B2B26] truncate">
                          {modelOpt.name}
                        </span>
                        {modelOpt.isNew && (
                          <span className="text-[10px] font-medium tracking-[0.12em] text-[#0E7A78] uppercase">
                            NEW
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-[#365953] truncate mt-0.5">
                        {modelOpt.description}
                      </p>
                    </div>
                  </div>

                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-[#0E7A78] shrink-0"
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

      {/* CLEAN LIGHT THEME COMPOSER BAR */}
      <div className="w-full bg-white text-[#0B2B26] rounded-[24px] px-3.5 py-2.5 border border-[#0B2B26]/16 focus-within:border-[#3FC6C5] transition-colors shadow-none">
        {/* HIDDEN FILE INPUT */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/*,audio/*,.pdf,.csv,.txt,.json,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* INLINE NOTICE BANNER (IF MIC BLOCKED OR EMPTY VN) */}
        {composerNotice && (
          <div className="flex items-center justify-between gap-2 mb-2 px-3 py-1.5 rounded-[12px] bg-[#fef9e7] border border-[#9a6700]/20 text-[11px] text-[#9a6700]">
            <span>{composerNotice}</span>
            <button
              type="button"
              onClick={() => setComposerNotice("")}
              className="text-[#9a6700] hover:text-[#0B2B26] font-medium px-1 cursor-pointer"
              aria-label="Tutup pemberitahuan"
            >
              ×
            </button>
          </div>
        )}

        {/* PREVIEW CHIP LAMPIRAN FILE, THUMBNAIL GAMBAR & VOICE NOTE (VN) */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2 pb-2 border-b border-[#0B2B26]/10">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 bg-[#f4fbf8] border border-[#0B2B26]/12 rounded-[14px] px-2.5 py-1.5 text-xs text-[#0B2B26] max-w-full"
              >
                {att.isVoiceNote ? (
                  <div className="flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-[#e8f8f8] text-[#0E7A78] flex items-center justify-center font-medium text-[11px]">
                      🎤
                    </span>
                    <span className="font-medium text-[#0B2B26] text-[11px]">
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
                  <div className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={att.dataUrl}
                      alt={att.name}
                      className="w-10 h-10 rounded-[8px] object-cover border border-[#0B2B26]/12 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="font-medium text-[#0B2B26] text-[11px] truncate max-w-[140px]">
                        {att.name}
                      </div>
                      <div className="text-[10px] text-[#365953] font-mono tabular-nums">
                        {att.sizeLabel} · Computer Vision
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">📄</span>
                    <span className="font-medium text-[#0B2B26] text-[11px] truncate max-w-[140px]">
                      {att.name}
                    </span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => handleRemoveAttachment(att.id)}
                  className="w-5 h-5 rounded-full hover:bg-[#0B2B26]/10 text-[#365953] hover:text-[#0B2B26] flex items-center justify-center text-xs transition-colors cursor-pointer shrink-0"
                  title="Hapus lampiran"
                  aria-label="Hapus lampiran"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* PANEL PEREKAM VOICE NOTE (VN) SAAT AKTIF */}
        {isRecordingVn ? (
          <div className="flex items-center justify-between gap-2 py-0.5 px-1">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full bg-[#b91c1c] animate-ping shrink-0" />
              <span className="text-xs font-medium text-[#b91c1c] truncate font-mono tabular-nums">
                Merekam VN •{" "}
                {String(Math.floor(recordingSeconds / 60)).padStart(2, "0")}:
                {String(recordingSeconds % 60).padStart(2, "0")}
              </span>
              {liveTranscript && (
                <span className="text-xs text-[#365953] truncate hidden sm:inline">
                  · &ldquo;{liveTranscript}&rdquo;
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={cancelVoiceNoteRecording}
                className="btn-glass-secondary px-3 py-1.5 text-xs cursor-pointer"
              >
                <span>Batal</span>
              </button>
              <button
                type="button"
                onClick={() => finishVoiceNoteRecording(true)}
                className="btn-glass-primary px-3.5 py-1.5 text-xs cursor-pointer"
              >
                <span>Kirim VN</span>
              </button>
            </div>
          </div>
        ) : (
          /* COMPACT SINGLE-ROW HORIZONTAL BAR */
          <div className="flex items-center gap-2">
            {/* TOMBOL + UPLOAD FILE */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="btn-glass-compact w-8 h-8 flex items-center justify-center cursor-pointer shrink-0"
              title="Lampirkan File (Gambar, PDF, CSV Formulasi, Dokumen, Audio)"
              aria-label="Upload File"
            >
              <svg
                className="w-4 h-4 text-[#0B2B26]"
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
              className="flex-1 min-w-0 bg-transparent border-none text-sm text-[#0B2B26] placeholder-[#365953]/60 focus:outline-none resize-none font-matter leading-6 py-0.5 max-h-28 overflow-y-auto"
            />

            {/* KANAN: KONTROL INLINE VOICE (MUTE + END X) ATAU MODEL PICKER + MIC + SEND/VOICE */}
            <div className="flex items-center gap-1.5 shrink-0">
              {isVoiceActive ? (
                <>
                  {hasContentToSend && (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={isLoading}
                      className="btn-glass-primary min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shrink-0 cursor-pointer"
                      title="Kirim Pesan"
                      aria-label="Kirim Pesan"
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
                  )}

                  {/* TOMBOL LIQUID GLASS 1: MUTE / UNMUTE MIKROFON */}
                  <button
                    type="button"
                    onClick={onToggleVoiceMicMute}
                    aria-pressed={isVoiceMicMuted}
                    title={
                      isVoiceMicMuted
                        ? "Aktifkan Mikrofon"
                        : "Bisukan Mikrofon"
                    }
                    aria-label={
                      isVoiceMicMuted
                        ? "Aktifkan Mikrofon"
                        : "Bisukan Mikrofon"
                    }
                    className={`min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shrink-0 backdrop-blur-[18px] backdrop-saturate-[180%] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.96] cursor-pointer ${
                      isVoiceMicMuted
                        ? "bg-red-500/12 hover:bg-red-500/20 text-red-700 border border-red-400/35 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_18px_-10px_rgba(185,28,28,0.24)]"
                        : "bg-white/75 hover:bg-white/95 text-[#0B2B26] border border-[#0E807E]/30 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),0_8px_18px_-10px_rgba(14,128,126,0.22)]"
                    }`}
                  >
                    {isVoiceMicMuted ? (
                      <MicOff className="w-4 h-4" aria-hidden="true" />
                    ) : (
                      <Mic
                        className="w-4 h-4 text-[#0E807E]"
                        aria-hidden="true"
                      />
                    )}
                  </button>

                  {/* TOMBOL LIQUID GLASS 2: AKHIRI MODE SUARA (X) */}
                  <button
                    type="button"
                    onClick={onEndVoiceCall}
                    title="Akhiri Mode Suara AI"
                    aria-label="Akhiri Mode Suara AI"
                    className="min-h-[44px] min-w-[44px] rounded-full flex items-center justify-center shrink-0 text-red-700 bg-red-500/12 hover:bg-red-500/22 border border-red-400/35 backdrop-blur-[18px] backdrop-saturate-[180%] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_8px_18px_-10px_rgba(185,28,28,0.24)] transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.96] cursor-pointer"
                  >
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                </>
              ) : (
                <>
                  {/* MODEL SELECTOR BUTTON */}
                  <button
                    type="button"
                    onClick={() => setIsModelMenuOpen((prev) => !prev)}
                    className="btn-glass-compact flex items-center gap-1.5 px-2.5 py-1.5 text-xs cursor-pointer whitespace-nowrap"
                    title="Pilih Model AI (Auto, GPT-6 Luna, Gemini 3.8 Flash, Gemini 3.8 Pro, GPT-6 Omni)"
                  >
                    <ModelIcon
                      modelId={currentModelOpt.id}
                      className="w-3.5 h-3.5 text-[#0E7A78] shrink-0"
                      idSuffix={`bar-${compact ? "compact" : "main"}`}
                    />
                    <span className="hidden xs:inline sm:inline">
                      {currentModelOpt.shortName}
                    </span>
                    <svg
                      className={`w-3 h-3 text-[#234741] transition-transform ${
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
                    className="btn-glass-compact w-8 h-8 flex items-center justify-center cursor-pointer shrink-0"
                    title="Rekam Pesan Suara / Dikte Mikrofon"
                    aria-label="Voice Note"
                  >
                    <svg
                      className="w-4 h-4 text-[#0B2B26]"
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

                  {/* TOMBOL AKSI UTAMA (VOICE WAVEFORM -> PANAH KIRIM ↑ SAAT MENGETIK) */}
                  <button
                    type="button"
                    onClick={handlePrimaryRightButtonClick}
                    disabled={isLoading}
                    className="btn-glass-primary w-9 h-9 flex items-center justify-center shrink-0 cursor-pointer"
                    title={
                      hasContentToSend
                        ? "Kirim Pesan"
                        : "Mode Bicara Suara Interaktif (Inline di Room Chat)"
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
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
