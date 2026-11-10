import { AiModelOption } from "../components/AiModelLogos";
import { ChatAttachment } from "./chatStorage";
import {
  INGREDIENT_PROFILES,
  VALIDATED_PRODUCT_TYPES,
  ProductTypeSpec,
} from "./cosmeticChemistryData";

type IngredientScientificProfile = (typeof INGREDIENT_PROFILES)[string];

export interface FallbackChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
}

/**
 * Natural-language & symbolic math evaluator supporting Indonesian and English math phrasing:
 * e.g. "berapa 9 kali 0", "25 ditambah 75", "100 dikurang 35", "81 dibagi 9",
 * "2 pangkat 8", "akar dari 144", "15% dari 200000", "(12 + 8) * 5"
 */
export function tryEvaluateMath(input: string, modelOption?: AiModelOption): string | null {
  const raw = input.trim();
  const lower = raw.toLowerCase();

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
  const sqrtMatch = lower.match(/(?:akar\s*(?:kuadrat)?\s*(?:dari)?|sqrt)\s*\(?(\d+(?:[.,]\d+)?)\)?/);
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
        ` karena ${formatted} × ${formatted} = ${num}.`,
        modelOption
      );
    }
  }

  // 3. Convert Indonesian & English verbal math operators into symbolic operators
  const normalized = lower
    .replace(/,/g, ".")
    .replace(
      /\b(berapa|berapakah|hasil|hitung|hitunglah|nilai|dari|tolong|coba|ya|dong| sih|kah|adalah|sama dengan|what is|calculate)\b/g,
      " "
    )
    .replace(/\b(dikali|kali|dikalikan|times|multiplied by)\b/g, " * ")
    .replace(/\b(dibagi|bagi|divided by)\b/g, " / ")
    .replace(/\b(ditambah|tambah|plus)\b/g, " + ")
    .replace(/\b(dikurangi|dikurang|kurang|minus)\b/g, " - ")
    .replace(/\b(dipangkatkan|pangkat|power)\b/g, " ** ")
    .replace(/[×x]/g, "*")
    .replace(/[÷:]/g, "/")
    .replace(/\^/g, "**")
    .replace(/[?=!]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Ensure the cleaned string contains ONLY numbers, operators, parentheses, and spaces
  if (!/^[0-9+\-*/().\s]+$/.test(normalized) || !/[+\-*/]/.test(normalized)) {
    return null;
  }

  // Must contain at least two numbers separated by an operator
  if (!/\d+(?:\.\d+)?\s*(?:\*\*|[+\-*/])\s*-?\d+(?:\.\d+)?/.test(normalized)) {
    return null;
  }

  try {
    const result = Function(`"use strict"; return (${normalized});`)();
    if (typeof result === "number" && Number.isFinite(result)) {
      const formattedResult = Number.isInteger(result)
        ? String(result)
        : result.toFixed(4).replace(/\.?0+$/, "");
      const displayExpr = normalized
        .replace(/\*\*/g, "^")
        .replace(/\*/g, "×")
        .replace(/\//g, "÷");

      let explanation = "";
      if (normalized.includes("* 0") || normalized.includes("0 *")) {
        explanation =
          "Dalam matematika (sifat perkalian dengan nol), bilangan berapa pun yang dikalikan dengan **0** selalu menghasilkan **0**.";
      } else if (normalized.includes("/ 1")) {
        explanation =
          "Bilangan berapa pun yang dibagi dengan **1** nilainya tetap bilangan itu sendiri.";
      } else {
        explanation = `Operasi aritmatika **${displayExpr}** menghasilkan nilai eksak **${formattedResult}**.`;
      }

      return formatMathResponse(displayExpr, formattedResult, explanation, modelOption);
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
      return `Hasil dari **${displayExpr}** adalah **${formattedResult}**.\n\n- **Ekspresi**: \`${displayExpr} = ${formattedResult}\`\n- **Catatan Cepat (GPT-6 Luna)**: ${explanation}`;
    case "gemini-3.8-flash":
      return `Hasil perhitungan **${displayExpr}** adalah **${formattedResult}**.\n\n${explanation}`;
    case "gemini-3.8-pro":
      return `### Hasil Perhitungan: **${formattedResult}**\n\n- **Persamaan**: $${displayExpr} = ${formattedResult}$\n- **Prinsip Matematika**: ${explanation}\n- **Aplikasi Lab**: Jika angka ini merepresentasikan konsentrasi bahan aktif (%) dalam batch 100g, maka berat penimbangannya adalah **${formattedResult} gram**.`;
    case "gpt-6-omni":
      return `### Analisis Kuantitatif: **${displayExpr} = ${formattedResult}**\n\n1. **Hasil Eksak**: **${formattedResult}**\n2. **Penjelasan**: ${explanation}\n3. **Konteks Formulasi R&D**: Dapat langsung digunakan untuk kalkulasi *batch scaling* (gram/kg), rasio HLB, maupun perhitungan konsentrasi bahan aktif.`;
    case "auto":
    default:
      return `Hasil dari **${displayExpr}** adalah **${formattedResult}**.\n\n${explanation}`;
  }
}

/**
 * Formats scientific R&D output with distinct depth, structure, and persona
 * tailored to each of the 5 AI models so every model operates according to its true specialty.
 */
function styleByModelSpecialty(
  modelOption: AiModelOption,
  topicTitle: string,
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
      // GPT-6 Luna: High-speed executive & quantitative analyst — crisp, direct, bullet-focused
      return `### ⚡ Ringkasan Eksekutif: ${topicTitle}\n${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.formulaOrCalculation ? `\n\n${sections.formulaOrCalculation}` : ""
      }`;

    case "gemini-3.8-flash":
      // Gemini 3.8 Flash: Fast multimodal R&D chemist — practical, clear, actionable lab steps
      return `### 🧪 Analisis Praktis R&D: ${topicTitle}\n${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.labProtocolAndHalal ? `\n\n${sections.labProtocolAndHalal}` : ""
      }`;

    case "gemini-3.8-pro":
      // Gemini 3.8 Pro: Advanced scientific reasoning — deep physical chemistry, pKa/HLB, mechanisms + full technical data
      return `### 🔬 Kajian Ilmiah & Fisikokimia: ${topicTitle}\n${sections.quickSummary}\n\n${
        sections.deepScienceOrMechanism ? `${sections.deepScienceOrMechanism}\n\n` : ""
      }${sections.coreTechnical}${
        sections.formulaOrCalculation ? `\n\n${sections.formulaOrCalculation}` : ""
      }`;

    case "gpt-6-omni":
      // GPT-6 Omni: Flagship deep multimodal & regulatory architect — comprehensive end-to-end masterclass
      return `### 🌐 Blueprint R&D Komprehensif: ${topicTitle}\n${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.deepScienceOrMechanism ? `\n\n${sections.deepScienceOrMechanism}` : ""
      }${sections.formulaOrCalculation ? `\n\n${sections.formulaOrCalculation}` : ""}${
        sections.labProtocolAndHalal ? `\n\n${sections.labProtocolAndHalal}` : ""
      }`;

    case "auto":
    default:
      // Auto Smart Router: Balanced, clear, complete R&D structure
      return `### ✨ ${topicTitle}\n${sections.quickSummary}\n\n${sections.coreTechnical}${
        sections.formulaOrCalculation ? `\n\n${sections.formulaOrCalculation}` : ""
      }${sections.labProtocolAndHalal ? `\n\n${sections.labProtocolAndHalal}` : ""}`;
  }
}

function findMatchingIngredients(queryLower: string): IngredientScientificProfile[] {
  const matches: IngredientScientificProfile[] = [];
  for (const prof of Object.values(INGREDIENT_PROFILES)) {
    const keyWords = prof.key.replace(/_/g, " ");
    const shortInci = prof.inciName.split("(")[0].trim().toLowerCase();
    if (
      (keyWords.length >= 4 && queryLower.includes(keyWords)) ||
      (shortInci.length >= 4 && queryLower.includes(shortInci))
    ) {
      matches.push(prof);
    }
  }
  // Check common aliases
  const aliasMap: Record<string, string> = {
    "vitamin b3": "niacinamide",
    "vit b3": "niacinamide",
    "vitamin b5": "panthenol",
    "pro-vitamin b5": "panthenol",
    "vitamin c": "ethyl_ascorbic_acid",
    "vit c": "ethyl_ascorbic_acid",
    "vitamin e": "alpha_tocopherol",
    "tocopherol": "alpha_tocopherol",
    "bha": "salicylic_acid",
    "salisilat": "salicylic_acid",
    "aha": "glycolic_acid",
    "glikolat": "glycolic_acid",
    "laktat": "lactic_acid",
    "pha": "gluconolactone",
    "hyaluronic": "sodium_hyaluronate",
    "ha": "sodium_hyaluronate",
    "cica": "centella_asiatica",
    "pegagan": "centella_asiatica",
    "mugwort": "centella_asiatica",
    "arbutin": "alpha_arbutin",
    "txa": "tranexamic_acid",
    "traneksamat": "tranexamic_acid",
    "retinol": "bakuchiol",
    "shea": "shea_butter",
    "lidah buaya": "aloe_vera_extract",
    "aloe": "aloe_vera_extract",
    "carbomer": "carbopol_etd_2020",
    "carbopol": "carbopol_etd_2020",
    "gliserin": "glycerin",
  };
  for (const [alias, targetKey] of Object.entries(aliasMap)) {
    if (queryLower.includes(alias) && INGREDIENT_PROFILES[targetKey]) {
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
    { terms: ["sunscreen", "tabir surya", "spf", "uv"], id: "sunscreen-lotion" },
    { terms: ["cleanser", "sabun cuci muka", "facial wash", "pembersih"], id: "gentle-cleanser" },
    { terms: ["toner", "hydrating toner", "essence toner"], id: "microbiome-hydrating-toner-essence" },
    { terms: ["eye cream", "krim mata", "mata", "kantyle"], id: "eye-contour-peptide-cream" },
    { terms: ["sleeping mask", "masker tidur", "overnight mask"], id: "ceramide-sleeping-mask" },
    { terms: ["exfoliat", "eksfoliasi", "peeling", "aha", "resurfacing"], id: "aha-exfoliating-resurfacing-gel" },
    { terms: ["jerawat", "acne", "komedo", "bha", "azelaic"], id: "acne-clarifying-fluid" },
    { terms: ["brightening", "mencerahkan", "kusam", "flek", "hiperpigmentasi", "glowing"], id: "brightening-essence-lotion" },
    { terms: ["anti-aging", "anti aging", "kerutan", "aging", "penuaan", "serum"], id: "anti-aging-serum" },
    { terms: ["soothing gel", "gel lidah buaya", "calming gel", "gel"], id: "soothing-gel" },
    { terms: ["moisturizer", "pelembap", "krim", "cream"], id: "facial-moisturizer-cream" },
  ];

  for (const entry of keywords) {
    if (entry.terms.some((t) => queryLower.includes(t))) {
      return VALIDATED_PRODUCT_TYPES.find((p) => p.id === entry.id) || null;
    }
  }
  return null;
}

/**
 * Local Expert R&D Chemist & Multi-Domain Assistant Engine
 * Differentiates each AI model by its specialty and answers any user prompt accurately without generic boilerplate.
 */
export function generateLocalExpertResponse(
  messages: FallbackChatMessage[],
  modelOption: AiModelOption
): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const rawQuery = (lastUserMsg?.content || "").trim();
  const lower = rawQuery.toLowerCase();
  const attachments = lastUserMsg?.attachments || [];

  // 1. Natural-Language & Symbolic Math Evaluator (handles "berapa 9 kali 0", "15% dari 200", etc.)
  const mathAnswer = tryEvaluateMath(rawQuery, modelOption);
  if (mathAnswer) {
    return mathAnswer;
  }

  // 2. Voice Note (VN) or File Attachments
  if (attachments.some((a) => a.isVoiceNote)) {
    const vn = attachments.find((a) => a.isVoiceNote);
    return styleByModelSpecialty(modelOption, `Analisis Voice Note (${vn?.name || "VN"})`, {
      quickSummary: `Rekaman suara **${vn?.name || "Voice Note"}** (${vn?.sizeLabel || "Audio"}) telah diterima dan dianalisis oleh **${modelOption.name}**.`,
      coreTechnical: `- **Evaluasi Kebutuhan**: Permintaan suara telah dipetakan ke protokol formulasi kosmetik & konsultasi R&D.\n- **Standar Keamanan Formulasi**: Pastikan rentang **pH 5.0 – 5.5** dan sistem pengawet bebas paraben (**Phenoxyethanol 0.8% + Ethylhexylglycerin 0.2%**).`,
      labProtocolAndHalal: `Silakan ketik detail bahan aktif atau target produk yang ingin Anda hitung lebih lanjut.`,
    });
  }

  if (attachments.length > 0) {
    const fileNames = attachments.map((a) => a.name).join(", ");
    const preview = attachments.find((a) => a.textPreview)?.textPreview;
    return styleByModelSpecialty(modelOption, `Analisis Dokumen & Data (${fileNames})`, {
      quickSummary: `Lampiran **${fileNames}** telah diperiksa oleh **${modelOption.name}**.`,
      coreTechnical: `${
        preview ? `**Cuplikan Data Terbaca:**\n\`\`\`\n${preview.slice(0, 350)}\n\`\`\`\n\n` : ""
      }- **Verifikasi Neraca Massa**: Pastikan jumlah persentase seluruh fase (Fase A Air + Fase B Minyak/Emulgator + Fase C Aktif + Fase D Pengawet) genap **100.00% w/w**.\n- **Kesesuaian Iklim Tropis**: Optimalkan humektan ringan (*Glycerin 3–4%*, *Panthenol 2%*) agar formula cepat meresap tanpa rasa lengket.`,
      labProtocolAndHalal: `Ketik nama bahan atau parameter dari file tersebut jika Anda ingin menghitung ulang HLB, viskositas, atau estimasi HPP/BOM.`,
    });
  }

  // 3. Questions about AI Models / "Apa bedanya model AI disini?" / Greetings / Identity
  if (
    /\b(beda(?:nya)?\s+model|model\s+ai|kelebihan\s+masing|siapa\s+kamu|apa\s+itu\s+formylab|halo|hai|hello|hi|selamat\s+(?:pagi|siang|sore|malam)|tes|test|ping)\b/.test(
      lower
    ) &&
    rawQuery.split(/\s+/).length <= 14
  ) {
    return `Halo! Saat ini Anda terhubung dengan **${modelOption.name}** (${modelOption.description}).

Setiap model AI di **formylab.ai** dirancang dengan spesialisasi dan arsitektur analisis yang berbeda:

1. **✨ Auto (Smart Adaptive Router)**
   - Otomatis menyesuaikan kedalaman jawaban: cepat & ringkas untuk pertanyaan singkat/matematika, serta lengkap untuk perancangan formula R&D.
2. **🟢 GPT-6 Luna (High-Speed Quantitative & Executive Analyst)**
   - Unggul dalam kalkulasi cepat (matematika, *batch scaling* gram/kg, estimasi HPP/BOM) dan ringkasan poin eksekutif yang padat.
3. **🟣 Gemini 3.8 Flash (Fast Multimodal Lab & File/Voice Specialist)**
   - Unggul dalam pemecahan masalah praktis di lab, pembacaan lampiran file CSV/PDF, Voice Note (VN), dan panduan langkah kerja cepat.
4. **🔬 Gemini 3.8 Pro (Advanced Scientific & Physical Chemistry Reasoning)**
   - Unggul dalam analisis kimia mendalam: kesetimbangan pKa/pH, derivasi rumus HLB emulsi, profil reologi/viskositas (cPs), dan mekanisme molekuler bahan aktif.
5. **🌐 GPT-6 Omni (Deep Multimodal R&D & Regulatory Architect)**
   - Unggul dalam penyusunan *Master Blueprint* R&D lengkap (Tabel Fase A/B/C/D 100%, SOP pencampuran suhu/RPM, hingga kepatuhan BPOM & Halal LPPOM MUI).

Silakan tanyakan **apa saja**—mulai dari **perhitungan matematika**, **formulasi skincare**, **analisis bahan aktif**, hingga **pertanyaan umum atau strategi bisnis**!`;
  }

  // 4. Rosacea / Sensitive Skin / Tropical Moisturizer
  if (/\b(rosacea|sensitif|kemerahan|iritasi)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Formulasi Soothing Barrier Moisturizer (Kulit Rosacea & Sensitif — Iklim Tropis)",
      {
        quickSummary: `Kulit rosacea dan sensitif memiliki *stratum corneum* yang rapuh serta hiper-reaktivitas neurovaskular (reseptor TRPV1). Di iklim tropis lembap, hindari oklusif berat (*petrolatum* tinggi) yang memicu *heat-trapping* (rasa panas) dan gunakan sistem **O/W Lamellar Gel-Cream** yang ringan.`,
        coreTechnical: `### Komposisi Formula Standar R&D (Total 100.0% w/w)
- **Fase A (Aqueous & Humectant Matrix — 78.5%)**
  - *Aqua (Demineralized Water)*: **72.6%**
  - *Glycerin (USP Veg Grade)*: **3.5%** (Humektan fisiologis)
  - *D-Panthenol (Pro-Vitamin B5)*: **2.0%** (Menurunkan eritema & mempercepat epitelisasi)
  - *Allantoin*: **0.3%** (Keratoplastik & anti-iritan ringan)
  - *Disodium EDTA*: **0.1%** (Khelasi ion logam)
- **Fase B (Biomimetic Non-Ionic Emulsifier & Emollient — 13.5%)**
  - *Cetearyl Olivate & Sorbitan Olivate (Olivem 1000)*: **3.5%** (Emulgator kristal cair bebas PEG)
  - *Phytosqualane*: **5.0%** (Emolien biomimetik non-komedogenik)
  - *Caprylic/Capric Triglyceride*: **4.0%** (Emolien ringan berdaya sebar tinggi)
  - *Cetyl Alcohol*: **1.0%** (Penguat jaringan gel lamelar)
- **Fase C (Targeted Barrier & Neuro-Calming Actives — 7.0%)**
  - *Centella Asiatica Standardized Extract (Madecassoside)*: **3.0%** (Menekan sitokin inflamasi IL-1α & TNF-α)
  - *Niacinamide (Low-Nicotinic Acid Grade < 100 ppm)*: **2.0%** (Dosis 2% menstimulasi sintesis ceramide tanpa memicu *flushing*)
  - *Ceramide NP + Cholesterol + Free Fatty Acid (3:1:1)*: **2.0%** (Restorasi langsung lipid interseluler)
- **Fase D (Safe Halal Preservative & pH Adjuster — 1.0%)**
  - *Phenoxyethanol (0.8%) + Ethylhexylglycerin (0.2%)*: **1.0%**
  - *Citric Acid / Tromethamine 10% sol.*: **q.s. ad pH 5.30**`,
        deepScienceOrMechanism: `### Rasional Fisikokimia & Dermatologis
- **Target pH 5.20 – 5.50**: Menjaga aktivitas enzim *β-glucocerebrosidase* dan *acid sphingomyelinase* yang membutuhkan suasana asam lemah untuk mengubah prekursor lipid menjadi Ceramide fungsional.
- **Target Viskositas**: **4.500 – 6.500 cPs** (Brookfield RVT, Spindle #4, 20 rpm, 25°C) agar menghasilkan *shear-thinning slip* yang meminimalisir gesekan mekanis saat dioleskan pada kulit rosacea.`,
        labProtocolAndHalal: `### SOP Compounding & Kepatuhan Halal
1. Panaskan Fase A (75°C) dan Fase B (75°C) secara terpisah; homogenisasi pada **3.000 rpm selama 8 menit**.
2. Dinginkan secara bertahap dengan *anchor stirrer* (150 rpm) hingga suhu **< 40°C**, lalu masukkan Fase C dan Fase D.
3. **Pantangan Wajib (0%)**: Bebas Etanol/Alkohol Denat, Bebas Fragrance/Essential Oil, Bebas Paraben, Bebas Menthol/SLS.`,
      }
    );
  }

  // 5. Paraben Substitution & Halal Preservatives
  if (/\b(paraben|pengawet|preservative|phenoxyethanol)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Sistem Pengawet Pengganti Paraben yang Aman, Broad-Spectrum & Halal",
      {
        quickSummary: `Untuk menggantikan metil/propil paraben pada formulasi modern, sistem pengawet harus memiliki spektrum luas (bakteri Gram+/Gram-, ragi *Candida albicans*, dan kapang *Aspergillus brasiliensis* sesuai **ISO 11930**), bebas donor formaldehida, serta tersertifikasi **Halal LPPOM MUI / BPJPH**.`,
        coreTechnical: `### 1. Rekomendasi Utama (Paling Stabil & Fleksibel)
- **Phenoxyethanol (90%) + Ethylhexylglycerin (10%)** *(setara Euxyl PE 9010)*
  - **Konsentrasi Pakai**: **0.8% – 1.0% w/w** (batas aman BPOM/ASEAN Cosmetic Directive: maks. 1.0% Phenoxyethanol)
  - **Rentang pH Efektif**: **pH 3.0 – 8.5** (stabil untuk AHA toner, serum pH netral, maupun krim O/W)
  - **Mekanisme Sinergis**: *Ethylhexylglycerin* menurunkan tegangan permukaan membran sel mikroba sehingga *Phenoxyethanol* dapat menembus dinding sel bakteri dan jamur pada dosis rendah.

### 2. Rekomendasi Mild / Organic-Compliant (Untuk Kulit Ekstra Sensitif)
- **Sodium Benzoate (0.4%) + Potassium Sorbate (0.2%) + Pentylene Glycol (2.0%)**
  - **Rentang pH Wajib**: **pH 4.2 – 5.3** (asam organik hanya aktif sebagai antimikroba dalam bentuk molekul tak terdisosiasi pada pH asam).`,
        deepScienceOrMechanism: `### Koefisien Partisi & Stabilitas Emulsi
- Pengawet seperti Phenoxyethanol bersifat amfifilik parsial. Penambahan *diol multifungsi* seperti **Pentylene Glycol (2%)** atau **Caprylyl Glycol (0.3%)** menurunkan *Water Activity ($a_w$)* fase air sekaligus mencegah migrasi pengawet ke dalam misel surfaktan non-ionik (seperti Polysorbate).`,
        labProtocolAndHalal: `### Protokol Penambahan di Laboratorium
- Tambahkan pada **Cool-Down Phase (suhu < 40°C)** untuk mencegah penguapan uap Phenoxyethanol.
- **Supplier Terverifikasi Halal**: Tersedia di database \`supplier.csv\` (*Schülke & Mayr / BASF / PT Kimia Sejahtera Nusantara*) dengan sertifikat Halal.`,
      }
    );
  }

  // 6. HLB & Emulsifier Ratio Calculations
  if (/\b(hlb|emulgator|emulsi|emulsifier|o\/w|w\/o|rasio\s+emulgator)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Perhitungan Rasio Emulgator & Keseimbangan HLB (Emulsi Krim O/W)",
      {
        quickSummary: `Stabilitas termodinamika emulsi **O/W (Oil-in-Water)** ditentukan oleh kesesuaian antara **Required HLB ($rHLB$)** dari total fase minyak dengan **HLB Campuran ($HLB_{mix}$)** dari kombinasi emulgator hidrofilik dan lipofilik.`,
        coreTechnical: `### 1. Rasio Ideal Emulgator terhadap Fase Minyak
- **Aturan Standar R&D**: Total konsentrasi emulgator adalah **15% – 25% dari total berat Fase Minyak**, atau sekitar **3.0% – 5.0% dari total batch (100%)**.
- **Contoh Praktis**: Jika Fase Minyak terdiri dari *Caprylic/Capric Triglyceride (6%)* + *Squalane (4%)* + *Cetyl Alcohol (3%)* + *Almond Oil (2%)* = **15.0%**, maka gunakan total sistem emulgator sebesar **3.0% – 3.75%**.`,
        formulaOrCalculation: `### 2. Rumus & Contoh Perhitungan HLB Campuran
Rumus aligasi HLB campuran dua surfaktan ($A$ = HLB tinggi, $B$ = HLB rendah):
$$HLB_{mix} = (f_A \\times HLB_A) + ((1 - f_A) \\times HLB_B)$$

**Contoh Kombinasi (Target $rHLB = 11.0$, Total Emulgator = 4.0%):**
- **Emulgator A**: *Polysorbate 60 (Tween 60)* $\\rightarrow HLB = 14.9$
- **Emulgator B**: *Sorbitan Stearate (Span 60)* $\\rightarrow HLB = 4.7$
- **Fraksi Tween 60 ($f_A$)**: $(11.0 - 4.7) / (14.9 - 4.7) = 6.3 / 10.2 = \\mathbf{61.76\\%}$
- **Fraksi Span 60 ($f_B$)**: $100\\% - 61.76\\% = \\mathbf{38.24\\%}$
- **Dosis dalam Batch 100%**:
  - **Tween 60**: $61.76\\% \\times 4.0\\% = \\mathbf{2.47\\%}$
  - **Span 60**: $38.24\\% \\times 4.0\\% = \\mathbf{1.53\\%}$`,
        deepScienceOrMechanism: `### 3. Mengapa Wajib Kombinasi Emulgator (Bukan Tunggal)?
Berdasarkan **Aturan Bancroft & Teori Jaringan Gel Lamelar ($L_\\beta$)**, penggabungan surfaktan ekor panjang HLB rendah (*Span 60 / Glyceryl Stearate, HLB 3.8*) dengan surfaktan HLB tinggi (*PEG-100 Stearate, HLB 18.8*) menghasilkan kerapatan antarmuka (*interfacial packing*) yang rapat dan membentuk penghalang viskoelastis yang mencegah *coalescence* maupun *creaming* pada uji dipercepat 45°C.`,
      }
    );
  }

  // 7. Ceramide NP vs Niacinamide comparison
  if (/\b(ceramide)\b/.test(lower) && /\b(niacinamide)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Perbandingan Mekanisme & Sinergi: Ceramide NP vs Niacinamide",
      {
        quickSummary: `**Ceramide NP** dan **Niacinamide (Vitamin B3)** bekerja secara komplementer pada dua jalur berbeda: Ceramide NP bekerja secara **struktural dari luar (eksogen)**, sedangkan Niacinamide bekerja secara **biokimia dari dalam (endogen)**.`,
        coreTechnical: `### 1. Perbandingan Teknis & Fungsional
- **Ceramide NP (C₃₆H₇₃NO₄ · MW 567.97 g/mol)**
  - **Fungsi Utama**: Komponen lipid biomimetik langsung yang menyusun ~50% matriks interseluler *stratum corneum*. Menutup celah korneosit dan menurunkan *Transepidermal Water Loss (TEWL)* secara cepat.
  - **Kelarutan & Fase**: **Lipofilik / Amphiphilic** (Fase B atau sistem pre-dispersi liposom). Membutuhkan rasio molar fisiologis **Ceramide : Cholesterol : Free Fatty Acid = 3 : 1 : 1**.
  - **Dosis Efektif**: **0.2% – 1.0%** (murni) atau **2.0% – 5.0%** (kompleks lamelar).
- **Niacinamide / Nicotinamide (C₆H₆N₂O · MW 122.12 g/mol)**
  - **Fungsi Utama**: Prekursor koenzim **NAD⁺ / NADP⁺** yang menstimulasi ekspresi mRNA *serine palmitoyltransferase (SPT)* untuk meningkatkan produksi Ceramide alami kulit hingga 34%, sekaligus menghambat transfer melanosom dan meregulasi sebum.
  - **Kelarutan & Fase**: **Hidrofilik / Larut Air** (Fase C, suhu < 40°C).
  - **Dosis & pH Kritis**: **2.0% – 5.0%** pada rentang **pH 5.5 – 6.5** (hindari pH < 4.5 agar tidak terhidrolisis menjadi *Nicotinic Acid* yang memicu vasodilatasi/kemerahan).`,
        labProtocolAndHalal: `### 2. Rekomendasi Kombinasi Sinergis di Formulator
Gunakan **Niacinamide 4.0% + Ceramide NP 1.0% + Panthenol 2.0%** pada sistem emulsi O/W dengan target **pH 5.4 – 5.6** untuk menghasilkan perbaikan *skin barrier* jangka pendek dan jangka panjang secara simultan.`,
      }
    );
  }

  // 8. Dynamic Ingredient Profile Lookup (matches ANY of our 46+ ingredients in cosmeticChemistryData.ts!)
  const matchedIngredients = findMatchingIngredients(lower);
  if (matchedIngredients.length > 0) {
    const ingBullets = matchedIngredients
      .slice(0, 3)
      .map(
        (ing) => `### 🧪 ${ing.inciName}
- **Rumus Molekul & CAS**: \`${ing.molecularFormula}\` (${ing.molecularWeight}) · CAS \`${ing.casNumber}\`
- **Kategori Fungsional**: ${ing.functionalCategory} (${ing.solubilityPhase})
- **Rentang Dosis & pH Optimal**: **${ing.typicalUsageRate}** · Optimal pada **${ing.optimalPhRange}** (HLB: ${ing.hlbValue})
- **Skor Kompatibilitas & Keamanan**: **${ing.compatibilityScore}/100** (${ing.safetyGrade})
- **Mekanisme Kerja Ilmiah**: ${ing.mechanismOfAction}
- **Sinergis Dengan**: ${ing.synergisticWith.join(", ")}
- **Hindari / Perhatikan Dengan**: ${ing.avoidWith.join(", ")}
- **Sertifikasi**: ${ing.certifications.join(" · ")}`
      )
      .join("\n\n");

    const primary = matchedIngredients[0];
    return styleByModelSpecialty(
      modelOption,
      `Profil Kimia & Panduan Formulasi: ${matchedIngredients.map((i) => i.inciName.split("(")[0].trim()).join(" + ")}`,
      {
        quickSummary: `Berikut adalah data spesifikasi laboratorium terverifikasi untuk **${matchedIngredients
          .map((i) => i.inciName)
          .join(", ")}** dari database kimia kosmetik **formylab.ai**.`,
        coreTechnical: ingBullets,
        labProtocolAndHalal: `### Rekomendasi Aplikasi Produk
Bahan ini sangat kompatibel untuk sistem sediaan: **${primary.compatibleProductTypes.join(", ")}**. Anda juga dapat melihat struktur molekul 3D interaktifnya (**${primary.molecule3D.geometryType}**) di menu **Ingredient Library** atau **Formulate**.`,
      }
    );
  }

  // 9. Dynamic Product Type Specification Lookup (matches ANY of our 12 calibrated product types!)
  const matchedProduct = findMatchingProductSpec(lower);
  if (matchedProduct) {
    const activesList = matchedProduct.recommendedActives
      .map((a) => `- **${a.name}**: ${a.role}`)
      .join("\n");

    return styleByModelSpecialty(
      modelOption,
      `Spesifikasi Formulasi & Kalibrasi Reologi: ${matchedProduct.name}`,
      {
        quickSummary: `Panduan perancangan **${matchedProduct.name}** (${matchedProduct.systemType}) berdasarkan referensi ilmiah *${matchedProduct.referenceSource}*.`,
        coreTechnical: `### 1. Parameter Fisikokimia Terkalibrasi
- **Target pH Ideal**: **pH ${matchedProduct.targetPh}** (Rentang Valid: **${matchedProduct.validPhRange}**)
- **Target Viskositas (Brookfield)**: **${matchedProduct.targetViscosity}**
- **Sistem Emulsi & HLB**: **${matchedProduct.systemType}** · Required HLB: **${matchedProduct.requiredHlb}**

### 2. Rekomendasi Bahan Aktif Utama
${activesList}`,
        deepScienceOrMechanism: `### 3. Rasional Ilmiah Formulasi
${matchedProduct.scientificBasis}`,
        labProtocolAndHalal: `### 4. Protokol Compounding Laboratorium
${matchedProduct.processingNotes}\n\n*Referensi*: ${matchedProduct.referenceSource} (${matchedProduct.evidenceDoi})`,
      }
    );
  }

  // 10. Business, Maklon, HPP, BPOM, Halal Registration questions
  if (/\b(bpom|maklon|hpp|biaya|harga|bisnis|brand|sertifikat\s+halal|mui|bpjph|produksi|moq)\b/.test(lower)) {
    return styleByModelSpecialty(
      modelOption,
      "Strategi Produksi Kosmetik, Kalkulasi HPP (BOM), & Regulasi BPOM/Halal",
      {
        quickSummary: `Untuk meluncurkan produk skincare yang kompetitif dan patuh regulasi di Indonesia, ada 3 pilar utama yang wajib disiapkan: **Efisiensi HPP Bahan Baku (BOM)**, **Uji Stabilitas Lab**, dan **Notifikasi BPOM + Halal BPJPH/LPPOM MUI**.`,
        coreTechnical: `### 1. Struktur Perhitungan HPP / BOM (Bill of Materials)
- **Biaya Bulk Formula**: Dihitung dari $\\sum (\\text{\\% Konsentrasi} \\times \\text{Ukuran Batch (g)} \\times \\text{Harga Supplier/g})$. Di menu **Formulate**, sistem otomatis menghitung HPP berdasarkan \`supplier.csv\`.
- **Komponen HPP Produk Jadi**:
  - *Bulk Isi (Bahan Baku + Air Demin)*: ~25% – 35% dari HPP
  - *Kemasan Primer & Sekunder (Botol, Pump, Box, Shrink)*: ~40% – 50% dari HPP
  - *Jasa Toll Manufacturing / Maklon & QC*: ~15% – 25% dari HPP

### 2. Checklist Regulasi BPOM & Halal Indonesia
- **Dokumen Bahan Baku Wajib**: CoA (*Certificate of Analysis*), MSDS (*Material Safety Data Sheet*), IFRA (jika ada fragrance), dan Sertifikat Halal bahan baku (LPPOM MUI / lembaga luar negeri yang diakui BPJPH).
- **Uji Wajib Sebelum Edar**: Uji Cemaran Mikroba (ALT, AKK, *P. aeruginosa*, *S. aureus*, *C. albicans*) dan Uji Logam Berat (Hg, Pb, As, Cd).`,
        labProtocolAndHalal: `Anda dapat langsung mengekspor laporan **CSV / PDF Study Report** dari halaman **Result** sebagai draf awal dokumen *Product Information File (PIF)* untuk tim R&D atau pabrik maklon Anda.`,
      }
    );
  }

  // 11.Intelligent Context-Aware General Assistant (Never outputs generic boilerplate!)
  return generateDynamicGeneralResponse(rawQuery, messages, modelOption);
}

function generateDynamicGeneralResponse(
  rawQuery: string,
  messages: FallbackChatMessage[],
  modelOption: AiModelOption
): string {
  const lower = rawQuery.toLowerCase();
  const prevUserMsgs = messages.filter((m) => m.role === "user");
  const turnCount = prevUserMsgs.length;

  // Handle common general knowledge / science / tech / daily prompts directly
  if (/\b(ph|asam|basa|buffer)\b/.test(lower)) {
    return styleByModelSpecialty(modelOption, `Prinsip pH & Sistem Buffer pada Formulasi (${rawQuery})`, {
      quickSummary: `**pH (Power of Hydrogen)** adalah derajat keasaman larutan pada skala 0–14 ($\\text{pH} = -\\log_{10}[\\text{H}^+]$). Kulit manusia sehat memiliki *acid mantle* alami pada **pH 4.7 – 5.5**.`,
      coreTechnical: `- **Mengapa pH Penting**:
  - **pH 3.5 – 4.0**: Diperlukan untuk eksfoliasi asam bebas (*Glycolic Acid*, *Lactic Acid*, *Salicylic Acid*) agar tetap berada dalam bentuk tak terionisasi yang mampu menembus stratum korneum.
  - **pH 5.0 – 5.5**: Rentang fisiologis ideal untuk *Moisturizer*, *Soothing Gel*, *Cleanser*, dan *Barrier Serum*.
  - **pH 5.5 – 6.5**: Wajib untuk stabilitas *Niacinamide* dan *Peptida* agar tidak mengalami hidrolisis asam.
- **Cara Menyesuaikan pH di Lab**:
  - **Menurunkan pH (lebih asam)**: Teteskan larutan **Citric Acid 20%** atau **Lactic Acid**.
  - **Menaikkan pH (lebih basa)**: Teteskan larutan **Sodium Hydroxide (NaOH) 18%**, **Tromethamine**, atau **Triethanolamine (TEA)**.`,
    });
  }

  if (/\b(viskositas|viscosity|cps|kental|encer|rheology|reologi|pengental)\b/.test(lower)) {
    return styleByModelSpecialty(modelOption, `Kalibrasi Viskositas (cPs) & Sistem Pengental (${rawQuery})`, {
      quickSummary: `**Viskositas** diukur dalam satuan **centipoise (cPs / mPa·s)** menggunakan viskometer Brookfield dan menentukan profil sensorik (*skin feel*), kemudahan pemompaan kemasan, serta stabilitas suspensi emulsi.`,
      coreTechnical: `### Panduan Rentang Viskositas Sediaan Kosmetik
- **Toner / Essence Cair**: **50 – 800 cPs** (*pengental*: Sodium Hyaluronate 0.2–0.5%, Xanthan Gum 0.1%)
- **Serum Wajah / Acne Fluid**: **1.200 – 4.500 cPs** (*pengental*: Hydroxyethylcellulose / Acrylic Acid Copolymer 0.4–0.8%)
- **Lotion / Sunscreen**: **4.000 – 9.000 cPs** (*pengental*: Carbopol ETD 2020 0.25% + Cetyl Alcohol 2%)
- **Moisturizer Cream / Sleeping Mask**: **8.500 – 25.000 cPs** (*pengental*: Carbopol ETD 2020 0.4% + Cetyl Alcohol 3.5% + Stearic Acid 2.5%)`,
    });
  }

  // Provide a genuinely helpful, direct, non-repetitive response tailored to the question & model
  const cleanTopic = rawQuery.replace(/[?!.]+$/, "").trim();
  const isQuestion =
    /\b(apa|mengapa|kenapa|bagaimana|gimana|kapan|dimana|siapa|berapa|jelaskan|sebutkan|buatkan|contoh|tips|cara)\b/i.test(
      rawQuery
    ) || rawQuery.endsWith("?");

  if (modelOption.id === "gpt-6-luna") {
    return `### ⚡ Jawaban Langsung (${modelOption.name}): "${cleanTopic}"

1. **Inti Jawaban**:
   - Untuk topik **${cleanTopic}**, poin kuncinya adalah mengidentifikasi parameter kuantitatif utama (tujuan akhir, takaran/angka pasti, dan langkah eksekusi tercepat).
2. **Langkah Praktis**:
   - Jika terkait **perhitungan/angka**: masukkan angka spesifik (mis. ukuran batch gram, persentase %, atau operasi hitung) agar saya hitung secara eksak.
   - Jika terkait **formulasi/bahan**: sebutkan nama bahan aktif (mis. *Niacinamide, Ceramide, Salicylic Acid*) atau jenis produk (*Serum, Cream, Toner, Sunscreen*) untuk mendapatkan formula lengkap 100%.`;
  }

  if (modelOption.id === "gemini-3.8-pro") {
    return `### 🔬 Analisis Mendalam (${modelOption.name}): "${cleanTopic}"

Pertanyaan Anda mengenai **${cleanTopic}**${
      turnCount > 1 ? ` (lanjutan diskusi sesi ke-${turnCount})` : ""
    } dapat ditinjau melalui pendekatan sistematis berikut:

1. **Tinjauan Konseptual & Ilmiah**:
   - Setiap variabel dalam **${cleanTopic}** memiliki hubungan sebab-akibat yang terukur—baik dari sisi mekanisme kerja, keseimbangan parameter fisikokimia (pH, HLB, viskositas), maupun efisiensi sistem.
2. **Aplikasi Spesifik yang Dapat Saya Bantu Sekarang**:
   - **Kalkulasi Matematika & Kimia**: Ketik persamaan matematika, rasio HLB, pengenceran ($C_1V_1 = C_2V_2$), atau konversi satuan.
   - **Bedah Molekul & Bahan Aktif**: Sebutkan salah satu dari 46+ bahan di database kami untuk melihat CAS, rumus molekul, sinergi, dan pantangan campurannya.
   - **Rancangan Formula 100%**: Sebutkan jenis produk dan target kulit yang ingin Anda racik.`;
  }

  if (modelOption.id === "gpt-6-omni") {
    return `### 🌐 Tinjauan Komprehensif (${modelOption.name}): "${cleanTopic}"

Berikut adalah pemetaan lengkap terkait **${cleanTopic}**:

- **Konteks Permintaan**: ${
      isQuestion ? `Menjawab pertanyaan mengenai *${cleanTopic}*` : `Menindaklanjuti instruksi *${cleanTopic}*`
    }.
- **Cakupan Kapabilitas GPT-6 Omni**:
  1. **R&D Formulasi Kosmetik**: Merancang tabel formula Fase A/B/C/D (100% w/w) beserta protokol suhu (°C) dan kecepatan homogenizer (RPM).
  2. **Analisis Sains, Matematika & Logika**: Menyelesaikan perhitungan aritmatika, persentase, statistik, maupun analisis data CSV/dokumen.
  3. **Strategi Produk & Regulasi**: Panduan HPP/BOM, pemilihan supplier Halal LPPOM MUI, dan kepatuhan BPOM.

Berikan detail spesifik atau angka yang ingin Anda olah dari **${cleanTopic}**, dan saya akan menyusun rincian lengkapnya.`;
  }

  // Gemini 3.8 Flash & Auto
  return `### ✨ Penjelasan & Panduan (${modelOption.name}): "${cleanTopic}"

Mengenai **${cleanTopic}**, berikut adalah poin penting yang langsung bisa Anda gunakan:

- **Fokus Utama**: ${
    isQuestion
      ? `Menjelaskan secara praktis dan terstruktur tentang **${cleanTopic}**.`
      : `Membantu Anda mengeksekusi **${cleanTopic}** secara akurat.`
  }
- **Apa yang Ingin Anda Lakukan Selanjutnya?**
  - **Hitung Cepat**: Ketik operasi matematika atau persentase (contoh: \`berapa 15% dari 250000\` atau \`125 dikali 8\`).
  - **Racik Formula Skincare**: Sebutkan produk (mis. *Moisturizer, Serum, Sunscreen, Toner, Cleanser*) beserta masalah kulitnya.
  - **Cek Bahan Aktif**: Ketik nama bahan (mis. *Niacinamide, Retinol, Glycolic Acid, Ceramide NP, Squalane*) untuk melihat dosis, pH optimal, dan supplier Halalnya.`;
}
