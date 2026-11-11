"use client";

import React, { useState } from "react";
import { Sliders, FlaskConical, Scale, ArrowRight } from "lucide-react";
import { calculateInteractiveHlb } from "../lib/interactiveAiEngine";

interface InteractiveLabWidgetsProps {
  defaultTab?: "hlb" | "batch";
  onSendCalculatedPrompt?: (prompt: string) => void;
}

const SURFACTANT_PAIRS = [
  {
    id: "tween60-span60",
    label: "Polysorbate 60 (HLB 14.9) + Sorbitan Stearate (HLB 4.7)",
    highName: "Polysorbate 60 (Tween 60)",
    hlbHigh: 14.9,
    lowName: "Sorbitan Stearate (Span 60)",
    hlbLow: 4.7,
  },
  {
    id: "peg100-gms",
    label: "PEG-100 Stearate (HLB 18.8) + Glyceryl Stearate (HLB 3.8)",
    highName: "PEG-100 Stearate",
    hlbHigh: 18.8,
    lowName: "Glyceryl Stearate SE",
    hlbLow: 3.8,
  },
  {
    id: "tween80-span80",
    label: "Polysorbate 80 (HLB 15.0) + Sorbitan Oleate (HLB 4.3)",
    highName: "Polysorbate 80 (Tween 80)",
    hlbHigh: 15.0,
    lowName: "Sorbitan Oleate (Span 80)",
    hlbLow: 4.3,
  },
];

export default function InteractiveLabWidgets({
  defaultTab = "hlb",
  onSendCalculatedPrompt,
}: InteractiveLabWidgetsProps) {
  const [activeTab, setActiveTab] = useState<"hlb" | "batch">(defaultTab);

  // HLB Calculator State
  const [pairIdx, setPairIdx] = useState(0);
  const [targetHlb, setTargetHlb] = useState(11.0);
  const [totalEmulsifierPct, setTotalEmulsifierPct] = useState(4.0);

  // Batch & pH Buffer Calculator State
  const [batchGrams, setBatchGrams] = useState(500);
  const [activeConcentrationPct, setActiveConcentrationPct] = useState(4.0);
  const [oilPhasePct, setOilPhasePct] = useState(14.0);

  const selectedPair = SURFACTANT_PAIRS[pairIdx] || SURFACTANT_PAIRS[0];
  const hlbCalc = calculateInteractiveHlb({
    hlbHigh: selectedPair.hlbHigh,
    hlbLow: selectedPair.hlbLow,
    targetHlb,
    totalEmulsifierPct,
  });

  const activeWeightGrams = ((activeConcentrationPct / 100) * batchGrams).toFixed(2);
  const oilWeightGrams = ((oilPhasePct / 100) * batchGrams).toFixed(2);
  const waterPhasePct = Math.max(0, 100 - activeConcentrationPct - oilPhasePct - 1.0);
  const waterWeightGrams = ((waterPhasePct / 100) * batchGrams).toFixed(2);

  return (
    <div className="mt-3 pt-3 border-t border-slate-200/80 bg-slate-50/90 rounded-2xl p-3.5 text-slate-800">
      {/* HEADER & MODE SWITCHER */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-1.5 text-xs font-extrabold text-[#234e42]">
          <Sliders className="w-3.5 h-3.5 text-emerald-700" />
          <span>Interactive Analytical Lab Widget</span>
        </div>

        <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setActiveTab("hlb")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
              activeTab === "hlb"
                ? "bg-[#234e42] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <FlaskConical className="w-3 h-3" />
            <span>Kalkulator HLB</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("batch")}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1 ${
              activeTab === "batch"
                ? "bg-[#234e42] text-white"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Scale className="w-3 h-3" />
            <span>Batch &amp; Massa (g)</span>
          </button>
        </div>
      </div>

      {activeTab === "hlb" ? (
        <div className="space-y-3 text-xs">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Sistem Pasangan Surfaktan (High HLB + Low HLB):
            </label>
            <select
              value={pairIdx}
              onChange={(e) => setPairIdx(Number(e.target.value))}
              className="w-full p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-800"
            >
              {SURFACTANT_PAIRS.map((p, idx) => (
                <option key={p.id} value={idx}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Target Required HLB:
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {targetHlb.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={selectedPair.hlbLow}
                max={selectedPair.hlbHigh}
                step="0.1"
                value={targetHlb}
                onChange={(e) => setTargetHlb(parseFloat(e.target.value))}
                className="w-full accent-[#234e42] cursor-pointer"
              />
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Total Emulgator (% Batch):
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {totalEmulsifierPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="1.5"
                max="8.0"
                step="0.25"
                value={totalEmulsifierPct}
                onChange={(e) => setTotalEmulsifierPct(parseFloat(e.target.value))}
                className="w-full accent-[#234e42] cursor-pointer"
              />
            </div>
          </div>

          {/* HASIL REAL-TIME */}
          <div className="grid grid-cols-2 gap-2.5 bg-white p-3 rounded-xl border border-slate-200 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                {selectedPair.highName}
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {hlbCalc.highDosagePct}%{" "}
              </span>
              <span className="text-[11px] text-emerald-700 tabular-nums">
                ({hlbCalc.fractionHighPct}% rasio)
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                {selectedPair.lowName}
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {hlbCalc.lowDosagePct}%{" "}
              </span>
              <span className="text-[11px] text-emerald-700 tabular-nums">
                ({hlbCalc.fractionLowPct}% rasio)
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-slate-600">
            <span>Tipe Sistem: {hlbCalc.emulsionType}</span>
            {onSendCalculatedPrompt && (
              <button
                type="button"
                onClick={() =>
                  onSendCalculatedPrompt(
                    `Buatkan formula lengkap dengan sistem emulgator ${selectedPair.highName} ${hlbCalc.highDosagePct}% + ${selectedPair.lowName} ${hlbCalc.lowDosagePct}% (Target HLB ${hlbCalc.achievedHlb}).`
                  )
                }
                className="inline-flex items-center gap-1 font-bold text-[#234e42] hover:underline cursor-pointer shrink-0"
              >
                <span>Gunakan Rasio Ini di Chat</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-3 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Ukuran Batch:
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {batchGrams} g
                </span>
              </div>
              <input
                type="range"
                min="100"
                max="5000"
                step="50"
                value={batchGrams}
                onChange={(e) => setBatchGrams(Number(e.target.value))}
                className="w-full accent-[#234e42] cursor-pointer"
              />
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Bahan Aktif (%):
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {activeConcentrationPct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0.5"
                max="15.0"
                step="0.5"
                value={activeConcentrationPct}
                onChange={(e) =>
                  setActiveConcentrationPct(parseFloat(e.target.value))
                }
                className="w-full accent-[#234e42] cursor-pointer"
              />
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-slate-600">
                  Fase Minyak (%):
                </span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">
                  {oilPhasePct.toFixed(1)}%
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="30.0"
                step="1.0"
                value={oilPhasePct}
                onChange={(e) => setOilPhasePct(parseFloat(e.target.value))}
                className="w-full accent-[#234e42] cursor-pointer"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2 bg-white p-3 rounded-xl border border-slate-200 font-mono">
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                Fase Air ({waterPhasePct.toFixed(1)}%)
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {waterWeightGrams} g
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                Fase Minyak ({oilPhasePct.toFixed(1)}%)
              </span>
              <span className="text-sm font-bold text-slate-900 tabular-nums">
                {oilWeightGrams} g
              </span>
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase block font-sans font-bold">
                Bahan Aktif ({activeConcentrationPct.toFixed(1)}%)
              </span>
              <span className="text-sm font-bold text-emerald-700 tabular-nums">
                {activeWeightGrams} g
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
