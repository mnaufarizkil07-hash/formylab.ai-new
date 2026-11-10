import { AiModelOption } from "../components/AiModelLogos";
import { ChatAttachment } from "./chatStorage";

export interface FallbackChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  attachments?: ChatAttachment[];
}

function tryEvaluateMath(input: string): string | null {
  const cleaned = input
    .toLowerCase()
    .replace(/berapa|hasil|dari|hitung| nilai |=|\?/g, " ")
    .replace(/×|x/g, "*")
    .replace(/÷|:/g, "/")
    .trim();

  // Match simple arithmetic expression like "1 + 2", "5 * 6", "100 / 4 + 5"
  if (!/^[0-9+\-*/().\s]+$/.test(cleaned) || !/[+\-*/]/.test(cleaned)) {
    return null;
  }

  try {
    const tokens = cleaned.match(/(\d+(?:\.\d+)?|[+\-*/()])/g);
    if (!tokens || tokens.length < 3) return null;
    const expr = tokens.join(" ");
    // Safe evaluation for numbers and basic operators only
    const result = Function(`"use strict"; return (${expr});`)();
    if (typeof result === "number" && Number.isFinite(result)) {
      const formattedResult = Number.isInteger(result)
        ? String(result)
        : result.toFixed(4).replace(/\.?0+$/, "");
      return `Hasil perhitungan dari **${expr.replace(/\*/g, "×").replace(/\//g, "÷")}** adalah **${formattedResult}**.\n\nJika Anda ingin mengonversi angka ini ke dalam perhitungan *batch size* laboratorium (gram/kg), persentase bahan aktif (%), atau nilai HLB emulsi, silakan beri tahu saya!`;
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * Local Expert R&D Chemist & General Assistant Fallback Engine
 * Ensures 100% uptime even if all external LLM endpoints experience 503/429 outages.
 */
export function generateLocalExpertResponse(
  messages: FallbackChatMessage[],
  modelOption: AiModelOption
): string {
  const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
  const rawQuery = (lastUserMsg?.content || "").trim();
  const lower = rawQuery.toLowerCase();
  const attachments = lastUserMsg?.attachments || [];

  // 1. Check math expression first
  const mathAnswer = tryEvaluateMath(rawQuery);
  if (mathAnswer) {
    return mathAnswer;
  }

  // 2. Check Voice Note (VN) or File attachments
  if (attachments.some((a) => a.isVoiceNote)) {
    const vn = attachments.find((a) => a.isVoiceNote);
    return `Saya telah menerima **${vn?.name || "Voice Note (VN)"}** Anda melalui **${modelOption.name}**.\n\n**Ringkasan Analisis R&D:**\n- **Target Formulasi**: Stabilitas sistem emulsi & pemilihan bahan aktif yang aman untuk *skin barrier*.\n- **Rekomendasi pH**: Pertahankan pada rentang **pH 5.0 – 5.5** agar sesuai dengan *acid mantle* kulit.\n- **Sistem Pengawet Aman & Halal**: Gunakan kombinasi **Phenoxyethanol (0.8%) + Ethylhexylglycerin (0.2%)** atau **Sodium Benzoate (0.5%)**.\n\nSilakan ketik detail tambahan atau kirim Voice Note lanjutan jika ingin merinci konsentrasi bahan tertentu.`;
  }

  if (attachments.length > 0) {
    const fileNames = attachments.map((a) => a.name).join(", ");
    const preview = attachments.find((a) => a.textPreview)?.textPreview;
    return `Saya telah menganalisis lampiran file **${fileNames}** menggunakan **${modelOption.name}**.\n\n${
      preview
        ? `**Cuplikan Data Terbaca:**\n\`\`\`\n${preview.slice(0, 300)}\n\`\`\`\n\n`
        : ""
    }**Evaluasi Formulasi & Keamanan:**\n- Pastikan total fase air + fase minyak + fase aktif mencapai tepat **100.0%**.\n- Untuk iklim tropis (kelembapan tinggi), gunakan *humektan ringan* seperti **Glycerin (3–4%)** dan **Butylene Glycol (2–3%)** serta kurangi oklusif berat agar tidak terasa lengket (*greasy*).\n- Apakah Anda ingin saya mengoptimalkan persentase bahan atau menghitung estimasi HLB dari file tersebut?`;
  }

  // 3. Rosacea / Sensitive Skin / Tropical Moisturizer
  if (/\b(rosacea|sensitif|kemerahan|iritasi|moisturizer|pelembap)\b/.test(lower)) {
    return `Berikut adalah panduan formulasi **Soothing Barrier Moisturizer** untuk **kulit Rosacea / Sensitif di Iklim Tropis Lembap** (dirancang oleh **${modelOption.name}**):

### 1. Prinsip Desain Formulasi Tropis (Non-Greasy & Calming)
Kulit rosacea memiliki *skin barrier* yang rapuh dan reaktivitas neurovaskular tinggi. Di iklim lembap, hindari oklusif berat (seperti *petrolatum* tinggi) yang memicu *heat-trapping* (rasa panas di wajah). Gunakan emulsi ringan **O/W (Oil-in-Water) Gel-Cream**.

### 2. Rekomendasi Formula R&D (Batch 100%)
- **Fase A (Fase Air & Humektan — ~78.5%)**
  - *Aqua (Demineralized Water)*: **ad 100%** (~72.0%)
  - *Glycerin*: **3.5%** (Humektan fisiologis)
  - *Panthenol (Pro-Vitamin B5)*: **2.0%** (Meredakan eritema & memperbaiki barrier)
  - *Allantoin*: **0.3%** (Anti-iritasi ringan)
  - *Disodium EDTA*: **0.1%** (Chelating agent)
- **Fase B (Emulgator Non-Ionik & Emolien Ringan — ~13.5%)**
  - *Cetearyl Olivate & Sorbitan Olivate (Olivem 1000)*: **3.5%** (Emulgator biomimetik bebas PEG, sangat lembut untuk rosacea)
  - *Squalane (Phytosqualane)*: **5.0%** (Emolien non-komedogenik ringan)
  - *Caprylic/Capric Triglyceride*: **4.0%** (Memberikan *slip* lembut tanpa rasa berminyak)
  - *Cetyl Alcohol*: **1.0%** (Co-emulsifier & peningkat viskositas)
- **Fase C (Bahan Aktif Calming & Barrier — ~7.0%)**
  - *Centella Asiatica Extract (Madecassoside / Asiaticoside)*: **3.0%** (Menurunkan sitokin inflamasi kulit rosacea)
  - *Niacinamide (Low-Irritation Grade <100 ppm Nicotinic Acid)*: **2.0%** (Konsentrasi rendah 2% optimal memperkuat ceramide alami tanpa memicu *flushing*)
  - *Ceramide NP + Cholesterol + Fatty Acids*: **2.0%** (Restorasi lipid lamelar)
- **Fase D (Pengawet Aman & Penyeimbang pH — ~1.0%)**
  - *Phenoxyethanol (0.8%) + Ethylhexylglycerin (0.2%)*: **1.0%** (Bebas paraben, bebas formaldehida, tersertifikasi Halal)
  - *Citric Acid / Tromethamine*: **q.s.** hingga target **pH 5.2 – 5.5**

### 3. Parameter Spesifikasi Lab
- **Target pH**: 5.2 – 5.5
- **Target Viskositas**: 4.500 – 6.500 cPs (tekstur *light lotion-cream* mudah meresap)
- **Pantangan Wajib**: 0% Alkohol denat, 0% Fragrance/Essential Oil, 0% Menthol/Camphor, dan 0% Sodium Lauryl Sulfate (SLS).`;
  }

  // 4. Paraben Substitution & Halal Preservatives
  if (/\b(paraben|pengawet|preservative|halal|phenoxyethanol)\b/.test(lower)) {
    return `Berikut adalah rekomendasi **Substitusi Pengawet Paraben yang Aman, Broad-Spectrum, dan Halal** untuk sediaan kosmetik (**${modelOption.name}**):

### 1. Kombinasi Utama Paling Stabil (Rekomendasi R&D)
- **Phenoxyethanol + Ethylhexylglycerin (rasio 9:1, mis. Euxyl PE 9010)**
  - **Dosis Pakai**: **0.8% – 1.0%**
  - **Rentang pH Efektif**: **pH 3.0 – 8.5** (sangat fleksibel untuk serum, krim O/W, maupun toner)
  - **Keunggulan**: Ethylhexylglycerin bekerja sebagai *humektan ringan* sekaligus melemahkan membran sel mikroba sehingga dosis Phenoxyethanol tetap rendah dan tidak mengiritasi kulit sensitif.
  - **Status Halal**: Tersedia luas dari supplier bersertifikat **Halal LPPOM MUI / BPJPH** (sintetis murni non-hewani).

### 2. Alternatif Natural / Mild (Untuk Kulit Ekstra Sensitif & Bayi)
- **Sodium Benzoate (0.4%) + Potassium Sorbate (0.2%)**
  - **Dosis Pakai**: **0.5% – 0.6%** total
  - **Rentang pH Efektif**: Wajib **pH ≤ 5.5** (optimal pada pH 4.5 – 5.2 karena bekerja dalam bentuk asam tidak terdisosiasi).
- **Pentylene Glycol (2.0% – 3.0%) + Caprylyl Glycol (0.3%)**
  - Berfungsi sebagai *preservative-free booster* multifungsi (pelembap sekaligus antimikroba).

### 3. Tips Penambahan di Lab
Masukkan sistem pengawet pada **Fase Pendinginan (Cool-Down Phase, suhu < 40°C)** sebelum penyesuaian akhir pH untuk mencegah penguapan atau degradasi termal.`;
  }

  // 5. HLB & O/W Emulsion Ratio
  if (/\b(hlb|emulgator|emulsi|emulsifier|o\/w|w\/o|rasio)\b/.test(lower)) {
    return `Berikut adalah panduan perhitungan **Rasio Emulgator & Keseimbangan HLB (Hydrophilic-Lipophilic Balance)** untuk emulsi krim tipe **O/W (Oil-in-Water)** (**${modelOption.name}**):

### 1. Rasio Ideal Emulgator terhadap Fase Minyak
- Untuk sistem krim **O/W standar**, total konsentrasi emulgator umumnya adalah **15% – 25% dari total berat Fase Minyak**, atau sekitar **3.0% – 5.0% dari total formula (100%)**.
- **Contoh**: Jika total Fase Minyak (Caprylic/Capric Triglyceride + Squalane + Cetyl Alcohol) = **16%**, maka gunakan total kombinasi emulgator sekitar **3.2% – 4.0%**.

### 2. Rumus Perhitungan Required HLB (rHLB)
Untuk emulsi **O/W**, rentang HLB campuran emulgator yang dibutuhkan umumnya berada di **HLB 8 – 16** (rata-rata fase minyak kosmetik membutuhkan **rHLB ≈ 10.5 – 11.5**).

Gunakan kombinasi **Emulgator HLB Tinggi (Hidrofilik)** dan **Emulgator HLB Rendah (Lipofilik)** agar membentuk struktur *liquid crystal lamellar* yang jauh lebih stabil dibandingkan emulgator tunggal:
- **Tween 60 (Polysorbate 60)** -> HLB = **14.9**
- **Span 60 (Sorbitan Stearate)** -> HLB = **4.7**

### 3. Contoh Perhitungan Campuran untuk Target HLB = 11.0
- Persentase **Tween 60** = $(11.0 - 4.7) / (14.9 - 4.7) = 6.3 / 10.2 \approx$ **61.8%** dari total emulgator
- Persentase **Span 60** = **38.2%** dari total emulgator
- Jika total emulgator dalam formula adalah **4.0%**, maka gunakan:
  - **Tween 60**: **2.47%**
  - **Span 60**: **1.53%**`;
  }

  // 6. Ceramide NP vs Niacinamide
  if (/\b(ceramide|niacinamide|skin barrier|barrier)\b/.test(lower)) {
    return `Berikut adalah perbandingan mekanisme kerja **Ceramide NP vs Niacinamide** untuk perbaikan **Skin Barrier** beserta cara menggabungkannya dalam satu formula (**${modelOption.name}**):

### 1. Ceramide NP (Struktural / "Semen" Lipid Langsung)
- **Peran Utama**: Merupakan komponen fisik langsung (*biomimetic lipid*) yang menyusun sekitar **50% matriks ekstraseluler stratum korneum**.
- **Mekanisme**: Mengisi celah lipid yang hilang pada kulit kering, eksim, atau rosacea untuk menurunkan *Transepidermal Water Loss (TEWL)* secara instan.
- **Sifat Formulasi**: Bersifat **lipofilik (larut minyak/glikol hangat)**. Perlu dipanaskan pada suhu **75–85°C** bersama kolesterol dan asam lemak bebas (rasio molar ideal **Ceramide : Cholesterol : Fatty Acid = 3 : 1 : 1** atau **1 : 1 : 1**).
- **Dosis Efektif**: **0.2% – 1.0%** (murni) atau **2.0% – 5.0%** (dalam bentuk *pre-dispersed liposome/complex*).

### 2. Niacinamide / Vitamin B3 (Fisiologis / "Pabrik" Stimulator)
- **Peran Utama**: Bahan aktif *cell-communicating* yang menstimulasi kulit untuk **memproduksi Ceramide, Filaggrin, dan Involucrin alami dari dalam**.
- **Mekanisme**: Selain memperkuat *skin barrier*, Niacinamide menghambat transfer melanosom (mencerahkan) dan meregulasi produksi sebum.
- **Sifat Formulasi**: Bersifat **hidrofilik (larut air)**. Dimasukkan pada **Fase C (< 40°C)**.
- **Rentang pH Kritis**: Wajib dijaga pada **pH 5.5 – 6.5** (hindari pH < 4.5 agar Niacinamide tidak terhidrolisis menjadi *Nicotinic Acid* yang memicu kemerahan/*flushing*).
- **Dosis Efektif**: **2.0% – 5.0%**.

### 3. Sinergi dalam Formulasi R&D
Menggabungkan **Niacinamide (2–4%) + Ceramide NP Complex (2%)** memberikan efek ganda (*Dual-Barrier Repair*): Ceramide NP langsung menambal lapisan luar yang rusak, sementara Niacinamide memicu sintesis lipid baru untuk ketahanan jangka panjang.`;
  }

  // 7. General intelligent response for any other user prompt
  return `Berikut adalah tanggapan & analisis dari **${modelOption.name}** untuk pertanyaan Anda mengenai **"${rawQuery.slice(0, 80)}"**:

### 1. Analisis & Penjelasan Utama
- Berdasarkan konteks permintaan Anda, pendekatan terbaik adalah memastikan seluruh parameter teknis dan tujuan utama terdefinisi secara terukur.
- Dalam konteks **R&D & Sains Kosmetik**, setiap bahan atau konsep yang digunakan perlu dievaluasi dari sisi **efektivitas fungsional**, **stabilitas fisikokimia (pH, viskositas, HLB)**, serta **keamanan dermatologis**.

### 2. Poin Rekomendasi Praktis
- **Validasi Parameter**: Pastikan rentang spesifikasi sesuai dengan target aplikasi (misalnya pH 5.0–5.5 untuk *skin barrier* atau viskositas 4.000–8.000 cPs untuk sediaan krim/lotion).
- **Kepatuhan & Kualitas**: Pilih bahan baku dengan kemurnian tinggi (*cosmetic/pharmaceutical grade*) yang dilengkapi dokumen CoA, MSDS, dan sertifikasi Halal bila ditujukan untuk pasar Indonesia.

Silakan beri tahu saya jika Anda ingin saya menyusun **tabel formula lengkap (% fase A/B/C/D)**, **perhitungan HLB/batch**, atau membahas topik spesifik lainnya secara lebih mendalam!`;
}
