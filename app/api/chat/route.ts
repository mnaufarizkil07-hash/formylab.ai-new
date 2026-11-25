import { NextRequest, NextResponse } from "next/server";
import {
  Content,
  GenerateContentResponse,
  GoogleGenAI,
  ThinkingLevel,
  Tool,
  Type,
} from "@google/genai";
import { getModelOption } from "../../../components/AiModelLogos";
import {
  cleanComputerArtifacts,
  stripDanglingMarkdownAndLeadingSymbols,
} from "../../../components/FormattedChatText";
import {
  ChatNoteArtifact,
  CREATE_CHAT_NOTE_TOOL_DECLARATION,
  CREATE_GOOGLE_DOC_TOOL_DECLARATION,
  extractGoogleDocArtifactsFromReply,
  extractNoteArtifactsFromReply,
  extractWebSourcesFromGroundingMetadata,
  GDOC_ARTIFACT_FALLBACK_DIRECTIVE,
  GoogleDocArtifact,
  mergeUniqueWebSources,
  normalizeChatNoteArtifact,
  normalizeGoogleDocArtifact,
  NOTE_ARTIFACT_FALLBACK_DIRECTIVE,
  WEB_SEARCH_TOOL_DECLARATION,
  WebSourceCitation,
} from "../../../components/chatNoteUtils";
import {
  ApiChatMessage,
  buildGeminiConversationHistory,
  buildGeminiToolsConfig,
  classifyUserQueryIntent,
  discoverDynamicGeminiModels,
  getGeminiFallbackModelChain,
  getSystemInstructionForUiModel,
  normalizeIncomingChatMessages,
  PRIMARY_GEMINI_SDK_MODEL,
} from "../../../lib/geminiAgentConfig";

const GOOGLE_SEARCH_GROUNDING_APPEND =
  "Jika pertanyaan user menyangkut fakta spesifik, data terkini, atau jika user mengoreksi jawabanmu sebelumnya, verifikasi lewat Google Search terlebih dahulu lalu sampaikan fakta yang benar dengan tetap mempertahankan gaya bicaramu yang natural.";

const SDK_CREATE_CHAT_NOTE_TOOLS: Tool[] = [
  {
    functionDeclarations: [
      {
        name: CREATE_CHAT_NOTE_TOOL_DECLARATION.name,
        description: CREATE_CHAT_NOTE_TOOL_DECLARATION.description,
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description:
                CREATE_CHAT_NOTE_TOOL_DECLARATION.parameters.properties.title
                  .description,
            },
            format: {
              type: Type.STRING,
              enum: ["paragraph", "table", "mixed"],
              description:
                CREATE_CHAT_NOTE_TOOL_DECLARATION.parameters.properties.format
                  .description,
            },
            markdownContent: {
              type: Type.STRING,
              description:
                CREATE_CHAT_NOTE_TOOL_DECLARATION.parameters.properties
                  .markdownContent.description,
            },
          },
          required: ["title", "format", "markdownContent"],
        },
      },
      {
        name: CREATE_GOOGLE_DOC_TOOL_DECLARATION.name,
        description: CREATE_GOOGLE_DOC_TOOL_DECLARATION.description,
        parameters: {
          type: Type.OBJECT,
          properties: {
            title: {
              type: Type.STRING,
              description:
                CREATE_GOOGLE_DOC_TOOL_DECLARATION.parameters.properties.title
                  .description,
            },
            markdownContent: {
              type: Type.STRING,
              description:
                CREATE_GOOGLE_DOC_TOOL_DECLARATION.parameters.properties
                  .markdownContent.description,
            },
          },
          required: ["title", "markdownContent"],
        },
      },
      {
        name: WEB_SEARCH_TOOL_DECLARATION.name,
        description: WEB_SEARCH_TOOL_DECLARATION.description,
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description:
                WEB_SEARCH_TOOL_DECLARATION.parameters.properties.query
                  .description,
            },
          },
          required: ["query"],
        },
      },
    ],
  },
];

function extractNoteFunctionCalls(
  response: GenerateContentResponse
): ChatNoteArtifact[] {
  const collected: ChatNoteArtifact[] = [];
  const rawCalls = Array.isArray(response.functionCalls)
    ? response.functionCalls
    : [];

  for (const call of rawCalls) {
    if (call?.name === "create_chat_note") {
      const normalized = normalizeChatNoteArtifact(call.args);
      if (normalized) {
        collected.push(normalized);
      }
    }
  }

  if (collected.length === 0) {
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.functionCall?.name === "create_chat_note") {
        const normalized = normalizeChatNoteArtifact(part.functionCall.args);
        if (normalized) {
          collected.push(normalized);
        }
      }
    }
  }

  return collected;
}

function extractGoogleDocFunctionCalls(
  response: GenerateContentResponse
): GoogleDocArtifact[] {
  const collected: GoogleDocArtifact[] = [];
  const rawCalls = Array.isArray(response.functionCalls)
    ? response.functionCalls
    : [];

  for (const call of rawCalls) {
    if (call?.name === "create_google_doc") {
      const normalized = normalizeGoogleDocArtifact(call.args);
      if (normalized) {
        collected.push(normalized);
      }
    }
  }

  if (collected.length === 0) {
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.functionCall?.name === "create_google_doc") {
        const normalized = normalizeGoogleDocArtifact(part.functionCall.args);
        if (normalized) {
          collected.push(normalized);
        }
      }
    }
  }

  return collected;
}

function mergeUniqueNotes(
  first: ChatNoteArtifact[],
  second: ChatNoteArtifact[]
): ChatNoteArtifact[] {
  const seen = new Set<string>();
  const merged: ChatNoteArtifact[] = [];
  for (const item of [...first, ...second]) {
    const key = `${item.title.trim().toLowerCase()}::${item.markdownContent.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function mergeUniqueGoogleDocs(
  first: GoogleDocArtifact[],
  second: GoogleDocArtifact[]
): GoogleDocArtifact[] {
  const seen = new Set<string>();
  const merged: GoogleDocArtifact[] = [];
  for (const item of [...first, ...second]) {
    const key = `${item.title.trim().toLowerCase()}::${item.markdownContent.trim()}`;
    if (!seen.has(key)) {
      seen.add(key);
      merged.push(item);
    }
  }
  return merged;
}

function extractResponseText(response: GenerateContentResponse): string {
  // Strictly extract ONLY response.text and NEVER concatenate groundingMetadata
  const rawTextProp = (
    response as unknown as { text?: string | (() => string) }
  ).text;
  const directText =
    typeof rawTextProp === "function"
      ? rawTextProp.call(response)?.trim()
      : rawTextProp?.trim();

  if (directText) {
    return directText;
  }

  const candidateParts = response.candidates?.[0]?.content?.parts || [];
  const textFragments: string[] = [];
  for (const part of candidateParts) {
    if (part.text) {
      textFragments.push(part.text);
    }
  }
  return textFragments.join("\n").trim();
}

function cleanModelMarkdownReply(rawReply: string): string {
  const cleaned = cleanComputerArtifacts(rawReply)
    .replace(
      /(?:https?:\/\/|www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\s*(?:>|›|»)\s*[^\s\n|]+)+/gi,
      ""
    )
    .replace(
      /(?:^|\s|\*\*)(?:>|›|»)\s*[a-z0-9_-]+(?:\s*(?:>|›|»)\s*[a-z0-9_-]+)+/gi,
      " "
    )
    .replace(
      /\b(?:Sanggahan|Disclaimer|Terjemahkan\s+halaman\s+ini|Lihat\s+hasil\s+untuk|Hasil\s+pencarian\s+web)\s*:?[^\n]*/gi,
      ""
    )
    .trim();

  return stripDanglingMarkdownAndLeadingSymbols(
    cleaned.replace(/\n{3,}/g, "\n\n").trim()
  );
}

function isModelNotFoundError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /\b404\b|NOT_FOUND|is not found/i.test(msg);
}

/**
 * Memanggil generateContent untuk satu kandidat model dengan Fallback Tool Google Search:
 * 1. Mencoba memanggil dengan `tools: [{ googleSearch: {} }]` dan mengekstrak `groundingMetadata.groundingChunks`.
 * 2. Jika gagal karena parameter `tools` tidak didukung oleh model tersebut (mis. 400 INVALID_ARGUMENT / tool error),
 *    otomatis mengulangi pemanggilan (retry) pada model yang sama TANPA parameter `tools`.
 */
async function callModelWithSearchToolFallback(params: {
  ai: GoogleGenAI;
  modelName: string;
  contents: Content[];
  systemInstruction: string;
}): Promise<{ text: string; engineUsed: string; sources: WebSourceCitation[] }> {
  const tools = buildGeminiToolsConfig({
    enableGoogleSearch: true,
    enableCodeExecution: false,
  });
  const googleSearchTools =
    tools.length > 0 ? tools : ([{ googleSearch: {} }] as const);

  try {
    // Percobaan pertama WAJIB menyertakan tools: [{ googleSearch: {} }]
    const groundedRes = await params.ai.models.generateContent({
      model: params.modelName,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        tools: googleSearchTools as typeof tools,
      },
    });

    const text = extractResponseText(groundedRes);
    const sources = extractWebSourcesFromGroundingMetadata(
      groundedRes.candidates?.[0]?.groundingMetadata,
      6
    );
    if (text) {
      return {
        text,
        engineUsed: `${params.modelName}+googleSearch`,
        sources,
      };
    }
    throw new Error(
      `Respons dari model "${params.modelName}" (dengan googleSearch) kosong.`
    );
  } catch (searchToolErr: unknown) {
    // Jika error adalah 404 Model Not Found, langsung lempar agar loop mencoba model berikutnya
    if (isModelNotFoundError(searchToolErr)) {
      throw searchToolErr;
    }

    // Fallback Tool Google Search: ulangi pemanggilan pada model tersebut TANPA menyertakan parameter tools
    const ungroundedRes = await params.ai.models.generateContent({
      model: params.modelName,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
      },
    });

    const fallbackText = extractResponseText(ungroundedRes);
    if (fallbackText) {
      return {
        text: fallbackText,
        engineUsed: params.modelName,
        sources: [],
      };
    }
    throw searchToolErr;
  }
}

/**
 * Automatic Model Fallback & Dynamic Discovery:
 * 1. Mencoba daftar kandidat model secara berurutan.
 * 2. Jika seluruh model gagal, otomatis melakukan fetch ListModels dan memakai model valid pertama.
 */
async function generateWithAutomaticFallbackAndDiscovery(params: {
  ai: GoogleGenAI;
  apiKey: string;
  contents: Content[];
  systemInstruction: string;
}): Promise<{
  text: string;
  routedModelId: string;
  engineUsed: string;
  sources: WebSourceCitation[];
}> {
  const fallbackChain = getGeminiFallbackModelChain();
  const attemptErrors: string[] = [];

  // 1. Coba Daftar Urutan Model (Fallback Chain) secara berurutan
  for (const candidateModel of fallbackChain) {
    try {
      const result = await callModelWithSearchToolFallback({
        ai: params.ai,
        modelName: candidateModel,
        contents: params.contents,
        systemInstruction: params.systemInstruction,
      });
      return {
        text: result.text,
        routedModelId: candidateModel,
        engineUsed: result.engineUsed,
        sources: result.sources,
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      attemptErrors.push(`[${candidateModel}]: ${errMsg}`);
      // Lanjutkan ke kandidat model berikutnya di dalam daftar
    }
  }

  // 2. Deteksi Model Dinamis (ListModels Fallback) jika seluruh daftar kandidat gagal
  try {
    const discoveredModels = await discoverDynamicGeminiModels(params.apiKey);
    const untriedDiscoveredModels = discoveredModels.filter(
      (m) => !fallbackChain.includes(m)
    );
    const modelsToTryFromDiscovery =
      untriedDiscoveredModels.length > 0
        ? untriedDiscoveredModels
        : discoveredModels;

    for (const dynamicModel of modelsToTryFromDiscovery) {
      try {
        const result = await callModelWithSearchToolFallback({
          ai: params.ai,
          modelName: dynamicModel,
          contents: params.contents,
          systemInstruction: params.systemInstruction,
        });
        return {
          text: result.text,
          routedModelId: dynamicModel,
          engineUsed: `${result.engineUsed} (ListModels)`,
          sources: result.sources,
        };
      } catch (dynErr: unknown) {
        const dynMsg =
          dynErr instanceof Error ? dynErr.message : String(dynErr);
        attemptErrors.push(`[ListModels:${dynamicModel}]: ${dynMsg}`);
      }
    }
  } catch (discoveryErr: unknown) {
    const discMsg =
      discoveryErr instanceof Error
        ? discoveryErr.message
        : String(discoveryErr);
    attemptErrors.push(`[ListModels Discovery Error]: ${discMsg}`);
  }

  throw new Error(
    `Seluruh kandidat model pada Fallback Chain dan ListModels gagal:\n${attemptErrors.join(
      "\n\n"
    )}`
  );
}

function extractWebSearchQueries(response: GenerateContentResponse): string[] {
  const queries: string[] = [];
  const rawCalls = Array.isArray(response.functionCalls)
    ? response.functionCalls
    : [];

  for (const call of rawCalls) {
    if (call?.name === "web_search") {
      const q = String((call.args as Record<string, unknown> | undefined)?.query ?? "").trim();
      if (q) queries.push(q);
    }
  }

  if (queries.length === 0) {
    const parts = response.candidates?.[0]?.content?.parts || [];
    for (const part of parts) {
      if (part.functionCall?.name === "web_search") {
        const q = String(
          (part.functionCall.args as Record<string, unknown> | undefined)?.query ?? ""
        ).trim();
        if (q) queries.push(q);
      }
    }
  }

  return queries;
}

function detectVoiceFactCheckOrCorrectionIntent(contents: Content[]): {
  needsSearch: boolean;
  wantsArtifactTool: boolean;
} {
  const lastUser = [...contents].reverse().find((c) => c.role === "user");
  const lastText = (lastUser?.parts || [])
    .map((p) => (typeof p.text === "string" ? p.text : ""))
    .join(" ")
    .toLowerCase();

  const wantsArtifactTool =
    /\b(catat|catatan|note|tabel|google\s*doc|google\s*drive|gdoc|simpan\s+ke\s+drive|ekspor)\b/i.test(
      lastText
    );
  const isCorrectionOrDoubt =
    /\b(salah|keliru|bukan\s+itu|masa\s+sih|perasaan|yakin\??|cek\s+lagi|cek\s+ulang|koreksi|serius\??|beneran\??|nggak\s+gitu|gak\s+gitu)\b/i.test(
      lastText
    );
  const isFactualOrLiveLookup =
    /\b(bpom|halal|mui|harga|logo|makara|warna|terbaru|sekarang|hari\s+ini|berita|siapa|kapan|di\s+mana|tahun\s+20\d\d|cek\s+internet|cari\s+di\s+web|cari\s+di\s+google|berapa\s+batas)\b/i.test(
      lastText
    );

  return {
    needsSearch: isCorrectionOrDoubt || isFactualOrLiveLookup,
    wantsArtifactTool,
  };
}

async function runGroundedVoiceWebSearch(
  ai: GoogleGenAI,
  query: string
): Promise<{ summary: string; sources: WebSourceCitation[] }> {
  const searchModels = getGeminiFallbackModelChain();
  for (const m of searchModels) {
    try {
      const res = await ai.models.generateContent({
        model: m,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Verifikasi fakta terkini melalui Google Search secara ringkas dan akurat untuk: "${query}"`,
              },
            ],
          },
        ],
        config: {
          tools: [{ googleSearch: {} }],
        },
      });
      const summary = extractResponseText(res);
      const sources = extractWebSourcesFromGroundingMetadata(
        res.candidates?.[0]?.groundingMetadata,
        6
      );
      if (summary) {
        return { summary, sources };
      }
    } catch {
      // try next search model
    }
  }
  return { summary: "", sources: [] };
}

/**
 * Fast-Path khusus fallback Mode Telepon AI (`interactionMode === "voice_call"`):
 * Mendukung Google Search Grounding + Function Calling (`create_chat_note`, `create_google_doc`, `web_search`)
 * dengan pengaman kompatibilitas tool otomatis agar tidak pernah bentrok di API.
 */
async function generateVoiceCallFastReply(params: {
  ai: GoogleGenAI;
  apiKey: string;
  contents: Content[];
  systemInstruction: string;
}): Promise<{
  text: string;
  routedModelId: string;
  engineUsed: string;
  createdNotes: ChatNoteArtifact[];
  createdGoogleDocs: GoogleDocArtifact[];
  sources: WebSourceCitation[];
}> {
  const fastPriorityModels = [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-4-hydrogen",
    "gemini-3.1-flash-lite",
  ];
  const mergedChain = Array.from(
    new Set([...fastPriorityModels, ...getGeminiFallbackModelChain()])
  );
  const { needsSearch, wantsArtifactTool } =
    detectVoiceFactCheckOrCorrectionIntent(params.contents);

  for (const modelName of mergedChain) {
    const isGemini25 = /^gemini-2\.5/i.test(modelName);
    const isGemini3Or4 = /^gemini-[34]/i.test(modelName);

    const fastThinkingConfig = isGemini25
      ? { thinkingBudget: 0 }
      : isGemini3Or4
        ? {
            thinkingLevel: /flash-lite/i.test(modelName)
              ? ThinkingLevel.MINIMAL
              : ThinkingLevel.LOW,
          }
        : undefined;

    const voiceMaxOutputTokens = wantsArtifactTool ? undefined : 320;

    // 1. On Gemini 3/4 models, attempt hybrid mode (googleSearch + functionDeclarations with includeServerSideToolInvocations)
    if (isGemini3Or4) {
      try {
        const hybridRes = await params.ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            tools: [{ googleSearch: {} }, ...SDK_CREATE_CHAT_NOTE_TOOLS],
            toolConfig: { includeServerSideToolInvocations: true },
            ...(voiceMaxOutputTokens
              ? { maxOutputTokens: voiceMaxOutputTokens }
              : {}),
            ...(fastThinkingConfig ? { thinkingConfig: fastThinkingConfig } : {}),
          },
        });
        const text = extractResponseText(hybridRes);
        const createdNotes = extractNoteFunctionCalls(hybridRes);
        const createdGoogleDocs = extractGoogleDocFunctionCalls(hybridRes);
        const sources = extractWebSourcesFromGroundingMetadata(
          hybridRes.candidates?.[0]?.groundingMetadata,
          6
        );
        if (text || createdNotes.length > 0 || createdGoogleDocs.length > 0) {
          const defaultSpokenConfirmation =
            createdGoogleDocs.length > 0
              ? "Siap, dokumen Google Docs sudah saya siapkan langsung di room chat ya."
              : "Siap, catatannya sudah saya buat dan langsung tampil di room chat ya.";
          return {
            text: text || defaultSpokenConfirmation,
            routedModelId: modelName,
            engineUsed: `${modelName}+voice-hybrid`,
            createdNotes,
            createdGoogleDocs,
            sources,
          };
        }
      } catch (hybridErr: unknown) {
        if (isModelNotFoundError(hybridErr)) {
          continue;
        }
        // Fall through cleanly to separated tool strategy below
      }
    }

    // 2. If user is asking factual/current info or correcting AI (and not explicitly asking for Note/Doc card),
    // run dedicated Google Search Grounded call cleanly without tool combination conflicts
    if (needsSearch && !wantsArtifactTool) {
      try {
        const groundedRes = await params.ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
            tools: [{ googleSearch: {} }],
            ...(voiceMaxOutputTokens
              ? { maxOutputTokens: voiceMaxOutputTokens }
              : {}),
            ...(fastThinkingConfig ? { thinkingConfig: fastThinkingConfig } : {}),
          },
        });
        const text = extractResponseText(groundedRes);
        const sources = extractWebSourcesFromGroundingMetadata(
          groundedRes.candidates?.[0]?.groundingMetadata,
          6
        );
        if (text) {
          return {
            text,
            routedModelId: modelName,
            engineUsed: `${modelName}+voice-googleSearch`,
            createdNotes: [],
            createdGoogleDocs: [],
            sources,
          };
        }
      } catch (searchErr: unknown) {
        if (isModelNotFoundError(searchErr)) {
          continue;
        }
      }
    }

    // 3. Function-calling path (`create_chat_note`, `create_google_doc`, `web_search`)
    try {
      const fastRes = await params.ai.models.generateContent({
        model: modelName,
        contents: params.contents,
        config: {
          systemInstruction: params.systemInstruction,
          tools: SDK_CREATE_CHAT_NOTE_TOOLS,
          ...(voiceMaxOutputTokens
            ? { maxOutputTokens: voiceMaxOutputTokens }
            : {}),
          ...(fastThinkingConfig ? { thinkingConfig: fastThinkingConfig } : {}),
        },
      });
      const text = extractResponseText(fastRes);
      const createdNotes = extractNoteFunctionCalls(fastRes);
      const createdGoogleDocs = extractGoogleDocFunctionCalls(fastRes);
      const webQueries = extractWebSearchQueries(fastRes);

      if (webQueries.length > 0) {
        const searchOutcome = await runGroundedVoiceWebSearch(
          params.ai,
          webQueries[0]
        );
        if (searchOutcome.summary) {
          const followUpRes = await params.ai.models.generateContent({
            model: modelName,
            contents: [
              ...params.contents,
              {
                role: "user",
                parts: [
                  {
                    text: `[Hasil Verifikasi Google Search untuk "${webQueries[0]}"]:\n${searchOutcome.summary}\n\nSampaikan jawaban lisan singkat (1-3 kalimat alami dalam Bahasa Indonesia) berdasarkan fakta terverifikasi di atas. Jika jawaban sebelumnya keliru, akui dengan rendah hati lalu koreksi.`,
                  },
                ],
              },
            ],
            config: {
              systemInstruction: params.systemInstruction,
              ...(fastThinkingConfig ? { thinkingConfig: fastThinkingConfig } : {}),
            },
          });
          const verifiedReply =
            extractResponseText(followUpRes) || searchOutcome.summary;
          return {
            text: verifiedReply,
            routedModelId: modelName,
            engineUsed: `${modelName}+voice-webSearchTool`,
            createdNotes,
            createdGoogleDocs,
            sources: searchOutcome.sources,
          };
        }
      }

      if (text || createdNotes.length > 0 || createdGoogleDocs.length > 0) {
        const defaultSpokenConfirmation =
          createdGoogleDocs.length > 0
            ? "Siap, dokumen Google Docs sudah saya siapkan langsung di room chat ya."
            : "Siap, catatannya sudah saya buat dan langsung tampil di room chat ya.";
        return {
          text: text || defaultSpokenConfirmation,
          routedModelId: modelName,
          engineUsed: `${modelName}+voice-fast`,
          createdNotes,
          createdGoogleDocs,
          sources: [],
        };
      }
    } catch (fastErr: unknown) {
      if (isModelNotFoundError(fastErr)) {
        continue;
      }
      // Retry same model cleanly without thinkingConfig/tools if parameter is rejected
      try {
        const retryRes = await params.ai.models.generateContent({
          model: modelName,
          contents: params.contents,
          config: {
            systemInstruction: params.systemInstruction,
          },
        });
        const retryText = extractResponseText(retryRes);
        if (retryText) {
          return {
            text: retryText,
            routedModelId: modelName,
            engineUsed: `${modelName}+voice-fast-plain`,
            createdNotes: [],
            createdGoogleDocs: [],
            sources: [],
          };
        }
      } catch {
        // Proceed to next model
      }
    }
  }

  const fallbackRes = await generateWithAutomaticFallbackAndDiscovery(params);
  return {
    ...fallbackRes,
    createdNotes: [],
    createdGoogleDocs: [],
  };
}

type InteractionMode = "chat" | "voice_note" | "voice_call" | "vision";

interface IncomingAudioPayload {
  base64: string;
  mimeType?: string;
}

interface IncomingImagePayload {
  base64: string;
  mimeType?: string;
  name?: string;
}

const SUPPORTED_AUDIO_MIMES = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/ogg",
  "audio/wav",
  "audio/mpeg",
  "audio/mp3",
  "audio/aac",
  "audio/x-m4a",
]);

const SUPPORTED_IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function sanitizeAudioMimeType(rawMime?: string): string {
  if (!rawMime || typeof rawMime !== "string") return "audio/webm";
  const base = rawMime.split(";")[0].trim().toLowerCase();
  if (base === "audio/mp3") return "audio/mpeg";
  if (SUPPORTED_AUDIO_MIMES.has(base)) return base;
  return "audio/webm";
}

function sanitizeImageMimeType(rawMime?: string): string {
  if (!rawMime || typeof rawMime !== "string") return "image/jpeg";
  const base = rawMime.split(";")[0].trim().toLowerCase();
  if (base === "image/jpg") return "image/jpeg";
  if (SUPPORTED_IMAGE_MIMES.has(base)) return base;
  return "image/jpeg";
}

function stripDataUrlPrefix(rawBase64: string): string {
  if (!rawBase64 || typeof rawBase64 !== "string") return "";
  const commaIdx = rawBase64.indexOf(",");
  if (rawBase64.startsWith("data:") && commaIdx !== -1) {
    return rawBase64.slice(commaIdx + 1).trim();
  }
  return rawBase64.replace(/^data:[^;]+;base64,/i, "").trim();
}

function parseTranscriptAndReplyDelimiters(rawText: string): {
  transcript: string;
  reply: string;
} {
  if (!rawText) {
    return { transcript: "", reply: "" };
  }

  const transcriptMatch = rawText.match(
    /\[\[TRANSCRIPT\]\]([\s\S]*?)\[\[\/TRANSCRIPT\]\]/i
  );
  const replyMatch = rawText.match(/\[\[REPLY\]\]([\s\S]*?)\[\[\/REPLY\]\]/i);

  const extractedTranscript = transcriptMatch
    ? transcriptMatch[1].trim()
    : "";

  if (replyMatch && replyMatch[1].trim()) {
    return {
      transcript: extractedTranscript,
      reply: cleanModelMarkdownReply(replyMatch[1].trim()),
    };
  }

  if (transcriptMatch) {
    const remainder = rawText
      .replace(/\[\[TRANSCRIPT\]\][\s\S]*?\[\[\/TRANSCRIPT\]\]/i, "")
      .replace(/\[\[\/?REPLY\]\]/gi, "")
      .trim();
    return {
      transcript: extractedTranscript,
      reply: cleanModelMarkdownReply(remainder || extractedTranscript),
    };
  }

  return {
    transcript: "",
    reply: cleanModelMarkdownReply(rawText),
  };
}

/**
 * Pure Node.js Buffer PCM-to-WAV converter (44-byte standard RIFF/WAVE header).
 * Wraps raw 16-bit mono PCM (default 24kHz) returned by Gemini Native TTS
 * so browsers can decode and play it natively via Web Audio API / <audio>.
 */
function wrapPcmAsWav(
  pcmBuffer: Buffer,
  sampleRate = 24000,
  numChannels = 1,
  bitsPerSample = 16
): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write("RIFF", 0, "ascii");
  header.writeUInt32LE(36 + dataSize, 4);
  header.write("WAVE", 8, "ascii");
  header.write("fmt ", 12, "ascii");
  header.writeUInt32LE(16, 16); // Subchunk1Size (PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 = Linear PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write("data", 36, "ascii");
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function parseSampleRateFromMime(mimeType?: string): number {
  if (!mimeType) return 24000;
  const match = mimeType.match(/rate\s*=\s*(\d{4,6})/i);
  if (match) {
    const parsed = Number.parseInt(match[1], 10);
    if (Number.isFinite(parsed) && parsed >= 8000 && parsed <= 96000) {
      return parsed;
    }
  }
  return 24000;
}

/**
 * Cleans all markdown symbols, code fences, bullet prefixes, and weird quotes
 * before passing Stage 1 text into Stage 2 Gemini Native Neural TTS.
 */
function sanitizeSpokenReplyForTts(rawText: string): string {
  if (!rawText) return "";
  return rawText
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+•▪◦]+\s+/gm, "")
    .replace(/^\s*\d+[.)]\s+/gm, "")
    .replace(/\|/g, ", ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/[*#_`~><\[\]{}\\]+/g, " ")
    .replace(/[“”„‟"']+/g, "")
    .replace(/[—–]+/g, ", ")
    .replace(/\.{2,}/g, ". ")
    .replace(/!{2,}/g, "!")
    .replace(/\?{2,}/g, "?")
    .replace(/,{2,}/g, ",")
    .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu, " ")
    .replace(/\s+([.,!?;:])/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

interface SynthesizedReplyAudio {
  base64: string;
  mimeType: string;
}

/**
 * Stage 2 (Voice Call): Synthesize natural human-like Indonesian speech
 * via Gemini Native Neural TTS and wrap raw PCM as browser-playable WAV.
 * Safely returns null on any transient error so frontend can fall back cleanly.
 */
async function synthesizeVoiceCallNativeAudio(
  ai: GoogleGenAI,
  spokenText: string
): Promise<SynthesizedReplyAudio | null> {
  const cleanText = sanitizeSpokenReplyForTts(spokenText);
  if (!cleanText) return null;

  const ttsText = cleanText.length > 1400 ? `${cleanText.slice(0, 1400).trim()}.` : cleanText;

  const ttsCandidates: Array<{ model: string; voiceName: string }> = [
    { model: "gemini-3.8-flash-lite-tts", voiceName: "Aoede" },
    { model: "gemini-2.5-flash-preview-tts", voiceName: "Aoede" },
    { model: "gemini-3.8-flash-lite-tts", voiceName: "Kore" },
    { model: "gemini-2.5-flash-preview-tts", voiceName: "Kore" },
  ];

  for (const candidate of ttsCandidates) {
    try {
      const ttsResponse = await ai.models.generateContent({
        model: candidate.model,
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Bacakan kalimat berikut dalam Bahasa Indonesia yang sangat natural, hangat, luwes, dan berwibawa seperti Senior Cosmetic Chemist yang sedang berbicara langsung di telepon (jangan menambahkan kata atau komentar lain):\n\n${ttsText}`,
              },
            ],
          },
        ],
        config: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: candidate.voiceName,
              },
            },
          },
        },
      });

      const parts = ttsResponse.candidates?.[0]?.content?.parts || [];
      for (const part of parts) {
        const inline = part.inlineData;
        if (inline?.data && typeof inline.data === "string") {
          const rawMime = (inline.mimeType || "audio/pcm;rate=24000").toLowerCase();
          const rawBuffer = Buffer.from(inline.data, "base64");
          if (rawBuffer.length === 0) continue;

          const hasRiffHeader =
            rawBuffer.length >= 4 &&
            rawBuffer.subarray(0, 4).toString("ascii") === "RIFF";
          const isContainerAudio =
            hasRiffHeader ||
            rawMime.includes("audio/wav") ||
            rawMime.includes("audio/x-wav") ||
            rawMime.includes("audio/mpeg") ||
            rawMime.includes("audio/mp3") ||
            rawMime.includes("audio/ogg");

          if (isContainerAudio && !rawMime.includes("pcm") && !rawMime.includes("l16")) {
            return {
              base64: rawBuffer.toString("base64"),
              mimeType: hasRiffHeader
                ? "audio/wav"
                : rawMime.split(";")[0].trim() || "audio/wav",
            };
          }

          // Raw PCM (audio/L16 / audio/pcm / headerless) -> wrap with 44-byte RIFF/WAVE header
          const sampleRate = parseSampleRateFromMime(rawMime);
          const wavBuffer = wrapPcmAsWav(rawBuffer, sampleRate, 1, 16);
          return {
            base64: wavBuffer.toString("base64"),
            mimeType: "audio/wav",
          };
        }
      }
    } catch {
      // Try next TTS candidate gracefully; never crash the voice_call response
    }
  }

  return null;
}

const VOICE_CALL_SPOKEN_STYLE_GUIDANCE = [
  "[MODE SUARA TELEPON]:",
  "- Jawab dalam Bahasa Indonesia alami, hangat, dan langsung ke inti dalam 1-2 kalimat singkat tanpa pembukaan bertele-tele.",
  "- Tanpa simbol markdown (*, **, #, backtick, bullet, tabel); ucapkan angka dan satuan secara lisan (misal pH lima koma lima, lima persen).",
].join("\n");

export async function POST(req: NextRequest) {
  let parsedMessages: ApiChatMessage[] = [];
  let requestedUiModel = "auto";
  let lastAttemptedModel = PRIMARY_GEMINI_SDK_MODEL;

  try {
    const body = await req.json();
    parsedMessages = normalizeIncomingChatMessages(body);

    if (typeof body?.model === "string" && body.model.trim()) {
      requestedUiModel = body.model.trim();
    }

    // Extract optional multimodal payloads safely
    let incomingAudio: IncomingAudioPayload | null = null;
    if (
      body?.audio &&
      typeof body.audio === "object" &&
      typeof body.audio.base64 === "string" &&
      body.audio.base64.trim()
    ) {
      incomingAudio = {
        base64: body.audio.base64,
        mimeType:
          typeof body.audio.mimeType === "string"
            ? body.audio.mimeType
            : "audio/webm",
      };
    }

    let incomingImage: IncomingImagePayload | null = null;
    if (
      body?.image &&
      typeof body.image === "object" &&
      typeof body.image.base64 === "string" &&
      body.image.base64.trim()
    ) {
      incomingImage = {
        base64: body.image.base64,
        mimeType:
          typeof body.image.mimeType === "string"
            ? body.image.mimeType
            : "image/jpeg",
        name:
          typeof body.image.name === "string" ? body.image.name : undefined,
      };
    }

    // Fallback detection from latest message attachments if not explicitly passed in body.audio / body.image
    const latestMsg =
      parsedMessages.length > 0
        ? parsedMessages[parsedMessages.length - 1]
        : undefined;
    if (!incomingAudio && !incomingImage && latestMsg?.attachments?.length) {
      for (const att of latestMsg.attachments) {
        if (
          !incomingAudio &&
          (att.isVoiceNote || att.mimeType?.startsWith("audio/")) &&
          att.dataUrl
        ) {
          incomingAudio = {
            base64: att.dataUrl,
            mimeType: att.mimeType || "audio/webm",
          };
        } else if (
          !incomingImage &&
          att.mimeType?.startsWith("image/") &&
          att.dataUrl
        ) {
          incomingImage = {
            base64: att.dataUrl,
            mimeType: att.mimeType || "image/jpeg",
            name: att.name,
          };
        }
      }
    }

    // Determine effective interactionMode
    let interactionMode: InteractionMode = "chat";
    if (
      body?.interactionMode === "voice_note" ||
      body?.interactionMode === "voice_call" ||
      body?.interactionMode === "vision" ||
      body?.interactionMode === "chat"
    ) {
      interactionMode = body.interactionMode;
    } else if (body?.voiceCallMode === true) {
      interactionMode = "voice_call";
    } else if (incomingAudio) {
      interactionMode = "voice_note";
    } else if (incomingImage) {
      interactionMode = "vision";
    }

    // Ensure parsedMessages has at least 1 message when audio or image is sent without text
    if (parsedMessages.length === 0 && (incomingAudio || incomingImage)) {
      parsedMessages = [
        {
          role: "user",
          content: incomingAudio
            ? "🎤 Mengirim Voice Note (VN)"
            : "Analisis gambar ini secara mendetail sesuai konteks R&D kosmetik atau isi visual yang terlihat.",
        },
      ];
    }

    if (parsedMessages.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Pesan tidak boleh kosong.",
          reply: "⚠️ **Error Teknis:** Pesan tidak boleh kosong.",
        },
        { status: 400 }
      );
    }

    const uiModelOption = getModelOption(requestedUiModel);
    const intentClassification = classifyUserQueryIntent(parsedMessages);

    // 1. Bedakan karakteristik kelima model UI (Auto, Gemini 3.8 Pro, Gemini 3.8 Flash, GPT-6 Luna, GPT-6 Omni)
    // melalui System Instruction
    const systemInstruction = getSystemInstructionForUiModel(
      requestedUiModel,
      parsedMessages
    );

    // 2. Pastikan GEMINI_API_KEY tersedia
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Environment variable process.env.GEMINI_API_KEY tidak ditemukan atau kosong di server."
      );
    }

    // 3. Pertahankan pengiriman seluruh array riwayat percakapan (contents: role 'user' dan 'model')
    const { contents: conversationContents } =
      buildGeminiConversationHistory(parsedMessages);

    const isMultimodalRequest =
      Boolean(incomingAudio) ||
      Boolean(incomingImage) ||
      interactionMode === "voice_note" ||
      interactionMode === "voice_call" ||
      interactionMode === "vision";

    // =========================================================================
    // JALUR CHAT TEKS BIASA (100% UTUH + DUKUNGAN CATATAN & GOOGLE DOCS)
    // =========================================================================
    if (!isMultimodalRequest) {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });
      const textChatSystemInstruction = `${systemInstruction}\n\n${NOTE_ARTIFACT_FALLBACK_DIRECTIVE}\n\n${GDOC_ARTIFACT_FALLBACK_DIRECTIVE}\n\n${GOOGLE_SEARCH_GROUNDING_APPEND}`;
      const { text: rawText, routedModelId, engineUsed, sources } =
        await generateWithAutomaticFallbackAndDiscovery({
          ai,
          apiKey,
          contents: conversationContents,
          systemInstruction: textChatSystemInstruction,
        });

      lastAttemptedModel = routedModelId;
      const { cleanReplyText: withoutNotes, notes: createdNotes } =
        extractNoteArtifactsFromReply(rawText);
      const { cleanReplyText: withoutDocs, googleDocs: createdGoogleDocs } =
        extractGoogleDocArtifactsFromReply(withoutNotes);
      const cleaned = cleanModelMarkdownReply(withoutDocs);
      const finalReply =
        cleaned ||
        (createdGoogleDocs.length > 0
          ? "Dokumen Google Docs sudah saya siapkan langsung di bawah ini."
          : createdNotes.length > 0
            ? "Catatan sudah saya buat dan langsung tampil di bawah ini."
            : cleanModelMarkdownReply(rawText));

      return NextResponse.json({
        success: true,
        intent: intentClassification.intentCategory,
        response_text: finalReply,
        reply: finalReply,
        ...(createdNotes.length > 0 ? { createdNotes } : {}),
        ...(createdGoogleDocs.length > 0 ? { createdGoogleDocs } : {}),
        ...(sources.length > 0 ? { sources } : {}),
        intentCategory: intentClassification.intentCategory,
        modelUsed: uiModelOption.id,
        routedModelId,
        engineUsed,
        activePillars: ["Generative AI", "Analytical AI", "Interactive AI"],
      });
    }

    // =========================================================================
    // JALUR MULTIMODAL KONDISIONAL (VOICE NOTE, TELEPON 2 ARAH, COMPUTER VISION)
    // =========================================================================
    const multimodalContents: Content[] = conversationContents.map((item) => ({
      role: item.role,
      parts: Array.isArray(item.parts) ? [...item.parts] : [],
    }));

    if (
      multimodalContents.length === 0 ||
      multimodalContents[multimodalContents.length - 1].role !== "user"
    ) {
      multimodalContents.push({
        role: "user",
        parts: [{ text: parsedMessages[parsedMessages.length - 1].content }],
      });
    }

    const lastUserContent = multimodalContents[multimodalContents.length - 1];
    const lastUserParts = Array.isArray(lastUserContent.parts)
      ? [...lastUserContent.parts]
      : [];

    // 1A. Pemrosesan Audio Nyata (Voice Note & Fallback Audio Call)
    if (incomingAudio) {
      const cleanAudioBase64 = stripDataUrlPrefix(incomingAudio.base64);
      const cleanAudioMime = sanitizeAudioMimeType(incomingAudio.mimeType);

      if (cleanAudioBase64) {
        lastUserParts.push({
          inlineData: {
            mimeType: cleanAudioMime,
            data: cleanAudioBase64,
          },
        });

        const voiceCallExtraGuidance =
          interactionMode === "voice_call"
            ? `\n${VOICE_CALL_SPOKEN_STYLE_GUIDANCE}`
            : "";

        const vnInstruction = [
          "User baru saja mengirimkan rekaman suara (Voice Note). Tugas Anda:",
          "1. Dengarkan audio ini dengan saksama dan transkripsikan ucapannya secara akurat.",
          "2. Jawab langsung pertanyaan, instruksi, atau permintaan formulasi yang diucapkan user sesuai peran Anda sebagai Senior Cosmetic Chemist R&D Formylab.ai (atau jawab fleksibel jika user bertanya topik umum)." +
            voiceCallExtraGuidance,
          "3. WAJIB awali respons Anda dengan blok transkrip menggunakan format delimiter persis berikut:",
          "[[TRANSCRIPT]]",
          "<transkrip kata demi kata yang diucapkan user di audio>",
          "[[/TRANSCRIPT]]",
          "[[REPLY]]",
          "<jawaban lengkap, cerdas, dan langsung mengeksekusi permintaan user dari audio tersebut>",
          "[[/REPLY]]",
        ].join("\n");

        lastUserParts.push({ text: vnInstruction });
      }
    }

    // 1B. Mode Telepon AI 2 Arah (Tanpa file audio / via Web Speech STT)
    if (interactionMode === "voice_call" && !incomingAudio) {
      lastUserParts.push({ text: VOICE_CALL_SPOKEN_STYLE_GUIDANCE });
    }

    // 1C. Pemrosesan Computer Vision (Baca Foto / Gambar)
    if (incomingImage) {
      const cleanImageBase64 = stripDataUrlPrefix(incomingImage.base64);
      const cleanImageMime = sanitizeImageMimeType(incomingImage.mimeType);

      if (cleanImageBase64) {
        lastUserParts.push({
          inlineData: {
            mimeType: cleanImageMime,
            data: cleanImageBase64,
          },
        });

        const rawUserPrompt =
          parsedMessages[parsedMessages.length - 1]?.content?.trim() || "";
        const isGenericPlaceholderPrompt =
          !rawUserPrompt ||
          rawUserPrompt.startsWith("📎 Mengirim") ||
          rawUserPrompt.startsWith("[ Gambar:");

        const effectiveImagePrompt = isGenericPlaceholderPrompt
          ? "Analisis gambar ini secara mendetail sesuai konteks R&D kosmetik atau isi visual yang terlihat."
          : rawUserPrompt;

        const visionInstruction = [
          `[INSTRUKSI COMPUTER VISION R&D FORMYLAB.AI — File: ${incomingImage.name || "Foto Lampiran"}]:`,
          `Permintaan User: "${effectiveImagePrompt}"`,
          "Panduan Analisis Visual:",
          "- Jika foto berupa kemasan produk / daftar komposisi (INCI list): baca daftar bahan (INCI) yang terlihat, kelompokkan fungsi utamanya (surfaktan, humektan, bahan aktif, pengawet), serta evaluasi kepatuhan BPOM & titik kritis kehalalannya.",
          "- Jika foto berupa sampel hasil lab / tekstur krim / serum / emulsi: analisis karakteristik visualnya (homogenitas, tanda pemisahan fase / creaming / coalescence, kejernihan, estimasi viskositas visual) dan berikan solusi troubleshooting formulasi.",
          "- Jika foto berupa dokumen COA / MSDS / tabel spesifikasi / catatan formula: ekstrak parameter teknis pentingnya secara akurat.",
          "- Jika foto berupa gambar umum di luar kosmetik: deskripsikan dan jawab pertanyaan user dengan akurat dan membantu.",
        ].join("\n");

        lastUserParts.push({ text: visionInstruction });
      }
    }

    lastUserContent.parts = lastUserParts;

    // 4. Jalankan Automatic Model Fallback Chain + ListModels Dynamic Discovery + Google Search Tool Fallback
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    const effectiveMultimodalSystemInstruction =
      interactionMode === "voice_call"
        ? `${systemInstruction}\n\n${NOTE_ARTIFACT_FALLBACK_DIRECTIVE}\n\n${GDOC_ARTIFACT_FALLBACK_DIRECTIVE}\n\n${GOOGLE_SEARCH_GROUNDING_APPEND}`
        : `${systemInstruction}\n\n${GOOGLE_SEARCH_GROUNDING_APPEND}`;

    let rawText = "";
    let routedModelId = PRIMARY_GEMINI_SDK_MODEL;
    let engineUsed = "";
    let toolCreatedNotes: ChatNoteArtifact[] = [];
    let toolCreatedGoogleDocs: GoogleDocArtifact[] = [];
    let webSources: WebSourceCitation[] = [];

    if (interactionMode === "voice_call") {
      const voiceRes = await generateVoiceCallFastReply({
        ai,
        apiKey,
        contents: multimodalContents,
        systemInstruction: effectiveMultimodalSystemInstruction,
      });
      rawText = voiceRes.text;
      routedModelId = voiceRes.routedModelId;
      engineUsed = voiceRes.engineUsed;
      toolCreatedNotes = voiceRes.createdNotes;
      toolCreatedGoogleDocs = voiceRes.createdGoogleDocs;
      webSources = mergeUniqueWebSources(webSources, voiceRes.sources);
    } else {
      const fallbackRes = await generateWithAutomaticFallbackAndDiscovery({
        ai,
        apiKey,
        contents: multimodalContents,
        systemInstruction: effectiveMultimodalSystemInstruction,
      });
      rawText = fallbackRes.text;
      routedModelId = fallbackRes.routedModelId;
      engineUsed = fallbackRes.engineUsed;
      webSources = mergeUniqueWebSources(webSources, fallbackRes.sources);
    }

    lastAttemptedModel = routedModelId;

    // Extract any [[NOTE_ARTIFACT]] and [[GDOC_ARTIFACT]] blocks BEFORE markdown/TTS cleanup so raw JSON is never read aloud
    const { cleanReplyText: textWithoutNoteBlocks, notes: blockNotes } =
      extractNoteArtifactsFromReply(rawText);
    const {
      cleanReplyText: textWithoutArtifactBlocks,
      googleDocs: blockGoogleDocs,
    } = extractGoogleDocArtifactsFromReply(textWithoutNoteBlocks);
    const createdNotes = mergeUniqueNotes(toolCreatedNotes, blockNotes);
    const createdGoogleDocs = mergeUniqueGoogleDocs(
      toolCreatedGoogleDocs,
      blockGoogleDocs
    );

    let finalReply = "";
    let extractedTranscript = "";

    if (incomingAudio) {
      const parsedAudioOut = parseTranscriptAndReplyDelimiters(
        textWithoutArtifactBlocks
      );
      extractedTranscript = parsedAudioOut.transcript;
      finalReply =
        parsedAudioOut.reply ||
        cleanModelMarkdownReply(textWithoutArtifactBlocks);
    } else {
      finalReply = cleanModelMarkdownReply(textWithoutArtifactBlocks);
    }

    if (!finalReply && (createdNotes.length > 0 || createdGoogleDocs.length > 0)) {
      finalReply =
        createdGoogleDocs.length > 0
          ? interactionMode === "voice_call"
            ? "Siap, dokumen Google Docs sudah saya siapkan langsung di room chat ya."
            : "Dokumen Google Docs sudah saya siapkan langsung di bawah ini."
          : interactionMode === "voice_call"
            ? "Siap, catatannya sudah saya buat dan langsung tampil di room chat ya."
            : "Catatan sudah saya buat dan langsung tampil di bawah ini.";
    }

    // Tahap 2 (Khusus voice_call): Sanitasi teks lisan + Gemini Native Neural TTS -> WAV base64
    let replyAudio: SynthesizedReplyAudio | null | undefined = undefined;
    if (interactionMode === "voice_call") {
      const cleanedSpokenReply = sanitizeSpokenReplyForTts(finalReply);
      finalReply = cleanedSpokenReply || finalReply;
      replyAudio = await synthesizeVoiceCallNativeAudio(ai, finalReply);
    }

    // 1D. Susun activePillars
    const activePillars: string[] = [];
    if (incomingImage || interactionMode === "vision") {
      activePillars.push(
        "Computer Vision",
        "Analytical AI",
        "Generative AI",
        "Interactive AI"
      );
    } else if (
      incomingAudio ||
      interactionMode === "voice_note" ||
      interactionMode === "voice_call"
    ) {
      activePillars.push("Interactive AI", "Generative AI", "Analytical AI");
    } else {
      activePillars.push("Generative AI", "Analytical AI", "Interactive AI");
    }

    return NextResponse.json({
      success: true,
      intent: intentClassification.intentCategory,
      response_text: finalReply,
      reply: finalReply,
      ...(createdNotes.length > 0 ? { createdNotes } : {}),
      ...(createdGoogleDocs.length > 0 ? { createdGoogleDocs } : {}),
      ...(webSources.length > 0 ? { sources: webSources } : {}),
      ...(interactionMode === "voice_call" ? { replyAudio } : {}),
      transcript: extractedTranscript || undefined,
      interactionMode,
      activePillars,
      intentCategory: intentClassification.intentCategory,
      modelUsed: uiModelOption.id,
      routedModelId,
      engineUsed,
    });
  } catch (error: unknown) {
    // Tampilkan Pesan Error Teknis Asli tanpa teks karangan/template palsu
    const rawErrorMsg =
      error instanceof Error
        ? `${error.name}: ${error.message}`
        : String(error);

    const technicalErrorReply = `⚠️ **Error Teknis Pemanggilan Gemini API (Pilihan UI: \`${requestedUiModel}\`):**\n\n\`\`\`\n${rawErrorMsg}\n\`\`\``;

    return NextResponse.json(
      {
        success: false,
        error: rawErrorMsg,
        reply: technicalErrorReply,
        response_text: technicalErrorReply,
        modelUsed: requestedUiModel,
        routedModelId: lastAttemptedModel,
        engineUsed: "gemini-sdk-error",
      },
      { status: 500 }
    );
  }
}
