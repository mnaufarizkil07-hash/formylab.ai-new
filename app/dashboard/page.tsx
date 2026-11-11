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
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import Logo from "../../components/Logo";
import LivingLabBackground from "../../components/LivingLabBackground";
import Molecule3DViewer from "../../components/Molecule3DViewer";
import { GeminiLogo, OpenAILogo } from "../../components/AiModelLogos";
import Button3D from "../../components/ui3d/Button3D";
import TiltCard from "../../components/ui3d/TiltCard";
import SpinModuleCard from "../../components/ui3d/SpinModuleBadge";
import {
  VALIDATED_PRODUCT_TYPES,
  getIngredientProfile,
} from "../../lib/cosmeticChemistryData";
import {
  FORMYLAB_AI_MODULES,
  WORKFLOW_TAHAPAN_FORMYLAB,
} from "../../lib/interactiveAiEngine";
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

  const handleLaunchAiModule = (samplePrompt: string) => {
    localStorage.setItem("preselectedChatPrompt", samplePrompt);
    router.push("/chat");
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24 overflow-x-hidden">
      <LivingLabBackground variant="mint" />

      {/* Top Floating Rounded Pill Navbar */}
      <WorkspaceNavbar />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-16">
        {/* SECTION 1: XTRA-STYLE CURVED HERO WITH ACCURATE MAKLON AI CO-PILOT DEFINITION */}
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
          <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[420px]">
            {/* Left Content Column */}
            <div className="lg:col-span-6 px-8 sm:px-12 lg:px-14 py-8 sm:py-10 flex flex-col justify-center relative z-20">
              <p className="text-xs sm:text-sm font-bold tracking-[0.24em] text-[#14b8a6] uppercase mb-2.5">
                WE ARE EXPERT R&amp;D FORMULATION TEAM · AI CO-PILOT
              </p>

              <h1
                className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-[1.12] tracking-tight mb-4"
                style={{ textWrap: "balance" }}
              >
                We accelerate cosmetic formulation &amp;{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0f766e] to-[#10b981]">
                  improve accuracy.
                </span>
              </h1>

              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-7">
                <strong>AI Co-Pilot Formulasi Skincare</strong> internal untuk{" "}
                <strong>tim R&amp;D maklon &amp; produsen skincare</strong>: menerjemahkan
                permintaan klien brand menjadi spesifikasi teknis dan draft formula,
                menyaring lewat <strong>5 Pengecekan Berlapis</strong> (Regulasi,
                Kompatibilitas, Halal, Stok, Biaya), menyusun{" "}
                <strong>Formula A, B &amp; C beserta Trade-off</strong>, hingga
                Rencana Percobaan Lab, Learning Loop &amp; Dokumentasi BPOM/Halal.
              </p>

              <div className="flex flex-wrap items-center gap-3.5">
                <Button3D
                  type="button"
                  variant="primary"
                  size="lg"
                  onClick={() => router.push("/formulate")}
                >
                  <span>Input Brief &amp; Formulate</span>
                  <ArrowRight className="w-4 h-4" />
                </Button3D>

                <Button3D
                  type="button"
                  variant="secondary"
                  size="lg"
                  onClick={() => router.push("/library")}
                >
                  <Atom className="w-4 h-4 text-[#0f766e]" />
                  <span>Setup Ingredients &amp; Stock</span>
                </Button3D>
              </div>
            </div>

            {/* Right Curved Image Column with Reference Image 4 (/assets/aistudio/__f6ec833b.jpeg) */}
            <div className="lg:col-span-6 relative min-h-[360px] lg:min-h-full overflow-hidden bg-slate-900">
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

              <div className="absolute bottom-6 right-6 left-6 sm:left-auto sm:w-80 z-30 bg-slate-950/80 backdrop-blur-md border border-white/15 rounded-2xl p-4 text-white shadow-xl">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                    <Microscope className="w-4 h-4 shrink-0" />
                    <span>End-to-End R&amp;D Lab Workflow</span>
                  </div>
                  <span className="text-[11px] font-mono text-emerald-400 tabular-nums">
                    BPOM · Halal
                  </span>
                </div>
                <p className="text-xs text-slate-200 leading-relaxed">
                  Alur terpadu untuk tim R&amp;D maklon: Brief Klien → Spesifikasi Teknis → 5 Filter
                  Berlapis → Formula A/B/C → Rencana Trial &amp; Learning Loop.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: "OUR SERVICES" 4-COLUMN R&D WORKSPACE CARDS */}
        <section aria-labelledby="services-heading">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {/* Column 1: Teal-to-Emerald Gradient Lead TiltCard */}
            <TiltCard className="rounded-[2rem] bg-gradient-to-b from-[#2dd4bf] via-[#0d9488] to-[#115e59] text-white p-8 flex flex-col justify-between shadow-[0_20px_50px_-15px_rgba(13,148,136,0.45)] relative overflow-hidden">
              <div className="relative z-10">
                <p className="tilt-depth-sm text-xs font-bold tracking-[0.22em] uppercase text-emerald-100 mb-3">
                  CORE R&amp;D WORKFLOW
                </p>
                <h2
                  id="services-heading"
                  className="tilt-depth-lg text-2xl sm:text-3xl font-extrabold leading-tight mb-4"
                >
                  We Will Help Your Formulation Growing
                </h2>
                <p className="text-sm text-emerald-50/90 leading-relaxed">
                  Klien brand datang membawa permintaan produk, dan tim R&amp;D maklon memakai
                  AI Co-Pilot ini untuk menerjemahkannya menjadi Formula A (Ideal), Formula B
                  (Hemat/Halal), dan Formula C (Stok Tersedia).
                </p>
              </div>

              <div className="tilt-depth-sm relative z-10 pt-8 mt-6 border-t border-white/20 flex items-center justify-between text-xs font-semibold text-emerald-50">
                <span>End-to-End Integrated Pipeline</span>
                <ShieldCheck className="w-5 h-5 text-emerald-200" />
              </div>
            </TiltCard>

            {/* Column 2: Service Card 1 — Formulator */}
            <TiltCard className="group bg-white/95 rounded-[2rem] p-8 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08)] border border-emerald-900/10 flex flex-col justify-between">
              <div>
                <div className="tilt-depth-lg w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/80 text-[#0d9488] flex items-center justify-center mb-5 group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
                  <FlaskConical className="w-7 h-7 stroke-[1.75]" />
                </div>
                <h3 className="tilt-depth-sm text-xl font-extrabold text-slate-900 mb-2">
                  New Formulation
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Masukkan brief klien (jenis produk, klaim, target kulit/tekstur, target HPP,
                  wajib halal, deadline &amp; MOQ) untuk disaring lewat 5 pengecekan berlapis
                  menjadi Formula A, B &amp; C.
                </p>
              </div>

              <Button3D
                type="button"
                variant="navy"
                size="md"
                onClick={() => router.push("/formulate")}
                className="w-full rounded-xl"
              >
                <span>Start Formulation</span>
                <ArrowRight className="w-4 h-4" />
              </Button3D>
            </TiltCard>

            {/* Column 3: Service Card 2 — Ingredient Library */}
            <TiltCard className="group bg-white/95 rounded-[2rem] p-8 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08)] border border-emerald-900/10 flex flex-col justify-between">
              <div>
                <div className="tilt-depth-lg w-14 h-14 rounded-2xl bg-teal-50 border border-teal-200/80 text-[#0d9488] flex items-center justify-center mb-5 group-hover:bg-[#0d9488] group-hover:text-white transition-colors">
                  <Atom className="w-7 h-7 stroke-[1.75]" />
                </div>
                <h3 className="tilt-depth-sm text-xl font-extrabold text-slate-900 mb-2">
                  Ingredient Library
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Database bahan baku maklon: cek stok gudang, harga/gram, PT supplier,
                  spesifikasi HLB/pH, molekul 3D WebGL, serta status &amp; sertifikat Halal
                  LPPOM MUI.
                </p>
              </div>

              <Button3D
                type="button"
                variant="secondary"
                size="md"
                onClick={() => router.push("/library")}
                className="w-full rounded-xl"
              >
                <span>Open 3D Library</span>
                <ArrowRight className="w-4 h-4" />
              </Button3D>
            </TiltCard>

            {/* Column 4: Service Card 3 — AI Chemist Co-Pilot */}
            <TiltCard className="group bg-white/95 rounded-[2rem] p-8 shadow-[0_18px_45px_-15px_rgba(15,23,42,0.08)] border border-emerald-900/10 flex flex-col justify-between">
              <div>
                <div className="tilt-depth-lg w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center gap-1.5 mb-5 shadow-sm">
                  <GeminiLogo className="w-5 h-5" idSuffix="dash-service" />
                  <OpenAILogo className="w-4 h-4 text-white" />
                </div>
                <h3 className="tilt-depth-sm text-xl font-extrabold text-slate-900 mb-2">
                  AI Chemist Chat
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed mb-6">
                  Menerjemahkan bahasa marketing klien jadi spesifikasi teknis (bertanya balik
                  bila brief belum jelas), terhubung ke internet real-time, merancang trial,
                  dan menganalisis kegagalan lab.
                </p>
              </div>

              <Button3D
                type="button"
                variant="primary"
                size="md"
                onClick={() => router.push("/chat")}
                className="w-full rounded-xl"
              >
                <Sparkles className="w-4 h-4" />
                <span>Consult AI Chemist</span>
              </Button3D>
            </TiltCard>
          </div>
        </section>

        {/* SECTION 2B: 9 INTEGRATED AI MODULES */}
        <section className="bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
                FORMYLAB.AI WORKFLOW · AI FUNCTION SUMMARY
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                9 Integrated AI R&amp;D Modules
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1">
                Klik salah satu modul untuk langsung menjalankan skenario R&amp;D tersebut di AI
                Chemist Co-Pilot.
              </p>
            </div>
            <Button3D
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/chat")}
            >
              <span>Open AI Chemist Console</span>
              <ArrowRight className="w-4 h-4 text-[#0f766e]" />
            </Button3D>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f4f9f9]/85 rounded-3xl p-6 sm:p-8 border border-emerald-900/5">
            {FORMYLAB_AI_MODULES.map((mod) => (
              <SpinModuleCard
                key={mod.id}
                moduleId={mod.id}
                name={mod.name}
                fungsi={mod.fungsi}
                onClick={() => handleLaunchAiModule(mod.samplePrompt)}
              />
            ))}
          </div>
        </section>

        {/* SECTION 2C: END-TO-END WORKFLOW */}
        <section className="bg-white/95 rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="mb-8">
            <p className="text-xs font-bold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
              AI SKINCARE FORMULATION CO-PILOT WORKFLOW
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              End-to-End R&amp;D Formulation Workflow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WORKFLOW_TAHAPAN_FORMYLAB.map((stage) => (
              <div
                key={stage.tahap}
                className="p-5 rounded-3xl bg-slate-50/95 border border-slate-200/80 flex flex-col justify-between hover:border-[#14b8a6] transition"
              >
                <div>
                  <span className="inline-block text-[11px] font-mono font-extrabold uppercase tracking-wider text-white bg-[#0f766e] px-3 py-1 rounded-full mb-3">
                    {stage.tahap}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    {stage.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#0f766e] mb-2.5">
                    {stage.subtitle}
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc pl-4 mb-4">
                    {stage.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  onClick={() => router.push(stage.targetRoute)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-emerald-50 hover:bg-[#0f766e] text-[#12382f] hover:text-white text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>{stage.routeLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
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
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer whitespace-nowrap min-h-[36px] ${
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

            {/* Right 5 Cols: Live Scientific & Compatibility Readout inside TiltCard */}
            <TiltCard className="lg:col-span-5 bg-slate-50/90 rounded-2xl p-6 border border-slate-200/80 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs font-mono text-slate-500">
                      CAS {activeProfile.casNumber} · {activeProfile.molecularWeight}
                    </p>
                    <h3 className="tilt-depth-lg text-xl font-extrabold text-slate-900 mt-0.5">
                      {activeProfile.inciName}
                    </h3>
                  </div>
                  <div className="tilt-depth-sm text-right shrink-0">
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

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-slate-200">
                <Button3D
                  type="button"
                  variant="navy"
                  size="sm"
                  onClick={() => router.push("/library")}
                  className="flex-1 rounded-xl"
                >
                  <span>Inspect All 43+ Ingredients</span>
                </Button3D>
                <Button3D
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    localStorage.setItem("preselectedIngredient", selectedMolecule);
                    router.push("/formulate");
                  }}
                  className="rounded-xl"
                >
                  <span>Use in Formulator</span>
                </Button3D>
              </div>
            </TiltCard>
          </div>
        </section>

        {/* SECTION 4: 12 VALIDATED PRODUCT SYSTEMS MATRIX (3D TiltCards) */}
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
            <Button3D
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/formulate")}
            >
              <span>Open Full Formulator</span>
              <ArrowRight className="w-4 h-4 text-[#0f766e]" />
            </Button3D>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {VALIDATED_PRODUCT_TYPES.map((spec, idx) => (
              <TiltCard
                key={spec.id}
                className="group bg-slate-50/85 hover:bg-white rounded-2xl p-5 border border-slate-200/80 hover:border-[#14b8a6] transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-slate-500 font-mono mb-2">
                    <span>{String(idx + 1).padStart(2, "0")}. {spec.systemType}</span>
                    <span className="text-[#0f766e] font-bold">pH {spec.targetPh}</span>
                  </div>
                  <h3 className="tilt-depth-sm text-base font-extrabold text-slate-900 mb-1.5">
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
                  <Button3D
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => handleQuickLaunchProductType(spec.name)}
                    className="w-full rounded-xl"
                  >
                    <span>Formulate {spec.shortName}</span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#0f766e]" />
                  </Button3D>
                </div>
              </TiltCard>
            ))}
          </div>
        </section>

        {/* SECTION 5: SAVED FORMULATIONS PERSISTENCE HISTORY */}
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
            <Button3D
              type="button"
              variant="navy"
              size="sm"
              onClick={() => router.push("/formulate")}
              className="self-start sm:self-auto"
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Create New Study</span>
            </Button3D>
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
                  <TiltCard
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

                      <h3 className="tilt-depth-sm text-lg font-extrabold text-slate-900 mb-1">
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
                      <Button3D
                        type="button"
                        variant="navy"
                        size="sm"
                        onClick={() => handleOpenSavedRecord(rec)}
                        className="rounded-xl"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>Open Study &amp; PDF/CSV Report</span>
                      </Button3D>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id)}
                        aria-label={`Delete saved formulation ${rec.id}`}
                        className="p-2.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TiltCard>
                );
              })}
            </div>
          )}
        </section>

        {/* Quiet Editorial Footer with 360° SpinLogo */}
        <footer className="pt-4 text-center text-xs text-slate-600 font-medium flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-emerald-900/10">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span>· Cosmetic R&amp;D Formulation &amp; 3D Molecular Intelligence</span>
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