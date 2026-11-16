export interface WebSearchResultItem {
  title: string;
  snippet: string;
  url: string;
  sourceName: string;
}

export interface BriefCompletenessReport {
  isFormulationBrief: boolean;
  isIncomplete: boolean;
  presentFields: string[];
  missingFields: Array<{
    key:
      | "skinAndTexture"
      | "hppAndTrialBudget"
      | "halalStatus"
      | "deadlineAndMoq";
    label: string;
    question: string;
  }>;
  clarifyingQuestionsMarkdown: string;
  promptInstructionForAi: string;
}

/**
 * Checks if the user explicitly asked to display sources, references, or website links.
 * Per user requirement: never show source lists automatically unless the user explicitly asks for them.
 */
export function userExplicitlyAskedForSources(query: string): boolean {
  const lower = query.toLowerCase();
  return /\b(tampilkan\s+sumber|minta\s+sumber|mana\s+sumber|cantumkan\s+sumber|sertakan\s+sumber|sumbernya\s+mana|sumber\s+website|sumber\s+internet|kasih\s+sumber|kasih\s+link|minta\s+link|tampilkan\s+referensi|cantumkan\s+referensi|daftar\s+pustaka|tau\s+sumber|berikan\s+sumber)/.test(
    lower
  );
}

/**
 * Analyzes whether the user is explicitly submitting a custom cosmetic formulation / R&D brief
 * (and NOT merely asking about skincare brands on the market, general knowledge, or ingredient science)
 * and checks if the 4 key brief parameters are specified across the conversation:
 * 1. Target kulit dan tekstur yang diinginkan
 * 2. Target HPP dan budget percobaan
 * 3. Wajib halal atau tidak
 * 4. Deadline dan MOQ
 */
export function analyzeBriefCompleteness(
  messages: Array<{ role: string; content: string }>
): BriefCompletenessReport {
  const userMessages = messages.filter((m) => m.role === "user");
  const latestUserText = (
    userMessages[userMessages.length - 1]?.content || ""
  ).trim();
  const latestLower = latestUserText.toLowerCase();
  const combinedUserText = userMessages
    .map((m) => m.content)
    .join(" ")
    .toLowerCase();

  // Exclude brand/product comparison or market queries
  const isAskingMarketBrandsOrGeneral =
    /\b(merek\s+terbaik|brand\s+terbaik|rekomendasi\s+merek|rekomendasi\s+produk|produk\s+di\s+pasaran|apa\s+merek|merek\s+apa|apa\s+itu|siapa|sejarah|perbedaan\s+antara|bandingkan|perbandingan|cetaphil|kahf|wardah|skintific|cerave|somethinc|avoskin|emin|garnier|pond|nivea|vaseline)\b/.test(
      latestLower
    ) &&
    !/\b(buatkan\s+formula|bikin\s+formula|racik|rancang\s+formula|klien\s+minta|mau\s+produksi|mau\s+maklon)\b/.test(
      latestLower
    );

  // Detect if the user is explicitly asking to create/design/formulate a product or interpreting a client brief
  const isFormulationBrief =
    !isAskingMarketBrandsOrGeneral &&
    /\b(buatkan|bikin|racik|rancang|formulasi|formula|mau\s+buat|ingin\s+buat|klien\s+minta|tolong\s+buat|develop|produk\s+baru|mau\s+maklon)\b/.test(
      latestLower
    ) &&
    /\b(serum|moisturizer|pelembap|krim|cream|gel|toner|cleanser|sabun|facial\s+wash|sunscreen|tabir\s+surya|lotion|masker|mask|skincare|kosmetik|acne|jerawat|brightening|anti-aging|rosacea|eksfoliasi|peeling|essence|ampoule)\b/.test(
      latestLower
    );

  if (!isFormulationBrief) {
    return {
      isFormulationBrief: false,
      isIncomplete: false,
      presentFields: [],
      missingFields: [],
      clarifyingQuestionsMarkdown: "",
      promptInstructionForAi: "",
    };
  }

  const hasSkinAndTexture =
    /\b(kulit|kering|berminyak|sensitif|jerawat|acne|normal|kombinasi|kusam|aging|rosacea)\b/.test(
      combinedUserText
    ) &&
    /\b(tekstur|ringan|kental|cair|watery|gel|creamy|lotion|cepat\s+meresap|tidak\s+lengket|matte|dewy|velvet)\b/.test(
      combinedUserText
    );

  const hasHppAndTrialBudget =
    /\b(hpp|budget|anggaran|biaya|harga\s+pokok|rp\s*\d+|\d+\s*ribu|\d+\s*rb)\b/.test(
      combinedUserText
    );

  const hasHalalStatus =
    /\b(halal|mui|bpjph|non-halal|reguler|sertifikat\s+halal)\b/.test(
      combinedUserText
    );

  const hasDeadlineAndMoq =
    /\b(moq|deadline|jadwal|minggu|bulan|target\s+rilis|target\s+launching|\d+\s*pcs|\d+\s*unit)\b/.test(
      combinedUserText
    );

  const presentFields: string[] = [];
  const missingFields: BriefCompletenessReport["missingFields"] = [];

  if (hasSkinAndTexture) {
    presentFields.push("Target kulit dan tekstur yang diinginkan");
  } else {
    missingFields.push({
      key: "skinAndTexture",
      label: "Target kulit dan tekstur yang diinginkan",
      question:
        "**Target kulit & tekstur**: Untuk tipe kulit apa (berminyak/acne, kering, atau sensitif) dan tekstur seperti apa yang diinginkan (watery-ringan, gel-cream cepat meresap, atau rich cream)?",
    });
  }

  if (hasHppAndTrialBudget) {
    presentFields.push("Target HPP dan budget percobaan");
  } else {
    missingFields.push({
      key: "hppAndTrialBudget",
      label: "Target HPP dan budget percobaan",
      question:
        "**Target HPP & budget trial**: Berapa kisaran target HPP per pcs/kg (mis. Rp 12.000 – Rp 15.000/pcs) dan budget percobaan lab-nya?",
    });
  }

  if (hasHalalStatus) {
    presentFields.push("Wajib halal atau tidak");
  } else {
    missingFields.push({
      key: "halalStatus",
      label: "Wajib halal atau tidak",
      question:
        "**Status kehalalan**: Apakah produk ini wajib tersertifikasi **Halal BPJPH / LPPOM MUI** atau reguler?",
    });
  }

  if (hasDeadlineAndMoq) {
    presentFields.push("Deadline dan MOQ");
  } else {
    missingFields.push({
      key: "deadlineAndMoq",
      label: "Deadline dan MOQ",
      question:
        "**Deadline & MOQ**: Kapan target penyelesaian sampel R&D dan berapa rencana **MOQ** (mis. 1.000 pcs)?",
    });
  }

  const isIncomplete = missingFields.length > 0;

  // Natural conversational follow-up WITHOUT any stiff heading or "Nanya Balik" label
  const clarifyingQuestionsMarkdown = isIncomplete
    ? `Agar draf formula di atas bisa saya sesuaikan lebih presisi dengan kebutuhan produksi Anda, boleh infokan juga mengenai:\n${missingFields
        .map((m, idx) => `${idx + 1}. ${m.question}`)
        .join("\n")}`
    : "";

  const promptInstructionForAi = isIncomplete
    ? `\n[CONVERSATIONAL BRIEF FOLLOW-UP]: The user's formulation brief has not yet specified: ${missingFields
        .map((m) => m.label)
        .join(
          ", "
        )}. First provide a helpful initial R&D formula recommendation (using a clean Markdown table for the formula phases), and at the very end ask naturally in a friendly closing paragraph about those missing brief details. CRITICAL: NEVER write any heading or title like "Nanya Balik", "Konfirmasi Brief", or "Ringkasan Cepat".`
    : "";

  return {
    isFormulationBrief,
    isIncomplete,
    presentFields,
    missingFields,
    clarifyingQuestionsMarkdown,
    promptInstructionForAi,
  };
}

/**
 * Determines whether a user query benefits from live real-time internet search.
 */
export function shouldSearchLiveInternet(query: string): boolean {
  const lower = query.toLowerCase().trim();
  if (lower.length < 4) return false;
  if (/^📎\s*mengirim\s+\d+\s+file/i.test(lower)) return false;
  if (/^[0-9+\-*/().:\s?=!÷×]+$/.test(lower)) return false;
  // Never run web search on arithmetic / fraction / math expressions (including "9 - 3 : 1/3 + 1 =?")
  if (
    /\d+\s*(?:[+\-*/×÷^:]|(?:\b(?:x|tambah|ditambah|plus|kurang|dikurang|dikurangi|minus|kali|dikali|dikalikan|times|bagi|dibagi|pangkat|dipangkatkan)\b))\s*-?\d+/i.test(
      lower
    )
  ) {
    return false;
  }
  if (
    /\b(?:akar\s*(?:kuadrat)?\s*(?:dari)?|sqrt)\s*\(?\s*\d+/i.test(lower) ||
    /\d+(?:[.,]\d+)?\s*(?:%|persen)\s*(?:dari|of)\s*\d+/i.test(lower) ||
    /\bcan\s+you\s+solve\s+this\b/i.test(lower)
  ) {
    return false;
  }
  // Skip trivial greetings or generic math/image follow-up questions ("berapa hasilnya, dan gmna caranya", "berikan jawaban dan cara nya")
  if (
    /^(?:halo|hai|hi|hello|p|tes|test|ping|pagi|siang|sore|malam|assalamualaikum|terima\s*kasih|makasih|thanks|ok|oke|siap)[?!.\s]*$/i.test(
      lower
    )
  ) {
    return false;
  }
  return true;
}

/**
 * Strips publication dates, timestamps, and relative dates from web search snippets
 * (e.g. "12 Mei 2024 — ", "May 12, 2024 · ", "(Fri, 13 Nov 2026)", "3 hari yang lalu — ",
 * "KOMPAS.com - 12/05/2024, 14:30 WIB - ", "(Dipublikasikan 10 Jan 2025)")
 * so snippet publication dates never leak into the middle of narrative sentences.
 */
export function stripWebSnippetPublicationDates(raw: string): string {
  if (!raw) return "";
  const monthNames =
    "(?:Jan(?:uari|uary)?|Feb(?:ruari|ruary)?|Mar(?:et|ch)?|Apr(?:il)?|Mei|May|Jun(?:i|e)?|Jul(?:i|y)?|Agu(?:stus)?|Aug(?:ust)?|Sep(?:tember)?|Okt(?:ober)?|Oct(?:ober)?|Nov(?:ember)?|Des(?:ember)?|Dec(?:ember)?)";
  const dayNames =
    "(?:Sen(?:in)?|Sel(?:asa)?|Rab(?:u)?|Kam(?:is)?|Jum(?:at)?|Sab(?:tu)?|Min(?:ggu)?|Mon(?:day)?|Tue(?:sday)?|Wed(?:nesday)?|Thu(?:rsday)?|Fri(?:day)?|Sat(?:urday)?|Sun(?:day)?)";

  return (
    raw
      // 1. Strip parenthetical or bracketed RSS / snippet publication dates: "(Fri, 13 Nov 2026)", "(12 Mei 2024)", "(Diterbitkan 12 Mei 2024)"
      .replace(
        new RegExp(
          `[(\\[]\\s*(?:(?:diterbitkan|dipublikasikan|diperbarui|updated|published)\\s*(?:pada)?\\s*)?(?:${dayNames}\\s*,?\\s*)?\\d{1,2}\\s+${monthNames}\\s+\\d{4}(?:[^)\\]]*)[)\\]]`,
          "gi"
        ),
        " "
      )
      .replace(
        new RegExp(
          `[(\\[]\\s*(?:${dayNames}\\s*,?\\s*)?${monthNames}\\s+\\d{1,2}\\s*,?\\s*\\d{4}(?:[^)\\]]*)[)\\]]`,
          "gi"
        ),
        " "
      )
      .replace(/\(\s*\d{4}-\d{2}-\d{2}(?:[^)]*)\)/g, " ")
      // 2. Strip news portal dateline prefixes: "KOMPAS.com - 12/05/2024, 14:30 WIB - " or " - 12 Mei 2024, 10:00 WIB - "
      .replace(
        /(?:[A-Za-z0-9.-]+\.(?:com|id|co\.id|org|net)\s*[-–—·]\s*)?\d{1,2}[/-]\d{1,2}[/-]\d{2,4}(?:\s*,\s*\d{1,2}[:.]\d{2}\s*(?:WIB|WITA|WIT)?)?\s*[-–—·:]+\s*/gi,
        " "
      )
      // 3. Strip leading or inline snippet dates followed by a snippet separator (—, –, -, ·, •, :): "12 Mei 2024 — ", " — 12 Mei 2024 — ", "May 12, 2024 · "
      .replace(
        new RegExp(
          `(?:^|\\s|[-–—·•])(?:${dayNames}\\s*,?\\s*)?\\d{1,2}\\s+${monthNames}\\s+\\d{4}(?:\\s*,?\\s*\\d{1,2}[:.]\\d{2}\\s*(?:WIB|WITA|WIT)?)?\\s*[-–—·•:]+\\s*`,
          "gi"
        ),
        " "
      )
      .replace(
        new RegExp(
          `(?:^|\\s|[-–—·•])(?:${dayNames}\\s*,?\\s*)?${monthNames}\\s+\\d{1,2}\\s*,?\\s*\\d{4}\\s*[-–—·•:]+\\s*`,
          "gi"
        ),
        " "
      )
      .replace(
        /(?:^|\s|[-–—·•])\d{4}-\d{2}-\d{2}\s*[-–—·•:]+\s*/g,
        " "
      )
      // 4. Strip relative snippet timestamps: "3 hari yang lalu — ", "2 jam lalu · ", "5 days ago - "
      .replace(
        /(?:^|\s|[-–—·•])\d+\s+(?:detik|menit|jam|hari|minggu|bulan|tahun|second|minute|hour|day|week|month|year)s?\s+(?:yang\s+)?(?:lalu|ago)\s*[-–—·•:]+\s*/gi,
        " "
      )
      // 5. Strip explicit publication clauses in the middle of narrative sentences: "diterbitkan pada 12 Mei 2024,", "dipublikasikan tanggal 10 Jan 2024"
      .replace(
        new RegExp(
          `\\b(?:yang\\s+)?(?:diterbitkan|dipublikasikan|diunggah|diperbarui|published|updated)\\s+(?:pada\\s+|tanggal\\s+)?(?:${dayNames}\\s*,?\\s*)?\\d{1,2}\\s+${monthNames}\\s+\\d{4}\\s*,?\\s*`,
          "gi"
        ),
        " "
      )
      .replace(/\s+/g, " ")
      .trim()
  );
}

export function cleanHtmlEntities(raw: string): boolean extends false ? never : string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    // Decode named & numeric HTML entities FIRST before stripping HTML tags
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&ldquo;|&rdquo;/gi, '"')
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&hellip;/gi, "...")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
    // Second decode pass in case of double-encoded entities (&amp;lt; or &amp;rsquo;)
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;|&rsquo;|&lsquo;/gi, "'")
    .replace(/&mdash;/gi, "—")
    .replace(/&ndash;/gi, "–")
    .replace(/&nbsp;|&#160;/gi, " ")
    // Strip all HTML tags (<a href=...>, <font color=...>, <span>, etc.) AFTER decoding entities
    .replace(/<[^>]+>/g, " ")
    // Strip search engine URL breadcrumbs (e.g. "domain.com > id > kalkulator", "> id > kalkulator", "› id › kalkulator")
    .replace(
      /(?:https?:\/\/|www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\s*(?:>|›|»)\s*[^\s<>]+)+/gi,
      " "
    )
    .replace(
      /(?:^|\s)(?:>|›|»)\s*[a-z0-9_-]+(?:\s*(?:>|›|»)\s*[a-z0-9_-]+)+/gi,
      " "
    )
    // Strip search engine disclaimer / UI text (e.g. "Sanggahan: ...", "Disclaimer: ...")
    .replace(
      /\b(?:Sanggahan|Disclaimer|Terjemahkan\s+halaman\s+ini|Lihat\s+hasil\s+untuk)\s*:?.*$/gi,
      " "
    )
    // Remove any leftover angle brackets or raw URL attributes
    .replace(/href="[^"]*"/gi, " ")
    .replace(/target="_blank"/gi, " ")
    .replace(/color="#[0-9a-f]{3,6}"/gi, " ")
    .replace(/[<>›»]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return stripWebSnippetPublicationDates(cleaned);
}

/**
 * Extracts the core topic/keywords from conversational Indonesian or English questions
 * e.g. "apakah kamu tau almatuq?" -> "almatuq"
 * e.g. "dimana letak candi borobudur?" -> "letak candi borobudur"
 */
export function extractCoreSearchTokens(query: string): string[] {
  const stopWords = new Set([
    "tolong",
    "coba",
    "jelaskan",
    "ceritakan",
    "sebutkan",
    "apa",
    "apakah",
    "bagaimana",
    "gimana",
    "gmna",
    "gmn",
    "cara",
    "caranya",
    "langkah",
    "langkahnya",
    "jawaban",
    "jawabannya",
    "jawab",
    "penyelesaian",
    "penyelesaiannya",
    "solusi",
    "solusinya",
    "siapa",
    "siapakah",
    "dimana",
    "dimanakah",
    "kemana",
    "kapan",
    "kenapa",
    "mengapa",
    "berapa",
    "berapakah",
    "beraapa",
    "brp",
    "hitung",
    "hitunglah",
    "hitungan",
    "hasil",
    "hasilnya",
    "nilai",
    "nilainya",
    "rumus",
    "rumusnya",
    "kamu",
    "anda",
    "aku",
    "saya",
    "gue",
    "gua",
    "lu",
    "elo",
    "kami",
    "kita",
    "mereka",
    "dia",
    "tau",
    "tahu",
    "kenal",
    "pernah",
    "dengar",
    "lihat",
    "paham",
    "ngerti",
    "mengerti",
    " gak",
    "gak",
    "ga",
    "nggak",
    "tidak",
    "bukan",
    "belum",
    "sudah",
    "udah",
    "bisa",
    "boleh",
    "mau",
    "ingin",
    "tentang",
    "mengenai",
    "soal",
    "terkait",
    "berdasarkan",
    "internet",
    "website",
    "google",
    "real",
    "time",
    "realtime",
    "dong",
    "ya",
    "yah",
    "sih",
    "kah",
    "kak",
    "bang",
    "bro",
    "sis",
    "pak",
    "bu",
    "menurut",
    "carikan",
    "cari",
    "kasih",
    "berikan",
    "tampilkan",
    "di",
    "ke",
    "dari",
    "dan",
    "atau",
    "yang",
    "yg",
    "untuk",
    "pada",
    "saat",
    "ini",
    "itu",
    "tersebut",
    "utamanya",
    "utama",
    "sumber",
    "buatkan",
    "bikin",
    "bandingkan",
    "perbandingan",
    "tabel",
    "beserta",
    "adalah",
    "ialah",
    "merupakan",
    "yaitu",
    "arti",
    "artinya",
    "definisi",
    "pengertian",
    "maksud",
    "maksudnya",
    "mengirim",
    "file",
    "screenshot",
    "gambar",
    "foto",
    "png",
    "jpg",
    "jpeg",
    "kb",
    "mb",
    "can",
    "you",
    "solve",
    "this",
  ]);

  return query
    .replace(/[?!.,":;()[\]+=\-*/×÷^📎]+/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(
      (w) =>
        w.length >= 2 &&
        (!/^\d+(?:[.,]\d+)?$/.test(w) || /^(?:18|19|20)\d{2}$/.test(w)) &&
        !stopWords.has(w.toLowerCase()) &&
        !/^ber+a+p+a+$/i.test(w)
    );
}

/**
 * Manual web scraper & raw article slicing disabled.
 * Factual search is handled natively by Gemini API's built-in Google Search grounding (`tools: [{ googleSearch: {} }]`)
 * so scraped snippets never override or pollute the conversation flow.
 */
export async function fetchRealtimeWebContext(_query: string): Promise<{
  results: WebSearchResultItem[];
  contextBlockForAi: string;
  sourcesMarkdown: string;
}> {
  return {
    results: [],
    contextBlockForAi: "",
    sourcesMarkdown: "",
  };
}


