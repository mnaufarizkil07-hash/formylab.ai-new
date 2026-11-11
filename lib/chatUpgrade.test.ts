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
  shouldSearchLiveInternet,
  userExplicitlyAskedForSources,
} from "./webSearchEngine";
import {
  generateLocalExpertResponse,
  tryEvaluateMath,
} from "./aiFallbackEngine";
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

  const mathVerbal = tryEvaluateMath("berapa 12 dikali 5 brp", getModelOption("gpt-6-luna"));
  assert.ok(mathVerbal);
  assert.equal(mathVerbal?.includes("60"), true);

  // Should NOT treat cosmetic ingredient strings as math
  const cosmeticStr = tryEvaluateMath(
    "Buatkan formula serum dengan Niacinamide 4% + Panthenol 2%"
  );
  assert.equal(cosmeticStr, null);
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
