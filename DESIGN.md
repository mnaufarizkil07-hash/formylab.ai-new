# Formylab.ai — Design Direction (DESIGN.md)

## 1. Product & Visual Identity
- **Product:** Formylab.ai — AI Co-Pilot Formulasi Skincare untuk tim R&D maklon & produsen kosmetik.
- **Audience:** Tim R&D maklon, cosmetic chemist, dan produsen skincare profesional.
- **Visual Language:** Clean Clinical Swiss-Editorial Light Theme dengan aksen Optical Glass (Clear + soft Blur).
- **Dial:** ENERGY 2 / RHYTHM 3 / MOTION 2

| Parameter | Level | Keterangan |
| :--- | :---: | :--- |
| **ENERGY** | `2` | Tenang, klinis, presisi, tetap terasa modern dan hidup |
| **RHYTHM** | `3` | Komposisi antar-section bervariasi (WebGL Hero, kartu kaca, editorial list, matrix, 4 pillars, centered CTA) |
| **MOTION** | `2` | Halus 60fps, fokus pada atmosfer cahaya, scroll choreography huruf, dan visualisasi molekuler |

---

## 2. Core Color System (Locked)

### Canvas
| Role | Hex | Penggunaan |
| :--- | :--- | :--- |
| **Pure White** | `#ffffff` | Latar utama & permukaan area data padat |
| **Soft Mint Tint (Primary)** | `#f8fdfb` | Variasi latar halus untuk pemisahan seksi |
| **Soft Mint Tint (Secondary)** | `#f4fbf8` | Latar pendukung dengan nuansa klinis segar |

### Typography Ink
| Role | Hex | Penggunaan |
| :--- | :--- | :--- |
| **Deep Forest Ink** | `#0B2B26` | Teks utama, judul, tombol, dan angka penting |
| **Secondary Ink** | `#2E524C` | Teks sekunder, label, dan deskripsi pendukung |
| **Accent Teal** | `#0E807E` | Aksen teks interaktif, tautan, dan sorotan klinis |

### Brand Spectrum (Atmospheric Light & Particles)
Digunakan khusus untuk pencahayaan atmosferik (`AmbientBioluminescence`) dan partikel visual (`ParticleSphere`).

| Warna | Hex |
| :--- | :--- |
| **Aqua** | `#3FC6C5` |
| **Mint Teal** | `#47C4A5` |
| **Soft Green** | `#89D78C` |
| **Lime Green** | `#ADE180` |
| **Lemon Lime** | `#D9ED91` |

---

## 3. Typography & Surface Geometry
- **Primary Typeface:** `DM Sans` — dipilih karena bentuk geometris bersih dan keterbacaan klinis tinggi untuk data formulasi.
- **Heading Weight:** `font-weight: 500` (Medium) di seluruh halaman untuk kesan editorial rapi.
- **Numbers & Indexing:** `font-sans tabular-nums` (bukan monospace slashed-zero) untuk penomoran langkah & modul.
- **Brand Wordmark:** `BrandLogo.tsx` (`Plus Jakarta Sans` ExtraBold `800` + ikon labu Erlenmeyer SVG) — status final.
- **Corner Radius Hierarchy:** Tombol `rounded-full`, kartu `rounded-[16px]`, input form `rounded-[12px]`.
- **Elevation Model:** Flat hairline (`border-[#0B2B26]/10`) dan *inset specular rim* untuk elemen kaca; tanpa *outer drop-shadow* atau *neon glow*.

---

## 4. Owner-Approved Visual Decisions (R-37 Recorded Overrides)

### 4.1 Optical Glass Buttons (R-10 Override)
- Seluruh tombol interaktif menggunakan kelas `.btn-glass-primary`, `.btn-glass-secondary`, dan `.btn-glass-compact`.
- Karakter material: bentuk `rounded-full`, kombinasi kejernihan *Clear + soft Blur*, *inset specular rim*, teks `#0B2B26`, tanpa *outer drop-shadow*.

### 4.2 Selective Glass Surfaces (R-10 & R-09 Override)
- **Permukaan Optical Glass (`.card-glass-optical` & `.eyebrow-liquid-glass`):**
  - 3 kartu Overview, 4 kartu AI Pillars, kartu Login/Register, Hero Workspace, dan kapsul eyebrow Hero (`.eyebrow-liquid-glass`, dipakai fungsional untuk memisahkan teks dari partikel di belakangnya).
- **Permukaan Putih Crisp Non-Transparan (`#ffffff`):**
  - Tabel bahan (*Ingredient Library*), Workflow `STEP 01–08`, Formula `A / B / C`, dan panel percakapan `AI Chemist`.

### 4.3 Motion & 3D Architecture (Motion Stack Decision)
- Menggunakan arsitektur animasi ringan 60fps berbasis `requestAnimationFrame` & WebGL custom tanpa *smooth-scroll engine* eksternal (tanpa GSAP, Lenis, maupun Locomotive Scroll).
- Komponen inti eksisting: `ParticleSphere.tsx`, `AmbientBioluminescence.tsx`, `ScrollColorText.tsx`, `Molecule3DViewer`, dan `LivingLabBackground`.