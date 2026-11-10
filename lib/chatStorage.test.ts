import test from "node:test";
import assert from "node:assert/strict";
import {
  createDefaultSession,
  createFallbackVoiceNoteWav,
  formatDuration,
  formatFileSize,
  generateSessionTitle,
  generateUniqueId,
} from "./chatStorage";
import { getModelOption } from "../components/AiModelLogos";
import { generateLocalExpertResponse } from "./aiFallbackEngine";

test("createDefaultSession initializes welcome message and auto model", () => {
  const session = createDefaultSession();
  assert.equal(session.model, "auto");
  assert.equal(session.title, "Obrolan Baru");
  assert.equal(session.messages.length, 1);
  assert.equal(session.messages[0].role, "assistant");
});

test("generateSessionTitle synthesizes smart topic titles instead of copying raw text", () => {
  const mathTitle = generateSessionTitle("1+2 berapa");
  assert.equal(mathTitle, "Perhitungan & Kalkulasi Dasar");

  const hlbTitle = generateSessionTitle("Berapa rasio HLB krim O/W?");
  assert.equal(hlbTitle, "Keseimbangan HLB & Sistem Emulsi");

  const rosaceaTitle = generateSessionTitle(
    "Bagaimana cara meracik moisturizer untuk kulit rosacea di iklim tropis yang lembap?"
  );
  assert.equal(rosaceaTitle, "Formulasi Kulit Sensitif & Rosacea");

  const vnTitle = generateSessionTitle("", true, false);
  assert.equal(vnTitle, "Konsultasi Pesan Suara (VN)");
});

test("generateUniqueId produces distinct keys across multiple calls", () => {
  const id1 = generateUniqueId("user");
  const id2 = generateUniqueId("user");
  assert.notEqual(id1, id2);
  assert.equal(id1.startsWith("user-"), true);
});

test("getModelOption maps legacy gpt to gpt-6-luna and gemini to gemini-3.8-flash", () => {
  const gptOpt = getModelOption("gpt");
  assert.equal(gptOpt.id, "gpt-6-luna");
  assert.equal(gptOpt.name, "GPT-6 Luna");

  const gemOpt = getModelOption("gemini");
  assert.equal(gemOpt.id, "gemini-3.8-flash");
  assert.equal(gemOpt.name, "Gemini 3.8 Flash");

  const autoOpt = getModelOption("auto");
  assert.equal(autoOpt.id, "auto");
  assert.equal(autoOpt.name, "Auto");
});

test("createFallbackVoiceNoteWav and formatters return valid audio data and labels", () => {
  const wavUrl = createFallbackVoiceNoteWav(2);
  assert.equal(wavUrl.startsWith("data:audio/wav;base64,"), true);
  assert.equal(formatDuration(65), "1:05");
  assert.equal(formatFileSize(2048), "2.0 KB");
});

test("generateLocalExpertResponse handles verbal Indonesian math ('berapa 9 kali 0'), percentages, rosacea, HLB, and differentiates all 5 models", () => {
  const outputsForRosacea = new Set<string>();

  for (const modelId of [
    "auto",
    "gpt-6-luna",
    "gemini-3.8-flash",
    "gemini-3.8-pro",
    "gpt-6-omni",
  ]) {
    const opt = getModelOption(modelId);

    const zeroMathReply = generateLocalExpertResponse(
      [{ role: "user", content: "berapa 9 kali 0" }],
      opt
    );
    assert.equal(zeroMathReply.includes("0"), true);
    assert.equal(zeroMathReply.includes("Berdasarkan konteks permintaan Anda"), false);

    const mathReply = generateLocalExpertResponse(
      [{ role: "user", content: "25 ditambah 75 berapa?" }],
      opt
    );
    assert.equal(mathReply.includes("100"), true);

    const pctReply = generateLocalExpertResponse(
      [{ role: "user", content: "berapa 15% dari 200000" }],
      opt
    );
    assert.equal(pctReply.includes("30.000") || pctReply.includes("30000"), true);

    const rosaceaReply = generateLocalExpertResponse(
      [
        {
          role: "user",
          content:
            "Bagaimana meracik moisturizer untuk kulit rosacea di iklim lembap?",
        },
      ],
      opt
    );
    assert.equal(rosaceaReply.includes("Panthenol"), true);
    outputsForRosacea.add(rosaceaReply);
  }

  // Verify that the 5 models produce genuinely distinct structures/styles (not identical text)
  assert.equal(outputsForRosacea.size, 5);
});

