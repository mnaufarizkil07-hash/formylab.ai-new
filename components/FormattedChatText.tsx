import React from "react";

/**
 * Cleans up any raw LaTeX math delimiters, backslashes, or computer-like syntax
 * so every AI message reads like natural, polished human & scientific prose.
 */
export function cleanComputerArtifacts(raw: string): string {
  if (!raw) return "";

  const cleaned = (
    raw
      // Decode any escaped HTML entities first so tags can be cleanly stripped
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#039;|&apos;/gi, "'")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      // Convert raw HTML <a href="url">label</a> into plain text "label"
      .replace(/<a\s+[^>]*>([\s\S]*?)<\/a>/gi, "$1")
      // Remove <font ...>text</font> keeping inner text
      .replace(/<font\s+[^>]*>([\s\S]*?)<\/font>/gi, "$1")
      // Strip any remaining raw HTML tags like <a ...>, </font>, <br>, <div>, <span>
      .replace(/<\/?(?:a|font|span|div|p|br|hr|img|table|tr|td|th|ul|ol|li|b|i|u|strong|em)\b[^>]*>/gi, " ")
      // Convert block $$...$$ into clean inline lines
      .replace(/\$\$([\s\S]*?)\$\$/g, (_, inner) => `\n${inner.trim()}\n`)
      // Convert LaTeX commands into clean Unicode typography
      .replace(/\\rightarrow|\\to\b/g, "→")
      .replace(/\\leftrightarrow/g, "↔")
      .replace(/\\leftarrow/g, "←")
      .replace(/\\le\b|\\leq\b/g, "≤")
      .replace(/\\ge\b|\\geq\b/g, "≥")
      .replace(/\\pm\b/g, "±")
      .replace(/\\times\b/g, "×")
      .replace(/\\div\b/g, "÷")
      .replace(/\\approx\b/g, "≈")
      .replace(/\\neq\b|\\ne\b/g, "≠")
      .replace(/\\Delta\b/g, "Δ")
      .replace(/\\alpha\b/g, "α")
      .replace(/\\beta\b/g, "β")
      .replace(/\\gamma\b/g, "γ")
      .replace(/\\mu\s*\\text\{m\}|\\mu\s*m\b/g, "µm")
      .replace(/\\sum\b/g, "Total ")
      .replace(/\\log_\{10\}/g, "log10")
      .replace(/\\mathbf\{([^}]*)\}/g, "**$1**")
      .replace(/\\mathrm\{([^}]*)\}/g, "$1")
      .replace(/\\text\{([^}]*)\}/g, "$1")
      .replace(/\\textit\{([^}]*)\}/g, "*$1*")
      .replace(/\\textbf\{([^}]*)\}/g, "**$1**")
      .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1 / $2)")
      .replace(/\\sqrt\{([^}]*)\}/g, "√($1)")
      .replace(/\\%/g, "%")
      // Clean subscript/superscript braces like HLB_{mix} -> HLB(mix), pK_a -> pKa, L_\beta -> L-beta
      .replace(/HLB_\{mix\}/g, "HLB campuran")
      .replace(/pK_a/g, "pKa")
      .replace(/a_w/g, "aw")
      .replace(/L_β|L_\\beta/g, "L-beta")
      .replace(/C_1V_1\s*=\s*C_2V_2/g, "C1 × V1 = C2 × V2")
      .replace(/\[H\^\+\]/g, "[H+]")
      .replace(/_\{([^}]*)\}/g, "($1)")
      .replace(/\^\{([^}]*)\}/g, "^$1")
      // Strip inline $...$ wrappers around formulas/variables (but keep currency like $100 if any)
      .replace(/\$([^$\n]{1,80})\$/g, "$1")
      // Remove stray LaTeX spacing commands
      .replace(/\\[,;!]\s*/g, " ")
      .replace(/\\quad\b|\\qquad\b/g, " ")
      // Strip search engine breadcrumb trails вместе with any wrapping Markdown (**...**, __...__) and trailing dash (—)
      .replace(
        /(?:\*\*|__|\*|_)?\s*(?:https?:\/\/|www\.)?[a-z0-9.-]+\.[a-z]{2,}(?:\s*(?:>|›|»)\s*[^\s\n|*]+)+\s*(?:\*\*|__|\*|_)?\s*(?:[—–:-]\s*)?/gi,
        " "
      )
      .replace(
        /(?:^|\s)(?:\*\*|__|\*|_)?\s*(?:>|›|»)\s*[a-z0-9_-]+(?:\s*(?:>|›|»)\s*[a-z0-9_-]+)+\s*(?:\*\*|__|\*|_)?\s*(?:[—–:-]\s*)?/gi,
        " "
      )
      // Strip search engine disclaimer / UI Chrome lines (e.g. "Sanggahan: ...", "Disclaimer: ...", "Terjemahkan halaman ini")
      .replace(
        /\b(?:Sanggahan|Disclaimer|Terjemahkan\s+halaman\s+ini|Lihat\s+hasil\s+untuk|Hasil\s+pencarian\s+web)\s*:?[^\n]*/gi,
        ""
      )
      // Strip web snippet publication dates embedded in narrative sentences (e.g. "(Fri, 13 Nov 2026)", "(Diterbitkan 12 Mei 2024)", "12 Mei 2024 — ")
      .replace(
        /[([][\s]*(?:(?:diterbitkan|dipublikasikan|diperbarui|updated|published)\s*(?:pada)?\s*)?(?:(?:Sen|Sel|Rab|Kam|Jum|Sab|Min|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*,?\s*)?\d{1,2}\s+(?:Jan(?:uari|uary)?|Feb(?:ruari|ruary)?|Mar(?:et|ch)?|Apr(?:il)?|Mei|May|Jun(?:i|e)?|Jul(?:i|y)?|Agu(?:stus)?|Aug(?:ust)?|Sep(?:tember)?|Okt(?:ober)?|Oct(?:ober)?|Nov(?:ember)?|Des(?:ember)?|Dec(?:ember)?)\s+\d{4}[^)\]\n]*[)\]]/gi,
        ""
      )
      .replace(
        /(?:^|\s|[-–—·•])(?:(?:Sen|Sel|Rab|Kam|Jum|Sab|Min|Mon|Tue|Wed|Thu|Fri|Sat|Sun)[a-z]*\s*,?\s*)?\d{1,2}\s+(?:Jan(?:uari|uary)?|Feb(?:ruari|ruary)?|Mar(?:et|ch)?|Apr(?:il)?|Mei|May|Jun(?:i|e)?|Jul(?:i|y)?|Agu(?:stus)?|Aug(?:ust)?|Sep(?:tember)?|Okt(?:ober)?|Oct(?:ober)?|Nov(?:ember)?|Des(?:ember)?|Dec(?:ember)?)\s+\d{4}(?:\s*,?\s*\d{1,2}[:.]\d{2}\s*(?:WIB|WITA|WIT)?)?\s*[-–—·•:]+\s*/gim,
        " "
      )
      .replace(
        /\b(?:yang\s+)?(?:diterbitkan|dipublikasikan|diunggah|diperbarui|published|updated)\s+(?:pada\s+|tanggal\s+)?\d{1,2}\s+(?:Jan(?:uari|uary)?|Feb(?:ruari|ruary)?|Mar(?:et|ch)?|Apr(?:il)?|Mei|May|Jun(?:i|e)?|Jul(?:i|y)?|Agu(?:stus)?|Aug(?:ust)?|Sep(?:tember)?|Okt(?:ober)?|Oct(?:ober)?|Nov(?:ember)?|Des(?:ember)?|Dec(?:ember)?)\s+\d{4}\s*,?\s*/gi,
        ""
      )
  );

  return stripDanglingMarkdownAndLeadingSymbols(cleaned);
}

/**
 * Menghapus tanda * atau ** yatim (tidak memiliki pasangan pembuka/penutup di baris yang sama)
 * yang menggantung tepat setelah tanda titik dua (:* atau :**) atau di awal/akhir poin bullet/baris,
 * tanpa merusak format **bold** dan *italic* yang normal.
 */
export function stripOrphanAsterisksInLine(line: string): string {
  if (!line || !line.includes("*")) return line;

  // Abaikan baris separator horizontal (***) atau baris tabel (| ... |)
  const trimmed = line.trim();
  if (/^\*{3,}$/.test(trimmed)) return line;

  // Pisahkan prefix bullet/numbering jika ada (mis. "- ", "* ", "• ", "1. ")
  const listPrefixMatch = line.match(/^(\s*(?:[-*•]|\d+\.)\s+)(.*)$/);
  const prefix = listPrefixMatch ? listPrefixMatch[1] : "";
  let body = listPrefixMatch ? listPrefixMatch[2] : line;

  // Bersihkan tanda * atau ** yatim yang menggantung sendirian tepat di awal isi bullet (mis. "- * Teks" atau "- ** Teks")
  body = body.replace(/^(?:\*\*|\*)\s+(?=[A-Za-z0-9([])/, "");

  // 1. Lindungi semua pasangan **bold** yang valid pada baris yang sama dengan placeholder sementara
  const boldPlaceholders: string[] = [];
  let working = body.replace(/\*\*([^*\n]+?)\*\*/g, (fullMatch) => {
    const idx = boldPlaceholders.length;
    boldPlaceholders.push(fullMatch);
    return `\u0000BOLD_${idx}\u0000`;
  });

  // Hapus sisa ** yatim (yang tidak memiliki pasangan di baris yang sama, seperti "Komposisi Teoretis (w/w %):**" atau "**Teks tanpa penutup")
  working = working
    .replace(/:\s*\*\*+(?=\s|$|[.,;!?—–-])/g, ":")
    .replace(/\*\*+/g, "");

  // 2. Sebelum memasangkan *italic*, cek apakah ada pola "Label:*" di mana tidak ada "*" pembuka sebelum ":"
  // Dalam Markdown, ":*" yang diikuti spasi atau akhir baris hanya bisa menjadi penutup; jika tidak ada "*" sebelumnya, maka itu yatim (seperti "Fase Air:*").
  working = working.replace(
    /^([^*\n:]+):\*(?=\s|$|[.,;!?—–-])/g,
    "$1:"
  );

  // Lindungi semua pasangan *italic* yang valid pada baris yang sama (tidak diawali/diakhiri spasi di dalam *)
  const italicPlaceholders: string[] = [];
  working = working.replace(
    /\*([^\s*\n][^*\n]*?[^\s*\n]|[^\s*\n])\*/g,
    (fullMatch) => {
      const idx = italicPlaceholders.length;
      italicPlaceholders.push(fullMatch);
      return `\u0000ITALIC_${idx}\u0000`;
    }
  );

  // Hapus sisa * yatim yang menggantung setelah titik dua (:*), di awal baris/kata, atau di ujung baris
  // (Tetap pertahankan perkalian matematika seperti "2 * 3")
  working = working
    .replace(/:\s*\*(?=\s|$|[.,;!?—–-])/g, ":")
    .replace(/(?:^|\s)\*(?=\s|$)/g, " ")
    .replace(/^\*+|\*+$/g, "")
    .replace(/([^\d\s])\*(?=\s|$)/g, "$1")
    .replace(/(?:^|\s)\*(?=[^\d\s])/g, (m) => (m.startsWith(" ") ? " " : ""));

  // Kembalikan placeholder *italic* dan **bold**
  working = working.replace(
    /\u0000ITALIC_(\d+)\u0000/g,
    (_, idx) => italicPlaceholders[Number(idx)] || ""
  );
  working = working.replace(
    /\u0000BOLD_(\d+)\u0000/g,
    (_, idx) => boldPlaceholders[Number(idx)] || ""
  );

  return `${prefix}${working}`;
}

/**
 * Strips dangling or empty Markdown symbols (such as `**__`, `**`, `__`, `*`, `_`, `#`, `-`, `—`, `()`)
 * that hang alone at the start of a paragraph or response.
 */
export function stripDanglingMarkdownAndLeadingSymbols(input: string): string {
  if (!input) return "";

  const withoutEmptyWrappers = input
    // Remove empty bold/italic/underline combinations like "**__", "__**", "****", "** **", "** — **", "()"
    .replace(/(?:\*\*|__){1,3}\s*(?:[—–:-]\s*)?(?:\*\*|__){1,3}/g, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    // Remove standalone "**", "__" followed by whitespace, dash, or end of line
    .replace(/(?:^|\s)(?:\*\*|__)+(?=\s|$|[—–:.,;!?-])/gm, " ");

  const lines = withoutEmptyWrappers.split("\n");
  const cleanedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    // Keep Markdown table rows intact (clean orphan asterisks inside each cell on render)
    if (trimmed.startsWith("|")) {
      return line;
    }

    // Preserve Markdown headings (#, ##, ###, ####) while cleaning orphan asterisks inside the heading text
    const headingMatch = line.match(/^(\s*#{1,6}\s+)(.*)$/);
    if (headingMatch) {
      return `${headingMatch[1]}${stripOrphanAsterisksInLine(headingMatch[2]).trim()}`;
    }

    // Keep valid bullet list items (e.g. "- **Point**: ..." or "- Text") intact, cleaning dangling/orphan symbols after the bullet
    const bulletMatch = line.match(/^(\s*[-*•]\s+)(.*)$/);
    if (bulletMatch) {
      const rest = stripOrphanAsterisksInLine(
        bulletMatch[2]
          .replace(/^(?:[*_#~—–:()[\]>›»-]+\s*)+(?=\s|$)/, "")
          .replace(
            /^(?:\*\*|__|\*|_)+(?![^\n]*?(?:\*\*|__|\*|_))\s*(?:[—–:-]\s*)?/,
            ""
          )
      ).trim();
      return rest ? `${bulletMatch[1]}${rest}` : "";
    }

    // For regular prose paragraphs:
    // 1. Strip any leading dangling/unpaired Markdown symbols (*, _, #, -, —, (, ), >, ›) hanging alone with spaces/dashes
    const cleanedLine = line
      .replace(/^\s*(?:[*_#~—–:()[\]>›»-]+\s+)+/, "")
      .replace(/^\s*(?:\*\*|__)+(?:\s*[—–:-]\s*)?(?=\s|$)/, "")
      // 2. Strip mixed empty markers like "**__Hasil" or "__**Hasil" or "** — Hasil" at the start of a paragraph
      .replace(/^\s*(?:\*\*__|__\*\*|\*_|_\*)+[\s*_#~—–:()[\]>›»-]*/, "")
      // 3. Strip unpaired "**" or "__" or "*" or "_" at the start of the line when there is no matching closing marker on that line
      .replace(
        /^\s*(?:\*\*|__|\*|_)+(?![^\n]*?(?:\*\*|__|\*|_))[\s*_#~—–:()[\]>›»-]*/,
        ""
      )
      // 4. Strip any leftover leading dash/colon/bracket separator before the first letter
      .replace(/^\s*[—–:;()[\]>›»#]+\s*/, "");

    return stripOrphanAsterisksInLine(cleanedLine);
  });

  return cleanedLines
    .join("\n")
    .replace(/^\s*(?:[*_#~—–:()[\]>›»-]+\s*)+(?=[A-Za-z0-9])/, (match) => {
      // Preserve a valid opening "**Word**" or "*Word*" if it is a clean marker
      if (/^\s*\*\*$/.test(match)) return "**";
      if (/^\s*\*$/.test(match)) return "*";
      return "";
    })
    .trim();
}

function renderInlineMarkdown(text: string): React.ReactNode[] {
  const cleaned = stripOrphanAsterisksInLine(text).trim();
  if (!cleaned) return [];

  const parts: React.ReactNode[] = [];
  // Tokenize **bold**, *italic*, `code`, and [link](url)
  const regex =
    /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let keyIdx = 0;

  while ((match = regex.exec(cleaned)) !== null) {
    if (match.index > lastIndex) {
      parts.push(cleaned.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={`b-${keyIdx++}`} className="font-semibold text-current">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={`i-${keyIdx++}`} className="italic">
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className="px-1.5 py-0.5 rounded-md bg-emerald-950/8 text-[#12382f] font-mono text-[0.88em] font-medium"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("[") && token.includes("](")) {
      const closeBracket = token.indexOf("](");
      const label = token.slice(1, closeBracket);
      const url = token.slice(closeBracket + 2, -1);
      parts.push(
        <a
          key={`a-${keyIdx++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-700 underline hover:text-emerald-900 font-medium break-all"
        >
          {label}
        </a>
      );
    } else {
      parts.push(token);
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < cleaned.length) {
    parts.push(cleaned.slice(lastIndex));
  }

  return parts;
}

/**
 * Checks whether a line is a Markdown table separator row like:
 * | :--- | :---: | ---: | or |---|---|
 */
export function isTableSeparatorLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{2,}:?$/.test(c));
}

/**
 * Checks whether a line looks like a Markdown table row (e.g. | Kolom A | Kolom B |)
 */
export function isTableRowLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  if (trimmed.startsWith("||")) return false;
  // Either starts and ends with |, or has at least 2 pipe characters separating columns
  const pipeCount = (trimmed.match(/\|/g) || []).length;
  return (
    (trimmed.startsWith("|") && trimmed.endsWith("|") && pipeCount >= 2) ||
    pipeCount >= 2
  );
}

export function splitTableCells(line: string): string[] {
  const trimmed = line.trim().replace(/^\|/, "").replace(/\|$/, "");
  return trimmed.split("|").map((cell) => cell.trim());
}

type ParsedBlock =
  | {
      type: "table";
      headers: string[];
      rows: string[][];
    }
  | {
      type: "lines";
      lines: string[];
    };

/**
 * Groups contiguous Markdown table lines into structured table blocks
 * while keeping normal text lines together.
 */
export function parseSegmentIntoBlocks(segment: string): ParsedBlock[] {
  const rawLines = segment.split("\n");
  const blocks: ParsedBlock[] = [];
  let i = 0;

  while (i < rawLines.length) {
    const current = rawLines[i].trim();

    // Check if a Markdown table starts at line i
    // Case A: Line i is a table row AND line i+1 (or next non-empty line) is a table separator or another table row
    if (isTableRowLine(current)) {
      const tableLines: string[] = [];
      let j = i;
      while (j < rawLines.length) {
        const candidate = rawLines[j].trim();
        if (!candidate) {
          // If an empty line appears between pipe rows (like in Screenshot 2!), peek at j+1
          if (
            j + 1 < rawLines.length &&
            isTableRowLine(rawLines[j + 1].trim())
          ) {
            j++;
            continue;
          }
          break;
        }
        if (isTableRowLine(candidate) || isTableSeparatorLine(candidate)) {
          tableLines.push(candidate);
          j++;
        } else {
          break;
        }
      }

      const nonSeparatorRows = tableLines.filter(
        (l) => !isTableSeparatorLine(l)
      );
      if (nonSeparatorRows.length >= 2) {
        const headers = splitTableCells(nonSeparatorRows[0]);
        const rows = nonSeparatorRows.slice(1).map((r) => {
          const cells = splitTableCells(r);
          // Pad or trim to match header count
          if (cells.length < headers.length) {
            return [
              ...cells,
              ...Array(headers.length - cells.length).fill("—"),
            ];
          }
          return cells.slice(0, headers.length);
        });
        blocks.push({ type: "table", headers, rows });
        i = j;
        continue;
      }
    }

    // Otherwise accumulate regular text line
    const lastBlock = blocks[blocks.length - 1];
    if (lastBlock && lastBlock.type === "lines") {
      lastBlock.lines.push(rawLines[i]);
    } else {
      blocks.push({ type: "lines", lines: [rawLines[i]] });
    }
    i++;
  }

  return blocks;
}

export default function FormattedChatText({ content }: { content: string }) {
  if (!content) return null;

  const sanitizedContent = cleanComputerArtifacts(content);

  // Split by fenced code blocks first
  const segments = sanitizedContent.split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2.5 leading-relaxed text-[14.5px]">
      {segments.map((segment, segIdx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const codeBody = segment
            .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
            .replace(/```$/, "")
            .trim();
          return (
            <pre
              key={`code-${segIdx}`}
              className="p-3.5 rounded-xl bg-[#111815] text-emerald-50 text-xs font-mono overflow-x-auto my-2.5 border border-emerald-900/20"
            >
              <code>{codeBody}</code>
            </pre>
          );
        }

        const blocks = parseSegmentIntoBlocks(segment);

        return (
          <div key={`seg-${segIdx}`} className="space-y-2.5">
            {blocks.map((block, bIdx) => {
              if (block.type === "table") {
                return (
                  <div
                    key={`tbl-${segIdx}-${bIdx}`}
                    className="my-3 overflow-x-auto rounded-xl border border-emerald-900/15 bg-white shadow-2xs"
                  >
                    <table className="w-full border-collapse text-left text-xs sm:text-[13.5px] tabular-nums">
                      <thead>
                        <tr className="bg-[#12382f] text-white">
                          {block.headers.map((header, hIdx) => (
                            <th
                              key={`th-${hIdx}`}
                              className="px-3.5 py-2.5 font-bold tracking-tight border-b border-emerald-950/20 first:rounded-tl-xl last:rounded-tr-xl"
                            >
                              {renderInlineMarkdown(header)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-emerald-950/10">
                        {block.rows.map((row, rIdx) => (
                          <tr
                            key={`tr-${rIdx}`}
                            className="even:bg-emerald-50/35 hover:bg-emerald-50/75 transition-colors"
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={`td-${rIdx}-${cIdx}`}
                                className={`px-3.5 py-2.5 align-top leading-snug text-slate-800 ${
                                  cIdx === 0
                                    ? "font-semibold text-[#12382f] bg-emerald-50/25"
                                    : ""
                                }`}
                              >
                                {renderInlineMarkdown(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }

              return (
                <div key={`lines-${segIdx}-${bIdx}`} className="space-y-1.5">
                  {block.lines.map((line, lineIdx) => {
                    const trimmed = line.trim();
                    if (!trimmed) {
                      return <div key={`br-${lineIdx}`} className="h-1" />;
                    }

                    // Skip any stray table separator lines
                    if (isTableSeparatorLine(trimmed)) {
                      return null;
                    }

                    // Horizontal rule --- or ***
                    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                      return (
                        <hr
                          key={`hr-${lineIdx}`}
                          className="my-2.5 border-emerald-950/10"
                        />
                      );
                    }

                    // Headings #### / ### / ## / #
                    if (trimmed.startsWith("#### ")) {
                      return (
                        <h5
                          key={`h4-${lineIdx}`}
                          className="font-bold text-[#12382f] text-[14px] pt-1"
                        >
                          {renderInlineMarkdown(trimmed.slice(5))}
                        </h5>
                      );
                    }
                    if (trimmed.startsWith("### ")) {
                      return (
                        <h4
                          key={`h3-${lineIdx}`}
                          className="font-bold text-[#12382f] text-[15px] pt-2"
                        >
                          {renderInlineMarkdown(trimmed.slice(4))}
                        </h4>
                      );
                    }
                    if (
                      trimmed.startsWith("## ") ||
                      trimmed.startsWith("# ")
                    ) {
                      const headingText = trimmed.replace(/^#+\s+/, "");
                      return (
                        <h3
                          key={`h2-${lineIdx}`}
                          className="font-extrabold text-[#12382f] text-base pt-2"
                        >
                          {renderInlineMarkdown(headingText)}
                        </h3>
                      );
                    }

                    // Blockquote >
                    if (trimmed.startsWith("> ")) {
                      return (
                        <blockquote
                          key={`bq-${lineIdx}`}
                          className="px-3.5 py-2 rounded-xl bg-emerald-50/60 border border-emerald-900/10 text-slate-700 text-[13.5px]"
                        >
                          {renderInlineMarkdown(trimmed.slice(2))}
                        </blockquote>
                      );
                    }

                    // Bullet list item
                    if (/^[-*•]\s+/.test(trimmed)) {
                      const indent = line.search(/\S/);
                      const itemText = trimmed.replace(/^[-*•]\s+/, "");
                      return (
                        <div
                          key={`ul-${lineIdx}`}
                          className={`flex items-start gap-2 ${
                            indent >= 2 ? "pl-4" : ""
                          }`}
                        >
                          <span className="text-[#0f766e] font-bold mt-0.5 select-none">
                            •
                          </span>
                          <span className="flex-1">
                            {renderInlineMarkdown(itemText)}
                          </span>
                        </div>
                      );
                    }

                    // Numbered list item
                    const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
                    if (numMatch) {
                      return (
                        <div
                          key={`ol-${lineIdx}`}
                          className="flex items-start gap-2"
                        >
                          <span className="font-bold text-[#12382f] shrink-0 select-none tabular-nums">
                            {numMatch[1]}
                          </span>
                          <span className="flex-1">
                            {renderInlineMarkdown(numMatch[2])}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <p key={`p-${lineIdx}`}>
                        {renderInlineMarkdown(trimmed)}
                      </p>
                    );
                  })}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
