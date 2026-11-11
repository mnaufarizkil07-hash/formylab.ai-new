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

export function cleanHtmlEntities(raw: string): boolean extends false ? never : string {
  if (!raw) return "";
  return (
    raw
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
      // Remove any leftover angle brackets or raw URL attributes
      .replace(/href="[^"]*"/gi, " ")
      .replace(/target="_blank"/gi, " ")
      .replace(/color="#[0-9a-f]{3,6}"/gi, " ")
      .replace(/[<>]/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
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
        !/^\d+(?:[.,]\d+)?$/.test(w) &&
        !stopWords.has(w.toLowerCase()) &&
        !/^ber+a+p+a+$/i.test(w)
    );
}

/**
 * Queries 4 real-time public web & knowledge endpoints in parallel:
 * 1. Live Web Search (Yahoo Indonesia / Global Web Search)
 * 2. Wikipedia Full Plain-Text Extracts (Indonesia & English)
 * 3. Google News / Web RSS Search
 * 4. OpenStreetMap Nominatim Location Search & DuckDuckGo Instant Knowledge
 */
export async function fetchRealtimeWebContext(query: string): Promise<{
  results: WebSearchResultItem[];
  contextBlockForAi: string;
  sourcesMarkdown: string;
}> {
  if (!shouldSearchLiveInternet(query)) {
    return { results: [], contextBlockForAi: "", sourcesMarkdown: "" };
  }

  const rawTokens = extractCoreSearchTokens(query);
  if (rawTokens.length === 0) {
    return { results: [], contextBlockForAi: "", sourcesMarkdown: "" };
  }

  const lowerQ = query.toLowerCase();
  const mentionsSkincareBrand =
    /\b(kahf|cetaphil|cerave|wardah|emina|make\s*over|somethinc|avoskin|skintific|azarine|labore|lacoco|npure|whitelab|scarlett|garnier|pond|biore|hada\s*labo|cosrx|anua|skin1004|la\s*roche|bioderma|eucerin|kiehl)\b/.test(
      lowerQ
    );

  const baseQuery = rawTokens.slice(0, 6).join(" ");
  const effectiveQuery =
    mentionsSkincareBrand && !/\b(skincare|kosmetik|sabun|wajah)\b/.test(lowerQ)
      ? `${baseQuery} skincare kosmetik`
      : baseQuery;

  const wikiQuery =
    rawTokens
      .filter(
        (w) =>
          ![
            "terbaik",
            "rekomendasi",
            "paling",
            "bagus",
            "merek",
            "brand",
            "produk",
            "dunia",
            "global",
          ].includes(w.toLowerCase())
      )
      .slice(0, 4)
      .join(" ") || effectiveQuery;

  const results: WebSearchResultItem[] = [];

  // Normalize alphanumeric tokens so "almatuq" matches "Al-Ma'tuq", "Al-Ma’tuq", "Al Matuq"
  const normalizedQueryTokens = rawTokens
    .map((t) => t.toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter((t) => t.length >= 3);

  const isRelevantResult = (title: string, snippet: string): boolean => {
    const combinedLower = `${title} ${snippet}`.toLowerCase();
    const combinedAlphaNum = combinedLower.replace(/[^a-z0-9]/g, "");

    if (mentionsSkincareBrand) {
      if (
        /\b(surah|quran|koran|meccan|cave|nakhchivan|moses|prophet|ayat|bible)\b/.test(
          combinedLower
        )
      ) {
        return false;
      }
    }
    if (normalizedQueryTokens.length > 0) {
      const hasTokenOverlap = normalizedQueryTokens.some(
        (tok) =>
          combinedLower.includes(tok) ||
          combinedAlphaNum.includes(tok) ||
          (tok.length >= 5 && combinedAlphaNum.includes(tok.slice(0, 5)))
      );
      if (!hasTokenOverlap) {
        return false;
      }
    }
    return true;
  };

  // 1. Live Organic Web Search (Yahoo Indonesia Web Search — fast, rich full-web snippets)
  const fetchLiveOrganicWebSearch = async (searchTerm: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2800);
    try {
      const url = `https://id.search.yahoo.com/search?p=${encodeURIComponent(
        searchTerm
      )}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const html = await res.text();

      const titles = [
        ...html.matchAll(
          /<h3[^>]*class="[^"]*title[^"]*"[^>]*>([\s\S]*?)<\/h3>/g
        ),
      ].map((m) => cleanHtmlEntities(m[1]));

      const compTexts = [
        ...html.matchAll(/class="[^"]*compText[^"]*"[^>]*>([\s\S]*?)<\/div>/g),
      ]
        .map((m) => cleanHtmlEntities(m[1]))
        .filter((s) => s.length > 30);

      const parsed: WebSearchResultItem[] = [];
      const count = Math.min(titles.length, compTexts.length, 4);
      for (let i = 0; i < count; i++) {
        const rawTitle = titles[i]
          .replace(/^[^\s]+\s*\.\s*[^\s]+\s+/i, "")
          .trim();
        const snippet = compTexts[i];
        if (rawTitle && snippet && isRelevantResult(rawTitle, snippet)) {
          parsed.push({
            title: rawTitle,
            snippet,
            url: `https://www.google.com/search?q=${encodeURIComponent(
              rawTitle
            )}`,
            sourceName: "Google / Live Web",
          });
        }
      }
      return parsed;
    } catch {
      clearTimeout(timer);
      return [];
    }
  };

  // 2. Wikipedia Full Plain-Text Extracts (prop=extracts&exintro=1&explaintext=1)
  const fetchWikiFullExtracts = async (
    lang: "id" | "en",
    searchTerm: string
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&prop=extracts&exintro=1&explaintext=1&generator=search&gsrsearch=${encodeURIComponent(
        searchTerm
      )}&gsrlimit=2&utf8=1&format=json&origin=*`;
      const res = await fetch(url, {
        headers: { "User-Agent": "FormyLabAI/2.0 (https://formylab.ai)" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      const pages = Object.values(data?.query?.pages || {}) as Array<{
        title?: string;
        extract?: string;
        index?: number;
      }>;
      pages.sort((a, b) => (a.index || 99) - (b.index || 99));

      const items: WebSearchResultItem[] = [];
      for (const p of pages) {
        const title = cleanHtmlEntities(String(p.title || ""));
        const extract = cleanHtmlEntities(String(p.extract || "")).slice(
          0,
          750
        );
        if (title && extract.length > 35 && isRelevantResult(title, extract)) {
          items.push({
            title,
            snippet: extract,
            url: `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
              title.replace(/\s+/g, "_")
            )}`,
            sourceName:
              lang === "id" ? "Wikipedia Indonesia" : "Wikipedia Global",
          });
        }
      }
      return items;
    } catch {
      clearTimeout(timer);
      return [];
    }
  };

  // 3. Live Google News / Web RSS Search
  const fetchGoogleRssSearch = async (
    searchTerm: string,
    lang: "id" | "en"
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2500);
    try {
      const hl =
        lang === "id" ? "hl=id&gl=ID&ceid=ID:id" : "hl=en-US&gl=US&ceid=US:en";
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(
        searchTerm
      )}&${hl}`;
      const res = await fetch(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; FormyLabAI/2.0; +https://formylab.ai)",
        },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const xml = await res.text();
      const items = xml.match(/<item>[\s\S]*?<\/item>/g) || [];
      const parsed: WebSearchResultItem[] = [];

      for (const itemXml of items.slice(0, 3)) {
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/);
        const sourceMatch = itemXml.match(/<source[^>]*>([\s\S]*?)<\/source>/);
        const pubDateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        const descMatch = itemXml.match(
          /<description>([\s\S]*?)<\/description>/
        );

        const rawTitle = titleMatch ? cleanHtmlEntities(titleMatch[1]) : "";
        const rawLink = linkMatch ? cleanHtmlEntities(linkMatch[1]) : "";
        const sourceTitle = sourceMatch
          ? cleanHtmlEntities(sourceMatch[1])
          : "Google Web";
        const pubDate = pubDateMatch
          ? cleanHtmlEntities(pubDateMatch[1]).slice(0, 16)
          : "";
        const cleanedDesc = descMatch ? cleanHtmlEntities(descMatch[1]) : "";
        const rawDesc =
          cleanedDesc && cleanedDesc.length > rawTitle.length + 15
            ? cleanedDesc
            : rawTitle;

        if (rawTitle && rawLink && isRelevantResult(rawTitle, rawDesc)) {
          parsed.push({
            title: rawTitle,
            snippet: `${rawDesc}${pubDate ? ` (${pubDate})` : ""}`,
            url: rawLink,
            sourceName: sourceTitle,
          });
        }
      }
      return parsed;
    } catch {
      clearTimeout(timer);
      return [];
    }
  };

  // 4. OpenStreetMap Nominatim Location Search & DuckDuckGo Instant Knowledge
  const fetchLocationAndDdg = async (searchTerm: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    const items: WebSearchResultItem[] = [];
    try {
      const isLocationQuery =
        /\b(lokasi|alamat|letak|dimana|tempat|kota|kabupaten|provinsi|jalan|pesantren|sekolah|universitas|kampus|gunung|pantai|wisata|masjid|rumah\s+sakit|stasiun|bandara)\b/i.test(
          lowerQ
        );
      if (isLocationQuery || rawTokens.length <= 3) {
        const nomUrl = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(
          searchTerm
        )}&format=json&addressdetails=1&limit=2&accept-language=id`;
        const nomRes = await fetch(nomUrl, {
          headers: { "User-Agent": "FormyLabAI/2.0 (https://formylab.ai)" },
          signal: controller.signal,
        });
        if (nomRes.ok) {
          const nomData = await nomRes.json();
          if (Array.isArray(nomData)) {
            for (const loc of nomData.slice(0, 2)) {
              if (
                loc?.display_name &&
                isRelevantResult(loc.name || searchTerm, loc.display_name)
              ) {
                items.push({
                  title: loc.name || searchTerm,
                  snippet: `Lokasi / Alamat Terdaftar: ${cleanHtmlEntities(
                    String(loc.display_name)
                  )} (Koordinat: ${loc.lat}, ${loc.lon})`,
                  url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    loc.display_name
                  )}`,
                  sourceName: "Google Maps / Geodata",
                });
              }
            }
          }
        }
      }

      const ddgUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        searchTerm
      )}&format=json&no_html=1&skip_disambig=1`;
      const ddgRes = await fetch(ddgUrl, { signal: controller.signal });
      clearTimeout(timer);
      if (ddgRes.ok) {
        const data = await ddgRes.json();
        if (
          data?.AbstractText &&
          data?.AbstractURL &&
          isRelevantResult(data.Heading || searchTerm, String(data.AbstractText))
        ) {
          items.push({
            title: cleanHtmlEntities(String(data.Heading || searchTerm)),
            snippet: cleanHtmlEntities(String(data.AbstractText)).slice(0, 500),
            url: String(data.AbstractURL),
            sourceName: data.AbstractSource || "DuckDuckGo Knowledge",
          });
        }
      }
      return items;
    } catch {
      clearTimeout(timer);
      return items;
    }
  };

  try {
    const [organicWeb, idWiki, enWiki, googleId, locDdg] = await Promise.all([
      fetchLiveOrganicWebSearch(effectiveQuery),
      fetchWikiFullExtracts("id", wikiQuery),
      fetchWikiFullExtracts("en", wikiQuery),
      fetchGoogleRssSearch(effectiveQuery, "id"),
      fetchLocationAndDdg(wikiQuery),
    ]);

    // Prioritize full Wikipedia extracts and organic web search snippets first, then location/DDG and Google news
    const combined = [
      ...idWiki,
      ...organicWeb,
      ...locDdg,
      ...enWiki,
      ...googleId,
    ];
    const seenSnippets = new Set<string>();
    for (const item of combined) {
      const normKey = item.snippet.slice(0, 75).toLowerCase();
      if (item.snippet && !seenSnippets.has(normKey) && results.length < 6) {
        seenSnippets.add(normKey);
        results.push(item);
      }
    }
  } catch {
    // Ignore network errors gracefully
  }

  if (results.length === 0) {
    return { results: [], contextBlockForAi: "", sourcesMarkdown: "" };
  }

  const contextBlockForAi = `\n[LIVE GOOGLE & INTERNET CONTEXT FOR "${query}"]:\n${results
    .map(
      (r, idx) =>
        `${idx + 1}. [${r.sourceName}] ${r.title}: ${r.snippet} (URL: ${r.url})`
    )
    .join(
      "\n"
    )}\nINSTRUCTION: Synthesize these real-time facts into a comprehensive, well-structured, natural Bahasa Indonesia response that directly answers the user's question. CRITICAL: Do NOT add a "Referensi" or "Sumber" section at the end of your reply unless the user explicitly asked for sources/links.`;

  const sourcesMarkdown = `**Sumber Referensi:**\n${results
    .slice(0, 4)
    .map(
      (r) =>
        `- [${r.title} (${r.sourceName})](${r.url}) — ${r.snippet.slice(0, 140)}${
          r.snippet.length > 140 ? "..." : ""
        }`
    )
    .join("\n")}`;

  return {
    results,
    contextBlockForAi,
    sourcesMarkdown,
  };
}

