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
  if (/^[0-9+\-*/().\s]+$/.test(lower)) return false;
  return true;
}

function cleanHtmlEntities(raw: string): string {
  return raw
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Queries real-time public web endpoints in parallel with smart domain disambiguation
 * so cosmetic brands (like Kahf, Wardah, Cetaphil, Somethinc) never match unrelated Wikipedia topics.
 */
export async function fetchRealtimeWebContext(query: string): Promise<{
  results: WebSearchResultItem[];
  contextBlockForAi: string;
  sourcesMarkdown: string;
}> {
  if (!shouldSearchLiveInternet(query)) {
    return { results: [], contextBlockForAi: "", sourcesMarkdown: "" };
  }

  const stopWords = new Set([
    "tolong",
    "coba",
    "jelaskan",
    "sebutkan",
    "apa",
    "apakah",
    "bagaimana",
    "siapa",
    "dimana",
    "kapan",
    "kenapa",
    "mengapa",
    "berdasarkan",
    "internet",
    "website",
    "real",
    "time",
    "realtime",
    "dong",
    "ya",
    "sih",
    "menurut",
    "carikan",
    "cari",
    "di",
    "dan",
    "atau",
    "yang",
    "untuk",
    "pada",
    "dari",
    "saat",
    "ini",
    "utamanya",
    "utama",
    "sumber",
    "buatkan",
    "saya",
    "kami",
    "kita",
    "bandingkan",
    "perbandingan",
    "tabel",
  ]);

  const rawTokens = query
    .replace(/[?!.,":;()[\]]+/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter((w) => w.length >= 3 && !stopWords.has(w.toLowerCase()));

  const lowerQ = query.toLowerCase();
  const mentionsSkincareBrand =
    /\b(kahf|cetaphil|cerave|wardah|emina|make\s*over|somethinc|avoskin|skintific|azarine|labore|lacoco|npure|whitelab|scarlett|garnier|pond|biore|hada\s*labo|cosrx|anua|skin1004|la\s*roche|bioderma| eucerin|kiehl)\b/.test(
      lowerQ
    );

  const baseQuery =
    rawTokens.slice(0, 5).join(" ") ||
    query.replace(/[?!.,]+/g, "").trim().slice(0, 60);
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
      .slice(0, 3)
      .join(" ") || effectiveQuery;
  const results: WebSearchResultItem[] = [];

  // Filter out off-topic religious/cave/ancient history hits when the user is asking about skincare brands like "Kahf"
  const isRelevantResult = (title: string, snippet: string): boolean => {
    if (mentionsSkincareBrand) {
      const combined = `${title} ${snippet}`.toLowerCase();
      if (
        /\b(surah|quran|koran|meccan|cave|nakhchivan|moses|prophet|ayat|bible)\b/.test(
          combined
        )
      ) {
        return false;
      }
    }
    return true;
  };

  // 1. Live Google Web/News RSS Search
  const fetchGoogleRssSearch = async (
    searchTerm: string,
    lang: "id" | "en"
  ) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2400);
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
        const rawDesc = descMatch ? cleanHtmlEntities(descMatch[1]) : rawTitle;

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

  // 2. Wikipedia Live Search
  const fetchWikiSearch = async (lang: "id" | "en", searchTerm: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2200);
    try {
      const url = `https://${lang}.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        searchTerm
      )}&utf8=&format=json&srlimit=3&origin=*`;
      const res = await fetch(url, {
        headers: { "User-Agent": "FormyLabAI/2.0 (https://formylab.ai)" },
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      const items = data?.query?.search || [];
      return items
        .map((item: { title: string; snippet: string }) => {
          const cleanSnippet = cleanHtmlEntities(String(item.snippet || ""));
          if (!isRelevantResult(item.title, cleanSnippet)) return null;
          const pageUrl = `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(
            item.title.replace(/\s+/g, "_")
          )}`;
          return {
            title: item.title,
            snippet: cleanSnippet,
            url: pageUrl,
            sourceName:
              lang === "id" ? "Wikipedia Indonesia" : "Wikipedia Global",
          } satisfies WebSearchResultItem;
        })
        .filter(Boolean) as WebSearchResultItem[];
    } catch {
      clearTimeout(timer);
      return [];
    }
  };

  // 3. DuckDuckGo Instant Knowledge API
  const fetchDuckDuckGoInstant = async (searchTerm: string) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 2000);
    try {
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(
        searchTerm
      )}&format=json&no_html=1&skip_disambig=1`;
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timer);
      if (!res.ok) return [];
      const data = await res.json();
      const ddgItems: WebSearchResultItem[] = [];
      if (
        data?.AbstractText &&
        data?.AbstractURL &&
        isRelevantResult(data.Heading || searchTerm, String(data.AbstractText))
      ) {
        ddgItems.push({
          title: data.Heading || searchTerm,
          snippet: String(data.AbstractText).slice(0, 320),
          url: String(data.AbstractURL),
          sourceName: data.AbstractSource || "DuckDuckGo Knowledge",
        });
      }
      return ddgItems;
    } catch {
      clearTimeout(timer);
      return [];
    }
  };

  try {
    const [googleId, idWiki, enWiki, ddg] = await Promise.all([
      fetchGoogleRssSearch(effectiveQuery, "id"),
      fetchWikiSearch("id", effectiveQuery),
      fetchWikiSearch("en", wikiQuery),
      fetchDuckDuckGoInstant(effectiveQuery),
    ]);

    const combined = [...googleId, ...ddg, ...idWiki, ...enWiki];
    const seenUrls = new Set<string>();
    for (const item of combined) {
      if (item.snippet && !seenUrls.has(item.url) && results.length < 5) {
        seenUrls.add(item.url);
        results.push(item);
      }
    }
  } catch {
    // Ignore network errors gracefully
  }

  if (results.length === 0) {
    return { results: [], contextBlockForAi: "", sourcesMarkdown: "" };
  }

  const contextBlockForAi = `\n[LIVE INTERNET CONTEXT FOR "${query}"]:\n${results
    .map(
      (r, idx) =>
        `${idx + 1}. [${r.sourceName}] ${r.title}: ${r.snippet} (URL: ${r.url})`
    )
    .join(
      "\n"
    )}\nINSTRUCTION: Use these real-time facts naturally in your response. CRITICAL: Do NOT add a "Referensi" or "Sumber" section at the end of your reply unless the user explicitly asked for sources/links.`;

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
