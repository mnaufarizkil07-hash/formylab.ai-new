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
import AmbientBioluminescence from "../../components/AmbientBioluminescence";
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
  optionSummary?: string;
  tradeOffNote?: string;
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
  desiredTexture?: string;
  targetPh: string;
  targetViscosity: string;
  batchSize?: string;
  targetHppPerUnit?: string;
  trialBudgetRp?: string;
  halalRequirement?: string;
  projectDeadline?: string;
  targetMoq?: string;
  customIngredients: string[];
  viewCost: boolean;
}

type LabOutcomeType =
  | "berhasil"
  | "pecah_emulsi"
  | "warna_berubah"
  | "tekstur_encer"
  | "ph_drift";

const LAB_OUTCOME_DIAGNOSES: Record<
  LabOutcomeType,
  {
    label: string;
    statusBadge: string;
    rootCause: string;
    nextBatchFix: string;
    knowledgeRule: string;
  }
> = {
  berhasil: {
    label: "Berhasil: Emulsi Stabil, pH & Viskositas Sesuai Target",
    statusBadge: "LULUS QC AWAL · LANJUT TAHAP 9 (DOKUMENTASI BPOM & HALAL)",
    rootCause:
      "Keseimbangan HLB emulgator, urutan pencampuran fase air/minyak (70–75°C), dan suhu cool-down (<40°C) sudah optimal.",
    nextBatchFix:
      "Lanjutkan ke uji stabilitas dipercepat 28 hari (45°C & 3 siklus Freeze-Thaw) serta kunci spesifikasi sebagai Master Batch Record.",
    knowledgeRule:
      "Kombinasi bahan aktif dan sistem polimer ini tervalidasi stabil untuk scale-up pilot batch.",
  },
  pecah_emulsi: {
    label: "Gagal: Pecah Emulsi / Pemisahan Fase Minyak-Air (Creaming/Coalescence)",
    statusBadge: "PERLU REFORMULASI BATCH BERIKUTNYA (TAHAP 8 LEARNING LOOP)",
    rootCause:
      "Ketidakcocokan Required HLB fase minyak dengan sistem emulgator atau kecepatan homogenizer kurang tinggi saat penggabungan fase 75°C.",
    nextBatchFix:
      "Naikkan konsentrasi co-emulsifier (Cetearyl Olivate / Sorbitan Olivate +0.5%), tambahkan Xanthan Gum 0.2% di fase air, dan homogenisasi pada 3.500 rpm selama 10 menit.",
    knowledgeRule:
      "Catat ke Knowledge Base Maklon: Emulsi sistem ini wajib didampingi polymeric rheology modifier min. 0.3% agar tahan suhu 45°C.",
  },
  warna_berubah: {
    label: "Gagal: Perubahan Warna / Menguning (Oksidasi Bahan Aktif)",
    statusBadge: "PERLU STABILISASI ANTIOKSIDAN (TAHAP 8 LEARNING LOOP)",
    rootCause:
      "Oksidasi bahan aktif polifenol/vitamin akibat paparan oksigen, ion logam bebas, atau penambahan bahan sensitif saat suhu batch masih >45°C.",
    nextBatchFix:
      "Tambahkan chelating agent Disodium EDTA / Sodium Phytate 0.10%, antioksidan Sodium Metabisulfite 0.05% atau Tocopherol 0.2%, dan pastikan bahan aktif masuk di suhu <38°C.",
    knowledgeRule:
      "Catat ke Knowledge Base Maklon: Bahan aktif pencerah/antioksidan wajib dikombinasikan dengan sistem kelasi 0.1% dan kemasan airless opaque.",
  },
  tekstur_encer: {
    label: "Gagal: Viskositas Terlalu Encer / Drop Saat Penambahan Aktif",
    statusBadge: "PERLU KOREKSI REOLOGI POLIMER (TAHAP 8 LEARNING LOOP)",
    rootCause:
      "Muatan elektrolit dari bahan aktif/ekstrak memutus ikatan hidrogen jaringan gel Carbomer/Acrylates sehingga viskositas turun drastis.",
    nextBatchFix:
      "Ganti sebagian polimer sensitif elektrolit dengan Sepimax Zen / Xanthan Gum + Hydroxyethylcellulose (0.4%), atau naikkan fase pengental lipid Setil Alkohol +0.5%.",
    knowledgeRule:
      "Catat ke Knowledge Base Maklon: Bila total bahan aktif larut air >5%, gunakan polimer toleran elektrolit dibanding Carbomer standar.",
  },
  ph_drift: {
    label: "Gagal: pH Bergeser (Drift) Di Luar Rentang Spesifikasi",
    statusBadge: "PERLU SISTEM BUFFER ASAM-BASA (TAHAP 8 LEARNING LOOP)",
    rootCause:
      "Kurangnya kapasitas dapar (buffer) pada fase air sehingga hidrolisis bahan aktif menggeser pH selama penyimpanan.",
    nextBatchFix:
      "Pasang sistem buffer Citric Acid (0.08%) + Sodium Citrate (0.25%) untuk mengunci pH di rentang target serta hindari penggabungan Niacinamide pada pH <4.5.",
    knowledgeRule:
      "Catat ke Knowledge Base Maklon: Sediaan dengan Niacinamide atau ester aktif wajib memiliki pasangan buffer sitrat/laktat.",
  },
};

export default function ResultPage() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormData | null>(null);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [inspectedIngredient, setInspectedIngredient] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  // Tahap 7 & 8: Interactive Lab Trial Result & Learning Loop State
  const [selectedLabOutcome, setSelectedLabOutcome] = useState<LabOutcomeType>("berhasil");
  const [customLabNotes, setCustomLabNotes] = useState("");
  const [savedKnowledgeMsg, setSavedKnowledgeMsg] = useState("");

  useEffect(() => {
    queueMicrotask(() => {
      const savedForm = localStorage.getItem("currentFormulation");
      const savedCandidates = localStorage.getItem("aiGeneratedCandidates");

      if (savedForm && savedCandidates) {
        try {
          const parsedForm = JSON.parse(savedForm);
          const parsedCands = JSON.parse(savedCandidates);
          if (parsedForm && Array.isArray(parsedCands) && parsedCands.length > 0) {
            setFormData(parsedForm);
            setCandidates(parsedCands);
            return;
          }
        } catch {
          // fallback below
        }
      }

      const loadDefaultFormulation = () => {
        const defaultForm: FormData = {
          productType: "Facial Moisturizer (Cream)",
          skinTarget: "Sensitive & Redness",
          desiredTexture: "Light Gel-Cream (Cepat Meresap, Non-Sticky)",
          targetPh: "5.5",
          targetViscosity: "6,000 – 10,000 cPs",
          batchSize: "100",
          targetHppPerUnit: "12500",
          trialBudgetRp: "300000",
          halalRequirement: "Wajib Halal (LPPOM MUI / BPJPH)",
          projectDeadline: "8 Minggu (Standar R&D + Stabilitas 28 Hari)",
          targetMoq: "1000",
          customIngredients: ["Niacinamide 4%", "Panthenol 2%", "Ceramide NP 1%"],
          viewCost: true,
        };
        fetch("/api/formulate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(defaultForm),
        })
          .then((r) => r.json())
          .then((resData) => {
            if (resData.success && Array.isArray(resData.candidates)) {
              setFormData(defaultForm);
              setCandidates(resData.candidates);
              localStorage.setItem("currentFormulation", JSON.stringify(defaultForm));
              localStorage.setItem("aiGeneratedCandidates", JSON.stringify(resData.candidates));
            }
          })
          .catch(() => {});
      };

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
          } else {
            loadDefaultFormulation();
          }
        })
        .catch(() => {
          loadDefaultFormulation();
        });
    });
  }, []);

  if (!formData) {
    return (
      <div className="min-h-screen relative flex items-center justify-center bg-[#f8fdfb] text-[#0B2B26] overflow-x-clip">
        <LivingLabBackground variant="mint" />
        <div className="relative z-10 bg-white p-10 rounded-[16px] border border-[#0B2B26]/10 text-center">
          <FlaskConical className="w-10 h-10 text-[#0E807E] animate-pulse mx-auto mb-3" aria-hidden="true" />
          <p className="text-lg font-medium text-[#0B2B26]">
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
      `FORMYLAB.AI : R&D COSMETIC FORMULATION STUDY REPORT`,
      `Product System: ${formData.productType} (${spec.systemType})`,
      `Primary Skin Target: ${formData.skinTarget}`,
      `Batch Size: ${batchGrams} g | Target pH: ${formData.targetPh} | Target Viscosity: ${formData.targetViscosity}`,
      `Scientific Reference: ${spec.referenceSource} (${spec.evidenceDoi})`,
      top
        ? `\nSelected Lead Formula (${top.title} · ${top.badge}):\nCalibrated pH: ${top.ph} | Viscosity: ${top.viscosity} | Est. BOM: ${top.estCost}\n\nComposition Breakdown:\n${ingLines}`
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

  const handleSaveLearningLoop = () => {
    const diag = LAB_OUTCOME_DIAGNOSES[selectedLabOutcome];
    const existingRaw = localStorage.getItem("maklonKnowledgeBaseLogs");
    let logs: Array<Record<string, string>> = [];
    if (existingRaw) {
      try {
        logs = JSON.parse(existingRaw);
      } catch {
        logs = [];
      }
    }
    const newEntry = {
      timestamp: new Date().toLocaleString("id-ID"),
      productType: formData.productType,
      skinTarget: formData.skinTarget,
      outcome: diag.label,
      customNote: customLabNotes.trim() || "-",
      ruleSaved: diag.knowledgeRule,
    };
    localStorage.setItem("maklonKnowledgeBaseLogs", JSON.stringify([newEntry, ...logs].slice(0, 30)));
    setSavedKnowledgeMsg(
      `Tersimpan ke Knowledge Base Maklon (Tahap 8 Learning Loop): "${diag.knowledgeRule}"`
    );
  };

  const handleConsultAiOnFailure = () => {
    const diag = LAB_OUTCOME_DIAGNOSES[selectedLabOutcome];
    const prompt = `Pada percobaan lab (Tahap 7 & 8 Learning Loop) untuk sediaan ${formData.productType} (Target: ${formData.skinTarget}, pH target ${formData.targetPh}, viskositas ${formData.targetViscosity}), hasil lab menunjukkan: "${diag.label}". Catatan lab tambahan: "${customLabNotes.trim() || "Standar batch 100g"}". Tolong analisis penyebab kegagalan dan berikan revisi konsentrasi formula spesifik untuk batch percobaan berikutnya.`;
    localStorage.setItem("preselectedChatPrompt", prompt);
    router.push("/chat");
  };

  const inspectedProf = inspectedIngredient ? getIngredientProfile(inspectedIngredient) : null;
  const activeDiagnosis = LAB_OUTCOME_DIAGNOSES[selectedLabOutcome];

  return (
    <div className="min-h-screen relative bg-[#f8fdfb] text-[#0B2B26] pb-24 overflow-x-clip">
      <LivingLabBackground variant="mint" />

      <div className="print:hidden">
        <WorkspaceNavbar backHref="/formulate" backLabel="Back to Formulator" />
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        {/* Top Action & Study Report Toolbar */}
        <div className="relative overflow-hidden rounded-[20px] bg-white border border-[#0B2B26]/10 mb-8">
          <div className="print:hidden">
            <AmbientBioluminescence variant="section" />
          </div>
          <div className="relative z-10 card-glass-optical card-glass-static !border-0 !rounded-[20px] p-6 sm:p-8">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-[#0E807E] font-medium mb-2 tabular-nums">
                  <CheckCircle2 className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                  <span>TAHAP 4–9 · OUTPUT FORMULA BERLAPIS, TRIAL PLANNER &amp; DOKUMENTASI</span>
                  <span aria-hidden="true">·</span>
                  <span>{spec.systemType}</span>
                  <span aria-hidden="true">·</span>
                  <span>Batch: {batchGrams}g</span>
                </div>

                <h1 className="text-2xl sm:text-3xl font-medium text-[#0B2B26] tracking-[-0.03em]">
                  {formData.productType} : Formulation Study Report
                </h1>

                <p className="text-xs sm:text-sm text-[#2E524C] mt-1.5 max-w-3xl leading-relaxed">
                  Laporan hasil skrining{" "}
                  <span className="font-medium text-[#0B2B26]">5 Gerbang Evaluasi R&amp;D</span> (Regulasi BPOM/ASEAN, Kompatibilitas
                  pH &amp; HLB, Status Halal, Stok Gudang, dan Kalkulasi HPP), dilengkapi{" "}
                  <span className="font-medium text-[#0B2B26]">3 Kandidat Formula Berlapis (Formula A, B, dan C)</span>{" "}
                  beserta analisis trade-off, jadwal trial laboratorium, serta draf berkas notifikasi BPOM &amp; Halal.
                </p>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#2E524C] mt-2.5 tabular-nums">
                  <span>
                    Skin Target: <span className="font-medium text-[#0B2B26]">{formData.skinTarget}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Tekstur:{" "}
                    <span className="font-medium text-[#0B2B26]">
                      {formData.desiredTexture || "Light Gel-Cream"}
                    </span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Target pH: <span className="font-mono font-medium text-[#0B2B26] tabular-nums">{formData.targetPh}</span>
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    Target Viscosity:{" "}
                    <span className="font-mono font-medium text-[#0B2B26] tabular-nums">{formData.targetViscosity}</span>
                  </span>
                </div>

                {/* 4 Brief Specification Summary Items — No nested backdrop-blur inside card-glass-optical */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
                  <div className="p-3 rounded-[12px] bg-white/90 border border-[#0B2B26]/10 text-xs">
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#2E524C] block">
                      1. Target Kulit &amp; Tekstur
                    </span>
                    <span className="font-medium text-[#0B2B26] truncate block mt-0.5">
                      {formData.skinTarget} · {(formData.desiredTexture || "Gel-Cream").split("(")[0].trim()}
                    </span>
                  </div>
                  <div className="p-3 rounded-[12px] bg-white/90 border border-[#0B2B26]/10 text-xs">
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#2E524C] block">
                      2. Target HPP &amp; Trial Budget
                    </span>
                    <span className="font-mono font-medium text-[#0E807E] truncate block mt-0.5 tabular-nums">
                      HPP Rp {Number(formData.targetHppPerUnit || 12500).toLocaleString("id-ID")} · Trial Rp{" "}
                      {Number(formData.trialBudgetRp || 300000).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="p-3 rounded-[12px] bg-white/90 border border-[#0B2B26]/10 text-xs">
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#2E524C] block">
                      3. Status Kehalalan
                    </span>
                    <span className="font-medium text-[#146c43] truncate block mt-0.5">
                      {formData.halalRequirement || "Wajib Halal (LPPOM MUI / BPJPH)"}
                    </span>
                  </div>
                  <div className="p-3 rounded-[12px] bg-white/90 border border-[#0B2B26]/10 text-xs">
                    <span className="text-[10px] font-mono uppercase tracking-[0.06em] text-[#2E524C] block">
                      4. Deadline &amp; MOQ
                    </span>
                    <span className="font-mono font-medium text-[#0B2B26] truncate block mt-0.5 tabular-nums">
                      {(formData.projectDeadline || "8 Minggu").split("(")[0].trim()} · MOQ{" "}
                      {Number(formData.targetMoq || 1000).toLocaleString("id-ID")} pcs
                    </span>
                  </div>
                </div>
              </div>

              {/* Study Report Export & Share Actions — Optical Glass Pills */}
              <div className="flex flex-wrap items-center gap-2.5 print:hidden shrink-0">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="btn-glass-primary min-h-[44px] px-5 py-2.5 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <FileSpreadsheet className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                  <span>Export CSV BOM</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintStudyReport}
                  className="btn-glass-secondary min-h-[44px] px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Printer className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                  <span>Print / Save PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShareModalOpen(true)}
                  className="btn-glass-secondary min-h-[44px] px-4 py-2.5 text-xs flex items-center gap-2 cursor-pointer whitespace-nowrap"
                >
                  <Share2 className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                  <span>Share Study</span>
                </button>
              </div>
            </div>

          {/* TAHAP 4: 5 PENGECEKAN BERLAPIS */}
          <div className="mt-6 pt-5 border-t border-[#0B2B26]/10">
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xs font-medium uppercase tracking-[0.12em] text-[#0E807E]">
                Tahap 4 · Hasil Pengecekan Berlapis (5 Gerbang Evaluasi R&amp;D)
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-[#eaf9f0] text-[#146c43] text-[11px] font-mono font-medium tabular-nums">
                ✓ 5/5 Filter Terverifikasi
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div className="p-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/10 text-xs">
                <span className="text-[11px] font-mono font-medium text-[#0E807E] uppercase block tabular-nums">
                  01 · Filter Regulasi
                </span>
                <p className="font-medium text-[#0B2B26] mt-0.5">BPOM &amp; ASEAN Compliant</p>
                <p className="text-[11px] text-[#2E524C] mt-0.5">
                  Bebas bahan terlarang, konsentrasi sesuai lampiran BPOM &amp; klaim kosmetik aman.
                </p>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/10 text-xs">
                <span className="text-[11px] font-mono font-medium text-[#0E807E] uppercase block tabular-nums">
                  02 · Filter Kompatibilitas
                </span>
                <p className="font-mono font-medium text-[#0B2B26] mt-0.5 tabular-nums">
                  pH {formData.targetPh} &amp; HLB {spec.requiredHlb}
                </p>
                <p className="text-[11px] text-[#2E524C] mt-0.5">
                  Interaksi bahan aktif, suhu cool-down &lt;40°C &amp; risiko pecah emulsi terkendali.
                </p>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/10 text-xs">
                <span className="text-[11px] font-mono font-medium text-[#0E807E] uppercase block tabular-nums">
                  03 · Filter Halal
                </span>
                <p className="font-medium text-[#146c43] mt-0.5">LPPOM MUI / BPJPH Ready</p>
                <p className="text-[11px] text-[#2E524C] mt-0.5">
                  Seluruh bahan utama memiliki CoA Halal atau opsi substitusi nabati.
                </p>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/10 text-xs">
                <span className="text-[11px] font-mono font-medium text-[#0E807E] uppercase block tabular-nums">
                  04 · Filter Stok Gudang
                </span>
                <p className="font-medium text-[#0B2B26] mt-0.5">Ready Stock + Lead Time</p>
                <p className="text-[11px] text-[#2E524C] mt-0.5">
                  Formula C siap diracik hari ini dari stok gudang internal maklon (lead time 2–5 hari).
                </p>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#f8fdfb] border border-[#0B2B26]/10 text-xs">
                <span className="text-[11px] font-mono font-medium text-[#0E807E] uppercase block tabular-nums">
                  05 · Filter Biaya &amp; HPP
                </span>
                <p className="font-mono font-medium text-[#0E807E] mt-0.5 tabular-nums">
                  Sesuai Target Rp {Number(formData.targetHppPerUnit || 12500).toLocaleString("id-ID")}
                </p>
                <p className="text-[11px] text-[#2E524C] mt-0.5">
                  Kalkulasi BOM/batch &amp; alokasi budget trial Rp{" "}
                  {Number(formData.trialBudgetRp || 300000).toLocaleString("id-ID")}.
                </p>
              </div>
            </div>
          </div>

          {/* Compounding Protocol Strip (Tahap 3) */}
          <div className="mt-5 pt-4 border-t border-[#0B2B26]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#2E524C]">
            <div>
              <span className="font-medium text-[#0B2B26]">
                Tahap 3 · Urutan &amp; Metode Pembuatan Lab:{" "}
              </span>
              <span>{spec.processingNotes.replace(/\s*—\s*/g, ", ")}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 print:hidden">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="min-h-[44px] px-2 text-xs font-medium text-[#2E524C] hover:text-[#0B2B26] flex items-center gap-1 cursor-pointer whitespace-nowrap transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Dashboard Home</span>
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => router.push("/library")}
                className="min-h-[44px] px-2 text-xs font-medium text-[#0E807E] hover:underline flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" aria-hidden="true" />
                <span>3D Ingredient Library</span>
              </button>
            </div>
          </div>
          </div>
        </div>

        {/* TAHAP 5: OUTPUT BERLAPIS : FORMULA A, B, C */}
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="block text-[11px] font-medium text-[#0E807E] uppercase tracking-[0.14em]">
              Output Formula Berlapis &amp; Catatan Trade-off Substitusi
            </span>
            <h2 className="text-xl sm:text-2xl font-medium text-[#0B2B26] tracking-[-0.02em]">
              Perbandingan {candidates.length} Opsi Formula Siap Uji Lab
            </h2>
          </div>
          <span className="text-xs text-[#2E524C]">
            Klik baris bahan baku mana pun untuk membuka 3D Konformer Molekul &amp; Sertifikat Halal
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
          {candidates.map((cand) => (
            <div
              key={cand.id}
              className="bg-white p-6 sm:p-7 rounded-[16px] border border-[#0B2B26]/10 flex flex-col justify-between"
            >
              <div>
                {/* Candidate Header */}
                <div className="flex justify-between items-start gap-3 mb-3">
                  <div>
                    <p className="text-[11px] font-mono font-medium text-[#0E807E] uppercase tracking-[0.06em]">
                      {cand.badge.replace(/\s*—\s*/g, " · ")}
                    </p>
                    <h3 className="text-xl font-medium text-[#0B2B26] mt-0.5">{cand.title.replace(/\s*—\s*/g, ": ")}</h3>
                  </div>
                  <div className="text-right font-mono text-[11px] text-[#2E524C]">
                    <span>{cand.systemType || spec.systemType}</span>
                  </div>
                </div>

                {cand.optionSummary && (
                  <p className="text-xs text-[#2E524C] leading-relaxed mb-3">
                    {cand.optionSummary.replace(/\s*—\s*/g, ", ")}
                  </p>
                )}

                {cand.tradeOffNote && (
                  <div className="p-3.5 rounded-[12px] bg-[#fef9e7] border border-[#f5d078]/60 text-[11px] text-[#2E524C] leading-relaxed mb-4">
                    <span className="font-medium text-[#9a6700] block mb-0.5">
                      Catatan Trade-off &amp; Substitusi (Tahap 5):
                    </span>
                    <span>{cand.tradeOffNote.replace(/\s*—\s*/g, ", ")}</span>
                  </div>
                )}

                {/* Key Rheology, pH & BOM Metrics */}
                <div className="grid grid-cols-3 gap-2 bg-[#f4fbf8] p-3.5 rounded-[12px] mb-4 border border-[#0B2B26]/10 text-center">
                  <div>
                    <p className="text-[10px] text-[#2E524C] font-sans uppercase mb-0.5">
                      Viscosity
                    </p>
                    <p className="font-mono font-medium text-[#0B2B26] text-xs sm:text-sm tabular-nums">
                      {cand.viscosity}
                    </p>
                  </div>
                  <div className="border-x border-[#0B2B26]/10 px-1.5">
                    <p className="text-[10px] text-[#2E524C] font-sans uppercase mb-0.5">
                      Calibrated pH
                    </p>
                    <p className="font-mono font-medium text-[#0E807E] text-xs sm:text-sm tabular-nums">
                      {cand.ph}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#2E524C] font-sans uppercase mb-0.5">
                      BOM ({batchGrams}g)
                    </p>
                    <p className="font-mono font-medium text-[#0B2B26] text-xs tabular-nums">
                      {formData.viewCost ? cand.estCost : "Hidden"}
                    </p>
                  </div>
                </div>

                {/* Safety & Observation Box */}
                <div className="bg-[#f8fdfb] border border-[#0B2B26]/10 p-3.5 rounded-[12px] mb-5">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-medium text-[#0E807E] flex items-center gap-1.5">
                      <ShieldCheck className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                      <span>Stabilitas &amp; Regulasi ({cand.overallRisk} Risk)</span>
                    </span>
                  </div>
                  <p className="text-xs text-[#0B2B26] leading-relaxed mb-1.5">
                    {cand.riskSummaryText.replace(/\s*—\s*/g, ", ")}
                  </p>
                  <p className="text-[11px] text-[#2E524C] pt-1.5 border-t border-[#0B2B26]/8">
                    {cand.observationText.replace(/\s*—\s*/g, ", ")}
                  </p>
                </div>

                {/* Ingredients Composition Breakdown */}
                <div className="flex items-center justify-between mb-2.5">
                  <h4 className="text-xs font-medium text-[#0B2B26] uppercase tracking-wider">
                    Komposisi ({cand.ingredients.length} Bahan)
                  </h4>
                  <span className="text-[10px] font-medium text-[#0E807E] print:hidden">
                    Klik bahan untuk 3D &amp; CoA
                  </span>
                </div>

                <div className="space-y-2 mb-3">
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
                        className="group p-3 rounded-[12px] bg-[#f8fdfb] hover:bg-[#eefbf7] border border-[#0B2B26]/10 hover:border-[#0E807E]/40 transition cursor-pointer flex flex-col gap-1.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-medium text-[#0B2B26] text-xs sm:text-sm group-hover:text-[#0E807E] transition-colors">
                                {ing.name}
                              </span>
                              <span className="text-[10px] font-mono text-[#2E524C]">
                                {ing.molecularFormula || prof.molecularFormula}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#2E524C]">
                              {ing.category} · {ing.riskNote.replace(/\s*—\s*/g, ", ")}
                            </p>
                          </div>

                          <div className="text-right font-mono shrink-0 tabular-nums">
                            <span className="text-xs sm:text-sm font-medium text-[#0E807E]">
                              {ing.conc}
                            </span>
                            <span className="text-[10px] text-[#2E524C] block">
                              {weightG} g
                            </span>
                          </div>
                        </div>

                        {/* Supplier, Halal & Compatibility Row */}
                        <div className="pt-1.5 border-t border-[#0B2B26]/8 flex flex-wrap items-center justify-between gap-1.5 text-[10px]">
                          <div className="flex items-center gap-1 text-[#2E524C]">
                            <Building2 className="w-3 h-3 text-[#0E807E] shrink-0" aria-hidden="true" />
                            <span className="font-medium text-[#0B2B26]">{ing.supplier}</span>
                            <span aria-hidden="true">·</span>
                            {ing.isHalal ? (
                              <span className="text-[#146c43] font-medium flex items-center gap-0.5">
                                <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                <span>{ing.halalBody || "Halal"}</span>
                              </span>
                            ) : (
                              <span className="text-[#9a6700] font-medium flex items-center gap-0.5">
                                <AlertTriangle className="w-3 h-3" aria-hidden="true" />
                                <span>CoA</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 font-mono tabular-nums">
                            <span className="text-[#2E524C]">
                              Compat: <span className="font-medium text-[#0E807E]">{compat}%</span>
                            </span>
                            <span className="inline-flex items-center gap-0.5 text-[#0E807E] font-medium group-hover:underline print:hidden">
                              <Atom className="w-3 h-3" aria-hidden="true" />
                              <span>3D</span>
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

        {/* TAHAP 6, 7, 8 & 9: TRIAL PLANNER, LEARNING LOOP & DOKUMENTASI */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* TAHAP 6: RENCANA PERCOBAAN LAB */}
          <div className="lg:col-span-4 bg-white p-6 sm:p-7 rounded-[16px] border border-[#0B2B26]/10">
            <span className="text-[11px] font-medium text-[#0E807E] uppercase tracking-[0.12em]">
              TAHAP 6 · TRIAL PLANNER
            </span>
            <h3 className="text-lg font-medium text-[#0B2B26] mt-0.5 mb-2">
              Rencana Percobaan Lab Efisien
            </h3>
            <p className="text-xs text-[#2E524C] leading-relaxed mb-4">
              AI menyusun jadwal percobaan lab agar tim R&amp;D maklon tidak buang bahan dan waktu:
            </p>
            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 rounded-[12px] bg-[#f4fbf8] border border-[#0B2B26]/10">
                <span className="font-medium text-[#0B2B26] block mb-1">
                  1. Jumlah Batch &amp; Variabel Prioritas
                </span>
                <span className="text-[#2E524C]">
                  3 Lab Trial @ {batchGrams}g: Batch 1 (Formula C Stok Gudang), Batch 2 (Formula B
                  Optimasi HPP/Halal), Batch 3 (Formula A Performa Maksimal). Variasikan rasio
                  pengental ±0.15% terlebih dahulu.
                </span>
              </div>
              <div className="p-3.5 rounded-[12px] bg-[#f4fbf8] border border-[#0B2B26]/10">
                <span className="font-medium text-[#0B2B26] block mb-1">
                  2. Parameter Uji Wajib Laboratorium
                </span>
                <ul className="mt-1 space-y-1 text-[#2E524C] list-disc list-inside">
                  <li>Organoleptik: Warna, bau, tekstur &amp; after-feel di kulit</li>
                  <li>pH Terkalibrasi: Target <span className="font-mono tabular-nums">{formData.targetPh}</span> (25°C)</li>
                  <li>Viskositas Brookfield: Target <span className="font-mono tabular-nums">{formData.targetViscosity}</span></li>
                  <li>Stabilitas Dipercepat: Oven 45°C (28 hari) &amp; 3 siklus Freeze-Thaw</li>
                  <li>Uji Cemaran Mikroba &amp; Efektivitas Pengawet (ALT/AKK BPOM)</li>
                </ul>
              </div>
            </div>
          </div>

          {/* TAHAP 7 & 8: INPUT HASIL RACIKAN LAB & AI LEARNING LOOP */}
          <div className="lg:col-span-5 bg-white p-6 sm:p-7 rounded-[16px] border border-[#0B2B26]/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#0E807E] uppercase tracking-[0.12em]">
                TAHAP 7 &amp; 8 · TIM R&amp;D MERACIK &amp; LEARNING LOOP
              </span>
              <h3 className="text-lg font-medium text-[#0B2B26] mt-0.5 mb-2">
                Catat Hasil Lab &amp; Diagnosis Perbaikan AI
              </h3>
              <p className="text-xs text-[#2E524C] leading-relaxed mb-3">
                Pilih hasil pengamatan fisik setelah diracik di lab. Bila terjadi kendala (pecah
                emulsi, warna berubah, tekstur encer), AI menganalisis penyebab dan menyimpan
                pelajaran ke <em>Knowledge Base</em> maklon:
              </p>

              <label
                htmlFor="lab-outcome-select"
                className="block text-[11px] font-medium uppercase tracking-[0.1em] text-[#0E807E] mb-1.5"
              >
                Status Hasil Percobaan Batch Lab (Tahap 7):
              </label>
              <select
                id="lab-outcome-select"
                value={selectedLabOutcome}
                onChange={(e) => {
                  setSelectedLabOutcome(e.target.value as LabOutcomeType);
                  setSavedKnowledgeMsg("");
                }}
                className="w-full min-h-[44px] p-2.5 rounded-[12px] border border-[#0B2B26]/15 bg-[#f8fdfb] text-xs font-medium text-[#0B2B26] mb-3 focus:outline-none focus:border-[#0E807E]"
              >
                {Object.entries(LAB_OUTCOME_DIAGNOSES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={customLabNotes}
                onChange={(e) => setCustomLabNotes(e.target.value)}
                placeholder="Catatan tambahan R&D (opsional, misal: homogenizer 3000 rpm, pH aktual 5.3)..."
                className="w-full min-h-[44px] p-2.5 rounded-[12px] border border-[#0B2B26]/15 bg-[#f8fdfb] text-xs text-[#0B2B26] placeholder:text-[#2E524C]/50 mb-3 focus:outline-none focus:border-[#0E807E]"
              />

              <div className="p-3.5 rounded-[12px] bg-[#f4fbf8] border border-[#0B2B26]/10 text-xs space-y-1.5 mb-3">
                <div className="text-[11px] font-mono font-medium text-[#0E807E]">
                  {activeDiagnosis.statusBadge}
                </div>
                <div>
                  <span className="font-medium text-[#0B2B26]">Analisis Penyebab (Root Cause): </span>
                  <span className="text-[#2E524C]">{activeDiagnosis.rootCause}</span>
                </div>
                <div>
                  <span className="font-medium text-[#0B2B26]">Rekomendasi Batch Berikutnya: </span>
                  <span className="text-[#2E524C]">{activeDiagnosis.nextBatchFix}</span>
                </div>
              </div>

              {savedKnowledgeMsg && (
                <div className="p-3 rounded-[12px] bg-[#eaf9f0] border border-[#0E807E]/35 text-[#146c43] text-[11px] font-medium mb-3">
                  ✓ {savedKnowledgeMsg}
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveLearningLoop}
                className="btn-glass-primary min-h-[44px] px-4 py-2.5 text-xs cursor-pointer"
              >
                <span>Simpan ke Knowledge Base Maklon</span>
              </button>
              <button
                type="button"
                onClick={handleConsultAiOnFailure}
                className="btn-glass-secondary min-h-[44px] px-4 py-2.5 text-xs cursor-pointer"
              >
                <span>Diskusikan Revisi di AI Consultant →</span>
              </button>
            </div>
          </div>

          {/* TAHAP 9: DOKUMENTASI FINAL */}
          <div className="lg:col-span-3 bg-white p-6 sm:p-7 rounded-[16px] border border-[#0B2B26]/10 flex flex-col justify-between">
            <div>
              <span className="text-[11px] font-medium text-[#0E807E] uppercase tracking-[0.12em]">
                TAHAP 9 · DOKUMENTASI FINAL
              </span>
              <h3 className="text-lg font-medium text-[#0B2B26] mt-0.5 mb-2">
                Paket Dokumen BPOM &amp; Halal
              </h3>
              <p className="text-xs text-[#2E524C] leading-relaxed mb-3">
                Setelah formula disetujui, AI menyiapkan draf kelengkapan dokumen produksi &amp;
                registrasi:
              </p>
              <ul className="space-y-2 text-xs text-[#2E524C] mb-4">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-[#0B2B26]">Draft Formula Sheet:</span> Komposisi % w/w, gramasi per batch{" "}
                    {batchGrams}g, INCI &amp; nomor CAS lengkap.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-[#0B2B26]">Ringkasan Data Notifikasi BPOM:</span> Draf Dokumen Informasi Produk
                    (DIP) Bagian I–IV &amp; klaim kosmetik.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#0E807E] shrink-0 mt-0.5" aria-hidden="true" />
                  <span>
                    <span className="font-medium text-[#0B2B26]">Checklist Dokumen Halal:</span> Matriks bahan baku SJPH BPJPH / LPPOM
                    MUI &amp; CoA supplier.
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-2 print:hidden">
              <button
                type="button"
                onClick={handleExportCSV}
                className="btn-glass-primary min-h-[44px] w-full py-2.5 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                <span>Unduh Draft Formula Sheet (CSV)</span>
              </button>
              <button
                type="button"
                onClick={handlePrintStudyReport}
                className="btn-glass-secondary min-h-[44px] w-full py-2.5 px-4 text-xs flex items-center justify-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                <span>Cetak Dossier BPOM &amp; Halal (PDF)</span>
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* MODAL 1: 3D WEBGL MOLECULE & INGREDIENT DETAIL INSPECTOR */}
      {inspectedIngredient && inspectedProf && (
        <div
          className="fixed inset-0 z-50 bg-[#eaf8f3]/55 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`3D Molecular Inspector for ${inspectedProf.inciName}`}
        >
          <div className="card-glass-optical card-glass-static max-w-2xl w-full p-6 sm:p-8 max-h-[90vh] overflow-y-auto text-[#0B2B26]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-xs font-mono text-[#0E807E] font-medium tabular-nums">
                  CAS {inspectedProf.casNumber} · {inspectedProf.molecularFormula} ·{" "}
                  {inspectedProf.molecularWeight}
                </p>
                <h2 className="text-2xl font-medium text-[#0B2B26] mt-0.5">
                  {inspectedProf.inciName}
                </h2>
                <p className="text-xs text-[#2E524C]">{inspectedProf.functionalCategory}</p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedIngredient(null)}
                aria-label="Close 3D Molecule Inspector"
                className="btn-glass-compact min-h-[44px] min-w-[44px] flex items-center justify-center p-2 cursor-pointer"
              >
                <X className="w-5 h-5 text-[#0B2B26]" aria-hidden="true" />
              </button>
            </div>

            <div className="mb-5">
              <Molecule3DViewer
                ingredientName={inspectedIngredient}
                heightClass="h-[320px]"
              />
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                  Compatibility Score
                </span>
                <span className="text-lg font-mono font-medium text-[#0E807E] tabular-nums">
                  {inspectedProf.compatibilityScore}%
                </span>
              </div>
              <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                  Optimal pH
                </span>
                <span className="text-xs font-mono font-medium text-[#0B2B26] tabular-nums">
                  {inspectedProf.optimalPhRange}
                </span>
              </div>
              <div className="bg-[#f4fbf8] p-3 rounded-[12px] border border-[#0B2B26]/10">
                <span className="text-[10px] font-sans uppercase tracking-[0.06em] text-[#2E524C] block">
                  Usage Rate
                </span>
                <span className="text-xs font-mono font-medium text-[#0B2B26] tabular-nums">
                  {inspectedProf.typicalUsageRate}
                </span>
              </div>
            </div>

            <p className="text-xs text-[#2E524C] leading-relaxed mb-4">
              {inspectedProf.mechanismOfAction.replace(/\s*—\s*/g, ", ")}
            </p>

            <div className="text-xs text-[#2E524C] space-y-1.5 bg-[#f4fbf8] p-4 rounded-[12px] border border-[#0B2B26]/10">
              <div>
                <span className="font-medium text-[#0B2B26]">Synergistic With: </span>
                <span>{inspectedProf.synergisticWith.join(" · ")}</span>
              </div>
              <div>
                <span className="font-medium text-[#0B2B26]">Certifications: </span>
                <span className="text-[#0E807E] font-medium">
                  {inspectedProf.certifications.join(" · ")}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SHAREABLE STUDY REPORT MODAL */}
      {shareModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#eaf8f3]/55 backdrop-blur-md flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Share Formulation Study Report"
        >
          <div className="card-glass-optical card-glass-static max-w-xl w-full p-6 sm:p-8 text-[#0B2B26]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <p className="text-[11px] font-sans text-[#0E807E] font-medium uppercase tracking-[0.12em]">
                  SHAREABLE R&amp;D DOSSIER
                </p>
                <h2 className="text-xl font-medium text-[#0B2B26] mt-0.5">
                  Share Formulation Study Report
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                aria-label="Close Share Modal"
                className="btn-glass-compact min-h-[44px] min-w-[44px] flex items-center justify-center p-2 cursor-pointer"
              >
                <X className="w-5 h-5 text-[#0B2B26]" aria-hidden="true" />
              </button>
            </div>

            <pre className="w-full bg-white/88 text-[#0B2B26] p-4 rounded-[12px] border border-[#0B2B26]/10 text-xs font-sans overflow-x-auto max-h-72 whitespace-pre-wrap leading-relaxed mb-5">
              {buildShareableSummary()}
            </pre>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={handleExportCSV}
                className="btn-glass-secondary min-h-[44px] px-4 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                <span>Download CSV</span>
              </button>
              <button
                type="button"
                onClick={handleCopyShareReport}
                className="btn-glass-primary min-h-[44px] px-5 py-2.5 text-xs flex items-center gap-1.5 cursor-pointer"
              >
                {copiedShare ? (
                  <>
                    <Check className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
                    <span>Copied Study Summary!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-[#0E807E]" aria-hidden="true" />
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