"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Check,
  CheckCircle2,
  Circle,
  Plus,
  X,
  Info,
  Sliders,
  ShieldCheck,
  Atom,
  MessageSquare,
  Calculator,
  CalendarClock,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import AmbientBioluminescence from "../../components/AmbientBioluminescence";
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
  "Sensitive",
  "Sensitive & Redness",
  "Oily",
  "Dry",
  "Dry & Dehydrated",
  "Normal",
  "Combination",
  "Anti-Aging",
  "Aging & Fine Lines",
  "Acne-Prone",
  "Dullness & Uneven Tone",
];

const TEXTURE_OPTIONS = [
  "Light Gel-Cream (Cepat Meresap, Non-Sticky)",
  "Silky Watery Serum (Ringan & Mudah Menyebar)",
  "Rich Cushion Cream (Velvety Barrier & Lembap Intensif)",
  "Breathable Fluid Lotion (Matte / Soft-Finish Tropis)",
  "Cooling Clear Hydro-Gel (Segar & Menenangkan)",
  "Gentle Cleanser Low-Surfactant Gel (Lembut, Non-Stripping & Bebas SLS)",
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
  const [skinTarget, setSkinTarget] = useState("Sensitive");
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
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [previewIngredient3D, setPreviewIngredient3D] = useState("Niacinamide");
  const [importedBannerText, setImportedBannerText] = useState("");

  const activeSpec = getProductTypeSpec(productType);
  const sanitizeEmDash = (text: string, replacement = ": ") =>
    text.replace(/\s*—\s*/g, replacement);

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
    if (lower.includes("gel") && !lower.includes("cleanser")) {
      return {
        texture: "Cooling Clear Hydro-Gel (Segar & Menenangkan)",
        hpp: "11000",
        trialBudget: "250000",
        moq: "1000",
      };
    }
    if (lower.includes("cleanser") || lower.includes("wash")) {
      return {
        texture:
          "Gentle Cleanser Low-Surfactant Gel (Lembut, Non-Stripping & Bebas SLS)",
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
          const spec = getProductTypeSpec(
            draft.formulaName || draft.productType
          );
          const def = getRecommendedBriefDefaults(
            draft.formulaName || draft.productType || spec.name
          );
          const resolvedFormulaName =
            draft.formulaName || draft.productType || spec.name;
          const resolvedSkinTarget =
            draft.primarySkinTarget || draft.skinTarget || "Sensitive";
          const resolvedTexture = draft.desiredTexture || def.texture;
          const resolvedPh = draft.targetPh || spec.targetPh;
          const resolvedVisc = draft.targetViscosity || spec.targetViscosity;
          const extractedList = Array.isArray(draft.customIngredients)
            ? draft.customIngredients
            : [];

          setProductType(resolvedFormulaName);
          setSkinTarget(resolvedSkinTarget);
          setDesiredTexture(resolvedTexture);
          setTargetPh(resolvedPh);
          setTargetViscosity(resolvedVisc);
          setBatchSize(draft.batchSize || "100");
          setTargetHppPerUnit(def.hpp);
          setTrialBudgetRp(def.trialBudget);
          setTargetMoq(def.moq);
          setCustomIngredientsInput(extractedList.join(", "));
          setImportedBannerText(
            `Formula "${resolvedFormulaName}" berhasil diterapkan dari obrolan AI R&D Consultant: ${extractedList.length} bahan diekstrak (Target Kulit: ${resolvedSkinTarget} · pH ${resolvedPh})`
          );

          // Pilih bahan non-air pertama untuk pratinjau molekul 3D
          const previewCandidate =
            draft.extractedComposition?.find(
              (item) => item.category !== "Air/Pelarut"
            )?.name ||
            extractedList
              .find((i) => !/\b(water|aqua|aquadest)\b/i.test(i))
              ?.replace(
                /\(?(\d+(?:[.,]\d+)?(?:\s*-\s*\d+(?:[.,]\d+)?)?\s*%|ad\s*100%)\)?/gi,
                ""
              )
              .trim();
          if (previewCandidate) {
            setPreviewIngredient3D(previewCandidate);
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
    setSubmitError(null);

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

      if (res.ok && data.success) {
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
        setSubmitError(
          typeof data?.error === "string" && data.error.trim()
            ? data.error
            : "Gagal menyusun kandidat formulasi dari server. Periksa kembali parameter input lalu coba lagi."
        );
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Failed to call formulation API:", error);
      setSubmitError(
        "Tidak dapat terhubung ke layanan formulasi. Periksa koneksi jaringan Anda lalu coba lagi."
      );
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
    <div className="min-h-screen relative bg-[#f8fdfb] text-[#0B2B26] pb-24 overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-[#0B2B26] focus:text-white focus:text-xs focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#0E807E] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Top Navbar with Back to Home */}
      <WorkspaceNavbar backHref="/dashboard" backLabel="Back to Home" />

      <main id="main-content" className="relative z-10">
        {/* Top Ambient Light Header */}
        <div className="relative overflow-hidden bg-white border-b border-[#0B2B26]/10 mb-8">
          <AmbientBioluminescence variant="section" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-8 lg:min-h-[336px] flex flex-col justify-between">
            <div className="max-w-3xl">
              <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2.5">
                Tahap 1-3 · Brief &amp; Formula Awal
              </span>
              <h1 className="text-3xl sm:text-[40px] leading-[1.08] font-medium text-[#0B2B26] tracking-[-0.035em] text-balance">
                AI Cosmetic Formulator &amp; Brief Specification Studio
              </h1>
              <p className="text-[#2E524C] text-sm sm:text-[15px] mt-3 leading-relaxed">
                Tentukan sediaan, target kulit, pH, viskositas, target HPP, status halal, dan MOQ
                untuk menyusun kandidat Formula A, B, dan C siap uji lab.
              </p>
            </div>

            {/* 3 Optical Liquid Glass Active AI Engine Cards */}
            <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-[10px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="12" r="7.5" />
                      <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="12" y1="2.25" x2="12" y2="6.25" />
                      <line x1="12" y1="17.75" x2="12" y2="21.75" />
                      <line x1="2.25" y1="12" x2="6.25" y2="12" />
                      <line x1="17.75" y1="12" x2="21.75" y2="12" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-[0.1em] font-medium text-[#0E807E] tabular-nums">
                    01 · BRIEF INTERPRETER
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-sm font-medium text-[#0B2B26]">
                    Spesifikasi Teknis Otomatis
                  </div>
                  <p className="text-xs text-[#2E524C] mt-1 leading-relaxed line-clamp-2">
                    Menerjemahkan brief klien ke target pH, viskositas, HLB, dan profil tekstur.
                  </p>
                </div>
              </div>

              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-[10px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polygon points="12,2.8 20.75,9.16 17.41,19.44 6.59,19.44 3.25,9.16" />
                      <polygon
                        points="12,7.2 16.56,10.52 14.82,15.88 9.18,15.88 7.44,10.52"
                        opacity="0.65"
                      />
                      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-[0.1em] font-medium text-[#0E807E] tabular-nums">
                    02 · 5-GATE SCREENING
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-sm font-medium text-[#0B2B26]">
                    Validasi Regulasi &amp; Stok
                  </div>
                  <p className="text-xs text-[#2E524C] mt-1 leading-relaxed line-clamp-2">
                    Menyaring kandidat bahan terhadap BPOM, kompatibilitas, Halal MUI/BPJPH, stok,
                    &amp; HPP.
                  </p>
                </div>
              </div>

              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-[10px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 24 24"
                      className="w-5 h-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <circle cx="12" cy="4.5" r="2.35" />
                      <circle cx="5.4" cy="16.8" r="2.35" />
                      <circle cx="18.6" cy="16.8" r="2.35" />
                      <circle cx="12" cy="12.2" r="1.5" fill="currentColor" stroke="none" />
                      <line x1="12" y1="6.85" x2="12" y2="10.7" />
                      <line x1="7.35" y1="15.45" x2="10.7" y2="13.1" />
                      <line x1="16.65" y1="15.45" x2="13.3" y2="13.1" />
                    </svg>
                  </span>
                  <span className="text-[11px] font-mono uppercase tracking-[0.1em] font-medium text-[#0E807E] tabular-nums">
                    03 · FORMULA A/B/C ENGINE
                  </span>
                </div>
                <div className="mt-2.5">
                  <div className="text-sm font-medium text-[#0B2B26]">
                    Kandidat &amp; Rencana Trial
                  </div>
                  <p className="text-xs text-[#2E524C] mt-1 leading-relaxed line-clamp-2">
                    Menyusun 3 opsi formula siap uji lab dengan analisis trade-off dan estimasi
                    biaya.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Synchronization Confirmation Banner */}
          {importedBannerText && (
            <div
              role="status"
              className="mb-8 bg-[#eaf9f0] text-[#0B2B26] px-6 py-4 rounded-[16px] border border-[#47C4A5]/45 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start sm:items-center gap-2.5 text-xs sm:text-sm font-medium text-[#0B2B26] leading-relaxed">
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5 sm:mt-0" />
                <span>{importedBannerText}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportedBannerText("")}
                className="btn-glass-compact min-h-[44px] px-4 py-2 text-xs cursor-pointer self-end sm:self-auto whitespace-nowrap inline-flex items-center justify-center"
              >
                <span>Tutup</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT 7 COLUMNS: PRECISION FORMULATOR INPUT CONSOLE */}
            <form onSubmit={handleSubmit} className="lg:col-span-7 space-y-6">
              {/* SURFACE CARD 1: TARGET KULIT, TEKSTUR & REOLOGI */}
              <section className="bg-white rounded-[16px] p-6 sm:p-8 border border-[#0B2B26]/10 space-y-6">
                <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-[#0B2B26]/10">
                  <div>
                    <span className="text-[12px] font-mono tabular-nums font-medium tracking-[0.04em] text-[#0E807E] block mb-1">
                      01 · Brief Interpreter &amp; Rheology
                    </span>
                    <h2 className="text-lg sm:text-xl font-medium text-[#0B2B26] tracking-[-0.02em]">
                      Target Kulit &amp; Tekstur yang Diinginkan
                    </h2>
                  </div>
                  <span className="text-xs font-sans font-medium text-[#2E524C]">
                    {activeSpec.systemType}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label
                      htmlFor="product-type-select"
                      className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2"
                    >
                      Product Type ({VALIDATED_PRODUCT_TYPES.length} Systems)
                    </label>
                    <div className="relative">
                      <select
                        id="product-type-select"
                        value={productType}
                        onChange={(e) => handleProductTypeChange(e.target.value)}
                        className="w-full min-h-[44px] appearance-none pl-3.5 pr-10 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 text-sm font-medium text-[#0B2B26] focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 transition-colors cursor-pointer"
                      >
                        {!VALIDATED_PRODUCT_TYPES.some(
                          (s) => s.name === productType
                        ) && (
                          <option value={productType}>
                            {productType} (pH {targetPh || activeSpec.targetPh})
                          </option>
                        )}
                        {VALIDATED_PRODUCT_TYPES.map((spec) => (
                          <option key={spec.id} value={spec.name}>
                            {spec.name} (pH {spec.targetPh})
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="skin-target-select"
                      className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2"
                    >
                      Target Kulit (Primary Skin Target)
                    </label>
                    <div className="relative">
                      <select
                        id="skin-target-select"
                        value={skinTarget}
                        onChange={(e) => setSkinTarget(e.target.value)}
                        className="w-full min-h-[44px] appearance-none pl-3.5 pr-10 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 text-sm font-medium text-[#0B2B26] focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 transition-colors cursor-pointer"
                      >
                        {!SKIN_TARGETS.includes(skinTarget) && (
                          <option value={skinTarget}>{skinTarget}</option>
                        )}
                        {SKIN_TARGETS.map((target) => (
                          <option key={target} value={target}>
                            {target}
                          </option>
                        ))}
                      </select>
                      <ChevronDown aria-hidden="true" className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="desired-texture-select"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2"
                  >
                    Tekstur &amp; Skin-Feel yang Diinginkan
                  </label>
                  <div className="relative">
                    <select
                      id="desired-texture-select"
                      value={desiredTexture}
                      onChange={(e) => setDesiredTexture(e.target.value)}
                      className="w-full min-h-[44px] appearance-none pl-3.5 pr-10 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 text-sm font-medium text-[#0B2B26] focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 transition-colors cursor-pointer"
                    >
                      {!TEXTURE_OPTIONS.includes(desiredTexture) && (
                        <option value={desiredTexture}>{desiredTexture}</option>
                      )}
                      {TEXTURE_OPTIONS.map((tex) => (
                        <option key={tex} value={tex}>
                          {tex}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

              {/* Target pH, Target Viscosity & Batch Size */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-1 items-start">
                <div>
                  <label
                    htmlFor="target-ph-input"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2 whitespace-nowrap"
                  >
                    Target pH
                  </label>
                  <input
                    id="target-ph-input"
                    type="text"
                    value={targetPh}
                    onChange={(e) => setTargetPh(e.target.value)}
                    placeholder={`e.g. ${activeSpec.targetPh} atau 5.0 - 5.5`}
                    className="w-full min-h-[44px] px-3.5 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-sm font-mono font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal tabular-nums transition-colors"
                    required
                  />
                  <span className="text-[11px] font-mono text-[#0E807E] block mt-1.5 tabular-nums">
                    Valid: {activeSpec.validPhRange}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="target-viscosity-input"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2 whitespace-nowrap"
                  >
                    Target Viscosity
                  </label>
                  <input
                    id="target-viscosity-input"
                    type="text"
                    value={targetViscosity}
                    onChange={(e) => setTargetViscosity(e.target.value)}
                    placeholder={`e.g. ${activeSpec.targetViscosity}`}
                    className="w-full min-h-[44px] px-3.5 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-xs sm:text-sm font-mono font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal tabular-nums transition-colors"
                    required
                  />
                  <span className="text-[11px] font-mono text-[#0E807E] block mt-1.5 tabular-nums">
                    Rec: {activeSpec.targetViscosity}
                  </span>
                </div>

                <div>
                  <label
                    htmlFor="batch-size-input"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2 whitespace-nowrap"
                  >
                    Ukuran Batch
                  </label>
                  <div className="relative">
                    <input
                      id="batch-size-input"
                      type="number"
                      min="10"
                      max="100000"
                      value={batchSize}
                      onChange={(e) => setBatchSize(e.target.value)}
                      placeholder="e.g. 100"
                      className="w-full min-h-[44px] px-3.5 py-3 pr-9 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-sm font-sans font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal tabular-nums transition-colors"
                      required
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2E524C] text-xs font-sans font-medium pointer-events-none">
                      g
                    </span>
                  </div>
                  <span className="text-[11px] font-sans text-[#2E524C] block mt-1.5">
                    Grams (g) per lab trial
                  </span>
                </div>
              </div>
            </section>

            {/* SURFACE CARD 2: TARGET HPP, BUDGET PERCOBAAN, STATUS HALAL, DEADLINE & MOQ */}
            <section className="bg-white rounded-[16px] p-6 sm:p-8 border border-[#0B2B26]/10 space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-[#0B2B26]/10">
                <div>
                  <span className="text-[12px] font-mono tabular-nums font-medium tracking-[0.04em] text-[#0E807E] block mb-1">
                    02 · Cost · Halal · Trial Planner
                  </span>
                  <h2 className="text-lg sm:text-xl font-medium text-[#0B2B26] tracking-[-0.02em]">
                    Target HPP, Budget Percobaan, Status Halal, Deadline &amp; MOQ
                  </h2>
                </div>
              </div>

              {/* Target HPP & Budget Percobaan */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="target-hpp-input"
                      className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E]"
                    >
                      Target HPP per Pcs (Rp)
                    </label>
                    <span className="text-[11px] font-mono text-[#2E524C] tabular-nums">
                      Rec: Rp {Number(recDefaults.hpp).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2E524C] text-xs font-mono font-medium pointer-events-none">
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
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-sm font-mono font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal tabular-nums transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="trial-budget-input"
                      className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E]"
                    >
                      Budget Percobaan Lab (Rp)
                    </label>
                    <span className="text-[11px] font-mono text-[#2E524C] tabular-nums">
                      Est. {maxLabTrialsCovered}x Trial Lab
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#2E524C] text-xs font-mono font-medium pointer-events-none">
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
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-sm font-mono font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal tabular-nums transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* Wajib Halal atau Tidak */}
              <div>
                <span
                  id="halal-requirement-label"
                  className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2.5"
                >
                  Status Kehalalan Produk (Wajib Halal atau Tidak)
                </span>
                <div
                  role="group"
                  aria-labelledby="halal-requirement-label"
                  className="grid grid-cols-1 sm:grid-cols-2 gap-3"
                >
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
                        aria-pressed={isSelected}
                        onClick={() => setHalalRequirement(opt)}
                        className={`min-h-[44px] px-4 py-3 text-xs flex items-center justify-between gap-2 cursor-pointer text-left ${
                          isSelected ? "btn-glass-primary" : "btn-glass-secondary"
                        }`}
                      >
                        <span>{opt}</span>
                        {isSelected && (
                          <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0 text-[#0E807E]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Deadline dan MOQ */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="deadline-select"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2"
                  >
                    Target Deadline Proyek
                  </label>
                  <div className="relative">
                    <select
                      id="deadline-select"
                      value={projectDeadline}
                      onChange={(e) => setProjectDeadline(e.target.value)}
                      className="w-full min-h-[44px] appearance-none pl-3.5 pr-10 py-3 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-xs sm:text-sm font-medium text-[#0B2B26] transition-colors cursor-pointer"
                    >
                      {DEADLINE_OPTIONS.map((dl) => (
                        <option key={dl} value={dl}>
                          {dl}
                        </option>
                      ))}
                    </select>
                    <ChevronDown aria-hidden="true" className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <label
                      htmlFor="target-moq-input"
                      className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E]"
                    >
                      Target MOQ Produksi (Pcs)
                    </label>
                    <span className="text-[11px] font-mono text-[#2E524C] tabular-nums">
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
                      className="w-full min-h-[44px] px-3.5 py-3 pr-12 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-sm font-mono font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal tabular-nums transition-colors"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#2E524C] text-xs font-mono font-medium pointer-events-none">
                      pcs
                    </span>
                  </div>
                </div>
              </div>
            </section>

            {/* SURFACE CARD 3: BAHAN AKTIF, EKSIPIEN & KALKULASI BOM */}
            <section className="bg-white rounded-[16px] p-6 sm:p-8 border border-[#0B2B26]/10 space-y-6">
              <div className="flex flex-wrap items-baseline justify-between gap-2 pb-4 border-b border-[#0B2B26]/10">
                <div>
                  <span className="text-[12px] font-mono tabular-nums font-medium tracking-[0.04em] text-[#0E807E] block mb-1">
                    03 · Active Matrix &amp; Excipient Calibration
                  </span>
                  <h2 className="text-lg sm:text-xl font-medium text-[#0B2B26] tracking-[-0.02em]">
                    Komposisi Bahan Aktif &amp; Basis Sediaan
                  </h2>
                </div>
                <span className="text-xs font-sans font-medium text-[#2E524C]">
                  {activeSpec.shortName}
                </span>
              </div>

              {/* Recommended Actives Quick-Pick */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div
                    id="recommended-actives-label"
                    className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E]"
                  >
                    <Sliders aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                    <span>
                      Recommended Actives ({activeSpec.shortName}) · Click to Toggle &amp; 3D
                    </span>
                  </div>
                </div>

                <div
                  role="group"
                  aria-labelledby="recommended-actives-label"
                  className="flex flex-wrap gap-2"
                >
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
                        aria-pressed={isSelected}
                        onClick={() => toggleActiveIngredient(act.name)}
                        title={act.role}
                        className={`min-h-[44px] px-3.5 py-2 text-xs flex items-center gap-1.5 cursor-pointer ${
                          isSelected ? "btn-glass-primary" : "btn-glass-compact"
                        }`}
                      >
                        {isSelected ? (
                          <CheckCircle2 aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                        ) : (
                          <Plus aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                        )}
                        <span>{act.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Active / Base Ingredients Input */}
              <div className="pt-2 border-t border-[#0B2B26]/10">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label
                    htmlFor="custom-ingredients-input"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E]"
                  >
                    Active &amp; Custom Ingredients (with % Concentration)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCustomIngredientsInput("")}
                    className="min-h-[44px] px-2.5 -mr-2.5 text-xs font-medium text-[#2E524C] hover:text-[#b91c1c] inline-flex items-center gap-1 cursor-pointer transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1"
                  >
                    <X aria-hidden="true" className="w-3.5 h-3.5" />
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
                  className="w-full min-h-[44px] px-4 py-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/15 focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-sm font-medium text-[#0B2B26] placeholder:text-[#2E524C]/80 placeholder:font-normal transition-colors"
                />

                {copilotEval.categorizedIngredients &&
                  copilotEval.categorizedIngredients.length > 0 && (
                    <div className="mt-4 p-4 rounded-[12px] bg-[#f4fbf8] border border-[#0B2B26]/10">
                      <div className="text-xs font-medium text-[#0B2B26] mb-3 flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-[#0B2B26]/10">
                        <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E]">
                          Komposisi Bahan Terkategorisasi (
                          {copilotEval.categorizedIngredients.length} Bahan)
                        </span>
                        <span className="font-mono text-xs text-[#0B2B26] font-medium tabular-nums">
                          Aktif: {copilotEval.totalActivePercent}% · Base/Eksipien:{" "}
                          {copilotEval.estimatedBasePercent}%
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {copilotEval.categorizedIngredients.map((item, idx) => (
                          <span
                            key={`${item.name}-${idx}`}
                            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#0B2B26]/10 text-xs text-[#0B2B26]"
                          >
                            <span className="font-medium">{item.label}</span>
                            <span className="text-[#0B2B26]/30" aria-hidden="true">
                              ·
                            </span>
                            <span className="text-[#0E807E] text-[10px] font-medium uppercase tracking-[0.06em]">
                              {item.category}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                {/* Quick Add from Full 43-Ingredient Database */}
                <div className="mt-5">
                  <span
                    id="quick-add-database-label"
                    className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2.5"
                  >
                    Quick-Add from Validated Ingredient Database ({activeSpec.shortName})
                  </span>
                  <div
                    role="group"
                    aria-labelledby="quick-add-database-label"
                    className="flex flex-wrap gap-2 max-h-44 overflow-y-auto pr-1"
                  >
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
                            aria-pressed={isAdded}
                            onClick={() => toggleActiveIngredient(labelWithRate)}
                            className={`min-h-[44px] px-3.5 py-2 text-xs cursor-pointer inline-flex items-center gap-1.5 ${
                              isAdded ? "btn-glass-primary" : "btn-glass-compact"
                            }`}
                          >
                            {isAdded ? (
                              <Check aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E] shrink-0" />
                            ) : (
                              <Plus aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E] shrink-0" />
                            )}
                            <span>{shortTitle}</span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* BOM Cost Toggle */}
              <label
                htmlFor="costToggle"
                className="min-h-[44px] flex items-start sm:items-center gap-3 bg-[#f4fbf8] px-4 py-3 rounded-[12px] border border-[#0B2B26]/10 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  id="costToggle"
                  checked={viewCost}
                  onChange={(e) => setViewCost(e.target.checked)}
                  className="w-5 h-5 mt-0.5 sm:mt-0 accent-[#0E807E] rounded-[4px] cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
                />
                <span className="text-xs sm:text-[13px] font-normal text-[#2E524C] leading-relaxed">
                  Hitung &amp; tampilkan estimasi biaya produksi (HPP / BOM Cost), budget trial, dan
                  kebutuhan MOQ berdasarkan database{" "}
                  <span className="font-medium text-[#0E807E]">supplier.csv</span>
                </span>
              </label>

              {/* Submission Error Alert (R-27) */}
              {submitError && (
                <div
                  role="alert"
                  className="p-4 rounded-[12px] bg-[#fef2f2] border border-[#b91c1c]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5 text-xs sm:text-sm text-[#991b1b] font-medium leading-relaxed">
                    <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5 text-[#b91c1c]" />
                    <span>{submitError}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-glass-secondary min-h-[44px] px-4 py-2 text-xs font-medium text-[#0B2B26] cursor-pointer whitespace-nowrap"
                    >
                      <span>Coba Lagi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubmitError(null)}
                      aria-label="Tutup pesan error formulasi"
                      className="btn-glass-compact min-h-[44px] min-w-[44px] px-3 py-2 text-xs font-medium text-[#0B2B26] cursor-pointer inline-flex items-center justify-center"
                    >
                      <X aria-hidden="true" className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}

              {/* Primary Submit CTA */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-glass-primary min-h-[44px] w-full py-4 px-7 text-[13px] uppercase tracking-[0.06em] flex justify-center items-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <span>Calibrating BBD Dataset, Halal Status &amp; Supplier Matrix...</span>
                ) : (
                  <>
                    <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                    <span>Generate Calibrated Formulation Candidates</span>
                  </>
                )}
              </button>
            </section>
          </form>

          {/* RIGHT 5 COLUMNS: LIVE CALIBRATION READOUT, AI CO-PILOT, PRODUCT SPEC & 3D MOLECULE */}
          <aside className="lg:col-span-5 space-y-6">
            {/* LIVE CALIBRATION INSTRUMENT READOUT */}
            <section className="bg-white text-[#0B2B26] p-6 sm:p-8 rounded-[16px] border border-[#0B2B26]/10">
              <div className="flex items-start justify-between gap-3 pb-5 mb-6 border-b border-[#0B2B26]/10">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-1">
                    Live Brief &amp; Commercial Accuracy
                  </span>
                  <h2 className="text-lg sm:text-xl font-medium text-[#0B2B26] tracking-[-0.02em]">
                    Ringkasan Parameter Formulator Terkalibrasi
                  </h2>
                </div>
                <Calculator aria-hidden="true" className="w-5 h-5 text-[#0E807E] shrink-0 mt-1 stroke-[1.75]" />
              </div>

              {/* PRIMARY INSTRUMENT READOUT GRID */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-6 pb-6 border-b border-[#0B2B26]/10">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2E524C] block mb-2">
                    Target pH
                  </span>
                  <div className="text-3xl sm:text-[34px] font-mono text-[#0B2B26] font-medium tabular-nums leading-none tracking-[-0.03em]">
                    {targetPh.trim() || activeSpec.targetPh}
                  </div>
                  <span className="text-[11px] font-mono text-[#0E807E] block mt-2 tabular-nums">
                    Valid: {activeSpec.validPhRange}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2E524C] block mb-2">
                    HPP / Pcs
                  </span>
                  <div className="text-2xl sm:text-[28px] font-mono text-[#0B2B26] font-medium tabular-nums leading-none tracking-[-0.03em]">
                    Rp {resolvedHppNum.toLocaleString("id-ID")}
                  </div>
                  <span className="text-[11px] font-mono text-[#2E524C] block mt-2 tabular-nums">
                    Trial: Rp {resolvedTrialBudgetNum.toLocaleString("id-ID")} · {maxLabTrialsCovered}x batch
                  </span>
                </div>

                <div className="col-span-2 pt-5 border-t border-[#0B2B26]/10">
                  <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2E524C]">
                      Rasio Aktif vs Base
                    </span>
                    <span className="text-[11px] font-mono text-[#2E524C] tabular-nums">
                      {parsedCustomList.length} bahan terinput · {resolvedBatchG} g/batch
                    </span>
                  </div>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl sm:text-[34px] font-mono text-[#0E807E] font-medium tabular-nums leading-none tracking-[-0.03em]">
                      {copilotEval.totalActivePercent}% : {copilotEval.estimatedBasePercent}%
                    </span>
                    <span className="text-xs font-sans text-[#2E524C]">
                      Aktif / Base
                    </span>
                  </div>
                </div>

                <div className="col-span-2 pt-5 border-t border-[#0B2B26]/10">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2E524C] flex items-center gap-1.5">
                      <CalendarClock aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                      <span>Estimasi Total Nilai Produksi MOQ</span>
                    </span>
                  </div>
                  <div className="text-3xl sm:text-[36px] font-mono text-[#0B2B26] font-medium tabular-nums leading-none tracking-[-0.03em]">
                    Rp {totalMoqEstimatedBudgetRp.toLocaleString("id-ID")}
                  </div>
                  <span className="text-xs font-mono text-[#2E524C] block mt-2 tabular-nums">
                    MOQ {resolvedMoqNum.toLocaleString("id-ID")} pcs · Total Bulk {totalMoqBulkKg} kg
                  </span>
                </div>
              </div>

              {/* SECONDARY CALIBRATED SPECIFICATION ROWS */}
              <dl className="divide-y divide-[#0B2B26]/10 pt-2 text-xs">
                <div className="py-3 flex items-start justify-between gap-4">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#2E524C] shrink-0">
                    Target Kulit &amp; Tekstur
                  </dt>
                  <dd className="text-right">
                    <span className="font-medium text-[#0B2B26] block">
                      {skinTarget}
                    </span>
                    <span className="text-[#2E524C] block mt-0.5">
                      {desiredTexture.split("(")[0].trim()}
                    </span>
                  </dd>
                </div>

                <div className="py-3 flex items-start justify-between gap-4">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#2E524C] shrink-0">
                    Status Kehalalan
                  </dt>
                  <dd className="text-right">
                    <span className="font-medium text-[#146c43] inline-flex items-center justify-end gap-1.5">
                      {halalRequirement.includes("Wajib Halal") ? (
                        <>
                          <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                          <span>Wajib Halal MUI/BPJPH</span>
                        </>
                      ) : (
                        <span>Reguler (Standard CoA)</span>
                      )}
                    </span>
                    <span className="text-[#2E524C] block mt-0.5">
                      Bebas Alkohol Khamr &amp; Porcine
                    </span>
                  </dd>
                </div>

                <div className="pt-3 flex items-start justify-between gap-4">
                  <dt className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#2E524C] shrink-0">
                    Deadline Proyek
                  </dt>
                  <dd className="text-right font-medium text-[#0B2B26]">
                    {projectDeadline.split("(")[0].trim()}
                  </dd>
                </div>
              </dl>
            </section>

            {/* REAL-TIME INTERACTIVE AI CO-PILOT */}
            <section className="bg-white p-6 sm:p-8 rounded-[16px] border border-[#0B2B26]/10">
              <div className="pb-4 mb-4 border-b border-[#0B2B26]/10">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-1">
                  Interactive AI Co-Pilot · Analytical Compatibility
                </span>
                <h2 className="text-base sm:text-lg font-medium text-[#0B2B26] tracking-[-0.02em]">
                  Real-Time Formulation Compatibility &amp; Guide
                </h2>
              </div>

              {/* STATUS INDICATOR */}
              <div
                className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-[12px] border mb-4 text-xs ${
                  copilotEval.status === "critical"
                    ? "bg-[#fef2f2] border-[#fca5a5] text-[#b91c1c]"
                    : copilotEval.status === "warning"
                    ? "bg-[#fef9e7] border-[#f5d078] text-[#7A4F00]"
                    : "bg-[#eaf9f0] border-[#47C4A5]/40 text-[#146c43]"
                }`}
              >
                <span className="font-medium inline-flex items-center gap-1.5">
                  {copilotEval.status === "critical" ? (
                    <X aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  ) : copilotEval.status === "warning" ? (
                    <AlertTriangle aria-hidden="true" className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <Circle aria-hidden="true" className="w-2.5 h-2.5 fill-current shrink-0" />
                  )}
                  <span>{copilotEval.statusLabel}</span>
                </span>
                <span className="font-mono font-medium tabular-nums">
                  Aktif {copilotEval.totalActivePercent}% · Base{" "}
                  {copilotEval.estimatedBasePercent}%
                </span>
              </div>

              {/* LIVE ALERTS & SYNERGIES */}
              <div className="space-y-2.5 mb-5">
                {copilotEval.alerts.map((al, i) => (
                  <div
                    key={i}
                    className={`p-3.5 rounded-[12px] border text-xs ${
                      al.level === "critical"
                        ? "bg-[#fef2f2] border-[#fca5a5]/70"
                        : al.level === "warning"
                        ? "bg-[#fef9e7] border-[#f5d078]/70"
                        : "bg-[#f4fbf8] border-[#0B2B26]/10"
                    }`}
                  >
                    <div
                      className={`font-medium mb-1 ${
                        al.level === "critical"
                          ? "text-[#b91c1c]"
                          : al.level === "warning"
                          ? "text-[#7A4F00]"
                          : "text-[#0B2B26]"
                      }`}
                    >
                      {sanitizeEmDash(al.title)}
                    </div>
                    <p className="text-[#2E524C] leading-relaxed">{sanitizeEmDash(al.detail, ", ")}</p>
                  </div>
                ))}

                {copilotEval.synergiesFound.map((syn, idx) => (
                  <div
                    key={idx}
                    className="px-3.5 py-2.5 rounded-[12px] bg-[#eaf9f0] border border-[#47C4A5]/40 text-xs text-[#146c43] font-medium flex items-start gap-2"
                  >
                    <Check aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{sanitizeEmDash(syn, ", ")}</span>
                  </div>
                ))}
              </div>

              {/* QUICK INTERACTIVE ACTIONS */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-[#0B2B26]/10">
                <button
                  type="button"
                  onClick={handleAutoCalibrateRecommended}
                  className="btn-glass-secondary min-h-[44px] px-4 py-2.5 text-xs cursor-pointer whitespace-nowrap inline-flex items-center justify-center"
                >
                  <span>Isi Rekomendasi Terkalibrasi</span>
                </button>
                <button
                  type="button"
                  onClick={() => router.push("/chat")}
                  className="btn-glass-primary min-h-[44px] px-4 py-2.5 text-xs flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <MessageSquare aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                  <span>Diskusi di AI Consultant</span>
                </button>
              </div>
            </section>

            {/* VALIDATED PRODUCT SPECIFICATION CARD */}
            <section className="bg-white p-6 sm:p-8 rounded-[16px] border border-[#0B2B26]/10">
              <div className="flex items-start justify-between gap-3 pb-4 mb-4 border-b border-[#0B2B26]/10">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-1">
                    Active Product System Specification
                  </span>
                  <h2 className="text-lg sm:text-xl font-medium text-[#0B2B26] tracking-[-0.02em]">
                    {activeSpec.name}
                  </h2>
                </div>
                <FlaskConical aria-hidden="true" className="w-5 h-5 text-[#0E807E] shrink-0 mt-1 stroke-[1.75]" />
              </div>

              <p className="text-xs sm:text-[13px] text-[#2E524C] leading-relaxed mb-5">
                {sanitizeEmDash(activeSpec.scientificBasis, ", ")}
              </p>

              <div className="grid grid-cols-2 gap-4 py-4 mb-5 border-y border-[#0B2B26]/10">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2E524C] block mb-1.5">
                    Calibrated pH Window
                  </span>
                  <span className="text-base font-mono font-medium text-[#0E807E] tabular-nums">
                    pH {activeSpec.targetPh}
                  </span>
                  <span className="text-[11px] font-mono text-[#2E524C] block mt-0.5 tabular-nums">
                    Range {activeSpec.validPhRange}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#2E524C] block mb-1.5">
                    Target Viscosity (cPs)
                  </span>
                  <span className="text-xs sm:text-sm font-mono font-medium text-[#0B2B26] block tabular-nums">
                    {activeSpec.targetViscosity}
                  </span>
                </div>
              </div>

              <div className="mb-5">
                <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] mb-2">
                  <Info aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                  <span>Compounding &amp; Thermal Protocol</span>
                </div>
                <p className="text-xs text-[#2E524C] leading-relaxed">
                  {sanitizeEmDash(activeSpec.processingNotes, ", ")}
                </p>
              </div>

              <div className="text-[11px] text-[#2E524C] flex items-center justify-between gap-3 pt-4 border-t border-[#0B2B26]/10">
                <span className="truncate">{sanitizeEmDash(activeSpec.referenceSource, ": ")}</span>
                <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#0E807E] shrink-0" />
              </div>
            </section>

            {/* LIVE 3D MOLECULE PREVIEW OF SELECTED ACTIVE */}
            <section className="bg-white p-6 rounded-[16px] border border-[#0B2B26]/10">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-0.5">
                    3D Molecular Conformer
                  </span>
                  <h2 className="text-base font-medium text-[#0B2B26] flex items-center gap-2">
                    <Atom aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                    <span>{previewIngredient3D}</span>
                  </h2>
                </div>
              </div>
              <Molecule3DViewer
                ingredientName={previewIngredient3D}
                heightClass="h-[260px]"
                compact
              />
            </section>
          </aside>
        </div>
        </div>
      </main>

      {/* Clean Editorial Footer (top-level landmark outside <main>, aligned with Landing Page) */}
      <footer className="relative z-10 border-t border-[#0B2B26]/10 mt-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#2E524C]">
          <nav
            aria-label="Workspace Footer Navigation"
            className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-2"
          >
            <Link
              href="/about"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E524C] hover:text-[#0B2B26] min-h-[44px] inline-flex items-center transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
            >
              ABOUT US
            </Link>
            <Link
              href="/careers"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E524C] hover:text-[#0B2B26] min-h-[44px] inline-flex items-center transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
            >
              CAREERS
            </Link>
            <Link
              href="/trust"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E524C] hover:text-[#0B2B26] min-h-[44px] inline-flex items-center transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
            >
              TRUST
            </Link>
            <Link
              href="/faq"
              className="text-xs uppercase tracking-[0.08em] font-medium text-[#2E524C] hover:text-[#0B2B26] min-h-[44px] inline-flex items-center transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
            >
              FAQ
            </Link>
          </nav>
          <p className="text-[#2E524C] font-normal">
            &copy; 2026 formylab.ai · Cosmetic R&amp;D Formulation Workspace
          </p>
        </div>
      </footer>
    </div>
  );
}