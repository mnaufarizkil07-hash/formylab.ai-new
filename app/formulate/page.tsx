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

const SKIN_TARGETS = [
  "Dry & Dehydrated",
  "Acne-Prone",
  "Sensitive & Redness",
  "Aging & Fine Lines",
  "Dullness & Uneven Tone",
];

export default function FormulatePage() {
  const router = useRouter();

  const [productType, setProductType] = useState("Facial Moisturizer (Cream)");
  const [skinTarget, setSkinTarget] = useState("Sensitive & Redness");
  const [targetPh, setTargetPh] = useState("");
  const [targetViscosity, setTargetViscosity] = useState("");
  const [batchSize, setBatchSize] = useState("");
  const [customIngredientsInput, setCustomIngredientsInput] = useState("");
  const [viewCost, setViewCost] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [previewIngredient3D, setPreviewIngredient3D] = useState("Niacinamide");

  const activeSpec = getProductTypeSpec(productType);

  // Load preselected product type or ingredient from Dashboard/Library if present
  useEffect(() => {
    queueMicrotask(() => {
      const preProduct = localStorage.getItem("preselectedProductType");
      if (preProduct) {
        localStorage.removeItem("preselectedProductType");
        const spec = getProductTypeSpec(preProduct);
        setProductType(spec.name);
        setTargetPh("");
        setTargetViscosity("");
        setCustomIngredientsInput("");
        if (spec.recommendedActives[0]) {
          const cleanFirst = spec.recommendedActives[0].name.replace(/\d+(\.\d+)?\s*%/g, "").trim();
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

  // When user switches Product Type, update the active specification & gray placeholders without auto-filling the user's inputs
  const handleProductTypeChange = (newType: string) => {
    setProductType(newType);
    const spec = getProductTypeSpec(newType);
    setTargetPh("");
    setTargetViscosity("");
    setCustomIngredientsInput("");
    if (spec.recommendedActives[0]) {
      const cleanFirst = spec.recommendedActives[0].name.replace(/\d+(\.\d+)?\s*%/g, "").trim();
      setPreviewIngredient3D(cleanFirst);
    }
  };

  const parsedCustomList = customIngredientsInput
    .split(",")
    .map((i) => i.trim())
    .filter((i) => i !== "");

  const toggleActiveIngredient = (activeLabel: string) => {
    const baseName = activeLabel.replace(/\d+(\.\d+)?\s*%/g, "").trim().toLowerCase();
    setPreviewIngredient3D(activeLabel.replace(/\d+(\.\d+)?\s*%/g, "").trim());

    const exists = parsedCustomList.some((item) => item.toLowerCase().includes(baseName));
    if (exists) {
      const filtered = parsedCustomList.filter((item) => !item.toLowerCase().includes(baseName));
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
    const resolvedViscosity = targetViscosity.trim() || activeSpec.targetViscosity;
    const resolvedBatchSize = batchSize.trim() || "100";

    const formData = {
      productType,
      skinTarget,
      targetPh: resolvedPh,
      targetViscosity: resolvedViscosity,
      batchSize: resolvedBatchSize,
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
        localStorage.setItem("aiGeneratedCandidates", JSON.stringify(data.candidates));

        // Persist across sessions (Backend Persistence A)
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

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24">
      <LivingLabBackground variant="mint" />

      {/* Top Floating Pill Navbar with Back to Home */}
      <WorkspaceNavbar backHref="/dashboard" backLabel="Back to Home" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div>
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0f766e] hover:text-[#12382f] mb-2 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard Home</span>
            </button>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
              AI Cosmetic Formulator &amp; Rheology Calibrator
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Pilih Product Type untuk melihat panduan rekomendasi ilmiah (Target pH, Viskositas cPs, HLB,
              &amp; Bahan Aktif) pada petunjuk kolom, lalu isi parameter sesuai formulasi Anda.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/library")}
            className="px-5 py-2.5 bg-white/95 hover:bg-emerald-50 text-[#12382f] border border-emerald-900/15 rounded-full font-bold text-xs shadow-xs transition flex items-center gap-2 cursor-pointer whitespace-nowrap self-start md:self-auto"
          >
            <BookOpen className="w-4 h-4 text-[#0f766e]" />
            <span>Open Ingredient Library ({allLibraryActives.length}+ Ingredients)</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT 7 COLUMNS: FORMULATOR INPUT CONSOLE */}
          <div className="lg:col-span-7 bg-white/95 backdrop-blur-md p-7 sm:p-9 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Row 1: Product Type & Skin Target */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label
                    htmlFor="product-type-select"
                    className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider"
                  >
                    Product Type ({VALIDATED_PRODUCT_TYPES.length} Calibrated Systems)
                  </label>
                  <select
                    id="product-type-select"
                    value={productType}
                    onChange={(e) => handleProductTypeChange(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-semibold text-slate-900"
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
                    className="block text-xs font-bold text-slate-800 mb-2 uppercase tracking-wider"
                  >
                    Primary Skin Target
                  </label>
                  <select
                    id="skin-target-select"
                    value={skinTarget}
                    onChange={(e) => setSkinTarget(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-semibold text-slate-900"
                  >
                    {SKIN_TARGETS.map((target) => (
                      <option key={target} value={target}>
                        {target}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Target pH, Target Viscosity & Batch Size (Empty by default with dynamic gray recommendation placeholders) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="target-ph-input"
                      className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                    >
                      Target pH
                    </label>
                    <span className="text-[11px] font-mono text-[#0f766e] font-bold">
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
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="target-viscosity-input"
                      className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                    >
                      Target Viscosity
                    </label>
                    <span className="text-[11px] font-mono text-[#0f766e] font-bold">
                      Rec: {activeSpec.targetViscosity}
                    </span>
                  </div>
                  <input
                    id="target-viscosity-input"
                    type="text"
                    value={targetViscosity}
                    onChange={(e) => setTargetViscosity(e.target.value)}
                    placeholder={`e.g. ${activeSpec.targetViscosity}`}
                    className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs sm:text-[13px] font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal tabular-nums"
                    required
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      htmlFor="batch-size-input"
                      className="text-xs font-bold text-slate-800 uppercase tracking-wider"
                    >
                      Lab Batch Size
                    </label>
                    <span className="text-[11px] font-mono text-slate-500">Grams (g)</span>
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
                      className="w-full p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-sm font-mono font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal pr-10 tabular-nums"
                      required
                    />
                    <span className="absolute right-3.5 top-3.5 text-slate-400 text-sm font-mono font-bold">
                      g
                    </span>
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
                    const baseName = act.name.replace(/\d+(\.\d+)?\s*%/g, "").trim().toLowerCase();
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
                      .filter((ing) => ing.compatibleProductTypes.includes(activeSpec.name))
                      .map((ing) => {
                        const shortTitle = ing.inciName.split("(")[0].trim();
                        const defaultRate =
                          ing.typicalUsageRate.match(/(\d+(?:\.\d+)?)\s*%/)?.[1] || "2.0";
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
                  Hitung &amp; tampilkan estimasi biaya produksi (BOM Cost) berdasarkan database{" "}
                  <span className="font-mono text-[#0f766e]">supplier.csv</span> &amp; ukuran batch
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
                  <span>Calibrating BBD Dataset &amp; Supplier Matrix...</span>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Generate Calibrated Formulation Candidates</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* RIGHT 5 COLUMNS: SCIENTIFIC BENCHMARK CARD & LIVE 3D MOLECULE PREVIEW */}
          <div className="lg:col-span-5 space-y-6">
            {/* Validated Product Specification Card */}
            <div className="bg-white/95 backdrop-blur-md p-6 sm:p-7 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
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
            <div className="bg-white/95 backdrop-blur-md p-6 rounded-[2rem] shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10">
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