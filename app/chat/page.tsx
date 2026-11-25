"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
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
  Loader2,
  Trash2,
  Pencil,
  Check,
  Cloud,
  ExternalLink,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";
import ChatComposerBar, {
  MultimodalSendOptions,
} from "../../components/ChatComposerBar";
import ChatNoteCard from "../../components/ChatNoteCard";
import GoogleDocCard from "../../components/GoogleDocCard";
import {
  ChatNoteArtifact,
  GoogleDocArtifact,
  WebSourceCitation,
  encodeChatNoteMessage,
  encodeGoogleDocMessage,
  formatGoogleDocForHistoryContext,
  formatNoteForHistoryContext,
  mergeUniqueWebSources,
  normalizeChatNoteArtifact,
  normalizeGoogleDocArtifact,
  normalizeWebSourceCitation,
  parseChatNoteMessage,
  parseGoogleDocMessage,
} from "../../components/chatNoteUtils";
import {
  connectGoogleDrive,
  disconnectGoogleDrive,
  isGoogleDriveConnected,
  isGoogleDriveOAuthConfigured,
  subscribeGoogleDriveAuth,
} from "../../lib/googleDocsClient";
import FormattedChatText from "../../components/FormattedChatText";
import {
  useInteractiveVoice,
  VoiceCallReplyAudio,
} from "../../components/InteractiveVoiceController";
import LiveVoiceCallModal, {
  VoiceCallTurnResult,
} from "../../components/LiveVoiceCallModal";
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
import { getScopedChatStorageKey } from "../../components/liveVoiceHelpers";

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

  // Sidebar & Search Bar visibility states
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Logged-in User Name & Rotating Greeting
  const [userName, setUserName] = useState<string>("Naufal");
  const [greetingIndex, setGreetingIndex] = useState(0);

  const [isLoading, setIsLoading] = useState(false);
  const [loadingMode, setLoadingMode] = useState<
    "chat" | "voice_note" | "voice_call" | "vision"
  >("chat");
  const [messagePillarsMap, setMessagePillarsMap] = useState<
    Record<string, string[]>
  >({});
  const [messageSourcesMap, setMessageSourcesMap] = useState<
    Record<string, WebSourceCitation[]>
  >({});
  const [messageGoogleSearchMap, setMessageGoogleSearchMap] = useState<
    Record<string, boolean>
  >({});
  const [errorMessage, setErrorMessage] = useState("");

  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isVoiceCallOpen, setIsVoiceCallOpen] = useState(false);
  const [isVoiceMicMuted, setIsVoiceMicMuted] = useState(false);
  const [isDriveConnected, setIsDriveConnected] = useState(false);
  const [isDriveConfigured, setIsDriveConfigured] = useState(false);
  const [isConnectingDrive, setIsConnectingDrive] = useState(false);

  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const activeSessionIdRef = useRef<string>(activeSessionId);
  const selectedModelRef = useRef<AiModelId>(selectedModel);
  const activeUserEmailRef = useRef<string | null>(null);

  const persistSessions = useCallback((nextSessions: ChatSession[]) => {
    const email = activeUserEmailRef.current;
    if (!email) {
      saveStoredSessions(nextSessions);
      return;
    }
    const key = getScopedChatStorageKey("formylab_chat_sessions", email);
    try {
      localStorage.setItem(key, JSON.stringify(nextSessions));
    } catch {
      try {
        const trimmed = nextSessions.map((sess) => ({
          ...sess,
          messages: sess.messages.map((m) => ({
            ...m,
            attachments: m.attachments?.map((att) => ({
              ...att,
              dataUrl: undefined,
            })),
          })),
        }));
        localStorage.setItem(key, JSON.stringify(trimmed));
      } catch {
        // Ignore storage quota errors
      }
    }
  }, []);

  const persistMessagePillars = useCallback(
    (nextMap: Record<string, string[]>) => {
      try {
        const key = getScopedChatStorageKey(
          "formylab_msg_pillars_v1",
          activeUserEmailRef.current
        );
        const entries = Object.entries(nextMap).slice(-100);
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
      } catch {
        // Ignore storage quota errors
      }
    },
    []
  );

  const persistMessageGoogleSearch = useCallback(
    (nextMap: Record<string, boolean>) => {
      try {
        const key = getScopedChatStorageKey(
          "formylab_msg_gsearch_v1",
          activeUserEmailRef.current
        );
        const entries = Object.entries(nextMap).slice(-100);
        localStorage.setItem(key, JSON.stringify(Object.fromEntries(entries)));
      } catch {
        // Ignore storage quota errors
      }
    },
    []
  );

  useEffect(() => {
    activeSessionIdRef.current = activeSessionId;
  }, [activeSessionId]);

  useEffect(() => {
    selectedModelRef.current = selectedModel;
  }, [selectedModel]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    queueMicrotask(() => {
      let resolvedEmail: string | null = null;
      try {
        const rawUser = localStorage.getItem(ACTIVE_USER_STORAGE_KEY);
        if (rawUser) {
          const parsedUser = JSON.parse(rawUser) as Partial<UserAccount>;
          if (parsedUser.email && parsedUser.email.trim()) {
            resolvedEmail = parsedUser.email.trim().toLowerCase();
          }
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

      activeUserEmailRef.current = resolvedEmail;

      let loadedSessions: ChatSession[] = [];
      if (resolvedEmail) {
        try {
          const scopedKey = getScopedChatStorageKey(
            "formylab_chat_sessions",
            resolvedEmail
          );
          const rawScoped = localStorage.getItem(scopedKey);
          if (rawScoped) {
            const parsed = JSON.parse(rawScoped);
            if (Array.isArray(parsed) && parsed.length > 0) {
              loadedSessions = parsed as ChatSession[];
            }
          }
        } catch {
          // Ignore malformed scoped cache
        }
      } else {
        loadedSessions = getStoredSessions();
      }

      if (loadedSessions.length > 0) {
        setSessions(loadedSessions);
        setActiveSessionId(loadedSessions[0].id);
        setSelectedModel(getModelOption(loadedSessions[0].model).id);
      } else {
        const def = createDefaultSession();
        persistSessions([def]);
        setSessions([def]);
        setActiveSessionId(def.id);
      }

      setIsDriveConfigured(isGoogleDriveOAuthConfigured());
      setIsDriveConnected(isGoogleDriveConnected());

      try {
        const sourcesKey = getScopedChatStorageKey(
          "formylab_msg_sources_v1",
          resolvedEmail
        );
        const rawSources =
          localStorage.getItem(sourcesKey) ||
          (!resolvedEmail
            ? localStorage.getItem("formylab_msg_sources_v1")
            : null);
        if (rawSources) {
          const parsed = JSON.parse(rawSources) as Record<string, unknown>;
          if (parsed && typeof parsed === "object") {
            const restored: Record<string, WebSourceCitation[]> = {};
            for (const [msgKey, val] of Object.entries(parsed)) {
              if (Array.isArray(val)) {
                const cleanList = val
                  .map((item) => normalizeWebSourceCitation(item))
                  .filter((item): item is WebSourceCitation => item !== null);
                if (cleanList.length > 0) {
                  restored[msgKey] = cleanList;
                }
              }
            }
            if (Object.keys(restored).length > 0) {
              setMessageSourcesMap(restored);
            }
          }
        }
      } catch {
        // Ignore malformed source cache
      }

      try {
        const pillarsKey = getScopedChatStorageKey(
          "formylab_msg_pillars_v1",
          resolvedEmail
        );
        const rawPillars = localStorage.getItem(pillarsKey);
        if (rawPillars) {
          const parsed = JSON.parse(rawPillars) as Record<string, unknown>;
          if (parsed && typeof parsed === "object") {
            const restored: Record<string, string[]> = {};
            for (const [msgKey, val] of Object.entries(parsed)) {
              if (Array.isArray(val)) {
                const clean = val.filter(
                  (item): item is string => typeof item === "string" && item.trim().length > 0
                );
                if (clean.length > 0) {
                  restored[msgKey] = clean;
                }
              }
            }
            if (Object.keys(restored).length > 0) {
              setMessagePillarsMap(restored);
            }
          }
        }
      } catch {
        // Ignore malformed pillars cache
      }

      try {
        const gsearchKey = getScopedChatStorageKey(
          "formylab_msg_gsearch_v1",
          resolvedEmail
        );
        const rawGsearch = localStorage.getItem(gsearchKey);
        if (rawGsearch) {
          const parsed = JSON.parse(rawGsearch) as Record<string, unknown>;
          if (parsed && typeof parsed === "object") {
            const restored: Record<string, boolean> = {};
            for (const [msgKey, val] of Object.entries(parsed)) {
              if (val === true) {
                restored[msgKey] = true;
              }
            }
            if (Object.keys(restored).length > 0) {
              setMessageGoogleSearchMap(restored);
            }
          }
        }
      } catch {
        // Ignore malformed Google Search cache
      }
    });

    const unsubscribeDrive = subscribeGoogleDriveAuth((snapshot) => {
      setIsDriveConfigured(snapshot.isConfigured);
      setIsDriveConnected(snapshot.isConnected);
    });

    return () => {
      unsubscribeDrive();
    };
  }, [persistSessions]);

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
  const nonWelcomeCount =
    activeSession?.messages.filter((m) => m.id !== "msg-welcome").length || 0;
  const isNewEmptyChat =
    userMessagesCount === 0 &&
    nonWelcomeCount === 0 &&
    !isLoading &&
    !isVoiceCallOpen;

  useEffect(() => {
    if (!messagesContainerRef.current) return;
    if (isNewEmptyChat) {
      messagesContainerRef.current.scrollTop = 0;
    } else {
      scrollToBottom();
    }
  }, [activeSession?.messages, isLoading, isNewEmptyChat, isVoiceCallOpen]);

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
      persistSessions(updated);
    }
  };

  const handleCreateNewSession = () => {
    voice.stopSpeech();
    const newSession = createDefaultSession();
    newSession.model = selectedModel;
    const updated = [newSession, ...sessions];
    setSessions(updated);
    setActiveSessionId(newSession.id);
    persistSessions(updated);
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
      persistSessions([def]);
    } else {
      setSessions(filtered);
      if (activeSessionId === id) {
        setActiveSessionId(filtered[0].id);
      }
      persistSessions(filtered);
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
    persistSessions(updated);
    setEditingSessionId(null);
  };

  const executeChatTurn = async (
    text: string,
    attachments: ChatAttachment[] = [],
    options?: MultimodalSendOptions & { voiceCallMode?: boolean }
  ): Promise<VoiceCallTurnResult> => {
    const hasAudioPayload = Boolean(options?.audio?.base64);
    const hasImagePayload = Boolean(options?.image?.base64);
    if (
      !text &&
      attachments.length === 0 &&
      !hasAudioPayload &&
      !hasImagePayload
    ) {
      return { reply: null };
    }
    if (isLoading || !activeSession) {
      return { reply: null };
    }

    const isVoiceCall =
      options?.interactionMode === "voice_call" ||
      options?.voiceCallMode === true;
    const isVoiceNote =
      options?.interactionMode === "voice_note" ||
      attachments.some((a) => a.isVoiceNote);
    const isVision =
      options?.interactionMode === "vision" ||
      hasImagePayload ||
      attachments.some((a) => a.mimeType.startsWith("image/"));

    const effectiveMode: "chat" | "voice_note" | "voice_call" | "vision" =
      isVoiceCall
        ? "voice_call"
        : isVoiceNote
          ? "voice_note"
          : isVision
            ? "vision"
            : "chat";

    setErrorMessage("");
    if (!isVoiceCall) {
      voice.stopSpeech();
    }
    const userMsgId = generateUniqueId("user");

    const displayText =
      text ||
      (isVoiceNote
        ? "🎤 Mengirim Voice Note (VN)"
        : isVoiceCall && hasAudioPayload
          ? "🎤 (Ucapan Suara Telepon AI)"
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
          isVoiceNote || isVoiceCall,
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
    persistSessions(updatedSessions);
    setLoadingMode(effectiveMode);
    setIsLoading(true);

    try {
      const payloadMessages = updatedMessages
        .filter((m) => m.id !== "msg-welcome")
        .map((m) => {
          const parsedNote = parseChatNoteMessage(m.content);
          if (parsedNote) {
            return {
              role: m.role,
              content: formatNoteForHistoryContext(parsedNote),
              attachments: m.attachments,
            };
          }
          const parsedGoogleDoc = parseGoogleDocMessage(m.content);
          return {
            role: m.role,
            content: parsedGoogleDoc
              ? formatGoogleDocForHistoryContext(parsedGoogleDoc)
              : m.content,
            attachments: m.attachments,
          };
        });

      const geminiHistory = payloadMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        content: m.content,
        parts: [{ text: m.content }],
        attachments: m.attachments,
      }));

      const geminiContents = payloadMessages.map((m) => ({
        role: m.role === "assistant" ? ("model" as const) : ("user" as const),
        parts: [{ text: m.content }],
        ...(m.attachments && m.attachments.length > 0
          ? { attachments: m.attachments }
          : {}),
      }));

      const requestPayload: Record<string, unknown> = {
        contents: geminiContents,
        messages: payloadMessages,
        history: geminiHistory,
        model: selectedModel,
        voiceCallMode: isVoiceCall,
      };

      if (effectiveMode !== "chat") {
        requestPayload.interactionMode = effectiveMode;
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

        // Update user message content in chat history when Voice Note / Call audio transcript is returned
        // so follow-up messages have 100% memory of what the user said in the Voice Note
        const messagesWithMemory = updatedMessages.map((m) => {
          if (m.id !== userMsgId) return m;

          if ((isVoiceNote || (isVoiceCall && hasAudioPayload)) && extractedTranscript) {
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

        const botMsgId = generateUniqueId("bot");
        const assistantMsg: ChatMessage = {
          id: botMsgId,
          role: "assistant",
          content: data.reply,
          modelBadge: selectedModel,
          timestamp: "Baru saja",
          attachments:
            isVision && userMsg.attachments ? userMsg.attachments : undefined,
        };

        if (Array.isArray(data.activePillars) && data.activePillars.length > 0) {
          setMessagePillarsMap((prev) => {
            const next = {
              ...prev,
              [botMsgId]: data.activePillars as string[],
            };
            persistMessagePillars(next);
            return next;
          });
        }

        const returnedSources: WebSourceCitation[] = Array.isArray(data.sources)
          ? (data.sources as unknown[])
              .map((item) => normalizeWebSourceCitation(item))
              .filter((item): item is WebSourceCitation => item !== null)
          : [];
        if (returnedSources.length > 0) {
          attachWebSourcesToMessage(botMsgId, returnedSources);
        }

        const returnedCreatedNotes: ChatNoteArtifact[] = Array.isArray(
          data.createdNotes
        )
          ? (data.createdNotes as unknown[])
              .map((item) => normalizeChatNoteArtifact(item))
              .filter((item): item is ChatNoteArtifact => item !== null)
          : [];

        const noteMessages: ChatMessage[] = returnedCreatedNotes.map((note) => ({
          id: generateUniqueId("note"),
          role: "assistant",
          content: encodeChatNoteMessage(note),
          modelBadge: selectedModel,
          timestamp: "Catatan",
        }));

        const returnedGoogleDocs: GoogleDocArtifact[] = Array.isArray(
          data.createdGoogleDocs
        )
          ? (data.createdGoogleDocs as unknown[])
              .map((item) => normalizeGoogleDocArtifact(item))
              .filter((item): item is GoogleDocArtifact => item !== null)
          : [];

        const gdocMessages: ChatMessage[] = returnedGoogleDocs.map((doc) => ({
          id: generateUniqueId("gdoc"),
          role: "assistant",
          content: encodeGoogleDocMessage(doc),
          modelBadge: selectedModel,
          timestamp: "Google Docs",
        }));

        const finalMessages = [
          ...messagesWithMemory,
          assistantMsg,
          ...noteMessages,
          ...gdocMessages,
        ];
        const finalSessions = updatedSessions.map((s) =>
          s.id === activeSession.id ? { ...s, messages: finalMessages } : s
        );

        setSessions(finalSessions);
        persistSessions(finalSessions);

        const returnedReplyAudio: VoiceCallReplyAudio | null =
          isVoiceCall &&
          data.replyAudio &&
          typeof data.replyAudio.base64 === "string"
            ? {
                base64: data.replyAudio.base64,
                mimeType:
                  typeof data.replyAudio.mimeType === "string"
                    ? data.replyAudio.mimeType
                    : "audio/wav",
              }
            : null;

        return {
          reply: data.reply as string,
          transcript: extractedTranscript || undefined,
          replyAudio: returnedReplyAudio,
          createdNotes:
            returnedCreatedNotes.length > 0 ? returnedCreatedNotes : undefined,
          createdGoogleDocs:
            returnedGoogleDocs.length > 0 ? returnedGoogleDocs : undefined,
          sources: returnedSources.length > 0 ? returnedSources : undefined,
        };
      } else {
        const technicalErrorText =
          data.reply ||
          `⚠️ **Error Teknis API (${res.status}):**\n\n\`\`\`\n${
            data.error || "Gagal mendapatkan balasan dari Gemini API."
          }\n\`\`\``;

        const errMsgId = generateUniqueId("bot-err");
        const errorAssistantMsg: ChatMessage = {
          id: errMsgId,
          role: "assistant",
          content: technicalErrorText,
          modelBadge: selectedModel,
          timestamp: "Error API",
        };

        const finalMessages = [...updatedMessages, errorAssistantMsg];
        const finalSessions = updatedSessions.map((s) =>
          s.id === activeSession.id ? { ...s, messages: finalMessages } : s
        );

        setSessions(finalSessions);
        persistSessions(finalSessions);
        setErrorMessage(data.error || "Gagal mendapatkan balasan dari AI.");
        return { reply: technicalErrorText };
      }
    } catch (err: unknown) {
      const networkErrorDetail =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      const technicalCatchText = `⚠️ **Error Teknis Koneksi / Jaringan:**\n\n\`\`\`\n${networkErrorDetail}\n\`\`\``;

      const errMsgId = generateUniqueId("bot-net-err");
      const errorAssistantMsg: ChatMessage = {
        id: errMsgId,
        role: "assistant",
        content: technicalCatchText,
        modelBadge: selectedModel,
        timestamp: "Error Jaringan",
      };

      const finalMessages = [...updatedMessages, errorAssistantMsg];
      const finalSessions = updatedSessions.map((s) =>
        s.id === activeSession.id ? { ...s, messages: finalMessages } : s
      );

      setSessions(finalSessions);
      persistSessions(finalSessions);
      setErrorMessage(networkErrorDetail);
      return { reply: null };
    } finally {
      setIsLoading(false);
      setLoadingMode("chat");
    }
  };

  const handleSendMessage = async (
    text: string,
    attachments: ChatAttachment[] = [],
    voiceCallModeOrOptions: boolean | MultimodalSendOptions = false
  ): Promise<string | null> => {
    const opts: MultimodalSendOptions & { voiceCallMode?: boolean } =
      typeof voiceCallModeOrOptions === "boolean"
        ? {
            voiceCallMode: voiceCallModeOrOptions,
            interactionMode: voiceCallModeOrOptions ? "voice_call" : "chat",
          }
        : voiceCallModeOrOptions;

    const res = await executeChatTurn(text, attachments, opts);
    return res.reply;
  };

  const handleStartVoiceCall = useCallback(() => {
    setIsVoiceMicMuted(false);
    setIsVoiceCallOpen(true);
  }, []);

  const handleEndVoiceCall = useCallback(() => {
    setIsVoiceCallOpen(false);
    setIsVoiceMicMuted(false);
  }, []);

  const handleLiveUserStream = useCallback(
    (turnId: string, spokenText: string) => {
      const trimmed = spokenText.trim();
      if (!turnId || !trimmed) return;
      const targetId = activeSessionIdRef.current;

      // Stream directly into React state (ZERO localStorage I/O until turnComplete)
      setSessions((prev) =>
        prev.map((sess) => {
          if (sess.id !== targetId) return sess;
          const existingIdx = sess.messages.findIndex((m) => m.id === turnId);
          if (existingIdx !== -1) {
            const updatedMsgs = sess.messages.map((m, i) =>
              i === existingIdx ? { ...m, content: trimmed } : m
            );
            const isOnlyUserMsg =
              updatedMsgs.filter((m) => m.role === "user").length === 1;
            return {
              ...sess,
              title: isOnlyUserMsg
                ? generateSessionTitle(trimmed, true, false)
                : sess.title,
              messages: updatedMsgs,
            };
          }
          const isFirstUser =
            sess.messages.filter((m) => m.role === "user").length === 0;
          const nextTitle = isFirstUser
            ? generateSessionTitle(trimmed, true, false)
            : sess.title;
          const userMsg: ChatMessage = {
            id: turnId,
            role: "user",
            content: trimmed,
            timestamp: "Suara",
          };
          return {
            ...sess,
            title: nextTitle,
            messages: [...sess.messages, userMsg],
          };
        })
      );
    },
    []
  );

  const handleLiveAssistantStream = useCallback(
    (turnId: string, text: string) => {
      const trimmed = text.trim();
      if (!turnId || !trimmed) return;
      const targetId = activeSessionIdRef.current;
      const modelBadge = selectedModelRef.current;

      // Stream directly into React state (ZERO localStorage I/O until turnComplete)
      setSessions((prev) =>
        prev.map((sess) => {
          if (sess.id !== targetId) return sess;
          const existingIdx = sess.messages.findIndex((m) => m.id === turnId);
          if (existingIdx !== -1) {
            const updatedMsgs = sess.messages.map((m, i) =>
              i === existingIdx ? { ...m, content: trimmed } : m
            );
            return { ...sess, messages: updatedMsgs };
          }
          const aiMsg: ChatMessage = {
            id: turnId,
            role: "assistant",
            content: trimmed,
            modelBadge,
            timestamp: "Suara",
          };
          return {
            ...sess,
            messages: [...sess.messages, aiMsg],
          };
        })
      );
    },
    []
  );

  const handleLiveTurnComplete = useCallback(
    (payload: {
      userTurnId?: string;
      userText?: string;
      assistantTurnId?: string;
      assistantText?: string;
      activePillars: string[];
      usedGoogleSearch: boolean;
    }) => {
      const targetId = activeSessionIdRef.current;
      const modelBadge = selectedModelRef.current;
      const cleanUser = payload.userText?.trim() || "";
      const cleanAi = payload.assistantText?.trim() || "";

      // Finalize turn text and persist to per-account localStorage ONCE on turnComplete
      setSessions((prev) => {
        const next = prev.map((sess) => {
          if (sess.id !== targetId) return sess;
          const msgs = [...sess.messages];
          let nextTitle = sess.title;

          if (payload.userTurnId && cleanUser) {
            const idx = msgs.findIndex((m) => m.id === payload.userTurnId);
            if (idx !== -1) {
              msgs[idx] = { ...msgs[idx], content: cleanUser };
            } else {
              msgs.push({
                id: payload.userTurnId,
                role: "user",
                content: cleanUser,
                timestamp: "Suara",
              });
            }
            if (msgs.filter((m) => m.role === "user").length === 1) {
              nextTitle = generateSessionTitle(cleanUser, true, false);
            }
          }

          if (payload.assistantTurnId && cleanAi) {
            const idx = msgs.findIndex((m) => m.id === payload.assistantTurnId);
            if (idx !== -1) {
              msgs[idx] = { ...msgs[idx], content: cleanAi };
            } else {
              msgs.push({
                id: payload.assistantTurnId,
                role: "assistant",
                content: cleanAi,
                modelBadge,
                timestamp: "Suara",
              });
            }
          }

          return {
            ...sess,
            title: nextTitle,
            messages: msgs,
          };
        });
        persistSessions(next);
        return next;
      });

      if (payload.assistantTurnId) {
        const msgId = payload.assistantTurnId;
        if (payload.activePillars.length > 0) {
          setMessagePillarsMap((prev) => {
            const next = { ...prev, [msgId]: payload.activePillars };
            persistMessagePillars(next);
            return next;
          });
        }
        if (payload.usedGoogleSearch) {
          setMessageGoogleSearchMap((prev) => {
            if (prev[msgId]) return prev;
            const next = { ...prev, [msgId]: true };
            persistMessageGoogleSearch(next);
            return next;
          });
        }
      }
    },
    [persistMessageGoogleSearch, persistMessagePillars, persistSessions]
  );

  const handleCreateChatNote = useCallback(
    (note: ChatNoteArtifact) => {
      const normalized = normalizeChatNoteArtifact(note);
      if (!normalized) return;
      const targetId = activeSessionIdRef.current;
      const modelBadge = selectedModelRef.current;

      setSessions((prev) => {
        const next = prev.map((sess) => {
          if (sess.id !== targetId) return sess;
          const noteMsg: ChatMessage = {
            id: generateUniqueId("note"),
            role: "assistant",
            content: encodeChatNoteMessage(normalized),
            modelBadge,
            timestamp: "Catatan",
          };
          return {
            ...sess,
            messages: [...sess.messages, noteMsg],
          };
        });
        persistSessions(next);
        return next;
      });
    },
    [persistSessions]
  );

  const attachWebSourcesToMessage = useCallback(
    (msgId: string, incomingSources: WebSourceCitation[]) => {
      if (
        !msgId ||
        !Array.isArray(incomingSources) ||
        incomingSources.length === 0
      ) {
        return;
      }
      setMessageGoogleSearchMap((prev) => {
        if (prev[msgId]) return prev;
        const next = { ...prev, [msgId]: true };
        persistMessageGoogleSearch(next);
        return next;
      });
      setMessageSourcesMap((prev) => {
        const merged = mergeUniqueWebSources(
          prev[msgId] || [],
          incomingSources,
          6
        );
        if (merged.length === 0) return prev;
        const next = { ...prev, [msgId]: merged };
        try {
          const entries = Object.entries(next).slice(-80);
          const sourcesKey = getScopedChatStorageKey(
            "formylab_msg_sources_v1",
            activeUserEmailRef.current
          );
          localStorage.setItem(
            sourcesKey,
            JSON.stringify(Object.fromEntries(entries))
          );
        } catch {
          // Ignore storage quota errors
        }
        return next;
      });
    },
    [persistMessageGoogleSearch]
  );

  const handleCreateGoogleDoc = useCallback(
    (doc: GoogleDocArtifact) => {
      const normalized = normalizeGoogleDocArtifact(doc);
      if (!normalized) return;
      const targetId = activeSessionIdRef.current;
      const modelBadge = selectedModelRef.current;

      setSessions((prev) => {
        const next = prev.map((sess) => {
          if (sess.id !== targetId) return sess;
          const gdocMsg: ChatMessage = {
            id: generateUniqueId("gdoc"),
            role: "assistant",
            content: encodeGoogleDocMessage(normalized),
            modelBadge,
            timestamp: "Google Docs",
          };
          return {
            ...sess,
            messages: [...sess.messages, gdocMsg],
          };
        });
        persistSessions(next);
        return next;
      });
    },
    [persistSessions]
  );

  const handleUpdateGoogleDocMessage = useCallback(
    (msgId: string, updatedDoc: GoogleDocArtifact) => {
      const normalized = normalizeGoogleDocArtifact(updatedDoc);
      if (!normalized) return;
      const encoded = encodeGoogleDocMessage(normalized);

      setSessions((prev) => {
        const next = prev.map((sess) => {
          if (!sess.messages.some((m) => m.id === msgId)) return sess;
          return {
            ...sess,
            messages: sess.messages.map((m) =>
              m.id === msgId ? { ...m, content: encoded } : m
            ),
          };
        });
        persistSessions(next);
        return next;
      });
    },
    [persistSessions]
  );

  const handleToggleGoogleDrive = useCallback(async () => {
    if (isConnectingDrive) return;
    if (isDriveConnected) {
      disconnectGoogleDrive();
      return;
    }
    setIsConnectingDrive(true);
    try {
      await connectGoogleDrive("");
    } catch {
      // User closed popup or Drive OAuth unavailable; GoogleDocCard handles fallback cleanly
    } finally {
      setIsConnectingDrive(false);
    }
  }, [isConnectingDrive, isDriveConnected]);

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

  const userInitials =
    userName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) || "FL";

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

  const conversationMessages = (activeSession?.messages || []).filter(
    (m) => m.id !== "msg-welcome"
  );

  const latestAiRawContent =
    activeSession?.messages
      .filter((m) => m.role === "assistant")
      .slice(-1)[0]?.content || "";
  const latestAiParsedNote = parseChatNoteMessage(latestAiRawContent);
  const latestAiParsedDoc = parseGoogleDocMessage(latestAiRawContent);
  const latestAiContextSnippet = latestAiParsedNote
    ? formatNoteForHistoryContext(latestAiParsedNote)
    : latestAiParsedDoc
      ? formatGoogleDocForHistoryContext(latestAiParsedDoc)
      : latestAiRawContent;

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#ffffff] text-[#0B2B26] font-matter">
      {/* LEFT COLLAPSIBLE SIDEBAR */}
      <aside
        className={`${
          isSidebarOpen ? "w-[292px] border-r border-[#0B2B26]/10" : "w-0"
        } shrink-0 bg-[#f6fbf9] text-[#2E524C] flex flex-col justify-between transition-all duration-200 overflow-hidden select-none z-30 shadow-none`}
      >
        {/* TOP SECTION OF SIDEBAR */}
        <div className="flex-1 min-h-0 flex flex-col p-3.5">
          {/* HEADER BAR: BrandLogo + Search Toggle + Hide Sidebar */}
          <div className="flex items-center justify-between gap-3 px-0.5 py-1 mb-3">
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="min-h-[44px] flex items-center text-left hover:opacity-85 transition cursor-pointer shrink-0"
              title="Kembali ke Dashboard"
            >
              <BrandLogo size="sm" variant="light" />
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleToggleSearch}
                className={`min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 cursor-pointer ${
                  isSearchOpen ? "btn-glass-primary" : "btn-glass-compact"
                }`}
                title={
                  isSearchOpen
                    ? "Sembunyikan Pencarian Chat"
                    : "Cari Riwayat Chat"
                }
                aria-label="Toggle Search Chat"
              >
                <Search className="w-3.5 h-3.5 text-[#0B2B26]" aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="btn-glass-compact min-h-[44px] min-w-[44px] flex items-center justify-center p-1.5 cursor-pointer"
                title="Sembunyikan Sidebar"
                aria-label="Hide Sidebar"
              >
                <PanelLeftClose className="w-3.5 h-3.5 text-[#0B2B26]" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* COLLAPSIBLE SEARCH BAR */}
          {isSearchOpen && (
            <div className="mb-3 px-0.5 animate-in fade-in duration-150">
              <div className="flex items-center gap-2 bg-white border border-[#0B2B26]/14 focus-within:border-[#0E807E] rounded-full px-3 min-h-[44px] transition-colors">
                <Search className="w-3.5 h-3.5 text-[#0E807E] shrink-0" aria-hidden="true" />
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
                  className="w-full bg-transparent text-xs text-[#0B2B26] placeholder-[#2E524C]/60 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsSearchOpen(false);
                    setSearchQuery("");
                  }}
                  className="text-[#2E524C] hover:text-[#0B2B26] p-1 rounded-full cursor-pointer"
                  title="Tutup bar pencarian"
                  aria-label="Close Search Bar"
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* PRIMARY NAVIGATION ACTIONS */}
          <div className="px-2 mb-1.5">
            <span className="eyebrow-label !text-[10px] text-[#0E807E]">
              Workspace
            </span>
          </div>
          <div className="space-y-2 mb-5">
            <button
              type="button"
              onClick={handleCreateNewSession}
              className="btn-glass-primary min-h-[44px] w-full flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer"
            >
              <SquarePen className="w-4 h-4 text-[#0E807E] shrink-0" aria-hidden="true" />
              <span>Obrolan baru</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/formulate")}
              className="btn-glass-compact min-h-[44px] w-full flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer"
            >
              <FlaskConical className="w-4 h-4 text-[#0E807E] shrink-0" aria-hidden="true" />
              <span>Studio Formulasi</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/library")}
              className="btn-glass-compact min-h-[44px] w-full flex items-center gap-2.5 px-3.5 py-2 text-xs cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-[#0E807E] shrink-0" aria-hidden="true" />
              <span>Pustaka Bahan</span>
            </button>
          </div>

          {/* RECENT CHATS SECTION */}
          <div className="px-2 mb-1.5 flex items-center justify-between">
            <span className="eyebrow-label !text-[10px] text-[#0E807E]">
              {searchQuery.trim()
                ? `Hasil Pencarian (${filteredSessions.length})`
                : "Terbaru"}
            </span>
          </div>

          {/* SESSION LIST */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-1 pr-0.5">
            {filteredSessions.length === 0 ? (
              <div className="px-3 py-4 text-xs text-[#2E524C]/75 text-center">
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
                    className={`group relative px-3 py-2 min-h-[44px] rounded-[12px] text-xs transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                      isActive
                        ? "bg-white text-[#0B2B26] font-medium border border-[#0E807E]/35"
                        : "text-[#2E524C] hover:bg-white/75 hover:text-[#0B2B26] border border-transparent"
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
                          className="w-full text-xs px-2.5 py-1 rounded-[10px] bg-white text-[#0B2B26] border border-[#0E807E] focus:outline-none"
                          autoFocus
                        />
                        <button
                          type="submit"
                          className="btn-glass-primary p-1.5 cursor-pointer"
                          title="Simpan"
                        >
                          <Check className="w-3 h-3 text-[#0E807E]" aria-hidden="true" />
                        </button>
                      </form>
                    ) : (
                      <>
                        <span className="truncate flex-1">{sess.title}</span>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleStartRename(e, sess)}
                            className="btn-glass-compact p-1 cursor-pointer"
                            title="Ubah judul"
                          >
                            <Pencil className="w-3 h-3 text-[#0B2B26]" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(e, sess.id)}
                            className="btn-glass-danger p-1 cursor-pointer"
                            title="Hapus obrolan"
                          >
                            <Trash2 className="w-3 h-3" aria-hidden="true" />
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

        {/* BOTTOM USER PROFILE */}
        <div className="p-3.5 border-t border-[#0B2B26]/10 flex items-center gap-2.5 bg-[#f6fbf9]">
          <div className="w-8 h-8 rounded-full bg-[#eaf8f5] border border-[#0B2B26]/10 text-[#0E807E] font-medium text-xs flex items-center justify-center shrink-0">
            {userInitials}
          </div>
          <div className="min-w-0">
            <div className="text-xs font-medium text-[#0B2B26] truncate">
              {userName}
            </div>
            <div className="text-[10px] text-[#2E524C] truncate">
              R&amp;D Workspace
            </div>
          </div>
        </div>
      </aside>

      {/* EXPANSIVE MAIN CHAT ROOM VIEWPORT */}
      <main className="flex-1 flex flex-col h-full min-w-0 bg-[#ffffff] relative">
        {/* MINIMAL TOP BAR */}
        <header className="shrink-0 h-16 px-4 sm:px-6 flex items-center justify-between border-b border-[#0B2B26]/10 bg-white/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 min-w-0">
            {!isSidebarOpen && (
              <div className="flex items-center gap-1.5 mr-1">
                <button
                  type="button"
                  onClick={() => setIsSidebarOpen(true)}
                  className="btn-glass-compact min-h-[44px] min-w-[44px] flex items-center justify-center p-2 cursor-pointer"
                  title="Tampilkan Sidebar Riwayat"
                  aria-label="Open Sidebar"
                >
                  <PanelLeftOpen className="w-4 h-4 text-[#0B2B26]" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewSession}
                  className="btn-glass-compact min-h-[44px] min-w-[44px] flex items-center justify-center p-2 cursor-pointer"
                  title="Obrolan Baru"
                  aria-label="New Chat"
                >
                  <SquarePen className="w-4 h-4 text-[#0B2B26]" aria-hidden="true" />
                </button>
              </div>
            )}

            <div className="flex items-center gap-2.5 min-w-0">
              {!isSidebarOpen && (
                <>
                  <button
                    type="button"
                    onClick={() => router.push("/dashboard")}
                    className="min-h-[44px] flex items-center hover:opacity-85 transition cursor-pointer shrink-0"
                    title="Kembali ke Dashboard"
                  >
                    <BrandLogo size="sm" variant="light" />
                  </button>
                  <span className="text-[#0B2B26]/25">·</span>
                </>
              )}
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2E524C] truncate">
                <ModelIcon
                  modelId={activeModelOption.id}
                  className="w-3.5 h-3.5 text-[#0E807E]"
                  idSuffix="top-header"
                />
                <span>{activeModelOption.name}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isDriveConfigured && (
              <button
                type="button"
                onClick={handleToggleGoogleDrive}
                disabled={isConnectingDrive}
                className={`min-h-[44px] px-3 py-1.5 text-xs inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap transition-all ${
                  isDriveConnected
                    ? "rounded-full bg-[#e6f6f2] hover:bg-[#daf2ec] border border-[#0E807E]/30 text-[#0B2B26] font-medium"
                    : "btn-glass-compact text-[#2E524C]"
                }`}
                title={
                  isDriveConnected
                    ? "Google Drive terhubung (klik untuk putuskan sesi)"
                    : "Hubungkan Google Drive agar AI bisa langsung membuat file Google Docs"
                }
              >
                {isConnectingDrive ? (
                  <Loader2
                    className="w-3.5 h-3.5 text-[#0E807E] animate-spin"
                    aria-hidden="true"
                  />
                ) : isDriveConnected ? (
                  <span
                    className="w-2 h-2 rounded-full bg-[#0E807E] shrink-0"
                    aria-hidden="true"
                  />
                ) : (
                  <Cloud
                    className="w-3.5 h-3.5 text-[#0E807E] shrink-0"
                    aria-hidden="true"
                  />
                )}
                <span className="hidden sm:inline">
                  {isDriveConnected ? "Drive Terhubung" : "Hubungkan Drive"}
                </span>
              </button>
            )}

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
                    persistSessions(updated);
                  }
                }}
                className="btn-glass-danger min-h-[44px] text-xs px-3.5 py-1.5 cursor-pointer whitespace-nowrap"
              >
                <span>Bersihkan Chat</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="btn-glass-secondary min-h-[44px] px-3.5 py-1.5 text-xs cursor-pointer whitespace-nowrap"
            >
              <span>← Dashboard</span>
            </button>
          </div>
        </header>

        {/* STATE 1: NEW / EMPTY CHAT */}
        {isNewEmptyChat ? (
          <div className="flex-1 flex flex-col items-center justify-center px-4 sm:px-6 pb-12 overflow-y-auto">
            <div className="w-full max-w-2xl mx-auto flex flex-col items-center">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] mb-3">
                AI Cosmetic Chemist Co-Pilot
              </span>

              {/* DYNAMIC PERSONALIZED GREETING */}
              <h1
                key={greetingIndex}
                className="text-2xl sm:text-[34px] font-medium text-[#0B2B26] text-center tracking-[-0.03em] leading-[1.16] mb-7 text-balance animate-in fade-in duration-300"
              >
                {dynamicGreetings[greetingIndex]}
              </h1>

              {/* COMPOSER BAR */}
              <div className="w-full mb-5">
                <ChatComposerBar
                  selectedModel={selectedModel}
                  onSelectModel={handleSelectModel}
                  onSend={(t, att, opts) =>
                    handleSendMessage(t, att, opts || false)
                  }
                  onStartVoiceCall={handleStartVoiceCall}
                  isLoading={isLoading}
                  placeholder="Tanya formylab.ai apa saja..."
                />
              </div>

              {/* STARTER ACTION PILLS — Optical Glass Compact */}
              <div className="w-full max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {starterActions.map((item, idx) => {
                  const IconComp = item.icon;
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendMessage(item.prompt, [])}
                      className="btn-glass-compact min-h-[44px] flex items-center gap-3 px-4 py-3 text-left text-xs cursor-pointer"
                    >
                      <IconComp className="w-4 h-4 text-[#0E807E] shrink-0" aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* STATE 2: ACTIVE CONVERSATION (INCLUDING INLINE AI VOICE MODE) */
          <>
            <div
              ref={messagesContainerRef}
              className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 py-7"
            >
              <div
                className={`max-w-3xl lg:max-w-4xl mx-auto w-full space-y-6 ${
                  isVoiceCallOpen ? "pb-48 sm:pb-52" : "pb-4"
                }`}
              >
                {conversationMessages.length === 0 && isVoiceCallOpen && (
                  <div className="py-12 text-center">
                    <p className="text-sm font-medium text-[#0B2B26]">
                      Mode Suara AI aktif di room chat
                    </p>
                    <p className="mt-1 text-xs text-[#2E524C]">
                      Langsung bicara atau minta dibuatkan catatan &amp; tabel — percakapan akan mengalir otomatis di sini.
                    </p>
                  </div>
                )}

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
                        <div className="max-w-[82%] sm:max-w-[74%] rounded-[16px] bg-[#0B2B26] text-white px-4 py-3 text-[14.5px] leading-relaxed shadow-none">
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="space-y-2 mb-2.5">
                              {msg.attachments.map((att) => (
                                <div
                                  key={att.id}
                                  className="rounded-[12px] p-2.5 bg-white/10 border border-white/15 text-white"
                                >
                                  {att.isVoiceNote ? (
                                    <div className="flex flex-col gap-1.5">
                                      <div className="flex items-center justify-between gap-2 text-xs font-medium">
                                        <span>🎤 {att.name}</span>
                                        <span className="text-[10px] text-white/75 font-mono tabular-nums">
                                          {att.sizeLabel}
                                        </span>
                                      </div>
                                      {att.dataUrl && (
                                        <audio
                                          src={att.dataUrl}
                                          controls
                                          className="w-full h-8 mt-0.5"
                                        />
                                      )}
                                      {att.textPreview && (
                                        <div className="mt-1 pt-1.5 border-t border-white/15 text-xs text-white/90">
                                          <span className="text-[10px] uppercase tracking-[0.08em] text-[#47C4A5] font-medium block mb-0.5">
                                            Transkrip Suara:
                                          </span>
                                          <span>&ldquo;{att.textPreview}&rdquo;</span>
                                        </div>
                                      )}
                                    </div>
                                  ) : att.mimeType.startsWith("image/") &&
                                    att.dataUrl ? (
                                    <div className="space-y-1.5">
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={att.dataUrl}
                                        alt={att.name}
                                        className="max-h-56 rounded-[10px] object-contain border border-white/15"
                                      />
                                      <div className="text-xs font-medium truncate">
                                        📎 {att.name} ({att.sizeLabel})
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2 text-xs">
                                      <span className="font-medium truncate">
                                        📄 {att.name}
                                      </span>
                                      <span className="text-[10px] text-white/75 shrink-0">
                                        {att.sizeLabel}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                          <FormattedChatText content={msg.content} tone="on-dark" />
                        </div>
                      </div>
                    );
                  }

                  const parsedNote = parseChatNoteMessage(msg.content);
                  if (parsedNote) {
                    return (
                      <div
                        key={`${msg.id}-${msgIdx}`}
                        className="flex items-start gap-3.5 justify-start"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#f4fbf8] border border-[#0B2B26]/10 text-[#0E807E] mt-0.5 shadow-none">
                          <ModelIcon
                            modelId={msgModelOpt.id}
                            className="w-4 h-4"
                            idSuffix={`note-${msg.id}-${msgIdx}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <ChatNoteCard
                            note={parsedNote}
                            onSaveToGoogleDocs={(noteItem) =>
                              handleCreateGoogleDoc({
                                title: noteItem.title,
                                markdownContent: noteItem.markdownContent,
                                status: "draft",
                              })
                            }
                          />
                        </div>
                      </div>
                    );
                  }

                  const parsedGoogleDoc = parseGoogleDocMessage(msg.content);
                  if (parsedGoogleDoc) {
                    return (
                      <div
                        key={`${msg.id}-${msgIdx}`}
                        className="flex items-start gap-3.5 justify-start"
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#f4fbf8] border border-[#0B2B26]/10 text-[#0E807E] mt-0.5 shadow-none">
                          <ModelIcon
                            modelId={msgModelOpt.id}
                            className="w-4 h-4"
                            idSuffix={`gdoc-${msg.id}-${msgIdx}`}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <GoogleDocCard
                            doc={parsedGoogleDoc}
                            onDocUpdated={(nextDoc) =>
                              handleUpdateGoogleDocMessage(msg.id, nextDoc)
                            }
                          />
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={`${msg.id}-${msgIdx}`}
                      className="flex items-start gap-3.5 justify-start"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-[#f4fbf8] border border-[#0B2B26]/10 text-[#0E807E] mt-0.5 shadow-none">
                        <ModelIcon
                          modelId={msgModelOpt.id}
                          className="w-4 h-4"
                          idSuffix={`msg-${msg.id}-${msgIdx}`}
                        />
                      </div>

                      <div className="flex-1 min-w-0 bg-[#f8fdfb] rounded-[16px] px-5 py-4 border border-[#0B2B26]/10 text-[#0B2B26] shadow-none">
                        <div className="flex items-center gap-2 mb-2 text-xs text-[#2E524C]">
                          <span className="font-medium text-[#0B2B26]">
                            {msgModelOpt.name}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>{msg.timestamp}</span>
                        </div>

                        <FormattedChatText content={msg.content} tone="light" />

                        {(messageGoogleSearchMap[msg.id] ||
                          (messageSourcesMap[msg.id] &&
                            messageSourcesMap[msg.id].length > 0)) && (
                          <div
                            className="mt-3 pt-2.5 border-t border-[#0B2B26]/8 flex flex-wrap items-center gap-1.5"
                            aria-label="Sumber verifikasi internet"
                          >
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10.5px] font-medium bg-[#eaf8f5] text-[#0E807E] border border-[#0E807E]/20 mr-0.5">
                              <Globe
                                className="w-3 h-3 text-[#0E807E]"
                                aria-hidden="true"
                              />
                              <span>Google Search</span>
                            </span>
                            {messageSourcesMap[msg.id]?.map((src, sIdx) => (
                              <a
                                key={`${src.url}-${sIdx}`}
                                href={src.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                title={src.title}
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium text-[#0B2B26] hover:text-[#0E807E] bg-white/75 hover:bg-white border border-[#0B2B26]/12 hover:border-[#0E807E]/35 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] transition-all max-w-[200px]"
                              >
                                <span className="truncate">{src.domain}</span>
                                <ExternalLink
                                  className="w-2.5 h-2.5 text-[#0E807E] shrink-0"
                                  aria-hidden="true"
                                />
                              </a>
                            ))}
                          </div>
                        )}

                        <InteractiveMessageActions
                          messageId={msg.id}
                          content={msg.content}
                          contextText={[
                            activeSession?.title || "",
                            ...conversationMessages
                              .slice(Math.max(0, msgIdx - 3), msgIdx)
                              .map((m) => {
                                const noteCtx = parseChatNoteMessage(m.content);
                                if (noteCtx) {
                                  return formatNoteForHistoryContext(noteCtx);
                                }
                                const docCtx = parseGoogleDocMessage(m.content);
                                return docCtx
                                  ? formatGoogleDocForHistoryContext(docCtx)
                                  : m.content;
                              }),
                          ]
                            .filter(Boolean)
                            .join("\n")}
                          attachments={msg.attachments}
                          activePillars={messagePillarsMap[msg.id]}
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
                    <div className="w-8 h-8 rounded-full bg-[#f4fbf8] border border-[#0B2B26]/10 text-[#0E807E] flex items-center justify-center shrink-0 shadow-none">
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                    </div>
                    <div className="bg-[#f8fdfb] px-4 py-2.5 rounded-[16px] text-xs font-medium text-[#0E807E] border border-[#0B2B26]/10 shadow-none">
                      {loadingMode === "voice_note"
                        ? "Mendengarkan & mentranskrip Voice Note..."
                        : loadingMode === "vision"
                          ? "Menganalisis foto dengan Computer Vision..."
                          : `${activeModelOption.name} sedang menyusun jawaban...`}
                    </div>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3.5 rounded-[16px] bg-[#fef2f2] border border-[#b91c1c]/20 text-[#b91c1c] text-xs font-medium shadow-none">
                    ⚠️ {errorMessage}
                  </div>
                )}
              </div>
            </div>

            {/* PINNED COMPOSER AT BOTTOM + FLOATING INLINE 3D PARTICLE SPHERE */}
            <div className="relative shrink-0 w-full max-w-3xl lg:max-w-4xl mx-auto px-4 sm:px-6 pb-4 pt-2 bg-white">
              {isVoiceCallOpen && (
                <div className="pointer-events-none absolute bottom-full left-0 right-0 flex justify-center pb-2 z-20">
                  <LiveVoiceCallModal
                    isOpen={isVoiceCallOpen}
                    onClose={handleEndVoiceCall}
                    voice={voice}
                    isMicMuted={isVoiceMicMuted}
                    modelName={activeModelOption.name}
                    isAiThinking={isLoading}
                    latestAiReply={latestAiContextSnippet}
                    onLiveUserStream={handleLiveUserStream}
                    onLiveAssistantStream={handleLiveAssistantStream}
                    onLiveTurnComplete={handleLiveTurnComplete}
                    onLiveWebSources={attachWebSourcesToMessage}
                    onCreateChatNote={handleCreateChatNote}
                    onCreateGoogleDoc={handleCreateGoogleDoc}
                  />
                </div>
              )}

              <ChatComposerBar
                selectedModel={selectedModel}
                onSelectModel={handleSelectModel}
                onSend={(t, att, opts) =>
                  handleSendMessage(t, att, opts || false)
                }
                onStartVoiceCall={handleStartVoiceCall}
                isVoiceActive={isVoiceCallOpen}
                isVoiceMicMuted={isVoiceMicMuted}
                onToggleVoiceMicMute={() => setIsVoiceMicMuted((prev) => !prev)}
                onEndVoiceCall={handleEndVoiceCall}
                isLoading={isLoading}
                compact
                placeholder="Tanya formylab.ai apa saja..."
              />
            </div>
          </>
        )}
      </main>
    </div>
  );
}
