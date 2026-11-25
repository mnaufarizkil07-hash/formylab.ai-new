"use client";

import React from "react";
import {
  InteractiveVoiceCallOverlay,
  VoiceCallReplyAudio,
  VoiceCallTurnPayload,
  VoiceSynthesisState,
} from "./InteractiveVoiceController";
import {
  ChatNoteArtifact,
  GoogleDocArtifact,
  WebSourceCitation,
} from "./chatNoteUtils";

export interface VoiceTranscriptEntry {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
}

export interface GeneratedVoiceDocFile {
  filename: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface VoiceCallTurnResult extends VoiceCallTurnPayload {
  reply: string | null;
  transcript?: string;
  replyAudio?: VoiceCallReplyAudio | null;
  createdNotes?: ChatNoteArtifact[];
  createdGoogleDocs?: GoogleDocArtifact[];
  sources?: WebSourceCitation[];
}

export type CallState =
  | "idle"
  | "listening"
  | "thinking"
  | "speaking"
  | "error";

interface LiveVoiceCallModalProps {
  isOpen: boolean;
  onClose: () => void;
  voice?: VoiceSynthesisState;
  isMicMuted?: boolean;
  modelName?: string;
  isAiThinking?: boolean;
  latestAiReply?: string;
  onLiveUserStream?: (turnId: string, text: string) => void;
  onLiveAssistantStream?: (turnId: string, text: string) => void;
  onLiveTurnComplete?: (payload: {
    userTurnId?: string;
    userText?: string;
    assistantTurnId?: string;
    assistantText?: string;
    activePillars: string[];
    usedGoogleSearch: boolean;
  }) => void;
  onLiveWebSources?: (turnId: string, sources: WebSourceCitation[]) => void;
  onCreateChatNote?: (note: ChatNoteArtifact) => void;
  onCreateGoogleDoc?: (doc: GoogleDocArtifact) => void;
}

export default function LiveVoiceCallModal({
  isOpen,
  onClose,
  voice,
  isMicMuted = false,
  latestAiReply,
  onLiveUserStream,
  onLiveAssistantStream,
  onLiveTurnComplete,
  onLiveWebSources,
  onCreateChatNote,
  onCreateGoogleDoc,
}: LiveVoiceCallModalProps) {
  return (
    <InteractiveVoiceCallOverlay
      isOpen={isOpen}
      onClose={onClose}
      voice={voice}
      isMicMuted={isMicMuted}
      recentChatContext={latestAiReply}
      onLiveUserStream={onLiveUserStream}
      onLiveAssistantStream={onLiveAssistantStream}
      onLiveTurnComplete={onLiveTurnComplete}
      onLiveWebSources={onLiveWebSources}
      onCreateChatNote={onCreateChatNote}
      onCreateGoogleDoc={onCreateGoogleDoc}
    />
  );
}
