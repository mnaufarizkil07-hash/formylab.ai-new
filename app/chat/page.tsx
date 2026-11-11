"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  SquarePen,
  X,
  FlaskConical,
  BookOpen,
  Table2,
  ShieldCheck,
  Globe,
  Sparkles,
  Trash2,
  Pencil,
  Check,
} from "lucide-react";
import Logo from "../../components/Logo";
import ChatComposerBar from "../../components/ChatComposerBar";
import FormattedChatText from "../../components/FormattedChatText";
import { useInteractiveVoice } from "../../components/InteractiveVoiceController";
import LiveVoiceCallModal from "../../components/LiveVoiceCallModal";
import InteractiveMessageActions from "../../components/InteractiveMessageActions";
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
import { ACTIVE_USER_STORAGE_KEY, UserAccount } from "../../lib/auth";

export default function ChatPage() {
  const router = useRouter();
  const voice = useInteractiveVoice(false);

  const [sessions, setSessions] = useState<ChatSession[]>([
    INITIAL_DEFAULT_SESSION,
  ]);
  const [activeSessionId, setActiveSessionId] = useState<string>(
    INITIAL_DEFAULT_SESSION.id
  );
  const [selectedModel, setSelectedModel] = useState<AiModelId>("auto");

  // Sidebar & Search Bar visibility states (collapsible like ChatGPT)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Logged-in User Name & Rotating Greeting
  const [userName, setUserName] = useState<string>("Naufal");
  const [greetingIndex, setGreetingIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  // Load stored sessions and logged-in user profile
  useEffect(() => {
    queueMicrotask(() => {
      try {
        const rawUser = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser) as Partial<UserAccount>;
          if (parsedUser.name && parsedUser.name.trim()) {
            setUserName(parsedUser.name.trim());
          } else if (parsedUser.email) {
            const prefix = parsedUser.email.split("@")[0] || "Naufal";
            setUserName(prefix.charAt(0).toUpperCase() + prefix.slice(1));
          }
        }
      } catch {
        // fallback to default name
      }

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

  // Rotate welcome greeting phrases smoothly
  const dynamicGreetings = [
    `Halo, ${userName}! Mulai dari mana kita hari ini?`,
    `Ada apa hari ini, ${userName}?`,
    `Halo, ${userName}! Apa yang ingin Anda racik atau tanyakan?`,
    `Siap berdiskusi, ${userName}. Ada formula atau produk yang ingin dibedah?`,
    `Selamat datang kembali, ${userName}! Mau riset apa hari ini?`,
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setGreetingIndex((prev) => (prev + 1) % dynamicGreetings.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [dynamicGreetings.length]);

  const activeSession =
    sessions.find((s) => s.id === activeSessionId) || sessions[0];

  const userMessagesCount =
    activeSession?.messages.filter((m) => m.role === "user").length || 0;
  const isNewEmptyChat = userMessagesCount === 0 && !isLoading;

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    if (isNewEmptyChat) {
      messagesContainerRef.current.scrollTop = 0;
    } else {
      scrollToBottom();
    }
  }, [activeSession?.messages, isLoading, isNewEmptyChat]);

  const handleToggleSearch = () => {
    setIsSearchOpen((prev) => {
      const next = !prev;
      if (next) {
        setTimeout(() => searchInputRef.current?.focus(), 60);
      } else {
        setSearchQuery("");
      }
      return next;
    });
  };

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
    voice.stopSpeech();
    const newSession = createDefaultSession();
    newSession.model = selectedModel;
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    saveStoredSessions(updated);
    setGreetingIndex((prev) => (prev + 1) % dynamicGreetings.length);
  };

  const handleSelectSession = (id: string) => {
    voice.stopSpeech();
    setActiveSessionId(id);
    const chosen = sessions.find((s) => s.id === id);
    if (chosen) {
      setSelectedModel(getModelOption(chosen.model).id);
    }
  };

  const handleDeleteSession = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    voice.stopSpeech();
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
    attachments: ChatAttachment[] = [],
    voiceCallMode = false
  ): Promise<string | null> => {
    if ((!text && attachments.length === 0) || isLoading || !activeSession)
      return null;

    setErrorMessage("");
    if (!voiceCallMode) {
      voice.stopSpeech();
    }
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
          voiceCallMode,
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

        return data.reply as string;
      } else {
        setErrorMessage(data.error || "Gagal mendapatkan balasan dari AI.");
        return null;
      }
    } catch {
      setErrorMessage("Terjadi gangguan koneksi ke server AI.");
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-send preselectedChatPrompt when navigated from Dashboard
  const preselectedTriggeredRef = useRef(false);
  useEffect(() => {
    if (preselectedTriggeredRef.current || isLoading) return;
    const pendingPrompt =
      typeof window !== "undefined"
        ? window.localStorage.getItem("preselectedChatPrompt")
        : null;
    if (pendingPrompt && activeSession) {
      preselectedTriggeredRef.current = true;
      window.localStorage.removeItem("preselectedChatPrompt");
      setTimeout(() => {
        handleSendMessage(pendingPrompt, []);
      }, 120);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSession?.id]);

  const activeModelOption = getModelOption(selectedModel);

  const filteredSessions = sessions.filter((sess) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = sess.title.toLowerCase().includes(q);
    const contentMatch = sess.messages.some((m) =>
      m.content.toLowerCase().includes(q)
    );
    return titleMatch || contentMatch;
  });

  const userInitials = userName
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "FL";

  // ChatGPT-style quick starter actions for empty state
  const starterActions = [
    {
      icon: FlaskConical,
      label: "Racik formula baru",
      prompt:
        "Klien minta dibuatkan serum brightening wajah yang cepat meresap, bagaimana draf formula awalnya?",
    },
    {
      icon: Table2,
      label: "Bandingkan produk dalam tabel",
      prompt: "Bandingkan Cetaphil dan Kahf secara lengkap dalam bentuk tabel.",
    },
    {
      icon: ShieldCheck,
      label: "Cek regulasi BPOM & Halal",
      prompt:
        "Cek status kehalalan dan batas aman BPOM untuk kombinasi Salicylic Acid 2%, Niacinamide 4%, dan Phenoxyethanol 0.8%.",
    },
    {
      icon: Globe,
      label: "Riset tren skincare di web",
      prompt:
        "Apa merek moisturizer skin barrier terbaik di dunia dan Indonesia saat ini beserta bahan aktif utamanya?",
    },
  ];

  // Filter out the static welcome message so the ChatGPT-style centered greeting handles the empty state cleanly
  const conversationMessages = (activeSession?.messages || []).filter(
    (m) => m.id !== "msg-welcome"
  );

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#f4faf6] text-slate-900 font-sans">
      {/* LEFT COLLAPSIBLE SIDEBAR (CHATGPT STRUCTURE + FORMYLAB.AI EMERALD THEME) */}
      <aside
        className={`${
          isSidebarOpen ? "w-[268px] border-r border-[#1c4035]" : "w-0"
        } shrink-0 bg-[#10261f] text-emerald-50 flex flex-col justify-between transition-all duration-200 overflow-hidden select-none z-30`}
      >
        {/* TOP SECTION OF SIDEBAR */}
        <div className="flex-1 min-h-0 flex flex-col p-3">
          {/* HEADER BAR: Brand Title + Search Toggle + Hide Sidebar Button */}
          <div className="flex items-center justify-between gap-2 px-1 py-1 mb-2">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="flex items-center text-left hover:opacity-90 transition cursor-pointer min-w-0"
              title="Kembali ke Dashboard"
            >
              <Logo size="sm" variant="light" />
            </button>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleToggleSearch}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  isSearchOpen
                    ? "bg-emerald-500/25 text-emerald-300"
                    : "text-emerald-100/70 hover:text-white hover:bg-white/10"
                }`}
                title={
                  isSearchOpen
                    ? "Sembunyikan Pencarian Chat"
                    : "Cari Riwayat Chat"
                }
                aria-label="Toggle Search Chat"
              >
                <Search className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg text-emerald-100/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Sembunyikan Sidebar"
                aria-label="Hide Sidebar"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE / HIDEABLE SEARCH BAR */}
          {isSearchOpen && (
            <div className="mb-2.5 px-1 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 bg-[#18362c] border border-emerald-400/25 rounded-xl px-2.5 py-1.5">
                <Search className="w-3.5 h-3.5 text-emerald-300/80 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") {
                      setIsSearchOpen(false);
                      setSearchQuery("");
                    }
                  }}
                  placeholder="Cari obrolan..."
                  className="w-full bg-transparent text-xs text-white placeholder-emerald-200/50 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="text-emerald-200/60 hover:text-white p-0.5 rounded cursor-pointer"
                  title="Tutup bar pencarian"
                  aria-label="Close Search Bar"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

          {/* PRIMARY NAVIGATION ACTIONS (LIKE CHATGPT SIDEBAR) */}
          <div className="space-y-1 mb-4">
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#1a3a30] hover:bg-[#21483b] text-white text-xs font-semibold transition cursor-pointer"
            >
              <SquarePen className="w-4 h-4 text-emerald-300 shrink-0" />
              <span>Obrolan baru</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/formulate")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/8 text-emerald-100/85 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              <FlaskConical className="w-4 h-4 text-emerald-400/80 shrink-0" />
              <span>Studio Formulasi</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/library")}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl hover:bg-white/8 text-emerald-100/85 hover:text-white text-xs font-medium transition cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-emerald-400/80 shrink-0" />
              <span>Pustaka Bahan</span>
            </button>
          </div>

          {/* RECENT CHATS SECTION ("Terbaru") */}
          <div className="px-2.5 mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-200/55">
              {searchQuery.trim()
                ? `Hasil Pencarian (${filteredSessions.length})`
                : "Terbaru"}
            </span>
          </div>

          {/* SESSION LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-0.5 pr-1">
            {filteredSessions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-emerald-200/50 text-center">
                Tidak ada obrolan yang cocok.
              </div>
            ) : (
              filteredSessions.map((sess) => {
                const isActive = sess.id === activeSessionId;
                const isEditing = editingSessionId === sess.id;

                return (
                  <div
                    key={sess.id}
                    onClick={() => handleSelectSession(sess.id)}
                    className={`group relative px-2.5 py-2 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? "bg-[#1d4236] text-white font-semibold"
                        : "text-emerald-100/80 hover:bg-white/8 hover:text-white"
                    }`}
                  >
                    {isEditing ? (
                      <form
                        onSubmit={(e) => handleSaveRename(e, sess.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="flex items-center gap-1 w-full"
                      >
                        <input
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full text-xs px-2 py-1 rounded-lg bg-[#10261f] text-white border border-emerald-400/40 focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="p-1 rounded bg-emerald-500 text-black hover:bg-emerald-400 cursor-pointer"
                          title="Simpan"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="truncate flex-1">{sess.title}</span>

                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(e, sess)}
                            className="p-1 rounded hover:bg-white/15 text-emerald-200 hover:text-white cursor-pointer"
                            title="Ubah judul"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            className="p-1 rounded hover:bg-rose-500/25 text-emerald-200 hover:text-rose-300 cursor-pointer"
                            title="Hapus obrolan"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* BOTTOM USER PROFILE (LIKE CHATGPT FOOTER) */}
        <div className="p-3 border-t border-white/10 flex items-center gap-2.5 bg-[#0d201a]">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              {userName}
            </div>
            <div className="text-[10px] text-emerald-300/70 truncate">
              R&amp;D Workspace
            </div>
          </div>
        </div>
      </aside>

      {/* EXPANSIVE MAIN CHAT ROOM VIEWPORT */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#f4faf6] relative">
        {/* MINIMAL TOP BAR (LIKE CHATGPT HEADER) */}
        <header className="shrink-0 h-13 px-4 sm:px-6 flex items-center justify-between border-b border-emerald-950/8 bg-[#f4faf6]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 min-w-0">
            {!isSidebarOpen && (
              <div className="flex items-center gap-1 mr-1">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="p-2 rounded-xl hover:bg-emerald-950/8 text-[#12382f] transition cursor-pointer"
                  title="Tampilkan Sidebar Riwayat"
                  aria-label="Open Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewSession}
                  className="p-2 rounded-xl hover:bg-emerald-950/8 text-[#12382f] transition cursor-pointer"
                  title="Obrolan Baru"
                  aria-label="New Chat"
                >
                  <SquarePen className="w-4 h-4" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="flex items-center hover:opacity-90 transition cursor-pointer shrink-0"
                title="Kembali ke Dashboard"
              >
                <Logo size="sm" />
              </button>
              <span className="text-slate-300">·</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 truncate">
                <ModelIcon
                  modelId={activeModelOption.id}
                  className="w-3.5 h-3.5"
                  idSuffix="top-header"
                />
                <span>{activeModelOption.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {conversationMessages.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  voice.stopSpeech();
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
                className="text-xs text-slate-500 hover:text-rose-700 font-medium px-2.5 py-1.5 rounded-lg hover:bg-emerald-950/5 transition cursor-pointer whitespace-nowrap"
              >
                Bersihkan Chat
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-emerald-50 text-[#12382f] border border-emerald-950/12 text-xs font-semibold transition cursor-pointer shadow-2xs whitespace-nowrap"
            >
              ← Dashboard
            </button>
          </div>
        </header>

        {/* STATE 1: NEW / EMPTY CHAT -> CENTERED CHATGPT WELCOME ROOM (LIKE SCREENSHOT 4) */}
        {isNewEmptyChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-10 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
              {/* DYNAMIC PERSONALIZED GREETING WITH USER NAME */}
              <h1
                key={greetingIndex}
                className="text-2xl sm:text-3xl font-bold text-[#12382f] text-center tracking-tight mb-6 animate-in fade-in duration-300"
              >
                {dynamicGreetings[greetingIndex]}
              </h1>

              {/* COMPACT BLACK CHATGPT PILL BAR */}
              <div className="w-full mb-5">
                <ChatComposerBar
                  selectedModel={selectedModel}
                  onSelectModel={handleSelectModel}
                  onSend={(t, att) => handleSendMessage(t, att, false)}
                  onStartVoiceCall={() => setIsVoiceCallOpen(true)}
                  isLoading={isLoading}
                  placeholder="Tanya formylab.ai apa saja..."
                />
              </div>

              {/* CLEAN CHATGPT-STYLE STARTER ACTION LIST */}
              <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2">
                {starterActions.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt, [])}
                      className="flex items-center gap-3 px-3.5 py-2.5 rounded-2xl bg-white/80 hover:bg-white border border-emerald-950/10 text-left text-xs font-medium text-slate-700 hover:text-[#12382f] transition cursor-pointer shadow-2xs"
                    >
                      <IconComp className="w-4 h-4 text-[#0f766e] shrink-0" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* STATE 2: ACTIVE CONVERSATION -> EXPANSIVE FULL-HEIGHT READING ROOM + COMPACT BOTTOM BLACK PILL BAR */
          <>
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-6"
            >
              <div className="max-w-3xl lg:max-w-4xl mx-auto w-full space-y-6 pb-4">
                {conversationMessages.map((msg, msgIdx) => {
                  const isUser = msg.role === "user";
                  const msgModelOpt = getModelOption(
                    msg.modelBadge || selectedModel
                  );

                  if (isUser) {
                    return (
                      <div
                        key={`${msg.id}-${msgIdx}`}
                        className="flex justify-end"
                      >
                        <div className="max-w-[82%] sm:max-w-[75%] rounded-3xl rounded-tr-sm bg-[#12382f] text-white px-4 py-3 shadow-2xs text-[14.5px] leading-relaxed">
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-2 mb-2.5">
                              {msg.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="rounded-2xl p-2.5 bg-white/10 border border-white/15 text-white"
                                >
                                  {att.isVoiceNote ? (
                                    <div className="flex flex-col gap-1">
                                      <div className="flex items-center justify-between gap-2 text-xs font-bold">
                                        <span>🎤 {att.name}</span>
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
                                    <div className="space-y-1">
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
                  }

                  return (
                    <div
                      key={`${msg.id}-${msgIdx}`}
                      className="flex items-start gap-3.5 justify-start"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#12382f] text-white shadow-2xs mt-0.5">
                        <ModelIcon
                          modelId={msgModelOpt.id}
                          className="w-4 h-4"
                          idSuffix={`msg-${msg.id}-${msgIdx}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0 bg-white rounded-3xl rounded-tl-sm px-5 py-4 border border-emerald-950/10 shadow-2xs text-slate-800">
                        <div className="flex items-center gap-2 mb-1.5 text-xs text-slate-500">
                          <span className="font-bold text-[#12382f]">
                            {msgModelOpt.name}
                          </span>
                          <span>·</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <FormattedChatText content={msg.content} />

                        <InteractiveMessageActions
                          messageId={msg.id}
                          content={msg.content}
                          attachments={msg.attachments}
                          voice={voice}
                          onQuickFollowUp={(promptText) =>
                            handleSendMessage(promptText, [])
                          }
                        />
                      </div>
                    </div>
                  );
                })}

                {isLoading && (
                  <div className="flex items-center gap-3.5 justify-start">
                    <div className="w-8 h-8 rounded-full bg-[#12382f] text-white flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white px-4 py-2.5 rounded-2xl text-xs font-medium text-[#12382f] border border-emerald-950/10">
                      {activeModelOption.name} sedang menyusun jawaban...
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
                    ⚠️ {errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* PINNED COMPACT BLACK PILL CHAT COMPOSER AT BOTTOM */}
            <div className="shrink-0 w-full max-w-3xl lg:max-w-4xl mx-auto px-4 pb-3 pt-1">
              <ChatComposerBar
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                onSend={(t, att) => handleSendMessage(t, att, false)}
                onStartVoiceCall={() => setIsVoiceCallOpen(true)}
                isLoading={isLoading}
                compact
                placeholder="Tanya formylab.ai apa saja..."
              />
            </div>
          </>
        )}
      </main>

      {/* LIVE TWO-WAY VOICE CALL MODAL ("SEPERTI TELEPONAN DENGAN USER") */}
      <LiveVoiceCallModal
        isOpen={isVoiceCallOpen}
        onClose={() => setIsVoiceCallOpen(false)}
        voice={voice}
        modelName={activeModelOption.name}
        isAiThinking={isLoading}
        latestAiReply={
          activeSession?.messages
            .filter((m) => m.role === "assistant")
            .slice(-1)[0]?.content || ""
        }
        onSendSpokenPrompt={(spokenText) =>
          handleSendMessage(spokenText, [], true)
        }
      />
    </div>
  );
}
