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
      // Strip search engine breadcrumb trails together with any wrapping Markdown (**...**, __...__) and trailing dash (—)
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
      // Strip web snippet publication dates embedded in narrative sentences
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

  const trimmed = line.trim();
  if (/^\*{3,}$/.test(trimmed)) return line;

  const listPrefixMatch = line.match(/^(\s*(?:[-*•]|\d+\.)\s+)(.*)$/);
  const prefix = listPrefixMatch ? listPrefixMatch[1] : "";
  let body = listPrefixMatch ? listPrefixMatch[2] : line;

  body = body.replace(/^(?:\*\*|\*)\s+(?=[A-Za-z0-9([])/, "");

  const boldPlaceholders: string[] = [];
  let working = body.replace(/\*\*([^*\n]+?)\*\*/g, (fullMatch) => {
    const idx = boldPlaceholders.length;
    boldPlaceholders.push(fullMatch);
    return `\u0000BOLD_${idx}\u0000`;
  });

  working = working
    .replace(/:\s*\*\*+(?=\s|$|[.,;!?—–-])/g, ":")
    .replace(/\*\*+/g, "");

  working = working.replace(
    /^([^*\n:]+):\*(?=\s|$|[.,;!?—–-])/g,
    "$1:"
  );

  const italicPlaceholders: string[] = [];
  working = working.replace(
    /\*([^\s*\n][^*\n]*?[^\s*\n]|[^\s*\n])\*/g,
    (fullMatch) => {
      const idx = italicPlaceholders.length;
      italicPlaceholders.push(fullMatch);
      return `\u0000ITALIC_${idx}\u0000`;
    }
  );

  working = working
    .replace(/:\s*\*(?=\s|$|[.,;!?—–-])/g, ":")
    .replace(/(?:^|\s)\*(?=\s|$)/g, " ")
    .replace(/^\*+|\*+$/g, "")
    .replace(/([^\d\s])\*(?=\s|$)/g, "$1")
    .replace(/(?:^|\s)\*(?=[^\d\s])/g, (m) => (m.startsWith(" ") ? " " : ""));

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
    .replace(/(?:\*\*|__){1,3}\s*(?:[—–:-]\s*)?(?:\*\*|__){1,3}/g, " ")
    .replace(/\(\s*\)|\[\s*\]/g, " ")
    .replace(/(?:^|\s)(?:\*\*|__)+(?=\s|$|[—–:.,;!?-])/gm, " ");

  const lines = withoutEmptyWrappers.split("\n");
  const cleanedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (!trimmed) return "";

    if (trimmed.startsWith("|")) {
      return line;
    }

    const headingMatch = line.match(/^(\s*#{1,6}\s+)(.*)$/);
    if (headingMatch) {
      return `${headingMatch[1]}${stripOrphanAsterisksInLine(headingMatch[2]).trim()}`;
    }

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

    const cleanedLine = line
      .replace(/^\s*(?:[*_#~—–:()[\]>›»-]+\s+)+/, "")
      .replace(/^\s*(?:\*\*|__)+(?:\s*[—–:-]\s*)?(?=\s|$)/, "")
      .replace(/^\s*(?:\*\*__|__\*\*|\*_|_\*)+[\s*_#~—–:()[\]>›»-]*/, "")
      .replace(
        /^\s*(?:\*\*|__|\*|_)+(?![^\n]*?(?:\*\*|__|\*|_))[\s*_#~—–:()[\]>›»-]*/,
        ""
      )
      .replace(/^\s*[—–:;()[\]>›»#]+\s*/, "");

    return stripOrphanAsterisksInLine(cleanedLine);
  });

  return cleanedLines
    .join("\n")
    .replace(/^\s*(?:[*_#~—–:()[\]>›»-]+\s*)+(?=[A-Za-z0-9])/, (match) => {
      if (/^\s*\*\*$/.test(match)) return "**";
      if (/^\s*\*$/.test(match)) return "*";
      return "";
    })
    .trim();
}

type FormattedTone = "light" | "on-dark";

function renderInlineMarkdown(
  text: string,
  tone: FormattedTone = "light"
): React.ReactNode[] {
  const cleaned = stripOrphanAsterisksInLine(text).trim();
  if (!cleaned) return [];

  const isOnDark = tone === "on-dark";
  const parts: React.ReactNode[] = [];
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
        <strong
          key={`b-${keyIdx++}`}
          className={
            isOnDark ? "font-medium text-white" : "font-medium text-[#0B2B26]"
          }
        >
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em
          key={`i-${keyIdx++}`}
          className={
            isOnDark ? "italic text-white/95" : "italic text-[#2E524C]"
          }
        >
          {token.slice(1, -1)}
        </em>
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={`c-${keyIdx++}`}
          className={
            isOnDark
              ? "px-1.5 py-0.5 rounded-[6px] bg-white/14 text-[#D9ED91] border border-white/15 font-mono text-[0.88em] font-medium"
              : "px-1.5 py-0.5 rounded-[6px] bg-[#eaf8f5] text-[#0E807E] border border-[#0B2B26]/10 font-mono text-[0.88em] font-medium"
          }
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
          className={
            isOnDark
              ? "text-[#D9ED91] underline underline-offset-2 hover:text-white font-medium break-all"
              : "text-[#0E807E] underline underline-offset-2 hover:text-[#0B2B26] font-medium break-all"
          }
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

    if (isTableRowLine(current)) {
      const tableLines: string[] = [];
      let j = i;
      while (j < rawLines.length) {
        const candidate = rawLines[j].trim();
        if (!candidate) {
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
          if (cells.length < headers.length) {
            return [
              ...cells,
              ...Array(headers.length - cells.length).fill("-"),
            ];
          }
          return cells.slice(0, headers.length);
        });
        blocks.push({ type: "table", headers, rows });
        i = j;
        continue;
      }
    }

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

export default function FormattedChatText({
  content,
  tone = "light",
}: {
  content: string;
  tone?: FormattedTone;
}) {
  if (!content) return null;

  const isOnDark = tone === "on-dark";
  const sanitizedContent = cleanComputerArtifacts(content);
  const segments = sanitizedContent.split(/(```[\s\S]*?```)/g);

  return (
    <div
      className={`space-y-2.5 leading-relaxed text-[14.5px] ${
        isOnDark ? "text-white/95" : "text-[#2E524C]"
      }`}
    >
      {segments.map((segment, segIdx) => {
        if (segment.startsWith("```") && segment.endsWith("```")) {
          const codeBody = segment
            .replace(/^```[a-zA-Z0-9_-]*\n?/, "")
            .replace(/```$/, "")
            .trim();
          return (
            <pre
              key={`code-${segIdx}`}
              className={`p-3.5 rounded-[16px] text-xs font-mono overflow-x-auto my-2.5 border shadow-none ${
                isOnDark
                  ? "bg-white/10 text-white border-white/15"
                  : "bg-[#f4fbf8] text-[#0B2B26] border-[#0B2B26]/12"
              }`}
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
                    className={`my-3 overflow-x-auto rounded-[16px] border shadow-none ${
                      isOnDark
                        ? "border-white/15 bg-white/8"
                        : "border-[#0B2B26]/12 bg-white"
                    }`}
                  >
                    <table className="w-full border-collapse text-left text-xs sm:text-[13.5px] tabular-nums">
                      <thead>
                        <tr
                          className={
                            isOnDark
                              ? "bg-white/12 text-white"
                              : "bg-[#f2faf7] text-[#0B2B26]"
                          }
                        >
                          {block.headers.map((header, hIdx) => (
                            <th
                              key={`th-${hIdx}`}
                              className={`px-3.5 py-2.5 font-medium tracking-tight border-b ${
                                isOnDark
                                  ? "border-white/15"
                                  : "border-[#0B2B26]/10"
                              }`}
                            >
                              {renderInlineMarkdown(header, tone)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody
                        className={
                          isOnDark
                            ? "divide-y divide-white/10"
                            : "divide-y divide-[#0B2B26]/8"
                        }
                      >
                        {block.rows.map((row, rIdx) => (
                          <tr
                            key={`tr-${rIdx}`}
                            className={
                              isOnDark
                                ? "even:bg-white/[0.04] hover:bg-white/[0.08] transition-colors"
                                : "even:bg-[#f8fdfb] hover:bg-[#eefbf7] transition-colors"
                            }
                          >
                            {row.map((cell, cIdx) => (
                              <td
                                key={`td-${rIdx}-${cIdx}`}
                                className={`px-3.5 py-2.5 align-top leading-snug ${
                                  cIdx === 0
                                    ? isOnDark
                                      ? "font-medium text-white"
                                      : "font-medium text-[#0B2B26]"
                                    : isOnDark
                                      ? "text-white/85"
                                      : "text-[#2E524C]"
                                }`}
                              >
                                {renderInlineMarkdown(cell, tone)}
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

                    if (isTableSeparatorLine(trimmed)) {
                      return null;
                    }

                    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
                      return (
                        <hr
                          key={`hr-${lineIdx}`}
                          className={`my-2.5 ${
                            isOnDark ? "border-white/15" : "border-[#0B2B26]/10"
                          }`}
                        />
                      );
                    }

                    // Headings strictly weight 500
                    if (trimmed.startsWith("#### ")) {
                      return (
                        <h5
                          key={`h4-${lineIdx}`}
                          className={`font-medium text-[14px] tracking-[-0.01em] pt-1 ${
                            isOnDark ? "text-white" : "text-[#0B2B26]"
                          }`}
                        >
                          {renderInlineMarkdown(trimmed.slice(5), tone)}
                        </h5>
                      );
                    }
                    if (trimmed.startsWith("### ")) {
                      return (
                        <h4
                          key={`h3-${lineIdx}`}
                          className={`font-medium text-[15px] tracking-[-0.015em] pt-2 ${
                            isOnDark ? "text-white" : "text-[#0B2B26]"
                          }`}
                        >
                          {renderInlineMarkdown(trimmed.slice(4), tone)}
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
                          className={`font-medium text-base tracking-[-0.02em] pt-2 ${
                            isOnDark ? "text-white" : "text-[#0B2B26]"
                          }`}
                        >
                          {renderInlineMarkdown(headingText, tone)}
                        </h3>
                      );
                    }

                    if (trimmed.startsWith("> ")) {
                      return (
                        <blockquote
                          key={`bq-${lineIdx}`}
                          className={`px-3.5 py-2.5 rounded-[12px] border text-[13.5px] ${
                            isOnDark
                              ? "bg-white/10 border-white/15 text-white"
                              : "bg-[#f2faf7] border-[#0B2B26]/10 text-[#0B2B26]"
                          }`}
                        >
                          {renderInlineMarkdown(trimmed.slice(2), tone)}
                        </blockquote>
                      );
                    }

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
                          <span
                            className={`font-medium mt-0.5 select-none ${
                              isOnDark ? "text-[#D9ED91]" : "text-[#0E807E]"
                            }`}
                          >
                            •
                          </span>
                          <span
                            className={`flex-1 ${
                              isOnDark ? "text-white/95" : "text-[#2E524C]"
                            }`}
                          >
                            {renderInlineMarkdown(itemText, tone)}
                          </span>
                        </div>
                      );
                    }

                    const numMatch = trimmed.match(/^(\d+\.)\s+(.*)$/);
                    if (numMatch) {
                      return (
                        <div
                          key={`ol-${lineIdx}`}
                          className="flex items-start gap-2"
                        >
                          <span
                            className={`font-mono font-medium shrink-0 select-none tabular-nums ${
                              isOnDark ? "text-[#D9ED91]" : "text-[#0E807E]"
                            }`}
                          >
                            {numMatch[1]}
                          </span>
                          <span
                            className={`flex-1 ${
                              isOnDark ? "text-white/95" : "text-[#2E524C]"
                            }`}
                          >
                            {renderInlineMarkdown(numMatch[2], tone)}
                          </span>
                        </div>
                      );
                    }

                    return (
                      <p
                        key={`p-${lineIdx}`}
                        className={isOnDark ? "text-white/95" : "text-[#2E524C]"}
                      >
                        {renderInlineMarkdown(trimmed, tone)}
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
