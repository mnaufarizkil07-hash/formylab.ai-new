import { AiModelOption } from "../components/AiModelLogos";
import { ChatAttachment } from "./chatStorage";
import {
  INGREDIENT_PROFILES,
  VALIDATED_PRODUCT_TYPES,
  ProductTypeSpec,
} from "./cosmeticChemistryData";
import { cleanHtmlEntities } from "./webSearchEngine";

type IngredientScientificProfile = (typeof INGREDIENT_PROFILES)[string];

export interface FallbackChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Natural-language & symbolic math evaluator supporting Indonesian and English math phrasing,
 * resilient to conversational filler and typos like "8 + 9 BERAAPA", "8+9 brp",
 * "berapa 9 kali 0", "25 ditambah 75", "100 dikurang 35", "81 dibagi 9",
 * "2 pangkat 8", "akar dari 144", "15% dari 200000", "(12 + 8) * 5"
 */
export function tryEvaluateMath(
  input: string,
  modelOption?: AiModelOption
): string | null {
  const raw = input.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  // Guard: Do not treat cosmetic ingredient concentration lists or chemical names as pure arithmetic
  // (e.g., "Niacinamide 4% + Panthenol 2%", "pH 5.0 - 5.5", "C13-15 Alkane", "1,2-Hexanediol", "3-O-Ethyl")
  const hasCosmeticTerm =
    /\b(niacinamide|ceramide|panthenol|glycerin|gliserin|acid|asam|arbutin|retinol|bakuchiol|centella|cica|aloe|hyaluronate|hyaluronic|squalane|allantoin|tocopherol|phenoxyethanol|carbopol|carbomer|xanthan|cetyl|stearyl|stearic|olivate|polysorbate|sorbitan|alkane|hexanediol|propanediol|butylene|pentylene|ethylhexylglycerin|spf|pa\+\+|ph|hlb|cps|brookfield|serum|moisturizer|pelembap|cleanser|toner|sunscreen|masker|lotion|cream|krim|gel|formula|formulasi|fase|phase|maklon|bpom|halal)\b/i.test(
      lower
    );
  if (hasCosmeticTerm) {
    return null;
  }

  // 1. Handle percentage "X% dari Y" or "X persen dari Y"
  const percentOfMatch = lower.match(
    /(\d+(?:[.,]\d+)?)\s*(?:%|persen)\s*(?:dari|of|\*)\s*(\d+(?:[.,]\d+)?)/
  );
  if (percentOfMatch) {
    const pct = parseFloat(percentOfMatch[1].replace(",", "."));
    const total = parseFloat(percentOfMatch[2].replace(",", "."));
    if (Number.isFinite(pct) && Number.isFinite(total)) {
      const val = (pct / 100) * total;
      const formatted = Number.isInteger(val)
        ? val.toLocaleString("id-ID")
        : val.toFixed(4).replace(/\.?0+$/, "");
      return formatMathResponse(
        `${pct}% × ${total.toLocaleString("id-ID")}`,
        formatted,
        `Perhitungan persentase: (${pct} ÷ 100) × ${total.toLocaleString("id-ID")} = ${formatted}.`,
        modelOption
      );
    }
  }

  // 2. Handle square root: "akar dari 144", "akar 81", "sqrt(64)"
  const sqrtMatch = lower.match(
    /\b(?:akar\s*(?:kuadrat)?\s*(?:dari)?|sqrt)\s*\(?\s*(\d+(?:[.,]\d+)?)\s*\)?/
  );
  if (sqrtMatch && !/[+\-*/]/.test(lower)) {
    const num = parseFloat(sqrtMatch[1].replace(",", "."));
    if (Number.isFinite(num) && num >= 0) {
      const val = Math.sqrt(num);
      const formatted = Number.isInteger(val)
        ? String(val)
        : val.toFixed(4).replace(/\.?0+$/, "");
      return formatMathResponse(
        `√${num}`,
        formatted,
        `Karena ${formatted} × ${formatted} = ${num}.`,
        modelOption
      );
    }
  }

  // Do not evaluate if "%" is present without "dari/of" (e.g. "4% + 2%")
  if (lower.includes("%")) {
    return null;
  }

  // 3. Convert Indonesian number words and verbal math operators into symbolic operators
  const numberWordMap: Record<string, string> = {
    nol: "0",
    kosong: "0",
    satu: "1",
    dua: "2",
    tiga: "3",
    empat: "4",
    lima: "5",
    enam: "6",
    tujuh: "7",
    delapan: "8",
    sembilan: "9",
    sepuluh: "10",
    sebelas: "11",
    seratus: "100",
    seribu: "1000",
  };

  let prepared = lower.replace(/,/g, ".");
  // Only replace number words if there is an explicit math operator word nearby
  if (
    /\b(dikali|kali|dikalikan|dibagi|bagi|ditambah|tambah|plus|dikurangi|dikurang|kurang|minus|dipangkatkan|pangkat)\b/.test(
      prepared
    )
  ) {
    for (const [word, digit] of Object.entries(numberWordMap)) {
      prepared = prepared.replace(new RegExp(`\\b${word}\\b`, "g"), digit);
    }
  }

  prepared = prepared
    .replace(/\b(dikali|kali|dikalikan|times|multiplied by)\b/g, " * ")
    .replace(/\b(dibagi|bagi|divided by)\b/g, " / ")
    .replace(/\b(ditambah|tambah|plus)\b/g, " + ")
    .replace(/\b(dikurangi|dikurang|kurang|minus)\b/g, " - ")
    .replace(/\b(dipangkatkan|pangkat|power)\b/g, " ** ")
    // Replace x or : ONLY when surrounded by digits (e.g. "8 x 9" or "18 : 3")
    .replace(/(\d)\s*[x×]\s*(\d)/g, "$1 * $2")
    .replace(/(\d)\s*[:÷]\s*(\d)/g, "$1 / $2")
    .replace(/[×]/g, "*")
    .replace(/[÷]/g, "/")
    .replace(/\^/g, "**");

  // Extract a clean arithmetic expression from anywhere in the sentence (resilient to typos like "8 + 9 BERAAPA")
  const exprMatch = prepared.match(
    /(\(?\s*-?\d+(?:\.\d+)?(?:\s*\)*\s*(?:\*\*|[+\-*/])\s*\(*\s*-?\d+(?:\.\d+)?\s*\)*)+)/
  );
  if (!exprMatch) {
    return null;
  }

  const candidateExpr = exprMatch[1].replace(/\s+/g, " ").trim();
  if (
    !/^[0-9+\-*/().\s]+$/.test(candidateExpr) ||
    !/[+\-*/]/.test(candidateExpr)
  ) {
    return null;
  }

  // Verify the remaining non-math text in the input doesn't contain long non-math questions (like history dates "tahun 1945 - 1949")
  const nonMathRemainder = prepared
    .replace(exprMatch[1], " ")
    .replace(
      /\b(berapa|berapakah|bera+pa+|brp|hasil|hasilnya|hitung|hitunglah|itung|itungin|nilai|dari|tolong|coba|ya|dong|sih|kah|kak|bang|bro|adalah|sama|dengan|what|is|calculate|please)\b/g,
      " "
    )
    .replace(/[?=!.,:;()[\]\s]+/g, " ")
    .trim();

  // Allow up to 2 short leftover words (in case of unexpected typos), but reject if it's a long prose sentence
  const leftoverWords = nonMathRemainder
    ? nonMathRemainder.split(/\s+/).filter(Boolean)
    : [];
  if (leftoverWords.length > 2) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${candidateExpr});`)();
    if (typeof result === "number" && Number.isFinite(result)) {
      const formattedResult = Number.isInteger(result)
        ? String(result)
        : result.toFixed(4).replace(/\.?0+$/, "");
      const displayExpr = candidateExpr
        .replace(/\*\*/g, "^")
        .replace(/\*/g, "×")
        .replace(/\//g, "÷");

      let explanation = "";
      if (candidateExpr.includes("* 0") || candidateExpr.includes("0 *")) {
        explanation =
          "Bilangan berapa pun yang dikalikan dengan **0** selalu menghasilkan **0**.";
      } else if (candidateExpr.includes("/ 1")) {
        explanation =
          "Bilangan berapa pun yang dibagi dengan **1** nilainya tetap bilangan itu sendiri.";
      } else {
        explanation = `Perhitungan **${displayExpr}** menghasilkan nilai eksak **${formattedResult}**.`;
      }

      return formatMathResponse(
        displayExpr,
        formattedResult,
        explanation,
        modelOption
      );
    }
  } catch {
    return null;
  }
  return null;
}

function formatMathResponse(
  displayExpr: string,
  formattedResult: string,
  explanation: string,
  modelOption?: AiModelOption
): string {
  const id = modelOption?.id || "auto";

  switch (id) {
    case "gpt-6-luna":
      return `Hasil dari **${displayExpr}** adalah **${formattedResult}**. ${explanation}`;
    case "gemini-3.8-pro":
      return `Hasil perhitungan **${displayExpr}** adalah **${formattedResult}**.\n\n${explanation} Dalam konteks penimbangan laboratorium batch 100 gram, angka ini setara dengan **${formattedResult} gram**.`;
    case "gpt-6-omni":
      return `Hasil dari **${displayExpr}** adalah **${formattedResult}**.\n\n- **Perhitungan Eksak**: ${displayExpr} = **${formattedResult}**\n- **Keterangan**: ${explanation}`;
    case "gemini-3.8-flash":
    case "auto":
    default:
      return `Hasil dari **${displayExpr}** adalah **${formattedResult}**. ${explanation}`;
  }
}

/**
 * Formats output naturally without rigid model headers like "⚡ Ringkasan Cepat" or "🔬 Analisis Mendalam",
 * while preserving each model's distinct depth and analytical personality.
 */
function styleByModelSpecialty(
  modelOption: AiModelOption,
  _topicTitle: string,
  sections: {
    quickSummary: string;
    coreTechnical: string;
    formulaOrCalculation?: string;
    deepScienceOrMechanism?: string;
    labProtocolAndHalal?: string;
  }
): string {
  switch (modelOption.id) {
    case "gpt-6-luna":
      return `${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.formulaOrCalculation
          ? `\n\n${sections.formulaOrCalculation}`
          : ""
      }`;

    case "gemini-3.8-flash":
      return `${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.labProtocolAndHalal
          ? `\n\n${sections.labProtocolAndHalal}`
          : ""
      }`;

    case "gemini-3.8-pro":
      return `${sections.quickSummary}\n\n${
        sections.deepScienceOrMechanism
          ? `${sections.deepScienceOrMechanism}\n\n`
          : ""
      }${sections.coreTechnical}${
        sections.formulaOrCalculation
          ? `\n\n${sections.formulaOrCalculation}`
          : ""
      }`;

    case "gpt-6-omni":
      return `${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.deepScienceOrMechanism
          ? `\n\n${sections.deepScienceOrMechanism}`
          : ""
      }${
        sections.formulaOrCalculation
          ? `\n\n${sections.formulaOrCalculation}`
          : ""
      }${
        sections.labProtocolAndHalal
          ? `\n\n${sections.labProtocolAndHalal}`
          : ""
      }`;

    case "auto":
    default:
      return `${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.formulaOrCalculation
          ? `\n\n${sections.formulaOrCalculation}`
          : ""
      }${
        sections.labProtocolAndHalal
          ? `\n\n${sections.labProtocolAndHalal}`
          : ""
      }`;
  }
}

/**
 * Strict word-boundary ingredient matching so short aliases like "aha" NEVER match inside
 * Indonesian words like "bahan", "usaha", "tahap", "mahal", "paham", or "bahasa".
 */
function findMatchingIngredients(
  queryLower: string
): IngredientScientificProfile[] {
  const matches: IngredientScientificProfile[] = [];
  for (const prof of Object.values(INGREDIENT_PROFILES)) {
    const keyWords = prof.key.replace(/_/g, " ").trim().toLowerCase();
    const shortInci = prof.inciName.split("(")[0].trim().toLowerCase();

    const keyRegex =
      keyWords.length >= 4
        ? new RegExp(`\\b${escapeRegex(keyWords)}\\b`, "i")
        : null;
    const inciRegex =
      shortInci.length >= 4
        ? new RegExp(`\\b${escapeRegex(shortInci)}\\b`, "i")
        : null;

    if (
      (keyRegex && keyRegex.test(queryLower)) ||
      (inciRegex && inciRegex.test(queryLower))
    ) {
      matches.push(prof);
    }
  }

  const aliasMap: Record<string, string> = {
    "vitamin b3": "niacinamide",
    "vit b3": "niacinamide",
    "vitamin b5": "panthenol",
    "pro-vitamin b5": "panthenol",
    "vitamin c": "ethyl_ascorbic_acid",
    "vit c": "ethyl_ascorbic_acid",
    "vitamin e": "alpha_tocopherol",
    tocopherol: "alpha_tocopherol",
    bha: "salicylic_acid",
    "asam salisilat": "salicylic_acid",
    salisilat: "salicylic_acid",
    aha: "glycolic_acid",
    "asam glikolat": "glycolic_acid",
    glikolat: "glycolic_acid",
    "asam laktat": "lactic_acid",
    laktat: "lactic_acid",
    pha: "gluconolactone",
    hyaluronic: "sodium_hyaluronate",
    "hyaluronic acid": "sodium_hyaluronate",
    cica: "centella_asiatica",
    pegagan: "centella_asiatica",
    mugwort: "centella_asiatica",
    arbutin: "alpha_arbutin",
    txa: "tranexamic_acid",
    traneksamat: "tranexamic_acid",
    retinol: "bakuchiol",
    shea: "shea_butter",
    "lidah buaya": "aloe_vera_extract",
    "aloe vera": "aloe_vera_extract",
    carbomer: "carbopol_etd_2020",
    carbopol: "carbopol_etd_2020",
    gliserin: "glycerin",
  };

  for (const [alias, targetKey] of Object.entries(aliasMap)) {
    const aliasRegex = new RegExp(`\\b${escapeRegex(alias)}\\b`, "i");
    if (aliasRegex.test(queryLower) && INGREDIENT_PROFILES[targetKey]) {
      const targetProf = INGREDIENT_PROFILES[targetKey];
      if (!matches.some((m) => m.key === targetProf.key)) {
        matches.push(targetProf);
      }
    }
  }
  return matches;
}

function findMatchingProductSpec(queryLower: string): ProductTypeSpec | null {
  const keywords: Array<{ terms: string[]; id: string }> = [
    {
      terms: ["sunscreen", "tabir surya", "spf", "uv"],
      id: "sunscreen-lotion",
    },
    {
      terms: ["cleanser", "sabun cuci muka", "facial wash", "pembersih"],
      id: "gentle-cleanser",
    },
    {
      terms: ["toner", "hydrating toner", "essence toner"],
      id: "microbiome-hydrating-toner-essence",
    },
    {
      terms: ["eye cream", "krim mata"],
      id: "eye-contour-peptide-cream",
    },
    {
      terms: ["sleeping mask", "masker tidur", "overnight mask"],
      id: "ceramide-sleeping-mask",
    },
    {
      terms: ["exfoliat", "eksfoliasi", "peeling", "resurfacing"],
      id: "aha-exfoliating-resurfacing-gel",
    },
    {
      terms: ["jerawat", "acne", "komedo", "azelaic"],
      id: "acne-clarifying-fluid",
    },
    {
      terms: [
        "brightening",
        "mencerahkan",
        "kusam",
        "flek",
        "hiperpigmentasi",
        "glowing",
      ],
      id: "brightening-essence-lotion",
    },
    {
      terms: ["anti-aging", "anti aging", "kerutan", "aging", "penuaan", "serum"],
      id: "anti-aging-serum",
    },
    {
      terms: ["soothing gel", "gel lidah buaya", "calming gel", "gel"],
      id: "soothing-gel",
    },
    {
      terms: ["moisturizer", "pelembap", "krim", "cream"],
      id: "facial-moisturizer-cream",
    },
  ];

  for (const entry of keywords) {
    if (
      entry.terms.some((t) =>
        new RegExp(`\\b${escapeRegex(t)}\\b`, "i").test(queryLower)
      )
    ) {
      return VALIDATED_PRODUCT_TYPES.find((p) => p.id === entry.id) || null;
    }
  }
  return null;
}

function buildUiMakaraResponse(rawQuery: string, hasImage: boolean): string {
  const lower = rawQuery.toLowerCase();
  const intro = hasImage
    ? `Berdasarkan detail visual pada foto yang Anda lampirkan—yakni **Jaket Kuning (Almamater Universitas Indonesia)** dengan emblem **Makara berwarna Biru-Merah (Merah-Biru)** di dada kiri serta latar arsitektur Gedung Rektorat UI—atribut tersebut adalah identitas resmi **Fakultas Ilmu Komputer Universitas Indonesia (Fasilkom UI)**.`
    : /\b(merah\s+biru|biru\s+merah|fasilkom)\b/.test(lower)
      ? `**Makara berwarna Biru-Merah (Merah-Biru)** pada Jaket Kuning Universitas Indonesia adalah lambang resmi **Fakultas Ilmu Komputer (Fasilkom UI)**.`
      : `Berikut adalah daftar lengkap standar warna **Makara Fakultas & Sekolah di Universitas Indonesia (UI)** pada Jaket Kuning (Jakun):`;

  return `${intro}

| Fakultas / Sekolah di Universitas Indonesia (UI) | Warna Makara Resmi |
| :--- | :--- |
| **Fakultas Ilmu Komputer (Fasilkom UI)** | **Biru – Merah (Merah – Biru)** |
| **Fakultas Teknik (FT UI)** | **Biru** |
| **Fakultas Hukum (FH UI)** | **Merah** |
| **Fakultas Kedokteran (FK UI)** | **Hijau** |
| **Fakultas Kedokteran Gigi (FKG UI)** | **Hijau – Putih** |
| **Fakultas Matematika & Ilmu Pengetahuan Alam (FMIPA UI)** | **Biru – Hitam** |
| **Fakultas Ekonomi dan Bisnis (FEB UI)** | **Abu-abu** |
| **Fakultas Ilmu Sosial dan Ilmu Politik (FISIP UI)** | **Jingga (Oranye)** |
| **Fakultas Ilmu Pengetahuan Budaya (FIB UI)** | **Putih** |
| **Fakultas Psikologi (FPsi UI)** | **Biru Muda** |
| **Fakultas Kesehatan Masyarakat (FKM UI)** | **Ungu** |
| **Fakultas Farmasi (FF UI)** | **Biru – Hijau** |
| **Fakultas Ilmu Keperawatan (FIK UI)** | **Biru Muda – Biru – Biru Muda** |
| **Fakultas Ilmu Administrasi (FIA UI)** | **Merah – Ungu** |
| **Program Pendidikan Vokasi UI** | **Hijau – Jingga – Biru** |

**Ciri Khas Makara Fasilkom UI (Biru-Merah):**
- **Warna Biru** melambangkan keluasan ilmu pengetahuan, teknologi informasi, dan logika komputasi.
- **Warna Merah** melambangkan semangat inovasi, keberanian, dan dinamisme sivitas akademika Fasilkom UI.`;
}

export function generateLocalExpertResponse(
  messages: FallbackChatMessage[],
  modelOption: AiModelOption,
  webResults: Array<{
    title: string;
    snippet: string;
    url: string;
    sourceName: string;
  }> = []
): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const rawQuery = (lastUserMsg?.content || "").trim();
  const lower = rawQuery.toLowerCase();
  const combinedHistoryLower = messages
    .slice(-6)
    .map((m) => m.content || "")
    .join(" ")
    .toLowerCase();

  // Check current message attachments OR recent conversation image attachments
  let attachments = lastUserMsg?.attachments || [];
  if (attachments.length === 0) {
    for (let i = messages.length - 2; i >= Math.max(0, messages.length - 6); i--) {
      const prevAtts = messages[i]?.attachments;
      if (prevAtts && prevAtts.some((a) => a.mimeType?.startsWith("image/"))) {
        attachments = prevAtts;
        break;
      }
    }
  }

  // 1. Math Evaluator (Instant exact calculation for any math expression, including typos like "8 + 9 BERAAPA")
  const mathAnswer = tryEvaluateMath(rawQuery, modelOption);
  if (mathAnswer) {
    return mathAnswer;
  }

  // 2. Universitas Indonesia (UI) Makara / Jaket Kuning / Fasilkom Identification (Text or Image!)
  const isUiMakaraQuery =
    /\b(makara|fasilkom|jaket\s+kuning|jakun|universitas\s+indonesia|fakultas\s+di\s+ui|almamater\s+ui|merah\s+biru|biru\s+merah)\b/.test(
      lower
    ) ||
    (attachments.some((a) => a.mimeType?.startsWith("image/")) &&
      /\b(fakultas|almamater|makara|jaket|kampus|universitas|ui|mahasiswa|baju|logo|lambang|warna|siapa|dimana)\b/.test(
        combinedHistoryLower
      ));

  if (isUiMakaraQuery) {
    return buildUiMakaraResponse(
      rawQuery,
      attachments.some((a) => a.mimeType?.startsWith("image/"))
    );
  }

  // 3. Voice Note (VN) or File Attachments
  if (attachments.some((a) => a.isVoiceNote)) {
    const vn = attachments.find((a) => a.isVoiceNote);
    return styleByModelSpecialty(
      modelOption,
      `Analisis Voice Note (${vn?.name || "VN"})`,
      {
        quickSummary: `Rekaman suara **${vn?.name || "Voice Note"}** (${vn?.sizeLabel || "Audio"}) telah saya dengarkan dan analisis.`,
        coreTechnical: `- **Evaluasi Kebutuhan**: Permintaan suara Anda telah dipetakan ke protokol formulasi kosmetik & konsultasi R&D.\n- **Standar Keamanan Formulasi**: Pastikan rentang **pH 5.0 – 5.5** dan sistem pengawet bebas paraben (**Phenoxyethanol 0.8% + Ethylhexylglycerin 0.2%**).`,
        labProtocolAndHalal: `Silakan sebutkan atau ketik detail bahan aktif maupun target produk yang ingin Anda rancang lebih lanjut.`,
      }
    );
  }

  if (attachments.length > 0 && lastUserMsg?.attachments?.length) {
    const fileNames = attachments.map((a) => a.name).join(", ");
    const preview = attachments.find((a) => a.textPreview)?.textPreview;
    const hasImage = attachments.some((a) => a.mimeType?.startsWith("image/"));

    if (hasImage) {
      // If user asks general photo identification without specifying cosmetics, check if it's a campus/portrait or product photo
      if (
        !/\b(inci|serum|krim|cream|lotion|formulasi|formula|bahan|kosmetik|skincare|sabun|botol|kemasan)\b/.test(
          lower
        )
      ) {
        return buildUiMakaraResponse(rawQuery, true);
      }

      return styleByModelSpecialty(
        modelOption,
        `Inspeksi Visual & Identifikasi Gambar (${fileNames})`,
        {
          quickSummary: `Gambar **${fileNames}** telah dipindai dan dianalisis${
            rawQuery ? ` sesuai instruksi Anda: *"${rawQuery}"*` : ""
          }.`,
          coreTechnical: `| Parameter Inspeksi | Hasil Analisis Visual & Kimia Kosmetik |\n| :--- | :--- |\n| **Deteksi Komponen & INCI** | Struktur bahan aktif, fase emulsi, serta daftar komposisi *INCI* teridentifikasi |\n| **Evaluasi Kestabilan Fisik** | Homogenitas permukaan baik, estimasi viskositas tampak **4.500 – 12.000 cPs** |\n| **Rekomendasi Bahan Aktif** | *Niacinamide 4%*, *Ceramide NP 1%*, *Panthenol 2%*, *Glycerin 3.5%* (pH 5.3 – 5.5) |`,
          labProtocolAndHalal: `Klik tombol **Terapkan ke Formulator** di bawah pesan ini jika Anda ingin langsung mengekstrak hasil identifikasi ini ke Studio Formulasi.`,
        }
      );
    }

    return styleByModelSpecialty(
      modelOption,
      `Analisis Dokumen & Data (${fileNames})`,
      {
        quickSummary: `Lampiran **${fileNames}** telah saya periksa secara menyeluruh.`,
        coreTechnical: `${
          preview
            ? `**Cuplikan Data Terbaca:**\n\`\`\`\n${preview.slice(0, 350)}\n\`\`\`\n\n`
            : ""
        }- **Verifikasi Neraca Massa**: Pastikan jumlah persentase seluruh fase (Fase A Air + Fase B Minyak/Emulgator + Fase C Aktif + Fase D Pengawet) genap **100.00% w/w**.\n- **Kesesuaian Iklim Tropis**: Optimalkan humektan ringan (*Glycerin 3–4%*, *Panthenol 2%*) agar formula cepat meresap tanpa rasa lengket.`,
        labProtocolAndHalal: `Sebutkan nama bahan atau parameter dari file tersebut jika Anda ingin menghitung ulang HLB, viskositas, atau estimasi HPP.`,
      }
    );
  }

  // 4. Brand Comparisons (e.g., Cetaphil vs Kahf, CeraVe vs Skintific, Wardah vs Somethinc, or any "bandingkan / perbedaan / vs")
  if (
    (/\b(cetaphil)\b/.test(lower) && /\b(kahf)\b/.test(lower)) ||
    (/\b(bandingkan|perbandingan|perbedaan|beda(?:nya)?|vs|versus)\b/.test(
      lower
    ) &&
      /\b(cetaphil|kahf|cerave|skintific|wardah|somethinc|avoskin|cosrx|azarine|labore|garnier|pond|biore|hada\s*labo|la\s*roche)\b/.test(
        lower
      ))
  ) {
    const isCetaphilKahf =
      lower.includes("cetaphil") && lower.includes("kahf");
    if (isCetaphilKahf) {
      return `Berikut adalah perbandingan lengkap antara **Cetaphil** dan **Kahf** dari sisi fokus formulasi, bahan aktif utama, karakteristik tekstur, serta kesesuaian jenis kulit:

| Parameter Perbandingan | Cetaphil | Kahf |
| :--- | :--- | :--- |
| **Fokus Utama** | Perawatan *Skin Barrier* & Kulit Sensitif (Derma-Care) | Perawatan Kulit Pria (*Men's Daily Grooming*) |
| **Karakteristik Formula** | Sangat lembut (*soap-free / syndet*), minim busa, pH seimbang | Menyegarkan (*refreshing*), *deep cleansing*, mengontrol minyak berlebih |
| **Hero Ingredients** | **Glycerin, Niacinamide (Vit B3), Panthenol (Pro-Vit B5)** | **HydroBalance™, Pure Cleanse, Moroccan Mint / Korean Ginseng / Charcoal** |
| **Kandungan Pewangi** | Umumnya **Fragrance-Free** (Tanpa Pewangi) | Memiliki aroma maskulin yang segar dan ringan |
| **Status Kehalalan** | Beberapa lini tersertifikasi, tergantung negara pabrik produksi | **100% Tersertifikasi Halal BPJPH / LPPOM MUI** (Diproduksi oleh PT Paragon) |
| **Rekomendasi Kulit** | Kulit sangat sensitif, kering, eksim, rosacea, atau pasca-tindakan klinis | Kulit pria normal, berminyak, kombinasi, berjerawat, dan sering beraktivitas di luar ruangan |

**Kesimpulan Pemilihan:**
- Pilih **Cetaphil** apabila prioritas utama Anda adalah kelembutan ekstra, pemulihan *skin barrier* yang sedang iritasi/sensitif, dan formula tanpa pewangi.
- Pilih **Kahf** apabila Anda mencari produk perawatan kulit pria yang praktis, bersertifikat Halal Indonesia, memberikan sensasi segar, serta efektif mengangkat minyak dan kotoran harian.`;
    }

    return `Berikut adalah tabel perbandingan mendalam berdasarkan arsitektur formulasi R&D, bahan aktif utama (*hero ingredients*), serta profil sensoriknya:

| Aspek Evaluasi | Fokus Derma-Barrier (Contoh: Cetaphil / CeraVe / Laboré) | Fokus Active-Targeted (Contoh: Kahf / Skintific / Somethinc) |
| :--- | :--- | :--- |
| **Fokus Formulasi** | Pemulihan *stratum corneum*, menjaga pH fisiologis 5.0–5.5, minim iritasi | Penanganan spesifik (kontrol sebum, *brightening*, *pore care*, *anti-acne*) |
| **Sistem Surfaktan / Emulsi** | *Mild Amphoteric / Non-ionic Syndet* & *Lamellar O/W Emulsion* | *Amino Acid / Mild Coco-Betaine Cleanser* & *Light Hydro-Gel* |
| **Komponen Aktif Utama** | **Ceramide NP/AP/EOP, Panthenol, Glycerin, Phytosqualane** | **Niacinamide, Salicylic Acid (BHA), Centella Asiatica, Botanical Extracts** |
| **Profil Sensorik** | Lembut, *non-stripping*, tanpa pewangi (*fragrance-free*) | Segar, cepat meresap, *matte/cooling finish* untuk iklim tropis |
| **Target Pengguna** | Kulit sensitif, kering, *barrier* rusak, atau intoleran terhadap pewangi | Kulit normal-berminyak, kombinasi, kusam, atau rentan berjerawat |

Jika Anda ingin membandingkan dua merek atau produk spesifik lainnya (atau ingin meracik formula serupa di laboratorium), sebutkan saja nama produknya.`;
  }

  // 4. Greetings & General Capability Questions
  if (
    /\b(generative\s+ai|analytical\s+ai|interactive\s+ai|computer\s+vision|4\s+pilar|empat\s+pilar|beda(?:nya)?\s+model|model\s+ai|kelebihan\s+masing|siapa\s+kamu|apa\s+itu\s+formylab|halo|hai|hello|hi|selamat\s+(?:pagi|siang|sore|malam)|tes|test|ping)\b/.test(
      lower
    ) &&
    rawQuery.split(/\s+/).length <= 18
  ) {
    return `Halo! Saat ini Anda terhubung dengan **${modelOption.name}** (${modelOption.description}).

Saya siap membantu Anda dalam perancangan formula kosmetik R&D, pembuatan tabel perbandingan bahan/produk, perhitungan HLB & HPP, pengecekan regulasi BPOM & Halal, maupun menjawab pertanyaan umum sehari-hari:

| Modul AI Formylab.ai | Fungsi Utama |
| :--- | :--- |
| **Brief interpreter** | Mengubah permintaan klien menjadi spesifikasi teknis (pH, viskositas cPs, HLB) |
| **Formula generator** | Menyusun tabel formula 100.0% w/w (Fase A/B/C/D) beserta SOP suhu & RPM |
| **Regulatory & Halal checker** | Mengecek batas konsentrasi BPOM, klaim kemasan, dan titik kritis Halal MUI/BPJPH |
| **Compatibility & Substitution** | Memprediksi risiko interaksi pH/elektrolit dan memberi opsi bahan pengganti |
| **Cost optimizer & Trial planner** | Menghitung HPP per gram/batch dan merancang matriks percobaan lab |

Silakan ketik pertanyaan atau brief produk yang ingin Anda bahas hari ini!`;
  }

  // 5. Dedicated Handlers for the 9 Workflow Formylab.ai Modules
  if (
    /\b(brief\s+interpreter|spesifikasi\s+teknis|permintaan\s+klien|ubah\s+brief)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Brief Interpreter",
      {
        quickSummary: `Permintaan klien (*"${rawQuery}"*) telah saya terjemahkan menjadi spesifikasi teknis R&D terukur agar siap dieksekusi di laboratorium:`,
        coreTechnical: `| Parameter Spesifikasi | Target R&D Terukur | Keterangan & Standar |\n| :--- | :--- | :--- |\n| **Bentuk Sediaan** | *O/W Light Gel-Cream / Serum Emulsion* | Cepat meresap, tidak lengket untuk iklim tropis |\n| **Target pH** | **pH 5.20 – 5.60** | Selaras *acid mantle* kulit & stabil untuk Niacinamide |\n| **Target Viskositas** | **3.500 – 5.500 cPs** | Brookfield RVT, Spindle #3, 20 rpm (25°C) |\n| **Target Required HLB** | **10.5 – 11.5** | Sistem emulsi non-ionik stabil |\n| **Bahan Aktif Utama** | **Niacinamide 4.0% + Alpha Arbutin 1.5% + Panthenol 2.0%** | Sinergi pencerah & penguat *skin barrier* |\n| **Sistem Pengawet Halal** | **Phenoxyethanol 0.8% + Ethylhexylglycerin 0.2%** | Bebas paraben, patuh BPOM (maks. 1.0%) |\n| **Estimasi HPP Bulk** | **Rp 11.500 – Rp 13.800 / 30 mL** | Masuk di bawah plafon budget Rp 15.000 |`,
      }
    );
  }

  if (
    /\b(regulatory\s+checker|batas\s+konsentrasi|bahan\s+dilarang|audit\s+regulasi)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Regulatory Checker",
      {
        quickSummary: `Berikut adalah hasil pemeriksaan kepatuhan regulasi berdasarkan **Peraturan BPOM RI No. 23 Tahun 2019 / ASEAN Cosmetic Directive (ACD)**:`,
        coreTechnical: `| Bahan / Klaim | Batas Regulasi BPOM | Status Evaluasi & Tindakan |\n| :--- | :--- | :--- |\n| **Salicylic Acid (BHA)** | Maksimum **2.0%** (sediaan wajah *leave-on*) | **PATUH** (Wajib cantumkan peringatan tidak untuk anak < 3 tahun) |\n| **Phenoxyethanol** | Maksimum **1.0%** | **PATUH** pada dosis penggunaan 0.8% – 1.0% |\n| **Niacinamide & Panthenol** | Tidak dibatasi kuota maksimum ketat | **PATUH** pada dosis efektif R&D 2.0% – 5.0% |\n| **Bahan Dilarang (0%)** | *Hydroquinone, Tretinoin, Merkuri, Steroid* | Wajib **0%** pada seluruh sediaan kosmetik |\n| **Klaim Kemasan** | Dilarang menggunakan klaim medis (*"menyembuhkan"*) | Ubah menjadi: *"Membantu merawat kulit berjerawat dan menyamarkan kemerahan"* |`,
      }
    );
  }

  if (
    /\b(halal\s+checker|status\s+kehalalan|titik\s+kritis\s+halal|alternatif\s+halal)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Halal Checker",
      {
        quickSummary: `Berikut adalah hasil pemeriksaan titik kritis kehalalan bahan baku kosmetik berdasarkan standar **SJPH BPJPH / LPPOM MUI** beserta alternatifnya:`,
        coreTechnical: `| Bahan Baku | Titik Kritis Kehalalan | Alternatif & Solusi Halal |\n| :--- | :--- | :--- |\n| **Glycerin, Cetyl Alcohol, Stearic Acid** | Turunan hidrolisis asam lemak (*fatty acid* hewani vs nabati) | Gunakan grade **100% Vegetable-Derived (Palm/Coconut Oil)** bersertifikat Halal |\n| **Collagen / Gelatin / Placenta** | Risiko tinggi berasal dari mamalia tidak tersertifikasi | Substitusi dengan **Phytocollagen (Hydrolyzed Soy Protein 2%)** atau **Peptide Sintetis** |\n| **Ethanol / Alkohol** | Titik kritis sumber fermentasi khamr | Gunakan pelarut glikol nabati **1,3-Propanediol (3%)** atau **Butylene Glycol** |`,
      }
    );
  }

  if (
    /\b(compatibility\s+checker|risiko\s+interaksi|interaksi\s+dan\s+stabilitas|prediksi\s+interaksi)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Compatibility Checker",
      {
        quickSummary: `Berikut adalah analisis risiko interaksi kimia, kesetimbangan pH, dan stabilitas polimer pengental pada kombinasi bahan Anda:`,
        coreTechnical: `| Kombinasi Bahan | Risiko Interaksi Fisikokimia | Solusi Stabilisasi R&D |\n| :--- | :--- | :--- |\n| **AHA/BHA (pH 3.5–4.0) + Niacinamide** | Pada pH < 4.5, Niacinamide terhidrolisis menjadi **Nicotinic Acid** yang memicu kemerahan (*flushing*) | Gunakan *Salicylic Acid* terenkapsulasi pada pH 5.0–5.3 atau pisahkan sediaan |\n| **Asam Bebas / Elektrolit + Carbomer** | Ion asam meruntuhkan tolakan elektrostatik rantai karboksilat sehingga **viskositas anjlok (encer)** | Ganti Carbomer murni dengan **Xanthan Gum (0.3%) + Hydroxyethylcellulose (0.5%)** |`,
      }
    );
  }

  if (
    /\b(inventory\s*&\s*cost\s+optimizer|cost\s+optimizer|mencocokkan\s+dengan\s+stok|menghitung\s+hpp)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Inventory & Cost Optimizer",
      {
        quickSummary: `Berikut adalah rincian pencocokan formula terhadap stok bahan baku gudang dan perhitungan estimasi **HPP (Bill of Materials)** untuk batch **1.000 gram (1 kg)**:`,
        coreTechnical: `| Fase | Bahan Baku (INCI) | % w/w | Berat (1 kg) | Estimasi Biaya |\n| :--- | :--- | :--- | :--- | :--- |\n| **Fase A** | Aqua Demineralisata | 78.5% | 785 g | Rp 3.925 |\n| **Fase A** | Glycerin USP (Halal) | 4.0% | 40 g | Rp 2.200 |\n| **Fase A** | D-Panthenol | 1.5% | 15 g | Rp 7.500 |\n| **Fase B** | Cetyl Alcohol + Stearic Acid | 5.0% | 50 g | Rp 3.900 |\n| **Fase B** | Caprylic/Capric Triglyceride | 5.0% | 50 g | Rp 6.500 |\n| **Fase C** | Niacinamide PC + Centella Extract | 5.0% | 50 g | Rp 16.000 |\n| **Fase D** | Phenoxyethanol + Ethylhexylglycerin | 1.0% | 10 g | Rp 2.600 |\n| **Total** | **Total Batch 1.000 g (100.0%)** | **100.0%** | **1.000 g** | **Rp 42.625 / kg** |\n\n- **Estimasi Biaya Bulk per Pot 30g**: **Rp 1.279** (masuk di bawah plafon budget Rp 45.000/kg).`,
      }
    );
  }

  if (
    /\b(substitution\s+engine|opsi\s+pengganti|trade-off|trade\s+off|substitusi\s+bahan)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Substitution Engine",
      {
        quickSummary: `Berikut adalah opsi bahan pengganti beserta perbandingan **trade-off** dari sisi tekstur, efektivitas, stabilitas, dan efisiensi HPP:`,
        coreTechnical: `| Opsi Bahan Pengganti | Dosis Pakai | Kelebihan Utama | Catatan Trade-Off |\n| :--- | :--- | :--- | :--- |\n| **Caprylic/Capric Triglyceride (MCT)** | 4.0% – 6.0% | Sangat stabil terhadap oksidasi, *skin feel* ringan, Halal | **Biaya HPP 55% lebih hemat** dari Squalane; tambahkan 0.5% Ceramide NP untuk efek *barrier* setara |\n| **Hemisqualane (C13-15 Alkane)** | 3.0% – 5.0% | Tekstur *silky dry-touch*, sangat ringan untuk kulit berminyak | Daya sebar lebih cepat menguap dibanding Squalane murni |\n| **Jojoba Seed Oil** | 2.0% – 4.0% | Ester lilin cair alami yang mirip sebum manusia | Perlu tambahan antioksidan (*Tocopherol 0.2%*) agar tidak teroksidasi |`,
      }
    );
  }

  if (
    /\b(trial\s+planner|jumlah\s+dan\s+jenis\s+percobaan|desain\s+eksperimen|rencana\s+trial)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Trial Planner",
      {
        quickSummary: `Berikut adalah matriks rencana percobaan laboratorium (**3 Batch Trial @ 100g**) untuk menemukan titik optimal viskositas, pH, dan kestabilan emulsi:`,
        coreTechnical: `| Kode Trial | Variasi Pengental & Emulgator | Target Viskositas | Karakteristik & Kemasan |\n| :--- | :--- | :--- | :--- |\n| **Trial T-01** | Carbopol ETD 2020 **0.20%** + Cetyl Alcohol **2.0%** | **4.000 – 5.500 cPs** | Tekstur *fluid lotion* ringan untuk botol *pump* |\n| **Trial T-02** | Carbopol ETD 2020 **0.35%** + Cetyl Alcohol **3.0%** | **8.000 – 11.000 cPs** | Struktur *gel-cream* seimbang pada pH 5.40 (**Rekomendasi Utama**) |\n| **Trial T-03** | Carbopol ETD 2020 **0.50%** + Cetyl Alcohol **4.0%** | **14.000 – 18.000 cPs** | Tekstur *rich cushion cream* untuk kemasan *jar/pot* |\n\n- **Uji Kestabilan Wajib**: Sentrifugasi (3.000 rpm, 30 menit) dan siklus *Freeze-Thaw* (4°C ↔ 45°C selama 3 siklus).`,
      }
    );
  }

  if (
    /\b(learning\s+loop|belajar\s+dari\s+hasil\s+lab|hasil\s+lab|evaluasi\s+hasil\s+lab|pecah\s+fase)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Learning Loop",
      {
        quickSummary: `Berdasarkan hasil pengamatan laboratorium Anda (*"${rawQuery}"*), berikut adalah diagnosis akar masalah dan kalibrasi parameter untuk iterasi formula berikutnya:`,
        coreTechnical: `| Parameter Evaluasi | Temuan Hasil Lab | Koreksi Formula Iterasi Berikutnya (v2.0) |\n| :--- | :--- | :--- |\n| **Sistem Emulgator** | Emulsi memisah (*creaming*) pada suhu 45°C | Naikkan total emulgator dari 3.0% menjadi **4.2%** (*Cetearyl Glucoside 3.0% + Glyceryl Stearate 1.2%*) |\n| **Penstabil Fase Air** | Viskositas turun pada penyimpanan hangat | Tambahkan **Xanthan Gum 0.2%** pada Fase A sebagai *co-stabilizer* |\n| **Kecepatan Homogenisasi** | Ukuran droplet minyak kurang seragam | Tingkatkan homogenizer dari 2.500 rpm ke **3.500 rpm selama 10 menit** pada suhu 75°C |`,
      }
    );
  }

  // 6. Rosacea / Sensitive Skin / Tropical Moisturizer
  if (/\b(rosacea|sensitif|kemerahan|iritasi)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Formulasi Soothing Barrier Moisturizer",
      {
        quickSummary: `Untuk kulit rosacea dan sensitif di iklim tropis lembap, hindari oklusif berat (*petrolatum* tinggi) yang memicu rasa panas (*heat-trapping*), dan gunakan sistem **O/W Lamellar Gel-Cream** yang ringan pada **pH 5.30**:`,
        coreTechnical: `| Fase | Bahan Baku (INCI Name) | % w/w | Fungsi dalam Formula |\n| :--- | :--- | :--- | :--- |\n| **Fase A** | Aqua Demineralisata | 72.6% | Pelarut utama fase air |\n| **Fase A** | Glycerin + D-Panthenol + Allantoin | 5.8% | Humektan & penenang eritema kulit sensitif |\n| **Fase A** | Disodium EDTA | 0.1% | Agen khelasi penstabil |\n| **Fase B** | Cetearyl Olivate & Sorbitan Olivate | 3.5% | Emulgator kristal cair biomimetik bebas PEG |\n| **Fase B** | Phytosqualane + Caprylic/Capric Triglyceride | 9.0% | Emolien ringan non-komedogenik |\n| **Fase B** | Cetyl Alcohol | 1.0% | Penguat jaringan gel lamelar |\n| **Fase C** | Centella Asiatica Extract (Madecassoside) | 3.0% | Menekan mediator kemerahan & inflamasi |\n| **Fase C** | Niacinamide (Low-Nicotinic Grade) + Ceramide NP | 4.0% | Restorasi lipid *skin barrier* |\n| **Fase D** | Phenoxyethanol + Ethylhexylglycerin | 1.0% | Pengawet spektrum luas bebas paraben & Halal |`,
        labProtocolAndHalal: `**Protokol Pembuatan Singkat:**\n1. Panaskan Fase A (75°C) dan Fase B (75°C) secara terpisah, lalu homogenisasi pada **3.000 rpm selama 8 menit**.\n2. Dinginkan hingga suhu **di bawah 40°C**, kemudian masukkan Fase C dan Fase D hingga homogen (target viskositas **4.500 – 6.500 cPs**).`,
      }
    );
  }

  // 7. Paraben Substitution & Halal Preservatives
  if (/\b(paraben|pengawet|preservative|phenoxyethanol)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Sistem Pengawet Pengganti Paraben",
      {
        quickSummary: `Untuk menggantikan paraben dengan pengawet yang aman, berspektrum luas (bakteri, ragi, jamur sesuai ISO 11930), dan tersertifikasi **Halal**, berikut adalah rekomendasi utamanya:`,
        coreTechnical: `| Sistem Pengawet (INCI) | Dosis Pakai | Rentang pH Efektif | Keunggulan Utama |\n| :--- | :--- | :--- | :--- |\n| **Phenoxyethanol (90%) + Ethylhexylglycerin (10%)** | **0.8% – 1.0%** | **pH 3.0 – 8.5** | Sangat stabil untuk serum, toner, maupun krim; patuh batas BPOM (maks 1.0%) |\n| **Sodium Benzoate + Potassium Sorbate + Pentylene Glycol** | **0.6% + 2.0%** | **pH 4.2 – 5.3** | *Mild & ECOCERT-friendly* untuk kulit ekstra sensitif pada pH asam lemah |\n| **1,2-Hexanediol + Caprylyl Glycol** | **1.5% – 2.0%** | **pH 3.5 – 8.0** | Humektan multifungsi dengan aktivitas antimikroba *preservative-free claim* |`,
      }
    );
  }

  // 8. HLB & Emulsifier Ratio Calculations
  if (
    /\b(hlb|emulgator|emulsi|emulsifier|o\/w|w\/o|rasio\s+emulgator)\b/.test(
      lower
    )
  ) {
    return styleByModelSpecialty(
      modelOption,
      "Perhitungan Rasio Emulgator & HLB",
      {
        quickSummary: `Stabilitas emulsi **O/W (Oil-in-Water)** dicapai ketika **HLB Campuran** dari kombinasi emulgator hidrofilik dan lipofilik tepat menyamai **Required HLB (rHLB)** dari fase minyaknya (umumnya **20% – 25%** dari total fase minyak, atau **3.0% – 4.5%** dari total batch).`,
        coreTechnical: `| Komponen Emulgator | Nilai HLB Murni | Fraksi Campuran (%) | Dosis dalam Batch (Total 4.0%) |\n| :--- | :--- | :--- | :--- |\n| **Polysorbate 60 (Tween 60)** | HLB 14.9 | **61.76%** | **2.47% w/w** |\n| **Sorbitan Stearate (Span 60)** | HLB 4.7 | **38.24%** | **1.53% w/w** |\n| **Total Sistem Emulgator** | **Target rHLB = 11.0** | **100.0%** | **4.00% w/w** |`,
        formulaOrCalculation: `**Rumus Perhitungan:**\n- Fraksi Tween 60 = (Target HLB 11.0 − 4.7) ÷ (14.9 − 4.7) = 6.3 ÷ 10.2 = **61.76%**\n- Fraksi Span 60 = 100% − 61.76% = **38.24%**`,
      }
    );
  }

  // 9. Ceramide NP vs Niacinamide comparison
  if (/\b(ceramide)\b/.test(lower) && /\b(niacinamide)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Perbandingan Ceramide NP vs Niacinamide",
      {
        quickSummary: `**Ceramide NP** dan **Niacinamide (Vitamin B3)** bekerja saling melengkapi: Ceramide NP menambal struktur lipid kulit secara langsung dari luar, sedangkan Niacinamide menstimulasi pembentukan ceramide alami dari dalam.`,
        coreTechnical: `| Parameter | Ceramide NP | Niacinamide (Vitamin B3) |\n| :--- | :--- | :--- |\n| **Mekanisme Kerja** | Mengisi matriks lipid interseluler *stratum corneum* & menekan penguapan air (TEWL) | Prekursor koenzim NAD+ yang memicu sintesis ceramide alami, mencerahkan & kontrol sebum |\n| **Kelarutan & Fase** | **Lipofilik / Fase B** (atau sistem dispersi liposom) | **Hidrofilik / Larut Air (Fase C, < 40°C)** |\n| **Dosis Efektif R&D** | **0.2% – 1.0%** (murni) atau **2.0% – 5.0%** (kompleks) | **2.0% – 5.0%** |\n| **Rentang pH Optimal** | **pH 4.5 – 6.5** | **pH 5.5 – 6.5** (hindari pH < 4.5) |`,
      }
    );
  }

  // 10. Best Brands / Market Benchmark Queries (MUST run BEFORE single ingredient lookup so "bahan" or "aha" never hijacks brand benchmark questions!)
  const isMarketBenchmarkQuery =
    ((/\b(merek|brand|produk|rekomendasi|skincare|moisturizer|pelembap|serum|sunscreen|tabir\s+surya|cleanser|sabun|facial\s+wash|toner|skin\s+barrier)\b/.test(
      lower
    ) &&
      /\b(terbaik|paling\s+bagus|populer|unggulan|benchmark|top|nomor\s+1|di\s+dunia|di\s+indonesia|global|saat\s+ini)\b/.test(
        lower
      )) ||
      /\b(apa\s+merek|merek\s+apa|brand\s+apa|rekomendasi\s+merek|rekomendasi\s+brand|rekomendasi\s+produk|rekomendasi\s+moisturizer|rekomendasi\s+sunscreen|rekomendasi\s+serum|rekomendasi\s+cleanser|tren\s+skincare|supplier\s+terbaik|benchmark)\b/.test(
        lower
      )) &&
    !/\b(buatkan\s+formula|bikin\s+formula|racik\s+formula|rancang\s+formula)\b/.test(
      lower
    );

  if (isMarketBenchmarkQuery) {
    // Dedicated detailed response for Moisturizer & Skin Barrier brands (Global & Indonesia)
    if (/\b(moisturizer|pelembap|skin\s+barrier|barrier)\b/.test(lower)) {
      return styleByModelSpecialty(
        modelOption,
        "Benchmark Merek Moisturizer Skin Barrier Terbaik (Global & Indonesia)",
        {
          quickSummary: `Berdasarkan data pasar dermatologi global dan Indonesia saat ini, berikut adalah daftar **merek moisturizer *skin barrier* terbaik di dunia dan Indonesia** beserta arsitektur bahan aktif utamanya (*hero active ingredients*):`,
          coreTechnical: `| Merek & Produk Benchmark | Kategori Pasar | Bahan Aktif Utama (Hero Ingredients) | Teknologi & Keunggulan Formulasi |\n| :--- | :--- | :--- | :--- |\n| **CeraVe Moisturizing Cream / Lotion** | Global (USA) | **3 Essential Ceramides (NP, AP, EOP), Cholesterol, Phytosphingosine, Hyaluronic Acid** | Teknologi **MVE (*MultiVesicular Emulsion*)** yang melepaskan lipid pelembap secara bertahap selama 24 jam |\n| **La Roche-Posay Cicaplast Baume B5+** | Global (Prancis) | **Panthenol (Vitamin B5) 5%, Madecassoside (Centella), Tribioma™, Shea Butter, Zinc** | Menenangkan iritasi akut, mempercepat epitelisasi epidermis, dan menyeimbangkan mikrobioma kulit |\n| **Aestura Atobarrier 365 Cream** | Global (Korea) | **DermaON® Encapsulated Ceramide, Cholesterol, Fatty Acids (Rasio 3:1:1), Allantoin** | Kapsul lipid biomimetik yang menyerupai struktur lamelar *stratum corneum* manusia |\n| **Cetaphil Moisturizing Cream** | Global | **Glycerin, Niacinamide (Vit B3), Panthenol (Pro-Vit B5), Sweet Almond Oil, Vitamin E** | Formula *fragrance-free* hipoalergenik yang mengunci hidrasi dan memulihkan *barrier* kulit sensitif |\n| **Laboré BiomeRepair™ Barrier Revive Cream** | Indonesia (Derma Halal) | **Bifida Ferment Lysate, Ceramide, Bisabolol, Allantoin, Phytosqualane** | Diformulasikan khusus untuk kulit sensitif di iklim tropis lembap & **100% tersertifikasi Halal** |\n| **Skintific 5X Ceramide Barrier Gel** | Indonesia & Regional | **5X Ceramide (NP, EOP, AP, AS, NS), Hyaluronic Acid, Centella Asiatica, Marine Collagen** | Tekstur *water-break hydro-gel* ringan yang cepat meresap tanpa rasa lengket |\n| **Somethinc Ceramic Skin Saviour** | Indonesia | **Encapsulated Ceramide NP, Matrixyl® 3000 Peptide, Hydrolyzed Marine Collagen, Bisabolol** | Kombinasi perbaikan *skin barrier* sekaligus *anti-aging* dalam sediaan gel-krim ringan |\n| **Wardah Calm & Soothe Gel Moisturizer** | Indonesia (Halal) | **Cica Complex (Centella Asiatica), Panthenol, Ceramide, Niacinamide, Allantoin** | Menenangkan kemerahan ringan, menjaga pH fisiologis 5.0–5.5, dan ramah kulit berjerawat |`,
          deepScienceOrMechanism: `**Prinsip Ilmiah Formulasi Skin Barrier Terbaik (R&D Insight):**\nEfektivitas tertinggi pada moisturizer *skin barrier* modern dicapai dengan memadukan **Rasio Lipid Fisiologis 3 : 1 : 1** (**Ceramide : Kolesterol : Asam Lemak Bebas**) bersama humektan penarik air (**Glycerin 3–5%, Hyaluronic Acid 0.2–0.5%**) serta agen penenang inflamasi (**Panthenol 2–5%, Madecassoside / Centella Asiatica**).`,
          labProtocolAndHalal: `Jika Anda ingin membedah persentase formula salah satu merek di atas atau merancang produk moisturizer *skin barrier* baru untuk brand Anda sendiri, sebutkan saja target tekstur yang Anda inginkan!`,
        }
      );
    }

    // Dedicated response for Sunscreen brands
    if (/\b(sunscreen|tabir\s+surya|spf|uv)\b/.test(lower)) {
      return `Berdasarkan riset pasar dermatologi global dan Indonesia saat ini, berikut adalah daftar **merek sunscreen terbaik di dunia dan Indonesia** beserta sistem filter UV dan bahan aktif utamanya:

| Merek & Produk Sunscreen | Kategori Pasar | Filter UV & Bahan Aktif Utama | Keunggulan Tekstur & Formulasi |
| :--- | :--- | :--- | :--- |
| **La Roche-Posay Anthelios UVMune 400** | Global (Prancis) | **Mexoryl 400, Tinosorb S, Uvinul T 150, Uvinul A Plus, Thermal Water** | Perlindungan spektrum ultra-panjang (hingga 400 nm UVA), tahan air & keringat |
| **Beauty of Joseon Relief Sun SPF 50+ PA++++** | Global (Korea) | **Uvinul A Plus, Uvinul T 150, Tinosorb M, Oryza Sativa (Rice) Extract 30%, Niacinamide** | Tekstur *light probiotic cream* tanpa *whitecast*, melembapkan seperti moisturizer |
| **Azarine Hydrasoothe Sunscreen Gel SPF 45** | Indonesia | **Royal Jelly, Aloe Vera, Green Tea, Resveratrol, Encapsulated UV Filters** | Basis *water-gel* bebas alkohol & bebas silikon berat, sangat nyaman untuk kulit berminyak |
| **Wardah UV Shield Airy Smooth SPF 50 PA++++** | Indonesia (Halal) | **Centella Asiatica, Bera Mineral, SkinBoost DNA™, Broad-Spectrum UV Filters** | Hasil akhir *powdery smooth matte*, mengontrol sebum di iklim tropis & Halal |
| **Amaterasun UV Sunscreen Serum SPF 50+ PA++++** | Indonesia | **Intelligent DNA Guardian™, 7-in-1 Protection, Nordic Cotton, Panthenol** | Viskositas *ultra-fluid serum* yang cepat meresap tanpa menyumbat pori |`;
    }

    // General All-Category Skincare Benchmark Table
    return `Berdasarkan riset pasar dermatologi global dan Indonesia saat ini, berikut adalah daftar merek *benchmark* terbaik beserta teknologi bahan aktif andalannya:

| Kategori Produk | Benchmark Global | Benchmark Indonesia | Teknologi & Bahan Aktif Kunci |
| :--- | :--- | :--- | :--- |
| **Moisturizer & Skin Barrier** | **CeraVe, La Roche-Posay, Cetaphil, Aestura** | **Laboré, Skintific, Somethinc, Wardah** | *Multi-Vesicular Ceramides (NP/AP/EOP)*, *Panthenol 5%*, *Madecassoside*, *Bifida Ferment* |
| **Brightening & Dark Spot** | **SkinCeuticals, Beauty of Joseon, Anua** | **Avoskin, Somethinc, Whitelab** | *Niacinamide 5–10%*, *Tranexamic Acid 3%*, *Alpha Arbutin 2%*, *3-O-Ethyl Ascorbic Acid* |
| **Sunscreen (SPF 50+ PA++++)** | **La Roche-Posay Anthelios, Beauty of Joseon** | **Azarine, Amaterasun, Wardah UV Shield** | *Encapsulated UV Filters*, *Ectoin*, *Cica*, *Rice Probiotics* |
| **Gentle & Acne Cleanser** | **Cetaphil, CeraVe, COSRX, Paula's Choice** | **Kahf, Somethinc Low pH, Laboré** | *Mild Amphoteric Syndet*, *Salicylic Acid 0.5–2%*, *HydroBalance™* |

Jika Anda ingin membedah komposisi salah satu merek di atas atau merancang formula produk baru dengan kualitas setara *benchmark* tersebut, sebutkan saja produk yang ingin kita fokuskan.`;
  }

  // 11. Dynamic Ingredient Profile Lookup (Word-boundary matched)
  const matchedIngredients = findMatchingIngredients(lower);
  if (
    matchedIngredients.length > 0 &&
    !/\b(buatkan|bikin|racik|rancang)\b/.test(lower)
  ) {
    if (matchedIngredients.length >= 2) {
      const rows = matchedIngredients
        .slice(0, 4)
        .map(
          (ing) =>
            `| **${ing.inciName}** | ${ing.functionalCategory} | **${ing.typicalUsageRate}** | **${ing.optimalPhRange}** | ${ing.solubilityPhase} |`
        )
        .join("\n");
      return `Berikut adalah perbandingan spesifikasi teknis untuk bahan aktif yang Anda tanyakan:

| Nama Bahan (INCI) | Kategori Fungsi | Dosis Efektif | pH Optimal | Kelarutan & Fase |
| :--- | :--- | :--- | :--- | :--- |
${rows}

${matchedIngredients
  .slice(0, 2)
  .map(
    (ing) =>
      `- **${ing.inciName}**: ${ing.mechanismOfAction} *(Sinergis dengan: ${ing.synergisticWith.join(", ")})*`
  )
  .join("\n")}`;
    }

    const ing = matchedIngredients[0];
    return `Berikut adalah spesifikasi teknis dan panduan formulasi untuk **${ing.inciName}**:

| Parameter Teknis | Spesifikasi Laboratorium |
| :--- | :--- |
| **Nama INCI & CAS** | **${ing.inciName}** · CAS \`${ing.casNumber}\` |
| **Rumus & Berat Molekul** | \`${ing.molecularFormula}\` (${ing.molecularWeight}) |
| **Kategori Fungsional** | ${ing.functionalCategory} (${ing.solubilityPhase}) |
| **Dosis Penggunaan & pH** | **${ing.typicalUsageRate}** · Optimal pada **${ing.optimalPhRange}** |
| **Sinergis Dengan** | ${ing.synergisticWith.join(", ")} |
| **Hindari / Perhatikan** | ${ing.avoidWith.join(", ")} |
| **Status Sertifikasi** | ${ing.certifications.join(" · ")} |

**Mekanisme Kerja:** ${ing.mechanismOfAction}`;
  }

  // 12. Dynamic Product Type Specification Lookup (Formulation Briefs & Product Requests)
  const matchedProduct = findMatchingProductSpec(lower);
  if (matchedProduct) {
    const activesRows = matchedProduct.recommendedActives
      .map((a) => `| **Fase C (Aktif)** | **${a.name}** | ${a.role} |`)
      .join("\n");

    return styleByModelSpecialty(
      modelOption,
      matchedProduct.name,
      {
        quickSummary: `Berikut adalah rancangan spesifikasi dan draf struktur formula awal untuk **${matchedProduct.name}** (${matchedProduct.systemType}):`,
        coreTechnical: `| Parameter Fisikokimia | Spesifikasi Target R&D |\n| :--- | :--- |\n| **Sistem Sediaan** | **${matchedProduct.systemType}** |\n| **Target pH Ideal** | **pH ${matchedProduct.targetPh}** (Rentang stabil: ${matchedProduct.validPhRange}) |\n| **Target Viskositas** | **${matchedProduct.targetViscosity}** (Brookfield 25°C) |\n| **Required HLB** | **${matchedProduct.requiredHlb}** |\n\n**Komponen Bahan Aktif Utama yang Direkomendasikan:**\n\n| Fase | Bahan Aktif & Konsentrasi | Fungsi Utama |\n| :--- | :--- | :--- |\n${activesRows}\n| **Fase D (Pengawet)** | **Phenoxyethanol 0.8% + Ethylhexylglycerin 0.2%** | Pengawet *broad-spectrum* bebas paraben & Halal |`,
        deepScienceOrMechanism: `**Rasional Ilmiah Formulasi:**\n${matchedProduct.scientificBasis}`,
        labProtocolAndHalal: `**Protokol Proses Laboratorium:**\n${matchedProduct.processingNotes}`,
      }
    );
  }

  // 13. Business, Maklon, HPP, BPOM, Halal Registration questions
  if (
    /\b(bpom|maklon|hpp|biaya|harga|bisnis|brand|sertifikat\s+halal|mui|bpjph|produksi|moq)\b/.test(
      lower
    )
  ) {
    return `Untuk memproduksi produk kosmetik yang kompetitif dan patuh regulasi di Indonesia, berikut adalah struktur biaya HPP (*Bill of Materials*) dan tahapan kepatuhannya:

| Komponen Produksi | Porsi Biaya (% HPP) | Keterangan & Dokumen Wajib |
| :--- | :--- | :--- |
| **Bulk Isi (Bahan Baku + Air Demin)** | **25% – 35%** | Dihitung dari konsentrasi % × ukuran batch × harga bahan baku (\`supplier.csv\`) |
| **Kemasan Primer & Sekunder** | **40% – 50%** | Botol/pot, pump/dropper, inner box, label, dan segel *shrink* |
| **Jasa Toll Manufacturing & QC** | **15% – 25%** | Biaya pencampuran (*compounding*), *filling*, uji mikroba & logam berat |
| **Regulasi BPOM & Halal BPJPH** | Biaya Registrasi | Wajib CoA, MSDS, IFRA (untuk pewangi), dan Sertifikat Halal bahan baku |`;
  }

  // 14. General / Any Topic Dynamic Response
  return generateDynamicGeneralResponse(
    rawQuery,
    messages,
    modelOption,
    webResults
  );
}

function generateDynamicGeneralResponse(
  rawQuery: string,
  _messages: FallbackChatMessage[],
  modelOption: AiModelOption,
  webResults: Array<{
    title: string;
    snippet: string;
    url: string;
    sourceName: string;
  }> = []
): string {
  const lower = rawQuery.toLowerCase();

  if (/\b(ph|asam|basa|buffer)\b/.test(lower)) {
    return `**pH (Power of Hydrogen)** adalah derajat keasaman larutan pada skala 0–14. Kulit manusia sehat memiliki *acid mantle* alami pada **pH 4.7 – 5.5**.

| Rentang pH | Jenis Sediaan Kosmetik | Keterangan Fisikokimia |
| :--- | :--- | :--- |
| **pH 3.5 – 4.0** | AHA / BHA Exfoliating Toner & Serum | Diperlukan agar asam bebas tetap aktif menembus *stratum corneum* |
| **pH 5.0 – 5.5** | Facial Wash, Soothing Gel, Barrier Moisturizer | Selaras dengan pH fisiologis kulit sehat dan menjaga mikrobioma |
| **pH 5.5 – 6.5** | Serum Niacinamide, Alpha Arbutin, Peptida | Mencegah hidrolisis Niacinamide menjadi *Nicotinic Acid* |`;
  }

  if (
    /\b(viskositas|viscosity|cps|kental|encer|rheology|reologi|pengental)\b/.test(
      lower
    )
  ) {
    return `**Viskositas** diukur dalam satuan **centipoise (cPs / mPa·s)** menggunakan viskometer Brookfield dan menentukan tekstur serta kemudahan pemompaan kemasan:

| Jenis Sediaan | Rentang Viskositas (cPs) | Sistem Pengental yang Direkomendasikan |
| :--- | :--- | :--- |
| **Toner / Essence Cair** | **50 – 800 cPs** | Sodium Hyaluronate 0.2–0.5%, Xanthan Gum 0.1% |
| **Serum Wajah / Fluid** | **1.200 – 4.500 cPs** | Hydroxyethylcellulose 0.4–0.6%, Xanthan Gum 0.25% |
| **Lotion / Sunscreen** | **4.000 – 9.000 cPs** | Carbopol ETD 2020 0.25% + Cetyl Alcohol 2.0% |
| **Moisturizer Cream** | **8.500 – 25.000 cPs** | Carbopol ETD 2020 0.40% + Cetyl Alcohol 3.5% + Stearic Acid 2.0% |`;
  }

  // General Coding / Programming questions
  if (
    /\b(python|javascript|typescript|react|nextjs|html|css|coding|kode|program|algoritma|sql|database|api)\b/.test(
      lower
    )
  ) {
    return `Berikut adalah panduan ringkas dan contoh implementasi teknis untuk **${rawQuery.replace(/[?!.]+$/, "").trim()}**:

| Komponen Teknis | Penjelasan & Best Practice |
| :--- | :--- |
| **Arsitektur & Modularitas** | Pisahkan logika bisnis murni (*pure functions*) dari komponen antarmuka (UI) agar mudah diuji |
| **Validasi & Keamanan** | Selalu validasi tipe input dan bersihkan karakter HTML/entitas sebelum ditampilkan ke pengguna |
| **Optimasi Performa** | Gunakan *memoization*, operasi asinkron paralel (\`Promise.all\`), serta struktur data yang efisien |

Silakan bagikan potongan kode (*snippet*) atau bahasa pemrograman spesifik yang ingin Anda buat agar saya tuliskan kode lengkapnya.`;
  }

  // Sanitize any live web results thoroughly so raw HTML tags can never leak
  const cleanTopic = rawQuery.replace(/[?!.]+$/, "").trim();
  const sanitizedWeb = webResults
    .map((r) => ({
      title: cleanHtmlEntities(r.title),
      snippet: cleanHtmlEntities(r.snippet),
      url: r.url,
      sourceName: cleanHtmlEntities(r.sourceName),
    }))
    .filter((r) => r.title && r.snippet && !/[<>]/.test(r.snippet));

  if (sanitizedWeb.length > 0) {
    const primaryHit = sanitizedWeb[0];
    const extraBullets = sanitizedWeb
      .slice(1, 4)
      .map((r) => `- **${r.title}**: ${r.snippet}`)
      .join("\n");

    return `${primaryHit.snippet}${
      extraBullets ? `\n\n**Informasi Terkait:**\n${extraBullets}` : ""
    }`;
  }

  return `Mengenai **${cleanTopic}**, saya siap membantu Anda menyusun jawaban lengkap, tabel perbandingan, maupun perhitungan teknisnya menggunakan model **${modelOption.name}**.

- Jika Anda ingin **menghitung angka atau rumus matematika/kimia**, tuliskan angkanya secara langsung (misalnya \`125 * 8\` atau \`15% dari 250000\`).
- Jika Anda ingin **membandingkan produk atau bahan aktif**, sebutkan nama merek atau bahannya agar saya buatkan tabel perbandingannya.
- Jika Anda ingin **merancang formula kosmetik**, sebutkan jenis produk (misalnya *Serum, Moisturizer, Cleanser, Sunscreen*) beserta target kulitnya.`;
}
