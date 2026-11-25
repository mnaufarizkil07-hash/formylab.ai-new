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
  contextText?: string;
  attachments?: ChatAttachment[];
  activePillars?: string[];
  voice: VoiceSynthesisState;
  onQuickFollowUp: (promptText: string) => void;
  onApplyToFormulator?: () => void;
}

export default function InteractiveMessageActions({
  content,
  contextText,
  attachments,
  activePillars: serverActivePillars,
  onQuickFollowUp,
  onApplyToFormulator,
}: InteractiveMessageActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);

  const lower = (content || "").toLowerCase();
  const autoShowHlbWidget = /\b(hlb|emulgator|tween|span|rasio\s+emulgator)\b/.test(
    lower
  );
  const [showLabWidget, setShowLabWidget] = useState(false);

  const detectedPillars = detectActiveAiPillars(content, attachments);
  const activePillars = React.useMemo(() => {
    if (!serverActivePillars || serverActivePillars.length === 0) {
      return detectedPillars;
    }
    const mapByName = new Map<
      string,
      { id: string; name: string; description: string }
    >();
    for (const name of serverActivePillars) {
      const existing = detectedPillars.find(
        (p) => p.name.toLowerCase() === name.toLowerCase()
      );
      mapByName.set(name.toLowerCase(), {
        id: existing?.id || name.toLowerCase().replace(/\s+/g, "-"),
        name,
        description:
          existing?.description || `${name} aktif pada pemrosesan pesan ini`,
      });
    }
    for (const p of detectedPillars) {
      if (!mapByName.has(p.name.toLowerCase())) {
        mapByName.set(p.name.toLowerCase(), p);
      }
    }
    return Array.from(mapByName.values());
  }, [detectedPillars, serverActivePillars]);

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
    if (onApplyToFormulator) {
      onApplyToFormulator();
      return;
    }
    const draft = extractFormulationFromText(content, contextText);
    try {
      localStorage.setItem("importedChatFormulation", JSON.stringify(draft));
    } catch {
      // ignore storage errors
    }
    router.push("/formulate");
  };

  return (
    <div className="mt-4 pt-3 border-t border-[#0B2B26]/10">
      {/* 4 AI PILLARS METADATA ROW */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#365953] mb-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="eyebrow-label !text-[10px] text-[#365953]">
            Pilar AI Aktif:
          </span>
          {activePillars.map((pillar, idx) => (
            <React.Fragment key={pillar.id}>
              {idx > 0 && (
                <span aria-hidden="true" className="text-[#0B2B26]/25">
                  ·
                </span>
              )}
              <span
                className="font-medium text-[#0E7A78]"
                title={pillar.description}
              >
                {pillar.name}
              </span>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* INTERACTIVE ACTION BUTTONS — Optical Glass Clear + Blur */}
      <div className="flex flex-wrap items-center gap-2">
        {/* 1. APPLY FORMULA TO /FORMULATE */}
        <button
          type="button"
          onClick={handleApplyToFormulator}
          className="btn-glass-primary text-[12px] leading-none py-2 px-3.5 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          title="Ekstrak bahan aktif, target pH, dan viskositas langsung ke Studio Formulator"
        >
          <FlaskConical className="w-3.5 h-3.5 text-[#0E7A78]" />
          <span>Terapkan ke Formulator</span>
        </button>

        {/* 2. TOGGLE INTERACTIVE LAB WIDGET (HLB & BATCH CALCULATOR) */}
        <button
          type="button"
          onClick={() => setShowLabWidget((prev) => !prev)}
          className={`${
            showLabWidget ? "btn-glass-primary" : "btn-glass-compact"
          } inline-flex items-center gap-1.5 px-3.5 py-2 text-xs cursor-pointer whitespace-nowrap shrink-0`}
          title="Buka Kalkulator HLB & Batch Scaling Interaktif di dalam chat"
        >
          <Sliders className="w-3.5 h-3.5 text-[#0E7A78]" />
          <span>Kalkulator Lab</span>
        </button>

        {/* 3. QUICK AUDIT BPOM & HALAL */}
        <button
          type="button"
          onClick={() =>
            onQuickFollowUp(
              "Buatkan checklist Audit Kepatuhan BPOM & Sertifikasi Halal LPPOM MUI beserta batas konsentrasi aman untuk bahan pada pembahasan di atas."
            )
          }
          className="btn-glass-compact inline-flex items-center gap-1.5 px-3.5 py-2 text-xs cursor-pointer whitespace-nowrap shrink-0"
          title="Audit Kepatuhan BPOM & Halal untuk topik ini"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#0E7A78]" />
          <span>Audit BPOM &amp; Halal</span>
        </button>

        {/* 4. COPY CLEAN TEXT */}
        <button
          type="button"
          onClick={handleCopy}
          className="btn-glass-compact inline-flex items-center gap-1.5 px-3.5 py-2 text-xs cursor-pointer whitespace-nowrap shrink-0"
          title="Salin jawaban ke clipboard"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-[#146c43]" />
              <span className="text-[#146c43] font-medium">Tersalin</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-[#234741]" />
              <span>Salin</span>
            </>
          )}
        </button>
      </div>

      {/* INTERACTIVE QUICK-REPLY CHIPS WHEN AI ASKS BACK ABOUT MISSING BRIEF */}
      {lower.includes("konfirmasi spesifikasi brief") && (
        <div className="mt-3 p-3.5 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10 space-y-2">
          <div className="text-[11px] font-medium text-[#0E7A78]">
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
              className="btn-glass-compact px-3.5 py-1.5 text-[11px] cursor-pointer text-left"
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
              className="btn-glass-compact px-3.5 py-1.5 text-[11px] cursor-pointer text-left"
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
