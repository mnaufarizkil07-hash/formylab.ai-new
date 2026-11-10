"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FileSpreadsheet,
  Printer,
  Share2,
  Atom,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Building2,
  FlaskConical,
  Copy,
  Check,
  X,
  ArrowLeft,
  BookOpen,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import LivingLabBackground from "../../components/LivingLabBackground";
import Molecule3DViewer from "../../components/Molecule3DViewer";
import { getIngredientProfile, getProductTypeSpec } from "../../lib/cosmeticChemistryData";

interface Ingredient {
  name: string;
  category: string;
  conc: string;
  riskLevel: string;
  riskNote: string;
  supplier: string;
  supplierLocation?: string;
  halalBody?: string;
  leadTimeDays?: number;
  isHalal: boolean;
  compatibilityScore?: number;
  casNumber?: string;
  molecularFormula?: string;
  functionalCategory?: string;
  hlbValue?: string;
  optimalPhRange?: string;
}

interface Candidate {
  id: string;
  title: string;
  badge: string;
  productType?: string;
  systemType?: string;
  requiredHlb?: string;
  referenceSource?: string;
  evidenceDoi?: string;
  processingNotes?: string;
  viscosity: string;
  ph: string;
  estCost: string;
  overallRisk: string;
  riskSummaryText: string;
  observationText: string;
  ingredients: Ingredient[];
}

interface FormData {
  productType: string;
  skinTarget: string;
  targetPh: string;
  targetViscosity: string;
  batchSize?: string;
  customIngredients: string[];
  viewCost: boolean;
}

export default function ResultPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [inspectedIngredient, setInspectedIngredient] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const savedForm = localStorage.getItem("currentFormulation");
      const savedCandidates = localStorage.getItem("aiGeneratedCandidates");

      if (savedForm && savedCandidates) {
        try {
          setFormData(JSON.parse(savedForm));
          setCandidates(JSON.parse(savedCandidates));
          return;
        } catch {
          // fallback below
        }
      }

      fetch("/api/formulations")
        .then((r) => r.json())
        .then((d) => {
          if (d.success && Array.isArray(d.records) && d.records[0]) {
            const latest = d.records[0];
            setFormData({
              productType: latest.productType,
              skinTarget: latest.skinTarget,
              targetPh: latest.targetPh,
              targetViscosity: latest.targetViscosity,
              batchSize: latest.batchSize,
              customIngredients: latest.customIngredients || [],
              viewCost: true,
            });
            setCandidates(latest.candidates || []);
          }
        })
        .catch(() => {});
    });
  }, []);

  if (!formData) {
    return (
      <div className="min-h-screen relative flex items-center justify-center font-sans text-slate-800">
        <LivingLabBackground variant="mint" />
        <div className="relative z-10 bg-white/95 p-10 rounded-3xl shadow-lg border border-emerald-900/10 text-center">
          <FlaskConical className="w-10 h-10 text-[#0f766e] animate-pulse mx-auto mb-3" />
          <p className="text-lg font-extrabold text-slate-900">
            Loading AI Formulation Study &amp; 3D Molecular Data...
          </p>
        </div>
      </div>
    );
  }

  const batchGrams = parseFloat(formData.batchSize || "100") || 100;
  const spec = getProductTypeSpec(formData.productType);

  // Feature B1: Export CSV Study Report
  const handleExportCSV = () => {
    const rows: string[][] = [
      [
        "Candidate",
        "Product Type",
        "Target Skin",
        "Batch Size (g)",
        "Calibrated pH",
        "Viscosity (cP)",
        "Estimated BOM Cost",
        "Ingredient Name",
        "INCI Name",
        "CAS Number",
        "Formula",
        "Category",
        "Concentration (% w/w)",
        "Weight in Batch (g)",
        "Compatibility Score (%)",
        "Supplier PT",
        "Halal Certification",
        "Safety Note",
      ],
    ];

    candidates.forEach((cand) => {
      cand.ingredients.forEach((ing) => {
        const prof = getIngredientProfile(ing.name);
        const concVal = parseFloat(ing.conc) || 0;
        const grams = ((concVal / 100) * batchGrams).toFixed(2);
        rows.push([
          cand.title,
          formData.productType,
          formData.skinTarget,
          String(batchGrams),
          cand.ph,
          cand.viscosity,
          cand.estCost,
          ing.name,
          prof.inciName,
          ing.casNumber || prof.casNumber,
          ing.molecularFormula || prof.molecularFormula,
          ing.category,
          ing.conc,
          grams,
          String(ing.compatibilityScore || prof.compatibilityScore),
          ing.supplier,
          ing.isHalal ? ing.halalBody || "Halal Certified (LPPOM MUI / IFANCA)" : "CoA Standard",
          ing.riskNote,
        ]);
      });
    });

    const csvContent = rows
      .map((r) => r.map((cell) => `"${String(cell || "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const slug = formData.productType.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    a.href = url;
    a.download = `formylab_study_${slug}_${batchGrams}g.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Feature B2: Print / Save PDF Study Report
  const handlePrintStudyReport = () => {
    window.print();
  };

  // Feature B3: Shareable Study Summary Text
  const buildShareableSummary = () => {
    const top = candidates[0];
    const ingLines = top
      ? top.ingredients
          .map((i) => {
            const g = (((parseFloat(i.conc) || 0) / 100) * batchGrams).toFixed(2);
            return `- ${i.name}: ${i.conc} (${g}g) | Supplier: ${i.supplier} (${
              i.isHalal ? "Halal Verified" : "CoA"
            })`;
          })
          .join("\n")
      : "";

    return [
      `FORMYLAB.AI — R&D COSMETIC FORMULATION STUDY REPORT`,
      `Product System: ${formData.productType} (${spec.systemType})`,
      `Primary Skin Target: ${formData.skinTarget}`,
      `Batch Size: ${batchGrams} g | Target pH: ${formData.targetPh} | Target Viscosity: ${formData.targetViscosity}`,
      `Scientific Reference: ${spec.referenceSource} (${spec.evidenceDoi})`,
      top
        ? `\nSelected Lead Formula (${top.title} — ${top.badge}):\nCalibrated pH: ${top.ph} | Viscosity: ${top.viscosity} | Est. BOM: ${top.estCost}\n\nComposition Breakdown:\n${ingLines}`
        : "",
    ].join("\n");
  };

  const handleCopyShareReport = async () => {
    try {
      await navigator.clipboard.writeText(buildShareableSummary());
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // ignore
    }
  };

  const inspectedProf = inspectedIngredient ? getIngredientProfile(inspectedIngredient) : null;

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24">
      <LivingLabBackground variant="mint" />

      <div className="print:hidden">
        <WorkspaceNavbar backHref="/formulate" backLabel="Back to Formulator" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4">
        {/* Top Action & Study Report Toolbar */}
        <div className="bg-white/95 backdrop-blur-md rounded-[2rem] p-6 sm:p-8 shadow-[0_20px_50px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#0f766e] font-bold mb-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>SAVED TO PERSISTENT R&amp;D REPOSITORY</span>
                <span aria-hidden="true">·</span>
                <span>{spec.systemType}</span>
                <span aria-hidden="true">·</span>
                <span>Batch: {batchGrams}g</span>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                {formData.productType} — Formulation Study Report
              </h1>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 mt-2">
                <span>
                  Skin Target: <strong className="text-slate-900">{formData.skinTarget}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Target pH: <strong className="text-slate-900">{formData.targetPh}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span className="font-mono tabular-nums">
                  Target Viscosity:{" "}
                  <strong className="text-slate-900">{formData.targetViscosity}</strong>
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  Ref: <strong className="text-[#0f766e]">{spec.referenceSource}</strong>
                </span>
              </div>
            </div>

            {/* Study Report Export & Share Actions (Feature B) */}
            <div className="flex flex-wrap items-center gap-2.5 print:hidden shrink-0">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-[#12382f] hover:bg-[#0f766e] text-white text-xs font-bold transition flex items-center gap-2 cursor-pointer shadow-xs whitespace-nowrap"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Export CSV BOM</span>
              </button>

              <button
                type="button"
                onClick={handlePrintStudyReport}
                className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-[#12382f] border border-emerald-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Printer className="w-4 h-4 text-[#0f766e]" />
                <span>Print / Save PDF Report</span>
              </button>

              <button
                type="button"
                onClick={() => setShareModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 text-xs font-bold transition flex items-center gap-2 cursor-pointer whitespace-nowrap"
              >
                <Share2 className="w-4 h-4 text-[#0f766e]" />
                <span>Share Study</span>
              </button>
            </div>
          </div>

          {/* Compounding Protocol Strip */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              <strong className="text-slate-800">Lab Compounding Protocol: </strong>
              <span>{spec.processingNotes}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="text-xs font-bold text-slate-600 hover:text-[#0f766e] flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Dashboard Home</span>
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => router.push("/library")}
                className="text-xs font-bold text-[#0f766e] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>3D Ingredient Library</span>
              </button>
            </div>
          </div>
        </div>

        {/* CANDIDATE FORMULATION CARDS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white/95 backdrop-blur-md p-7 sm:p-8 rounded-[2.25rem] shadow-[0_22px_55px_-15px_rgba(16,68,56,0.15)] border border-emerald-900/10 flex flex-col justify-between"
            >
              <div>
                {/* Candidate Header */}
                <div className="flex justify-between items-start gap-3 mb-5">
                  <div>
                    <p className="text-xs font-mono font-bold text-[#0f766e] uppercase">
                      {cand.badge}
                    </p>
                    <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">{cand.title}</h2>
                  </div>
                  <div className="text-right font-mono text-xs text-slate-500">
                    <span>{cand.systemType || spec.systemType}</span>
                  </div>
                </div>

                {/* Key Rheology, pH & BOM Metrics */}
                <div className="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl mb-5 border border-slate-200/80 text-center">
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono uppercase mb-0.5">
                      Viscosity
                    </p>
                    <p className="font-mono font-extrabold text-slate-900 text-sm sm:text-[15px] tabular-nums">
                      {cand.viscosity}
                    </p>
                  </div>
                  <div className="border-x border-slate-200/80 px-2">
                    <p className="text-[10px] text-slate-400 font-mono uppercase mb-0.5">
                      Calibrated pH
                    </p>
                    <p className="font-mono font-extrabold text-[#0f766e] text-sm sm:text-[15px] tabular-nums">
                      {cand.ph}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 font-mono uppercase mb-0.5">
                      Est. BOM ({batchGrams}g)
                    </p>
                    <p className="font-mono font-extrabold text-slate-900 text-xs sm:text-sm tabular-nums">
                      {formData.viewCost ? cand.estCost : "Hidden"}
                    </p>
                  </div>
                </div>

                {/* Safety & Observation Box */}
                <div className="bg-emerald-50/75 border border-emerald-200/80 p-4 rounded-2xl mb-6">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-extrabold text-[#12382f] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                      <span>Hypoallergenic &amp; Stability Assessment ({cand.overallRisk} Risk)</span>
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 leading-relaxed mb-2">
                    {cand.riskSummaryText}
                  </p>
                  <p className="text-[11px] text-slate-600 pt-2 border-t border-emerald-200/60">
                    {cand.observationText}
                  </p>
                </div>

                {/* Ingredients Composition Breakdown with 3D Molecule Inspector Trigger */}
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider">
                    Composition Breakdown ({cand.ingredients.length} Ingredients)
                  </h3>
                  <span className="text-[11px] font-medium text-[#0f766e] print:hidden">
                    Click any ingredient for 3D Molecule &amp; CoA
                  </span>
                </div>

                <div className="space-y-2.5 mb-4">
                  {cand.ingredients.map((ing, i) => {
                    const prof = getIngredientProfile(ing.name);
                    const compat = ing.compatibilityScore || prof.compatibilityScore;
                    const weightG = (((parseFloat(ing.conc) || 0) / 100) * batchGrams).toFixed(2);
                    return (
                      <div
                        key={i}
                        onClick={() => setInspectedIngredient(ing.name)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            setInspectedIngredient(ing.name);
                          }
                        }}
                        className="group p-3.5 rounded-xl bg-slate-50/90 hover:bg-emerald-50/60 border border-slate-200/80 hover:border-[#14b8a6] transition cursor-pointer flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 text-sm group-hover:text-[#0f766e] transition-colors">
                                {ing.name}
                              </span>
                              <span className="text-[11px] font-mono text-slate-400">
                                {ing.molecularFormula || prof.molecularFormula}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {ing.category} · {ing.riskNote}
                            </p>
                          </div>

                          <div className="text-right font-mono shrink-0 tabular-nums">
                            <span className="text-sm font-extrabold text-slate-900">
                              {ing.conc}
                            </span>
                            <span className="text-[11px] text-slate-500 block">
                              {weightG} g
                            </span>
                          </div>
                        </div>

                        {/* Supplier, Halal & Compatibility Row */}
                        <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="w-3.5 h-3.5 text-[#0f766e] shrink-0" />
                            <span className="font-semibold text-slate-800">{ing.supplier}</span>
                            <span aria-hidden="true">·</span>
                            {ing.isHalal ? (
                              <span className="text-[#0f766e] font-bold flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>{ing.halalBody || "Halal Verified"}</span>
                              </span>
                            ) : (
                              <span className="text-amber-600 font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                <span>Standard CoA</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-2 font-mono">
                            <span className="text-slate-600">
                              Compat: <strong className="text-[#0f766e]">{compat}%</strong>
                            </span>
                            <span className="inline-flex items-center gap-1 text-[#0f766e] font-sans font-bold group-hover:underline print:hidden">
                              <Atom className="w-3.5 h-3.5" />
                              <span>3D View</span>
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* MODAL 1: 3D WEBGL MOLECULE & INGREDIENT DETAIL INSPECTOR (Features C & D) */}
      {inspectedIngredient && inspectedProf && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`3D Molecular Inspector for ${inspectedProf.inciName}`}
        >
          <div className="bg-white rounded-[2rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-emerald-900/15 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-mono text-[#0f766e] font-bold">
                  CAS {inspectedProf.casNumber} · {inspectedProf.molecularFormula} ·{" "}
                  {inspectedProf.molecularWeight}
                </p>
                <h2 className="text-2xl font-extrabold text-slate-900 mt-0.5">
                  {inspectedProf.inciName}
                </h2>
                <p className="text-xs text-slate-500">{inspectedProf.functionalCategory}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedIngredient(null)}
                aria-label="Close 3D Molecule Inspector"
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mb-5">
              <Molecule3DViewer
                ingredientName={inspectedIngredient}
                heightClass="h-[320px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Compatibility Score
                </span>
                <span className="text-lg font-mono font-extrabold text-[#0f766e] tabular-nums">
                  {inspectedProf.compatibilityScore}%
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Optimal pH
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                  {inspectedProf.optimalPhRange}
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
                <span className="text-[10px] font-mono uppercase text-slate-400 block">
                  Usage Rate
                </span>
                <span className="text-xs font-mono font-bold text-slate-900 tabular-nums">
                  {inspectedProf.typicalUsageRate}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              {inspectedProf.mechanismOfAction}
            </p>

            <div className="text-xs text-slate-600 space-y-1.5 bg-emerald-50/60 p-4 rounded-xl border border-emerald-200/70">
              <div>
                <strong className="text-slate-900">Synergistic With: </strong>
                <span>{inspectedProf.synergisticWith.join(" · ")}</span>
              </div>
              <div>
                <strong className="text-slate-900">Certifications: </strong>
                <span className="text-[#0f766e] font-bold">
                  {inspectedProf.certifications.join(" · ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SHAREABLE STUDY REPORT MODAL (Feature B) */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share Formulation Study Report"
        >
          <div className="bg-white rounded-[2rem] max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-emerald-900/15">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-mono text-[#0f766e] font-bold uppercase">
                  SHAREABLE R&amp;D DOSSIER
                </p>
                <h2 className="text-xl font-extrabold text-slate-900 mt-0.5">
                  Share Formulation Study Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                aria-label="Close Share Modal"
                className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <pre className="w-full bg-slate-900 text-emerald-100 p-4 rounded-2xl text-xs font-mono overflow-x-auto max-h-72 whitespace-pre-wrap leading-relaxed mb-5">
              {buildShareableSummary()}
            </pre>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Download CSV</span>
              </button>
              <button
                type="button"
                onClick={handleCopyShareReport}
                className="px-5 py-2.5 rounded-xl bg-[#0f766e] hover:bg-[#12382f] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Copied Study Summary!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Study Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}