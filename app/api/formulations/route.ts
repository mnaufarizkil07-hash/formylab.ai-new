import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import type { SavedFormulationRecord } from "../../../lib/formulationStorage";

const STORAGE_PATH = path.join(process.cwd(), "data", "saved_formulations.json");

const DEFAULT_SEED_RECORDS: SavedFormulationRecord[] = [
  {
    id: "FRM-LAB-001",
    createdAt: "2026-11-09T08:15:00.000Z",
    productType: "Facial Moisturizer (Cream)",
    skinTarget: "Sensitive & Redness",
    targetPh: "5.25",
    targetViscosity: "8500 - 15000 cPs",
    batchSize: "100",
    customIngredients: ["Niacinamide 4%", "Panthenol 2%", "Ceramide NP 1%"],
    candidates: [
      {
        id: "candidate-a",
        title: "Candidate A",
        badge: "Best match (Hypoallergenic)",
        viscosity: "8,950 cP",
        ph: "5.28",
        estCost: "Rp 34.850 (BOM)",
        overallRisk: "Low",
        riskSummaryText: "Dataset CSV baris F0004 + System A O/W Lamellar Emulsion (Stabilitas: Stable).",
        observationText: "AI R&D ANALYSIS: Terverifikasi supplier Halal LPPOM MUI & IFANCA dengan skor kompatibilitas 98%.",
        ingredients: [
          {
            name: "Water",
            category: "Base Formulation",
            conc: "63.13%",
            riskLevel: "Low",
            riskNote: "Aman berdasarkan dataset",
            supplier: "PT Otsuka Indonesia",
            isHalal: true,
            compatibilityScore: 99,
            casNumber: "7732-18-5",
            molecularFormula: "H₂O",
          },
          {
            name: "Glycerin",
            category: "Base Formulation",
            conc: "4.50%",
            riskLevel: "Low",
            riskNote: "Trihydric Humectant (USP Grade)",
            supplier: "PT SMART Tbk",
            isHalal: true,
            compatibilityScore: 98,
            casNumber: "56-81-5",
            molecularFormula: "C₃H₈O₃",
          },
          {
            name: "Cetyl Alcohol",
            category: "Base Formulation",
            conc: "4.50%",
            riskLevel: "Low",
            riskNote: "Lamellar Gel Network Stabilizer",
            supplier: "PT SMART Tbk",
            isHalal: true,
            compatibilityScore: 97,
            casNumber: "36653-82-4",
            molecularFormula: "C₁₆H₃₄O",
          },
          {
            name: "Niacinamide",
            category: "Custom Active Compound",
            conc: "4.00%",
            riskLevel: "Low",
            riskNote: "Barrier Ceramide Synthesis & Brightening",
            supplier: "DSM Nutritional Products",
            isHalal: true,
            compatibilityScore: 99,
            casNumber: "98-92-0",
            molecularFormula: "C₆H₆N₂O",
          },
          {
            name: "Panthenol",
            category: "Custom Active Compound",
            conc: "2.00%",
            riskLevel: "Low",
            riskNote: "Pro-Vitamin B5 Corneocyte Repair",
            supplier: "BASF SE",
            isHalal: true,
            compatibilityScore: 99,
            casNumber: "81-13-0",
            molecularFormula: "C₉H₁₉NO₄",
          },
          {
            name: "Phenoxyethanol (Safe Preservative)",
            category: "AI Safety Replacement",
            conc: "1.00%",
            riskLevel: "Low",
            riskNote: "Substitusi aman bebas paraben",
            supplier: "Schülke & Mayr",
            isHalal: true,
            compatibilityScore: 97,
            casNumber: "122-99-6",
            molecularFormula: "C₈H₁₀O₂",
          },
        ],
      },
    ],
  },
];

const TMP_STORAGE_PATH = "/tmp/saved_formulations.json";
let memoryFallbackRecords: SavedFormulationRecord[] | null = null;

function readSavedRecords(): SavedFormulationRecord[] {
  try {
    if (fs.existsSync(TMP_STORAGE_PATH)) {
      const tmpContent = fs.readFileSync(TMP_STORAGE_PATH, "utf-8");
      const tmpParsed = JSON.parse(tmpContent);
      if (Array.isArray(tmpParsed) && tmpParsed.length > 0) {
        return tmpParsed;
      }
    }
    if (fs.existsSync(STORAGE_PATH)) {
      const content = fs.readFileSync(STORAGE_PATH, "utf-8");
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
    if (memoryFallbackRecords && memoryFallbackRecords.length > 0) {
      return memoryFallbackRecords;
    }
    return DEFAULT_SEED_RECORDS;
  } catch {
    return memoryFallbackRecords || DEFAULT_SEED_RECORDS;
  }
}

function writeSavedRecords(records: SavedFormulationRecord[]) {
  const trimmed = records.slice(0, 40);
  memoryFallbackRecords = trimmed;
  const serialized = JSON.stringify(trimmed, null, 2);
  try {
    const dir = path.dirname(STORAGE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STORAGE_PATH, serialized, "utf-8");
  } catch {
    try {
      fs.writeFileSync(TMP_STORAGE_PATH, serialized, "utf-8");
    } catch {
      // In-memory cache already updated
    }
  }
}

export async function GET() {
  const records = readSavedRecords();
  return NextResponse.json({ success: true, records });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as SavedFormulationRecord;
    if (!body || !body.productType || !Array.isArray(body.candidates)) {
      return NextResponse.json({ success: false, error: "Invalid formulation payload" }, { status: 400 });
    }
    const current = readSavedRecords();
    const record: SavedFormulationRecord = {
      ...body,
      id: body.id || `FRM-${Date.now().toString(36).toUpperCase()}`,
      createdAt: body.createdAt || new Date().toISOString(),
    };
    const updated = [record, ...current.filter((r) => r.id !== record.id)].slice(0, 40);
    writeSavedRecords(updated);
    return NextResponse.json({ success: true, record, records: updated });
  } catch (err) {
    console.error("POST /api/formulations error:", err);
    return NextResponse.json({ success: false, error: "Failed to save formulation" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const current = readSavedRecords();
    const updated = id ? current.filter((r) => r.id !== id) : current;
    writeSavedRecords(updated);
    return NextResponse.json({ success: true, records: updated });
  } catch {
    return NextResponse.json({ success: false, error: "Failed to delete formulation" }, { status: 500 });
  }
}
