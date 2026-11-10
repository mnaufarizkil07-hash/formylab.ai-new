"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Logo from "../../components/Logo";
import ChatComposerBar from "../../components/ChatComposerBar";
import FormattedChatText from "../../components/FormattedChatText";
import {
  AiModelId,
  ModelIcon,
  getModelOption,
} from "../../components/AiModelLogos";
import {
  ChatAttachment,
  ChatMessage,
  ChatSession,
  INITIAL_DEFAULT_SESSION,
  createDefaultSession,
  generateSessionTitle,
  generateUniqueId,
  getStoredSessions,
  saveStoredSessions,
} from "../../lib/chatStorage";

export default function ChatPage() {
  const router = useRouter();

  const [sessions, setSessions] = useState<ChatSession[]>([
    INITIAL_DEFAULT_SESSION,
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    INITIAL_DEFAULT_SESSION.id
  );
  const [selectedModel, setSelectedModel] = useState<AiModelId>("auto");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      const stored = getStoredSessions();
      if (stored.length > 0) {
        setSessions(stored);
        setActiveSessionId(stored[0].id);
        setSelectedModel(getModelOption(stored[0].model).id);
      } else {
        const def = createDefaultSession();
        saveStoredSessions([def]);
        setSessions([def]);
        setActiveSessionId(def.id);
      }
    });
  }, []);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  useEffect(() => {
    scrollToBottom();
  }, [activeSession?.messages, isLoading]);

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

  const handleCreateNewSession = () => {
    const newSession = createDefaultSession();
    newSession.model = selectedModel;
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    saveStoredSessions(updated);
  };

  const handleSelectSession = (id: string) => {
    setActiveSessionId(id);
    const chosen = sessions.find((s) => s.id === id);
    if (chosen) {
      setSelectedModel(getModelOption(chosen.model).id);
    }
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

  const handleStartRename = (e: React.MouseEvent, sess: ChatSession) => {
    e.stopPropagation();
    setEditingSessionId(sess.id);
    setEditingTitle(sess.title);
  };

  const handleSaveRename = (e: React.FormEvent, sessId: string) => {
    e.preventDefault();
    if (!editingTitle.trim()) return;
    const updated = sessions.map((s) =>
      s.id === sessId ? { ...s, title: editingTitle.trim() } : s
    );
    setSessions(updated);
    saveStoredSessions(updated);
    setEditingSessionId(null);
  };

  const handleSendMessage = async (
    text: string,
    attachments: ChatAttachment[] = []
  ) => {
    if ((!text && attachments.length === 0) || isLoading || !activeSession)
      return;

    setErrorMessage("");
    const userMsgId = generateUniqueId("user");

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
        const botMsgId = generateUniqueId("bot");
        const assistantMsg: ChatMessage = {
          id: botMsgId,
          role: "assistant",
          content: data.reply,
          modelBadge: selectedModel,
          timestamp: "Baru saja",
        };

        const finalMessages = [...updatedMessages, assistantMsg];
        const finalSessions = updatedSessions.map((s) =>
          s.id === activeSession.id ? { ...s, messages: finalMessages } : s
        );

        setSessions(finalSessions);
        saveStoredSessions(finalSessions);
      } else {
        setErrorMessage(data.error || "Gagal mendapatkan balasan dari AI.");
      }
    } catch {
      setErrorMessage("Terjadi gangguan koneksi ke server AI.");
    } finally {
      setIsLoading(false);
    }
  };

  const quickPrompts = [
    "Bagaimana meracik moisturizer untuk kulit rosacea di iklim lembap?",
    "Apa substitusi pengawet paraben yang aman dan Halal?",
    "Berapa rasio emulgator ideal untuk emulsi krim tipe O/W?",
    "Jelaskan fungsi Ceramide NP vs Niacinamide untuk skin barrier.",
  ];

  const activeModelOption = getModelOption(selectedModel);

  return (
    <div className="min-h-screen md:h-screen md:overflow-hidden bg-[#cbf2d6] font-sans text-gray-800 flex flex-col">
      {/* TOPBAR HEADER */}
      <header className="shrink-0 z-30 bg-white/90 backdrop-blur-md px-6 py-3.5 flex items-center justify-between border-b border-green-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div
            onClick={() => router.push("/dashboard")}
            className="cursor-pointer hover:opacity-80 transition"
          >
            <Logo size="sm" />
          </div>
          <span className="hidden sm:inline-block text-xs uppercase tracking-wider font-extrabold text-[#234e42] bg-green-100 px-3 py-1 rounded-full">
            AI R&D Consultant
          </span>
        </div>

        {/* NAVIGASI KANAN */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => router.push("/dashboard")}
            className="px-4 py-1.5 bg-white text-[#234e42] hover:bg-green-50 border border-green-200 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs"
          >
            ← Dashboard
          </button>
        </div>
      </header>

      {/* BODY UTAMA: SIDEBAR RIWAYAT SESI + CONSOLE PERCAKAPAN */}
      <div className="flex-1 min-h-0 max-w-6xl w-full mx-auto p-4 sm:p-5 grid grid-cols-1 md:grid-cols-4 gap-5 md:overflow-hidden">
        {/* SIDEBAR DAFTAR RIWAYAT CHAT */}
        <aside className="md:col-span-1 bg-white/90 backdrop-blur-sm p-4 rounded-3xl shadow-sm border border-white flex flex-col justify-between h-[420px] md:h-full min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="shrink-0 flex items-center justify-between mb-3 pb-2 border-b border-gray-100">
              <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#234e42] flex items-center gap-1.5">
                <span>📚</span>
                <span>Riwayat Chat</span>
              </h2>
              <button
                type="button"
                onClick={handleCreateNewSession}
                className="text-xs bg-[#234e42] hover:bg-[#1a3a31] text-white px-2.5 py-1 rounded-xl font-bold transition flex items-center gap-1 cursor-pointer"
                title="Mulai Sesi Chat Baru"
              >
                <span>+</span>
                <span>Baru</span>
              </button>
            </div>

            {/* LIST SESI */}
            <div className="space-y-1.5 overflow-y-auto flex-1 min-h-0 pr-1">
              {sessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const isEditing = editingSessionId === sess.id;
                const sessModelOpt = getModelOption(sess.model);

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group relative p-2.5 rounded-2xl text-xs transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isActive
                        ? "bg-[#234e42] text-white shadow-xs font-semibold"
                        : "hover:bg-green-50/80 text-gray-700 bg-white/60 border border-gray-100"
                    }`}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(e, sess.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1"
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full text-xs p-1 rounded bg-white text-gray-900 border border-green-300 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="bg-green-600 text-white px-1.5 py-0.5 rounded text-[10px]"
                        >
                          ✓
                        </button>
                      </form>
                    ) : (
                      <div className="flex items-center justify-between gap-1">
                        <span className="truncate flex-1 font-bold">
                          {sess.title}
                        </span>

                        {/* AKSI EDIT TITLE / HAPUS SESI */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(e, sess)}
                            className={`p-1 rounded text-[11px] ${
                              isActive
                                ? "hover:bg-white/20 text-white"
                                : "hover:bg-gray-100 text-gray-500"
                            }`}
                            title="Ubah judul"
                          >
                            ✎
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            className={`p-1 rounded text-[11px] ${
                              isActive
                                ? "hover:bg-white/20 text-white"
                                : "hover:bg-red-100 text-red-600"
                            }`}
                            title="Hapus sesi"
                          >
                            🗑
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between gap-2 text-[10px] opacity-80 whitespace-nowrap">
                      <span className="truncate">{sess.createdAt}</span>
                      <span className="flex items-center gap-1 font-semibold shrink-0">
                        <ModelIcon
                          modelId={sessModelOpt.id}
                          className="w-3 h-3 shrink-0"
                          idSuffix={`side-${sess.id}`}
                        />
                        <span>{sessModelOpt.shortName}</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="shrink-0 pt-3 border-t border-gray-100 text-[11px] text-gray-400 text-center font-medium">
            Riwayat chat tersimpan di perangkat Anda
          </div>
        </aside>

        {/* MAIN CONSOLE AREA */}
        <main className="md:col-span-3 flex flex-col justify-between h-[680px] md:h-full min-h-0 bg-white/90 backdrop-blur-sm rounded-3xl p-5 sm:p-6 shadow-sm border border-white">
          {/* HEADER SESI AKTIF */}
          <div className="shrink-0 pb-3 mb-3 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h1 className="text-base font-extrabold text-gray-900">
                {activeSession?.title || "Konsultasi Formulasi"}
              </h1>
              <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                <span>Model:</span>
                <span className="inline-flex items-center gap-1 font-bold text-[#234e42]">
                  <ModelIcon
                    modelId={activeModelOption.id}
                    className="w-3.5 h-3.5"
                    idSuffix="session-sub"
                  />
                  {activeModelOption.name}
                </span>
              </div>
            </div>

            <button
              onClick={() => {
                const refreshed = sessions.find(
                  (s) => s.id === activeSessionId
                );
                if (refreshed) {
                  const cleaned = {
                    ...refreshed,
                    messages: [INITIAL_DEFAULT_SESSION.messages[0]],
                  };
                  const updated = sessions.map((s) =>
                    s.id === refreshed.id ? cleaned : s
                  );
                  setSessions(updated);
                  saveStoredSessions(updated);
                }
              }}
              className="text-xs text-gray-500 hover:text-red-600 font-semibold px-2.5 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition cursor-pointer"
            >
              Bersihkan Chat
            </button>
          </div>

          {/* DAFTAR PESAN PERCAKAPAN */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1"
          >
            {activeSession?.messages.map((msg, msgIdx) => {
              const isUser = msg.role === "user";
              const msgModelOpt = getModelOption(
                msg.modelBadge || selectedModel
              );

              return (
                <div
                  key={`${msg.id}-${msgIdx}`}
                  className={`flex gap-3 ${
                    isUser ? "justify-end" : "justify-start"
                  }`}
                >
                  {!isUser && (
                    <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0 shadow-xs bg-[#17181c] text-white border border-gray-200">
                      <ModelIcon
                        modelId={msgModelOpt.id}
                        className="w-5 h-5"
                        idSuffix={`msg-${msg.id}-${msgIdx}`}
                      />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-3xl p-4 sm:p-5 shadow-xs text-sm leading-relaxed ${
                      isUser
                        ? "bg-[#234e42] text-white rounded-tr-xs"
                        : "bg-white text-gray-800 border border-gray-100 rounded-tl-xs"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3 mb-2 pb-1.5 border-b border-gray-100/30 text-[11px] font-semibold opacity-80">
                      <span className="flex items-center gap-1.5">
                        {isUser ? (
                          "Formulator"
                        ) : (
                          <>
                            <span>AI Consultant</span>
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold ${
                                msgModelOpt.provider === "openai"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : msgModelOpt.provider === "google"
                                    ? "bg-purple-100 text-purple-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              <ModelIcon
                                modelId={msgModelOpt.id}
                                className="w-3 h-3"
                                idSuffix={`badge-${msg.id}-${msgIdx}`}
                              />
                              <span>{msgModelOpt.name}</span>
                            </span>
                          </>
                        )}
                      </span>
                      <span>{msg.timestamp}</span>
                    </div>

                    {/* RENDER LAMPIRAN FILE ATAU VOICE NOTE (VN) */}
                    {msg.attachments && msg.attachments.length > 0 && (
                      <div className="space-y-2 mb-3">
                        {msg.attachments.map((att) => (
                          <div
                            key={att.id}
                            className={`rounded-2xl p-3 border ${
                              isUser
                                ? "bg-white/10 border-white/15 text-white"
                                : "bg-gray-50 border-gray-200 text-gray-800"
                            }`}
                          >
                            {att.isVoiceNote ? (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                  <span className="flex items-center gap-1.5">
                                    <span>🎤</span>
                                    <span>{att.name}</span>
                                  </span>
                                  <span className="text-[10px] opacity-75">
                                    {att.sizeLabel}
                                  </span>
                                </div>
                                {att.dataUrl && (
                                  <audio
                                    src={att.dataUrl}
                                    controls
                                    className="w-full h-8 mt-1"
                                  />
                                )}
                              </div>
                            ) : att.mimeType.startsWith("image/") &&
                              att.dataUrl ? (
                              <div className="space-y-1.5">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img
                                  src={att.dataUrl}
                                  alt={att.name}
                                  className="max-h-52 rounded-xl object-contain border border-white/15"
                                />
                                <div className="text-xs font-semibold truncate">
                                  📎 {att.name} ({att.sizeLabel})
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between gap-2 text-xs">
                                <span className="font-bold truncate">
                                  📄 {att.name}
                                </span>
                                <span className="text-[10px] opacity-75 shrink-0">
                                  {att.sizeLabel}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    <FormattedChatText content={msg.content} />
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex gap-3 justify-start items-center">
                <div className="w-9 h-9 rounded-full bg-[#17181c] text-white border border-gray-200 flex items-center justify-center shadow-xs">
                  <ModelIcon
                    modelId={activeModelOption.id}
                    className="w-5 h-5 animate-pulse"
                    idSuffix="loading-icon"
                  />
                </div>
                <div className="bg-white/80 backdrop-blur-sm px-5 py-3 rounded-2xl text-xs font-semibold text-green-900 border border-green-100 animate-pulse">
                  {activeModelOption.name} sedang menganalisis & merumuskan
                  jawaban...
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                ⚠️ {errorMessage}
              </div>
            )}
          </div>

          {/* QUICK PROMPTS INSPIRASI */}
          <div className="my-2.5 pt-2">
            <div className="text-[10px] font-bold text-green-900/70 mb-1.5 uppercase tracking-wider">
              💡 Topik Formulasi Cepat:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickPrompts.map((prompt, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSendMessage(prompt, [])}
                  disabled={isLoading}
                  className="text-[11px] bg-green-50 hover:bg-green-100 text-[#234e42] font-semibold px-2.5 py-1 rounded-xl border border-green-200 shadow-2xs transition cursor-pointer text-left disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          {/* CHAT BAR COMPOSER SESUAI GAMBAR KE-2 & KE-3 */}
          <div className="mt-1">
            <ChatComposerBar
              selectedModel={selectedModel}
              onSelectModel={handleSelectModel}
              onSend={handleSendMessage}
              isLoading={isLoading}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
