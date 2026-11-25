"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Atom,
  MessageSquare,
  ArrowRight,
  ShieldCheck,
  FileSpreadsheet,
  Trash2,
  ExternalLink,
  AlertCircle,
  RefreshCw,
  Layers,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import AmbientBioluminescence from "../../components/AmbientBioluminescence";
import Molecule3DViewer from "../../components/Molecule3DViewer";
import Button3D from "../../components/ui3d/Button3D";
import {
  VALIDATED_PRODUCT_TYPES,
  getIngredientProfile,
} from "../../lib/cosmeticChemistryData";
import {
  FORMYLAB_AI_MODULES,
  WORKFLOW_TAHAPAN_FORMYLAB,
} from "../../lib/interactiveAiEngine";
import {
  ACTIVE_USER_STORAGE_KEY,
  AUTH_CHANGE_EVENT,
  getActiveUserAccount,
} from "../../lib/auth";
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
  const [activeUserEmail, setActiveUserEmail] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [savedState, setSavedState] = useState<{
    scope: string | null;
    records: SavedFormulationRecord[];
    error: string | null;
    loadedRefreshKey: number;
  }>({
    scope: null,
    records: [],
    error: null,
    loadedRefreshKey: -1,
  });
  const [recordsRefreshKey, setRecordsRefreshKey] = useState(0);

  const loadSavedRecords = useCallback(() => {
    setRecordsRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    const syncActiveUser = () => {
      const nextEmail = getActiveUserAccount()?.email ?? null;
      setActiveUserEmail(nextEmail);
      setAuthResolved(true);
    };

    const rafId = window.requestAnimationFrame(syncActiveUser);

    const handleStorage = (event: StorageEvent) => {
      if (event.key === null || event.key === ACTIVE_USER_STORAGE_KEY) {
        syncActiveUser();
      }
    };

    window.addEventListener(AUTH_CHANGE_EVENT, syncActiveUser);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener(AUTH_CHANGE_EVENT, syncActiveUser);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  useEffect(() => {
    if (!authResolved || !activeUserEmail) return;

    let active = true;
    fetchSavedFormulations(activeUserEmail)
      .then((records) => {
        if (!active) return;
        setSavedState({
          scope: activeUserEmail,
          records,
          error: null,
          loadedRefreshKey: recordsRefreshKey,
        });
      })
      .catch(() => {
        if (!active) return;
        const local = loadLocalFormulations(activeUserEmail);
        setSavedState({
          scope: activeUserEmail,
          records: local,
          error:
            "Unable to load formulation history from the server. Check your connection and try again.",
          loadedRefreshKey: recordsRefreshKey,
        });
      });

    return () => {
      active = false;
    };
  }, [authResolved, activeUserEmail, recordsRefreshKey]);

  const savedRecords =
    activeUserEmail && savedState.scope === activeUserEmail ? savedState.records : [];
  const recordsError =
    activeUserEmail && savedState.scope === activeUserEmail ? savedState.error : null;
  const isLoadingRecords =
    !authResolved ||
    (Boolean(activeUserEmail) &&
      (savedState.scope !== activeUserEmail ||
        savedState.loadedRefreshKey !== recordsRefreshKey));

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
    try {
      const updated = await deleteSavedFormulation(id, activeUserEmail);
      setSavedState({
        scope: activeUserEmail,
        records: updated,
        error: null,
        loadedRefreshKey: recordsRefreshKey,
      });
    } catch {
      setSavedState((prev) => ({
        ...prev,
        scope: activeUserEmail,
        error: "Unable to delete formulation record. Please try again.",
      }));
    }
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
    <div className="min-h-screen relative font-sans bg-[#f8fdfb] text-[#0B2B26] pb-24 overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:inline-flex focus:items-center focus:min-h-[44px] focus:px-4 focus:py-2 focus:rounded-full focus:bg-[#0B2B26] focus:text-white focus:text-xs focus:font-medium focus:tracking-[0.04em] focus:outline-none focus:ring-2 focus:ring-[#0E807E] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Top Sticky Clean Frosted White Navbar */}
      <WorkspaceNavbar />

      <main id="main-content" className="relative z-10">
        {/* SECTION 1: OPEN WORKSPACE HERO ON #ffffff + SUBTLE AMBIENT BIOLUMINESCENCE */}
        <section
          aria-labelledby="workspace-hero-heading"
          className="relative overflow-hidden bg-[#ffffff] border-b border-[#0B2B26]/10"
        >
          {/* Restrained atmospheric glow focused softly behind optical glass, leaving left typography airy */}
          <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-50">
            <AmbientBioluminescence variant="hero" />
          </div>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-white/90 via-white/45 to-transparent"
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-12 sm:pt-12 sm:pb-14">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Zone (7 cols): Concise Operational Heading & Horizontal CTAs */}
              <div className="lg:col-span-7">
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-3">
                  R&amp;D FORMULATION WORKSPACE · FORMYLAB.AI
                </p>

                <h1
                  id="workspace-hero-heading"
                  className="text-3xl sm:text-5xl font-medium text-[#0B2B26] leading-[1.08] tracking-[-0.035em] mb-4"
                  style={{ textWrap: "balance" }}
                >
                  Accelerate cosmetic formulation with 5-gate screening.
                </h1>

                <p className="text-sm sm:text-[15px] text-[#2E524C] leading-relaxed max-w-2xl mb-7">
                  Terjemahkan brief klien brand menjadi spesifikasi teknis dan kandidat{" "}
                  <strong className="font-medium text-[#0B2B26]">Formula A, B &amp; C</strong>{" "}
                  yang tersaring otomatis terhadap regulasi BPOM, kompatibilitas pH, status Halal,
                  stok gudang, dan target HPP. Kelola bahan baku 3D, rencana trial lab, serta
                  dokumentasi produksi dari satu ruang kerja R&amp;D.
                </p>

                <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
                  <Button3D
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={() => router.push("/formulate")}
                    className="min-h-[44px]"
                  >
                    <span>Input Brief &amp; Formulate</span>
                    <ArrowRight aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  </Button3D>

                  <Button3D
                    type="button"
                    variant="secondary"
                    size="md"
                    onClick={() => router.push("/library")}
                    className="min-h-[44px]"
                  >
                    <Atom aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                    <span>Ingredient Library</span>
                  </Button3D>
                </div>
              </div>

              {/* Right Zone (5 cols): Clinical Optical-Glass Product Overview Panel */}
              <div className="lg:col-span-5">
                <aside
                  aria-label="About Formylab.ai"
                  className="card-glass-optical card-glass-static p-5 sm:p-6 text-[#0B2B26]"
                >
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] mb-2">
                    ABOUT FORMYLAB.AI
                  </p>

                  <p className="text-[13.5px] text-[#2E524C] leading-[1.55] mb-4">
                    AI R&amp;D Co-Pilot khusus untuk tim formulator dan maklon kosmetik yang
                    mempercepat riset dari brief klien hingga dokumen siap trial lab.
                  </p>

                  <ul className="divide-y divide-[#0B2B26]/10 border-t border-[#0B2B26]/10">
                    <li className="py-3 flex items-start gap-3">
                      <ShieldCheck
                        aria-hidden="true"
                        className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-[#0B2B26] leading-snug">
                          5-Gate Automated Screening
                        </p>
                        <p className="text-[12.5px] text-[#2E524C] leading-[1.5] mt-0.5">
                          Validasi otomatis terhadap regulasi BPOM, status Halal, kompatibilitas
                          pH, stok gudang, dan target HPP.
                        </p>
                      </div>
                    </li>

                    <li className="py-3 flex items-start gap-3">
                      <Layers
                        aria-hidden="true"
                        className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-[#0B2B26] leading-snug">
                          3-Tier Formula Candidates
                        </p>
                        <p className="text-[12.5px] text-[#2E524C] leading-[1.5] mt-0.5">
                          Menghasilkan opsi Formula A (Ideal), Formula B (Hemat/Halal), dan
                          Formula C (Stok Tersedia) secara instan.
                        </p>
                      </div>
                    </li>

                    <li className="pt-3 pb-0 flex items-start gap-3">
                      <FlaskConical
                        aria-hidden="true"
                        className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5"
                      />
                      <div className="min-w-0">
                        <p className="text-[13.5px] font-medium text-[#0B2B26] leading-snug">
                          Lab-Ready &amp; Integrated
                        </p>
                        <p className="text-[12.5px] text-[#2E524C] leading-[1.5] mt-0.5">
                          Dilengkapi database bahan baku 3D, AI Chemist Co-Pilot, serta ekspor
                          dokumen langsung ke Google Docs.
                        </p>
                      </div>
                    </li>
                  </ul>
                </aside>
              </div>
            </div>
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 space-y-14">
        {/* SECTION 2: CORE R&D WORKBENCHES (Asymmetric Editorial Split on Crisp #ffffff) */}
        <section
          aria-labelledby="services-heading"
          className="bg-white rounded-[16px] p-6 sm:p-10 border border-[#0B2B26]/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
            {/* Left Intro Column */}
            <div className="lg:col-span-4 flex flex-col justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-2">
                  CORE R&amp;D WORKFLOW
                </p>
                <h2
                  id="services-heading"
                  className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] leading-[1.15] text-[#0B2B26] mb-3"
                >
                  Core R&amp;D Workbenches
                </h2>
                <p className="text-sm text-[#2E524C] leading-relaxed">
                  Tiga ruang kerja terintegrasi bagi tim R&amp;D maklon untuk mengubah brief klien
                  menjadi Formula A (Ideal), Formula B (Hemat/Halal), dan Formula C (Stok Tersedia).
                </p>
              </div>

              <div className="pt-5 mt-6 border-t border-[#0B2B26]/10 flex items-center gap-2 text-xs font-medium text-[#2E524C]">
                <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#0E807E] shrink-0" />
                <span>End-to-End Integrated Pipeline</span>
              </div>
            </div>

            {/* Right Clean Hairline Workbench Rows */}
            <div className="lg:col-span-8 divide-y divide-[#0B2B26]/10 border-t lg:border-t-0 lg:border-l border-[#0B2B26]/10 lg:pl-8">
              <div className="py-5 first:pt-0 lg:first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <span className="text-sm font-mono tabular-nums font-medium text-[#0E807E] pt-0.5 shrink-0">
                    01
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E] shrink-0" />
                      <h3 className="text-base sm:text-lg font-medium text-[#0B2B26] tracking-[-0.015em]">
                        New Formulation
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#2E524C] leading-relaxed">
                      Masukkan brief klien (jenis sediaan, klaim, target kulit/tekstur, target HPP,
                      wajib halal, deadline &amp; MOQ) untuk disaring lewat 5 pengecekan berlapis.
                    </p>
                  </div>
                </div>
                <Button3D
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => router.push("/formulate")}
                  className="min-h-[44px] shrink-0 self-start sm:self-center"
                >
                  <span>Start Formulation</span>
                </Button3D>
              </div>

              <div className="py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <span className="text-sm font-mono tabular-nums font-medium text-[#0E807E] pt-0.5 shrink-0">
                    02
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Atom aria-hidden="true" className="w-4 h-4 text-[#0E807E] shrink-0" />
                      <h3 className="text-base sm:text-lg font-medium text-[#0B2B26] tracking-[-0.015em]">
                        Ingredient Library
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#2E524C] leading-relaxed">
                      Database bahan baku maklon: cek stok gudang, harga/gram, PT supplier,
                      spesifikasi HLB/pH, molekul 3D WebGL, serta status &amp; sertifikat Halal.
                    </p>
                  </div>
                </div>
                <Button3D
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/library")}
                  className="min-h-[44px] shrink-0 self-start sm:self-center"
                >
                  <span>Open 3D Library</span>
                </Button3D>
              </div>

              <div className="py-5 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start gap-4 min-w-0">
                  <span className="text-sm font-mono tabular-nums font-medium text-[#0E807E] pt-0.5 shrink-0">
                    03
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageSquare aria-hidden="true" className="w-4 h-4 text-[#0E807E] shrink-0" />
                      <h3 className="text-base sm:text-lg font-medium text-[#0B2B26] tracking-[-0.015em]">
                        AI Chemist Chat
                      </h3>
                    </div>
                    <p className="text-xs sm:text-sm text-[#2E524C] leading-relaxed">
                      Menerjemahkan bahasa marketing klien jadi spesifikasi teknis, merancang trial
                      lab, dan menganalisis kegagalan emulsi atau stabilitas.
                    </p>
                  </div>
                </div>
                <Button3D
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/chat")}
                  className="min-h-[44px] shrink-0 self-start sm:self-center"
                >
                  <span>Consult AI Chemist</span>
                </Button3D>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2B: 9 INTEGRATED AI MODULES (Clean Hairline Editorial Directory on Crisp #ffffff) */}
        <section
          aria-labelledby="ai-modules-heading"
          className="bg-white rounded-[16px] p-6 sm:p-10 border border-[#0B2B26]/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-2">
                FORMYLAB.AI WORKFLOW · AI FUNCTION SUMMARY
              </p>
              <h2
                id="ai-modules-heading"
                className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-[#0B2B26]"
              >
                9 Integrated AI R&amp;D Modules
              </h2>
              <p className="text-xs sm:text-sm text-[#2E524C] mt-1">
                Pilih modul untuk langsung menjalankan skenario R&amp;D tersebut di AI Chemist
                Co-Pilot.
              </p>
            </div>
            <Button3D
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/chat")}
              className="min-h-[44px] self-start sm:self-auto"
            >
              <span>Open AI Chemist Console</span>
            </Button3D>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 border-t border-l border-[#0B2B26]/10">
            {FORMYLAB_AI_MODULES.map((mod, idx) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => handleLaunchAiModule(mod.samplePrompt)}
                aria-label={`Jalankan modul ${String(idx + 1).padStart(2, "0")}: ${mod.name}`}
                className="group min-h-[44px] p-5 border-r border-b border-[#0B2B26]/10 bg-white hover:bg-[#f8fdfb] text-left flex flex-col justify-between gap-3 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E807E]"
              >
                <div>
                  <span className="block text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.12em] text-[#0E807E] mb-1.5">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <h3 className="text-[15px] font-medium text-[#0B2B26] tracking-[-0.015em] group-hover:text-[#0E807E] transition-colors mb-1">
                    {mod.name}
                  </h3>
                  <p className="text-xs text-[#2E524C] leading-relaxed">
                    {mod.fungsi.replace(/\s*—\s*/g, ", ")}
                  </p>
                </div>
                <span className="text-[11px] font-medium text-[#2E524C] group-hover:text-[#0B2B26] transition-colors">
                  Launch in AI Chemist
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* SECTION 2C: END-TO-END WORKFLOW (Editorial Indexed List on Crisp #ffffff) */}
        <section
          aria-labelledby="workflow-steps-heading"
          className="bg-white rounded-[16px] p-6 sm:p-10 border border-[#0B2B26]/10"
        >
          <div className="mb-6 sm:mb-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-2">
              AI SKINCARE FORMULATION CO-PILOT WORKFLOW
            </p>
            <h2
              id="workflow-steps-heading"
              className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-[#0B2B26]"
            >
              End-to-End R&amp;D Formulation Workflow
            </h2>
          </div>

          <ol className="divide-y divide-[#0B2B26]/10 border-t border-[#0B2B26]/10">
            {WORKFLOW_TAHAPAN_FORMYLAB.map((stage, idx) => (
              <li
                key={stage.tahap}
                className="py-6 first:pt-6 last:pb-1 grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start"
              >
                {/* Index Zone (Single Numbering, Zero Redundancy) */}
                <div className="lg:col-span-2 flex items-baseline lg:flex-col gap-2 lg:gap-0.5">
                  <span className="text-2xl sm:text-[28px] font-mono tabular-nums font-medium leading-none text-[#0E807E]">
                    {String(idx + 1).padStart(2, "0")}
                  </span>
                  <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2E524C]">
                    Step
                  </span>
                </div>

                {/* Content Zone */}
                <div className="lg:col-span-7 min-w-0">
                  <h3 className="text-base sm:text-[17px] font-medium text-[#0B2B26] tracking-[-0.015em] mb-1">
                    {stage.title.replace(/\s*—\s*/g, ": ")}
                  </h3>
                  <p className="text-xs sm:text-[13px] font-medium text-[#2E524C] mb-2.5">
                    {stage.subtitle.replace(/\s*—\s*/g, ", ")}
                  </p>
                  <ul className="space-y-1.5 text-xs sm:text-[13px] text-[#2E524C] leading-relaxed list-disc pl-4">
                    {stage.bullets.map((b, i) => (
                      <li key={i}>{b.replace(/\s*—\s*/g, ", ")}</li>
                    ))}
                  </ul>
                </div>

                {/* Contextual Action Zone (Compact Auto-Width, No Repeating Arrow) */}
                <div className="lg:col-span-3 flex lg:justify-end items-start pt-1 lg:pt-0">
                  <button
                    type="button"
                    onClick={() => router.push(stage.targetRoute)}
                    className="btn-glass-secondary inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-xs font-medium text-[#0B2B26] cursor-pointer whitespace-nowrap"
                  >
                    {stage.routeLabel}
                  </button>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* SECTION 3: LIVE 3D WEBGL MOLECULAR STUDIO & INGREDIENT INSPECTOR */}
        <section
          aria-labelledby="molecule-studio-heading"
          className="bg-white rounded-[16px] p-6 sm:p-10 border border-[#0B2B26]/10"
        >
          <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-5 mb-8">
            <div className="min-w-0">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-2">
                INTERACTIVE 3D WEBGL MOLECULAR VIEWPORT
              </p>
              <h2
                id="molecule-studio-heading"
                className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-[#0B2B26]"
              >
                Inspect Active &amp; Base Molecules in 3D Space
              </h2>
            </div>

            {/* Interactive Selector Grid (Symmetrical 4x2 Desktop / 2x4 Mobile, Zero Outer Capsule) */}
            <div
              role="group"
              aria-label="Select 3D molecule"
              className="grid grid-cols-2 sm:grid-cols-4 gap-2 w-full xl:w-auto shrink-0"
            >
              {FEATURED_3D_MOLECULES.map((molName) => {
                const isSelected = selectedMolecule === molName;
                return (
                  <button
                    key={molName}
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedMolecule(molName)}
                    className={`w-full px-3.5 py-2 text-xs font-medium cursor-pointer whitespace-nowrap min-h-[44px] inline-flex items-center justify-center ${
                      isSelected ? "btn-glass-primary" : "btn-glass-compact"
                    }`}
                  >
                    <span>{molName}</span>
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
            <div className="lg:col-span-5 bg-[#f8fdfb] rounded-[16px] p-6 border border-[#0B2B26]/10 flex flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-xs font-mono tabular-nums text-[#2E524C]">
                      CAS {activeProfile.casNumber} · {activeProfile.molecularWeight}
                    </p>
                    <h3 className="text-xl font-medium text-[#0B2B26] mt-0.5">
                      {activeProfile.inciName}
                    </h3>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[#2E524C] block">
                      Compatibility
                    </span>
                    <span className="text-2xl font-mono font-medium text-[#0E807E] tabular-nums">
                      {activeProfile.compatibilityScore}%
                    </span>
                  </div>
                </div>

                <p className="text-xs text-[#2E524C] leading-relaxed mb-5">
                  {activeProfile.mechanismOfAction.replace(/\s*—\s*/g, ", ")}
                </p>

                <div className="grid grid-cols-2 gap-3 mb-5">
                  <div className="bg-white p-3.5 rounded-[12px] border border-[#0B2B26]/10">
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[#2E524C] block">
                      Optimal pH Window
                    </span>
                    <span className="text-sm font-mono font-medium text-[#0B2B26] tabular-nums">
                      {activeProfile.optimalPhRange}
                    </span>
                  </div>
                  <div className="bg-white p-3.5 rounded-[12px] border border-[#0B2B26]/10">
                    <span className="text-[11px] uppercase tracking-[0.06em] text-[#2E524C] block">
                      Recommended Dosage
                    </span>
                    <span className="text-sm font-mono font-medium text-[#0B2B26] tabular-nums">
                      {activeProfile.typicalUsageRate}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-[#2E524C] mb-6">
                  <div>
                    <span className="font-medium text-[#0B2B26]">Synergistic With: </span>
                    <span>{activeProfile.synergisticWith.join(" · ")}</span>
                  </div>
                  <div>
                    <span className="font-medium text-[#0B2B26]">Certifications: </span>
                    <span className="text-[#2E524C] font-medium">
                      {activeProfile.certifications.join(" · ")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#0B2B26]/10">
                <Button3D
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push("/library")}
                  className="flex-1 min-h-[44px]"
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
                  className="min-h-[44px]"
                >
                  <span>Use in Formulator</span>
                </Button3D>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: 12 VALIDATED PRODUCT SYSTEMS MATRIX (Crisp Hairline Spec Ledger) */}
        <section
          aria-labelledby="product-types-heading"
          className="bg-white rounded-[16px] p-6 sm:p-10 border border-[#0B2B26]/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6 sm:mb-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-2">
                VALIDATED COSMETIC BENCH STANDARDS
              </p>
              <h2
                id="product-types-heading"
                className="text-2xl sm:text-3xl font-medium tracking-[-0.03em] text-[#0B2B26]"
              >
                12 Calibrated Product Types (Target pH &amp; Viscosity)
              </h2>
            </div>
            <Button3D
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => router.push("/formulate")}
              className="min-h-[44px] self-start sm:self-auto"
            >
              <span>Open Full Formulator</span>
            </Button3D>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 border-t border-l border-[#0B2B26]/10">
            {VALIDATED_PRODUCT_TYPES.map((spec, idx) => (
              <article
                key={spec.id}
                className="p-5 sm:p-6 bg-white hover:bg-[#f8fdfb] border-r border-b border-[#0B2B26]/10 transition-colors flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 text-xs text-[#2E524C] font-mono tabular-nums mb-2">
                    <span className="font-medium text-[#2E524C]">
                      <span className="text-[#0E807E]">{String(idx + 1).padStart(2, "0")}</span> ·{" "}
                      {spec.systemType}
                    </span>
                    <span className="text-[#0B2B26] font-medium">pH {spec.targetPh}</span>
                  </div>
                  <h3 className="text-base font-medium text-[#0B2B26] mb-1.5">
                    {spec.name}
                  </h3>
                  <p className="text-xs text-[#2E524C] line-clamp-2 leading-relaxed">
                    {spec.scientificBasis.replace(/\s*—\s*/g, ", ")}
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#0B2B26]/10">
                  <div className="text-xs font-mono text-[#2E524C] tabular-nums">
                    <span>Visc {spec.targetViscosity}</span>
                    <span aria-hidden="true" className="mx-1.5">·</span>
                    <span className="text-[#0B2B26] font-medium">
                      {spec.recommendedActives.length} Actives
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleQuickLaunchProductType(spec.name)}
                    className="btn-glass-secondary inline-flex items-center justify-center min-h-[44px] px-4 py-2 text-xs font-medium text-[#0B2B26] cursor-pointer whitespace-nowrap"
                  >
                    Formulate {spec.shortName}
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* SECTION 5: SAVED FORMULATIONS PERSISTENCE HISTORY (Complete Loading / Error / Empty / Data States) */}
        <section
          aria-labelledby="saved-runs-heading"
          className="bg-white rounded-[16px] p-6 sm:p-10 border border-[#0B2B26]/10"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-1.5">
                PERSISTENT R&amp;D REPOSITORY
              </p>
              <h2
                id="saved-runs-heading"
                className="text-2xl font-medium tracking-[-0.03em] text-[#0B2B26] tabular-nums"
              >
                Saved Formulation Runs ({savedRecords.length})
              </h2>
            </div>
            <Button3D
              type="button"
              variant="primary"
              size="sm"
              onClick={() => router.push("/formulate")}
              className="min-h-[44px] self-start sm:self-auto"
            >
              <FlaskConical aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
              <span>Create New Study</span>
            </Button3D>
          </div>

          {recordsError && (
            <div
              role="alert"
              className="mb-5 p-4 rounded-[12px] bg-[#fef2f2] border border-[#b91c1c]/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5 text-xs text-[#b91c1c]">
                <AlertCircle aria-hidden="true" className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{recordsError}</span>
              </div>
              <button
                type="button"
                onClick={loadSavedRecords}
                className="btn-glass-secondary inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 text-xs font-medium text-[#0B2B26] cursor-pointer shrink-0 self-start sm:self-auto"
              >
                <RefreshCw aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {isLoadingRecords && savedRecords.length === 0 ? (
            <div
              role="status"
              aria-live="polite"
              className="text-center py-12 bg-[#f8fdfb] rounded-[16px] border border-[#0B2B26]/10"
            >
              <div
                aria-hidden="true"
                className="w-6 h-6 border-2 border-[#0E807E] border-t-transparent rounded-full animate-spin mx-auto mb-3"
              />
              <p className="text-sm font-medium text-[#0B2B26]">
                Loading saved formulation runs...
              </p>
              <p className="text-xs text-[#2E524C] mt-1">
                Syncing R&amp;D study records from local storage and server.
              </p>
            </div>
          ) : savedRecords.length === 0 ? (
            <div className="text-center py-12 bg-[#f8fdfb] rounded-[16px] border border-[#0B2B26]/10 px-6">
              <FileSpreadsheet
                aria-hidden="true"
                className="w-8 h-8 text-[#0E807E] mx-auto mb-3 stroke-[1.75]"
              />
              <p className="text-sm text-[#2E524C] max-w-md mx-auto mb-5 leading-relaxed">
                Belum ada formulasi tersimpan. Mulai riset pertama Anda sekarang.
              </p>
              <Button3D
                type="button"
                variant="primary"
                size="sm"
                onClick={() => router.push("/formulate")}
                className="min-h-[44px] mx-auto"
              >
                <FlaskConical aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                <span>CREATE NEW STUDY</span>
              </Button3D>
            </div>
          ) : (
            <div className="divide-y divide-[#0B2B26]/10 border-t border-b border-[#0B2B26]/10">
              {savedRecords.map((rec) => {
                const topCandidate = rec.candidates?.[0];
                return (
                  <article
                    key={rec.id}
                    className="py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-mono tabular-nums text-[#2E524C] mb-1.5">
                        <span className="font-medium text-[#0E807E]">{rec.id}</span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {new Date(rec.createdAt).toLocaleDateString("en-GB", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      </div>

                      <h3 className="text-base sm:text-lg font-medium text-[#0B2B26] mb-1">
                        {rec.productType}
                      </h3>

                      <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#2E524C] mb-2 tabular-nums">
                        <span>Target: {rec.skinTarget}</span>
                        <span aria-hidden="true">·</span>
                        <span>pH {rec.targetPh}</span>
                        <span aria-hidden="true">·</span>
                        <span>{rec.targetViscosity}</span>
                        <span aria-hidden="true">·</span>
                        <span>Batch {rec.batchSize}g</span>
                      </div>

                      {topCandidate && (
                        <p className="text-xs text-[#2E524C] line-clamp-1">
                          {topCandidate.ingredients
                            .slice(0, 5)
                            .map((i) => `${i.name} (${i.conc})`)
                            .join(" · ")}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <Button3D
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() => handleOpenSavedRecord(rec)}
                        className="min-h-[44px]"
                      >
                        <ExternalLink aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                        <span>Open Study &amp; PDF/CSV Report</span>
                      </Button3D>

                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(rec.id)}
                        aria-label={`Delete saved formulation ${rec.id}`}
                        className="btn-glass-danger cursor-pointer min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                      >
                        <Trash2 aria-hidden="true" className="w-4 h-4" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

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