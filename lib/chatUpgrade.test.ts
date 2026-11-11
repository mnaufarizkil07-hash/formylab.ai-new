import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanComputerArtifacts,
  parseSegmentIntoBlocks,
  isTableSeparatorLine,
} from "../components/FormattedChatText";
import {
  analyzeBriefCompleteness,
  cleanHtmlEntities,
  extractCoreSearchTokens,
  fetchRealtimeWebContext,
  shouldSearchLiveInternet,
  userExplicitlyAskedForSources,
} from "./webSearchEngine";
import {
  generateLocalExpertResponse,
  tryEvaluateMath,
} from "./aiFallbackEngine";
import { trySolveMathFromOcrText } from "./imageVisionEngine";
import { getModelOption } from "../components/AiModelLogos";

test("parseSegmentIntoBlocks parses Markdown tables including Screenshot 2 with blank lines between rows", () => {
  const screenshot2Markdown = `Berikut perbandingan Cetaphil dan Kahf:

| Fitur | Cetaphil | Kahf |

| :--- | :--- | :--- |

| **Fokus Utama** | Kesehatan Skin Barrier | Perawatan Kulit Pria (Grooming) |

| **Karakteristik** | Medis & Sangat Lembut | Refreshing & Deep Cleansing |
| **Fragrance** | Umumnya Tanpa Pewangi | Beraroma Maskulin |
| **Kelebihan** | Aman untuk kulit sensitif/alergi | Efektif lawan minyak & polusi |

Semoga membantu!`;

  const blocks = parseSegmentIntoBlocks(screenshot2Markdown);
  const tableBlock = blocks.find((b) => b.type === "table");
  assert.ok(tableBlock, "Expected a parsed table block");
  if (tableBlock && tableBlock.type === "table") {
    assert.deepEqual(tableBlock.headers, ["Fitur", "Cetaphil", "Kahf"]);
    assert.equal(tableBlock.rows.length, 4);
    assert.equal(tableBlock.rows[0][0], "**Fokus Utama**");
    assert.equal(tableBlock.rows[0][1], "Kesehatan Skin Barrier");
    assert.equal(tableBlock.rows[0][2], "Perawatan Kulit Pria (Grooming)");
  }
});

test("isTableSeparatorLine detects all Markdown table alignment rows", () => {
  assert.equal(isTableSeparatorLine("| :--- | :--- | :--- |"), true);
  assert.equal(isTableSeparatorLine("|---|---|---|"), true);
  assert.equal(isTableSeparatorLine("| :---: | ---: | :--- |"), true);
  assert.equal(isTableSeparatorLine("| Fitur | Cetaphil | Kahf |"), false);
});

test("cleanComputerArtifacts and cleanHtmlEntities strip raw LaTeX and escaped Google News RSS HTML tags", () => {
  const raw =
    "Nilai $pK_a$ dan $\\Delta HLB \\le 1.5$ menghasilkan $\\mathbf{61.76\\%}$ $\\rightarrow$ stabil pada $45^\\circ$C.";
  const cleaned = cleanComputerArtifacts(raw);
  assert.equal(cleaned.includes("\\rightarrow"), false);
  assert.equal(cleaned.includes("\\le"), false);
  assert.equal(cleaned.includes("\\mathbf"), false);
  assert.equal(cleaned.includes("$pK_a$"), false);
  assert.equal(cleaned.includes("→"), true);
  assert.equal(cleaned.includes("≤"), true);
  assert.equal(cleaned.includes("pKa"), true);

  const rssDescription =
    '&lt;a href="https://news.google.com/rss/articles/CBMi..." target="_blank"&gt;Jangan Asal Pilih Oli Motor dan Mobil&lt;/a&gt;&amp;nbsp;&amp;nbsp;&lt;font color="#6f6f6f"&gt;OtoRider&lt;/font&gt;';
  const cleanedRss = cleanHtmlEntities(rssDescription);
  assert.equal(cleanedRss.includes("<a"), false);
  assert.equal(cleanedRss.includes("<font"), false);
  assert.equal(cleanedRss.includes("href="), false);
  assert.equal(cleanedRss.includes("Jangan Asal Pilih Oli Motor"), true);

  const cleanedViaChat = cleanComputerArtifacts(rssDescription);
  assert.equal(cleanedViaChat.includes("<a"), false);
  assert.equal(cleanedViaChat.includes("<font"), false);
});

test("tryEvaluateMath handles typos like '8 + 9 BERAAPA' and verbal math without triggering web search", () => {
  assert.equal(shouldSearchLiveInternet("8 + 9 BERAAPA"), false);
  const mathRes = tryEvaluateMath("8 + 9 BERAAPA", getModelOption("auto"));
  assert.ok(mathRes, "Expected tryEvaluateMath to evaluate '8 + 9 BERAAPA'");
  assert.equal(mathRes?.includes("17"), true);

  const mathVerbal = tryEvaluateMath(
    "berapa 12 dikali 5 brp",
    getModelOption("gpt-6-luna")
  );
  assert.ok(mathVerbal);
  assert.equal(mathVerbal?.includes("60"), true);

  // Should NOT treat cosmetic ingredient strings as math
  const cosmeticStr = tryEvaluateMath(
    "Buatkan formula serum dengan Niacinamide 4% + Panthenol 2%"
  );
  assert.equal(cosmeticStr, null);
});

test("Uploaded Math Screenshot OCR (5 2/7 - 2 1/4 : 3 1/2) solves to 4 9/14 (Jawaban D) and NEVER returns UI Makara Fasilkom", () => {
  // Exact 2D vertical fraction OCR output produced by Tesseract on the user's screenshot
  const verticalOcr = `2.11\n~ 5=-2-:3\nHasitdari 7 4 2 adalat\n3\nA. 33\n9\na 3%\n3\ne 43\no 4?`;
  const solved = trySolveMathFromOcrText(verticalOcr, getModelOption("auto"));
  assert.ok(solved, "Expected trySolveMathFromOcrText to solve 2D vertical mixed fractions");
  assert.equal(solved?.includes("4 9/14"), true);
  assert.equal(solved?.includes("Jawaban: D. 4 9/14"), true);

  // Also test full generateLocalExpertResponse when user attaches the math screenshot and asks "berapa jawabannya?"
  const reply = generateLocalExpertResponse(
    [
      {
        role: "user",
        content: "berapa jawabannya?",
        attachments: [
          {
            id: "att-math-1",
            name: "Screenshot 2026-11-11 at 17.56.02.png",
            mimeType: "image/png",
            sizeLabel: "222.4 KB",
            textPreview: `[VISUAL_SIGNATURE: {"width":400,"height":420,"whiteRatio":0.92,"darkInkRatio":0.04,"yellowJacketRatio":0,"skinToneRatio":0,"chestRedRatio":0,"chestBlueRatio":0,"chestGreenRatio":0,"chestOrangeRatio":0,"chestPurpleRatio":0,"dominantCategory":"document_or_math_screenshot"}]\n[OCR_TEXT]:\n${verticalOcr}`,
          },
        ],
      },
    ],
    getModelOption("auto")
  );

  assert.equal(reply.includes("4 9/14"), true);
  assert.equal(
    reply.includes("Fasilkom"),
    false,
    "Math screenshot must NEVER return UI Makara Fasilkom response"
  );
  assert.equal(
    reply.includes("Jaket Kuning"),
    false,
    "Math screenshot must NEVER mention Jaket Kuning"
  );
});

test("extractCoreSearchTokens strips conversational Indonesian filler ('apakah kamu tau almatuq?' -> 'almatuq') and answers without math fallback template", async () => {
  const coreTokens = extractCoreSearchTokens("apakah kamu tau almatuq?");
  assert.equal(coreTokens.join(" ").toLowerCase(), "almatuq");

  const webCtx = await fetchRealtimeWebContext("apakah kamu tau almatuq?");
  const reply = generateLocalExpertResponse(
    [{ role: "user", content: "apakah kamu tau almatuq?" }],
    getModelOption("auto"),
    webCtx.results
  );

  assert.equal(
    reply.includes("Jika Anda ingin **menghitung angka atau rumus matematika/kimia**"),
    false,
    "General queries must NEVER output the math fallback template"
  );
  if (webCtx.results.length > 0) {
    assert.equal(
      /al[-\s’']*ma['’]?tuq|sukabumi|pesantren/i.test(reply),
      true,
      "Expected reply to contain live web information about Al-Ma'tuq"
    );
  }
});

test("Moisturizer skin barrier benchmark query returns CeraVe/Skintific/Labore table and NEVER Glycolic Acid across all 5 AI models", () => {
  const prompt =
    "Apa merek moisturizer skin barrier terbaik di dunia dan Indonesia saat ini beserta bahan aktif utamanya?";
  const modelIds = [
    "auto",
    "gpt-6-luna",
    "gemini-3.8-flash",
    "gemini-3.8-pro",
    "gpt-6-omni",
  ] as const;

  for (const id of modelIds) {
    const opt = getModelOption(id);
    const reply = generateLocalExpertResponse(
      [{ role: "user", content: prompt }],
      opt
    );
    assert.equal(
      reply.includes("Glycolic Acid (High-Purity Crystalline AHA)"),
      false,
      `Model ${id} must NOT match 'aha' inside 'bahan' and return Glycolic Acid`
    );
    assert.equal(
      reply.includes("CeraVe"),
      true,
      `Model ${id} must include CeraVe in moisturizer skin barrier benchmark`
    );
    assert.equal(
      reply.includes("Skintific"),
      true,
      `Model ${id} must include Skintific in moisturizer skin barrier benchmark`
    );
    assert.equal(
      reply.includes("Laboré"),
      true,
      `Model ${id} must include Laboré in moisturizer skin barrier benchmark`
    );
  }
});

test("Universitas Indonesia Makara Biru-Merah accurately identifies Fasilkom UI", () => {
  const reply = generateLocalExpertResponse(
    [
      {
        role: "user",
        content: "Makara merah biru pada jaket kuning UI itu fakultas apa?",
      },
    ],
    getModelOption("auto")
  );
  assert.equal(reply.includes("Fakultas Ilmu Komputer"), true);
  assert.equal(reply.includes("Fasilkom UI"), true);
});

test("userExplicitlyAskedForSources only returns true when user asks for sources/links", () => {
  assert.equal(
    userExplicitlyAskedForSources("Bandingkan Cetaphil dan Kahf"),
    false
  );
  assert.equal(
    userExplicitlyAskedForSources("Buatkan formula serum brightening"),
    false
  );
  assert.equal(
    userExplicitlyAskedForSources(
      "Apa moisturizer terbaik? Tolong tampilkan sumbernya"
    ),
    true
  );
  assert.equal(
    userExplicitlyAskedForSources("Minta link sumber referensinya dong"),
    true
  );
});

test("analyzeBriefCompleteness triggers only on incomplete formulation briefs and not on brand comparisons", () => {
  const brandQuery = analyzeBriefCompleteness([
    { role: "user", content: "Bandingkan Cetaphil dan Kahf untuk cuci muka" },
  ]);
  assert.equal(brandQuery.isFormulationBrief, false);
  assert.equal(brandQuery.isIncomplete, false);

  const incompleteBrief = analyzeBriefCompleteness([
    {
      role: "user",
      content: "Klien minta dibuatkan serum brightening wajah, gimana drafnya?",
    },
  ]);
  assert.equal(incompleteBrief.isFormulationBrief, true);
  assert.equal(incompleteBrief.isIncomplete, true);
  assert.equal(
    incompleteBrief.clarifyingQuestionsMarkdown.toLowerCase().includes("nanya balik"),
    false
  );
});

test("All 5 AI models generate clean responses without robotic headers like Ringkasan Cepat", () => {
  const modelIds = [
    "auto",
    "gpt-6-luna",
    "gemini-3.8-flash",
    "gemini-3.8-pro",
    "gpt-6-omni",
  ] as const;

  for (const id of modelIds) {
    const opt = getModelOption(id);
    const reply = generateLocalExpertResponse(
      [{ role: "user", content: "Bandingkan Cetaphil dan Kahf" }],
      opt
    );
    assert.equal(
      reply.toLowerCase().includes("ringkasan cepat"),
      false,
      `Model ${id} should not include 'Ringkasan Cepat'`
    );
    assert.equal(
      reply.includes("| Parameter Perbandingan | Cetaphil | Kahf |"),
      true,
      `Model ${id} should output a Markdown comparison table`
    );
  }
});

test("BPOM & Halal check on Salicylic Acid 2%, Niacinamide 4%, and Phenoxyethanol 0.8% extracts exact ingredients and concentrations and checks both BPOM & Halal across all 5 models", () => {
  const prompt =
    "Cek status kehalalan dan batas aman BPOM untuk kombinasi Salicylic Acid 2%, Niacinamide 4%, dan Phenoxyethanol 0.8%.";
  const modelIds = [
    "auto",
    "gpt-6-luna",
    "gemini-3.8-flash",
    "gemini-3.8-pro",
    "gpt-6-omni",
  ] as const;

  for (const id of modelIds) {
    const opt = getModelOption(id);
    const reply = generateLocalExpertResponse(
      [{ role: "user", content: prompt }],
      opt
    );

    assert.equal(
      reply.includes("Salicylic Acid (BHA)") && reply.includes("2%"),
      true,
      `Model ${id} must extract Salicylic Acid (2%)`
    );
    assert.equal(
      reply.includes("Niacinamide (Vitamin B3)") && reply.includes("4%"),
      true,
      `Model ${id} must extract Niacinamide (4%)`
    );
    assert.equal(
      reply.includes("Phenoxyethanol") && reply.includes("0.8%"),
      true,
      `Model ${id} must extract Phenoxyethanol (0.8%)`
    );
    assert.equal(
      reply.includes("Maksimum **2.0%**"),
      true,
      `Model ${id} must include BPOM limit for Salicylic Acid (Maksimum 2.0%)`
    );
    assert.equal(
      reply.includes("Maksimum **1.0%**"),
      true,
      `Model ${id} must include BPOM limit for Phenoxyethanol (Maksimum 1.0%)`
    );
    assert.equal(
      reply.includes("Status Kehalalan"),
      true,
      `Model ${id} must include Status Kehalalan column/analysis`
    );
    assert.equal(
      reply.includes("Collagen / Gelatin"),
      false,
      `Model ${id} must NEVER return unrelated Collagen/Gelatin static table when specific ingredients are provided`
    );
  }
});

test("All 9 Formylab AI Modules and math screenshot fallback produce accurate, prompt-aligned outputs", () => {
  // Formula Generator with Niacinamide 4% + Ceramide NP must return 100% w/w Fase A/B/C/D table + RPM/°C SOP
  const formulaGenReply = generateLocalExpertResponse(
    [
      {
        role: "user",
        content:
          "[Formula Generator] Susun formula lengkap 100% w/w (Fase A, B, C, D) beserta metode pembuatan (suhu °C & RPM homogenizer) untuk Barrier Moisturizer Niacinamide 4% + Ceramide NP.",
      },
    ],
    getModelOption("auto")
  );
  assert.equal(formulaGenReply.includes("Fase A (Air)"), true);
  assert.equal(formulaGenReply.includes("Fase B (Minyak)"), true);
  assert.equal(formulaGenReply.includes("Fase C (Aktif)"), true);
  assert.equal(formulaGenReply.includes("Fase D (Pengawet)"), true);
  assert.equal(formulaGenReply.includes("Niacinamide"), true);
  assert.equal(formulaGenReply.includes("Ceramide NP"), true);
  assert.equal(formulaGenReply.includes("3.200 RPM"), true);

  // Compatibility Checker with Niacinamide 5%, Salicylic Acid 2%, Vitamin C (L-Ascorbic Acid) 10%
  const compatReply = generateLocalExpertResponse(
    [
      {
        role: "user",
        content:
          "[Compatibility Checker] Prediksi risiko interaksi kimia dan stabilitas pH/emulsi jika Niacinamide 5% digabungkan dengan Salicylic Acid 2% dan Vitamin C (L-Ascorbic Acid) 10%.",
      },
    ],
    getModelOption("auto")
  );
  assert.equal(compatReply.includes("Niacinamide (Vitamin B3) (5%)"), true);
  assert.equal(compatReply.includes("Salicylic Acid (BHA) (2%)"), true);
  assert.equal(compatReply.includes("Ascorbic Acid"), true);

  // Image math screenshot with "berikan jawaban dan cara nya" even when OCR text is empty
  const mathFallbackReply = generateLocalExpertResponse(
    [
      {
        role: "user",
        content: "berikan jawaban dan cara nya",
        attachments: [
          {
            id: "att-math-2",
            name: "Screenshot 2026-11-11 at 17.56.02.png",
            mimeType: "image/png",
            sizeLabel: "222.4 KB",
            textPreview: `[VISUAL_SIGNATURE: {"width":994,"height":1092,"whiteRatio":0.93,"darkInkRatio":0.035,"yellowJacketRatio":0,"skinToneRatio":0,"chestRedRatio":0,"chestBlueRatio":0,"chestGreenRatio":0,"chestOrangeRatio":0,"chestPurpleRatio":0,"dominantCategory":"document_or_math_screenshot","isMultipleChoiceMathLayout":true}]`,
          },
        ],
      },
    ],
    getModelOption("auto")
  );
  assert.equal(mathFallbackReply.includes("4 9/14"), true);
  assert.equal(mathFallbackReply.includes("Jawaban: D. 4 9/14"), true);
  assert.equal(
    mathFallbackReply.includes("estimasi viskositas 4.500"),
    false,
    "Math screenshot must NEVER output cosmetic viscosity tables"
  );
});

test("PEMDAS/BODMAS fraction equation (9 - 3 ÷ 1/3 + 1 = 1) works on image upload without caption, follow-up 'berapa hasilnya, dan gmna caranya', and direct text '9 - 3 : 1/3 + 1 =?'", async () => {
  // 1. Screenshot 1: User uploads "Can You Solve This? 9 - 3 ÷ 1/3 + 1 =" without typing a prompt ("📎 Mengirim 1 file")
  const ocrFromScreenshot = `Can You Solve This?\n1\n03+ +1 =\n9 3 3`;
  const replyTurn1 = generateLocalExpertResponse(
    [
      {
        role: "user",
        content: "📎 Mengirim 1 file (Screenshot 2026-11-11 at 19.53.09.png)",
        attachments: [
          {
            id: "att-pemdas-1",
            name: "Screenshot 2026-11-11 at 19.53.09.png",
            mimeType: "image/png",
            sizeLabel: "272.9 KB",
            textPreview: `[VISUAL_SIGNATURE: {"width":700,"height":460,"whiteRatio":0.88,"darkInkRatio":0.06,"yellowJacketRatio":0,"skinToneRatio":0,"chestRedRatio":0,"chestBlueRatio":0,"chestGreenRatio":0,"chestOrangeRatio":0,"chestPurpleRatio":0,"dominantCategory":"document_or_math_screenshot","isEquationPuzzleLayout":true}]\n[OCR_TEXT]:\n${ocrFromScreenshot}`,
          },
        ],
      },
    ],
    getModelOption("gemini-3.8-pro")
  );

  assert.equal(
    replyTurn1.includes("PEMDAS / BODMAS"),
    true,
    "Should explain PEMDAS / BODMAS order of operations like Gemini Pro"
  );
  assert.equal(
    replyTurn1.includes("3 ÷ (1/3) = 3 × 3/1 = 3 × 3 = 9"),
    true,
    "Should show 3 ÷ (1/3) = 3 × 3 = 9"
  );
  assert.equal(
    replyTurn1.includes("Hasil akhir dari persamaan tersebut adalah 1."),
    true,
    "Final answer must be 1"
  );
  assert.equal(
    replyTurn1.includes("Mengirim 1 file"),
    false,
    "Must NEVER echo 'Terkait pertanyaan Anda (Mengirim 1 file)'"
  );

  // 2. Screenshot 2A: User asks follow-up "berapa hasilnya, dan gmna caranya"
  const tokensFollowUp = extractCoreSearchTokens("berapa hasilnya, dan gmna caranya");
  assert.equal(
    tokensFollowUp.length,
    0,
    "'berapa hasilnya, dan gmna caranya' must have 0 search tokens so it NEVER searches BBC News for 'caranya'"
  );

  const replyTurn2 = generateLocalExpertResponse(
    [
      {
        role: "user",
        content: "berapa hasilnya, dan gmna caranya",
        attachments: [
          {
            id: "att-pemdas-2",
            name: "Screenshot 2026-11-11 at 19.53.09.png",
            mimeType: "image/png",
            sizeLabel: "272.9 KB",
            textPreview: `[OCR_TEXT]:\n${ocrFromScreenshot}`,
          },
        ],
      },
    ],
    getModelOption("gemini-3.8-pro")
  );
  assert.equal(
    replyTurn2.includes("Hasil akhir dari persamaan tersebut adalah 1."),
    true
  );

  // 3. Screenshot 2B: User types directly "9 - 3 : 1/3 + 1 =?"
  const directTextReply = tryEvaluateMath(
    "9 - 3 : 1/3 + 1 =?",
    getModelOption("gemini-3.8-pro")
  );
  assert.ok(directTextReply, "Expected tryEvaluateMath to solve '9 - 3 : 1/3 + 1 =?'");
  assert.equal(
    directTextReply?.includes("Hasil akhir dari persamaan tersebut adalah 1."),
    true,
    "'9 - 3 : 1/3 + 1 =?' must evaluate to 1 (NOT 9!)"
  );
  assert.equal(
    directTextReply?.includes("batch 100 gram"),
    false,
    "Must NEVER append cosmetic batch 100 gram text to math answers"
  );
});


