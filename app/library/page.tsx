"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Atom,
  ShieldCheck,
  AlertTriangle,
  Building2,
  FlaskConical,
  ArrowLeft,
  CheckCircle2,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import LivingLabBackground from "../../components/LivingLabBackground";
import Molecule3DViewer from "../../components/Molecule3DViewer";
import { VALIDATED_PRODUCT_TYPES } from "../../lib/cosmeticChemistryData";

interface SupplierOption {
  supplierName: string;
  location: string;
  grade: string;
  halalBody: string;
  isHalal: boolean;
  pricePerG: number;
  stock: string;
  leadTimeDays: number;
  moqGram: number;
  evidenceDoi: string;
}

interface LibraryIngredient {
  id: number;
  key: string;
  name: string;
  inciName: string;
  casNumber: string;
  molecularFormula: string;
  molecularWeight: string;
  category: string;
  functionalCategory: string;
  status: string;
  risk: string;
  safetyGrade: string;
  hlbValue: string;
  optimalPhRange: string;
  typicalUsageRate: string;
  compatibilityScore: number;
  synergisticWith: string[];
  avoidWith: string[];
  certifications: string[];
  compatibleProductTypes: string[];
  mechanismOfAction: string;
  solubilityPhase: string;
  primarySupplier: string;
  supplierLocation: string;
  halalCertificationBody: string;
  isHalalCertified: boolean;
  pricePerGramIdr: number;
  leadTimeDays: number;
  moqGram: number;
  stockStatus: string;
  evidenceDoi: string;
  supplierCount: number;
  suppliers: SupplierOption[];
  sourceDataset: string;
}

export default function LibraryPage() {
  const router = useRouter();
  const [ingredients, setIngredients] = useState<LibraryIngredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string>("ALL");
  const [safetyFilter, setSafetyFilter] = useState<"ALL" | "SAFE_ONLY" | "HALAL_ONLY">("ALL");
  const [selectedIngredient, setSelectedIngredient] = useState<LibraryIngredient | null>(null);

  useEffect(() => {
    fetch("/api/library")
      .then((res) => res.json())
      .then((data) => {
        if (data.success && Array.isArray(data.ingredients)) {
          setIngredients(data.ingredients);
          const defaultIng =
            data.ingredients.find((i: LibraryIngredient) => i.key === "glycerin") ||
            data.ingredients[0];
          setSelectedIngredient(defaultIng || null);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  const filteredIngredients = ingredients.filter((ing) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      ing.name.toLowerCase().includes(q) ||
      ing.inciName.toLowerCase().includes(q) ||
      ing.casNumber.toLowerCase().includes(q) ||
      ing.functionalCategory.toLowerCase().includes(q) ||
      ing.primarySupplier.toLowerCase().includes(q) ||
      ing.halalCertificationBody.toLowerCase().includes(q);

    const matchesProduct =
      selectedProductType === "ALL" ||
      ing.compatibleProductTypes.some(
        (pt) => pt.toLowerCase() === selectedProductType.toLowerCase()
      );

    const matchesSafety =
      safetyFilter === "ALL" ||
      (safetyFilter === "SAFE_ONLY" && ing.risk !== "High") ||
      (safetyFilter === "HALAL_ONLY" && ing.isHalalCertified);

    return matchesSearch && matchesProduct && matchesSafety;
  });

  const activeIng = selectedIngredient || filteredIngredients[0] || ingredients[0] || null;

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24">
      <LivingLabBackground variant="mint" />

      {/* Fixed Navigation Bug: Back button goes to /dashboard (Home) */}
      <WorkspaceNavbar backHref="/dashboard" backLabel="Back to Home" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {/* Header Bar */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-6">
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
              3D Molecular Ingredient Library &amp; Halal Supplier Registry
            </h1>
            <p className="text-slate-600 text-sm mt-1">
              Menampilkan {ingredients.length} bahan baku &amp; senyawa aktif lengkap dengan
              konformer 3D WebGL, skor kompatibilitas, rentang pH/HLB, dan sertifikasi Halal
              supplier.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => router.push("/formulate")}
              className="px-5 py-2.5 rounded-full bg-[#12382f] hover:bg-[#0f766e] text-white text-xs font-bold transition shadow-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
            >
              <FlaskConical className="w-4 h-4" />
              <span>Open AI Formulator</span>
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl p-4 sm:p-5 shadow-sm border border-emerald-900/10 mb-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
            {/* Search Input */}
            <div className="md:col-span-5 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search INCI, CAS number, supplier PT, or function..."
                aria-label="Search ingredients"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs sm:text-sm font-medium text-slate-900"
              />
            </div>

            {/* Filter by Product Type */}
            <div className="md:col-span-4 flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-[#0f766e] shrink-0" />
              <select
                aria-label="Filter ingredients by Product Type"
                value={selectedProductType}
                onChange={(e) => setSelectedProductType(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 bg-slate-50/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] text-xs sm:text-sm font-semibold text-slate-800"
              >
                <option value="ALL">All 12 Product Types ({ingredients.length})</option>
                {VALIDATED_PRODUCT_TYPES.map((pt) => (
                  <option key={pt.id} value={pt.name}>
                    {pt.name} (pH {pt.targetPh})
                  </option>
                ))}
              </select>
            </div>

            {/* Segmented Safety / Halal Filter */}
            <div className="md:col-span-3 flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                type="button"
                onClick={() => setSafetyFilter("ALL")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  safetyFilter === "ALL"
                    ? "bg-white text-slate-900 shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All ({filteredIngredients.length})
              </button>
              <button
                type="button"
                onClick={() => setSafetyFilter("SAFE_ONLY")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  safetyFilter === "SAFE_ONLY"
                    ? "bg-[#0f766e] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Hypoallergenic
              </button>
              <button
                type="button"
                onClick={() => setSafetyFilter("HALAL_ONLY")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                  safetyFilter === "HALAL_ONLY"
                    ? "bg-[#0f766e] text-white shadow-xs"
                    : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Halal Verified
              </button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white/95 rounded-3xl p-16 text-center shadow-sm border border-emerald-900/10">
            <Atom className="w-10 h-10 text-[#0f766e] animate-spin mx-auto mb-3" />
            <p className="text-base font-bold text-slate-800">
              Loading 43+ Cosmetic Ingredients, Supplier CoAs &amp; 3D Molecular Structures...
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* LEFT 6 COLUMNS: SCROLLABLE INGREDIENT CARDS */}
            <div className="lg:col-span-6 space-y-3 max-h-[880px] overflow-y-auto pr-1">
              {filteredIngredients.map((ing) => {
                const isSelected = activeIng?.id === ing.id;
                const isHighRisk = ing.risk === "High";
                return (
                  <button
                    key={ing.id}
                    type="button"
                    onClick={() => setSelectedIngredient(ing)}
                    className={`w-full text-left p-5 rounded-2xl transition border cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? "bg-white border-2 border-[#0f766e] shadow-md"
                        : isHighRisk
                        ? "bg-rose-50/90 border-rose-200 hover:bg-rose-50"
                        : "bg-white/90 border-slate-200/80 hover:bg-white hover:border-emerald-300"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <div className="flex items-center gap-2 text-[11px] font-mono text-slate-500">
                          <span>#{String(ing.id).padStart(2, "0")}</span>
                          <span aria-hidden="true">·</span>
                          <span>CAS {ing.casNumber}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-bold text-slate-700">{ing.molecularFormula}</span>
                        </div>
                        <h3 className="text-base font-extrabold text-slate-900 mt-0.5">
                          {ing.name}
                        </h3>
                        <p className="text-xs text-slate-500">{ing.inciName}</p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-mono uppercase text-slate-400 block">
                          Compatibility
                        </span>
                        <span
                          className={`text-lg font-mono font-extrabold tabular-nums ${
                            isHighRisk ? "text-rose-600" : "text-[#0f766e]"
                          }`}
                        >
                          {ing.compatibilityScore}%
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 line-clamp-2 mb-3">
                      {ing.mechanismOfAction}
                    </p>

                    <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-600">
                      <div className="flex items-center gap-1.5 font-medium truncate">
                        <Building2 className="w-3.5 h-3.5 text-[#0f766e] shrink-0" />
                        <span className="truncate">{ing.primarySupplier}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-[#0f766e] font-bold">
                          {ing.halalCertificationBody}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 font-mono text-slate-700 tabular-nums">
                        <span>pH {ing.optimalPhRange}</span>
                        <span aria-hidden="true">·</span>
                        <span>{ing.typicalUsageRate}</span>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* RIGHT 6 COLUMNS: STICKY 3D WEBGL MOLECULE VIEWER & FULL SCIENTIFIC DOSSIER */}
            {activeIng && (
              <div className="lg:col-span-6 lg:sticky lg:top-6 space-y-5">
                <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-6 sm:p-7 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.16)] border border-emerald-900/10">
                  {/* Dossier Header */}
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-mono text-[#0f766e] font-bold">
                        <span>{activeIng.sourceDataset}</span>
                        <span aria-hidden="true">·</span>
                        <span>{activeIng.solubilityPhase}</span>
                      </div>
                      <h2 className="text-2xl font-extrabold text-slate-900 mt-1">
                        {activeIng.name}
                      </h2>
                      <p className="text-xs text-slate-500 font-medium">{activeIng.inciName}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        localStorage.setItem("preselectedIngredient", activeIng.name);
                        router.push("/formulate");
                      }}
                      className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#14b8a6] to-[#0f766e] text-white text-xs font-bold hover:opacity-95 transition flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Use in Formulator</span>
                    </button>
                  </div>

                  {/* Interactive 3D WebGL Molecule Viewer (Feature D) */}
                  <div className="mb-5">
                    <Molecule3DViewer
                      ingredientName={activeIng.name}
                      heightClass="h-[320px]"
                    />
                  </div>

                  {/* Key Chemical & Compatibility Metrics Grid (Feature C) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Compatibility
                      </span>
                      <span className="text-lg font-mono font-extrabold text-[#0f766e] tabular-nums">
                        {activeIng.compatibilityScore}%
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Optimal pH
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {activeIng.optimalPhRange}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Usage Dosage
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                        {activeIng.typicalUsageRate}
                      </span>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/70">
                      <span className="text-[10px] font-mono uppercase text-slate-400 block">
                        Mol. Weight
                      </span>
                      <span className="text-xs font-mono font-bold text-slate-900 truncate block tabular-nums">
                        {activeIng.molecularWeight}
                      </span>
                    </div>
                  </div>

                  {/* Mechanism & Synergy */}
                  <div className="space-y-3 text-xs text-slate-600 mb-5 bg-slate-50/80 p-4 rounded-2xl border border-slate-200/70">
                    <div>
                      <span className="font-bold text-slate-900 block mb-0.5">
                        Functional Category &amp; Mechanism of Action:
                      </span>
                      <p className="leading-relaxed">
                        <strong className="text-[#0f766e]">{activeIng.functionalCategory}</strong> —{" "}
                        {activeIng.mechanismOfAction}
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200/70">
                      <div>
                        <span className="font-bold text-slate-800 block mb-0.5">
                          Synergistic Combinations:
                        </span>
                        <p className="text-slate-600">{activeIng.synergisticWith.join(" · ")}</p>
                      </div>
                      <div>
                        <span className="font-bold text-slate-800 block mb-0.5">
                          Incompatibilities / Avoid With:
                        </span>
                        <p className="text-rose-700">{activeIng.avoidWith.join(" · ")}</p>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70">
                      <span className="font-bold text-slate-800 block mb-1">
                        Compatible Product Systems ({activeIng.compatibleProductTypes.length}):
                      </span>
                      <p className="text-slate-600">
                        {activeIng.compatibleProductTypes.join(" · ")}
                      </p>
                    </div>
                  </div>

                  {/* Verified Suppliers & Halal Certifications Table (Feature C) */}
                  <div>
                    <div className="flex items-center justify-between mb-2.5">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                        <span>
                          Verified Suppliers &amp; Halal Certifications ({activeIng.suppliers.length})
                        </span>
                      </h3>
                      <span className="text-[11px] font-mono text-slate-500">
                        Source: supplier.csv
                      </span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {activeIng.suppliers.map((sup, idx) => (
                        <div
                          key={`${sup.supplierName}-${idx}`}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                        >
                          <div>
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span>{sup.supplierName}</span>
                              {sup.isHalal ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#0f766e] shrink-0" />
                              ) : (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {sup.location} · Grade: {sup.grade} · Cert: {sup.halalBody}
                            </p>
                          </div>

                          <div className="text-left sm:text-right font-mono text-[11px] text-slate-700 shrink-0 tabular-nums">
                            <div className="font-bold text-[#0f766e]">
                              Rp {sup.pricePerG.toLocaleString("id-ID")}/g
                            </div>
                            <div className="text-slate-500">
                              MOQ {sup.moqGram}g · Lead {sup.leadTimeDays}d · {sup.stock}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}