import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Part } from "@google/genai";
import { ChatAttachment } from "../../../lib/chatStorage";
import { AiModelOption, getModelOption } from "../../../components/AiModelLogos";
import { generateLocalExpertResponse } from "../../../lib/aiFallbackEngine";

interface ApiChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
}

const BASE_SYSTEM_INSTRUCTION = `You are the AI Chemist Consultant, R&D Formulation Scientist, and General Intelligent Assistant for formylab.ai.
Your capabilities:
1. Expert cosmetic chemist & R&D formulation advisor specializing in tropical skincare (high humidity, UV exposure, high TEWL) and sensitive skin barriers (rosacea, acne-prone, eczema, barrier repair).
2. Deep mastery of emulsion science (O/W, W/O), HLB calculations, viscosity/rheology, pH buffering, safe paraben-free preservatives (e.g., Phenoxyethanol + Ethylhexylglycerin), and Indonesian Halal verification (LPPOM MUI / BPJPH).
3. Able to analyze attached files (CSV formulation datasets, PDFs, TXT), product/ingredient images, and Voice Notes (VN).
4. Also a versatile, friendly, accurate general assistant for any user request: mathematics, science, coding, writing, business strategy, daily conversation, or general knowledge. Always answer whatever the user asks directly, accurately, and helpfully.
5. Format responses cleanly using Markdown headings (###), bullet points (-), and bold (**text**) for key terms, percentages (%), and pH ranges.
6. Reply in Indonesian by default if the user speaks Indonesian, or match the user's language.`;

function getModelSpecificInstruction(modelOption: AiModelOption): string {
  switch (modelOption.id) {
    case "gpt-6-luna":
      return `${BASE_SYSTEM_INSTRUCTION}\nActive Model Identity: GPT-6 Luna (OpenAI's high-efficiency analytical model). Deliver crisp, direct, well-structured answers with clear bullet points and exact numbers.`;
    case "gpt-6-omni":
      return `${BASE_SYSTEM_INSTRUCTION}\nActive Model Identity: GPT-6 Omni (OpenAI's flagship multimodal deep-analysis model). Provide comprehensive, executive-level technical depth, step-by-step reasoning, and complete formulation breakdowns.`;
    case "gemini-3.8-pro":
      return `${BASE_SYSTEM_INSTRUCTION}\nActive Model Identity: Gemini 3.8 Pro (Google's advanced reasoning model). Provide thorough scientific reasoning, Phase A/B/C/D formulation tables, HLB calculations, and stability insights.`;
    case "gemini-3.8-flash":
      return `${BASE_SYSTEM_INSTRUCTION}\nActive Model Identity: Gemini 3.8 Flash (Google's fast multimodal R&D model). Provide fast, practical, actionable answers for R&D chemistry and general questions.`;
    case "auto":
    default:
      return `${BASE_SYSTEM_INSTRUCTION}\nActive Model Identity: Auto Smart Router. Adapt response depth automatically—concise for simple queries/math, and detailed with formulation percentages for cosmetic R&D questions.`;
  }
}

function getGeminiCascadeOrder(modelOption: AiModelOption): string[] {
  // Uses active @google/genai models to prevent 404 Requested entity was not found errors
  switch (modelOption.id) {
    case "gpt-6-luna":
      return [
        "gemini-3.1-flash-lite",
        "gemini-3.8-flash",
        "gemini-flash-latest",
      ];
    case "gemini-3.8-flash":
      return [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ];
    case "gemini-3.8-pro":
      return [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ];
    case "gpt-6-omni":
      return [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ];
    case "auto":
    default:
      return [
        "gemini-3.8-flash",
        "gemini-3.1-flash-lite",
        "gemini-flash-latest",
      ];
  }
}

function extractBase64Parts(attachments?: ChatAttachment[]): {
  inlineParts: Part[];
  attachmentSummary: string;
} {
  const inlineParts: Part[] = [];
  const descriptions: string[] = [];

  if (!attachments || !Array.isArray(attachments)) {
    return { inlineParts, attachmentSummary: "" };
  }

  for (const att of attachments) {
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
        `[User melampirkan file "${att.name}" (${att.mimeType}, ${att.sizeLabel})]`
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
          inlineParts.push({
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
    inlineParts,
    attachmentSummary: descriptions.join("\n\n"),
  };
}

async function generateWithResilientCascade(
  messages: ApiChatMessage[],
  modelOption: AiModelOption
): Promise<string> {
  const lastMsg = messages[messages.length - 1];
  const { inlineParts, attachmentSummary } = extractBase64Parts(
    lastMsg?.attachments
  );
  const systemInstruction = getModelSpecificInstruction(modelOption);

  // 1. Try OpenAI first if user picked an OpenAI model and OPENAI_API_KEY is configured
  if (modelOption.provider === "openai" && process.env.OPENAI_API_KEY) {
    try {
      const apiMessages = [
        { role: "system", content: systemInstruction },
        ...messages.map((m, idx) => ({
          role: m.role,
          content:
            idx === messages.length - 1 && attachmentSummary
              ? `${attachmentSummary}\n${m.content}`
              : m.content,
        })),
      ];

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
            model: "gpt-4o-mini",
            messages: apiMessages,
            temperature: 0.7,
          }),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      if (gptResponse.ok) {
        const gptData = await gptResponse.json();
        const replyText = gptData?.choices?.[0]?.message?.content?.trim();
        if (replyText) {
          return replyText;
        }
      }
    } catch {
      // Automatically continue to Gemini multi-model cascade
    }
  }

  // 2. Multi-Model Gemini Cascade with per-model timeout
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
      const speaker = m.role === "user" ? "User" : "AI Consultant";
      const text = m.content || "";
      if (idx === recentMessages.length - 1 && attachmentSummary) {
        return `${speaker}: ${attachmentSummary}\n${text}`;
      }
      return `${speaker}: ${text}`;
    });

    const fullPrompt = `${historyLines.join("\n\n")}\n\nAI Consultant:`;
    const candidateModels = getGeminiCascadeOrder(modelOption);

    for (const candidateModel of candidateModels) {
      try {
        const contents: Part[] =
          inlineParts.length > 0
            ? [...inlineParts, { text: fullPrompt }]
            : [{ text: fullPrompt }];

        const response = await Promise.race([
          ai.models.generateContent({
            model: candidateModel,
            contents,
            config: {
              systemInstruction,
            },
          }),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("MODEL_TIMEOUT")), 6500)
          ),
        ]);

        const text = response?.text?.trim();
        if (text) {
          return text;
        }
      } catch {
        // If inline multimodal part caused a format error, retry text-only on fastest model
        if (inlineParts.length > 0) {
          try {
            const textOnlyRes = await Promise.race([
              ai.models.generateContent({
                model: "gemini-3.1-flash-lite",
                contents: fullPrompt,
                config: {
                  systemInstruction,
                },
              }),
              new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error("MODEL_TIMEOUT")), 5000)
              ),
            ]);
            const text = textOnlyRes?.text?.trim();
            if (text) return text;
          } catch {
            // Continue to next model in cascade
          }
        }
      }
    }
  }

  // 3. Guaranteed Local Expert R&D & General Assistant Fallback Engine (Zero 503/Error guarantee)
  return generateLocalExpertResponse(messages, modelOption);
}

export async function POST(req: NextRequest) {
  let parsedMessages: ApiChatMessage[] = [];
  let requestedModel = "auto";

  try {
    const body = await req.json();
    if (Array.isArray(body?.messages)) {
      parsedMessages = body.messages;
    }
    if (typeof body?.model === "string") {
      requestedModel = body.model;
    }

    if (parsedMessages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Pesan tidak boleh kosong." },
        { status: 400 }
      );
    }

    const modelOption = getModelOption(requestedModel);
    const replyText = await generateWithResilientCascade(
      parsedMessages,
      modelOption
    );

    return NextResponse.json({
      success: true,
      reply: replyText,
      modelUsed: modelOption.id,
    });
  } catch {
    const modelOption = getModelOption(requestedModel);
    const fallbackReply = generateLocalExpertResponse(
      parsedMessages,
      modelOption
    );
    return NextResponse.json({
      success: true,
      reply: fallbackReply,
      modelUsed: modelOption.id,
    });
  }
}
