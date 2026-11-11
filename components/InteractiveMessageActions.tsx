"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Sliders,
  Copy,
  Check,
  ShieldCheck,
} from "lucide-react";
import {
  detectActiveAiPillars,
  extractFormulationFromText,
} from "../lib/interactiveAiEngine";
import { ChatAttachment } from "../lib/chatStorage";
import { VoiceSynthesisState } from "./InteractiveVoiceController";
import InteractiveLabWidgets from "./InteractiveLabWidgets";

interface InteractiveMessageActionsProps {
  messageId: string;
  content: string;
  attachments?: ChatAttachment[];
  voice: VoiceSynthesisState;
  onQuickFollowUp: (promptText: string) => void;
}

export default function InteractiveMessageActions({
  content,
  attachments,
  onQuickFollowUp,
}: InteractiveMessageActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const lower = (content || "").toLowerCase();
  const autoShowHlbWidget = /\b(hlb|emulgator|tween|span|rasio\s+emulgator)\b/.test(
    lower
  );
  const [showLabWidget, setShowLabWidget] = useState(false);

  const activePillars = detectActiveAiPillars(content, attachments);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplyToFormulator = () => {
    const draft = extractFormulationFromText(content);
    try {
      localStorage.setItem("importedChatFormulation", JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
    router.push("/formulate");
  };

  return (
    <div className="mt-3 pt-2.5 border-t border-slate-100">
      {/* 4 AI PILLARS METADATA ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 mb-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="font-semibold text-slate-500">Pilar AI Aktif:</span>
          {activePillars.map((pillar, idx) => (
            <React.Fragment key={pillar.id}>
              {idx > 0 && <span aria-hidden="true">·</span>}
              <span
                className="font-medium text-emerald-800"
                title={pillar.description}
              >
                {pillar.name}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* INTERACTIVE ACTION BUTTONS (WITHOUT DENGARKAN SUARA BUTTON) */}
      <div className="flex flex-wrap items-center gap-1.5">
        {/* 1. APPLY FORMULA TO /FORMULATE */}
        <button
          type="button"
          onClick={handleApplyToFormulator}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold bg-[#234e42] hover:bg-[#1a3a31] text-white transition cursor-pointer whitespace-nowrap shrink-0"
          title="Ekstrak bahan aktif, target pH, dan viskositas langsung ke Studio Formulator"
        >
          <FlaskConical className="w-3.5 h-3.5" />
          <span>Terapkan ke Formulator</span>
        </button>

        {/* 3. TOGGLE INTERACTIVE LAB WIDGET (HLB & BATCH CALCULATOR) */}
        <button
          type="button"
          onClick={() => setShowLabWidget((prev) => !prev)}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap shrink-0 ${
            showLabWidget
              ? "bg-emerald-100 text-[#234e42] border border-emerald-300"
              : "bg-slate-100 hover:bg-slate-200/80 text-slate-700"
          }`}
          title="Buka Kalkulator HLB & Batch Scaling Interaktif di dalam chat"
        >
          <Sliders className="w-3.5 h-3.5 text-emerald-700" />
          <span>Kalkulator Lab</span>
        </button>

        {/* 4. QUICK AUDIT BPOM & HALAL */}
        <button
          type="button"
          onClick={() =>
            onQuickFollowUp(
              "Buatkan checklist Audit Kepatuhan BPOM & Sertifikasi Halal LPPOM MUI beserta batas konsentrasi aman untuk bahan pada pembahasan di atas."
            )
          }
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-700 transition cursor-pointer whitespace-nowrap shrink-0"
          title="Audit Kepatuhan BPOM & Halal untuk topik ini"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
          <span>Audit BPOM &amp; Halal</span>
        </button>

        {/* 5. COPY CLEAN TEXT */}
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200/80 text-slate-600 transition cursor-pointer whitespace-nowrap shrink-0"
          title="Salin jawaban ke clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-700" />
              <span className="text-emerald-700 font-bold">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      {/* INTERACTIVE QUICK-REPLY CHIPS WHEN AI ASKS BACK ABOUT MISSING BRIEF ("NANYA BALIK") */}
      {lower.includes("konfirmasi spesifikasi brief") && (
        <div className="mt-3 p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 space-y-2">
          <div className="text-[11px] font-extrabold text-[#234e42]">
            💬 Balas Cepat Pertanyaan AI (Klik untuk Melengkapi Brief):
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() =>
                onQuickFollowUp(
                  "Target kulit sensitif & kemerahan dengan tekstur Light Gel-Cream cepat meresap, Target HPP Rp 12.500/pcs dengan budget percobaan Rp 300.000, Wajib Halal MUI/BPJPH, serta Deadline 8 minggu dengan MOQ 1.000 pcs."
                )
              }
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#234e42] text-[#234e42] hover:text-white border border-emerald-300 text-[11px] font-bold transition cursor-pointer text-left"
            >
              ✓ Kulit Sensitif · Gel-Cream · HPP 12,5rb · Trial 300rb · Wajib Halal · 8 Minggu · MOQ 1.000 pcs
            </button>
            <button
              type="button"
              onClick={() =>
                onQuickFollowUp(
                  "Target kulit berminyak & berjerawat (acne-prone) dengan tekstur Silky Watery Serum ringan, Target HPP Rp 14.000/pcs dengan budget percobaan Rp 350.000, Wajib Halal MUI/BPJPH, serta Deadline 6 minggu dengan MOQ 1.000 pcs."
                )
              }
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#234e42] text-[#234e42] hover:text-white border border-emerald-300 text-[11px] font-bold transition cursor-pointer text-left"
            >
              ✓ Kulit Acne · Watery Serum · HPP 14rb · Trial 350rb · Wajib Halal · 6 Minggu · MOQ 1.000 pcs
            </button>
          </div>
        </div>
      )}

      {/* INLINE INTERACTIVE LAB WIDGET */}
      {showLabWidget && (
        <InteractiveLabWidgets
          defaultTab={autoShowHlbWidget ? "hlb" : "batch"}
          onSendCalculatedPrompt={onQuickFollowUp}
        />
      )}
    </div>
  );
}
