"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Search,
  Atom,
  ShieldCheck,
  AlertCircle,
  AlertTriangle,
  Building2,
  FlaskConical,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  RotateCcw,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import AmbientBioluminescence from "../../components/AmbientBioluminescence";
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
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProductType, setSelectedProductType] = useState<string>("ALL");
  const [safetyFilter, setSafetyFilter] = useState<"ALL" | "SAFE_ONLY" | "HALAL_ONLY">("ALL");
  const [selectedIngredient, setSelectedIngredient] = useState<LibraryIngredient | null>(null);

  const sanitizeEmDash = (text: string, replacement = ": ") =>
    text.replace(/\s*—\s*/g, replacement);

  useEffect(() => {
    let isActive = true;

    fetch("/api/library")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok || !data.success || !Array.isArray(data.ingredients)) {
          throw new Error(
            typeof data?.error === "string" && data.error.trim()
              ? data.error
              : "Gagal memuat katalog bahan baku dan data supplier dari server."
          );
        }
        return data.ingredients as LibraryIngredient[];
      })
      .then((loaded) => {
        if (!isActive) return;
        setIngredients(loaded);
        const defaultIng =
          loaded.find((i) => i.key === "glycerin") || loaded[0];
        setSelectedIngredient(defaultIng || null);
        setLoadError(null);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        if (!isActive) return;
        setLoadError(
          err instanceof Error && err.message
            ? err.message
            : "Tidak dapat terhubung ke layanan katalog bahan baku. Periksa koneksi Anda lalu coba lagi."
        );
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [reloadKey]);

  const handleRetryLoad = () => {
    setIsLoading(true);
    setLoadError(null);
    setReloadKey((prev) => prev + 1);
  };

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedProductType("ALL");
    setSafetyFilter("ALL");
  };

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

  const halalCount = ingredients.filter((i) => i.isHalalCertified).length;
  const safeCount = ingredients.filter((i) => i.risk !== "High").length;

  return (
    <div className="min-h-screen relative font-sans bg-[#f8fdfb] text-[#0B2B26] pb-16 overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2.5 focus:rounded-full focus:bg-[#0B2B26] focus:text-white focus:text-xs focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#0E807E] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      <WorkspaceNavbar backHref="/dashboard" backLabel="Back to Home" />

      <main id="main-content" className="relative z-10">
        {/* Top Ambient Light Header + 4 Optical Liquid Glass Metric Cards */}
        <div className="relative overflow-hidden bg-white border-b border-[#0B2B26]/10 mb-8">
          <AmbientBioluminescence variant="section" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-8 lg:min-h-[336px] flex flex-col justify-between">
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
              <div className="max-w-3xl">
                <span className="text-[11px] font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-2.5">
                  Tahap 0 · Katalog Bahan Baku &amp; Supplier Halal
                </span>
                <h1 className="text-3xl sm:text-[40px] leading-[1.08] font-medium text-[#0B2B26] tracking-[-0.035em] text-balance">
                  3D Molecular Ingredient Library &amp; Halal Supplier Registry
                </h1>
                <p className="text-[#2E524C] text-sm sm:text-[15px] mt-3 leading-relaxed">
                  Telusuri {ingredients.length || 46} bahan baku tervalidasi lengkap dengan pH,
                  HLB, kompatibilitas, konformer 3D, harga per gram, dan status Halal MUI/BPJPH.
                </p>
              </div>

              <div className="flex items-center gap-3 shrink-0 self-start lg:self-end">
                <button
                  type="button"
                  onClick={() => router.push("/formulate")}
                  className="btn-glass-primary min-h-[44px] px-6 py-3 text-xs uppercase tracking-[0.06em] flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Open AI Formulator</span>
                </button>
              </div>
            </div>

            {/* 4 Optical Liquid Glass Registry Metric Cards (aligned with /formulate banner) */}
            <div className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0E807E] block">
                  Validated Materials
                </span>
                <div>
                  <div className="text-2xl font-mono font-medium text-[#0B2B26] tabular-nums">
                    {ingredients.length}
                  </div>
                  <span className="text-xs text-[#2E524C] block mt-1">
                    INCI + CAS + 3D Conformers
                  </span>
                </div>
              </div>

              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0E807E] block">
                  Halal Certified (MUI/BPJPH)
                </span>
                <div>
                  <div className="text-2xl font-mono font-medium text-[#0B2B26] tabular-nums">
                    {halalCount}
                  </div>
                  <span className="text-xs text-[#2E524C] block mt-1">
                    Verified Supplier CoA Registry
                  </span>
                </div>
              </div>

              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0E807E] block">
                  Low-Risk / Hypoallergenic
                </span>
                <div>
                  <div className="text-2xl font-mono font-medium text-[#0B2B26] tabular-nums">
                    {safeCount}
                  </div>
                  <span className="text-xs text-[#2E524C] block mt-1">
                    BPOM &amp; ASEAN Safety Screened
                  </span>
                </div>
              </div>

              <div className="card-glass-optical p-5 rounded-[18px]! min-h-[116px] flex flex-col justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0E807E] block">
                  Product Systems Covered
                </span>
                <div>
                  <div className="text-2xl font-mono font-medium text-[#0B2B26] tabular-nums">
                    {VALIDATED_PRODUCT_TYPES.length}
                  </div>
                  <span className="text-xs text-[#2E524C] block mt-1">
                    Serum · Cream · Gel · Cleanser
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          {/* Filter & Search Bar: Crisp White Data Toolbar */}
          <div className="bg-white rounded-[16px] p-4 sm:p-5 border border-[#0B2B26]/10 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-center">
              {/* Search Input (12px radius aligned with select) */}
              <div className="md:col-span-4 relative">
                <Search
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
                />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search INCI, CAS number, supplier PT, or function..."
                  aria-label="Search ingredients"
                  className="w-full min-h-[44px] pl-10 pr-4 py-2.5 rounded-[12px] border border-[#0B2B26]/15 bg-[#f8fdfb] focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-xs sm:text-sm font-normal text-[#0B2B26] placeholder:text-[#2E524C]/75 transition-colors"
                />
              </div>

              {/* Filter by Product Type */}
              <div className="md:col-span-4 flex items-center gap-2">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] shrink-0"
                />
                <div className="relative w-full">
                  <select
                    aria-label="Filter ingredients by Product Type"
                    value={selectedProductType}
                    onChange={(e) => setSelectedProductType(e.target.value)}
                    className="w-full min-h-[44px] appearance-none pl-3.5 pr-10 py-2.5 rounded-[12px] border border-[#0B2B26]/15 bg-[#f8fdfb] focus:outline-none focus:border-[#0E807E] focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 text-xs sm:text-sm font-medium text-[#0B2B26] transition-colors cursor-pointer"
                  >
                    <option value="ALL">
                      All {VALIDATED_PRODUCT_TYPES.length} Product Types ({ingredients.length})
                    </option>
                    {VALIDATED_PRODUCT_TYPES.map((pt) => (
                      <option key={pt.id} value={pt.name}>
                        {pt.name} (pH {pt.targetPh})
                      </option>
                    ))}
                  </select>
                  <ChevronDown
                    aria-hidden="true"
                    className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2"
                  />
                </div>
              </div>

              {/* Segmented Safety / Halal Filter */}
              <div
                role="group"
                aria-label="Filter keamanan dan kehalalan bahan"
                className="md:col-span-4 flex items-center justify-start md:justify-end gap-1.5 flex-wrap sm:flex-nowrap"
              >
                <button
                  type="button"
                  aria-pressed={safetyFilter === "ALL"}
                  onClick={() => setSafetyFilter("ALL")}
                  className={`min-h-[44px] py-2.5 px-3.5 text-xs cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 ${
                    safetyFilter === "ALL" ? "btn-glass-primary" : "btn-glass-compact"
                  }`}
                >
                  <span>All ({filteredIngredients.length})</span>
                </button>
                <button
                  type="button"
                  aria-pressed={safetyFilter === "SAFE_ONLY"}
                  onClick={() => setSafetyFilter("SAFE_ONLY")}
                  className={`min-h-[44px] py-2.5 px-3.5 text-xs cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 ${
                    safetyFilter === "SAFE_ONLY" ? "btn-glass-primary" : "btn-glass-compact"
                  }`}
                >
                  <span>Hypoallergenic</span>
                </button>
                <button
                  type="button"
                  aria-pressed={safetyFilter === "HALAL_ONLY"}
                  onClick={() => setSafetyFilter("HALAL_ONLY")}
                  className={`min-h-[44px] py-2.5 px-3.5 text-xs cursor-pointer whitespace-nowrap shrink-0 inline-flex items-center justify-center transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1 ${
                    safetyFilter === "HALAL_ONLY" ? "btn-glass-primary" : "btn-glass-compact"
                  }`}
                >
                  <span>Halal</span>
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div
              role="status"
              className="bg-white rounded-[16px] p-16 text-center border border-[#0B2B26]/10"
            >
              <Atom
                aria-hidden="true"
                className="w-10 h-10 text-[#0E807E] motion-safe:animate-spin mx-auto mb-3"
              />
              <p className="text-base font-medium text-[#0B2B26]">
                Loading Cosmetic Ingredients, Supplier CoAs &amp; 3D Molecular Structures...
              </p>
            </div>
          ) : loadError ? (
            <div
              role="alert"
              className="bg-white rounded-[16px] p-10 sm:p-14 border border-[#b91c1c]/30 text-center"
            >
              <AlertCircle
                aria-hidden="true"
                className="w-8 h-8 text-[#b91c1c] mx-auto mb-3"
              />
              <h2 className="text-lg font-medium text-[#0B2B26]">
                Gagal Memuat Katalog Bahan Baku
              </h2>
              <p className="text-sm text-[#2E524C] mt-2 max-w-md mx-auto leading-relaxed">
                {loadError}
              </p>
              <button
                type="button"
                onClick={handleRetryLoad}
                className="btn-glass-primary min-h-[44px] px-6 py-2.5 text-xs mt-5 inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                <span>Coba Lagi</span>
              </button>
            </div>
          ) : filteredIngredients.length === 0 ? (
            <div className="bg-white rounded-[16px] p-10 sm:p-14 border border-[#0B2B26]/10 text-center">
              <Search aria-hidden="true" className="w-8 h-8 text-[#0E807E] mx-auto mb-3" />
              <h2 className="text-lg font-medium text-[#0B2B26]">
                Tidak Ada Bahan yang Cocok dengan Filter
              </h2>
              <p className="text-sm text-[#2E524C] mt-2 max-w-md mx-auto leading-relaxed">
                Ubah kata kunci pencarian, pilihan sistem produk, atau filter keamanan dan halal
                untuk menampilkan daftar bahan baku tervalidasi.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="btn-glass-primary min-h-[44px] px-6 py-2.5 text-xs mt-5 inline-flex items-center gap-2 cursor-pointer"
              >
                <RotateCcw aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                <span>Reset Filter</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* LEFT 6 COLUMNS: CRISP WHITE HAIRLINE DIRECTORY */}
              <section
                aria-labelledby="ingredient-directory-heading"
                className="lg:col-span-6 bg-white border border-[#0B2B26]/10 rounded-[16px] overflow-hidden"
              >
                <div className="px-5 py-3.5 border-b border-[#0B2B26]/10 bg-[#f8fdfb] flex items-center justify-between gap-3">
                  <h2
                    id="ingredient-directory-heading"
                    className="text-[11px] font-medium uppercase tracking-[0.1em] text-[#0E807E]"
                  >
                    Direktori Bahan Baku Tervalidasi
                  </h2>
                  <span className="text-xs font-mono text-[#2E524C] tabular-nums">
                    {filteredIngredients.length} bahan
                  </span>
                </div>

                <div className="divide-y divide-[#0B2B26]/10 max-h-[860px] overflow-y-auto">
                  {filteredIngredients.map((ing) => {
                    const isSelected = activeIng?.id === ing.id;
                    const isHighRisk = ing.risk === "High";
                    return (
                      <button
                        key={ing.id}
                        type="button"
                        aria-pressed={isSelected}
                        onClick={() => setSelectedIngredient(ing)}
                        className={`w-full min-h-[44px] text-left px-5 py-4 transition-colors cursor-pointer block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E807E] ${
                          isSelected
                            ? "bg-[#f4fbf8] ring-1 ring-inset ring-[#0E807E]/45"
                            : isHighRisk
                            ? "bg-white hover:bg-[#fef2f2]"
                            : "bg-white hover:bg-[#f8fdfb]"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-1.5">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-mono tabular-nums text-[#2E524C]">
                              <span className="font-medium text-[#0E807E]">
                                {String(ing.id).padStart(2, "0")}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span>CAS {ing.casNumber}</span>
                              <span aria-hidden="true">·</span>
                              <span className="font-medium text-[#0B2B26]">
                                {ing.molecularFormula}
                              </span>
                              {isSelected && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="font-sans font-medium text-[#0E807E]">Dipilih</span>
                                </>
                              )}
                            </div>
                            <h3 className="text-[15px] font-medium text-[#0B2B26] mt-0.5">
                              {ing.name}
                            </h3>
                            <p className="text-xs text-[#2E524C] truncate">{ing.inciName}</p>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                              Compatibility
                            </span>
                            <span
                              className={`text-base font-mono font-medium tabular-nums ${
                                isHighRisk ? "text-[#b91c1c]" : "text-[#0E807E]"
                              }`}
                            >
                              {ing.compatibilityScore}%
                            </span>
                          </div>
                        </div>

                        <p className="text-xs text-[#2E524C] line-clamp-2 mb-2.5 leading-relaxed">
                          {sanitizeEmDash(ing.mechanismOfAction, ", ")}
                        </p>

                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#2E524C]">
                          <div className="flex items-center gap-1.5 font-medium min-w-0">
                            <Building2
                              aria-hidden="true"
                              className="w-3.5 h-3.5 text-[#0E807E] shrink-0"
                            />
                            <span className="truncate text-[#0B2B26]">{ing.primarySupplier}</span>
                            <span aria-hidden="true">·</span>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-medium shrink-0 ${
                                ing.isHalalCertified
                                  ? "bg-[#eaf9f0] text-[#146c43]"
                                  : "bg-[#fef9e7] text-[#7A4F00]"
                              }`}
                            >
                              {ing.halalCertificationBody}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 font-mono text-[#0B2B26] font-medium tabular-nums shrink-0">
                            <span>pH {ing.optimalPhRange}</span>
                            <span aria-hidden="true">·</span>
                            <span>{ing.typicalUsageRate}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>

              {/* RIGHT 6 COLUMNS: STICKY 3D WEBGL MOLECULE VIEWER & FULL SCIENTIFIC DOSSIER */}
              {activeIng && (
                <div className="lg:col-span-6 lg:sticky lg:top-24 space-y-5">
                  <section className="bg-white rounded-[16px] p-6 sm:p-7 border border-[#0B2B26]/10">
                    {/* Dossier Header */}
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-4">
                      <div>
                        <div className="flex items-center gap-2 text-xs font-sans text-[#0E807E] font-medium">
                          <span>{activeIng.sourceDataset}</span>
                          <span aria-hidden="true">·</span>
                          <span>{activeIng.solubilityPhase}</span>
                        </div>
                        <h2 className="text-2xl font-medium tracking-[-0.03em] text-[#0B2B26] mt-1">
                          {activeIng.name}
                        </h2>
                        <p className="text-xs text-[#2E524C] font-normal">{activeIng.inciName}</p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          localStorage.setItem("preselectedIngredient", activeIng.name);
                          router.push("/formulate");
                        }}
                        className="btn-glass-primary min-h-[44px] px-5 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap self-start focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1"
                      >
                        <FlaskConical aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                        <span>Use in Formulator</span>
                      </button>
                    </div>

                    {/* Interactive 3D WebGL Molecule Viewer */}
                    <div className="mb-5">
                      <Molecule3DViewer
                        ingredientName={activeIng.name}
                        heightClass="h-[320px]"
                      />
                    </div>

                    {/* Key Chemical & Compatibility Metrics Grid */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
                      <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                        <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                          Compatibility
                        </span>
                        <span className="text-lg font-mono font-medium text-[#0E807E] tabular-nums">
                          {activeIng.compatibilityScore}%
                        </span>
                      </div>
                      <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                        <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                          Optimal pH
                        </span>
                        <span className="text-xs font-mono font-medium text-[#0B2B26] tabular-nums">
                          {activeIng.optimalPhRange}
                        </span>
                      </div>
                      <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                        <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                          Usage Dosage
                        </span>
                        <span className="text-xs font-mono font-medium text-[#0B2B26] tabular-nums">
                          {activeIng.typicalUsageRate}
                        </span>
                      </div>
                      <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                        <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                          Mol. Weight
                        </span>
                        <span className="text-xs font-mono font-medium text-[#0B2B26] truncate block tabular-nums">
                          {activeIng.molecularWeight}
                        </span>
                      </div>
                    </div>

                    {/* Mechanism & Synergy */}
                    <div className="space-y-3 text-xs text-[#2E524C] mb-5 bg-[#f4fbf8] p-4 rounded-[12px] border border-[#0B2B26]/10">
                      <div>
                        <span className="font-medium text-[#0B2B26] block mb-0.5">
                          Functional Category &amp; Mechanism of Action:
                        </span>
                        <p className="leading-relaxed">
                          <strong className="font-medium text-[#0E807E]">
                            {activeIng.functionalCategory}
                          </strong>
                          : {sanitizeEmDash(activeIng.mechanismOfAction, ", ")}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#0B2B26]/10">
                        <div>
                          <span className="font-medium text-[#0B2B26] block mb-0.5">
                            Synergistic Combinations:
                          </span>
                          <p className="text-[#2E524C]">
                            {activeIng.synergisticWith
                              .map((s) => sanitizeEmDash(s, ": "))
                              .join(" · ")}
                          </p>
                        </div>
                        <div>
                          <span className="font-medium text-[#0B2B26] block mb-0.5">
                            Incompatibilities / Avoid With:
                          </span>
                          <p className="text-[#7A4F00] font-medium">
                            {activeIng.avoidWith
                              .map((item) => sanitizeEmDash(item, ": "))
                              .join(" · ")}
                          </p>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-[#0B2B26]/10">
                        <span className="font-medium text-[#0B2B26] block mb-1">
                          Compatible Product Systems ({activeIng.compatibleProductTypes.length}):
                        </span>
                        <p className="text-[#2E524C]">
                          {activeIng.compatibleProductTypes.join(" · ")}
                        </p>
                      </div>
                    </div>

                    {/* Verified Suppliers & Halal Certifications Table */}
                    <div>
                      <div className="flex items-center justify-between mb-2.5">
                        <h3 className="text-xs font-medium uppercase tracking-[0.06em] text-[#0B2B26] flex items-center gap-1.5">
                          <ShieldCheck
                            aria-hidden="true"
                            className="w-4 h-4 text-[#0E807E]"
                          />
                          <span>
                            Verified Suppliers &amp; Halal Certifications (
                            {activeIng.suppliers.length})
                          </span>
                        </h3>
                        <span className="text-[11px] font-sans text-[#2E524C]">
                          Source: supplier.csv
                        </span>
                      </div>

                      <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                        {activeIng.suppliers.map((sup, idx) => (
                          <div
                            key={`${sup.supplierName}-${idx}`}
                            className="p-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/10 hover:bg-[#f4fbf8] transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                          >
                            <div>
                              <div className="font-medium text-[#0B2B26] flex items-center gap-1.5">
                                <span>{sup.supplierName}</span>
                                {sup.isHalal ? (
                                  <CheckCircle2
                                    aria-hidden="true"
                                    className="w-3.5 h-3.5 text-[#146c43] shrink-0"
                                  />
                                ) : (
                                  <AlertTriangle
                                    aria-hidden="true"
                                    className="w-3.5 h-3.5 text-[#7A4F00] shrink-0"
                                  />
                                )}
                              </div>
                              <p className="text-[11px] text-[#2E524C]">
                                {sup.location} · Grade: {sup.grade} · Cert: {sup.halalBody}
                              </p>
                            </div>

                            <div className="text-left sm:text-right font-mono text-[11px] text-[#2E524C] shrink-0 tabular-nums">
                              <div className="font-medium text-[#0B2B26]">
                                Rp {sup.pricePerG.toLocaleString("id-ID")}/g
                              </div>
                              <div className="text-[#2E524C]">
                                MOQ {sup.moqGram}g · Lead {sup.leadTimeDays}d ·{" "}
                                <span className="font-sans text-[#0E807E] font-medium">{sup.stock}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </div>
              )}
            </div>
          )}
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