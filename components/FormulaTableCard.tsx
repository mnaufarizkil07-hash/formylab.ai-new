"use client";

import React, { useState } from "react";
import {
  Check,
  Copy,
  FileText,
  FlaskConical,
  Table2,
  Sparkles,
  Beaker,
  ShieldCheck,
  Thermometer,
  ListOrdered,
  Loader2,
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

  if (table.isLoading) {
    return (
      <article
        className="w-full rounded-[20px] bg-white/85 backdrop-blur-xl border border-[#0E807E]/20 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),0_14px_34px_-18px_rgba(11,43,38,0.14)] overflow-hidden"
        aria-label={`Menyusun Tabel R&D: ${table.title}`}
        aria-busy="true"
        data-formula-table-loading="true"
      >
        <div className="px-5 py-3.5 bg-gradient-to-r from-[#eaf8f5]/95 via-white/85 to-[#f3fbf9]/90 border-b border-[#0B2B26]/10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-[10px] bg-[#0E807E]/12 border border-[#0E807E]/25 text-[#0E807E] flex items-center justify-center shrink-0">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm sm:text-[15px] font-semibold text-[#0B2B26] tracking-[-0.01em] truncate">
                {table.title}
              </h3>
              <p className="text-xs text-[#2E524C] mt-0.5">
                {table.subtitle ||
                  "Menyusun bahan INCI, validasi total 100.00%, target pH, & prosedur R&D..."}
              </p>
            </div>
          </div>
          <span className="shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-medium text-[#0E807E] bg-[#0E807E]/10 border border-[#0E807E]/20">
            <span>Menyusun R&D...</span>
          </span>
        </div>

        <div className="px-5 py-4 space-y-2.5 animate-pulse">
          <div className="h-8 rounded-[10px] bg-[#eaf8f4]" />
          <div className="h-7 rounded-[8px] bg-[#f4fbf8]" />
          <div className="h-7 rounded-[8px] bg-[#f4fbf8] w-[96%]" />
          <div className="h-7 rounded-[8px] bg-[#f4fbf8] w-[92%]" />
          <div className="h-7 rounded-[8px] bg-[#f4fbf8] w-[98%]" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2">
            <div className="h-14 rounded-[12px] bg-[#f4fbf8]" />
            <div className="h-14 rounded-[12px] bg-[#f4fbf8]" />
          </div>
        </div>
      </article>
    );
  }

  const pctColIdx = table.columns.findIndex((c) =>
    /%|persen|konsentrasi/i.test(c)
  );
  const hasSpecs = Boolean(
    table.specs &&
      (table.specs.targetPh ||
        table.specs.texture ||
        table.specs.stabilityNote ||
        table.specs.bpomHalalNote)
  );
  const hasProcedure = Array.isArray(table.procedure) && table.procedure.length > 0;

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
            <span className="inline-block text-[10.5px] text-[#2E524C]/75 font-mono tabular-nums mt-0.5">
              {table.tableType === "comparison"
                ? "Tabel Perbandingan R&D"
                : table.tableType === "general"
                  ? "Tabel Informasi R&D"
                  : "Tabel Formulasi R&D"}{" "}
              · {table.rows.length} baris
              {table.totalPercentage ? ` · Total ${table.totalPercentage}` : ""}
              {table.createdAt ? ` · ${table.createdAt}` : ""}
            </span>
          </div>
        </div>

        <span className="shrink-0 inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10.5px] font-medium tracking-[0.04em] text-[#0E807E] bg-[#0E807E]/10 border border-[#0E807E]/20">
          <Sparkles className="w-3 h-3" aria-hidden="true" />
          <span>
            {table.totalPercentage ? `Total ${table.totalPercentage}` : "Tabel R&D"}
          </span>
        </span>
      </div>

      {/* Responsive Table Body + Specs + Procedure */}
      <div className="px-5 py-4 space-y-4">
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
                              : cIdx === 0
                                ? "font-medium text-[#0E807E] whitespace-nowrap"
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
            {table.totalPercentage && pctColIdx >= 0 && (
              <tfoot>
                <tr className="bg-[#eaf8f4]/75 border-t border-[#0B2B26]/14">
                  {table.columns.map((_, cIdx) => (
                    <td
                      key={cIdx}
                      className={`px-3.5 py-2.5 text-xs font-semibold ${
                        cIdx === pctColIdx
                          ? "font-mono tabular-nums text-[#0E807E] whitespace-nowrap"
                          : "text-[#0B2B26]"
                      }`}
                    >
                      {cIdx === 0
                        ? "TOTAL"
                        : cIdx === pctColIdx
                          ? table.totalPercentage
                          : cIdx === 1
                            ? "Komposisi Tervalidasi 100%"
                            : ""}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Target Specs Grid (pH, Tekstur, Stabilitas, BPOM/Halal) */}
        {hasSpecs && table.specs && (
          <div
            className="rounded-[14px] p-3.5 bg-[#f4fbf8] border border-[#0E807E]/18 space-y-2.5"
            aria-label="Spesifikasi Target Formulasi"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B2B26]">
              <Beaker className="w-3.5 h-3.5 text-[#0E807E]" aria-hidden="true" />
              <span>Spesifikasi Target (pH, Tekstur, Stabilitas & BPOM/Halal)</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {table.specs.targetPh && (
                <div className="rounded-[10px] bg-white px-3 py-2 border border-[#0B2B26]/8">
                  <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#0E807E] flex items-center gap-1">
                    <Thermometer className="w-3 h-3" aria-hidden="true" />
                    <span>Target pH</span>
                  </div>
                  <p className="text-xs font-semibold font-mono tabular-nums text-[#0B2B26] mt-0.5">
                    {table.specs.targetPh}
                  </p>
                </div>
              )}
              {table.specs.texture && (
                <div className="rounded-[10px] bg-white px-3 py-2 border border-[#0B2B26]/8">
                  <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#0E807E]">
                    Tekstur & Sensori
                  </div>
                  <p className="text-xs text-[#0B2B26] mt-0.5 leading-relaxed">
                    {table.specs.texture}
                  </p>
                </div>
              )}
              {table.specs.stabilityNote && (
                <div className="rounded-[10px] bg-white px-3 py-2 border border-[#0B2B26]/8">
                  <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#0E807E]">
                    Catatan Stabilitas
                  </div>
                  <p className="text-xs text-[#2E524C] mt-0.5 leading-relaxed">
                    {table.specs.stabilityNote}
                  </p>
                </div>
              )}
              {table.specs.bpomHalalNote && (
                <div className="rounded-[10px] bg-white px-3 py-2 border border-[#0B2B26]/8">
                  <div className="text-[10.5px] font-medium uppercase tracking-[0.06em] text-[#0E807E] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" aria-hidden="true" />
                    <span>BPOM & Halal</span>
                  </div>
                  <p className="text-xs text-[#2E524C] mt-0.5 leading-relaxed">
                    {table.specs.bpomHalalNote}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step-by-step R&D Procedure */}
        {hasProcedure && table.procedure && (
          <div
            className="rounded-[14px] p-3.5 bg-white border border-[#0B2B26]/10 space-y-2"
            aria-label="Prosedur Pembuatan Formulasi"
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold text-[#0B2B26]">
              <ListOrdered
                className="w-3.5 h-3.5 text-[#0E807E]"
                aria-hidden="true"
              />
              <span>Prosedur Pembuatan (Lab Scale)</span>
            </div>
            <ol className="space-y-1.5 list-none m-0 p-0">
              {table.procedure.map((step, idx) => {
                const cleanStep = step.replace(/^\d+[.)]\s*/, "").trim();
                return (
                  <li
                    key={idx}
                    className="flex items-start gap-2.5 text-xs text-[#2E524C] leading-relaxed"
                  >
                    <span className="w-5 h-5 rounded-full bg-[#eaf8f4] border border-[#0E807E]/25 text-[#0E807E] font-mono tabular-nums text-[10.5px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span className="flex-1">{cleanStep}</span>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

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
