"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  LogIn,
  FlaskConical,
  Atom,
  ShieldCheck,
  Cpu,
  Layers,
  CheckCircle2,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";

const FOOTER_LINKS = [
  { href: "/about", label: "ABOUT US" },
  { href: "/careers", label: "CAREERS" },
  { href: "/trust", label: "TRUST" },
  { href: "/faq", label: "FAQ" },
];

export default function AboutPage() {
  const pathname = usePathname();

  return (
    <div className="min-h-screen relative flex flex-col justify-between font-sans bg-[#ffffff] text-[#0B2B26] overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:inline-flex focus:items-center focus:min-h-[44px] focus:px-5 focus:py-2.5 focus:rounded-full focus:bg-[#0B2B26] focus:text-white focus:text-[13px] focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#0E807E] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* CRISP FROSTED WHITE NAVBAR */}
      <header className="sticky top-0 z-40 w-full h-[80px] bg-white/85 backdrop-blur-md border-b border-[#0B2B26]/10">
        <div className="max-w-7xl h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/"
              className="flex items-center min-h-[44px] shrink-0 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
              aria-label="Formylab.ai Home"
            >
              <BrandLogo variant="light" size="sm" />
            </Link>

            <Link
              href="/"
              className="btn-glass-compact group hidden sm:inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-[12px] tracking-[0.04em]"
            >
              <ArrowLeft
                aria-hidden="true"
                className="w-3.5 h-3.5 text-[#0E807E] transition-transform duration-300 group-hover:-translate-x-0.5"
              />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <Link
              href="/?auth=register"
              className="btn-glass-secondary hidden sm:inline-flex items-center justify-center min-h-[44px] px-5 py-2.5 text-[12px] uppercase tracking-[0.1em] whitespace-nowrap"
            >
              <span>CREATE ACCOUNT</span>
            </Link>
            <Link
              href="/?auth=login"
              className="btn-glass-primary group inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6 py-2.5 text-[12px] uppercase tracking-[0.1em] whitespace-nowrap"
            >
              <LogIn
                aria-hidden="true"
                className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5"
              />
              <span>LOGIN</span>
            </Link>
          </div>
        </div>
      </header>

      {/* MAIN EDITORIAL CONTENT */}
      <main id="main-content" className="relative z-10 flex-1">
        {/* SECTION 1: 2-COLUMN EDITORIAL OVERVIEW */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-12 md:pb-16">
          <div className="mb-6 sm:hidden">
            <Link
              href="/"
              className="btn-glass-compact inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-[12px] tracking-[0.04em]"
            >
              <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
            {/* LEFT COLUMN: Editorial Narrative (Who We Are & Our Mission) */}
            <div className="lg:col-span-7 space-y-8">
              <div>
                <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-3">
                  ABOUT FORMYLAB.AI
                </p>
                <h1
                  className="text-[36px] sm:text-[50px] font-medium text-[#0B2B26] leading-[1.06] tracking-[-0.04em]"
                  style={{ textWrap: "balance" }}
                >
                  What is Formylab.ai?
                </h1>
              </div>

              {/* Subbagian 1: Who We Are */}
              <div className="space-y-3">
                <h2 className="text-[22px] sm:text-[24px] font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.025em]">
                  Who We Are
                </h2>
                <p className="text-[15.5px] sm:text-[16px] text-[#2E524C] leading-[1.6]">
                  <span className="font-medium text-[#0B2B26]">Formylab.ai</span> adalah{" "}
                  <span className="font-medium text-[#0B2B26]">
                    AI Formulation Co-Pilot &amp; regulatory intelligence platform
                  </span>{" "}
                  untuk tim R&amp;D kosmetik dan pabrik maklon di Indonesia serta kawasan ASEAN.
                  Kami menyatukan penerjemahan brief klien brand menjadi spesifikasi kimia presisi,
                  database bahan baku 3D tervalidasi, serta penyaringan kepatuhan regulasi BPOM dan
                  sertifikasi Halal MUI/BPJPH dalam satu ruang kerja terintegrasi.
                </p>
              </div>

              {/* Subbagian 2: Our Mission */}
              <div className="space-y-3 pt-2 border-t border-[#0B2B26]/10">
                <h2 className="text-[22px] sm:text-[24px] font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.025em]">
                  Our Mission
                </h2>
                <p className="text-[15.5px] sm:text-[16px] text-[#2E524C] leading-[1.6]">
                  Mempercepat siklus R&amp;D formulasi kosmetik dengan data kimia real-time,
                  kalkulasi HPP dan MOQ yang transparan dari stok supplier lokal, serta kepatuhan
                  regulasi yang terukur sejak draft pertama sebelum masuk ke meja trial
                  laboratorium.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/formulate"
                  className="btn-glass-primary group inline-flex items-center justify-center gap-2 min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.08em]"
                >
                  <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Open AI Formulator</span>
                </Link>
                <Link
                  href="/library"
                  className="btn-glass-secondary inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3.5 text-[12px] uppercase tracking-[0.08em]"
                >
                  <Atom aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Explore 3D Ingredient Library</span>
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: Formylab.ai Editorial Visual Panel (.card-glass-optical over soft radial mint-emerald glow) */}
            <div className="lg:col-span-5 relative py-4">
              {/* Soft Radial Mint-Emerald Accent that dissolves smoothly to transparent */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 z-0"
                style={{
                  background:
                    "radial-gradient(ellipse 68% 64% at 50% 50%, rgba(63, 198, 197, 0.28) 0%, rgba(71, 196, 165, 0.24) 36%, rgba(137, 215, 140, 0.18) 58%, transparent 76%)",
                }}
              />

              <div className="relative z-10 space-y-4">
                {/* Pillar Card 1: 9 AI R&D Modules */}
                <div className="card-glass-optical p-6 flex items-start gap-4">
                  <span className="w-11 h-11 rounded-[12px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
                    <Cpu aria-hidden="true" className="w-5 h-5 stroke-[1.75]" />
                  </span>
                  <div>
                    <span className="text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-1">
                      01 · END-TO-END R&amp;D ENGINE
                    </span>
                    <h3 className="text-[19px] font-medium text-[#0B2B26] leading-snug tracking-[-0.02em]">
                      9 AI R&amp;D Modules
                    </h3>
                    <p className="text-[13.5px] text-[#2E524C] leading-[1.5] mt-1">
                      Mencakup Brief Interpreter, Formula A/B/C Generator, Trial Planner, Learning
                      Loop, hingga generator dokumen BPOM &amp; Halal.
                    </p>
                  </div>
                </div>

                {/* Pillar Card 2: 49+ 3D Validated Ingredients */}
                <div className="card-glass-optical p-6 flex items-start gap-4">
                  <span className="w-11 h-11 rounded-[12px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
                    <Atom aria-hidden="true" className="w-5 h-5 stroke-[1.75]" />
                  </span>
                  <div>
                    <span className="text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-1">
                      02 · MOLECULAR &amp; SUPPLIER REGISTRY
                    </span>
                    <h3 className="text-[19px] font-medium text-[#0B2B26] leading-snug tracking-[-0.02em]">
                      49+ 3D Validated Ingredients
                    </h3>
                    <p className="text-[13.5px] text-[#2E524C] leading-[1.5] mt-1">
                      Dilengkapi struktur konformer 3D interaktif, nomor CAS, profil pH/HLB,
                      sinergi bahan aktif, serta harga per gram dari supplier terverifikasi.
                    </p>
                  </div>
                </div>

                {/* Pillar Card 3: 5-Gate BPOM & Halal Screening */}
                <div className="card-glass-optical p-6 flex items-start gap-4">
                  <span className="w-11 h-11 rounded-[12px] bg-[#0E807E]/10 border border-[#0E807E]/20 text-[#0E807E] flex items-center justify-center shrink-0">
                    <ShieldCheck aria-hidden="true" className="w-5 h-5 stroke-[1.75]" />
                  </span>
                  <div>
                    <span className="text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-1">
                      03 · AUTOMATED COMPLIANCE GATES
                    </span>
                    <h3 className="text-[19px] font-medium text-[#0B2B26] leading-snug tracking-[-0.02em]">
                      5-Gate BPOM &amp; Halal Screening
                    </h3>
                    <p className="text-[13.5px] text-[#2E524C] leading-[1.5] mt-1">
                      Validasi otomatis terhadap batas konsentrasi BPOM/ASEAN, stabilitas emulsi,
                      sertifikasi Halal MUI/BPJPH, stok gudang, dan target HPP.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: BUILT FOR COSMETIC R&D & MAKLON TEAMS (3 Crisp White Hairline Columns) */}
        <section className="w-full bg-[#f8fdfb] border-t border-[#0B2B26]/10 py-14 md:py-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="max-w-[720px] mb-10">
              <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#0E807E] mb-2.5">
                LABORATORY ARCHITECTURE · CLINICAL PRECISION
              </p>
              <h2 className="text-[28px] sm:text-[36px] font-medium text-[#0B2B26] leading-[1.1] tracking-[-0.035em]">
                Built for Cosmetic R&amp;D &amp; Maklon Teams
              </h2>
              <p className="text-[15px] text-[#2E524C] leading-[1.55] mt-3">
                Dirancang khusus mengikuti alur kerja nyata antara tim bisnis maklon, formulator
                laboratorium, dan tim regulasi.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <article className="bg-[#ffffff] border border-[#0B2B26]/10 rounded-[16px] p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[12px] font-mono tabular-nums font-medium uppercase tracking-[0.08em] text-[#0E807E]">
                      01 · Brief Translation
                    </span>
                    <Layers aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.02em] mb-2.5">
                    Translasi Brief Klien ke Parameter Kimia
                  </h3>
                  <p className="text-[14.5px] text-[#2E524C] leading-[1.55]">
                    Mengubah permintaan produk dari brand owner menjadi spesifikasi pH, viskositas
                    (cPs), profil sensori, dan komposisi fase air maupun minyak secara terukur.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#0B2B26]/10 flex items-center gap-2 text-[12px] font-medium text-[#0B2B26]">
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Kalibrasi pH, Viskositas &amp; HLB</span>
                </div>
              </article>

              <article className="bg-[#ffffff] border border-[#0B2B26]/10 rounded-[16px] p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[12px] font-mono tabular-nums font-medium uppercase tracking-[0.08em] text-[#0E807E]">
                      02 · Tiered Formulation
                    </span>
                    <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.02em] mb-2.5">
                    Kandidat Formula A, B, C &amp; Kalkulasi HPP
                  </h3>
                  <p className="text-[14.5px] text-[#2E524C] leading-[1.55]">
                    Menyajikan tiga skenario formula siap timbang (Ideal, Hemat/Halal, dan Stok
                    Gudang) lengkap dengan analisis trade-off dan estimasi biaya produksi per unit.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#0B2B26]/10 flex items-center gap-2 text-[12px] font-medium text-[#0B2B26]">
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Transparansi BOM &amp; MOQ Produksi</span>
                </div>
              </article>

              <article className="bg-[#ffffff] border border-[#0B2B26]/10 rounded-[16px] p-7 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[12px] font-mono tabular-nums font-medium uppercase tracking-[0.08em] text-[#0E807E]">
                      03 · Regulatory Dossier
                    </span>
                    <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  </div>
                  <h3 className="text-[20px] font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.02em] mb-2.5">
                    Kepatuhan BPOM, ASEAN &amp; Halal MUI/BPJPH
                  </h3>
                  <p className="text-[14.5px] text-[#2E524C] leading-[1.55]">
                    Memastikan setiap bahan aktif dan eksipien mematuhi batas regulasi kosmetik
                    serta dilengkapi dokumen CoA dan ketertelusuran status halal supplier.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#0B2B26]/10 flex items-center gap-2 text-[12px] font-medium text-[#0B2B26]">
                  <CheckCircle2 aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Siap Audit Notifikasi &amp; SJPH</span>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* SECTION 3: SEAMLESS EDITORIAL CTA (Soft Radial Glow + Vertical Feather Fade to White, Zero Card Box) */}
        <section
          aria-label="Formulation Launch Call to Action"
          className="relative w-full overflow-hidden bg-[#ffffff] py-24 sm:py-28 px-4 sm:px-6"
        >
          {/* Smooth Radial Green Glow with Vertical Mask Fade so top & bottom edges dissolve seamlessly into #ffffff */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 68% 58% at 50% 50%, rgba(71, 196, 165, 0.22) 0%, rgba(137, 215, 140, 0.18) 34%, rgba(217, 237, 145, 0.14) 54%, transparent 72%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.38) 12%, black 26%, black 74%, rgba(0, 0, 0, 0.38) 88%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.38) 12%, black 26%, black 74%, rgba(0, 0, 0, 0.38) 88%, transparent 100%)",
            }}
          />

          {/* Top & Bottom Soft White Feather Overlays to guarantee zero clipping line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#ffffff] via-[#ffffff]/80 to-transparent z-[1]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#ffffff] via-[#ffffff]/80 to-transparent z-[1]"
          />

          <div className="relative z-10 max-w-[820px] mx-auto text-center flex flex-col items-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-3">
              START FORMULATING WITH FORMYLAB.AI
            </span>
            <h2
              className="text-[28px] sm:text-[40px] font-medium text-[#0B2B26] leading-[1.08] tracking-[-0.035em] mb-4"
              style={{ textWrap: "balance" }}
            >
              Ready to Translate Your Next Skincare Brief into Lab-Ready Formulas?
            </h2>
            <p className="text-[15.5px] text-[#2E524C] leading-[1.55] max-w-[580px] mb-8">
              Masuk ke akun R&amp;D Anda atau langsung buka studio formulator AI untuk menyusun
              kandidat Formula A, B, dan C.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                href="/formulate"
                className="btn-glass-primary group inline-flex items-center justify-center gap-2 min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.08em]"
              >
                <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                <span>Launch AI Formulator</span>
                <ArrowRight
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </Link>
              <Link
                href="/?auth=login"
                className="btn-glass-secondary inline-flex items-center justify-center gap-2 min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.08em]"
              >
                <LogIn aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                <span>Login to Workspace</span>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* PURE WHITE EDITORIAL FOOTER */}
      <footer className="relative z-10 w-full bg-[#ffffff] text-[#0B2B26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-8 pb-16 md:pb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1"
          >
            {FOOTER_LINKS.map((item) => {
              const isCurrent = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`group relative inline-flex items-center min-h-[44px] text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-300 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2 ${
                    isCurrent ? "text-[#0B2B26]" : "text-[#2E524C] hover:text-[#0B2B26]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 bottom-2 h-[1.5px] rounded-full bg-[#0E807E] origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isCurrent ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </Link>
              );
            })}
          </nav>

          <p className="text-[12px] text-[#2E524C] whitespace-nowrap sm:pr-36">
            © 2026 formylab.ai
          </p>
        </div>
      </footer>
    </div>
  );
}