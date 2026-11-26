"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  FileText,
  FlaskConical,
  Table2,
  Sparkles,
} from "lucide-react";
import {
  FormulaTableArtifact,
  formulaTableToMarkdown,
} from "./chatNoteUtils";

interface FormulaTableCardProps {
  table: FormulaTableArtifact;
  onSaveToGoogleDocs?: (table: FormulaTableArtifact) => void;
  onApplyToFormulator?: (table: FormulaTableArtifact) => void;
}

function isNumericCell(value: string): boolean {
  const cleaned = value.replace(/[*_`~]/g, "").trim();
  if (!cleaned) return false;
  return /^(?:Rp\.?\s*)?[-+]?\d[\d.,\s]*(?:%|g|mg|ml|kg|cP|pH|°C|USD|IDR|ad\s*100%)?(?:\s*[-–]\s*\d[\d.,\s]*(?:%|g|mg|ml|kg|cP|pH|°C)?)?$/i.test(
    cleaned
  );
}

export default function FormulaTableCard({
  table,
  onSaveToGoogleDocs,
  onApplyToFormulator,
}: FormulaTableCardProps) {
  const [copied, setCopied] = useState(false);
  const [savedDocsNotice, setSavedDocsNotice] = useState(false);
  const [applyingFormulator, setApplyingFormulator] = useState(false);

  const handleCopyTable = async () => {
    const markdown = formulaTableToMarkdown(table);
    try {
      await navigator.clipboard.writeText(markdown);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard may be restricted in sandboxed iframe
    }
  };

  const handleSaveDocs = () => {
    if (onSaveToGoogleDocs) {
      onSaveToGoogleDocs(table);
      setSavedDocsNotice(true);
      setTimeout(() => setSavedDocsNotice(false), 1800);
    }
  };

  const handleApplyFormulator = () => {
    if (onApplyToFormulator) {
      setApplyingFormulator(true);
      onApplyToFormulator(table);
    }
  };

  return (
    <article
      className="w-full rounded-[20px] bg-white/85 backdrop-blur-xl backdrop-saturate-[160%] border border-[#0B2B26]/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),0_14px_34px_-18px_rgba(11,43,38,0.16)] overflow-hidden"
      aria-label={`Tabel Formulasi: ${table.title}`}
      data-formula-table-card="true"
    >
      {/* Header */}
      <div className="px-5 py-3.5 bg-gradient-to-r from-[#eaf8f5]/95 via-white/85 to-[#f3fbf9]/90 border-b border-[#0B2B26]/10 flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-[10px] bg-[#0E807E]/12 border border-[#0E807E]/25 text-[#0E807E] flex items-center justify-center shrink-0 mt-0.5">
            <Table2 className="w-4 h-4" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h3 className="text-sm sm:text-[15px] font-semibold text-[#0B2B26] tracking-[-0.01em] leading-snug">
              {table.title}
            </h3>
            {table.subtitle && (
              <p className="text-xs text-[#2E524C] mt-0.5 leading-relaxed">
                {table.subtitle}
              </p>
            )}
            {table.createdAt && (
              <span className="inline-block text-[10.5px] text-[#2E524C]/75 font-mono tabular-nums mt-0.5">
                Tabel Formulasi R&D · {table.rows.length} baris · {table.createdAt}
              </span>
            )}
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium tracking-[0.04em] text-[#0E807E] bg-[#0E807E]/10 border border-[#0E807E]/20">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          <span>Tabel Formula</span>
        </span>
      </div>

      {/* Responsive Table Body */}
      <div className="px-5 py-4 space-y-3.5">
        <div className="w-full overflow-x-auto rounded-[12px] border border-[#0B2B26]/10 bg-white">
          <table className="w-full text-left border-collapse text-xs sm:text-[13px]">
            <thead>
              <tr className="bg-[#eaf8f4]/90 border-b border-[#0B2B26]/10">
                {table.columns.map((col, cIdx) => (
                  <th
                    key={cIdx}
                    className="px-3.5 py-2.5 font-semibold text-[#0B2B26] whitespace-nowrap"
                  >
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#0B2B26]/10">
              {table.rows.map((row, rIdx) => (
                <tr
                  key={rIdx}
                  className="hover:bg-[#f4fbf8]/80 transition-colors"
                >
                  {table.columns.map((_, cIdx) => {
                    const cell = row[cIdx] ?? "";
                    const numeric = isNumericCell(cell);
                    return (
                      <td
                        key={cIdx}
                        className={`px-3.5 py-2.5 text-[#2E524C] align-top ${
                          numeric
                            ? "font-mono tabular-nums text-[#0B2B26] font-medium whitespace-nowrap"
                            : cIdx === 1
                              ? "font-medium text-[#0B2B26]"
                              : ""
                        }`}
                      >
                        {cell}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Optional Lab / BPOM / Halal Process Notes */}
        {table.notes && (
          <div className="rounded-[12px] px-3.5 py-2.5 bg-[#f4fbf8] border border-[#0E807E]/20 text-xs text-[#2E524C] leading-relaxed">
            <span className="font-semibold text-[#0B2B26]">
              Catatan Proses & Keamanan:{" "}
            </span>
            {table.notes}
          </div>
        )}
      </div>

      {/* Footer Quick Actions */}
      <div className="px-5 py-3 bg-[#f7fbf9]/90 border-t border-[#0B2B26]/10 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleCopyTable}
          className="min-h-[36px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[#0B2B26] bg-white hover:bg-[#f4fbf8] border border-[#0B2B26]/12 transition-all cursor-pointer active:scale-[0.98]"
        >
          {copied ? (
            <Check className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
          )}
          <span>{copied ? "Tabel Tersalin" : "Salin Tabel"}</span>
        </button>

        <button
          type="button"
          onClick={handleSaveDocs}
          className="min-h-[36px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-[#2E524C] hover:text-[#0B2B26] bg-white/80 hover:bg-white border border-[#0E807E]/25 transition-all cursor-pointer active:scale-[0.98]"
        >
          {savedDocsNotice ? (
            <Check className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
          ) : (
            <FileText className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
          )}
          <span>
            {savedDocsNotice ? "Disiapkan di Docs" : "Simpan ke Google Docs"}
          </span>
        </button>

        <button
          type="button"
          onClick={handleApplyFormulator}
          disabled={applyingFormulator}
          className="min-h-[36px] px-3.5 py-1.5 rounded-full inline-flex items-center gap-1.5 text-xs font-medium text-white bg-[#0E807E] hover:bg-[#0B6A68] border border-[#0E807E] transition-all cursor-pointer active:scale-[0.98] disabled:opacity-70"
        >
          <FlaskConical className="w-3.5 h-3.5" aria-hidden="true" />
          <span>
            {applyingFormulator
              ? "Membuka Formulator..."
              : "Terapkan ke Formulator"}
          </span>
        </button>
      </div>
    </article>
  );
}
