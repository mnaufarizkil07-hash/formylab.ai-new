import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI, Type } from "@google/genai";
import {
  FORMULATION_REQUIRED_COLUMNS,
  type FormulaTableArtifact,
  type FormulaTableType,
  normalizeFormulaTableArtifact,
  validateAndBalanceFormulationRows,
} from "../../../components/chatNoteUtils";

/**
 * Hybrid R&D Detailed Table Generator endpoint.
 * Tries `gemini-2.5-flash` first (as requested for production), and cleanly falls back
 * to active Gemini Flash models if `gemini-2.5-flash` is unavailable on the key.
 */
const DETAILED_TABLE_MODELS = [
  "gemini-2.5-flash",
  "gemini-3.1-flash-lite",
  "gemini-4-hydrogen",
] as const;

const DETAILED_TABLE_TIMEOUT_MS = 18_000;

function raceTableTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`TABLE_GEN_TIMEOUT_${timeoutMs}MS`));
    }, timeoutMs);
    promise.then(
      (val) => {
        clearTimeout(timer);
        resolve(val);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

const FORMULATION_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Judul formulasi R&D profesional dalam Bahasa Indonesia.",
    },
    subtitle: {
      type: Type.STRING,
      description:
        "Ringkasan singkat target kulit, klaim utama, dan karakteristik sensori produk.",
    },
    columns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Wajib persis 5 kolom: ["Fase", "Nama Bahan & INCI", "Persentase (%)", "Fungsi Utama", "Catatan Teknis & Batas Aman"].',
    },
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      description:
        "8 hingga 12 baris bahan realistis lengkap dengan INCI, persentase akurat (total 100.00%), fungsi utama, dan catatan teknis/batas aman BPOM.",
    },
    specs: {
      type: Type.OBJECT,
      properties: {
        targetPh: {
          type: Type.STRING,
          description: "Rentang pH target yang stabil (misal: '5.2 – 5.6').",
        },
        texture: {
          type: Type.STRING,
          description:
            "Deskripsi tekstur & sensori (misal: 'Gel-cream ringan cepat meresap, tidak lengket').",
        },
        stabilityNote: {
          type: Type.STRING,
          description:
            "Catatan uji stabilitas, kompatibilitas emulsi, atau penyimpanan.",
        },
        bpomHalalNote: {
          type: Type.STRING,
          description:
            "Catatan kepatuhan batas aman BPOM & status kehalalan bahan.",
        },
      },
      required: ["targetPh", "texture", "stabilityNote", "bpomHalalNote"],
    },
    procedure: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "4 hingga 6 langkah prosedur pencampuran per fase lengkap dengan suhu pemanasan (°C), pengadukan, dan urutan pendinginan.",
    },
    notes: {
      type: Type.STRING,
      description:
        "Catatan tambahan R&D atau tips scale-up produksi singkat (opsional).",
    },
  },
  required: ["title", "subtitle", "columns", "rows", "specs", "procedure"],
};

const COMPARISON_RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: "Judul tabel perbandingan atau informasi R&D.",
    },
    subtitle: {
      type: Type.STRING,
      description: "Ringkasan konteks perbandingan.",
    },
    columns: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        "Kolom perbandingan mendalam (misal: ['Bahan / Aspek', 'Spesifikasi & Mekanisme', 'Kelebihan', 'Kekurangan', 'Rentang Dosis', 'Rekomendasi Penggunaan']).",
    },
    rows: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      description: "Minimal 5 hingga 8 baris perbandingan mendalam dan akurat.",
    },
    notes: {
      type: Type.STRING,
      description:
        "Kesimpulan teknis R&D dan rekomendasi pemilihan terbaik sesuai kebutuhan.",
    },
  },
  required: ["title", "subtitle", "columns", "rows", "notes"],
};

function parseTableType(raw: unknown): FormulaTableType {
  const lower = String(raw ?? "").toLowerCase().trim();
  if (lower === "comparison") return "comparison";
  if (lower === "general") return "general";
  return "formulation";
}

function buildPromptForDetailedTable(params: {
  topic: string;
  keyIngredients: string;
  constraints: string;
  tableType: FormulaTableType;
  conversationContext: string;
}): string {
  const { topic, keyIngredients, constraints, tableType, conversationContext } =
    params;

  const contextBlock = conversationContext
    ? `\nKONTEKS PERCAKAPAN SEBELUMNYA:\n${conversationContext}\n`
    : "";

  if (tableType === "formulation") {
    return [
      "Kamu adalah Senior Cosmetic R&D Formulation Chemist Formylab.ai yang ahli regulasi BPOM RI & sertifikasi Halal.",
      "Susun TABEL FORMULASI KOSMETIK R&D YANG SANGAT RINCI, REALISTIS, SIAP UJI LAB dalam Bahasa Indonesia (nama INCI resmi internasional).",
      "",
      `TOPIK / PRODUK: ${topic}`,
      keyIngredients
        ? `BAHAN AKTIF / UTAMA YANG DIMINTA: ${keyIngredients}`
        : "BAHAN AKTIF / UTAMA: Pilih kombinasi bahan aktif paling efektif sesuai topik.",
      constraints
        ? `BATASAN & TARGET KHUSUS: ${constraints}`
        : "BATASAN & TARGET KHUSUS: Aman untuk kulit Indonesia, BPOM & Halal friendly.",
      contextBlock,
      "SYARAT MUTLAK FORMULASI:",
      "1. WAJIB hasilkan antara 8 hingga 12 baris bahan realistis yang mencakup seluruh sistem formula lengkap:",
      "   - Fase A (Air): Deionized Water (Aqua) sebagai pelarut utama ad 100%, Humektan (misal Glycerin / Butylene Glycol / Propanediol), Chelating Agent (Disodium EDTA atau Sodium Phytate).",
      "   - Fase B (Minyak / Emulsi): Emulsifier spesifik dengan INCI jelas, Emolien / Oil ringan sesuai target kulit, Thickener/Stabilizer jika relevan.",
      "   - Fase C (Aktif & Pendinginan <40°C): Bahan aktif utama sesuai permintaan dengan dosis efektif ilmiah, Soothing/Barrier agent (misal Panthenol / Allantoin / Bisabolol / Centella), Pengawet spektrum luas BPOM (misal Phenoxyethanol & Ethylhexylglycerin), serta pH Adjuster (Citric Acid / Sodium Hydroxide / Triethanolamine jika diperlukan).",
      '2. WAJIB gunakan persis 5 kolom berikut: ["Fase", "Nama Bahan & INCI", "Persentase (%)", "Fungsi Utama", "Catatan Teknis & Batas Aman"].',
      "3. Total seluruh kolom 'Persentase (%)' HARUS tepat 100.00% (jangan sertakan baris 'Total' di dalam array `rows`).",
      "4. Sertakan objek `specs` lengkap (`targetPh`, `texture`, `stabilityNote`, `bpomHalalNote`).",
      "5. Sertakan array `procedure` berisi 4 sampai 6 langkah pembuatan berurutan per fase lengkap dengan suhu pemanasan (misal 70–75°C), teknik homogenisasi, dan suhu pendinginan (<40°C) sebelum penambahan Fase C & penyesuaian pH.",
    ].join("\n");
  }

  return [
    "Kamu adalah Senior Cosmetic R&D Analyst Formylab.ai.",
    `Susun TABEL ${tableType === "comparison" ? "PERBANDINGAN MENDALAM" : "ANALISIS R&D LENGKAP"} dalam Bahasa Indonesia yang terstruktur, objektif, dan teknis.`,
    "",
    `TOPIK: ${topic}`,
    keyIngredients ? `BAHAN / ITEM FOKUS: ${keyIngredients}` : "",
    constraints ? `KONTEKS / BATASAN: ${constraints}` : "",
    contextBlock,
    "SYARAT MUTLAK:",
    "1. Hasilkan minimal 5 hingga 8 baris data mendalam dan konkret (bukan poin dangkal).",
    "2. Gunakan kolom yang mencakup Spesifikasi/Mekanisme, Kelebihan, Kekurangan, Rentang Dosis/Angka, dan Rekomendasi Penggunaan.",
    "3. Sertakan `notes` berisi rekomendasi praktis R&D dan kepatuhan BPOM/Halal bila relevan.",
  ]
    .filter(Boolean)
    .join("\n");
}

function parseJsonSafely(text: string): Record<string, unknown> | null {
  const trimmed = (text || "").trim();
  if (!trimmed) return null;
  try {
    return JSON.parse(trimmed) as Record<string, unknown>;
  } catch {
    const fenced = trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      return JSON.parse(fenced) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error: "GEMINI_API_KEY tidak tersedia di server.",
        },
        { status: 500 }
      );
    }

    let topic = "";
    let keyIngredients = "";
    let constraints = "";
    let tableType: FormulaTableType = "formulation";
    let conversationContext = "";

    try {
      const body = await req.json();
      topic = typeof body?.topic === "string" ? body.topic.trim().slice(0, 240) : "";
      keyIngredients =
        typeof body?.key_ingredients === "string"
          ? body.key_ingredients.trim().slice(0, 320)
          : typeof body?.keyIngredients === "string"
            ? body.keyIngredients.trim().slice(0, 320)
            : "";
      constraints =
        typeof body?.constraints === "string"
          ? body.constraints.trim().slice(0, 420)
          : "";
      tableType = parseTableType(body?.table_type ?? body?.tableType);
      conversationContext =
        typeof body?.conversationContext === "string"
          ? body.conversationContext.trim().slice(0, 2000)
          : "";
    } catch {
      return NextResponse.json(
        { success: false, error: "Payload JSON tidak valid." },
        { status: 400 }
      );
    }

    if (!topic || topic.length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: "Parameter `topic` wajib diisi untuk menyusun tabel R&D.",
        },
        { status: 400 }
      );
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = buildPromptForDetailedTable({
      topic,
      keyIngredients,
      constraints,
      tableType,
      conversationContext,
    });

    const schema =
      tableType === "formulation"
        ? FORMULATION_RESPONSE_SCHEMA
        : COMPARISON_RESPONSE_SCHEMA;

    const attemptErrors: string[] = [];
    const deadlineMs = Date.now() + DETAILED_TABLE_TIMEOUT_MS;

    for (const model of DETAILED_TABLE_MODELS) {
      const remainingMs = deadlineMs - Date.now();
      if (remainingMs < 2500) break;

      try {
        const response = await raceTableTimeout(
          ai.models.generateContent({
            model,
            contents: prompt,
            config: {
              responseMimeType: "application/json",
              responseSchema: schema,
            },
          }),
          remainingMs
        );

        const parsed = parseJsonSafely(response.text || "");
        if (!parsed) {
          attemptErrors.push(`[${model}] Respons JSON kosong atau tidak valid.`);
          continue;
        }

        const rawColumns = Array.isArray(parsed.columns)
          ? parsed.columns.map((c) => String(c ?? "").trim()).filter(Boolean)
          : [];
        const rawRows = Array.isArray(parsed.rows)
          ? parsed.rows
              .filter((r) => Array.isArray(r))
              .map((r) =>
                (r as unknown[]).map((cell) => String(cell ?? "").trim())
              )
              .filter((r) => r.some((cell) => cell.length > 0))
          : [];

        if (rawRows.length === 0) {
          attemptErrors.push(`[${model}] Array rows kosong.`);
          continue;
        }

        let finalColumns =
          tableType === "formulation"
            ? FORMULATION_REQUIRED_COLUMNS
            : rawColumns.length > 0
              ? rawColumns
              : [
                  "Aspek / Item",
                  "Spesifikasi",
                  "Kelebihan",
                  "Kekurangan",
                  "Rentang Dosis",
                  "Rekomendasi",
                ];

        if (
          tableType === "formulation" &&
          rawColumns.length === 5 &&
          rawColumns.every((c) => c.length > 0)
        ) {
          finalColumns = FORMULATION_REQUIRED_COLUMNS;
        }

        let finalRows = rawRows.map((row) =>
          finalColumns.map((_, idx) => row[idx] ?? "-")
        );
        let totalPercentage: string | undefined = undefined;

        if (tableType === "formulation") {
          const balanced = validateAndBalanceFormulationRows(
            finalColumns,
            finalRows
          );
          finalRows = balanced.rows;
          totalPercentage = balanced.totalPercentage;
        }

        const artifact: FormulaTableArtifact | null =
          normalizeFormulaTableArtifact({
            title: String(parsed.title ?? "").trim() || topic,
            subtitle:
              typeof parsed.subtitle === "string"
                ? parsed.subtitle.trim()
                : undefined,
            tableType,
            columns: finalColumns,
            rows: finalRows,
            totalPercentage,
            specs: parsed.specs,
            procedure: parsed.procedure,
            notes:
              typeof parsed.notes === "string" ? parsed.notes.trim() : undefined,
          });

        if (!artifact) {
          attemptErrors.push(`[${model}] Gagal normalisasi artefak tabel.`);
          continue;
        }

        return NextResponse.json(
          {
            ok: true,
            success: true,
            table: artifact,
            model,
          },
          { status: 200 }
        );
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        attemptErrors.push(`[${model}] ${msg.slice(0, 180)}`);
      }
    }

    return NextResponse.json(
      {
        ok: false,
        success: false,
        error:
          attemptErrors.join(" | ") ||
          "Gagal menghasilkan tabel R&D terperinci dari server.",
      },
      { status: 200 }
    );
  } catch (err: unknown) {
    return NextResponse.json(
      {
        ok: false,
        success: false,
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 200 }
    );
  }
}
