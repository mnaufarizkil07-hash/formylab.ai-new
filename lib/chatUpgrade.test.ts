import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanComputerArtifacts,
  parseSegmentIntoBlocks,
  isTableSeparatorLine,
} from "../components/FormattedChatText";
import {
  analyzeBriefCompleteness,
  userExplicitlyAskedForSources,
} from "./webSearchEngine";
import { generateLocalExpertResponse } from "./aiFallbackEngine";
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

test("cleanComputerArtifacts removes raw LaTeX and computer symbols", () => {
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
