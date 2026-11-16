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


export type IngredientFunctionalCategory =
  | "Air/Pelarut"
  | "Surfaktan"
  | "Humektan"
  | "Bahan Aktif"
  | "Pengawet"
  | "Base / Eksipien";

export interface ExtractedIngredientEntry {
  name: string;
  label: string;
  rangeOrPct: string;
  numericPercent: number;
  category: IngredientFunctionalCategory;
}

export interface ExtractedFormulationDraft {
  formulaName?: string;
  productType: string;
  primarySkinTarget?: string;
  skinTarget: string;
  desiredTexture?: string;
  targetPh: string;
  targetViscosity: string;
  batchSize: string;
  customIngredients: string[];
  extractedComposition?: ExtractedIngredientEntry[];
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
  surfactantPercent?: number;
  humectantPercent?: number;
  preservativePercent?: number;
  categorizedIngredients?: ExtractedIngredientEntry[];
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
 * Mengklasifikasikan bahan kosmetik secara akurat ke dalam 5+ kategori fungsional:
 * - "Air/Pelarut"
 * - "Surfaktan"
 * - "Humektan"
 * - "Bahan Aktif"
 * - "Pengawet"
 * - "Base / Eksipien"
 */
export function classifyIngredientCategory(
  rawName: string
): IngredientFunctionalCategory {
  const lower = (rawName || "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\d+(?:[.,]\d+)?\s*(?:[–—-]\s*\d+(?:[.,]\d+)?)?\s*%/g, " ")
    .trim();

  // 1. Air / Pelarut (Solvent / Carrier Water)
  if (
    /\b(distilled\s+water|deionized\s+water|purified\s+water|demineralized\s+water|aquadest|aqua|water|air\s+suling|air\s+demineralisasi|hydrosol|rose\s+water|pelarut)\b/i.test(
      lower
    )
  ) {
    return "Air/Pelarut";
  }

  // 2. Surfaktan (Surfactant / Cleansing Agent / Solubilizer)
  if (
    /\b(decyl\s+glucoside|lauryl\s+glucoside|coco[\s-]?glucoside|cocamidopropyl\s+betaine|capb|betaine|sodium\s+cocoyl\s+isethionate|sodium\s+lauroyl|disodium\s+laureth\s+sulfosuccinate|sulfosuccinate|sarcosinate|taurate|glutamate|cocoamphoacetate|cocoamphodiacetate|polysorbate|tween\s*\d*|peg-40|peg-6\s+caprylic|poloxamer|sodium\s+lauryl|sodium\s+laureth|surfaktan|surfactant)\b/i.test(
      lower
    )
  ) {
    return "Surfaktan";
  }

  // 3. Humektan (Humectant)
  if (
    /\b(glycerin|gliserin|glycerol|propylene\s+glycol|butylene\s+glycol|pentylene\s+glycol|propanediol|sorbitol|sodium\s+pca|diglycerin|methyl\s+gluceth|urea|humektan|humectant)\b/i.test(
      lower
    )
  ) {
    return "Humektan";
  }

  // 4. Pengawet (Preservative)
  if (
    /\b(phenoxyethanol|ethylhexylglycerin|sodium\s+benzoate|potassium\s+sorbate|chlorphenesin|benzyl\s+alcohol|dehydroacetic\s+acid|methylparaben|propylparaben|dmdm\s+hydantoin|caprylyl\s+glycol|hexanediol|pengawet|preservative)\b/i.test(
      lower
    )
  ) {
    return "Pengawet";
  }

  // 5. Base / Pengental / Emulgator / Emollient / Pengatur pH / Chelating Agent
  if (
    /\b(xanthan\s+gum|carbomer|carbopol|acrylates|acrylic\s+acid\s+copolymer|hydroxyethylcellulose|guar\s+gum|cellulose\s+gum|cetyl\s+alcohol|cetearyl\s+alcohol|stearyl\s+alcohol|stearic\s+acid|glyceryl\s+stearate|peg-100\s+stearate|ceteareth|olivem|dimethicone|dimethiconol|cyclopentasiloxane|mineral\s+oil|liquid\s+paraffin|almond\s+oil|jojoba\s+oil|shea\s+butter|beeswax|lanolin|caprylic\/capric|citric\s+acid|sodium\s+citrate|sodium\s+hydroxide|naoh|triethanolamine|tromethamine|disodium\s+edta|tetrasodium\s+edta|edta|sodium\s+phytate|sodium\s+chloride)\b/i.test(
      lower
    )
  ) {
    return "Base / Eksipien";
  }

  // 6. Bahan Aktif (Active Ingredients)
  return "Bahan Aktif";
}

/**
 * Mengekstrak nama bahan bersih, label persentase/rentang, nilai persentase numerik (midpoint jika rentang),
 * dan kategori fungsional dari satu string item bahan (mis. "Decyl Glucoside 10-15%" atau "Distilled Water (ad 100%)").
 */
export function parseCategorizedIngredientItem(
  rawItem: string
): ExtractedIngredientEntry {
  const cleanedRaw = (rawItem || "")
    .replace(/^\s*[-*•]\s*/, "")
    .replace(/\*\*/g, "")
    .trim();

  const isAd100 =
    /\b(?:q\.?s\.?|ad|to|hingga|sampai)\s*100\s*%/i.test(cleanedRaw) ||
    /\bq\.?s\.?\b/i.test(cleanedRaw);

  // Cek rentang persentase seperti "10-15%", "3 - 5%", "0.5-1%"
  const rangeMatch = cleanedRaw.match(
    /(\d+(?:[.,]\d+)?)\s*%?\s*(?:[–—-]|s\/d|sampai|hingga|to)\s*(\d+(?:[.,]\d+)?)\s*%/i
  );

  // Cek persentase tunggal seperti "4%", "0.8%"
  const singleMatch = !rangeMatch
    ? cleanedRaw.match(/(\d+(?:[.,]\d+)?)\s*%/)
    : null;

  let nameOnly = cleanedRaw
    .replace(
      /\(?(\d+(?:[.,]\d+)?)\s*%?\s*(?:[–—-]|s\/d|sampai|hingga|to)\s*(\d+(?:[.,]\d+)?)\s*%\s*(?:w\/w)?\)?/gi,
      ""
    )
    .replace(/\(?(\d+(?:[.,]\d+)?)\s*%\s*(?:w\/w)?\)?/gi, "")
    .replace(/\b(?:q\.?s\.?\s*(?:to|ad)?\s*100\s*%|ad\s*100\s*%|q\.?s\.?)\b/gi, "")
    .replace(/[:–—-]+$/, "")
    .replace(/\(\s*\)/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  if (!nameOnly) {
    nameOnly = cleanedRaw;
  }

  const category = classifyIngredientCategory(nameOnly);

  let rangeOrPct = "";
  let numericPercent = 0;

  if (isAd100 || (category === "Air/Pelarut" && !rangeMatch && !singleMatch)) {
    rangeOrPct = "ad 100%";
    numericPercent = 0;
  } else if (rangeMatch) {
    const minVal = parseFloat(rangeMatch[1].replace(",", "."));
    const maxVal = parseFloat(rangeMatch[2].replace(",", "."));
    rangeOrPct = `${rangeMatch[1].replace(",", ".")}-${rangeMatch[2].replace(",", ".")}%`;
    numericPercent = Number(((minVal + maxVal) / 2).toFixed(2));
  } else if (singleMatch) {
    const val = parseFloat(singleMatch[1].replace(",", "."));
    if (val >= 99 && category === "Air/Pelarut") {
      rangeOrPct = "ad 100%";
      numericPercent = 0;
    } else {
      rangeOrPct = `${singleMatch[1].replace(",", ".")}%`;
      numericPercent = Number(val.toFixed(2));
    }
  } else {
    if (category === "Air/Pelarut") {
      rangeOrPct = "ad 100%";
      numericPercent = 0;
    } else {
      rangeOrPct = "1.0%";
      numericPercent = 1.0;
    }
  }

  const label =
    rangeOrPct === "ad 100%"
      ? `${nameOnly} (ad 100%)`
      : `${nameOnly} ${rangeOrPct}`;

  return {
    name: nameOnly,
    label,
    rangeOrPct,
    numericPercent,
    category,
  };
}

const KNOWN_FORMULATION_INGREDIENTS: Array<{
  canonicalName: string;
  aliases: string[];
  defaultRate: string;
}> = [
  {
    canonicalName: "Distilled Water",
    aliases: [
      "distilled water",
      "deionized water",
      "purified water",
      "demineralized water",
      "aquadest",
      "aqua",
      "air suling",
      "air demineralisasi",
    ],
    defaultRate: "ad 100%",
  },
  {
    canonicalName: "Decyl Glucoside",
    aliases: ["decyl glucoside"],
    defaultRate: "10-15%",
  },
  {
    canonicalName: "Lauryl Glucoside",
    aliases: ["lauryl glucoside"],
    defaultRate: "5-10%",
  },
  {
    canonicalName: "Coco-Glucoside",
    aliases: ["coco-glucoside", "coco glucoside"],
    defaultRate: "5-8%",
  },
  {
    canonicalName: "Cocamidopropyl Betaine",
    aliases: ["cocamidopropyl betaine", "capb"],
    defaultRate: "3-5%",
  },
  {
    canonicalName: "Sodium Cocoyl Isethionate",
    aliases: ["sodium cocoyl isethionate", "sci"],
    defaultRate: "5-10%",
  },
  {
    canonicalName: "Sodium Lauroyl Methyl Isethionate",
    aliases: ["sodium lauroyl methyl isethionate", "slmi"],
    defaultRate: "5-8%",
  },
  {
    canonicalName: "Disodium Laureth Sulfosuccinate",
    aliases: ["disodium laureth sulfosuccinate"],
    defaultRate: "5-8%",
  },
  {
    canonicalName: "Sodium Cocoamphoacetate",
    aliases: ["sodium cocoamphoacetate"],
    defaultRate: "3-5%",
  },
  {
    canonicalName: "Glycerin",
    aliases: ["glycerin", "gliserin", "glycerol"],
    defaultRate: "3-5%",
  },
  {
    canonicalName: "Propylene Glycol",
    aliases: ["propylene glycol", "propilen glikol"],
    defaultRate: "2-4%",
  },
  {
    canonicalName: "Butylene Glycol",
    aliases: ["butylene glycol"],
    defaultRate: "2-4%",
  },
  {
    canonicalName: "Propanediol",
    aliases: ["propanediol", "1,3-propanediol"],
    defaultRate: "2-4%",
  },
  {
    canonicalName: "Pentylene Glycol",
    aliases: ["pentylene glycol"],
    defaultRate: "1-3%",
  },
  {
    canonicalName: "Sorbitol",
    aliases: ["sorbitol"],
    defaultRate: "2-3%",
  },
  {
    canonicalName: "Panthenol",
    aliases: ["panthenol", "d-panthenol", "provitamin b5", "pro-vitamin b5"],
    defaultRate: "0.5-1%",
  },
  {
    canonicalName: "Allantoin",
    aliases: ["allantoin"],
    defaultRate: "0.2-0.5%",
  },
  {
    canonicalName: "Bisabolol",
    aliases: ["bisabolol", "alpha-bisabolol"],
    defaultRate: "0.2-0.5%",
  },
  {
    canonicalName: "Centella Asiatica Extract",
    aliases: ["centella asiatica extract", "centella asiatica", "cica", "madecassoside"],
    defaultRate: "1-2%",
  },
  {
    canonicalName: "Aloe Vera Extract",
    aliases: ["aloe vera extract", "aloe barbadensis", "aloe vera"],
    defaultRate: "2%",
  },
  {
    canonicalName: "Ceramide NP",
    aliases: ["ceramide np", "ceramide"],
    defaultRate: "0.5-1%",
  },
  {
    canonicalName: "Niacinamide",
    aliases: ["niacinamide", "nicotinamide"],
    defaultRate: "4%",
  },
  {
    canonicalName: "Sodium Hyaluronate",
    aliases: ["sodium hyaluronate", "hyaluronic acid"],
    defaultRate: "0.5-1%",
  },
  {
    canonicalName: "Polyglutamic Acid",
    aliases: ["polyglutamic acid"],
    defaultRate: "0.5-1%",
  },
  {
    canonicalName: "Ectoin",
    aliases: ["ectoin"],
    defaultRate: "1%",
  },
  {
    canonicalName: "Squalane",
    aliases: ["squalane"],
    defaultRate: "2-3%",
  },
  {
    canonicalName: "Salicylic Acid",
    aliases: ["salicylic acid", "asam salisilat"],
    defaultRate: "1-2%",
  },
  {
    canonicalName: "Azelaic Acid",
    aliases: ["azelaic acid"],
    defaultRate: "5%",
  },
  {
    canonicalName: "Alpha Arbutin",
    aliases: ["alpha arbutin"],
    defaultRate: "2%",
  },
  {
    canonicalName: "Tranexamic Acid",
    aliases: ["tranexamic acid"],
    defaultRate: "2%",
  },
  {
    canonicalName: "3-O-Ethyl Ascorbic Acid",
    aliases: ["3-o-ethyl ascorbic acid", "ethyl ascorbic acid"],
    defaultRate: "2%",
  },
  {
    canonicalName: "Bakuchiol",
    aliases: ["bakuchiol"],
    defaultRate: "1%",
  },
  {
    canonicalName: "Palmitoyl Tripeptide-1",
    aliases: ["palmitoyl tripeptide-1", "palmitoyl tripeptide"],
    defaultRate: "2%",
  },
  {
    canonicalName: "Glycolic Acid",
    aliases: ["glycolic acid"],
    defaultRate: "5%",
  },
  {
    canonicalName: "Lactic Acid",
    aliases: ["lactic acid"],
    defaultRate: "0.5-2%",
  },
  {
    canonicalName: "Zinc Oxide",
    aliases: ["zinc oxide"],
    defaultRate: "10-12%",
  },
  {
    canonicalName: "Titanium Dioxide",
    aliases: ["titanium dioxide"],
    defaultRate: "4-6%",
  },
  {
    canonicalName: "Alpha Tocopherol",
    aliases: ["alpha tocopherol", "tocopherol", "tocopheryl acetate", "vitamin e"],
    defaultRate: "0.5%",
  },
  {
    canonicalName: "Xanthan Gum",
    aliases: ["xanthan gum"],
    defaultRate: "0.3-0.8%",
  },
  {
    canonicalName: "Carbopol ETD 2020",
    aliases: ["carbopol etd 2020", "carbopol", "carbomer"],
    defaultRate: "0.4-0.8%",
  },
  {
    canonicalName: "Acrylates Copolymer",
    aliases: ["acrylates copolymer", "acrylic acid copolymer"],
    defaultRate: "1-2%",
  },
  {
    canonicalName: "Cetyl Alcohol",
    aliases: ["cetyl alcohol", "cetearyl alcohol"],
    defaultRate: "2%",
  },
  {
    canonicalName: "Glyceryl Stearate",
    aliases: ["glyceryl stearate"],
    defaultRate: "2%",
  },
  {
    canonicalName: "PEG-100 Stearate",
    aliases: ["peg-100 stearate"],
    defaultRate: "1.5%",
  },
  {
    canonicalName: "Phenoxyethanol",
    aliases: ["phenoxyethanol"],
    defaultRate: "0.5-1%",
  },
  {
    canonicalName: "Ethylhexylglycerin",
    aliases: ["ethylhexylglycerin"],
    defaultRate: "0.1-0.3%",
  },
  {
    canonicalName: "Sodium Benzoate",
    aliases: ["sodium benzoate"],
    defaultRate: "0.3-0.5%",
  },
  {
    canonicalName: "Potassium Sorbate",
    aliases: ["potassium sorbate"],
    defaultRate: "0.2-0.4%",
  },
  {
    canonicalName: "Disodium EDTA",
    aliases: ["disodium edta", "edta"],
    defaultRate: "0.1%",
  },
  {
    canonicalName: "Citric Acid",
    aliases: ["citric acid", "asam sitrat"],
    defaultRate: "0.1-0.3%",
  },
];

/**
 * Extracts a structured formulation draft (Product Type, Skin Target, Texture, pH Range, Viscosity,
 * and Categorized Ingredients with exact percentages/ranges) dynamically from the selected AI message
 * and its conversation context so the user can transfer it to /formulate in 1 click.
 */
export function extractFormulationFromText(
  text: string,
  contextText?: string
): ExtractedFormulationDraft {
  const mainText = (text || "").trim();
  const combinedText = `${contextText || ""}\n${mainText}`.trim();
  const lowerMain = mainText.toLowerCase();
  const lowerCombined = combinedText.toLowerCase();

  // 1. Detect Base Product Type Spec
  let matchedProduct = VALIDATED_PRODUCT_TYPES[0];
  const productRules: Array<{ keywords: string[]; id: string }> = [
    { keywords: ["sunscreen", "tabir surya", "spf", "uv filter"], id: "sunscreen-lotion" },
    {
      keywords: [
        "cleanser",
        "facial wash",
        "face wash",
        "sabun wajah",
        "sabun cuci muka",
        "pembersih wajah",
        "pembersih",
        "micellar",
        "low-surfactant",
        "low surfactant",
        "syndet",
      ],
      id: "gentle-cleanser",
    },
    { keywords: ["toner", "essence toner", "hydrating toner"], id: "microbiome-hydrating-toner-essence" },
    { keywords: ["eye cream", "krim mata", "eye contour"], id: "eye-contour-peptide-cream" },
    { keywords: ["sleeping mask", "overnight mask", "masker tidur"], id: "ceramide-sleeping-mask" },
    { keywords: ["exfoliat", "eksfoliasi", "aha", "peeling", "resurfacing"], id: "aha-exfoliating-resurfacing-gel" },
    { keywords: ["acne fluid", "clarifying fluid", "obat totol jerawat"], id: "acne-clarifying-fluid" },
    { keywords: ["brightening", "mencerahkan", "essence lotion", "arbutin"], id: "brightening-essence-lotion" },
    { keywords: ["serum", "anti-aging", "anti aging", "peptide", "bakuchiol"], id: "anti-aging-serum" },
    { keywords: ["soothing gel", "calming gel", "hydro-gel", "hydrogel"], id: "soothing-gel" },
    { keywords: ["moisturizer", "pelembap", "cream", "krim", "barrier"], id: "facial-moisturizer-cream" },
  ];

  for (const rule of productRules) {
    if (rule.keywords.some((k) => lowerMain.includes(k) || lowerCombined.includes(k))) {
      const found = VALIDATED_PRODUCT_TYPES.find((p) => p.id === rule.id);
      if (found) {
        matchedProduct = found;
        break;
      }
    }
  }

  // 2. Detect Primary Skin Target (primarySkinTarget & skinTarget)
  // Prioritaskan deteksi eksplisit pada teks resep atau prompt pengguna (mendukung Sensitive, Oily, Dry, Normal, Combination, Anti-Aging, Acne-Prone)
  let skinTarget = "Sensitive";

  const detectSkinTargetFromSource = (src: string): string | null => {
    const s = src.toLowerCase();
    // Cek pola eksplisit seperti "untuk kulit sensitif", "target kulit: sensitif", "sensitive skin"
    if (
      /\b(kulit\s+sensitif|sensitive\s+skin|sensitive\s*&\s*redness|sensitif|sensitive|hipoalergenik|hypoallergenic|kemerahan|redness|rosacea)\b/i.test(
        s
      )
    ) {
      return "Sensitive";
    }
    if (
      /\b(anti[\s-]?aging|aging\s*&\s*fine\s*lines|penuaan|kerutan|fine\s+lines|garis\s+halus|mature\s+skin|kulit\s+dewasa)\b/i.test(
        s
      )
    ) {
      return "Anti-Aging";
    }
    if (
      /\b(kulit\s+kombinasi|combination\s+skin|kombinasi|combination|t[\s-]?zone)\b/i.test(
        s
      )
    ) {
      return "Combination";
    }
    if (/\b(kulit\s+normal|normal\s+skin)\b/i.test(s)) {
      return "Normal";
    }
    if (
      /\b(acne[\s-]?prone|kulit\s+berjerawat|anti[\s-]?acne|jerawat\s+meradang|komedo)\b/i.test(
        s
      )
    ) {
      return "Acne-Prone";
    }
    if (
      /\b(kulit\s+berminyak|oily\s+skin|sebum\s+control|oil\s+control|berminyak|oily)\b/i.test(
        s
      )
    ) {
      return "Oily";
    }
    if (
      /\b(kulit\s+kering|dry\s+skin|dry\s*&\s*dehydrated|dehidrasi|dehydrated|kering|dry|xerosis)\b/i.test(
        s
      )
    ) {
      return "Dry";
    }
    if (
      /\b(brightening|kusam|dullness|flek|hiperpigmentasi|uneven\s+tone)\b/i.test(
        s
      )
    ) {
      return "Dullness & Uneven Tone";
    }
    return null;
  };

  const detectedFromContext = contextText
    ? detectSkinTargetFromSource(contextText)
    : null;
  const detectedFromMain = detectSkinTargetFromSource(mainText);

  if (
    detectedFromContext === "Sensitive" ||
    detectedFromMain === "Sensitive"
  ) {
    skinTarget = "Sensitive";
  } else if (detectedFromContext) {
    skinTarget = detectedFromContext;
  } else if (detectedFromMain) {
    skinTarget = detectedFromMain;
  }

  // 3. Extract Specific Sediaan / Formula Name & Desired Texture from AI Text
  let formulaName = matchedProduct.name;
  const headingMatch = mainText.match(
    /(?:^|\n)\s*(?:#{1,4}|\*\*)\s*(?:Resep|Formula|Draf\s+Formula|Sediaan| Konsep\s+Formula)?\s*[:–—-]?\s*([A-Za-z0-9\s()/&-]{5,65}?)(?:\*\*|\n|$)/i
  );

  if (matchedProduct.id === "gentle-cleanser") {
    if (
      /\b(low[\s-]?surfactant|rendah\s+surfaktan|mild\s+surfactant|non[\s-]?sls|bebas\s+sls|glukosida|glucoside)\b/i.test(
        lowerCombined
      )
    ) {
      formulaName = "Gentle Cleanser Low-Surfactant";
    } else if (headingMatch && /cleanser|wash|pembersih|sabun/i.test(headingMatch[1])) {
      formulaName = headingMatch[1].replace(/[*#]/g, "").trim();
    }
  } else if (
    headingMatch &&
    /\b(cleanser|serum|moisturizer|cream|gel|toner|lotion|sunscreen|mask|fluid|wash)\b/i.test(
      headingMatch[1]
    )
  ) {
    formulaName = headingMatch[1].replace(/[*#]/g, "").trim();
  }

  // Extract Desired Texture dynamically
  let desiredTexture = "Light Gel-Cream (Cepat Meresap, Non-Sticky)";
  if (matchedProduct.id === "gentle-cleanser") {
    if (
      /\b(low[\s-]?surfactant|rendah\s+surfaktan|mild\s+surfactant|decyl\s+glucoside|non[\s-]?stripping|kulit\s+sensitif)\b/i.test(
        lowerCombined
      )
    ) {
      desiredTexture =
        "Gentle Cleanser Low-Surfactant Gel (Lembut, Non-Stripping & Bebas SLS)";
    } else {
      desiredTexture = "Gentle Low-Foam Micellar Gel (Lembut Tanpa Ketarik)";
    }
  } else if (/\b(watery\s+serum|silky\s+serum|cair\s+ringan|cepat\s+meresap)\b/i.test(lowerCombined)) {
    desiredTexture = "Silky Watery Serum (Ringan & Mudah Menyebar)";
  } else if (/\b(hydro[\s-]?gel|cooling\s+gel|clear\s+gel|gel\s+bening)\b/i.test(lowerCombined)) {
    desiredTexture = "Cooling Clear Hydro-Gel (Segar & Menenangkan)";
  } else if (/\b(rich\s+cream|cushion\s+cream|barrier\s+balm|kental)\b/i.test(lowerCombined)) {
    desiredTexture = "Rich Cushion Cream (Velvety Barrier & Lembap Intensif)";
  } else if (/\b(fluid\s+lotion|breathable\s+lotion|losion)\b/i.test(lowerCombined)) {
    desiredTexture = "Breathable Fluid Lotion (Matte / Soft-Finish Tropis)";
  }

  // 4. Extract Target pH (supports range like "5.0 - 5.5" or single value like "5.3")
  let targetPh = matchedProduct.targetPh;
  const phRangeMatch = mainText.match(
    /\bpH\b[^\n\d]{0,30}?(\d+(?:[.,]\d+)?)\s*(?:[–—-]|s\/d|sampai|hingga|to)\s*(\d+(?:[.,]\d+)?)/i
  );
  if (phRangeMatch) {
    const p1 = parseFloat(phRangeMatch[1].replace(",", "."));
    const p2 = parseFloat(phRangeMatch[2].replace(",", "."));
    if (p1 >= 2.5 && p1 <= 9.0 && p2 >= 2.5 && p2 <= 9.0) {
      targetPh = `${phRangeMatch[1].replace(",", ".")} - ${phRangeMatch[2].replace(",", ".")}`;
    }
  } else {
    const phSingleMatch = mainText.match(
      /\bpH\b[^\n\d]{0,25}?(\d+(?:[.,]\d+)?)/i
    );
    if (phSingleMatch) {
      const parsedPh = parseFloat(phSingleMatch[1].replace(",", "."));
      if (parsedPh >= 2.5 && parsedPh <= 9.0) {
        targetPh = phSingleMatch[1].replace(",", ".");
      }
    }
  }

  // 5. Extract Target Viscosity directly from AI recipe text
  let targetViscosity = matchedProduct.targetViscosity;
  const viscRangeOrValMatch = mainText.match(
    /(\d{1,3}(?:[.,]\d{3})*(?:\s*(?:[–—-]|s\/d|sampai|hingga|to)\s*\d{1,3}(?:[.,]\d{3})*)?\s*(?:cPs|mPa[·.]?s))/i
  );
  if (viscRangeOrValMatch) {
    targetViscosity = viscRangeOrValMatch[1]
      .replace(/\s+/g, " ")
      .replace(/[–—]/g, "-")
      .trim();
  } else {
    const viscLineMatch = mainText.match(
      /(?:viskositas|viscosity|kekentalan)\s*(?:target|ideal|optimal)?\s*[:=-]\s*([^\n;|]+)/i
    );
    if (viscLineMatch && viscLineMatch[1].trim().length >= 3) {
      targetViscosity = viscLineMatch[1].replace(/\*\*/g, "").trim().slice(0, 60);
    }
  }

  // 6. Extract Ingredients & Percentages/Ranges (with accurate functional categories)
  const extractedEntries: ExtractedIngredientEntry[] = [];
  const seenNormalizedNames = new Set<string>();

  const addExtractedEntry = (name: string, rateStr: string) => {
    const normKey = name.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!normKey || seenNormalizedNames.has(normKey)) return;
    // Normalize water variants so we don't add both "Distilled Water" and "Water"
    if (
      /\b(water|aqua|aquadest)\b/i.test(name) &&
      Array.from(seenNormalizedNames).some((k) =>
        k.includes("water") || k.includes("aqua")
      )
    ) {
      return;
    }
    seenNormalizedNames.add(normKey);
    const entry = parseCategorizedIngredientItem(`${name} ${rateStr}`.trim());
    extractedEntries.push(entry);
  };

  // 6A. Check known cosmetic ingredients (excipients, surfactants, humectants, actives, preservatives)
  for (const item of KNOWN_FORMULATION_INGREDIENTS) {
    let matchedAlias: string | null = null;
    for (const alias of item.aliases) {
      const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      if (new RegExp(`\\b${escaped}\\b`, "i").test(mainText)) {
        matchedAlias = alias;
        break;
      }
    }
    if (!matchedAlias) continue;

    const escapedAlias = matchedAlias.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Look for a range or single percentage on the same line or within 55 chars of the alias
    const rangeRegex = new RegExp(
      `${escapedAlias}[^\\n%]{0,55}?(\\d+(?:[.,]\\d+)?\\s*%?\\s*(?:[–—-]|s\\/d|sampai|hingga|to)\\s*\\d+(?:[.,]\\d+)?)\\s*%`,
      "i"
    );
    const singleRegex = new RegExp(
      `${escapedAlias}[^\\n%]{0,45}?(\\d+(?:[.,]\\d+)?)\\s*%`,
      "i"
    );
    const ad100Regex = new RegExp(
      `${escapedAlias}[^\\n]{0,45}?(?:q\\.?s\\.?|ad\\s*100\\s*%|hingga\\s*100\\s*%|to\\s*100\\s*%)`,
      "i"
    );

    const rangeHit = mainText.match(rangeRegex);
    const singleHit = !rangeHit ? mainText.match(singleRegex) : null;
    const ad100Hit = mainText.match(ad100Regex);

    if (rangeHit) {
      const cleanRange = rangeHit[1]
        .replace(/%/g, "")
        .replace(/\s+/g, "")
        .replace(/[–—]/g, "-")
        .replace(/,/g, ".");
      addExtractedEntry(item.canonicalName, `${cleanRange}%`);
    } else if (ad100Hit && item.canonicalName === "Distilled Water") {
      addExtractedEntry(item.canonicalName, "ad 100%");
    } else if (singleHit) {
      const pctNum = parseFloat(singleHit[1].replace(",", "."));
      if (item.canonicalName === "Distilled Water" && pctNum >= 99) {
        addExtractedEntry(item.canonicalName, "ad 100%");
      } else {
        addExtractedEntry(
          item.canonicalName,
          `${singleHit[1].replace(",", ".")}%`
        );
      }
    } else if (item.canonicalName === "Distilled Water") {
      addExtractedEntry(item.canonicalName, "ad 100%");
    } else {
      addExtractedEntry(item.canonicalName, item.defaultRate);
    }
  }

  // 6B. Also scan remaining INGREDIENT_PROFILES in case any specialized active was mentioned
  for (const prof of Object.values(INGREDIENT_PROFILES)) {
    const shortName = prof.inciName.split("(")[0].trim();
    if (shortName.length < 4) continue;
    if (/^(water|aqua)$/i.test(shortName)) continue;

    const escapedShort = shortName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    if (new RegExp(`\\b${escapedShort}\\b`, "i").test(mainText)) {
      const rangeRegex = new RegExp(
        `${escapedShort}[^\\n%]{0,50}?(\\d+(?:[.,]\\d+)?\\s*%?\\s*(?:[–—-]|to)\\s*\\d+(?:[.,]\\d+)?)\\s*%`,
        "i"
      );
      const singleRegex = new RegExp(
        `${escapedShort}[^\\n%]{0,40}?(\\d+(?:[.,]\\d+)?)\\s*%`,
        "i"
      );
      const rHit = mainText.match(rangeRegex);
      const sHit = !rHit ? mainText.match(singleRegex) : null;
      const defaultPct =
        prof.typicalUsageRate.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || "1.0";

      if (rHit) {
        const cleanR = rHit[1].replace(/%/g, "").replace(/\s+/g, "").replace(/,/g, ".");
        addExtractedEntry(shortName, `${cleanR}%`);
      } else if (sHit) {
        addExtractedEntry(shortName, `${sHit[1].replace(",", ".")}%`);
      } else {
        addExtractedEntry(shortName, `${defaultPct}%`);
      }
    }
  }

  // Fallback to matchedProduct's recommended actives ONLY if no ingredients at all were found in the message
  if (extractedEntries.length === 0) {
    for (const act of matchedProduct.recommendedActives.slice(0, 3)) {
      extractedEntries.push(parseCategorizedIngredientItem(act.name));
    }
  }

  const finalIngredients = extractedEntries.map((e) => e.label);

  return {
    formulaName,
    productType: formulaName,
    primarySkinTarget: skinTarget,
    skinTarget,
    desiredTexture,
    targetPh,
    targetViscosity,
    batchSize: "100",
    customIngredients: finalIngredients,
    extractedComposition: extractedEntries,
    summaryLabel: `${formulaName} (${finalIngredients.length} Bahan Diekstrak · Target Kulit: ${skinTarget} · pH ${targetPh})`,
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
 * Parses a targetPh string that may be a single value ("5.3") or a range ("5.0 - 5.5")
 * into a numeric pH midpoint for stability evaluation.
 */
export function parseTargetPhNumeric(
  targetPhInput: string,
  fallbackPh: string = "5.3"
): number {
  const raw = (targetPhInput || fallbackPh).trim();
  const rangeMatch = raw.match(
    /(\d+(?:[.,]\d+)?)\s*(?:[–—-]|s\/d|to)\s*(\d+(?:[.,]\d+)?)/
  );
  if (rangeMatch) {
    const a = parseFloat(rangeMatch[1].replace(",", "."));
    const b = parseFloat(rangeMatch[2].replace(",", "."));
    if (Number.isFinite(a) && Number.isFinite(b)) {
      return Number(((a + b) / 2).toFixed(2));
    }
  }
  const singleMatch = raw.match(/(\d+(?:[.,]\d+)?)/);
  if (singleMatch) {
    const val = parseFloat(singleMatch[1].replace(",", "."));
    if (Number.isFinite(val)) return val;
  }
  return parseFloat(fallbackPh) || 5.3;
}

/**
 * Evaluates current /formulate inputs in real-time for the Interactive AI Co-pilot.
 * Accurately separates Active Ingredients ("Bahan Aktif") from Base/Excipients
 * ("Air/Pelarut", "Surfaktan", "Humektan", "Pengawet", "Base / Eksipien")
 * so surfactant/humectant/solvent loads never trigger false active-overload warnings.
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
  const phVal = parseTargetPhNumeric(params.targetPh, spec.targetPh);
  const [minPhStr, maxPhStr] = spec.validPhRange.split("–").map((s) => s.trim());
  const minPh = parseFloat(minPhStr || "4.5");
  const maxPh = parseFloat(maxPhStr || "6.5");

  let totalActivePercent = 0;
  let surfactantPercent = 0;
  let humectantPercent = 0;
  let preservativePercent = 0;
  const parsedNames: string[] = [];
  const categorizedIngredients: ExtractedIngredientEntry[] = [];

  for (const item of params.customIngredients) {
    if (!item || !item.trim()) continue;
    const entry = parseCategorizedIngredientItem(item);
    categorizedIngredients.push(entry);
    parsedNames.push(entry.name.toLowerCase());

    if (entry.category === "Bahan Aktif") {
      totalActivePercent += entry.numericPercent;
    } else if (entry.category === "Surfaktan") {
      surfactantPercent += entry.numericPercent;
    } else if (entry.category === "Humektan") {
      humectantPercent += entry.numericPercent;
    } else if (entry.category === "Pengawet") {
      preservativePercent += entry.numericPercent;
    }
  }

  totalActivePercent = Number(totalActivePercent.toFixed(2));
  surfactantPercent = Number(surfactantPercent.toFixed(2));
  humectantPercent = Number(humectantPercent.toFixed(2));
  preservativePercent = Number(preservativePercent.toFixed(2));

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
        detail: `Target pH ${params.targetPh || phVal.toFixed(2)} berisiko menurunkan stabilitas viskositas emulsi atau mengiritasi kulit pada sistem ${spec.shortName}. Rekomendasi: pH ${spec.targetPh}.`,
      });
    } else if (phVal < minPh || phVal > maxPh) {
      alerts.push({
        level: "warning",
        title: `pH Mendekati Batas Ambang (${spec.validPhRange})`,
        detail: `Target pH ${params.targetPh || phVal.toFixed(2)} berada di tepi rentang optimal ${spec.shortName}. Siapkan larutan buffer Citric Acid / Tromethamine.`,
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

  // Check true active load (ONLY Bahan Aktif, excluding Air/Pelarut, Surfaktan, Humektan, Pengawet)
  if (totalActivePercent > 35) {
    alerts.push({
      level: "warning",
      title: `Konsentrasi Bahan Aktif Tinggi (${totalActivePercent}% w/w)`,
      detail:
        "Beban bahan aktif murni > 35% dapat menurunkan viskositas polimer dan meningkatkan risiko kristalisasi atau rasa lengket.",
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
    parsedNames.some((n) => n.includes("decyl glucoside")) &&
    parsedNames.some((n) => n.includes("betaine"))
  ) {
    synergiesFound.push(
      "Sinergi Misel Amfoterik-Nonionik: Decyl Glucoside + Cocamidopropyl Betaine menurunkan potensi iritasi surfaktan (Zein score rendah) sekaligus menjaga stabilitas busa lembut pada kulit sensitif."
    );
  }
  if (
    parsedNames.some(
      (n) =>
        n.includes("centella") ||
        n.includes("aloe") ||
        n.includes("glycerin")
    ) &&
    parsedNames.some((n) => n.includes("panthenol") || n.includes("allantoin"))
  ) {
    synergiesFound.push(
      "Sinergi Barrier & Anti-Eritema: Kombinasi Humektan + Panthenol/Allantoin menjaga hidrasi korneosit dan menenangkan kulit sensitif."
    );
  }

  if (alerts.length === 0) {
    alerts.push({
      level: "optimal",
      title: `Parameter Terkalibrasi Optimal untuk ${params.productType || spec.shortName}`,
      detail: `Target pH ${
        params.targetPh || spec.targetPh
      }, beban Bahan Aktif (${totalActivePercent}% w/w), dan sistem Base/Eksipien (${estimatedBasePercent}% w/w) selaras untuk target kulit ${params.skinTarget}.`,
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
    params.productType || spec.name
  } target kulit ${params.skinTarget}. Status saat ini: ${statusLabel}. Target pH ${
    params.targetPh || spec.targetPh
  }, dengan total bahan aktif terpilih ${totalActivePercent} persen dan sistem base ${estimatedBasePercent} persen. ${
    alerts[0]?.detail || ""
  } ${synergiesFound[0] || ""}`;

  return {
    status,
    statusLabel,
    totalActivePercent,
    estimatedBasePercent,
    surfactantPercent,
    humectantPercent,
    preservativePercent,
    categorizedIngredients,
    phCompatibility: `Rentang Valid ${spec.validPhRange} (Target ${
      params.targetPh || spec.targetPh
    })`,
    synergiesFound,
    alerts,
    spokenSummaryId,
  };
}
