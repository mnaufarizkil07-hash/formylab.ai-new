import {
  INGREDIENT_PROFILES,
  VALIDATED_PRODUCT_TYPES,
  getProductTypeSpec,
} from "./cosmeticChemistryData";
import { ChatAttachment } from "./chatStorage";

export type AiPillarId =
  | "generative"
  | "analytical"
  | "interactive"
  | "vision";

export interface AiPillarInfo {
  id: AiPillarId;
  name: string;
  shortLabel: string;
  indonesianTitle: string;
  description: string;
}

export const FOUR_AI_PILLARS: Record<AiPillarId, AiPillarInfo> = {
  generative: {
    id: "generative",
    name: "Generative AI",
    shortLabel: "Generative",
    indonesianTitle: "AI Pembuat Konten & Formula",
    description:
      "Merancang formula baru, menyusun SOP, kode, resep, dan menjawab topik apa pun secara kreatif.",
  },
  analytical: {
    id: "analytical",
    name: "Analytical AI",
    shortLabel: "Analytical",
    indonesianTitle: "AI Analitis & Kuantitatif",
    description:
      "Memeriksa data skala besar, menghitung HLB, pH, viskositas cPs, neraca massa 100%, dan tren biaya HPP.",
  },
  interactive: {
    id: "interactive",
    name: "Interactive AI",
    shortLabel: "Interactive",
    indonesianTitle: "AI Interaktif & Asisten Suara",
    description:
      "Komunikasi dua arah otomatis dengan suara natural Indonesia, kalkulator live, dan aksi langsung ke Formulator.",
  },
  vision: {
    id: "vision",
    name: "Computer Vision",
    shortLabel: "Vision",
    indonesianTitle: "AI Penglihatan & Inspeksi Visual",
    description:
      "Melihat, mengenali, dan mengidentifikasi foto label INCI, kemasan produk, tekstur emulsi, dan dokumen COA.",
  },
};

export interface FormylabAiModule {
  id: string;
  name: string;
  fungsi: string;
  samplePrompt: string;
}

/**
 * 9 Core AI Modules of Formylab.ai (English titles + Indonesian descriptions)
 */
export const FORMYLAB_AI_MODULES: FormylabAiModule[] = [
  {
    id: "brief-interpreter",
    name: "Brief interpreter",
    fungsi: "Mengubah permintaan klien jadi spesifikasi teknis",
    samplePrompt:
      "[Brief Interpreter] Klien meminta pelembap wajah ringan untuk kulit sensitif & kemerahan di iklim tropis dengan budget HPP terjangkau. Ubah brief ini menjadi spesifikasi teknis R&D lengkap (Target pH, Viskositas cPs, HLB, dan bahan aktif).",
  },
  {
    id: "formula-generator",
    name: "Formula generator",
    fungsi: "Menyusun formula dan metode pembuatan",
    samplePrompt:
      "[Formula Generator] Susun formula lengkap 100% w/w (Fase A, B, C, D) beserta metode pembuatan (suhu °C & RPM homogenizer) untuk Barrier Moisturizer Niacinamide 4% + Ceramide NP.",
  },
  {
    id: "regulatory-checker",
    name: "Regulatory checker",
    fungsi: "Mengecek bahan dilarang, batas konsentrasi, dan klaim",
    samplePrompt:
      "[Regulatory Checker] Cek batas konsentrasi maksimum BPOM/ASEAN Cosmetic Directive dan keamanan klaim untuk kombinasi Salicylic Acid 2%, Phenoxyethanol 0.8%, dan Alpha Arbutin 2%.",
  },
  {
    id: "halal-checker",
    name: "Halal checker",
    fungsi: "Mengecek status bahan dan memberi alternatif",
    samplePrompt:
      "[Halal Checker] Cek titik kritis kehalalan bahan Glycerin, Cetyl Alcohol, Stearic Acid, dan Collagen, serta berikan alternatif bahan nabati bersertifikat Halal.",
  },
  {
    id: "compatibility-checker",
    name: "Compatibility checker",
    fungsi: "Memprediksi risiko interaksi dan stabilitas",
    samplePrompt:
      "[Compatibility Checker] Prediksi risiko interaksi kimia dan stabilitas pH/emulsi jika Niacinamide 5% digabungkan dengan Glycolic Acid (AHA) 5% dalam satu sediaan.",
  },
  {
    id: "inventory-cost-optimizer",
    name: "Inventory & cost optimizer",
    fungsi: "Mencocokkan dengan stok dan budget, menghitung HPP",
    samplePrompt:
      "[Inventory & Cost Optimizer] Hitung estimasi HPP bahan baku (BOM) untuk batch 1.000 gram krim pelembap menggunakan bahan yang tersedia di supplier.csv agar efisien secara budget.",
  },
  {
    id: "substitution-engine",
    name: "Substitution engine",
    fungsi: "Memberi opsi pengganti beserta catatan trade-off",
    samplePrompt:
      "[Substitution Engine] Berikan opsi bahan pengganti (substitusi) untuk Paraben dan Fragrance sintetis beserta catatan trade-off terhadap stabilitas, sensorik, dan biaya.",
  },
  {
    id: "trial-planner",
    name: "Trial planner",
    fungsi: "Merancang jumlah dan jenis percobaan",
    samplePrompt:
      "[Trial Planner] Rancang matriks jumlah dan jenis percobaan skala lab (variasi konsentrasi emulgator & pengental) serta protokol uji stabilitas dipercepat untuk emulsi O/W.",
  },
  {
    id: "learning-loop",
    name: "Learning loop",
    fungsi: "Belajar dari hasil lab tiap proyek",
    samplePrompt:
      "[Learning Loop] Hasil trial lab batch ke-1 menunjukkan viskositas krim turun dari 10.000 cPs menjadi 4.200 cPs setelah penambahan elektrolit/ekstrak. Analisis penyebabnya dan perbaiki parameter untuk iterasi batch ke-2.",
  },
];

export interface WorkflowStage {
  tahap: string;
  title: string;
  subtitle: string;
  bullets: string[];
  targetRoute: string;
  routeLabel: string;
}

/**
 * End-to-End AI Skincare Formulation Co-Pilot Workflow (English titles + Indonesian descriptions)
 */
export const WORKFLOW_TAHAPAN_FORMYLAB: WorkflowStage[] = [
  {
    tahap: "Step 01",
    title: "Internal AI Brain Setup",
    subtitle: "Maklon mengisi database internal laboratorium & gudang bahan baku:",
    bullets: [
      "Daftar bahan baku yang dimiliki: stok gudang, harga/gram, supplier, spesifikasi teknis, dan status halal beserta sertifikatnya.",
      "Budget R&D per proyek atau per bulan.",
      "Formula lama (legacy formulas) dan hasil uji laboratorium sebelumnya.",
    ],
    targetRoute: "/library",
    routeLabel: "Buka Database Bahan & Stok",
  },
  {
    tahap: "Step 02",
    title: "Brand Client Brief Input",
    subtitle: "Tim R&D maklon memasukkan permintaan produk dari klien brand:",
    bullets: [
      "Jenis produk (serum, moisturizer, sunscreen, cleanser, dll.) & Klaim/tujuan (mencerahkan, anti-acne, barrier repair).",
      "Target kulit dan tekstur yang diinginkan.",
      "Target HPP dan budget percobaan R&D.",
      "Wajib halal atau tidak, serta Target Deadline dan MOQ.",
    ],
    targetRoute: "/formulate",
    routeLabel: "Input Brief di Formulator",
  },
  {
    tahap: "Step 03",
    title: "Brief to Technical Specs (Brief Interpreter)",
    subtitle: "AI menerjemahkan bahasa marketing klien menjadi bahasa formulator:",
    bullets: [
      "Mengubah 'Serum brightening ringan' menjadi tipe sediaan gel-serum, kisaran pH tertentu, kandidat bahan aktif (Niacinamide, Alpha Arbutin, dll.), dan target viskositas cPs.",
      "Kalau brief kurang jelas, AI bertanya balik sebelum lanjut meracik.",
    ],
    targetRoute: "/chat",
    routeLabel: "Konsultasi Brief ke AI Co-Pilot",
  },
  {
    tahap: "Step 04",
    title: "Initial Formula Generation (Formula Generator)",
    subtitle: "AI menyusun draft formula terstruktur siap timbang:",
    bullets: [
      "Bahan aktif dan rentang konsentrasi efektif (% w/w).",
      "Eksipien lengkap (pelarut, pengental, emulsifier, humektan, pengawet, pengatur pH).",
      "Urutan dan metode pembuatan (fase air, fase minyak, suhu °C, kapan bahan sensitif ditambahkan).",
    ],
    targetRoute: "/formulate",
    routeLabel: "Susun Formula Awal",
  },
  {
    tahap: "Step 05",
    title: "Multi-Layered Screening — 5 Core Filters",
    subtitle: "Draft formula langsung disaring lewat 5 pengecek otomatis:",
    bullets: [
      "1. Regulasi: Cek bahan dilarang/dibatasi, batas konsentrasi maksimum BPOM/ASEAN, dan kewajaran klaim kosmetik (bukan klaim obat).",
      "2. Kompatibilitas & Stabilitas: Deteksi bahan yang saling bentrok (pH tidak cocok antara aktif & pengawet, atau kombinasi yang mengiritasi/rusak).",
      "3. Halal: Cek status tiap bahan; bila meragukan (turunan hewani, alkohol, gliserin tak jelas), AI menawarkan alternatif Halal.",
      "4. Stok & 5. Biaya: Cek bahan yang ready di gudang vs harus dipesan (lead time), serta hitung HPP per kg/unit dan biaya total percobaan.",
    ],
    targetRoute: "/result",
    routeLabel: "Lihat Hasil 5 Pengecekan Berlapis",
  },
  {
    tahap: "Step 06",
    title: "Tiered Outputs (Formula A, B, C + Trade-offs)",
    subtitle: "AI memberikan 3 opsi terukur beserta catatan trade-off substitusi:",
    bullets: [
      "Formula A (Ideal): Performa terbaik, tanpa kompromi bahan.",
      "Formula B (Hemat / Halal): Substitusi bahan untuk menekan biaya HPP atau memenuhi syarat Halal.",
      "Formula C (Stok Tersedia): Pakai bahan yang sudah ada di gudang maklon, bisa langsung dicoba hari ini.",
      "Catatan Trade-off & Sumber: Misal dampak pengganti terhadap kelembapan, kelengketan tekstur, atau prediksi shelf-life.",
    ],
    targetRoute: "/result",
    routeLabel: "Bandingkan Formula A, B & C",
  },
  {
    tahap: "Step 07",
    title: "Lab Trial Strategy (Trial Planner)",
    subtitle: "Menjawab langsung masalah trial-and-error di laboratorium:",
    bullets: [
      "Menyarankan berapa batch yang perlu dibuat sesuai budget percobaan.",
      "Variabel apa yang diubah dulu (misalnya konsentrasi thickener atau pH).",
      "Protokol uji wajib: Organoleptik, pH, Viskositas Brookfield, Stabilitas Dipercepat (Cycling/45°C), dan Uji Mikroba.",
    ],
    targetRoute: "/result",
    routeLabel: "Buka Rencana Percobaan Lab",
  },
  {
    tahap: "Step 08",
    title: "Lab Result Logging, Remediation & Learning Loop",
    subtitle: "Tim R&D meracik, mencatat hasil, dan AI belajar dari tiap proyek:",
    bullets: [
      "Hasil lab diinput ke sistem (berhasil atau gagal, misal pecah emulsi, warna berubah, tekstur tidak sesuai).",
      "AI menganalisis kegagalan dan menyarankan perbaikan spesifik untuk batch berikutnya.",
      "Disimpan sebagai Knowledge Base internal maklon agar rekomendasi makin pas dengan stok bahan & mesin pabrik.",
    ],
    targetRoute: "/result",
    routeLabel: "Input Hasil Lab & Learning Loop",
  },
  {
    tahap: "Step 09",
    title: "Final Documentation (Formula Sheet, BPOM & Halal)",
    subtitle: "Ketika formula final disetujui untuk produksi:",
    bullets: [
      "Draft Formula Sheet & Bill of Materials (BOM) siap produksi.",
      "Ringkasan data pendukung untuk Notifikasi BPOM (DIP).",
      "Checklist dokumen Halal (SJPH BPJPH / LPPOM MUI) dari tiap supplier bahan.",
    ],
    targetRoute: "/result",
    routeLabel: "Ekspor Dokumentasi Final",
  },
];


export interface ExtractedFormulationDraft {
  productType: string;
  skinTarget: string;
  targetPh: string;
  targetViscosity: string;
  batchSize: string;
  customIngredients: string[];
  summaryLabel: string;
}

export interface CopilotAlert {
  level: "optimal" | "warning" | "critical";
  title: string;
  detail: string;
}

export interface FormulatorCopilotEvaluation {
  status: "optimal" | "warning" | "critical";
  statusLabel: string;
  totalActivePercent: number;
  estimatedBasePercent: number;
  phCompatibility: string;
  synergiesFound: string[];
  alerts: CopilotAlert[];
  spokenSummaryId: string;
}

/**
 * Detects which of the 4 AI Pillars are active in a given message exchange.
 * Interactive & Generative are always active; Analytical activates on math/data/parameters;
 * Computer Vision activates on image attachments or visual inspection prompts.
 */
export function detectActiveAiPillars(
  content: string,
  attachments?: ChatAttachment[]
): AiPillarInfo[] {
  const lower = (content || "").toLowerCase();
  const activeIds = new Set<AiPillarId>(["interactive", "generative"]);

  const hasImageAttachment = Boolean(
    attachments?.some((a) => a.mimeType?.startsWith("image/"))
  );
  const hasFileAttachment = Boolean(attachments && attachments.length > 0);

  if (
    hasImageAttachment ||
    /\b(foto|gambar|kamera|visual|lihat|identifikasi|kemasan|label\s+inci|mikroskop|vision|warna|tekstur)\b/.test(
      lower
    )
  ) {
    activeIds.add("vision");
  }

  if (
    hasFileAttachment ||
    /\b(hlb|ph|viskositas|cps|persen|%|gram|kg|hpp|bom|biaya|kalkulasi|hitung|analisis|data|rasio|rumus|formula|fase\s+a|100%)\b/.test(
      lower
    ) ||
    /\d+(\.\d+)?\s*%/.test(content)
  ) {
    activeIds.add("analytical");
  }

  const ordered: AiPillarId[] = [
    "interactive",
    "generative",
    "analytical",
    "vision",
  ];
  return ordered
    .filter((id) => activeIds.has(id))
    .map((id) => FOUR_AI_PILLARS[id]);
}

/**
 * Cleans markdown and technical notation into fluent Indonesian speech text
 * for the Web Speech API (window.speechSynthesis).
 */
export function cleanMarkdownForSpeech(markdown: string): string {
  if (!markdown) return "";

  const cleaned = markdown
    // Remove code blocks
    .replace(/```[\s\S]*?```/g, " Berikut adalah rincian data teknisnya. ")
    // Remove LaTeX blocks
    .replace(/\$\$[\s\S]*?\$\$/g, " ")
    .replace(/\$([^$]+)\$/g, "$1")
    // Remove URLs and reference section at the very bottom so TTS doesn't read raw links
    .replace(/###\s*🌐\s*(?:Sumber|Referensi)[\s\S]*$/i, "")
    .replace(/https?:\/\/\S+/g, "")
    // Remove model badge parentheticals so TTS doesn't read "(GPT-6 Luna)" at the start
    .replace(/\((?:GPT-6\s*Luna|GPT-6\s*Omni|Gemini\s*3\.8\s*Flash|Gemini\s*3\.8\s*Pro|Auto\s*Smart\s*Router)\)/gi, "")
    // Remove markdown headers, bold, italics, backticks, horizontal rules
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^---+$/gm, " ")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    // Remove decorative emojis that TTS reads awkwardly
    .replace(/[⚡🧪🔬🌐✨📚🎤📎📄🗑️✎✓✕⚠️💡📷🔊📊📋🔍🟢🟣]/g, " ")
    // Expand scientific units & Indonesian R&D abbreviations into natural spoken Indonesian
    .replace(/(\d+(?:[.,]\d+)?)\s*%\s*w\/w/gi, "$1 persen berat ")
    .replace(/(\d+(?:[.,]\d+)?)\s*%/g, "$1 persen ")
    .replace(/\bcPs\b/g, "centipoise")
    .replace(/°C/g, " derajat Celcius")
    .replace(/\bO\/W\b/g, "oil in water")
    .replace(/\bW\/O\b/g, "water in oil")
    .replace(/\bw\/w\b/gi, "berat per berat")
    .replace(/\bRp\s*(\d)/gi, "Rupiah $1")
    .replace(/\bBPOM\b/g, "B POM")
    .replace(/\bMUI\b/g, "M U I")
    .replace(/\bBPJPH\b/g, "B P J P H")
    .replace(/\bHPP\b/g, "H P P")
    .replace(/\bMOQ\b/g, "M O Q")
    .replace(/\bHLB\b/g, "H L B")
    .replace(/\bR&D\b/g, "riset dan pengembangan")
    .replace(/\bGlobal Benchmark\b/gi, "Rujukan Global")
    .replace(/\bIndonesia Benchmark\b/gi, "Rujukan Indonesia")
    .replace(/\bFacial Moisturizer\s*\(Cream\)/gi, "Krim Pelembap Wajah")
    .replace(/\bSensitive\s*&\s*Redness\b/gi, "Kulit Sensitif dan Kemerahan")
    .replace(/\bAcne-Prone\b/gi, "Kulit Rentan Berjerawat")
    .replace(/\bDry\s*&\s*Dehydrated\b/gi, "Kulit Kering dan Dehidrasi")
    .replace(/\bMature\s*\/\s*Anti-Aging\b/gi, "Kulit Dewasa dan Anti Penuaan")
    .replace(/\bAll Skin Types\b/gi, "Semua Jenis Kulit")
    .replace(/\bSoothing\s*&\s*Calming Gel\b/gi, "Gel Penenang Kulit")
    .replace(/\bAnti-Aging Peptide Serum\b/gi, "Serum Peptida Anti Penuaan")
    .replace(/\bBrightening Essence Lotion\b/gi, "Losion Esens Pencerah")
    .replace(/\bAcne Control BHA\/Azelaic Fluid\b/gi, "Fluid Kontrol Jerawat")
    // Normalize bullet points into natural sentence pauses
    .replace(/^\s*[-*•]\s+/gm, ". ")
    .replace(/\n+/g, ". ")
    .replace(/\s+/g, " ")
    .replace(/\.\s*\./g, ".")
    .trim();

  if (cleaned.length > 1100) {
    const cut = cleaned.slice(0, 1100);
    const lastPeriod = cut.lastIndexOf(".");
    return lastPeriod > 250 ? cut.slice(0, lastPeriod + 1) : `${cut}.`;
  }
  return cleaned;
}

/**
 * Extracts a structured formulation draft (Product Type, Skin Target, pH, Viscosity, Active Ingredients)
 * from any AI message or conversation text so the user can transfer it to /formulate in 1 click.
 */
export function extractFormulationFromText(
  text: string
): ExtractedFormulationDraft {
  const lower = (text || "").toLowerCase();

  // 1. Detect Product Type
  let matchedProduct = VALIDATED_PRODUCT_TYPES[0];
  const productRules: Array<{ keywords: string[]; id: string }> = [
    { keywords: ["sunscreen", "tabir surya", "spf", "uv"], id: "sunscreen-lotion" },
    { keywords: ["cleanser", "facial wash", "sabun", "pembersih"], id: "gentle-cleanser" },
    { keywords: ["toner", "essence toner", "hydrating toner"], id: "microbiome-hydrating-toner-essence" },
    { keywords: ["eye cream", "krim mata", "mata"], id: "eye-contour-peptide-cream" },
    { keywords: ["sleeping mask", "overnight mask", "masker tidur"], id: "ceramide-sleeping-mask" },
    { keywords: ["exfoliat", "eksfoliasi", "aha", "peeling", "resurfacing"], id: "aha-exfoliating-resurfacing-gel" },
    { keywords: ["acne", "jerawat", "bha", "salicylic", "komedo"], id: "acne-clarifying-fluid" },
    { keywords: ["brightening", "mencerahkan", "kusam", "flek", "arbutin"], id: "brightening-essence-lotion" },
    { keywords: ["serum", "anti-aging", "anti aging", "kerutan", "peptide", "bakuchiol"], id: "anti-aging-serum" },
    { keywords: ["soothing gel", "calming gel", "aloe", "gel"], id: "soothing-gel" },
    { keywords: ["moisturizer", "pelembap", "cream", "krim", "rosacea", "barrier"], id: "facial-moisturizer-cream" },
  ];

  for (const rule of productRules) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      const found = VALIDATED_PRODUCT_TYPES.find((p) => p.id === rule.id);
      if (found) {
        matchedProduct = found;
        break;
      }
    }
  }

  // 2. Detect Skin Target
  let skinTarget = "Sensitive & Redness";
  if (/\b(acne|jerawat|komedo|berminyak|sebum|bha)\b/.test(lower)) {
    skinTarget = "Acne-Prone";
  } else if (/\b(aging|kerutan|penuaan|fine lines|retinol|bakuchiol|peptide)\b/.test(lower)) {
    skinTarget = "Aging & Fine Lines";
  } else if (/\b(brightening|kusam|flek|cerah|arbutin|vitamin c|tranexamic)\b/.test(lower)) {
    skinTarget = "Dullness & Uneven Tone";
  } else if (/\b(kering|dehidrasi|dry|hyaluronic|squalane|shea)\b/.test(lower)) {
    skinTarget = "Dry & Dehydrated";
  }

  // 3. Detect pH from text or fallback to matchedProduct.targetPh
  let targetPh = matchedProduct.targetPh;
  const phMatch = text.match(/\bpH\s*(?:ideal|target|optimal|:)?\s*(\d+(?:[.,]\d+)?)/i);
  if (phMatch) {
    const parsedPh = parseFloat(phMatch[1].replace(",", "."));
    if (parsedPh >= 3.2 && parsedPh <= 8.0) {
      targetPh = parsedPh.toFixed(1);
    }
  }

  // 4. Detect Viscosity or fallback to matchedProduct.targetViscosity
  let targetViscosity = matchedProduct.targetViscosity;
  const viscMatch = text.match(
    /(\d{1,3}(?:[.,]\d{3})*\s*[–-]\s*\d{1,3}(?:[.,]\d{3})*\s*cPs)/i
  );
  if (viscMatch) {
    targetViscosity = viscMatch[1].replace(/\./g, ",");
  }

  // 5. Extract matching ingredients & percentages from text using strict word boundaries
  const extractedIngredients: string[] = [];
  for (const prof of Object.values(INGREDIENT_PROFILES)) {
    const shortName = prof.inciName.split("(")[0].trim();
    const keyWords = prof.key.replace(/_/g, " ").trim();
    const escapedShort = shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const escapedKey = keyWords.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const matchesShort =
      shortName.length >= 4 &&
      new RegExp(`\\b${escapedShort}\\b`, "i").test(lower);
    const matchesKey =
      keyWords.length >= 4 &&
      new RegExp(`\\b${escapedKey}\\b`, "i").test(lower);

    if (matchesShort || matchesKey) {
      // Look for a nearby percentage in the text
      const rateRegex = new RegExp(
        `${escapedShort}[^\\n\\d]{0,35}?(\\d+(?:[.,]\\d+)?)\\s*%`,
        "i"
      );
      const matchRate = text.match(rateRegex);
      const defaultPct =
        prof.typicalUsageRate.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || "2.0";
      const pct = matchRate ? matchRate[1].replace(",", ".") : defaultPct;
      extractedIngredients.push(`${shortName} ${pct}%`);
    }
  }

  const finalIngredients =
    extractedIngredients.length > 0
      ? extractedIngredients.slice(0, 5)
      : matchedProduct.recommendedActives.slice(0, 3).map((a) => a.name);

  return {
    productType: matchedProduct.name,
    skinTarget,
    targetPh,
    targetViscosity,
    batchSize: "100",
    customIngredients: finalIngredients,
    summaryLabel: `${matchedProduct.shortName} (pH ${targetPh} · ${finalIngredients.length} Bahan Aktif)`,
  };
}

/**
 * Interactive HLB Surfactant Blend Calculator
 * Given High-HLB surfactant (HLB_A), Low-HLB surfactant (HLB_B), Target Required HLB, and Total Emulsifier %
 */
export function calculateInteractiveHlb(params: {
  hlbHigh: number;
  hlbLow: number;
  targetHlb: number;
  totalEmulsifierPct: number;
}): {
  fractionHighPct: number;
  fractionLowPct: number;
  highDosagePct: number;
  lowDosagePct: number;
  achievedHlb: number;
  emulsionType: string;
} {
  const { hlbHigh, hlbLow, targetHlb, totalEmulsifierPct } = params;
  const span = Math.max(0.1, hlbHigh - hlbLow);
  const clampedTarget = Math.min(hlbHigh, Math.max(hlbLow, targetHlb));

  const fracHigh = (clampedTarget - hlbLow) / span;
  const fracLow = 1 - fracHigh;

  const fractionHighPct = Number((fracHigh * 100).toFixed(1));
  const fractionLowPct = Number((fracLow * 100).toFixed(1));

  const highDosagePct = Number((fracHigh * totalEmulsifierPct).toFixed(2));
  const lowDosagePct = Number((fracLow * totalEmulsifierPct).toFixed(2));
  const achievedHlb = Number(
    (fracHigh * hlbHigh + fracLow * hlbLow).toFixed(2)
  );

  const emulsionType =
    achievedHlb >= 8.0
      ? "O/W (Oil-in-Water Emulsion — Ringan & Mudah Meresap)"
      : "W/O (Water-in-Oil Emulsion — Oklusif & Tahan Air)";

  return {
    fractionHighPct,
    fractionLowPct,
    highDosagePct,
    lowDosagePct,
    achievedHlb,
    emulsionType,
  };
}

/**
 * Evaluates current /formulate inputs in real-time for the Interactive AI Co-pilot.
 */
export function evaluateFormulatorCopilot(params: {
  productType: string;
  skinTarget: string;
  targetPh: string;
  targetViscosity: string;
  batchSize: string;
  customIngredients: string[];
}): FormulatorCopilotEvaluation {
  const spec = getProductTypeSpec(params.productType);
  const phVal = parseFloat(params.targetPh || spec.targetPh);
  const [minPhStr, maxPhStr] = spec.validPhRange.split("–").map((s) => s.trim());
  const minPh = parseFloat(minPhStr || "4.5");
  const maxPh = parseFloat(maxPhStr || "6.5");

  let totalActivePercent = 0;
  const parsedNames: string[] = [];

  for (const item of params.customIngredients) {
    const pctMatch = item.match(/(\d+(?:[.,]\d+)?)\s*%/);
    if (pctMatch) {
      totalActivePercent += parseFloat(pctMatch[1].replace(",", "."));
    } else {
      totalActivePercent += 2.0;
    }
    parsedNames.push(item.replace(/\d+(?:[.,]\d+)?\s*%/g, "").trim().toLowerCase());
  }

  totalActivePercent = Number(totalActivePercent.toFixed(2));
  const estimatedBasePercent = Number(
    Math.max(0, 100 - totalActivePercent).toFixed(2)
  );

  const alerts: CopilotAlert[] = [];
  const synergiesFound: string[] = [];

  // Check pH range against calibrated spec
  if (Number.isFinite(phVal)) {
    if (phVal < minPh - 0.3 || phVal > maxPh + 0.3) {
      alerts.push({
        level: "critical",
        title: `Deviasi pH di Luar Rentang Kalibrasi (${spec.validPhRange})`,
        detail: `Target pH ${phVal.toFixed(2)} berisiko menurunkan stabilitas viskositas emulsi atau mengiritasi kulit pada sistem ${spec.shortName}. Rekomendasi: pH ${spec.targetPh}.`,
      });
    } else if (phVal < minPh || phVal > maxPh) {
      alerts.push({
        level: "warning",
        title: `pH Mendekati Batas Ambang (${spec.validPhRange})`,
        detail: `Target pH ${phVal.toFixed(2)} berada di tepi rentang optimal ${spec.shortName}. Siapkan larutan buffer Citric Acid / Tromethamine.`,
      });
    }
  }

  // Check Niacinamide + Low pH (< 4.5) hydrolysis risk
  const hasNiacinamide = parsedNames.some((n) => n.includes("niacinamide"));
  const hasAhaBha = parsedNames.some(
    (n) =>
      n.includes("glycolic") ||
      n.includes("lactic") ||
      n.includes("salicylic")
  );

  if (hasNiacinamide && Number.isFinite(phVal) && phVal < 4.5) {
    alerts.push({
      level: "critical",
      title: "Risiko Hidrolisis Niacinamide menjadi Nicotinic Acid (pH < 4.5)",
      detail:
        "Pada pH di bawah 4.5, Niacinamide dapat mengalami deamidasi menjadi asam nikotinat yang memicu kemerahan (flushing) pada kulit.",
    });
  }

  if (hasNiacinamide && hasAhaBha) {
    alerts.push({
      level: "warning",
      title: "Inkompatibilitas pH antara Niacinamide & Eksfolian Asam (AHA/BHA)",
      detail:
        "AHA/BHA membutuhkan pH 3.5–4.0 agar aktif, sedangkan Niacinamide stabil pada pH 5.5–6.5. Pisahkan sediaan atau gunakan buffer pH 4.8–5.0 dengan uji stabilitas dipercepat.",
    });
  }

  // Check total active load
  if (totalActivePercent > 35) {
    alerts.push({
      level: "warning",
      title: `Konsentrasi Bahan Tambahan Tinggi (${totalActivePercent}% w/w)`,
      detail:
        "Beban bahan aktif > 35% dapat menurunkan viskositas polimer Carbomer dan meningkatkan risiko kristalisasi atau rasa lengket.",
    });
  }

  // Check synergies
  if (
    hasNiacinamide &&
    parsedNames.some((n) => n.includes("ceramide") || n.includes("panthenol"))
  ) {
    synergiesFound.push(
      "Sinergi Biomimetik: Niacinamide + Ceramide/Panthenol mempercepat pemulihan stratum corneum hingga 2x lipat."
    );
  }
  if (
    parsedNames.some((n) => n.includes("centella") || n.includes("aloe")) &&
    parsedNames.some((n) => n.includes("panthenol") || n.includes("allantoin"))
  ) {
    synergiesFound.push(
      "Sinergi Anti-Eritema: Kombinasi Soothing Botanicals menekan sitokin inflamasi pada kulit sensitif."
    );
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "optimal",
      title: `Parameter Terkalibrasi Optimal untuk ${spec.shortName}`,
      detail: `Target pH ${
        params.targetPh || spec.targetPh
      } dan komposisi bahan aktif (${totalActivePercent}% w/w) selaras dengan matriks ${
        spec.systemType
      }.`,
    });
  }

  const hasCritical = alerts.some((a) => a.level === "critical");
  const hasWarning = alerts.some((a) => a.level === "warning");

  const status: "optimal" | "warning" | "critical" = hasCritical
    ? "critical"
    : hasWarning
      ? "warning"
      : "optimal";

  const statusLabel =
    status === "critical"
      ? "Perlu Koreksi Parameter"
      : status === "warning"
        ? "Perhatikan Catatan Stabilitas"
        : "Sistem Terkalibrasi Optimal";

  const spokenSummaryId = `Analisis Co-pilot Formulator untuk ${
    spec.name
  } target kulit ${params.skinTarget}. Status saat ini: ${statusLabel}. Target pH ${
    params.targetPh || spec.targetPh
  }, dengan total bahan aktif terpilih ${totalActivePercent} persen dan fase dasar ${estimatedBasePercent} persen. ${
    alerts[0]?.detail || ""
  } ${synergiesFound[0] || ""}`;

  return {
    status,
    statusLabel,
    totalActivePercent,
    estimatedBasePercent,
    phCompatibility: `Rentang Valid ${spec.validPhRange} (Target ${
      params.targetPh || spec.targetPh
    })`,
    synergiesFound,
    alerts,
    spokenSummaryId,
  };
}
