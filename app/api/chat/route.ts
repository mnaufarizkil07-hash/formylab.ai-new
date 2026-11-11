import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Part } from "@google/genai";
import { ChatAttachment } from "../../../lib/chatStorage";
import { AiModelOption, getModelOption } from "../../../components/AiModelLogos";
import {
  generateLocalExpertResponse,
  tryEvaluateMath,
} from "../../../lib/aiFallbackEngine";
import {
  analyzeBriefCompleteness,
  fetchRealtimeWebContext,
  userExplicitlyAskedForSources,
} from "../../../lib/webSearchEngine";
import {
  parseAttachmentVisionMetadata,
  trySolveMathFromOcrText,
} from "../../../lib/imageVisionEngine";
import { cleanComputerArtifacts } from "../../../components/FormattedChatText";

interface ApiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
}

const BASE_SYSTEM_INSTRUCTION = `You are a highly intelligent Global Multimodal AI Assistant (like Google Gemini & ChatGPT) AND Senior R&D Cosmetic Chemist Consultant for formylab.ai ("We accelerate cosmetic formulation & improve accuracy").
Core Rules:
1. Answer ANY question the user asks directly, accurately, and naturally—whether about image/photo recognition, university emblems/almamaters, cosmetic R&D formulation, skincare brand comparisons (e.g., Cetaphil vs Kahf, CeraVe vs Skintific, Wardah vs Somethinc), mathematics, coding, business, science, or general daily topics.
2. NEVER say you can only answer cosmetic questions, and NEVER output a generic template.
3. HIGH-PRECISION IMAGE & EMBLEM VISION:
   - When an image is attached in the current message or earlier in the conversation, inspect every visual detail carefully: objects, clothing/almamater jackets, chest emblems/logos/makara colors, background architecture, labels/INCI text, and colors.
   - Specifically for Universitas Indonesia (UI) almamater ("Jaket Kuning / Jakun UI") and Makara UI faculty emblem colors, ALWAYS use the official UI Makara color standard:
     * Fakultas Kedokteran (FK): Hijau
     * Fakultas Kedokteran Gigi (FKG): Hijau-Putih
     * Fakultas Matematika dan Ilmu Pengetahuan Alam (FMIPA): Biru-Hitam
     * Fakultas Teknik (FT): Biru
     * Fakultas Hukum (FH): Merah
     * Fakultas Ekonomi dan Bisnis (FEB): Abu-abu
     * Fakultas Ilmu Pengetahuan Budaya (FIB): Putih
     * Fakultas Psikologi (FPsi): Biru Muda
     * Fakultas Ilmu Sosial dan Ilmu Politik (FISIP): Jingga (Oranye)
     * Fakultas Ilmu Komputer (Fasilkom): Biru-Merah (Merah-Biru)
     * Fakultas Farmasi (FF): Biru-Hijau
     * Fakultas Ilmu Keperawatan (FIK): Biru Muda-Biru-Biru Muda
     * Fakultas Kesehatan Masyarakat (FKM): Ungu
     * Fakultas Ilmu Administrasi (FIA): Merah-Ungu
     * Program Vokasi: Hijau-Jingga-Biru
     * Sekolah Ilmu Lingkungan (SIL): Cokelat-Hijau
     * Sekolah Kajian Stratejik dan Global (SKSG): Cokelat-Abu-abu
   - If the photo shows a student in a yellow UI almamater jacket with a Red and Blue (Merah-Biru / Biru-Merah) makara emblem on the left chest (often with the iconic UI Rectorate building in the background), identify it accurately as **Universitas Indonesia (UI) — Fakultas Ilmu Komputer (Fasilkom UI)**!
4. NO ROBOTIC SUBHEADINGS:
   - NEVER output formulaic headers like "⚡ Ringkasan Cepat", "🧪 Inti Jawaban", "🔬 Analisis Mendalam", "🌐 Master Blueprint", "⚡ Ringkasan Eksekutif", or "⚠️ Nanya Balik".
   - Start your response naturally and directly, just like a smart human expert or ChatGPT.
5. USE CLEAN MARKDOWN TABLES:
   - Whenever the user asks to compare products/brands/ingredients, asks for a table, or asks for a product formulation (Phase A/B/C/D percentages), present the structured data in a clean Markdown table:
     | Parameter | Opsi A | Opsi B |
     | :--- | :--- | :--- |
     | Fokus Utama | ... | ... |
6. NO UNSOLICITED SOURCES:
   - Do NOT append a "Sumber:", "Referensi:", or "Referensi & Sumber Data Internet Real-Time" list at the end of your answer UNLESS the user explicitly asks to see sources or website links.
7. NATURAL BRIEF FOLLOW-UP:
   - ONLY when the user is explicitly asking to create/formulate a custom cosmetic product (e.g., "buatkan serum", "klien minta moisturizer") AND their brief is missing details (target kulit & tekstur, target HPP & budget trial, status halal, or deadline & MOQ), first give a helpful initial formula table and then naturally ask about those missing details in a friendly closing sentence without any "Nanya Balik" title.
8. ZERO COMPUTER / LATEX GIBBERISH:
   - NEVER write raw LaTeX commands like \\rightarrow, \\mathbf, \\le, $pK_a$, or $$...$$. Use clean plain Unicode symbols (→, ≤, ≥, ±, ×, ÷) so the chat looks 100% clean and human-friendly.
9. Reply in fluent, natural Bahasa Indonesia by default.`;

function getModelSpecificInstruction(
  modelOption: AiModelOption,
  lastUserText: string,
  hasAttachments: boolean,
  webContextBlock: string,
  briefInstructionBlock: string,
  voiceCallMode: boolean
): string {
  const verifiedMath = tryEvaluateMath(lastUserText, modelOption);
  const mathHint = verifiedMath
    ? `\n[VERIFIED EXACT CALCULATION]: ${verifiedMath.replace(/\n+/g, " ")}`
    : "";
  const voiceModeInstruction = voiceCallMode
    ? `\n[LIVE VOICE CALL MODE ACTIVE — SEPERTI TELEPONAN DENGAN USER]:
You are in a live two-way voice phone call with the user.
- Respond in 100% natural, warm, fluent spoken Bahasa Indonesia.
- Keep your answer conversational and well-paced (2 to 3 concise paragraphs) as if talking on the phone.
- Do not output Markdown tables or URLs during a live voice call.`
    : "";

  const extraContext = `${mathHint}${webContextBlock}${briefInstructionBlock}${voiceModeInstruction}`;

  switch (modelOption.id) {
    case "gpt-6-luna":
      return `${BASE_SYSTEM_INSTRUCTION}
Active Model Specialty: **GPT-6 Luna** — High-Speed Quantitative, Market Benchmark & Executive Analyst.
- Deliver crisp, direct, high-efficiency answers with clear comparison tables and exact numbers/percentages.
- Do NOT write any "⚡ Ringkasan Cepat" header—start directly with the answer.${extraContext}`;

    case "gemini-3.8-flash":
      return `${BASE_SYSTEM_INSTRUCTION}
Active Model Specialty: **Gemini 3.8 Flash** — Fast Multimodal Lab, Practical Guide & Live Web Specialist.
- Provide practical, clear, step-by-step explanations and structured tables where helpful.
- Do NOT write any "🧪 Inti Jawaban" header—start directly with the answer.${extraContext}`;

    case "gemini-3.8-pro":
      return `${BASE_SYSTEM_INSTRUCTION}
Active Model Specialty: **Gemini 3.8 Pro** — Advanced Scientific, Analytical & Physical Chemistry Reasoning Engine.
- Provide deep scientific and analytical reasoning (mechanisms of action, pH stability, HLB balance, Brookfield viscosity cPs, synergies vs incompatibilities) with clean tables.
- Do NOT write any "🔬 Analisis Mendalam" header—start directly with the answer.${extraContext}`;

    case "gpt-6-omni":
      return `${BASE_SYSTEM_INSTRUCTION}
Active Model Specialty: **GPT-6 Omni** — Flagship Deep Multimodal R&D & Global Master Architect.
- Provide comprehensive, end-to-end answers: complete 100.0% w/w formula tables (Phase A/B/C/D), compounding SOP (°C, RPM), and BPOM/Halal compliance when discussing formulations, or thorough multi-angle analysis for general topics.
- Do NOT write any "🌐 Master Blueprint" header—start directly with the answer.${extraContext}`;

    case "auto":
    default: {
      if (hasAttachments) {
        return `${BASE_SYSTEM_INSTRUCTION}
Active Model Specialty: **Auto Smart Router (Multimodal Vision & Analysis)**.
Examine the attached image, document, or Voice Note with high precision and provide an accurate, well-structured answer.${extraContext}`;
      }
      return `${BASE_SYSTEM_INSTRUCTION}
Active Model Specialty: **Auto Smart Router (Adaptive Global & R&D AI)**.
Adapt response depth automatically to the user's question—using clean Markdown tables for comparisons and formulas, and natural conversational prose without robotic headers.${extraContext}`;
    }
  }
}

function getGeminiCascadeOrder(modelId: string): string[] {
  if (modelId === "gemini-3.8-pro" || modelId === "gpt-6-omni") {
    return [
      "gemini-2.5-pro",
      "gemini-3-flash-preview",
      "gemini-2.5-flash",
      "gemini-flash-latest",
    ];
  }
  return [
    "gemini-2.5-flash",
    "gemini-3-flash-preview",
    "gemini-flash-latest",
    "gemini-2.5-pro",
  ];
}

/**
 * Extracts inline base64 parts (images, audio, PDFs) from the latest message,
 * AND if the latest message is a follow-up question without new attachments,
 * retains the most recent image attachment from the conversation so multi-turn image Q&A works seamlessly!
 */
function extractConversationAttachments(messages: ApiChatMessage[]): {
  inlineParts: Part[];
  attachmentSummary: string;
} {
  const lastMsg = messages[messages.length - 1];
  let targetAttachments = lastMsg?.attachments;

  // If the current turn has no attachments, check if an earlier turn in the recent conversation had an image
  if (!targetAttachments || targetAttachments.length === 0) {
    for (let i = messages.length - 2; i >= Math.max(0, messages.length - 6); i--) {
      const prevAtts = messages[i]?.attachments;
      if (prevAtts && prevAtts.some((a) => a.mimeType?.startsWith("image/"))) {
        targetAttachments = prevAtts;
        break;
      }
    }
  }

  const inlineList: Part[] = [];
  const descriptions: string[] = [];

  if (!targetAttachments || !Array.isArray(targetAttachments)) {
    return { inlineParts: [], attachmentSummary: "" };
  }

  for (const att of targetAttachments) {
    if (att.isVoiceNote) {
      descriptions.push(
        `[User mengirim Voice Note (VN): ${att.name} (${att.sizeLabel})${
          att.textPreview ? ` - Catatan/Transkrip: "${att.textPreview}"` : ""
        }]`
      );
    } else if (att.textPreview) {
      descriptions.push(
        `[User melampirkan file "${att.name}" (${att.sizeLabel})]:\n\`\`\`\n${att.textPreview}\n\`\`\``
      );
    } else {
      descriptions.push(
        `[User melampirkan gambar/file "${att.name}" (${att.mimeType}, ${att.sizeLabel})]`
      );
    }

    if (att.dataUrl && att.dataUrl.startsWith("data:")) {
      const commaIdx = att.dataUrl.indexOf(",");
      if (commaIdx !== -1) {
        const header = att.dataUrl.slice(5, commaIdx);
        const mimeType = header.split(";")[0] || att.mimeType;
        const base64Data = att.dataUrl.slice(commaIdx + 1);
        if (
          base64Data &&
          (mimeType.startsWith("image/") ||
            mimeType.startsWith("audio/") ||
            mimeType === "application/pdf")
        ) {
          inlineList.push({
            inlineData: {
              mimeType,
              data: base64Data,
            },
          });
        }
      }
    }
  }

  return {
    inlineParts: inlineList,
    attachmentSummary: descriptions.join("\n\n"),
  };
}

function enrichFinalReply(
  baseReply: string,
  lastUserText: string,
  briefReport: ReturnType<typeof analyzeBriefCompleteness>,
  webContext: Awaited<ReturnType<typeof fetchRealtimeWebContext>>,
  voiceCallMode: boolean
): string {
  const wantsSources = userExplicitlyAskedForSources(lastUserText);

  let finalReply = cleanComputerArtifacts(baseReply)
    .replace(
      /^#{1,6}\s*(?:⚡|🧪|🔬|🌐|✨|⚠️|💬)?\s*(?:ringkasan\s+cepat|ringkasan\s+eksekutif|inti\s+jawaban|analisis\s+mendalam|master\s+blueprint|analisis\s+praktis\s+r&d|kajian\s+ilmiah\s*&\s*fisikokimia|blueprint\s+r&d\s+komprehensif|jawaban\s+langsung|tinjauan\s+komprehensif|penjelasan\s*&\s*panduan|nanya\s+balik|konfirmasi\s+spesifikasi\s+brief).*$/gim,
      ""
    )
    .replace(
      /^\*\*(?:⚡|🧪|🔬|🌐|✨|⚠️|💬)?\s*(?:ringkasan\s+cepat|ringkasan\s+eksekutif|inti\s+jawaban|analisis\s+mendalam|master\s+blueprint|nanya\s+balik).*\*\*$/gim,
      ""
    )
    .trim();

  if (!wantsSources) {
    finalReply = finalReply
      .replace(
        /(?:^|\n)#{1,6}\s*(?:🌐\s*)?(?:referensi\s*&\s*sumber|sumber\s+referensi|sumber\s+data\s+internet)[\s\S]*$/i,
        ""
      )
      .trim();
  }

  finalReply = finalReply.replace(/\n{3,}/g, "\n\n").trim();
  const lowerReply = finalReply.toLowerCase();

  // 1. Only when the user submitted an incomplete formulation brief, append natural follow-up questions if not already asked
  if (
    briefReport.isFormulationBrief &&
    briefReport.isIncomplete &&
    briefReport.clarifyingQuestionsMarkdown
  ) {
    const alreadyAskedNaturally =
      lowerReply.includes("target hpp") &&
      (lowerReply.includes("moq") || lowerReply.includes("halal"));
    if (!alreadyAskedNaturally) {
      finalReply = `${finalReply}\n\n${briefReport.clarifyingQuestionsMarkdown}`;
    }
  }

  // 2. ONLY append sources if the user explicitly requested sources/links!
  if (
    !voiceCallMode &&
    wantsSources &&
    webContext.sourcesMarkdown &&
    !lowerReply.includes("sumber referensi")
  ) {
    finalReply = `${finalReply}\n\n${webContext.sourcesMarkdown}`;
  }

  return finalReply;
}

type WarmWorkerType = {
  recognize: (img: Buffer) => Promise<{ data?: { text?: string } }>;
};

const globalForOcr = globalThis as unknown as {
  __formylabOcrWorkerPromise?: Promise<WarmWorkerType | null>;
};

async function getWarmTesseractWorker(): Promise<WarmWorkerType | null> {
  if (!globalForOcr.__formylabOcrWorkerPromise) {
    globalForOcr.__formylabOcrWorkerPromise = (async () => {
      try {
        const TesseractModule = await import("tesseract.js");
        const createWorker =
          TesseractModule.createWorker ||
          TesseractModule.default?.createWorker;
        if (!createWorker) return null;
        const workerPath = path.join(
          process.cwd(),
          "node_modules",
          "tesseract.js",
          "src",
          "worker-script",
          "node",
          "index.js"
        );
        const worker = await createWorker("eng", 1, { workerPath });
        return worker as unknown as WarmWorkerType;
      } catch {
        globalForOcr.__formylabOcrWorkerPromise = undefined;
        return null;
      }
    })();
  }
  return globalForOcr.__formylabOcrWorkerPromise;
}

async function ensureImageOcrEnriched(
  messages: ApiChatMessage[]
): Promise<string> {
  const lastMsg = messages[messages.length - 1];
  let targetAttachments = lastMsg?.attachments;

  if (!targetAttachments || targetAttachments.length === 0) {
    for (let i = messages.length - 2; i >= Math.max(0, messages.length - 6); i--) {
      const prevAtts = messages[i]?.attachments;
      if (prevAtts && prevAtts.some((a) => a.mimeType?.startsWith("image/"))) {
        targetAttachments = prevAtts;
        break;
      }
    }
  }

  if (!targetAttachments || targetAttachments.length === 0) {
    return "";
  }

  const collectedOcr: string[] = [];

  for (const att of targetAttachments) {
    if (!att.mimeType?.startsWith("image/")) continue;

    const existingMeta = parseAttachmentVisionMetadata(att.textPreview);
    if (existingMeta.ocrText) {
      collectedOcr.push(existingMeta.ocrText);
      continue;
    }

    // Run server-side Tesseract OCR using warm worker with explicit workerPath
    if (att.dataUrl && att.dataUrl.startsWith("data:image/")) {
      const commaIdx = att.dataUrl.indexOf(",");
      if (commaIdx !== -1) {
        const base64Data = att.dataUrl.slice(commaIdx + 1);
        if (base64Data) {
          try {
            const extracted = await Promise.race([
              (async () => {
                const worker = await getWarmTesseractWorker();
                if (!worker) return "";
                const imgBuf = Buffer.from(base64Data, "base64");
                const res = await worker.recognize(imgBuf);
                return (res?.data?.text || "").trim().slice(0, 2500);
              })(),
              new Promise<string>((resolve) =>
                setTimeout(() => resolve(""), 6500)
              ),
            ]);
            if (extracted) {
              att.textPreview = `${att.textPreview || ""}\n[OCR_TEXT]:\n${extracted}`.trim();
              collectedOcr.push(extracted);
            }
          } catch {
            // ignore OCR error
          }
        }
      }
    }
  }

  return collectedOcr.join("\n").trim();
}

async function generateWithResilientCascade(
  messages: ApiChatMessage[],
  modelOption: AiModelOption,
  voiceCallMode = false
): Promise<{
  reply: string;
  engineUsed: string;
  missingBriefFields: string[];
  webSourcesCount: number;
}> {
  const lastMsg = messages[messages.length - 1];
  const lastUserText = (lastMsg?.content || "").trim();

  // Enrich any image attachments with OCR text if not already extracted
  const extractedImageOcr = await ensureImageOcrEnriched(messages);

  const { inlineParts, attachmentSummary } =
    extractConversationAttachments(messages);

  // Instant deterministic path for pure math expressions (text or OCR math image!)
  if (extractedImageOcr) {
    const ocrMathSolution = trySolveMathFromOcrText(
      extractedImageOcr,
      modelOption
    );
    if (ocrMathSolution) {
      return {
        reply: ocrMathSolution,
        engineUsed: `${modelOption.id}-vision-math-engine`,
        missingBriefFields: [],
        webSourcesCount: 0,
      };
    }
  }

  const exactMathReply = tryEvaluateMath(lastUserText, modelOption);
  if (exactMathReply && (!lastMsg?.attachments || lastMsg.attachments.length === 0)) {
    return {
      reply: exactMathReply,
      engineUsed: `${modelOption.id}-math-engine`,
      missingBriefFields: [],
      webSourcesCount: 0,
    };
  }

  // Only combine with previous USER message if the current prompt is a short pronoun follow-up
  const isPronounFollowUp =
    lastUserText.split(/\s+/).length <= 4 &&
    /\b(itu|ini|tersebut|nya|tadi|lanjut|detailnya)\b/i.test(lastUserText);
  const prevUserMessages = messages.filter((m) => m.role === "user");
  const prevUserText =
    prevUserMessages.length >= 2
      ? prevUserMessages[prevUserMessages.length - 2]?.content.slice(0, 60) || ""
      : "";

  let combinedSearchQuery =
    isPronounFollowUp && prevUserText
      ? `${prevUserText} ${lastUserText}`
      : lastUserText;

  // If an image has meaningful OCR text and the user prompt is short/generic (e.g., "apa ini?", "berapa jawabannya?"),
  // include the OCR text in the web search query so Google/Wikipedia can answer questions inside screenshots!
  if (extractedImageOcr && lastUserText.split(/\s+/).length <= 6) {
    const cleanOcrWords = extractedImageOcr
      .replace(/[^a-zA-Z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((w) => w.length >= 4)
      .slice(0, 10)
      .join(" ");
    if (cleanOcrWords) {
      combinedSearchQuery = `${combinedSearchQuery} ${cleanOcrWords}`.trim();
    }
  }

  const [briefReport, webContext] = await Promise.all([
    Promise.resolve(analyzeBriefCompleteness(messages)),
    fetchRealtimeWebContext(combinedSearchQuery),
  ]);

  const systemInstruction = getModelSpecificInstruction(
    modelOption,
    lastUserText,
    inlineParts.length > 0 || Boolean(attachmentSummary),
    webContext.contextBlockForAi,
    briefReport.promptInstructionForAi,
    voiceCallMode
  );

  // 1. Multi-Model Gemini Cascade with Multimodal Image Vision + Google Search Grounding
  const apiKey = process.env.GEMINI_API_KEY;
  if (apiKey) {
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const recentMessages = messages.slice(-12);
    const historyLines = recentMessages.map((m, idx) => {
      const speaker = m.role === "user" ? "User" : `AI (${modelOption.name})`;
      const text = m.content || "";
      if (idx === recentMessages.length - 1 && attachmentSummary) {
        return `${speaker}: ${attachmentSummary}\n${text}`;
      }
      return `${speaker}: ${text}`;
    });

    const fullPrompt = `${historyLines.join("\n\n")}${webContext.contextBlockForAi}${briefReport.promptInstructionForAi}\n\nAI (${modelOption.name}) [Respond directly and accurately in Bahasa Indonesia. If an image is attached, inspect all visual details—such as university almamater jacket colors, chest emblem/makara colors (e.g., Biru-Merah = Fasilkom UI), buildings, or product labels—with 100% accuracy. Never output headers like "Ringkasan Cepat" or "Nanya Balik", and never append a source list unless requested]:`;
    const candidateModels = getGeminiCascadeOrder(modelOption.id);

    for (const candidateModel of candidateModels) {
      const contents: Part[] =
        inlineParts.length > 0
          ? [...inlineParts, { text: fullPrompt }]
          : [{ text: fullPrompt }];

      // First try with googleSearch grounding tool enabled (even when images are attached!)
      if (!voiceCallMode) {
        try {
          const groundedRes = await Promise.race([
            ai.models.generateContent({
              model: candidateModel,
              contents,
              config: {
                systemInstruction,
                tools: [{ googleSearch: {} }],
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("MODEL_TIMEOUT")), 8500)
            ),
          ]);

          const text = groundedRes?.text?.trim();
          if (text) {
            return {
              reply: enrichFinalReply(
                text,
                lastUserText,
                briefReport,
                webContext,
                voiceCallMode
              ),
              engineUsed: `${candidateModel}+googleSearch`,
              missingBriefFields: briefReport.missingFields.map((m) => m.label),
              webSourcesCount: webContext.results.length,
            };
          }
        } catch {
          // If googleSearch tool is not supported on this candidateModel or timed out, immediately try standard multimodal call WITH inlineParts preserved!
        }
      }

      // Second try on the same model WITH inlineParts (images) preserved!
      try {
        const standardRes = await Promise.race([
          ai.models.generateContent({
            model: candidateModel,
            contents,
            config: {
              systemInstruction,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("MODEL_TIMEOUT")), 7500)
          ),
        ]);

        const text = standardRes?.text?.trim();
        if (text) {
          return {
            reply: enrichFinalReply(
              text,
              lastUserText,
              briefReport,
              webContext,
              voiceCallMode
            ),
            engineUsed: candidateModel,
            missingBriefFields: briefReport.missingFields.map((m) => m.label),
            webSourcesCount: webContext.results.length,
          };
        }
      } catch {
        // Continue to next model in cascade
      }
    }
  }

  // 2. OpenAI API if configured
  if (process.env.OPENAI_API_KEY) {
    try {
      const openAiModelName =
        modelOption.id === "gpt-6-omni" ? "gpt-4o" : "gpt-4o-mini";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6500);

      const gptResponse = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            model: openAiModelName,
            messages: [
              { role: "system", content: systemInstruction },
              ...messages.slice(-10).map((m) => ({
                role: m.role,
                content: m.content,
              })),
            ],
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (gptResponse.ok) {
        const gptData = await gptResponse.json();
        const replyText = gptData?.choices?.[0]?.message?.content?.trim();
        if (replyText) {
          return {
            reply: enrichFinalReply(
              replyText,
              lastUserText,
              briefReport,
              webContext,
              voiceCallMode
            ),
            engineUsed: openAiModelName,
            missingBriefFields: briefReport.missingFields.map((m) => m.label),
            webSourcesCount: webContext.results.length,
          };
        }
      }
    } catch {
      // Continue
    }
  }

  // 3. Guaranteed Multi-Domain Local Expert Engine
  const localReply = generateLocalExpertResponse(
    messages,
    modelOption,
    webContext.results
  );
  return {
    reply: enrichFinalReply(
      localReply,
      lastUserText,
      briefReport,
      webContext,
      voiceCallMode
    ),
    engineUsed: `${modelOption.id}-local-specialist`,
    missingBriefFields: briefReport.missingFields.map((m) => m.label),
    webSourcesCount: webContext.results.length,
  };
}

export async function POST(req: NextRequest) {
  let parsedMessages: ApiChatMessage[] = [];
  let requestedModel = "auto";
  let voiceCallMode = false;

  try {
    const body = await req.json();
    if (Array.isArray(body?.messages)) {
      parsedMessages = body.messages;
    }
    if (typeof body?.model === "string") {
      requestedModel = body.model;
    }
    if (typeof body?.voiceCallMode === "boolean") {
      voiceCallMode = body.voiceCallMode;
    }

    if (parsedMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const modelOption = getModelOption(requestedModel);
    const { reply, engineUsed, missingBriefFields, webSourcesCount } =
      await generateWithResilientCascade(
        parsedMessages,
        modelOption,
        voiceCallMode
      );

    return NextResponse.json({
      success: true,
      reply,
      modelUsed: modelOption.id,
      engineUsed,
      missingBriefFields,
      webSourcesCount,
    });
  } catch {
    const modelOption = getModelOption(requestedModel);
    const briefReport = analyzeBriefCompleteness(parsedMessages);
    const lastText =
      parsedMessages[parsedMessages.length - 1]?.content || "";
    const webContext = await fetchRealtimeWebContext(lastText);
    const fallbackReply = enrichFinalReply(
      generateLocalExpertResponse(
        parsedMessages,
        modelOption,
        webContext.results
      ),
      lastText,
      briefReport,
      webContext,
      voiceCallMode
    );
    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      modelUsed: modelOption.id,
      engineUsed: `${modelOption.id}-local-specialist`,
      missingBriefFields: briefReport.missingFields.map((m) => m.label),
      webSourcesCount: webContext.results.length,
    });
  }
}
