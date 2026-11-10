"use client";

import { useState, useRef, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import ChatComposerBar from "./ChatComposerBar";
import FormattedChatText from "./FormattedChatText";
import {
  AiModelId,
  GeminiLogo,
  ModelIcon,
  OpenAILogo,
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

  // Do not render floating widget on the login page (/) or inside the dedicated /chat page
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
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, activeSession?.messages, isLoading]);

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
    attachments: ChatAttachment[] = []
  ) => {
    if ((!text && attachments.length === 0) || isLoading || !activeSession)
      return;

    setErrorMessage("");
    const userMsgId = generateUniqueId("float-u");

    const displayText =
      text ||
      (attachments.some((a) => a.isVoiceNote)
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
          attachments.some((a) => a.isVoiceNote),
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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedModel,
        }),
      });

      const data = await res.json();

      if (data.success && data.reply) {
        const botMsgId = generateUniqueId("float-b");
        const botMsg: ChatMessage = {
          id: botMsgId,
          role: "assistant",
          content: data.reply,
          modelBadge: selectedModel,
          timestamp: "Baru saja",
        };

        const finalMessages = [...updatedMessages, botMsg];
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
    <div className="fixed bottom-14 left-6 z-50 flex flex-col items-start select-none font-sans">
      {/* POPUP CHAT WINDOW */}
      {isOpen && (
        <div className="w-[370px] sm:w-[440px] h-[590px] mb-3 bg-white/95 backdrop-blur-xl rounded-3xl shadow-[0_16px_50px_rgba(35,78,66,0.28)] border border-green-200/90 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-6 duration-200">
          {/* HEADER POPUP */}
          <div className="bg-[#234e42] text-white p-3.5 flex items-center justify-between border-b border-green-800">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowSessionDrawer(!showSessionDrawer)}
                className="p-1.5 hover:bg-white/10 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                title="Daftar Riwayat Chat"
              >
                <span>☰</span>
                <span className="max-w-[160px] truncate text-xs font-semibold">
                  {activeSession?.title || "AI Chat"}
                </span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 rounded-full text-[11px] font-bold">
                <ModelIcon
                  modelId={activeModelOpt.id}
                  className="w-3.5 h-3.5"
                  idSuffix="float-head"
                />
                <span>{activeModelOpt.shortName}</span>
              </span>

              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  router.push("/chat");
                }}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg text-xs cursor-pointer"
                title="Buka Halaman Penuh"
              >
                ↗
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-lg text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* DRAWER RIWAYAT SESI CHAT */}
          {showSessionDrawer && (
            <div className="bg-slate-50 border-b border-gray-200 p-3 max-h-[180px] overflow-y-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                  Riwayat Chat ({sessions.length})
                </span>
                <button
                  type="button"
                  onClick={handleNewSession}
                  className="text-xs bg-green-100 hover:bg-green-200 text-[#234e42] px-2.5 py-1 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                >
                  <span>+</span>
                  <span>Chat Baru</span>
                </button>
              </div>

              <div className="space-y-1">
                {sessions.map((sess) => {
                  const sOpt = getModelOption(sess.model);
                  return (
                    <div
                      key={sess.id}
                      onClick={() => handleSelectSession(sess.id)}
                      className={`flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
                        sess.id === activeSessionId
                          ? "bg-[#234e42] text-white font-bold"
                          : "hover:bg-white text-gray-700 font-medium"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate flex-1 pr-2">
                        <ModelIcon
                          modelId={sOpt.id}
                          className="w-3.5 h-3.5 shrink-0"
                          idSuffix={`drawer-${sess.id}`}
                        />
                        <span className="truncate">{sess.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSession(e, sess.id)}
                        className={`text-[11px] p-1 rounded-md opacity-60 hover:opacity-100 ${
                          sess.id === activeSessionId
                            ? "hover:bg-white/20"
                            : "hover:bg-red-50 text-red-600"
                        }`}
                        title="Hapus riwayat"
                      >
                        🗑
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* LIST CHAT MESSAGES */}
          <div className="flex-1 p-3 overflow-y-auto space-y-3 text-xs bg-slate-50/50">
            {activeSession?.messages.map((m) => {
              const isUser = m.role === "user";
              const mOpt = getModelOption(m.modelBadge || selectedModel);

              return (
                <div
                  key={m.id}
                  className={`flex ${isUser ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[88%] p-3.5 rounded-2xl shadow-2xs leading-relaxed ${
                      isUser
                        ? "bg-[#234e42] text-white rounded-tr-xs"
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-xs"
                    }`}
                  >
                    {!isUser && (
                      <div className="flex items-center gap-1.5 mb-1.5 text-[10px] font-bold text-gray-500">
                        <ModelIcon
                          modelId={mOpt.id}
                          className="w-3.5 h-3.5"
                          idSuffix={`wmsg-${m.id}`}
                        />
                        <span>{mOpt.name}</span>
                      </div>
                    )}

                    {/* RENDER ATTACHMENTS / VOICE NOTE IN WIDGET */}
                    {m.attachments && m.attachments.length > 0 && (
                      <div className="space-y-1.5 mb-2">
                        {m.attachments.map((att) => (
                          <div
                            key={att.id}
                            className={`rounded-xl p-2 border ${
                              isUser
                                ? "bg-white/10 border-white/15 text-white"
                                : "bg-gray-50 border-gray-200 text-gray-800"
                            }`}
                          >
                            {att.isVoiceNote ? (
                              <div className="flex flex-col gap-1">
                                <span className="font-bold text-[11px]">
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
                              <div className="font-semibold text-[11px] truncate">
                                📎 {att.name} ({att.sizeLabel})
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="text-xs">
                      <FormattedChatText content={m.content} />
                    </div>
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-gray-500 font-medium p-2">
                <div className="animate-spin w-3 h-3 border-2 border-green-700 border-t-transparent rounded-full"></div>
                <span>{activeModelOpt.name} sedang memproses...</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-xl bg-red-50 text-red-600 text-xs font-medium">
                ⚠️ {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* DARK COMPOSER BAR IN FLOATING WIDGET */}
          <div className="p-2.5 bg-white border-t border-gray-100">
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

      {/* FLOATING TRIGGER BUTTON (POJOK KIRI BAWAH DENGAN LOGO GEMINI & GPT ASLI) */}
      <button
        type="button"
        onClick={handleToggleWidget}
        className="group flex items-center gap-2.5 bg-[#1e1f22] hover:bg-[#2b2d31] text-white px-4 py-3 rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.35)] transition-all transform hover:scale-105 cursor-pointer border border-white/20"
        title="Buka AI Chemist Chatbot (Gemini & GPT-6 Luna)"
      >
        <div className="flex items-center -space-x-1">
          <span className="w-6 h-6 rounded-full bg-[#121316] border border-white/15 flex items-center justify-center">
            <GeminiLogo className="w-3.5 h-3.5" idSuffix="fab-gemini" />
          </span>
          <span className="w-6 h-6 rounded-full bg-[#121316] border border-white/15 flex items-center justify-center text-white">
            <OpenAILogo className="w-3.5 h-3.5" />
          </span>
        </div>
        <span className="font-bold text-xs">AI Chat</span>
        <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
          GPT-6 Luna
        </span>
      </button>
    </div>
  );
}
