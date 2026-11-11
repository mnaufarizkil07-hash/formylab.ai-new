import test from "node:test";
import assert from "node:assert/strict";
import {
  detectActiveAiPillars,
  cleanMarkdownForSpeech,
  extractFormulationFromText,
  calculateInteractiveHlb,
  evaluateFormulatorCopilot,
  FORMYLAB_AI_MODULES,
} from "./interactiveAiEngine";
import {
  analyzeBriefCompleteness,
  shouldSearchLiveInternet,
} from "./webSearchEngine";

test("detectActiveAiPillars identifies Generative, Analytical, Interactive, and Vision pillars accurately", () => {
  const basic = detectActiveAiPillars("Halo, apa kabar?");
  assert.ok(basic.some((p) => p.id === "interactive"));
  assert.ok(basic.some((p) => p.id === "generative"));

  const analytical = detectActiveAiPillars(
    "Hitung rasio HLB untuk Niacinamide 5% dan pH 5.5"
  );
  assert.ok(analytical.some((p) => p.id === "analytical"));

  const vision = detectActiveAiPillars("Analisis foto kemasan produk ini", [
    {
      id: "att-1",
      name: "inci_label.png",
      mimeType: "image/png",
      sizeLabel: "120 KB",
    },
  ]);
  assert.ok(vision.some((p) => p.id === "vision"));
});

test("cleanMarkdownForSpeech strips markdown syntax and expands units into fluent Indonesian", () => {
  const raw =
    "### ⚡ Ringkasan: Gunakan **Niacinamide 5%** pada suhu 40°C dengan viskositas 4500 cPs untuk emulsi O/W.";
  const spoken = cleanMarkdownForSpeech(raw);
  assert.ok(!spoken.includes("###"));
  assert.ok(!spoken.includes("**"));
  assert.ok(spoken.includes("5 persen"));
  assert.ok(spoken.includes("derajat Celcius"));
  assert.ok(spoken.includes("centipoise"));
  assert.ok(spoken.includes("oil in water"));
});

test("extractFormulationFromText extracts product type, pH, skin target, and active ingredients", () => {
  const aiReply =
    "Untuk kulit jerawat (acne), gunakan Acne Clarifying Fluid dengan Salicylic Acid 2% dan Niacinamide 4% pada pH 4.5.";
  const draft = extractFormulationFromText(aiReply);
  assert.equal(draft.productType, "Acne Control BHA/Azelaic Fluid");
  assert.equal(draft.skinTarget, "Acne-Prone");
  assert.equal(draft.targetPh, "4.5");
  assert.ok(
    draft.customIngredients.some((i) => i.toLowerCase().includes("niacinamide"))
  );
  assert.ok(
    draft.customIngredients.some((i) => i.toLowerCase().includes("salicylic"))
  );
});

test("calculateInteractiveHlb computes accurate Tween/Span blend ratios", () => {
  const res = calculateInteractiveHlb({
    hlbHigh: 14.9,
    hlbLow: 4.7,
    targetHlb: 11.0,
    totalEmulsifierPct: 4.0,
  });
  assert.equal(res.achievedHlb, 11.0);
  assert.ok(res.highDosagePct > 2.4 && res.highDosagePct < 2.55);
  assert.ok(res.lowDosagePct > 1.45 && res.lowDosagePct < 1.6);
  assert.ok(res.emulsionType.includes("O/W"));
});

test("evaluateFormulatorCopilot flags Niacinamide + low pH hydrolysis risk and detects synergies", () => {
  const lowPhEval = evaluateFormulatorCopilot({
    productType: "Facial Moisturizer (Cream)",
    skinTarget: "Sensitive & Redness",
    targetPh: "3.8",
    targetViscosity: "12,000 cPs",
    batchSize: "100",
    customIngredients: ["Niacinamide 5%", "Glycolic Acid 5%"],
  });
  assert.equal(lowPhEval.status, "critical");
  assert.ok(
    lowPhEval.alerts.some((a) => a.title.includes("Hidrolisis Niacinamide"))
  );

  const optimalEval = evaluateFormulatorCopilot({
    productType: "Facial Moisturizer (Cream)",
    skinTarget: "Sensitive & Redness",
    targetPh: "5.5",
    targetViscosity: "12,000 cPs",
    batchSize: "100",
    customIngredients: ["Niacinamide 4%", "Ceramide NP 1%", "Panthenol 2%"],
  });
  assert.equal(optimalEval.status, "optimal");
  assert.ok(optimalEval.synergiesFound.length > 0);
});

test("FORMYLAB_AI_MODULES defines all 9 core R&D AI modules from Workflow Formylab.ai", () => {
  assert.equal(FORMYLAB_AI_MODULES.length, 9);
  assert.equal(FORMYLAB_AI_MODULES[0].name, "Brief interpreter");
  assert.equal(FORMYLAB_AI_MODULES[8].name, "Learning loop");
});

test("analyzeBriefCompleteness detects vague formulation briefs without stiff Nanya Balik headings and skips market queries", () => {
  const vague = analyzeBriefCompleteness([
    { role: "user", content: "Tolong buatkan saya serum wajah untuk jerawat" },
  ]);
  assert.equal(vague.isFormulationBrief, true);
  assert.equal(vague.isIncomplete, true);
  assert.equal(vague.missingFields.length, 4);
  assert.ok(
    vague.clarifyingQuestionsMarkdown.includes(
      "Supaya draf formula di atas bisa saya sesuaikan"
    )
  );
  assert.ok(!vague.clarifyingQuestionsMarkdown.includes("Nanya Balik"));

  const marketQuestion = analyzeBriefCompleteness([
    {
      role: "user",
      content: "Sebutkan merek produk moisturizer terbaik yang sudah rilis di pasaran",
    },
  ]);
  assert.equal(marketQuestion.isFormulationBrief, false);
  assert.equal(marketQuestion.isIncomplete, false);

  const complete = analyzeBriefCompleteness([
    {
      role: "user",
      content:
        "Buatkan moisturizer kulit sensitif tekstur gel-cream ringan, target HPP Rp 12500 budget trial Rp 300000, wajib halal MUI, deadline 8 minggu MOQ 1000 pcs",
    },
  ]);
  assert.equal(complete.isFormulationBrief, true);
  assert.equal(complete.isIncomplete, false);
  assert.equal(complete.missingFields.length, 0);
});

test("shouldSearchLiveInternet skips pure math and enables web search for knowledge/brand queries", () => {
  assert.equal(shouldSearchLiveInternet("12 + 8 * 5"), false);
  assert.equal(
    shouldSearchLiveInternet("Apa merek moisturizer terbaik di dunia saat ini?"),
    true
  );
});

