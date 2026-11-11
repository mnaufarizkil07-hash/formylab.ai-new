"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  BookOpen,
  Sparkles,
  CheckCircle2,
  Plus,
  X,
  Info,
  Sliders,
  ShieldCheck,
  Atom,
  ArrowLeft,
  MessageSquare,
  Calculator,
  CalendarClock,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import LivingLabBackground from "../../components/LivingLabBackground";
import Molecule3DViewer from "../../components/Molecule3DViewer";
import {
  VALIDATED_PRODUCT_TYPES,
  getProductTypeSpec,
  INGREDIENT_PROFILES,
} from "../../lib/cosmeticChemistryData";
import { persistFormulationRun } from "../../lib/formulationStorage";
import {
  ExtractedFormulationDraft,
  evaluateFormulatorCopilot,
} from "../../lib/interactiveAiEngine";

const SKIN_TARGETS = [
  "Dry & Dehydrated",
  "Acne-Prone",
  "Sensitive & Redness",
  "Aging & Fine Lines",
  "Dullness & Uneven Tone",
];

const TEXTURE_OPTIONS = [
  "Light Gel-Cream (Cepat Meresap, Non-Sticky)",
  "Silky Watery Serum (Ringan & Mudah Menyebar)",
  "Rich Cushion Cream (Velvety Barrier & Lembap Intensif)",
  "Breathable Fluid Lotion (Matte / Soft-Finish Tropis)",
  "Cooling Clear Hydro-Gel (Segar & Menenangkan)",
  "Gentle Low-Foam Micellar Gel (Lembut Tanpa Ketarik)",
];

const DEADLINE_OPTIONS = [
  "4 Minggu (Fast-Track R&D & Trial Awal)",
  "6 Minggu (R&D + Uji Stabilitas Dipercepat)",
  "8 Minggu (Standar R&D + Stabilitas 28 Hari)",
  "12 Minggu (Full Scale + Registrasi Notifikasi BPOM & Halal)",
];

export default function FormulatePage() {
  const router = useRouter();

  // Core Formulation & Rheology Parameters
  const [productType, setProductType] = useState("Facial Moisturizer (Cream)");
  const [skinTarget, setSkinTarget] = useState("Sensitive & Redness");
  const [desiredTexture, setDesiredTexture] = useState(
    "Light Gel-Cream (Cepat Meresap, Non-Sticky)"
  );
  const [targetPh, setTargetPh] = useState("");
  const [targetViscosity, setTargetViscosity] = useState("");
  const [batchSize, setBatchSize] = useState("");

  // Client Brief Commercial, Halal, Budget & MOQ Parameters (From Reference Image)
  const [targetHppPerUnit, setTargetHppPerUnit] = useState("");
  const [trialBudgetRp, setTrialBudgetRp] = useState("");
  const [halalRequirement, setHalalRequirement] = useState<
    "Wajib Halal (LPPOM MUI / BPJPH)" | "Tidak Wajib / Reguler (Standard CoA)"
  >("Wajib Halal (LPPOM MUI / BPJPH)");
  const [projectDeadline, setProjectDeadline] = useState(
    "8 Minggu (Standar R&D + Stabilitas 28 Hari)"
  );
  const [targetMoq, setTargetMoq] = useState("");

  const [customIngredientsInput, setCustomIngredientsInput] = useState("");
  const [viewCost, setViewCost] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [previewIngredient3D, setPreviewIngredient3D] = useState("Niacinamide");
  const [importedBannerText, setImportedBannerText] = useState("");

  const activeSpec = getProductTypeSpec(productType);

  // Calibrated default commercial recommendations based on active Product Type
  const getRecommendedBriefDefaults = (specName: string) => {
    const lower = specName.toLowerCase();
    if (lower.includes("serum") || lower.includes("fluid")) {
      return {
        texture: "Silky Watery Serum (Ringan & Mudah Menyebar)",
        hpp: "14500",
        trialBudget: "350000",
        moq: "1000",
      };
    }
    if (lower.includes("gel")) {
      return {
        texture: "Cooling Clear Hydro-Gel (Segar & Menenangkan)",
        hpp: "11000",
        trialBudget: "250000",
        moq: "1000",
      };
    }
    if (lower.includes("cleanser")) {
      return {
        texture: "Gentle Low-Foam Micellar Gel (Lembut Tanpa Ketarik)",
        hpp: "10500",
        trialBudget: "250000",
        moq: "1500",
      };
    }
    if (lower.includes("sunscreen") || lower.includes("lotion")) {
      return {
        texture: "Breathable Fluid Lotion (Matte / Soft-Finish Tropis)",
        hpp: "16500",
        trialBudget: "450000",
        moq: "1000",
      };
    }
    if (lower.includes("mask") || lower.includes("eye")) {
      return {
        texture: "Rich Cushion Cream (Velvety Barrier & Lembap Intensif)",
        hpp: "15500",
        trialBudget: "400000",
        moq: "1000",
      };
    }
    return {
      texture: "Light Gel-Cream (Cepat Meresap, Non-Sticky)",
      hpp: "12500",
      trialBudget: "300000",
      moq: "1000",
    };
  };

  const recDefaults = getRecommendedBriefDefaults(activeSpec.name);

  // Load preselected product type, ingredient from Library, or importedChatFormulation from AI Chat
  useEffect(() => {
    queueMicrotask(() => {
      const importedRaw = localStorage.getItem("importedChatFormulation");
      if (importedRaw) {
        localStorage.removeItem("importedChatFormulation");
        try {
          const draft = JSON.parse(importedRaw) as ExtractedFormulationDraft;
          const spec = getProductTypeSpec(draft.productType);
          const def = getRecommendedBriefDefaults(spec.name);
          setProductType(spec.name);
          setSkinTarget(draft.skinTarget || "Sensitive & Redness");
          setDesiredTexture(def.texture);
          setTargetPh(draft.targetPh || spec.targetPh);
          setTargetViscosity(draft.targetViscosity || spec.targetViscosity);
          setBatchSize(draft.batchSize || "100");
          setTargetHppPerUnit(def.hpp);
          setTrialBudgetRp(def.trialBudget);
          setTargetMoq(def.moq);
          setCustomIngredientsInput((draft.customIngredients || []).join(", "));
          setImportedBannerText(
            `Formula berhasil diterapkan dari AI R&D Consultant: ${draft.summaryLabel}`
          );
          if (draft.customIngredients?.[0]) {
            setPreviewIngredient3D(
              draft.customIngredients[0].replace(/\d+(\.\d+)?\s*%/g, "").trim()
            );
          }
          return;
        } catch {
          // ignore parse error
        }
      }

      const preProduct = localStorage.getItem("preselectedProductType");
      if (preProduct) {
        localStorage.removeItem("preselectedProductType");
        const spec = getProductTypeSpec(preProduct);
        const def = getRecommendedBriefDefaults(spec.name);
        setProductType(spec.name);
        setDesiredTexture(def.texture);
        setTargetPh("");
        setTargetViscosity("");
        setCustomIngredientsInput("");
        if (spec.recommendedActives[0]) {
          const cleanFirst = spec.recommendedActives[0].name
            .replace(/\d+(\.\d+)?\s*%/g, "")
            .trim();
          setPreviewIngredient3D(cleanFirst);
        }
      }

      const preIng = localStorage.getItem("preselectedIngredient");
      if (preIng) {
        localStorage.removeItem("preselectedIngredient");
        setPreviewIngredient3D(preIng);
        setCustomIngredientsInput((prev) => {
          if (prev.toLowerCase().includes(preIng.toLowerCase())) return prev;
          return prev.trim() ? `${prev.trim()}, ${preIng} 2%` : `${preIng} 2%`;
        });
      }
    });
  }, []);

  const handleProductTypeChange = (newType: string) => {
    setProductType(newType);
    const spec = getProductTypeSpec(newType);
    const def = getRecommendedBriefDefaults(spec.name);
    setDesiredTexture(def.texture);
    setTargetPh("");
    setTargetViscosity("");
    setCustomIngredientsInput("");
    if (spec.recommendedActives[0]) {
      const cleanFirst = spec.recommendedActives[0].name
        .replace(/\d+(\.\d+)?\s*%/g, "")
        .trim();
      setPreviewIngredient3D(cleanFirst);
    }
  };

  const parsedCustomList = customIngredientsInput
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i !== "");

  const toggleActiveIngredient = (activeLabel: string) => {
    const baseName = activeLabel
      .replace(/\d+(\.\d+)?\s*%/g, "")
      .trim()
      .toLowerCase();
    setPreviewIngredient3D(activeLabel.replace(/\d+(\.\d+)?\s*%/g, "").trim());

    const exists = parsedCustomList.some((item) =>
      item.toLowerCase().includes(baseName)
    );
    if (exists) {
      const filtered = parsedCustomList.filter(
        (item) => !item.toLowerCase().includes(baseName)
      );
      setCustomIngredientsInput(filtered.join(", "));
    } else {
      const updated = [...parsedCustomList, activeLabel];
      setCustomIngredientsInput(updated.join(", "));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const resolvedPh = targetPh.trim() || activeSpec.targetPh;
    const resolvedViscosity =
      targetViscosity.trim() || activeSpec.targetViscosity;
    const resolvedBatchSize = batchSize.trim() || "100";
    const resolvedHpp = targetHppPerUnit.trim() || recDefaults.hpp;
    const resolvedTrialBudget = trialBudgetRp.trim() || recDefaults.trialBudget;
    const resolvedMoq = targetMoq.trim() || recDefaults.moq;

    const formData = {
      productType,
      skinTarget,
      desiredTexture,
      targetPh: resolvedPh,
      targetViscosity: resolvedViscosity,
      batchSize: resolvedBatchSize,
      targetHppPerUnit: resolvedHpp,
      trialBudgetRp: resolvedTrialBudget,
      halalRequirement,
      projectDeadline,
      targetMoq: resolvedMoq,
      customIngredients: parsedCustomList,
      viewCost,
    };

    try {
      const res = await fetch("/api/formulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (data.success) {
        localStorage.setItem("currentFormulation", JSON.stringify(formData));
        localStorage.setItem(
          "aiGeneratedCandidates",
          JSON.stringify(data.candidates)
        );

        await persistFormulationRun({
          productType,
          skinTarget,
          targetPh: resolvedPh,
          targetViscosity: resolvedViscosity,
          batchSize: resolvedBatchSize,
          customIngredients: parsedCustomList,
          candidates: data.candidates,
        });

        router.push("/result");
      } else {
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to call formulation API:", error);
      setIsLoading(false);
    }
  };

  const allLibraryActives = Object.values(INGREDIENT_PROFILES).filter(
    (p) => !p.safetyGrade.includes("Allergen")
  );

  const copilotEval = evaluateFormulatorCopilot({
    productType,
    skinTarget,
    targetPh,
    targetViscosity,
    batchSize: batchSize || "100",
    customIngredients: parsedCustomList,
  });

  const handleAutoCalibrateRecommended = () => {
    setTargetPh(activeSpec.targetPh);
    setTargetViscosity(activeSpec.targetViscosity);
    setBatchSize("100");
    setDesiredTexture(recDefaults.texture);
    setTargetHppPerUnit(recDefaults.hpp);
    setTrialBudgetRp(recDefaults.trialBudget);
    setHalalRequirement("Wajib Halal (LPPOM MUI / BPJPH)");
    setProjectDeadline("8 Minggu (Standar R&D + Stabilitas 28 Hari)");
    setTargetMoq(recDefaults.moq);
    const recActives = activeSpec.recommendedActives
      .slice(0, 3)
      .map((a) => a.name);
    setCustomIngredientsInput(recActives.join(", "));
    if (recActives[0]) {
      setPreviewIngredient3D(
        recActives[0].replace(/\d+(\.\d+)?\s*%/g, "").trim()
      );
    }
  };

  // Live Quantitative Calculations for the 4 Brief Requirements
  const resolvedBatchG = parseFloat(batchSize || "100") || 100;
  const resolvedHppNum =
    parseFloat(targetHppPerUnit || recDefaults.hpp) ||
    parseFloat(recDefaults.hpp);
  const resolvedTrialBudgetNum =
    parseFloat(trialBudgetRp || recDefaults.trialBudget) ||
    parseFloat(recDefaults.trialBudget);
  const resolvedMoqNum =
    parseInt(targetMoq || recDefaults.moq, 10) ||
    parseInt(recDefaults.moq, 10);

  const estSingleTrialCostRp = Math.round(resolvedBatchG * 420); // ~Rp 42.000 per 100g lab trial including active & packaging test
  const maxLabTrialsCovered = Math.max(
    1,
    Math.min(12, Math.floor(resolvedTrialBudgetNum / Math.max(estSingleTrialCostRp, 15000)))
  );
  const totalMoqBulkKg = ((resolvedBatchG * resolvedMoqNum) / 1000).toFixed(1);
  const totalMoqEstimatedBudgetRp = resolvedHppNum * resolvedMoqNum;

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24">
      <LivingLabBackground variant="mint" />

      {/* Top Floating Pill Navbar with Back to Home */}
      <WorkspaceNavbar backHref="/dashboard" backLabel="Back to Home" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f766e] hover:text-[#12382f] mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard Home</span>
            </button>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal-50 border border-teal-200 text-[#0f766e] text-[11px] font-mono font-bold mb-2">
              <span>TAHAP 1, 2 &amp; 3 · INPUT BRIEF KLIEN BRAND &amp; PEMBUATAN FORMULA AWAL</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              AI Cosmetic Formulator &amp; Brief Specification Studio
            </h1>
            <p className="text-slate-600 text-sm mt-1 leading-relaxed max-w-3xl">
              <strong>Definisi Halaman Formulator (Tim R&amp;D Maklon):</strong> Masukkan permintaan klien
              brand (jenis produk, klaim, target kulit &amp; tekstur, target HPP &amp; budget
              percobaan, wajib halal, deadline &amp; MOQ). AI menerjemahkan bahasa marketing klien
              menjadi spesifikasi teknis formulator (tipe sediaan, rentang pH, viskositas cPs, HLB,
              kandidat bahan aktif, eksipien lengkap &amp; urutan metode pembuatan) sebelum disaring
              ke 5 pengecekan berlapis dan Output Formula A, B &amp; C.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={handleAutoCalibrateRecommended}
              className="px-4 py-2.5 bg-[#0f766e] hover:bg-[#12382f] text-white rounded-full font-bold text-xs shadow-xs transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Isi Semua Value Akurat Otomatis</span>
            </button>

            <button
              type="button"
              onClick={() => router.push("/library")}
              className="px-4 py-2.5 bg-white/95 hover:bg-emerald-50 text-[#12382f] border border-emerald-900/15 rounded-full font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <BookOpen className="w-4 h-4 text-[#0f766e]" />
              <span>3D Library ({allLibraryActives.length}+)</span>
            </button>
          </div>
        </div>

        {importedBannerText && (
          <div className="mb-6 bg-emerald-900 text-white px-5 py-3.5 rounded-2xl flex items-center justify-between gap-3 shadow-sm">
            <div className="text-xs sm:text-sm font-semibold">
              ✓ {importedBannerText}
            </div>
            <button
              type="button"
              onClick={() => setImportedBannerText("")}
              className="text-xs text-emerald-200 hover:text-white font-bold cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLUMNS: FORMULATOR INPUT CONSOLE */}
          <div className="lg:col-span-7 bg-white p-7 sm:p-9 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PARAMETER GROUP 1: TARGET KULIT & TEKSTUR YANG DIINGINKAN */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/90 border border-slate-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#0f766e]">
                    1. Target Kulit &amp; Tekstur yang Diinginkan
                  </span>
                  <span className="text-[11px] font-mono text-slate-500">
                    Brief Interpreter
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="product-type-select"
                      className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider"
                    >
                      Product Type ({VALIDATED_PRODUCT_TYPES.length} Systems)
                    </label>
                    <select
                      id="product-type-select"
                      value={productType}
                      onChange={(e) => handleProductTypeChange(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs sm:text-sm font-semibold text-slate-900"
                    >
                      {VALIDATED_PRODUCT_TYPES.map((spec) => (
                        <option key={spec.id} value={spec.name}>
                          {spec.name} (pH {spec.targetPh})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="skin-target-select"
                      className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider"
                    >
                      Target Kulit (Primary Skin Target)
                    </label>
                    <select
                      id="skin-target-select"
                      value={skinTarget}
                      onChange={(e) => setSkinTarget(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs sm:text-sm font-semibold text-slate-900"
                    >
                      {SKIN_TARGETS.map((target) => (
                        <option key={target} value={target}>
                          {target}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="desired-texture-select"
                    className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider"
                  >
                    Tekstur &amp; Skin-Feel yang Diinginkan
                  </label>
                  <select
                    id="desired-texture-select"
                    value={desiredTexture}
                    onChange={(e) => setDesiredTexture(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs sm:text-sm font-semibold text-slate-900"
                  >
                    {TEXTURE_OPTIONS.map((tex) => (
                      <option key={tex} value={tex}>
                        {tex}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Target pH, Target Viscosity & Batch Size */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="target-ph-input"
                        className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                      >
                        Target pH
                      </label>
                      <span className="text-[10px] font-mono text-[#0f766e] font-bold">
                        Valid: {activeSpec.validPhRange}
                      </span>
                    </div>
                    <input
                      id="target-ph-input"
                      type="number"
                      step="0.05"
                      min="3.2"
                      max="8.0"
                      value={targetPh}
                      onChange={(e) => setTargetPh(e.target.value)}
                      placeholder={`e.g. ${activeSpec.targetPh}`}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="target-viscosity-input"
                        className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                      >
                        Target Viscosity
                      </label>
                      <span className="text-[10px] font-mono text-[#0f766e] font-bold">
                        Rec: {activeSpec.targetViscosity}
                      </span>
                    </div>
                    <input
                      id="target-viscosity-input"
                      type="text"
                      value={targetViscosity}
                      onChange={(e) => setTargetViscosity(e.target.value)}
                      placeholder={`e.g. ${activeSpec.targetViscosity}`}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                      required
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="batch-size-input"
                        className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                      >
                        Ukuran Batch / Pcs
                      </label>
                      <span className="text-[10px] font-mono text-slate-500">
                        Grams (g)
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="batch-size-input"
                        type="number"
                        min="10"
                        max="100000"
                        value={batchSize}
                        onChange={(e) => setBatchSize(e.target.value)}
                        placeholder="e.g. 100"
                        className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal pr-8 tabular-nums"
                        required
                      />
                      <span className="absolute right-3 top-3 text-slate-400 text-xs font-mono font-bold">
                        g
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* PARAMETER GROUP 2: TARGET HPP, BUDGET PERCOBAAN, WAJIB HALAL, DEADLINE & MOQ */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/50 border border-emerald-200/80 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-[#12382f]">
                    2. Target HPP, Budget Percobaan, Status Halal, Deadline &amp; MOQ
                  </span>
                  <span className="text-[11px] font-mono text-[#0f766e] font-bold">
                    Cost · Halal · Trial Planner
                  </span>
                </div>

                {/* Target HPP & Budget Percobaan */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="target-hpp-input"
                        className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                      >
                        Target HPP per Pcs / Batch (Rp)
                      </label>
                      <span className="text-[10px] font-mono text-[#0f766e] font-bold">
                        Rec: Rp {Number(recDefaults.hpp).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-400 text-xs font-mono font-bold">
                        Rp
                      </span>
                      <input
                        id="target-hpp-input"
                        type="number"
                        min="1000"
                        step="500"
                        value={targetHppPerUnit}
                        onChange={(e) => setTargetHppPerUnit(e.target.value)}
                        placeholder={`e.g. ${recDefaults.hpp}`}
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="trial-budget-input"
                        className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                      >
                        Budget Percobaan R&amp;D Lab (Rp)
                      </label>
                      <span className="text-[10px] font-mono text-[#0f766e] font-bold">
                        Est. {maxLabTrialsCovered}x Trial Lab
                      </span>
                    </div>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3 text-slate-400 text-xs font-mono font-bold">
                        Rp
                      </span>
                      <input
                        id="trial-budget-input"
                        type="number"
                        min="50000"
                        step="25000"
                        value={trialBudgetRp}
                        onChange={(e) => setTrialBudgetRp(e.target.value)}
                        placeholder={`e.g. ${recDefaults.trialBudget}`}
                        className="w-full pl-9 pr-3 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                {/* Wajib Halal atau Tidak */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider">
                    Status Kehalalan Produk (Wajib Halal atau Tidak)
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(
                      [
                        "Wajib Halal (LPPOM MUI / BPJPH)",
                        "Tidak Wajib / Reguler (Standard CoA)",
                      ] as const
                    ).map((opt) => {
                      const isSelected = halalRequirement === opt;
                      return (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setHalalRequirement(opt)}
                          className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-between cursor-pointer ${
                            isSelected
                              ? "bg-[#0f766e] text-white border-[#0f766e] shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-[#0f766e]"
                          }`}
                        >
                          <span>{opt}</span>
                          {isSelected && <CheckCircle2 className="w-4 h-4 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Deadline dan MOQ */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="deadline-select"
                      className="block text-xs font-bold text-slate-800 mb-1.5 uppercase tracking-wider"
                    >
                      Target Deadline Proyek
                    </label>
                    <select
                      id="deadline-select"
                      value={projectDeadline}
                      onChange={(e) => setProjectDeadline(e.target.value)}
                      className="w-full p-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs font-semibold text-slate-900"
                    >
                      {DEADLINE_OPTIONS.map((dl) => (
                        <option key={dl} value={dl}>
                          {dl}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label
                        htmlFor="target-moq-input"
                        className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                      >
                        Target MOQ Produksi (Pcs)
                      </label>
                      <span className="text-[10px] font-mono text-[#0f766e] font-bold">
                        Total Bulk: {totalMoqBulkKg} kg
                      </span>
                    </div>
                    <div className="relative">
                      <input
                        id="target-moq-input"
                        type="number"
                        min="100"
                        step="100"
                        value={targetMoq}
                        onChange={(e) => setTargetMoq(e.target.value)}
                        placeholder={`e.g. ${recDefaults.moq}`}
                        className="w-full p-3 pr-12 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                      />
                      <span className="absolute right-3.5 top-3 text-slate-400 text-xs font-mono font-bold">
                        pcs
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Product-Type Matched Recommended Actives Quick-Pick */}
              <div className="bg-emerald-50/70 rounded-2xl p-4 border border-emerald-200/80">
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#12382f]">
                    <Sliders className="w-4 h-4 text-[#0f766e]" />
                    <span>
                      Recommended Actives for {activeSpec.shortName} (Click to Toggle &amp; Inspect 3D)
                    </span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-500">
                    {activeSpec.systemType}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {activeSpec.recommendedActives.map((act) => {
                    const baseName = act.name
                      .replace(/\d+(\.\d+)?\s*%/g, "")
                      .trim()
                      .toLowerCase();
                    const isSelected = parsedCustomList.some((item) =>
                      item.toLowerCase().includes(baseName)
                    );
                    return (
                      <button
                        key={act.name}
                        type="button"
                        onClick={() => toggleActiveIngredient(act.name)}
                        title={act.role}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
                          isSelected
                            ? "bg-[#0f766e] text-white shadow-xs"
                            : "bg-white text-slate-700 border border-emerald-200 hover:border-[#0f766e]"
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        ) : (
                          <Plus className="w-3.5 h-3.5 text-[#0f766e]" />
                        )}
                        <span>{act.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Row 4: Custom Active / Base Ingredients Input + Complete Ingredient Picker */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label
                    htmlFor="custom-ingredients-input"
                    className="block text-xs font-bold text-slate-800 uppercase tracking-wider"
                  >
                    Active &amp; Custom Ingredients (with % Concentration)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomIngredientsInput("")}
                    className="text-[11px] font-semibold text-slate-500 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                    <span>Clear All</span>
                  </button>
                </div>

                <input
                  id="custom-ingredients-input"
                  type="text"
                  value={customIngredientsInput}
                  onChange={(e) => setCustomIngredientsInput(e.target.value)}
                  placeholder={`e.g. ${activeSpec.recommendedActives
                    .slice(0, 3)
                    .map((a) => a.name)
                    .join(", ")}`}
                  className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-medium text-slate-900 placeholder:text-slate-400 placeholder:font-normal"
                />

                {/* Quick Add from Full 43-Ingredient Database */}
                <div className="mt-3">
                  <p className="text-[11px] font-semibold text-slate-500 mb-2">
                    Quick-Add from Validated Ingredient Database (Matched to {activeSpec.shortName}):
                  </p>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-1">
                    {allLibraryActives
                      .filter((ing) =>
                        ing.compatibleProductTypes.includes(activeSpec.name)
                      )
                      .map((ing) => {
                        const shortTitle = ing.inciName.split("(")[0].trim();
                        const defaultRate =
                          ing.typicalUsageRate.match(
                            /(\d+(?:\.\d+)?)\s*%/
                          )?.[1] || "2.0";
                        const labelWithRate = `${shortTitle} ${defaultRate}%`;
                        const isAdded = parsedCustomList.some((item) =>
                          item.toLowerCase().includes(shortTitle.toLowerCase())
                        );
                        return (
                          <button
                            key={ing.key}
                            type="button"
                            onClick={() => toggleActiveIngredient(labelWithRate)}
                            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition cursor-pointer ${
                              isAdded
                                ? "bg-emerald-700 text-white"
                                : "bg-slate-100 hover:bg-emerald-100 text-slate-700"
                            }`}
                          >
                            {isAdded ? `✓ ${shortTitle}` : `+ ${shortTitle}`}
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Row 5: BOM Cost Toggle */}
              <div className="flex items-center gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                <input
                  type="checkbox"
                  id="costToggle"
                  checked={viewCost}
                  onChange={(e) => setViewCost(e.target.checked)}
                  className="w-4 h-4 accent-[#0f766e] rounded cursor-pointer"
                />
                <label
                  htmlFor="costToggle"
                  className="text-xs sm:text-sm font-semibold text-slate-800 cursor-pointer select-none"
                >
                  Hitung &amp; tampilkan estimasi biaya produksi (HPP / BOM Cost), budget trial, dan
                  kebutuhan MOQ berdasarkan database{" "}
                  <span className="font-mono text-[#0f766e]">supplier.csv</span>
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-4 rounded-2xl font-bold text-white transition shadow-md flex justify-center items-center gap-2 text-sm cursor-pointer ${
                  isLoading
                    ? "bg-slate-400 cursor-not-allowed"
                    : "bg-gradient-to-r from-[#14b8a6] to-[#0f766e] hover:opacity-95"
                }`}
              >
                {isLoading ? (
                  <span>Calibrating BBD Dataset, Halal Status &amp; Supplier Matrix...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Calibrated Formulation Candidates</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT 5 COLUMNS: LIVE BRIEF ACCURACY SUMMARY, INTERACTIVE AI CO-PILOT & 3D MOLECULE PREVIEW */}
          <div className="lg:col-span-5 space-y-6">
            {/* NEW: LIVE BRIEF SPECIFICATION & COMMERCIAL ACCURACY READOUT CARD */}
            <div className="bg-gradient-to-br from-[#0f2922] via-[#12382f] to-[#0f172a] text-white p-6 rounded-[2rem] shadow-xl border border-emerald-500/20">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-[0.18em] text-emerald-300 font-bold block">
                    LIVE BRIEF &amp; COMMERCIAL ACCURACY
                  </span>
                  <h2 className="text-base font-extrabold text-white">
                    Ringkasan Parameter Formulator Terkalibrasi
                  </h2>
                </div>
                <Calculator className="w-5 h-5 text-emerald-300 shrink-0" />
              </div>

              <div className="grid grid-cols-2 gap-2.5 text-xs mb-3">
                <div className="p-3 rounded-xl bg-white/8 border border-white/10">
                  <span className="text-[10px] text-emerald-200 uppercase font-mono block">
                    Target Kulit &amp; Tekstur
                  </span>
                  <span className="font-bold text-white block truncate mt-0.5">
                    {skinTarget}
                  </span>
                  <span className="text-[11px] text-emerald-100/80 block truncate">
                    {desiredTexture.split("(")[0].trim()}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/8 border border-white/10">
                  <span className="text-[10px] text-emerald-200 uppercase font-mono block">
                    Target HPP &amp; Trial Budget
                  </span>
                  <span className="font-mono font-bold text-white block mt-0.5 tabular-nums">
                    HPP: Rp {resolvedHppNum.toLocaleString("id-ID")}/pcs
                  </span>
                  <span className="text-[11px] text-emerald-300 font-mono block tabular-nums">
                    Trial: Rp {resolvedTrialBudgetNum.toLocaleString("id-ID")} ({maxLabTrialsCovered}x batch)
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/8 border border-white/10">
                  <span className="text-[10px] text-emerald-200 uppercase font-mono block">
                    Status Kehalalan
                  </span>
                  <span className="font-bold text-emerald-300 block mt-0.5 truncate">
                    {halalRequirement.includes("Wajib Halal")
                      ? "✓ Wajib Halal MUI/BPJPH"
                      : "Reguler (Standard CoA)"}
                  </span>
                  <span className="text-[11px] text-emerald-100/80 block">
                     Bebas Alkohol Khamr &amp; Porcine
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-white/8 border border-white/10">
                  <span className="text-[10px] text-emerald-200 uppercase font-mono block">
                    Deadline &amp; MOQ Produksi
                  </span>
                  <span className="font-mono font-bold text-white block mt-0.5 tabular-nums">
                    MOQ: {resolvedMoqNum.toLocaleString("id-ID")} pcs ({totalMoqBulkKg} kg)
                  </span>
                  <span className="text-[11px] text-emerald-100/80 block truncate">
                    {projectDeadline.split("(")[0].trim()}
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-400/25 flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-emerald-100 font-medium">
                  <CalendarClock className="w-4 h-4 text-emerald-300 shrink-0" />
                  <span>Estimasi Total Nilai Produksi MOQ:</span>
                </span>
                <span className="font-mono font-extrabold text-emerald-300 tabular-nums">
                  Rp {totalMoqEstimatedBudgetRp.toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* REAL-TIME INTERACTIVE AI CO-PILOT (4-PILLAR LIVE ASSISTANT) */}
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div>
                  <span className="text-[11px] font-mono text-[#0f766e] font-bold block">
                    INTERACTIVE AI CO-PILOT · ANALYTICAL COMPATIBILITY
                  </span>
                  <h2 className="text-base font-extrabold text-slate-900">
                    Real-Time Formulation Compatibility &amp; Guide
                  </h2>
                </div>
              </div>

              {/* STATUS INDICATOR */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200/80 mb-3 text-xs">
                <span
                  className={`font-bold ${
                    copilotEval.status === "critical"
                      ? "text-rose-700"
                      : copilotEval.status === "warning"
                        ? "text-amber-700"
                        : "text-emerald-700"
                  }`}
                >
                  {copilotEval.status === "critical"
                    ? "✖ "
                    : copilotEval.status === "warning"
                      ? "▲ "
                      : "● "}
                  {copilotEval.statusLabel}
                </span>
                <span className="font-mono font-bold text-slate-700 tabular-nums">
                  Aktif: {copilotEval.totalActivePercent}% · Base:{" "}
                  {copilotEval.estimatedBasePercent}%
                </span>
              </div>

              {/* LIVE ALERTS & SYNERGIES */}
              <div className="space-y-2 mb-3">
                {copilotEval.alerts.map((al, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl border border-slate-200 bg-white text-xs"
                  >
                    <div
                      className={`font-bold mb-0.5 ${
                        al.level === "critical"
                          ? "text-rose-700"
                          : al.level === "warning"
                            ? "text-amber-700"
                            : "text-slate-900"
                      }`}
                    >
                      {al.title}
                    </div>
                    <p className="text-slate-600 leading-relaxed">{al.detail}</p>
                  </div>
                ))}

                {copilotEval.synergiesFound.map((syn, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-[#12382f] font-medium"
                  >
                    ✓ {syn}
                  </div>
                ))}
              </div>

              {/* QUICK INTERACTIVE ACTIONS */}
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleAutoCalibrateRecommended}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-[#12382f] border border-emerald-200 transition cursor-pointer whitespace-nowrap"
                >
                  Isi Rekomendasi Terkalibrasi
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/chat")}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-[#0f766e]" />
                  <span>Diskusi di AI Consultant</span>
                </button>
              </div>
            </div>

            {/* Validated Product Specification Card */}
            <div className="bg-white p-6 sm:p-7 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-[#0f766e] font-bold block">
                    ACTIVE PRODUCT SYSTEM SPECIFICATION
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                    {activeSpec.name}
                  </h2>
                </div>
                <FlaskConical className="w-6 h-6 text-[#0f766e] shrink-0" />
              </div>

              <p className="text-xs text-slate-600 leading-relaxed mb-4">
                {activeSpec.scientificBasis}
              </p>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Calibrated pH Window
                  </span>
                  <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                    pH {activeSpec.targetPh} ({activeSpec.validPhRange})
                  </span>
                </div>
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">
                    Target Viscosity (cPs)
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900 truncate block tabular-nums">
                    {activeSpec.targetViscosity}
                  </span>
                </div>
              </div>

              <div className="bg-emerald-50/70 rounded-xl p-3.5 border border-emerald-200/70 mb-4">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#12382f] mb-1">
                  <Info className="w-3.5 h-3.5 text-[#0f766e]" />
                  <span>Compounding &amp; Thermal Protocol</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {activeSpec.processingNotes}
                </p>
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-3 border-t border-slate-100">
                <span className="truncate">{activeSpec.referenceSource}</span>
                <ShieldCheck className="w-4 h-4 text-[#0f766e] shrink-0" />
              </div>
            </div>

            {/* Live 3D Molecule Preview of Selected Active */}
            <div className="bg-white p-6 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Atom className="w-4 h-4 text-[#0f766e]" />
                  <h3 className="text-sm font-extrabold text-slate-900">
                    3D Molecular Conformer Preview: {previewIngredient3D}
                  </h3>
                </div>
              </div>
              <Molecule3DViewer
                ingredientName={previewIngredient3D}
                heightClass="h-[260px]"
                compact
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}