import React from "react";

export type AiModelId =
  | "auto"
  | "gpt-6-luna"
  | "gemini-3.8-flash"
  | "gemini-3.8-pro"
  | "gpt-6-omni";

export interface AiModelOption {
  id: AiModelId;
  name: string;
  shortName: string;
  provider: "auto" | "openai" | "google";
  category: ("popular" | "openai" | "google")[];
  description: string;
  isNew?: boolean;
}

export const AI_MODEL_OPTIONS: AiModelOption[] = [
  {
    id: "auto",
    name: "Auto",
    shortName: "Auto",
    provider: "auto",
    category: ["popular"],
    description: "Smart model selection",
  },
  {
    id: "gpt-6-luna",
    name: "GPT-6 Luna",
    shortName: "GPT-6 Luna",
    provider: "openai",
    category: ["popular", "openai"],
    description: "OpenAI's most efficient model for focused, high-volume tasks",
    isNew: true,
  },
  {
    id: "gemini-3.8-flash",
    name: "Gemini 3.8 Flash",
    shortName: "Gemini 3.8 Flash",
    provider: "google",
    category: ["popular", "google"],
    description: "Google's fast multimodal model for R&D chemistry, files & voice",
    isNew: true,
  },
  {
    id: "gemini-3.8-pro",
    name: "Gemini 3.8 Pro",
    shortName: "Gemini 3.8 Pro",
    provider: "google",
    category: ["popular", "google"],
    description: "Google's advanced reasoning model for complex cosmetic formulation",
  },
  {
    id: "gpt-6-omni",
    name: "GPT-6 Omni",
    shortName: "GPT-6 Omni",
    provider: "openai",
    category: ["openai"],
    description: "OpenAI's flagship multimodal model for deep R&D analysis",
  },
];

export function getModelOption(modelId?: string): AiModelOption {
  if (!modelId) return AI_MODEL_OPTIONS[0];
  if (modelId === "gpt") return AI_MODEL_OPTIONS[1]; // GPT-6 Luna
  if (modelId === "gemini") return AI_MODEL_OPTIONS[2]; // Gemini 3.8 Flash
  return (
    AI_MODEL_OPTIONS.find((m) => m.id === modelId) || AI_MODEL_OPTIONS[0]
  );
}

/**
 * Official OpenAI Blossom Knot SVG Logo
 */
export function OpenAILogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-2.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364 15.1192 7.2a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
    </svg>
  );
}

/**
 * Official Google Gemini Sparkle Star SVG Logo
 */
export function GeminiLogo({
  className = "w-5 h-5",
  idSuffix = "default",
}: {
  className?: string;
  idSuffix?: string;
}) {
  const gradId = `geminiOfficialGrad-${idSuffix}`;
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M12 1.5C12 7.299 7.299 12 1.5 12C7.299 12 12 16.701 12 22.5C12 16.701 16.701 12 22.5 12C16.701 12 12 7.299 12 1.5Z"
        fill={`url(#${gradId})`}
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="2"
          y1="2"
          x2="22"
          y2="22"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#4285F4" />
          <stop offset="50%" stopColor="#9B72CB" />
          <stop offset="100%" stopColor="#D96570" />
        </linearGradient>
      </defs>
    </svg>
  );
}

/**
 * Smart "Auto" Starburst Icon (matching reference screenshot 2 & 3)
 */
export function AutoModelLogo({ className = "w-5 h-5" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
    >
      <line x1="12" y1="2.5" x2="12" y2="7.5" />
      <line x1="12" y1="16.5" x2="12" y2="21.5" />
      <line x1="2.5" y1="12" x2="7.5" y2="12" />
      <line x1="16.5" y1="12" x2="21.5" y2="12" />
      <line x1="5.3" y1="5.3" x2="8.8" y2="8.8" />
      <line x1="15.2" y1="15.2" x2="18.7" y2="18.7" />
      <line x1="18.7" y1="5.3" x2="15.2" y2="8.8" />
      <line x1="8.8" y1="15.2" x2="5.3" y2="18.7" />
    </svg>
  );
}

export function ModelIcon({
  modelId,
  className = "w-5 h-5",
  idSuffix = "icon",
}: {
  modelId?: string;
  className?: string;
  idSuffix?: string;
}) {
  const opt = getModelOption(modelId);
  if (opt.provider === "openai") {
    return <OpenAILogo className={className} />;
  }
  if (opt.provider === "google") {
    return <GeminiLogo className={className} idSuffix={idSuffix} />;
  }
  return <AutoModelLogo className={className} />;
}
