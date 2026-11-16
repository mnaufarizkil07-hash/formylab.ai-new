import { NextRequest, NextResponse } from "next/server";
import { Content, GenerateContentResponse, GoogleGenAI } from "@google/genai";
import { getModelOption } from "../../../components/AiModelLogos";
import {
  cleanComputerArtifacts,
  stripDanglingMarkdownAndLeadingSymbols,
} from "../../../components/FormattedChatText";
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
 * 1. Mencoba memanggil dengan `tools: [{ googleSearch: {} }]`.
 * 2. Jika gagal karena parameter `tools` tidak didukung oleh model tersebut (mis. 400 INVALID_ARGUMENT / tool error),
 *    otomatis mengulangi pemanggilan (retry) pada model yang sama TANPA parameter `tools`.
 */
async function callModelWithSearchToolFallback(params: {
  ai: GoogleGenAI;
  modelName: string;
  contents: Content[];
  systemInstruction: string;
}): Promise<{ text: string; engineUsed: string }> {
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
    if (text) {
      return {
        text,
        engineUsed: `${params.modelName}+googleSearch`,
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
      };
    }
    throw searchToolErr;
  }
}

/**
 * Automatic Model Fallback & Dynamic Discovery:
 * 1. Mencoba daftar kandidat model secara berurutan:
 *    ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-3-flash-preview", "gemini-2.5-flash-lite", "gemini-1.5-flash"]
 * 2. Jika seluruh model di dalam daftar tersebut gagal (mis. 404), otomatis melakukan fetch ke
 *    https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}
 *    dan menggunakan model pertama yang memiliki "generateContent" pada supportedGenerationMethods.
 */
async function generateWithAutomaticFallbackAndDiscovery(params: {
  ai: GoogleGenAI;
  apiKey: string;
  contents: Content[];
  systemInstruction: string;
}): Promise<{ text: string; routedModelId: string; engineUsed: string }> {
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

    // 4. Jalankan Automatic Model Fallback Chain + ListModels Dynamic Discovery + Google Search Tool Fallback
    const ai = new GoogleGenAI({ apiKey });
    const { text: rawText, routedModelId, engineUsed } =
      await generateWithAutomaticFallbackAndDiscovery({
        ai,
        apiKey,
        contents: conversationContents,
        systemInstruction,
      });

    lastAttemptedModel = routedModelId;
    const finalReply = cleanModelMarkdownReply(rawText);

    return NextResponse.json({
      success: true,
      intent: intentClassification.intentCategory,
      response_text: finalReply,
      reply: finalReply,
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
