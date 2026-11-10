# AI Chat Consultant (Gemini & GPT Dual-Engine)

Fitur halaman khusus chat bot cerdas pada menu Dashboard formylab.ai yang ditenagai oleh dual model: **Gemini (Gemini 3.8 Flash built-in via `@google/genai`)** dan **GPT (OpenAI / OpenRouter Compatible API)** dengan pemilih model (*model selector*). Chatbot ini bertindak sebagai **konsultan ahli kimia kosmetik & formulator R&D** sekaligus **asisten percakapan umum**.

---

## Keputusan Kunci & Konfirmasi Pengguna

> [!IMPORTANT]
> Berdasarkan jawaban klarifikasi yang telah Anda pilih:
> - **Lokasi Chat**: Halaman khusus di menu Dashboard (`/chat`) yang terhubung langsung melalui kartu baru di menu utama Dashboard.
> - **Dukungan Dual-Model**: Pengguna dapat memilih secara dinamis antara **Gemini 3.8 Flash** (langsung aktif otomatis di server tanpa perlu konfigurasi tambahan) dan **GPT** (didukung via server endpoint dengan fallback pintar dan modal pengaturan API key jika ingin menggunakan key OpenAI sendiri).
> - **Persona Ganda**: Menggabungkan keahlian mendalam formulasi skincare tropis, kestabilan emulsi, HLB, pH, bahan halal LPPOM MUI, dan interaksi percakapan natural untuk kebutuhan umum.

---

## 1. Ringkasan & Konsep Utama

- **Tujuan**: Memberikan ruang konsultasi interaktif bagi formulator dan peneliti laboratorium untuk mendiskusikan ide formula, substitusi bahan alergen, kecocokan kulit sensitif (rosacea, jerawat, barrier repair), serta pertanyaan umum sehari-hari secara fleksibel.
- **Dua Model dalam Satu Interface**:
  - `Gemini 3.8 Flash` (Model cepat, komprehensif, langsung siap pakai dengan zero configuration).
  - `GPT-4o Mini / GPT-3.5` (Disediakan opsi toggle dan input API key opsional untuk fleksibilitas perbandingan jawaban antar engine AI).
- **Akses Langsung**: Tersedia kartu navigasi baru **"AI R&D Consultant"** di halaman `/dashboard`, serta tombol navigasi cepat kembali ke Dashboard, Formulate, dan Library.

---

## 2. Pengalaman Pengguna & Desain Visual (UI/UX)

- **Layout Konsol Percakapan**:
  - **Header Navigasi**: Logo formylab.ai, tombol kembali ke Dashboard, badge status model aktif, dan toggle Model Selector (`Gemini 3.8 Flash` ↔ `GPT`).
  - **Area Percakapan (Chat Stream & Bubbles)**:
    - Bubble pesan pengguna dengan aksen hijau tua formylab yang kontras dan bersih.
    - Bubble respons AI dengan Markdown terstruktur (tabel bahan, poin-poin konsentrasi %, tips pH & kestabilan).
    - Indikator model badge pada setiap balasan (`Gemini 3.8 Flash` atau `GPT`).
    - Tombol *Copy response* dan *Clear chat*.
  - **Quick Topic Prompts (Inspirasi Cepat)**:
    - *"Bagaimana meracik moisturizer untuk kulit rosacea di iklim lembap?"*
    - *"Substitusi pengawet paraben yang aman dan bersertifikat Halal"*
    - *"Hitung estimasi HLB untuk emulsi krim tipe O/W"*
    - *"Apa perbedaan mendasar antara Ceramide NP dan Niacinamide?"*
  - **Input Bar**:
    - Input teks multi-baris yang responsif dengan tombol kirim bertombol ikon send, shortcut `Enter` untuk mengirim, dan `Shift + Enter` untuk baris baru.
    - Opsi modal ringan untuk memasukkan Custom OpenAI API Key (tersimpan secara aman di browser `localStorage`, tidak pernah di-hardcode).

---

## 3. Arsitektur Teknis & Alur Data

```
┌─────────────────────────────────────────────────────────────┐
│                       /dashboard                            │
│  [ New Formulation ]   [ Ingredient Library ]   [ AI Chat ] │
└──────────────────────────────────────┬──────────────────────┘
                                       │ (klik "Consult AI")
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                      /chat (Page)                           │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Model Selector: [ Gemini 3.8 Flash (Active) | GPT ]   │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Chat History & Markdown Response Renderer             │  │
│  └───────────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Quick Chemistry Prompts & Auto-expanding Input        │  │
│  └───────────────────────────────────┬───────────────────┘  │
└──────────────────────────────────────┼──────────────────────┘
                                       │ POST /api/chat
                                       ▼
┌─────────────────────────────────────────────────────────────┐
│                    /app/api/chat/route.ts                   │
│                                                             │
│   ├── If model === "gemini":                                │
│   │   Calls @google/genai (gemini-3.8-flash)                │
│   │   System Instruction: Skincare R&D Chemist & Advisor    │
│   │                                                         │
│   └── If model === "gpt":                                   │
│       Calls OpenAI chat completions API                     │
│       (menggunakan server key atau user-supplied key)       │
│       System Instruction yang sama untuk konsistensi        │
└─────────────────────────────────────────────────────────────┘
```

- **Dependencies**: Menggunakan SDK `@google/genai` resmi versi terbaru yang dieksekusi di sisi server (`app/api/chat/route.ts`).
- **Keamanan Kunci**: Kunci API Gemini menggunakan `process.env.GEMINI_API_KEY` di server. API key GPT opsional dikirim via header privat tanpa disimpan di disk.

---

## 4. Langkah Pelaksanaan

1. **Instalasi Package**: Memasang `@google/genai` untuk Next.js server-side route.
2. **Backend API Route (`/app/api/chat/route.ts`)**:
   - Menerima array `messages` dan pilihan `model` (`gemini` atau `gpt`).
   - Menyuntikkan instruksi sistem persona ahli kimia kosmetik tropis & asisten umum.
   - Menghubungkan ke `ai.models.generateContent` untuk Gemini dan endpoint kompatibel OpenAI untuk GPT.
3. **Pembaruan Dashboard (`/app/dashboard/page.tsx`)**:
   - Menambahkan kartu menu ke-3 yang sejajar dan serasi: **"AI Chemist Chat"** dengan icon bot dan deskripsi kemampuan tanya-jawab formulasi.
4. **Halaman Chat Interaktif (`/app/chat/page.tsx`)**:
   - Membangun interface percakapan elegan bernuansa formylab.ai (warna menthe, navy, dan brume).
   - Dilengkapi pemilih model Gemini vs GPT, riwayat pesan, format jawaban terstruktur, quick prompts, dan tombol reset obrolan.
5. **Verifikasi & Pengujian**:
   - Menjalankan kompilasi Next.js (`compile_applet`) dan linting (`lint_applet`).
   - Melakukan uji percakapan di browser headless untuk memastikan pergantian model Gemini dan GPT bekerja dengan mulus.
