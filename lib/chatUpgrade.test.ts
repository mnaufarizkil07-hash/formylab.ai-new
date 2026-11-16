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

  // Verify search engine breadcrumbs (> id > kalkulator), disclaimers (Sanggahan:), and dangling Markdown (**__, **) at paragraph start are stripped
  const dirtySearchArtifact =
    "**> id > kalkulator** Hasil perhitungan adalah 17. Sanggahan: Informasi ini hanya untuk tujuan umum.";
  const cleanedSearch = cleanComputerArtifacts(dirtySearchArtifact);
  assert.equal(cleanedSearch.includes("> id > kalkulator"), false);
  assert.equal(cleanedSearch.includes("Sanggahan:"), false);
  assert.equal(cleanedSearch, "Hasil perhitungan adalah 17.");
  assert.equal(/^[A-Za-z]/.test(cleanedSearch), true);

  assert.equal(
    cleanComputerArtifacts("**__ Hasil perhitungan adalah 17."),
    "Hasil perhitungan adalah 17."
  );
  assert.equal(
    cleanComputerArtifacts("** — Pondok Pesantren Al-Ma'tuq berlokasi di Sukabumi."),
    "Pondok Pesantren Al-Ma'tuq berlokasi di Sukabumi."
  );
  assert.equal(
    cleanComputerArtifacts("() - # _ * Jawaban akhirnya adalah 1."),
    "Jawaban akhirnya adalah 1."
  );
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

test("Gemini & OpenAI Multi-Model Ecosystem Architecture includes Clean Natural System Instruction, Dynamic Auto Routing, Google Search Grounding, and Full Sequential Multi-Turn History", async () => {
  const {
    ADAPTIVE_SYSTEM_INSTRUCTION,
    CLEAN_NATURAL_SYSTEM_INSTRUCTION,
    CORE_PRINCIPLE_SYSTEM_INSTRUCTION,
    EXTERNAL_FUNCTION_DECLARATIONS,
    buildGeminiToolsConfig,
    buildGeminiConversationHistory,
    buildOpenAiConversationMessages,
    resolveAutoModelRoute,
  } = await import("./geminiAgentConfig");

  const expectedCleanInstruction =
    "Kamu adalah asisten AI yang cerdas dan natural. Selalu perhatikan konteks obrolan sebelumnya. Jawab dengan paragraf yang mengalir, dan HANYA buat tabel Markdown jika pengguna secara eksplisit meminta 'tabel' atau 'perbandingan'. Gunakan fitur Google Search bawaan untuk mencari fakta terkini dan ceritakan kembali dengan bahasamu sendiri.";

  // 1. Clean & Natural System Instruction verification
  assert.equal(ADAPTIVE_SYSTEM_INSTRUCTION, expectedCleanInstruction);
  assert.equal(CLEAN_NATURAL_SYSTEM_INSTRUCTION, expectedCleanInstruction);
  assert.equal(CORE_PRINCIPLE_SYSTEM_INSTRUCTION, expectedCleanInstruction);

  // 2. Dynamic 'Auto' Router verification
  assert.equal(
    resolveAutoModelRoute([{ role: "user", content: "Apa itu Niacinamide?" }]),
    "gemini-3.8-flash",
    "Simple/fast queries should route to gemini-3.8-flash"
  );
  assert.equal(
    resolveAutoModelRoute([
      {
        role: "user",
        content:
          "Jelaskan secara detail mekanisme kompatibilitas pH dan stabilitas emulsi antara Salicylic Acid 2% dan Niacinamide 4% beserta aturan BPOM",
      },
    ]),
    "gemini-3.8-pro",
    "Complex scientific/regulatory/math queries should route to gemini-3.8-pro"
  );
  assert.equal(
    resolveAutoModelRoute([
      {
        role: "user",
        content:
          "Susun strategi bisnis, target HPP, MOQ, dan master blueprint industri untuk brand skincare baru",
      },
    ]),
    "gpt-6-omni",
    "Deep market/architecture/HPP queries should route to gpt-6-omni"
  );

  // 3. Google Search Grounding (ALWAYS included)
  assert.equal(Array.isArray(EXTERNAL_FUNCTION_DECLARATIONS), true);
  const tools = buildGeminiToolsConfig();
  assert.equal(
    tools.some((t) => "googleSearch" in t),
    true,
    "Tools config must ALWAYS include { googleSearch: {} }"
  );
  const searchOnlyTools = buildGeminiToolsConfig({
    enableGoogleSearch: true,
    enableCodeExecution: false,
  });
  assert.equal(
    searchOnlyTools.some((t) => "googleSearch" in t),
    true,
    "googleSearch: {} must remain guaranteed in tools config for Gemini API"
  );

  // 4A. Multi-turn Chat History for Google Gemini ('user' and 'model') without artificial injections
  const { contents: historyContents } = buildGeminiConversationHistory([
    { role: "user", content: "Halo, saya sedang riset serum Niacinamide 4%." },
    { role: "assistant", content: "Siap, Niacinamide 4% sangat efektif untuk skin barrier." },
    { role: "user", content: "Berapa pH optimalnya?" },
  ]);

  assert.equal(historyContents.length, 3);
  assert.equal(historyContents[0].role, "user");
  assert.equal(historyContents[1].role, "model");
  assert.equal(historyContents[2].role, "user");
  assert.equal(historyContents[2].parts?.[0]?.text, "Berapa pH optimalnya?");

  // 4B. Multi-turn Chat History for OpenAI ('system', 'user', and 'assistant')
  const openAiMsgs = buildOpenAiConversationMessages([
    { role: "user", content: "Bandingkan Cetaphil dan Kahf." },
    { role: "assistant", content: "Berikut tabel perbandingannya." },
    { role: "user", content: "Mana yang cocok untuk kulit berminyak?" },
  ]);
  assert.equal(openAiMsgs.length, 4);
  assert.equal(openAiMsgs[0].role, "system");
  assert.equal(openAiMsgs[0].content, expectedCleanInstruction);
  assert.equal(openAiMsgs[1].role, "user");
  assert.equal(openAiMsgs[2].role, "assistant");
  assert.equal(openAiMsgs[3].role, "user");

  // 5. Automatic Model Fallback Chain, Dynamic Discovery Filter & Persona System Instructions
  const {
    GEMINI_FALLBACK_MODEL_CHAIN,
    getGeminiFallbackModelChain,
    isSupportedDynamicChatModel,
    mapUiModelToGeminiSdkModel,
    getSystemInstructionForUiModel,
    OPENAI_STYLE_PERSONA_INSTRUCTION,
    GEMINI_STYLE_PERSONA_INSTRUCTION,
  } = await import("./geminiAgentConfig");

  assert.deepEqual(getGeminiFallbackModelChain(), [
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-3-flash-preview",
    "gemini-2.5-flash-lite",
    "gemini-1.5-flash",
  ]);
  assert.equal(GEMINI_FALLBACK_MODEL_CHAIN.length, 5);
  assert.equal(mapUiModelToGeminiSdkModel("Gemini 3.8 Pro"), "gemini-2.5-flash");
  assert.equal(mapUiModelToGeminiSdkModel("GPT-6 Omni"), "gemini-2.5-flash");
  assert.equal(mapUiModelToGeminiSdkModel("Auto"), "gemini-2.5-flash");

  // Verify dynamic model discovery filter (accepts generateContent models, excludes embedding/vision-only)
  assert.equal(
    isSupportedDynamicChatModel({
      name: "models/gemini-2.0-flash-001",
      supportedGenerationMethods: ["generateContent", "countTokens"],
    }),
    true
  );
  assert.equal(
    isSupportedDynamicChatModel({
      name: "models/text-embedding-004",
      supportedGenerationMethods: ["embedContent"],
    }),
    false
  );
  assert.equal(
    isSupportedDynamicChatModel({
      name: "models/gemini-pro-vision",
      supportedGenerationMethods: ["generateContent"],
    }),
    false
  );

  // Verify System Instruction differentiates OpenAI (GPT-6 Luna / Omni) vs Gemini (3.8 Flash / Pro) characteristics
  assert.equal(
    getSystemInstructionForUiModel("gpt-6-luna").includes(
      OPENAI_STYLE_PERSONA_INSTRUCTION
    ),
    true
  );
  assert.equal(
    getSystemInstructionForUiModel("gpt-6-omni").includes(
      OPENAI_STYLE_PERSONA_INSTRUCTION
    ),
    true
  );
  assert.equal(
    getSystemInstructionForUiModel("gemini-3.8-flash").includes(
      GEMINI_STYLE_PERSONA_INSTRUCTION
    ),
    true
  );
  assert.equal(
    getSystemInstructionForUiModel("gemini-3.8-pro").includes(
      GEMINI_STYLE_PERSONA_INSTRUCTION
    ),
    true
  );
});

test("Adaptive formatting: simple/location/fact queries use natural paragraphs WITHOUT tables, while comparison queries use Markdown tables", () => {
  const simpleLocationReply = generateLocalExpertResponse(
    [{ role: "user", content: "dimana lokasi Pesantren Al-Ma'tuq?" }],
    getModelOption("auto"),
    [
      {
        title: "Pesantren Al-Ma'tuq Sukabumi",
        snippet:
          "Pondok Pesantren Al-Ma'tuq berlokasi di Desa Gunung Jaya, Kecamatan Cisaat, Kabupaten Sukabumi, Jawa Barat.",
        url: "https://example.com/almatuq",
        sourceName: "Web",
      },
    ]
  );
  assert.equal(
    simpleLocationReply.includes("|"),
    false,
    "Simple location queries must NEVER contain a Markdown table"
  );
  assert.equal(simpleLocationReply.includes("Sukabumi"), true);

  const jfSulfurComparison = generateLocalExpertResponse(
    [{ role: "user", content: "Bandingkan JF Sulfur dan Acnes untuk kulit berjerawat" }],
    getModelOption("auto"),
    []
  );
  assert.equal(jfSulfurComparison.includes("JF Sulfur"), true);
  assert.equal(jfSulfurComparison.includes("Acnes"), true);
  assert.equal(jfSulfurComparison.includes("| Parameter Perbandingan |"), true);

  const everydayComparison = generateLocalExpertResponse(
    [{ role: "user", content: "Bandingkan Nivea dan Vaseline" }],
    getModelOption("auto"),
    []
  );
  assert.equal(
    everydayComparison.includes("| Parameter Perbandingan | Nivea | Vaseline |"),
    true
  );
});

test("Multi-turn Chat History retains context on follow-up instructions like 'buatkan dalam bentuk tabel' without hallucinating", async () => {
  const {
    buildGeminiConversationHistory,
    resolveConversationalFollowUp,
  } = await import("./geminiAgentConfig");

  // 1. Multi-turn location query followed by "buatkan dalam bentuk tabel"
  const locationConversation = [
    { role: "user" as const, content: "dimana lokasi Pesantren Al-Ma'tuq?" },
    {
      role: "model" as const,
      content:
        "Pondok Pesantren Al-Ma'tuq berlokasi di Desa Gunung Jaya, Kecamatan Cisaat, Kabupaten Sukabumi, Jawa Barat. Pesantren ini merupakan lembaga pendidikan Islam berasrama yang mudah diakses dari pusat Kota Sukabumi.",
    },
    { role: "user" as const, content: "buatkan dalam bentuk tabel" },
  ];

  const resolution = resolveConversationalFollowUp(locationConversation);
  assert.equal(resolution.isFollowUp, true);
  assert.equal(resolution.isTableRequest, true);
  assert.equal(
    resolution.previousUserTopic,
    "dimana lokasi Pesantren Al-Ma'tuq?"
  );
  assert.equal(
    resolution.effectiveSearchQuery.includes("Al-Ma'tuq"),
    true,
    "effectiveSearchQuery must carry over the topic from Turn 1"
  );

  // Verify buildGeminiConversationHistory sends all 3 turns sequentially with role: 'user' and role: 'model'
  const { contents } = buildGeminiConversationHistory(locationConversation);
  assert.equal(contents.length, 3);
  assert.equal(contents[0].role, "user");
  assert.equal(contents[1].role, "model");
  assert.equal(contents[2].role, "user");

  // Verify generateLocalExpertResponse converts Turn 1's topic & reply into a Markdown table about Pesantren Al-Ma'tuq
  const tableFollowUpReply = generateLocalExpertResponse(
    locationConversation,
    getModelOption("auto"),
    []
  );
  assert.equal(
    tableFollowUpReply.includes("|"),
    true,
    "Follow-up 'buatkan dalam bentuk tabel' MUST produce a Markdown table"
  );
  assert.equal(
    tableFollowUpReply.includes("Al-Ma'tuq"),
    true,
    "Table follow-up MUST retain the topic 'Pesantren Al-Ma'tuq' from Turn 1"
  );
  assert.equal(
    tableFollowUpReply.includes("Sukabumi"),
    true,
    "Table follow-up MUST retain the factual content from Turn 1's model reply"
  );
  assert.equal(
    tableFollowUpReply.includes("**Buatkan Dalam Bentuk Tabel**"),
    false,
    "Must NEVER hallucinate 'Buatkan Dalam Bentuk Tabel' as a literal subject"
  );

  // 2. Multi-turn product discussion followed by "buatkan dalam bentuk tabel"
  const productConversation = [
    { role: "user" as const, content: "jelaskan tentang sabun JF Sulfur" },
    {
      role: "model" as const,
      content:
        "JF Sulfur adalah sabun spesialis perawatan kulit berjerawat dan berminyak yang mengandung Active Sulfur alami.",
    },
    { role: "user" as const, content: "buatkan dalam bentuk tabel" },
  ];
  const productTableReply = generateLocalExpertResponse(
    productConversation,
    getModelOption("auto"),
    []
  );
  assert.equal(productTableReply.includes("JF Sulfur"), true);
  assert.equal(productTableReply.includes("| Parameter Produk |"), true);
});

test("Official Gemini contents schema, typo-tolerant Django vs Next.js architecture comparison without beauty bias, and snippet publication date removal", async () => {
  const {
    normalizeIncomingChatMessages,
    buildGeminiConversationHistory,
  } = await import("./geminiAgentConfig");
  const { stripWebSnippetPublicationDates } = await import("./webSearchEngine");

  // 1. Official Gemini API contents schema (`contents: [{role: 'user', parts: [{text: '...'}]}, {role: 'model', parts: [{text: '...'}]}]`)
  const rawPayload = {
    contents: [
      {
        role: "user",
        parts: [{ text: "Saya ingin membangun aplikasi web modern dengan Python dan React." }],
      },
      {
        role: "model",
        parts: [{ text: "Anda dapat mempertimbangkan Django untuk backend Python dan Next.js untuk frontend React." }],
      },
      {
        role: "user",
        parts: [{ text: "tolong badingkan arsitektur djanggo dan nextjs" }],
      },
    ],
  };

  const normalized = normalizeIncomingChatMessages(rawPayload);
  assert.equal(normalized.length, 3);
  assert.equal(normalized[0].role, "user");
  assert.equal(normalized[1].role, "model");
  assert.equal(normalized[2].role, "user");
  assert.equal(
    normalized[2].parts?.[0]?.text,
    "tolong badingkan arsitektur djanggo dan nextjs"
  );

  const { contents: geminiContents } = buildGeminiConversationHistory(normalized);
  assert.equal(geminiContents.length, 3);
  assert.equal(geminiContents[0].role, "user");
  assert.equal(geminiContents[1].role, "model");
  assert.equal(geminiContents[2].role, "user");

  // 2. Typo-tolerant Django vs Next.js comparison NEVER hallucinates beauty/skincare table
  const djangoNextReply = generateLocalExpertResponse(
    normalized,
    getModelOption("auto"),
    []
  );
  assert.equal(djangoNextReply.includes("Django"), true);
  assert.equal(djangoNextReply.includes("Next.js"), true);
  assert.equal(djangoNextReply.includes("MVT"), true);
  assert.equal(djangoNextReply.includes("Python"), true);
  assert.equal(
    djangoNextReply.toLowerCase().includes("kondisi kulit"),
    false,
    "Must NEVER mention 'kondisi kulit' when comparing Django and Next.js"
  );
  assert.equal(
    djangoNextReply.toLowerCase().includes("bahan aktif"),
    false,
    "Must NEVER mention 'bahan aktif' when comparing Django and Next.js"
  );
  assert.equal(
    djangoNextReply.toLowerCase().includes("jenis kulit"),
    false,
    "Must NEVER mention 'jenis kulit' when comparing Django and Next.js"
  );

  // 3. Web snippet publication date filter removes snippet publication timestamps in narrative sentences
  const snippetWithDates =
    "12 Mei 2024 — Pondok Pesantren Al-Ma'tuq (Fri, 13 Nov 2026) yang diterbitkan pada 10 Januari 2024 merupakan lembaga pendidikan Islam di Sukabumi.";
  const cleanedSnippet = stripWebSnippetPublicationDates(snippetWithDates);
  assert.equal(cleanedSnippet.includes("12 Mei 2024"), false);
  assert.equal(cleanedSnippet.includes("13 Nov 2026"), false);
  assert.equal(cleanedSnippet.includes("10 Januari 2024"), false);
  assert.equal(
    cleanedSnippet.includes("Pondok Pesantren Al-Ma'tuq"),
    true
  );
});

test("Intent-Based Formatting: classifies INFORMATIONAL, ANALYTICAL, and CONVERSATIONAL intents and enforces formatting without overfitting", async () => {
  const {
    ADAPTIVE_SYSTEM_INSTRUCTION,
    CORE_PRINCIPLE_SYSTEM_INSTRUCTION,
    INTENT_STRUCTURED_OUTPUT_SCHEMA,
    classifyUserQueryIntent,
    parseIntentBasedModelOutput,
  } = await import("./geminiAgentConfig");

  // 1. Verify simplified systemInstruction and responseSchema ({ "intent": "string", "response_text": "string" })
  assert.equal(
    ADAPTIVE_SYSTEM_INSTRUCTION.includes(CORE_PRINCIPLE_SYSTEM_INSTRUCTION),
    true
  );
  assert.equal(
    Boolean(INTENT_STRUCTURED_OUTPUT_SCHEMA.properties?.intent),
    true
  );
  assert.equal(
    Boolean(INTENT_STRUCTURED_OUTPUT_SCHEMA.properties?.response_text),
    true
  );
  assert.deepEqual(INTENT_STRUCTURED_OUTPUT_SCHEMA.required, [
    "intent",
    "response_text",
  ]);

  // 2. Verify intent classification into INFORMATIONAL, ANALYTICAL, and CONVERSATIONAL
  const infoIntent = classifyUserQueryIntent([
    { role: "user", content: "Apa padanan atau ekuivalen Django di ekosistem JavaScript?" },
  ]);
  assert.equal(infoIntent.intentCategory, "INFORMATIONAL");

  const analyticalIntent = classifyUserQueryIntent([
    { role: "user", content: "Sekarang bandingkan keduanya dalam tabel" },
  ]);
  assert.equal(analyticalIntent.intentCategory, "ANALYTICAL");

  const conversationalIntent = classifyUserQueryIntent([
    { role: "user", content: "Menurutmu sebaiknya saya pilih yang mana untuk proyek baru?" },
  ]);
  assert.equal(conversationalIntent.intentCategory, "CONVERSATIONAL");

  // 3. Verify Structured Output JSON parsing ({ "intent": "...", "response_text": "..." }) & unrequested table stripping
  const parsedStructuredJson = parseIntentBasedModelOutput(
    JSON.stringify({
      intent: "INFORMATIONAL",
      response_text:
        "Django adalah framework web Python berarsitektur MVT yang mempermudah pembuatan aplikasi backend skala besar.",
    }),
    "INFORMATIONAL"
  );
  assert.equal(parsedStructuredJson.intent, "INFORMATIONAL");
  assert.equal(
    parsedStructuredJson.response_text.includes(
      "Django adalah framework web Python"
    ),
    true
  );
  assert.equal(
    parsedStructuredJson.reply,
    parsedStructuredJson.response_text
  );

  // 4. Turn 1 (Django) -> Turn 2 ("Apa padanan Django di JavaScript?") must return narrative paragraph ONLY (NO table!)
  const equivalenceHistory = [
    { role: "user" as const, content: "Jelaskan tentang Django di Python" },
    {
      role: "model" as const,
      content:
        "Django adalah high-level web framework berbasis Python dengan pola arsitektur MVT (Model-View-Template).",
    },
    {
      role: "user" as const,
      content: "Apa padanan atau ekuivalen Django di ekosistem JavaScript?",
    },
  ];
  const equivalenceReply = generateLocalExpertResponse(
    equivalenceHistory,
    getModelOption("auto"),
    []
  );
  assert.equal(equivalenceReply.includes("Next.js"), true);
  assert.equal(
    equivalenceReply.includes("|"),
    false,
    "INFORMATIONAL ('padanan'/'ekuivalen') query must ONLY return narrative paragraphs, NEVER a Markdown table"
  );

  // 5. Turn 3 ("Sekarang bandingkan keduanya dalam tabel") triggers ANALYTICAL comparison table
  const onDemandTableHistory = [
    ...equivalenceHistory,
    { role: "model" as const, content: equivalenceReply },
    { role: "user" as const, content: "Sekarang bandingkan keduanya dalam tabel" },
  ];
  const onDemandTableReply = generateLocalExpertResponse(
    onDemandTableHistory,
    getModelOption("auto"),
    []
  );
  assert.equal(
    onDemandTableReply.includes("| Aspek Arsitektur & Teknis | Django (Python) | Next.js (React / TypeScript / Node.js) |"),
    true,
    "ANALYTICAL 'bandingkan ... dalam tabel' command must output the comparison table"
  );

  // 6. Turn 4 (CONVERSATIONAL follow-up after table) flows naturally without repeating the table
  const postTableFollowUpHistory = [
    ...onDemandTableHistory,
    { role: "model" as const, content: onDemandTableReply },
    { role: "user" as const, content: "Jadi sebaiknya saya pakai yang mana untuk proyek baru?" },
  ];
  const postTableFollowUpReply = generateLocalExpertResponse(
    postTableFollowUpHistory,
    getModelOption("auto"),
    []
  );
  assert.equal(
    postTableFollowUpReply.includes("| Aspek Arsitektur & Teknis |"),
    false,
    "CONVERSATIONAL follow-up must flow naturally without repeating the comparison table"
  );
});

test("Targeted Patch: Dynamic 'Terapkan ke Formulator' sync, Ingredient Categorization (no false 51% warning), Real-Time Google Search present context, and Orphan Asterisk cleanup", async () => {
  const {
    extractFormulationFromText,
    classifyIngredientCategory,
    evaluateFormulatorCopilot,
  } = await import("./interactiveAiEngine");
  const {
    getSystemInstructionForUiModel,
    REALTIME_SEARCH_GROUNDING_RULE,
  } = await import("./geminiAgentConfig");
  const {
    cleanComputerArtifacts,
    stripOrphanAsterisksInLine,
  } = await import("../components/FormattedChatText");

  // 1. Dynamic extraction from Sensitive Skin Low-Surfactant Cleanser AI recipe
  const aiSensitiveCleanserRecipe = `
### Gentle Cleanser Low-Surfactant
Berikut adalah draf resep pembersih wajah lembut untuk **kulit sensitif** yang mengangkat kotoran dan sebum berlebih tanpa merusak skin barrier:

Komposisi Teoretis (w/w %):**
Fase Air:*
- **Distilled Water (Aqua):** ad 100% (Pelarut utama)
- **Glycerin:** 3-5% (Humektan penahan kelembapan)
- **Panthenol:** 0.5-1% (Bahan aktif penenang kemerahan)

Fase Surfaktan Lembut:*
- **Decyl Glucoside:** 10-15% (Surfaktan non-ionik ultra-lembut)
- **Cocamidopropyl Betaine:** 3-5% (Co-surfaktan amfoterik)

Fase Pengawet:*
- **Phenoxyethanol:** 0.5-1%

Parameter Fisikokimia:
- Rentang pH target: pH 5.0 - 5.5
- Viskositas target: 2.500 - 4.000 cPs
`;

  const draft = extractFormulationFromText(
    aiSensitiveCleanserRecipe,
    "Buatkan resep facial wash untuk kulit sensitif"
  );

  // Skin target must be Sensitive (NOT Acne-Prone despite mentioning "sebum")
  assert.equal(draft.skinTarget, "Sensitive");
  assert.equal(draft.primarySkinTarget, "Sensitive");
  assert.equal(draft.productType, "Gentle Cleanser Low-Surfactant");
  assert.equal(draft.targetPh, "5.0 - 5.5");
  assert.equal(draft.targetViscosity, "2.500 - 4.000 cPs");

  // Verify extracted ingredients and their exact ranges
  assert.equal(
    draft.customIngredients.some((i) => i.includes("Distilled Water")),
    true
  );
  assert.equal(
    draft.customIngredients.some((i) => i === "Glycerin 3-5%"),
    true
  );
  assert.equal(
    draft.customIngredients.some((i) => i === "Panthenol 0.5-1%"),
    true
  );
  assert.equal(
    draft.customIngredients.some((i) => i === "Decyl Glucoside 10-15%"),
    true
  );
  assert.equal(
    draft.customIngredients.some((i) => i === "Cocamidopropyl Betaine 3-5%"),
    true
  );

  // 2. Verify accurate category separation and NO false 51% active overload alert
  assert.equal(classifyIngredientCategory("Distilled Water"), "Air/Pelarut");
  assert.equal(classifyIngredientCategory("Decyl Glucoside"), "Surfaktan");
  assert.equal(classifyIngredientCategory("Cocamidopropyl Betaine"), "Surfaktan");
  assert.equal(classifyIngredientCategory("Glycerin"), "Humektan");
  assert.equal(classifyIngredientCategory("Panthenol"), "Bahan Aktif");
  assert.equal(classifyIngredientCategory("Phenoxyethanol"), "Pengawet");

  const copilotEval = evaluateFormulatorCopilot({
    productType: draft.productType,
    skinTarget: draft.skinTarget,
    targetPh: draft.targetPh,
    targetViscosity: draft.targetViscosity,
    batchSize: "100",
    customIngredients: draft.customIngredients,
  });

  // Only Panthenol (0.5-1% -> midpoint 0.75%) is counted as Bahan Aktif
  assert.equal(copilotEval.totalActivePercent, 0.75);
  assert.equal(copilotEval.estimatedBasePercent, 99.25);
  assert.equal(copilotEval.status, "optimal");
  assert.equal(
    copilotEval.alerts.some((a) =>
      a.title.includes("Konsentrasi Bahan Tambahan Tinggi")
    ),
    false,
    "Must NEVER trigger false 'Konsentrasi Bahan Tambahan Tinggi (51% w/w)' warning on surfactants/humectants/water"
  );

  // 3. Verify Real-Time Google Search present context in systemInstruction
  const sysInstr = getSystemInstructionForUiModel("gemini-3.8-pro");
  assert.equal(sysInstr.includes(REALTIME_SEARCH_GROUNDING_RULE), true);
  assert.equal(sysInstr.includes("Konteks Waktu Saat Ini (Present):"), true);

  // 4. Verify Orphan Asterisk cleanup in FormattedChatText
  assert.equal(
    stripOrphanAsterisksInLine("Komposisi Teoretis (w/w %):**"),
    "Komposisi Teoretis (w/w %):"
  );
  assert.equal(stripOrphanAsterisksInLine("Fase Air:*"), "Fase Air:");
  assert.equal(
    stripOrphanAsterisksInLine("- * Distilled Water 75%"),
    "- Distilled Water 75%"
  );
  // Ensure normal **bold** and *italic* are preserved intact
  assert.equal(
    stripOrphanAsterisksInLine("**Komposisi Teoretis (w/w %):** *Fase Air*"),
    "**Komposisi Teoretis (w/w %):** *Fase Air*"
  );
  const cleanedFull = cleanComputerArtifacts(aiSensitiveCleanserRecipe);
  assert.equal(cleanedFull.includes("Komposisi Teoretis (w/w %):**"), false);
  assert.equal(cleanedFull.includes("Fase Air:*"), false);
  assert.equal(cleanedFull.includes("Komposisi Teoretis (w/w %):"), true);
  assert.equal(cleanedFull.includes("Fase Air:"), true);
});
