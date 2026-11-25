"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Menu,
  ArrowUpRight,
  X,
  Plus,
  Trash2,
  MessageSquare,
} from "lucide-react";
import ChatComposerBar, {
  MultimodalSendOptions,
} from "./ChatComposerBar";
import FormattedChatText from "./FormattedChatText";
import {
  AiModelId,
  ModelIcon,
  getModelOption,
} from "./AiModelLogos";
import {
  ChatAttachment,
  ChatMessage,
  ChatSession,
  createDefaultSession,
  generateSessionTitle,
  generateUniqueId,
  getStoredSessions,
  saveStoredSessions,
} from "../lib/chatStorage";

export default function FloatingChatWidget() {
  const pathname = usePathname();
  const router = useRouter();

  // Do not render floating widget on the landing/login page (/) or inside the dedicated /chat page
  const isHiddenRoute = pathname === "/" || pathname === "/chat";

  const [isOpen, setIsOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<AiModelId>("auto");
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showSessionDrawer, setShowSessionDrawer] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const initializeSessions = () => {
    const stored = getStoredSessions();
    if (stored.length > 0) {
      setSessions(stored);
      if (!activeSessionId || !stored.find((s) => s.id === activeSessionId)) {
        setActiveSessionId(stored[0].id);
        setSelectedModel(getModelOption(stored[0].model).id);
      }
    } else {
      const def = createDefaultSession();
      setSessions([def]);
      setActiveSessionId(def.id);
      saveStoredSessions([def]);
    }
  };

  const handleToggleWidget = () => {
    if (!isOpen) {
      initializeSessions();
    }
    setIsOpen(!isOpen);
    setShowSessionDrawer(false);
  };

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    if (isOpen) {
      const shouldReduceMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      messagesEndRef.current?.scrollIntoView({
        behavior: shouldReduceMotion ? "auto" : "smooth",
      });
    }
  }, [isOpen, activeSession?.messages, isLoading]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        setShowSessionDrawer(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  const handleSelectModel = (model: AiModelId) => {
    setSelectedModel(model);
    if (activeSession) {
      const updated = sessions.map((s) =>
        s.id === activeSession.id ? { ...s, model } : s
      );
      setSessions(updated);
      saveStoredSessions(updated);
    }
  };

  const handleNewSession = () => {
    const newSess = createDefaultSession();
    newSess.model = selectedModel;
    const updated = [newSess, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSess.id);
    saveStoredSessions(updated);
    setShowSessionDrawer(false);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const chosen = sessions.find((s) => s.id === id);
    if (chosen) {
      setSelectedModel(getModelOption(chosen.model).id);
    }
    setShowSessionDrawer(false);
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const filtered = sessions.filter((s) => s.id !== id);
    if (filtered.length === 0) {
      const def = createDefaultSession();
      setSessions([def]);
      setActiveSessionId(def.id);
      saveStoredSessions([def]);
    } else {
      setSessions(filtered);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      saveStoredSessions(filtered);
    }
  };

  const handleSendMessage = async (
    text: string,
    attachments: ChatAttachment[] = [],
    options?: MultimodalSendOptions
  ) => {
    const hasAudioPayload = Boolean(options?.audio?.base64);
    const hasImagePayload = Boolean(options?.image?.base64);
    if (
      (!text &&
        attachments.length === 0 &&
        !hasAudioPayload &&
        !hasImagePayload) ||
      isLoading ||
      !activeSession
    )
      return;

    const isVoiceNote =
      options?.interactionMode === "voice_note" ||
      attachments.some((a) => a.isVoiceNote);
    const isVision =
      options?.interactionMode === "vision" ||
      hasImagePayload ||
      attachments.some((a) => a.mimeType.startsWith("image/"));

    setErrorMessage("");
    const userMsgId = generateUniqueId("float-u");

    const displayText =
      text ||
      (isVoiceNote
        ? "🎤 Mengirim Voice Note (VN)"
        : `📎 Mengirim ${attachments.length} file`);

    const userMsg: ChatMessage = {
      id: userMsgId,
      role: "user",
      content: displayText,
      timestamp: "Baru saja",
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    const isFirstUserMessage =
      activeSession.messages.filter((m) => m.role === "user").length === 0;
    const newTitle = isFirstUserMessage
      ? generateSessionTitle(
          text || attachments[0]?.textPreview || "",
          isVoiceNote,
          attachments.length > 0
        )
      : activeSession.title;

    const updatedMessages = [...activeSession.messages, userMsg];

    const updatedSessions = sessions.map((s) =>
      s.id === activeSession.id
        ? {
            ...s,
            title: newTitle,
            model: selectedModel,
            messages: updatedMessages,
          }
        : s
    );

    setSessions(updatedSessions);
    saveStoredSessions(updatedSessions);
    setIsLoading(true);

    try {
      const payloadMessages = updatedMessages
        .filter((m) => m.id !== "msg-welcome")
        .map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments,
        }));

      const geminiHistory = payloadMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        content: m.content,
        attachments: m.attachments,
      }));

      const requestPayload: Record<string, unknown> = {
        messages: payloadMessages,
        history: geminiHistory,
        model: selectedModel,
      };

      if (options?.interactionMode && options.interactionMode !== "chat") {
        requestPayload.interactionMode = options.interactionMode;
      }
      if (options?.audio?.base64) {
        requestPayload.audio = options.audio;
      }
      if (options?.image?.base64) {
        requestPayload.image = options.image;
      }

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestPayload),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const extractedTranscript =
          typeof data.transcript === "string" ? data.transcript.trim() : "";

        const messagesWithMemory = updatedMessages.map((m) => {
          if (m.id !== userMsgId) return m;
          if (isVoiceNote && extractedTranscript) {
            const updatedContent = text
              ? `[Voice Note]: ${extractedTranscript}\n\n${text}`
              : `[Voice Note]: ${extractedTranscript}`;
            const updatedAtts = m.attachments?.map((att) =>
              att.isVoiceNote
                ? { ...att, textPreview: extractedTranscript }
                : att
            );
            return {
              ...m,
              content: updatedContent,
              attachments: updatedAtts,
            };
          }
          if (isVision && m.attachments?.length) {
            const imgName =
              options?.image?.name || m.attachments[0]?.name || "Foto Lampiran";
            const visionSummarySnippet = data.reply
              .replace(/\s+/g, " ")
              .slice(0, 260);
            const updatedAtts = m.attachments.map((att) =>
              att.mimeType.startsWith("image/")
                ? {
                    ...att,
                    textPreview: `${att.textPreview ? att.textPreview + "\n" : ""}[Konteks Analisis Visual ${imgName}: ${visionSummarySnippet}]`,
                  }
                : att
            );
            return {
              ...m,
              attachments: updatedAtts,
            };
          }
          return m;
        });

        const botMsgId = generateUniqueId("float-b");
        const botMsg: ChatMessage = {
          id: botMsgId,
          role: "assistant",
          content: data.reply,
          modelBadge: selectedModel,
          timestamp: "Baru saja",
        };

        const finalMessages = [...messagesWithMemory, botMsg];
        const finalSessions = updatedSessions.map((s) =>
          s.id === activeSession.id ? { ...s, messages: finalMessages } : s
        );
        setSessions(finalSessions);
        saveStoredSessions(finalSessions);
      } else {
        setErrorMessage(data.error || "Gagal mendapatkan balasan dari AI.");
      }
    } catch {
      setErrorMessage("Gangguan koneksi ke AI.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isHiddenRoute) {
    return null;
  }

  const activeModelOpt = getModelOption(selectedModel);

  return (
    <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end select-none font-matter">
      {/* POPUP CHAT WINDOW: Optical Glass Shell + Crisp White Message Reading Area */}
      {isOpen && (
        <div
          id="ai-chemist-dialog"
          role="dialog"
          aria-label="AI Chemist Assistant"
          className="w-[calc(100vw-2rem)] sm:w-[370px] max-w-[370px] h-[min(590px,calc(100dvh-6.5rem))] mb-3 card-glass-optical card-glass-static flex flex-col overflow-hidden"
        >
          {/* HEADER POPUP (no nested backdrop-blur inside .card-glass-optical) */}
          <div className="bg-white/92 text-[#0B2B26] px-3 py-2.5 flex items-center justify-between gap-2 border-b border-[#0B2B26]/10">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => setShowSessionDrawer(!showSessionDrawer)}
                aria-expanded={showSessionDrawer}
                aria-controls="ai-chemist-session-drawer"
                className="btn-glass-compact px-3 min-h-[44px] min-w-[44px] text-xs flex items-center gap-1.5 cursor-pointer"
                title="Daftar Riwayat Chat"
              >
                <Menu aria-hidden="true" className="w-3.5 h-3.5 text-[#2E524C] shrink-0" />
                <span className="max-w-[125px] truncate text-xs font-medium text-[#0B2B26]">
                  {activeSession?.title || "AI Chemist"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="inline-flex items-center gap-1.5 text-[#2E524C] px-1.5 py-1 text-[11px] font-medium">
                <span aria-hidden="true" className="inline-flex">
                  <ModelIcon
                    modelId={activeModelOpt.id}
                    className="w-3.5 h-3.5"
                    idSuffix="float-head"
                  />
                </span>
                <span>{activeModelOpt.shortName}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/chat");
                }}
                className="btn-glass-compact min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
                title="Buka Halaman Penuh"
                aria-label="Buka Halaman Penuh"
              >
                <ArrowUpRight aria-hidden="true" className="w-4 h-4 text-[#0B2B26]" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  setShowSessionDrawer(false);
                }}
                className="btn-glass-compact min-h-[44px] min-w-[44px] inline-flex items-center justify-center cursor-pointer"
                title="Tutup"
                aria-label="Tutup AI Chemist"
              >
                <X aria-hidden="true" className="w-4 h-4 text-[#0B2B26]" />
              </button>
            </div>
          </div>

          {/* DRAWER RIWAYAT SESI CHAT (clean solid tint, no nested backdrop-blur) */}
          {showSessionDrawer && (
            <div
              id="ai-chemist-session-drawer"
              className="bg-[#f8fdfb] border-b border-[#0B2B26]/10 p-3 max-h-[210px] overflow-y-auto"
            >
              <div className="flex items-center justify-between gap-2 mb-2.5">
                <span className="eyebrow-label text-[10px] text-[#2E524C]">
                  Riwayat Chat ({sessions.length})
                </span>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="btn-glass-primary inline-flex items-center justify-center gap-1.5 px-3.5 min-h-[44px] text-[11px] cursor-pointer"
                >
                  <Plus aria-hidden="true" className="w-3.5 h-3.5 text-[#0B2B26]" />
                  <span>Chat Baru</span>
                </button>
              </div>

              <div className="space-y-1.5">
                {sessions.map((sess) => {
                  const sOpt = getModelOption(sess.model);
                  const isCurrent = sess.id === activeSessionId;
                  return (
                    <div
                      key={sess.id}
                      className={`flex items-center gap-1.5 rounded-[12px] p-1 transition-colors ${
                        isCurrent
                          ? "bg-white border border-[#47C4A5]/60"
                          : "border border-transparent hover:bg-white/80"
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectSession(sess.id)}
                        aria-current={isCurrent ? "true" : undefined}
                        className={`flex-1 min-w-0 min-h-[44px] px-2.5 py-2 rounded-[10px] flex items-center gap-2 text-left text-xs cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 ${
                          isCurrent
                            ? "text-[#0B2B26] font-medium"
                            : "text-[#2E524C] hover:text-[#0B2B26] font-normal"
                        }`}
                      >
                        <span aria-hidden="true" className="inline-flex shrink-0">
                          <ModelIcon
                            modelId={sOpt.id}
                            className="w-3.5 h-3.5 text-[#0E807E]"
                            idSuffix={`drawer-${sess.id}`}
                          />
                        </span>
                        <span className="truncate">{sess.title}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className="btn-glass-danger min-h-[44px] min-w-[44px] inline-flex items-center justify-center shrink-0 cursor-pointer"
                        title="Hapus riwayat"
                        aria-label={`Hapus riwayat ${sess.title}`}
                      >
                        <Trash2 aria-hidden="true" className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST CHAT MESSAGES: Crisp White Reading Area */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-white">
            {activeSession?.messages.map((m) => {
              const isUser = m.role === "user";
              const mOpt = getModelOption(m.modelBadge || selectedModel);

              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-[16px] leading-relaxed ${
                      isUser
                        ? "bg-[#0B2B26] text-white"
                        : "bg-[#f8fdfb] text-[#0B2B26] border border-[#0B2B26]/10"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-medium uppercase tracking-[0.08em] text-[#2E524C]">
                        <span aria-hidden="true" className="inline-flex">
                          <ModelIcon
                            modelId={mOpt.id}
                            className="w-3.5 h-3.5"
                            idSuffix={`wmsg-${m.id}`}
                          />
                        </span>
                        <span>{mOpt.name}</span>
                      </div>
                    )}

                    {/* RENDER ATTACHMENTS / VOICE NOTE IN WIDGET */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {m.attachments.map((att) => (
                          <div
                            key={att.id}
                            className={`rounded-[12px] p-2 border ${
                              isUser
                                ? "bg-white/10 border-white/15 text-white"
                                : "bg-white border-[#0B2B26]/10 text-[#0B2B26]"
                            }`}
                          >
                            {att.isVoiceNote ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-[11px]">
                                  🎤 {att.name}
                                </span>
                                {att.dataUrl && (
                                  <audio
                                    src={att.dataUrl}
                                    controls
                                    className="w-full h-7"
                                  />
                                )}
                              </div>
                            ) : (
                              <div className="font-medium text-[11px] truncate">
                                📎 {att.name} ({att.sizeLabel})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs">
                      <FormattedChatText
                        content={m.content}
                        tone={isUser ? "on-dark" : "light"}
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-[#2E524C] font-medium p-2">
                <div
                  aria-hidden="true"
                  className="animate-spin w-3.5 h-3.5 border-2 border-[#3FC6C5] border-t-transparent rounded-full"
                />
                <span>{activeModelOpt.name} sedang memproses...</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-[12px] bg-[#fef2f2] border border-[#b91c1c]/20 text-[#b91c1c] text-xs font-medium">
                ⚠️ {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* COMPOSER BAR IN FLOATING WIDGET (clean semi-solid surface, no nested backdrop-blur) */}
          <div className="p-2.5 bg-white/95 border-t border-[#0B2B26]/10">
            <ChatComposerBar
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
              onSend={handleSendMessage}
              isLoading={isLoading}
              compact
            />
          </div>
        </div>
      )}

      {/* OPTICAL GLASS FLOATING TRIGGER PILL */}
      <button
        type="button"
        onClick={handleToggleWidget}
        aria-expanded={isOpen}
        aria-controls="ai-chemist-dialog"
        aria-label={isOpen ? "Tutup AI Chemist" : "Buka AI Chemist"}
        className="btn-glass-compact group inline-flex items-center justify-center gap-2.5 px-4 min-h-[44px] min-w-[44px] cursor-pointer"
        title="Buka AI Chemist"
      >
        <span
          aria-hidden="true"
          className="w-2 h-2 rounded-full bg-[#47C4A5]"
        />
        <MessageSquare
          aria-hidden="true"
          className="w-4 h-4 text-[#0E807E]"
        />
        <span className="font-medium text-xs text-[#0B2B26] tracking-[0.02em]">
          AI Chemist
        </span>
      </button>
    </div>
  );
}
