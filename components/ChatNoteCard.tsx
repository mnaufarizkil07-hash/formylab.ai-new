"use client";

import React, { useState } from "react";
import { Check, Copy, FileText, Table2, ExternalLink } from "lucide-react";
import { ChatNoteArtifact } from "./chatNoteUtils";

interface ChatNoteCardProps {
  note: ChatNoteArtifact;
  onSaveToGoogleDocs?: (note: ChatNoteArtifact) => void;
}

type NoteBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "paragraph"; text: string }
  | { type: "bullet_list"; items: string[] }
  | { type: "ordered_list"; items: string[] }
  | { type: "table"; headers: string[]; rows: string[][] };

function isTableSeparatorRow(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.includes("|")) return false;
  const cells = trimmed
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((c) => c.trim());
  return (
    cells.length > 0 &&
    cells.every((c) => /^:?-{2,}:?$/.test(c))
  );
}

function splitMarkdownTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function isMostlyNumericCell(text: string): boolean {
  const cleaned = text.replace(/[*_`~]/g, "").trim();
  if (!cleaned) return false;
  return /^(?:Rp\.?\s*)?[-+]?\d[\d.,\s]*(?:%|g|mg|ml|kg|cP|pH|°C|USD|IDR)?(?:\s*[-–]\s*\d[\d.,\s]*(?:%|g|mg|ml|kg|cP|pH|°C)?)?$/i.test(
    cleaned
  );
}

function parseMarkdownBlocks(markdown: string): NoteBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: NoteBlock[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    if (!trimmed) {
      i += 1;
      continue;
    }

    // Markdown table detection: header line with pipes followed by separator row
    if (
      trimmed.includes("|") &&
      i + 1 < lines.length &&
      isTableSeparatorRow(lines[i + 1])
    ) {
      const headers = splitMarkdownTableRow(trimmed);
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length) {
        const rowTrimmed = lines[i].trim();
        if (!rowTrimmed || !rowTrimmed.includes("|")) break;
        const rowCells = splitMarkdownTableRow(rowTrimmed);
        if (rowCells.length > 0) {
          rows.push(rowCells);
        }
        i += 1;
      }
      blocks.push({ type: "table", headers, rows });
      continue;
    }

    // Heading (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: "heading",
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i += 1;
      continue;
    }

    // Bullet list
    if (/^[-*•]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*•]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*•]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "bullet_list", items });
      continue;
    }

    // Ordered list
    if (/^\d+[.)]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+[.)]\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+[.)]\s+/, "").trim());
        i += 1;
      }
      blocks.push({ type: "ordered_list", items });
      continue;
    }

    // Paragraph (combine consecutive plain lines)
    const paraLines: string[] = [];
    while (i < lines.length) {
      const cur = lines[i].trim();
      if (
        !cur ||
        /^#{1,4}\s+/.test(cur) ||
        /^[-*•]\s+/.test(cur) ||
        /^\d+[.)]\s+/.test(cur) ||
        (cur.includes("|") &&
          i + 1 < lines.length &&
          isTableSeparatorRow(lines[i + 1]))
      ) {
        break;
      }
      paraLines.push(cur);
      i += 1;
    }
    if (paraLines.length > 0) {
      blocks.push({ type: "paragraph", text: paraLines.join(" ") });
    }
  }

  return blocks;
}

function renderInlineFormatted(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g);
  return parts.map((segment, idx) => {
    if (segment.startsWith("**") && segment.endsWith("**") && segment.length > 4) {
      return (
        <strong key={idx} className="font-semibold text-[#0B2B26]">
          {segment.slice(2, -2)}
        </strong>
      );
    }
    if (segment.startsWith("`") && segment.endsWith("`") && segment.length > 2) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded bg-[#0E807E]/10 text-[#0B2B26] font-mono text-[12px]"
        >
          {segment.slice(1, -1)}
        </code>
      );
    }
    if (segment.startsWith("*") && segment.endsWith("*") && segment.length > 2) {
      return (
        <em key={idx} className="italic text-[#2E524C]">
          {segment.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={idx}>{segment}</React.Fragment>;
  });
}

export default function ChatNoteCard({
  note,
  onSaveToGoogleDocs,
}: ChatNoteCardProps) {
  const [copied, setCopied] = useState(false);
  const [docsNotice, setDocsNotice] = useState(false);

  const blocks = parseMarkdownBlocks(note.markdownContent);
  const badgeLabel = note.format === "table" ? "Tabel" : "Catatan R&D";
  const HeaderIcon = note.format === "table" ? Table2 : FileText;

  const handleCopyNote = async () => {
    const plain = `# ${note.title}\n\n${note.markdownContent}`;
    try {
      await navigator.clipboard.writeText(plain);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard blocked in restricted iframe
    }
  };

  const handleGoogleDocsHook = () => {
    if (onSaveToGoogleDocs) {
      onSaveToGoogleDocs(note);
      setDocsNotice(true);
      setTimeout(() => setDocsNotice(false), 1800);
      return;
    }
    setDocsNotice(true);
    setTimeout(() => setDocsNotice(false), 2200);
  };

  return (
    <article
      className="w-full rounded-[20px] bg-white/75 backdrop-blur-xl backdrop-saturate-[160%] border border-[#0B2B26]/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),0_14px_34px_-18px_rgba(11,43,38,0.16)] overflow-hidden"
      aria-label={`Catatan: ${note.title}`}
    >
      {/* Card Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#eefaf6]/90 via-white/80 to-[#f4fbf8]/85 border-b border-[#0B2B26]/10 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[10px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
            <HeaderIcon className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-medium text-[#0B2B26] tracking-[-0.01em] truncate">
              {note.title}
            </h3>
            {note.createdAt && (
              <span className="text-[10.5px] text-[#2E524C]/80 font-mono tabular-nums">
                Tersimpan di room chat · {note.createdAt}
              </span>
            )}
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center px-2.5 py-1 rounded-full text-[10.5px] font-medium tracking-[0.04em] text-[#0E807E] bg-[#0E807E]/10 border border-[#0E807E]/20">
          {badgeLabel}
        </span>
      </div>

      {/* Card Body: Structured Paragraphs, Lists & Scrollable Tables */}
      <div className="px-5 py-4 space-y-3.5 text-[13.5px] leading-relaxed text-[#2E524C]">
        {blocks.map((block, idx) => {
          if (block.type === "heading") {
            return (
              <h4
                key={idx}
                className="text-[13px] font-semibold uppercase tracking-[0.04em] text-[#0B2B26] pt-1"
              >
                {renderInlineFormatted(block.text)}
              </h4>
            );
          }

          if (block.type === "paragraph") {
            return (
              <p key={idx} className="text-[#2E524C] leading-[1.65]">
                {renderInlineFormatted(block.text)}
              </p>
            );
          }

          if (block.type === "bullet_list") {
            return (
              <ul key={idx} className="space-y-1.5 pl-4 list-disc marker:text-[#0E807E]">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-[#2E524C] pl-0.5">
                    {renderInlineFormatted(item)}
                  </li>
                ))}
              </ul>
            );
          }

          if (block.type === "ordered_list") {
            return (
              <ol
                key={idx}
                className="space-y-1.5 pl-5 list-decimal marker:text-[#0E807E] marker:font-mono marker:text-xs"
              >
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="text-[#2E524C] pl-0.5">
                    {renderInlineFormatted(item)}
                  </li>
                ))}
              </ol>
            );
          }

          // Clean horizontally scrollable HTML table
          return (
            <div
              key={idx}
              className="w-full overflow-x-auto rounded-[12px] border border-[#0B2B26]/10 bg-white/80"
            >
              <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
                <thead>
                  <tr className="bg-[#eaf8f4]/85 border-b border-[#0B2B26]/10">
                    {block.headers.map((header, hIdx) => (
                      <th
                        key={hIdx}
                        className="px-3.5 py-2.5 font-semibold text-[#0B2B26] whitespace-nowrap"
                      >
                        {renderInlineFormatted(header)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#0B2B26]/10">
                  {block.rows.map((row, rIdx) => (
                    <tr
                      key={rIdx}
                      className="hover:bg-[#f4fbf8]/70 transition-colors"
                    >
                      {block.headers.map((_, cIdx) => {
                        const cellVal = row[cIdx] ?? "";
                        const numeric = isMostlyNumericCell(cellVal);
                        return (
                          <td
                            key={cIdx}
                            className={`px-3.5 py-2.5 text-[#2E524C] align-top ${
                              numeric
                                ? "font-mono tabular-nums text-[#0B2B26] whitespace-nowrap"
                                : ""
                            }`}
                          >
                            {renderInlineFormatted(cellVal)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })}
      </div>

      {/* Card Footer Quick Actions */}
      <div className="px-5 py-3 bg-[#f7fbf9]/80 border-t border-[#0B2B26]/10 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopyNote}
            className="min-h-[36px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[#0B2B26] bg-white/75 hover:bg-white border border-[#0B2B26]/12 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] transition-all cursor-pointer active:scale-[0.98]"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            )}
            <span>{copied ? "Tersalin" : "Salin Catatan"}</span>
          </button>

          <button
            type="button"
            onClick={handleGoogleDocsHook}
            className="min-h-[36px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[#2E524C] hover:text-[#0B2B26] bg-white/60 hover:bg-white/90 border border-[#0E807E]/25 backdrop-blur-md shadow-[inset_0_1px_1px_rgba(255,255,255,0.9)] transition-all cursor-pointer active:scale-[0.98]"
            title="Simpan catatan ini sebagai dokumen Google Docs di Google Drive"
          >
            {docsNotice ? (
              <Check className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            ) : (
              <ExternalLink className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
            )}
            <span>
              {docsNotice
                ? onSaveToGoogleDocs
                  ? "Disiapkan di Google Docs"
                  : "Integrasi Google Docs segera aktif"
                : "Simpan ke Google Docs"}
            </span>
          </button>
        </div>
      </div>
    </article>
  );
}
