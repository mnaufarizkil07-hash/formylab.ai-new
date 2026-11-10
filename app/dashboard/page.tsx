"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Atom,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Microscope,
  CheckCircle2,
  Trash2,
  ExternalLink,
  Activity,
  Award,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import LivingLabBackground from "../../components/LivingLabBackground";
import Molecule3DViewer from "../../components/Molecule3DViewer";
import { GeminiLogo, OpenAILogo } from "../../components/AiModelLogos";
import {
  VALIDATED_PRODUCT_TYPES,
  getIngredientProfile,
} from "../../lib/cosmeticChemistryData";
import {
  fetchSavedFormulations,
  loadLocalFormulations,
  deleteSavedFormulation,
  type SavedFormulationRecord,
} from "../../lib/formulationStorage";

const FEATURED_3D_MOLECULES = [
  "Glycerin",
  "Niacinamide",
  "Cetyl Alcohol",
  "Alpha Tocopherol",
  "Triethanolamine",
  "Salicylic Acid",
  "Zinc Oxide",
  "Ceramide NP",
];

export default function DashboardPage() {
  const router = useRouter();
  const [selectedMolecule, setSelectedMolecule] = useState("Niacinamide");
  const [savedRecords, setSavedRecords] = useState<SavedFormulationRecord[]>([]);
  const [heroTilt, setHeroTilt] = useState({ x: 0, y: 0 });

  useEffect(() => {
    queueMicrotask(() => {
      const local = loadLocalFormulations();
      if (local.length > 0) {
        setSavedRecords(local);
      }
    });
    fetchSavedFormulations().then((records) => {
      setSavedRecords(records);
    });
  }, []);

  const activeProfile = getIngredientProfile(selectedMolecule);

  const handleOpenSavedRecord = (rec: SavedFormulationRecord) => {
    localStorage.setItem(
      "currentFormulation",
      JSON.stringify({
        productType: rec.productType,
        skinTarget: rec.skinTarget,
        targetPh: rec.targetPh,
        targetViscosity: rec.targetViscosity,
        batchSize: rec.batchSize,
        customIngredients: rec.customIngredients,
        viewCost: true,
      })
    );
    localStorage.setItem("aiGeneratedCandidates", JSON.stringify(rec.candidates));
    router.push("/result");
  };

  const handleDeleteRecord = async (id: string) => {
    const updated = await deleteSavedFormulation(id);
    setSavedRecords(updated);
  };

  const handleQuickLaunchProductType = (productName: string) => {
    localStorage.setItem("preselectedProductType", productName);
    router.push("/formulate");
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24 overflow-x-hidden">
      <LivingLabBackground variant="mint" />

      {/* Top Floating Rounded Pill Navbar (Reference Image 1 Style) */}
      <WorkspaceNavbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-16">
        {/* SECTION 1: XTRA-STYLE CURVED HERO WITH REFERENCE IMAGE 4 (MICROSCOPY LAB) */}
        <section
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const nx = (e.clientX - rect.left) / rect.width - 0.5;
            const ny = (e.clientY - rect.top) / rect.height - 0.5;
            setHeroTilt({ x: Number((ny * -5).toFixed(2)), y: Number((nx * 6).toFixed(2)) });
          }}
          onMouseLeave={() => setHeroTilt({ x: 0, y: 0 })}
          className="relative bg-white/95 rounded-[2.5rem] shadow-[0_24px_60px_-15px_rgba(16,68,56,0.18)] border border-emerald-900/10 overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[520px]">
            {/* Left Content Column */}
            <div className="lg:col-span-6 p-8 sm:p-12 lg:p-14 flex flex-col justify-center relative z-20">
              <p className="text-xs sm:text-sm font-bold tracking-[0.24em] text-[#14b8a6] uppercase mb-4">
                WE ARE EXPERT R&amp;D FORMULATION TEAM
              </p>

              <h1
                className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-[1.12] tracking-tight mb-5"
                style={{ textWrap: "balance" }}
              >
                We create cosmetic formulas that make skin{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0f766e] to-[#10b981]">
                  healthier &amp; safer.
                </span>
              </h1>

              <p className="text-slate-700 text-sm sm:text-[15px] leading-relaxed mb-8 max-w-xl">
                Platform R&amp;D formulasi skincare berbasis bukti ilmiah dengan 1.000+ dataset jurnal
                Box-Behnken Design, 12 sistem produk tervalidasi (pH &amp; viskositas cPs akurat),
                visualisasi molekul 3D WebGL, serta pemetaan supplier Halal LPPOM MUI &amp; IFANCA.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 mb-8">
                <button
                  type="button"
                  onClick={() => router.push("/formulate")}
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0f766e] text-white font-bold text-sm shadow-md hover:opacity-95 transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <span>Start New Formulation</span>
                  <ArrowRight className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/library")}
                  className="px-6 py-3.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-800 border border-slate-200 font-bold text-sm transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Atom className="w-4 h-4 text-[#0f766e]" />
                  <span>Explore 3D Ingredient Library</span>
                </button>
              </div>

              {/* Clean Unboxed Scientific Proof Metadata */}
              <div className="pt-5 border-t border-slate-100 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-500 font-medium">
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  1,000+ BBD Formulas
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  43+ 3D Validated Ingredients
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono font-bold text-slate-800 tabular-nums">
                  12 Product Systems
                </span>
                <span aria-hidden="true">·</span>
                <span className="text-[#0f766e] font-semibold">
                  Halal LPPOM MUI &amp; BPOM Reference
                </span>
              </div>
            </div>

            {/* Right Curved Image Column with Reference Image 4 (/assets/aistudio/__f6ec833b.jpeg) */}
            <div className="lg:col-span-6 relative min-h-[360px] lg:min-h-full overflow-hidden bg-slate-900">
              {/* Organic S-Curve SVG Divider on Desktop (matching Reference Image 1) */}
              <svg
                viewBox="0 0 120 600"
                preserveAspectRatio="none"
                className="hidden lg:block absolute top-0 -left-1 h-full w-28 z-20 pointer-events-none"
              >
                <path
                  d="M0,0 L70,0 C15,180 115,390 45,600 L0,600 Z"
                  fill="#ffffff"
                />
                <path
                  d="M70,0 C15,180 115,390 45,600"
                  fill="none"
                  stroke="#d1fae5"
                  strokeWidth="6"
                />
              </svg>

              {/* Hero Lab Scientists Image with Subtle 3D Parallax Transform */}
              <div
                style={{
                  transform: `perspective(1000px) rotateX(${heroTilt.x}deg) rotateY(${heroTilt.y}deg) scale(1.03)`,
                  transition: "transform 180ms cubic-bezier(0.16, 1, 0.3, 1)",
                }}
                className="w-full h-full relative"
              >
                <img
                  src="/assets/aistudio/__f6ec833b.jpeg"
                  alt="FormyLab R&D Cosmetic Chemists analyzing formulation stability under microscope"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-center min-h-[360px] lg:min-h-[520px]"
                />
                <div className="absolute inset-0 bg-gradient-to-tr from-[#0b2922]/55 via-transparent to-transparent" />
              </div>

              {/* Floating 3D Glassmorphic Lab Telemetry Card */}
              <div className="absolute bottom-6 right-6 left-6 sm:left-auto sm:w-80 z-30 bg-slate-950/80 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-white shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Microscope className="w-4 h-4 shrink-0" />
                    <span>Clinical Rheology &amp; pH Calibration</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                    ISO 16128
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Verified Target pH (3.85–6.60) &amp; Brookfield Viscosity (250–24,000 cPs) across
                  12 cosmetic emulsion and hydrogel systems.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: "OUR SERVICES" 4-COLUMN R&D PLATFORM CARDS (Reference Image 3 Style) */}
        <section aria-labelledby="services-heading">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Column 1: Teal-to-Emerald Gradient Lead Card (Reference Image 3 Left Card) */}
            <div className="rounded-[2rem] bg-gradient-to-b from-[#2dd4bf] via-[#0d9488] to-[#115e59] text-white p-8 flex flex-col justify-between shadow-[0_20px_50px_-15px_rgba(13,148,136,0.45)] relative overflow-hidden">
              <div className="relative z-10">
                <p className="text-xs font-bold tracking-[0.22em] uppercase text-emerald-100 mb-3">
                  OUR PLATFORM
                </p>
                <h2
                  id="services-heading"
                  className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4"
                >
                  We Will Help Your Formulation Growing
                </h2>
                <p className="text-sm text-emerald-50/90 leading-relaxed">
                  Integrasi penuh dari pemilihan bahan aktif Halal, simulasi pH &amp; viskositas,
                  inspeksi molekul 3D WebGL, hingga laporan studi R&amp;D siap ekspor.
                </p>
              </div>

              <div className="relative z-10 pt-8 mt-6 border-t border-white/20 flex items-center justify-between text-xs font-semibold text-emerald-50">
                <span>USP &amp; BPOM Aligned</span>
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
            </div>

            {/* Column 2: Service Card 1 — New Formulation Engine */}
            <div className="group bg-white/95 rounded-[2rem] p-8 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08)] border border-emerald-900/10 flex flex-col justify-between hover:-translate-y-1.5 transition-transform duration-200">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/80 text-[#0d9488] flex items-center justify-center mb-6 group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
                  <FlaskConical className="w-7 h-7 stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2.5">
                  New Formulation
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Rancang kandidat krim, serum, gel, cleanser, atau sunscreen berdasarkan 12
                  Product Type tervalidasi, lengkap dengan kalkulasi BOM &amp; substitusi alergen.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/formulate")}
                className="w-full py-3 px-4 rounded-xl bg-[#12382f] hover:bg-[#0f766e] text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Start Formulation</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Column 3: Service Card 2 — Ingredient Library & 3D Molecules */}
            <div className="group bg-white/95 rounded-[2rem] p-8 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08)] border border-emerald-900/10 flex flex-col justify-between hover:-translate-y-1.5 transition-transform duration-200">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/80 text-[#0d9488] flex items-center justify-center mb-6 group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
                  <Atom className="w-7 h-7 stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                  Ingredient Library
                </h3>
                <p className="text-xs font-mono font-bold text-[#0f766e] mb-2 tabular-nums">
                  43+ ingredients · 3D WebGL Conformer
                </p>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Inspeksi struktur molekul 3D interaktif, skor kompatibilitas (%), rentang HLB &amp;
                  pH, serta daftar PT Supplier &amp; sertifikasi Halal LPPOM MUI.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/library")}
                className="w-full py-3 px-4 rounded-xl bg-emerald-50 hover:bg-[#0d9488] text-[#12382f] hover:text-white border border-emerald-200 font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <span>Open 3D Library</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {/* Column 4: Service Card 3 — AI Chemist Chat (Gemini 3.8 & GPT-6 Luna) */}
            <div className="group bg-white/95 rounded-[2rem] p-8 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08)] border border-emerald-900/10 flex flex-col justify-between hover:-translate-y-1.5 transition-transform duration-200">
              <div>
                <div className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-1.5 mb-6 shadow-sm">
                  <GeminiLogo className="w-5 h-5" idSuffix="dash-service" />
                  <OpenAILogo className="w-4 h-4 text-white" />
                </div>
                <h3 className="text-xl font-extrabold text-slate-900 mb-2">
                  AI Chemist Chat
                </h3>
                <p className="text-xs font-semibold text-slate-500 mb-2">
                  Gemini 3.8 · GPT-6 Luna · Voice Note &amp; File
                </p>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Konsultasi kimia kosmetik real-time, perhitungan HLB emulsi, kirim dokumen/foto
                  formula, dan rekaman suara (VN) dengan multi-model AI.
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push("/chat")}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#0f766e] to-[#12382f] hover:opacity-95 text-white font-bold text-sm transition flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Sparkles className="w-4 h-4" />
                <span>Consult AI Chemist</span>
              </button>
            </div>
          </div>
        </section>

        {/* SECTION 3: LIVE 3D WEBGL MOLECULAR STUDIO & INGREDIENT INSPECTOR */}
        <section className="bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
                INTERACTIVE 3D WEBGL MOLECULAR VIEWPORT
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Inspect Active &amp; Base Molecules in 3D Space
              </h2>
            </div>

            {/* Interactive Selector Tabs */}
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
              {FEATURED_3D_MOLECULES.map((molName) => {
                const isSelected = selectedMolecule === molName;
                return (
                  <button
                    key={molName}
                    type="button"
                    onClick={() => setSelectedMolecule(molName)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap ${
                      isSelected
                        ? "bg-[#0f766e] text-white shadow-xs"
                        : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    {molName}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* Left 7 Cols: 3D WebGL Molecule Canvas */}
            <div className="lg:col-span-7">
              <Molecule3DViewer ingredientName={selectedMolecule} heightClass="h-[380px]" />
            </div>

            {/* Right 5 Cols: Live Scientific & Compatibility Readout */}
            <div className="lg:col-span-5 bg-slate-50/90 rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs font-mono text-slate-500">
                      CAS {activeProfile.casNumber} · {activeProfile.molecularWeight}
                    </p>
                    <h3 className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {activeProfile.inciName}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-xs uppercase font-mono text-slate-400 block">
                      Compatibility
                    </span>
                    <span className="text-2xl font-mono font-extrabold text-[#0f766e] tabular-nums">
                      {activeProfile.compatibilityScore}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 leading-relaxed mb-5">
                  {activeProfile.mechanismOfAction}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Optimal pH Window
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                      {activeProfile.optimalPhRange}
                    </span>
                  </div>
                  <div className="bg-white p-3 rounded-xl border border-slate-200/70">
                    <span className="text-[11px] font-mono text-slate-400 uppercase block">
                      Recommended Dosage
                    </span>
                    <span className="text-sm font-mono font-bold text-slate-900 tabular-nums">
                      {activeProfile.typicalUsageRate}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-600 mb-6">
                  <div>
                    <span className="font-bold text-slate-800">Synergistic With: </span>
                    <span>{activeProfile.synergisticWith.join(" · ")}</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-800">Certifications: </span>
                    <span className="text-[#0f766e] font-semibold">
                      {activeProfile.certifications.join(" · ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => router.push("/library")}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-[#12382f] text-white text-xs font-bold hover:bg-[#0f766e] transition cursor-pointer text-center whitespace-nowrap"
                >
                  Inspect All 43+ Ingredients in Library
                </button>
                <button
                  type="button"
                  onClick={() => {
                    localStorage.setItem("preselectedIngredient", selectedMolecule);
                    router.push("/formulate");
                  }}
                  className="py-2.5 px-4 rounded-xl bg-emerald-100 text-[#12382f] text-xs font-bold hover:bg-emerald-200 transition cursor-pointer whitespace-nowrap"
                >
                  Use in Formulator
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: 12 VALIDATED PRODUCT SYSTEMS MATRIX (Auto-Calibrated pH & Viscosity) */}
        <section className="bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
                VALIDATED COSMETIC BENCH STANDARDS
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                12 Calibrated Product Types (Target pH &amp; Viscosity)
              </h2>
            </div>
            <button
              type="button"
              onClick={() => router.push("/formulate")}
              className="text-xs font-bold text-[#0f766e] hover:underline flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Open Full Formulator</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALIDATED_PRODUCT_TYPES.map((spec, idx) => (
              <div
                key={spec.id}
                className="group bg-slate-50/85 hover:bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-[#14b8a6] hover:shadow-md transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono mb-2">
                    <span>{String(idx + 1).padStart(2, "0")}. {spec.systemType}</span>
                    <span className="text-[#0f766e] font-bold">pH {spec.targetPh}</span>
                  </div>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1.5">
                    {spec.name}
                  </h3>
                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-4">
                    {spec.scientificBasis}
                  </p>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-slate-700 bg-white px-3 py-2 rounded-xl border border-slate-200/70 mb-3 tabular-nums">
                    <span>Visc: {spec.targetViscosity}</span>
                    <span>Actives: {spec.recommendedActives.length}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickLaunchProductType(spec.name)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-50 group-hover:bg-[#0f766e] text-[#12382f] group-hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <span>Formulate {spec.shortName}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5: SAVED FORMULATIONS PERSISTENCE HISTORY (Feature A) */}
        <section className="bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0d9488] mb-1.5">
                PERSISTENT R&amp;D REPOSITORY
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900">
                Saved Formulation Runs ({savedRecords.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => router.push("/formulate")}
              className="px-4 py-2.5 rounded-xl bg-[#12382f] text-white text-xs font-bold hover:bg-[#0f766e] transition flex items-center gap-2 cursor-pointer whitespace-nowrap self-start sm:self-auto"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Create New Study</span>
            </button>
          </div>

          {savedRecords.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border border-slate-200/70">
              <FileSpreadsheet className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700">No saved formulation runs yet</p>
              <p className="text-xs text-slate-500 mt-1">
                Every formulation you generate in the Formulator is automatically saved here across sessions.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {savedRecords.map((rec) => {
                const topCandidate = rec.candidates?.[0];
                return (
                  <div
                    key={rec.id}
                    className="bg-slate-50/90 rounded-2xl p-5 border border-slate-200/80 flex flex-col justify-between hover:border-emerald-300 transition"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs font-mono text-slate-500 mb-2">
                        <span className="font-bold text-[#0f766e]">{rec.id}</span>
                        <span>
                          {new Date(rec.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-900 mb-1">
                        {rec.productType}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600 mb-3">
                        <span>Target: {rec.skinTarget}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">pH {rec.targetPh}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">{rec.targetViscosity}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">Batch {rec.batchSize}g</span>
                      </div>

                      {topCandidate && (
                        <p className="text-xs text-slate-500 mb-4 line-clamp-2">
                          {topCandidate.ingredients
                            .slice(0, 5)
                            .map((i) => `${i.name} (${i.conc})`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-200/80">
                      <button
                        type="button"
                        onClick={() => handleOpenSavedRecord(rec)}
                        className="px-3.5 py-2 rounded-xl bg-[#12382f] hover:bg-[#0f766e] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Study &amp; PDF/CSV Report</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id)}
                        aria-label={`Delete saved formulation ${rec.id}`}
                        className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Quiet Editorial Footer */}
        <footer className="pt-4 text-center text-xs text-slate-600 font-medium flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-emerald-900/10">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-[#0f766e]" />
            <span>formylab.ai · Cosmetic R&amp;D Formulation &amp; 3D Molecular Intelligence</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#0f766e]" />
              <span>LPPOM MUI &amp; IFANCA Supplier Database</span>
            </span>
            <span aria-hidden="true">·</span>
            <span className="flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-[#0f766e]" />
              <span>BBD &amp; MDPI Validated</span>
            </span>
          </div>
        </footer>
      </main>
    </div>
  );
}