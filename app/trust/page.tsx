"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LogIn,
  ShieldCheck,
  Check,
  Lock,
  FileCheck2,
  FlaskConical,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";

const FOOTER_LINKS = [
  { href: "/about", label: "ABOUT US" },
  { href: "/careers", label: "CAREERS" },
  { href: "/trust", label: "TRUST" },
  { href: "/faq", label: "FAQ" },
];

const SECURITY_COMMITMENTS = [
  {
    num: "01",
    title: "Formula IP Isolation",
    description:
      "Data formula klien tidak pernah digunakan untuk melatih model AI publik.",
  },
  {
    num: "02",
    title: "Encrypted Storage & Transit",
    description:
      "Enkripsi AES-256 saat tersimpan dan TLS 1.3 saat pengiriman data.",
  },
  {
    num: "03",
    title: "Role-Based Lab Access",
    description:
      "Kontrol izin akses per divisi R&D, Formulator, dan Regulatory Affairs.",
  },
  {
    num: "04",
    title: "Automated Daily Backups",
    description:
      "Pencadangan terenkripsi berkala setiap 24 jam untuk menjaga kontinuitas riset.",
  },
  {
    num: "05",
    title: "BPOM & Halal Data Integrity",
    description:
      "Validasi berkala database INCI, regulasi BPOM, dan sertifikasi Halal MUI/BPJPH.",
  },
  {
    num: "06",
    title: "Security Audits & Monitoring",
    description:
      "Pemindaian kerentanan rutin dan audit keamanan aplikasi berkelanjutan.",
  },
];

export default function TrustPage() {
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

      {/* MAIN CONTENT */}
      <main id="main-content" className="relative z-10 flex-1">
        {/* EDITORIAL HERO + GEOMETRIC SHIELD GLASS PANEL */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 sm:pt-14 pb-10 sm:pb-12">
          <div className="mb-6 sm:hidden">
            <Link
              href="/"
              className="btn-glass-compact inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-[12px] tracking-[0.04em]"
            >
              <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
              <span>Back to Home</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
            {/* LEFT COLUMN: Editorial Headline & Narrative */}
            <div className="lg:col-span-7 space-y-5">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#0E807E]">
                SECURITY &amp; FORMULA IP PROTECTION
              </p>
              <h1
                className="text-[36px] sm:text-[52px] font-medium text-[#0B2B26] leading-[1.05] tracking-[-0.04em]"
                style={{ textWrap: "balance" }}
              >
                Trust at Formylab.ai
              </h1>
              <p className="text-[16px] text-[#2E524C] leading-[1.6] max-w-[650px]">
                Pabrik maklon dan tim R&amp;D kosmetik mempercayakan kerahasiaan formula, struktur
                biaya HPP, serta spesifikasi bahan baku strategis mereka pada infrastruktur aman{" "}
                <span className="font-medium text-[#0B2B26]">Formylab.ai</span>. Kami merancang
                setiap lapisan sistem untuk melindungi kekayaan intelektual (IP) laboratorium Anda
                sekaligus memastikan akurasi regulasi BPOM dan sertifikasi Halal MUI/BPJPH.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href="/formulate"
                  className="btn-glass-primary inline-flex items-center justify-center gap-2 min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.08em]"
                >
                  <FlaskConical aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Open Secure Formulator</span>
                </Link>
                <Link
                  href="/faq"
                  className="btn-glass-secondary inline-flex items-center justify-center gap-2 min-h-[44px] px-6 py-3.5 text-[12px] uppercase tracking-[0.08em]"
                >
                  <span>Read Security FAQ</span>
                </Link>
              </div>
            </div>

            {/* RIGHT COLUMN: Minimalist Geometric Shield with .card-glass-optical & Soft Ambient Mint */}
            <div className="lg:col-span-5 relative py-4">
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -inset-6 z-0"
                style={{
                  background:
                    "radial-gradient(ellipse 68% 64% at 50% 50%, rgba(63, 198, 197, 0.26) 0%, rgba(71, 196, 165, 0.22) 38%, rgba(137, 215, 140, 0.16) 60%, transparent 78%)",
                }}
              />

              <div className="relative z-10 card-glass-optical p-7 sm:p-8 flex flex-col justify-between gap-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.12em] text-[#0E807E] block mb-1">
                      VAULT ARCHITECTURE · ZERO IP LEAKAGE
                    </span>
                    <h2 className="text-[20px] font-medium text-[#0B2B26] leading-snug tracking-[-0.02em]">
                      Proprietary Formulation Vault
                    </h2>
                  </div>

                  {/* Minimalist Geometric Shield SVG Emblem */}
                  <div className="w-14 h-14 rounded-[14px] bg-[#ffffff]/80 border border-[#0E807E]/25 flex items-center justify-center shrink-0">
                    <svg
                      viewBox="0 0 36 36"
                      className="w-8 h-8 text-[#0E807E]"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <path d="M18 3.5L6.5 8.2v9.3c0 7.9 4.9 13.7 11.5 15.5 6.6-1.8 11.5-7.6 11.5-15.5V8.2L18 3.5z" />
                      <path
                        d="M18 8.2l-7 2.9v6.1c0 5.1 3.1 8.9 7 10.2 3.9-1.3 7-5.1 7-10.2v-6.1l-7-2.9z"
                        opacity="0.55"
                      />
                      <path d="M14.2 18.2l2.6 2.6 5.2-5.4" strokeWidth="2" />
                    </svg>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#0B2B26]/10">
                  <div className="bg-[#ffffff]/85 border border-[#0B2B26]/10 rounded-[12px] p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#0E807E] mb-1">
                      <Lock aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                      <span>Encryption</span>
                    </div>
                    <div className="text-[14px] font-medium text-[#0B2B26] font-mono tabular-nums">
                      AES-256 &amp; TLS 1.3
                    </div>
                  </div>

                  <div className="bg-[#ffffff]/85 border border-[#0B2B26]/10 rounded-[12px] p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#0E807E] mb-1">
                      <FileCheck2 aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                      <span>Compliance</span>
                    </div>
                    <div className="text-[14px] font-medium text-[#0B2B26]">
                      BPOM &amp; SJPH Halal
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[12px] text-[#2E524C] pt-1">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#0B2B26]">
                    <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                    <span>Isolated R&amp;D Workspace Boundary</span>
                  </span>
                  <span className="font-mono text-[11px] text-[#0E807E] tabular-nums">
                    24h Backups
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* CRISP WHITE MAIN SECURITY & STABILITY CONTAINER */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 md:mb-16">
          <div className="bg-white border border-[#0B2B26]/10 rounded-[18px] p-8 sm:p-10">
            <div className="max-w-[780px] pb-6 mb-8 border-b border-[#0B2B26]/10">
              <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-2">
                INFORMATION SECURITY &amp; SYSTEM RELIABILITY
              </span>
              <h2 className="text-[24px] sm:text-[32px] font-medium text-[#0B2B26] leading-[1.12] tracking-[-0.025em]">
                Komitmen Keamanan Informasi &amp; Stabilitas Sistem Laboratorium
              </h2>
              <p className="text-[15px] text-[#2E524C] leading-[1.55] mt-2.5">
                Setiap workspace maklon dan brand dilindungi oleh kontrol isolasi data, enkripsi
                standar industri, dan pemutakhiran regulasi bahan baku secara berkala.
              </p>
            </div>

            {/* 2-Column Checklist Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {SECURITY_COMMITMENTS.map((item) => (
                <div
                  key={item.num}
                  className="bg-[#f8fdfb] border border-[#0B2B26]/10 rounded-[14px] p-5 flex items-start gap-4 transition-colors duration-200 hover:bg-[#f4fbf8]"
                >
                  <span className="w-9 h-9 rounded-full bg-[#ffffff] border border-[#0E807E]/25 flex items-center justify-center shrink-0 mt-0.5">
                    <Check aria-hidden="true" className="w-4 h-4 text-[#0E807E] stroke-[2.2]" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-[16px] sm:text-[17px] font-medium text-[#0B2B26] leading-snug">
                        {item.title}
                      </h3>
                      <span className="text-[11px] font-mono tabular-nums font-medium text-[#0E807E]">
                        {item.num}
                      </span>
                    </div>
                    <p className="text-[14px] text-[#2E524C] leading-[1.55]">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CLOSING SEAMLESS EDITORIAL CTA SECTION */}
        <section
          aria-label="Formulation Launch Call to Action"
          className="relative w-full overflow-hidden bg-[#ffffff] py-24 sm:py-28 px-4 sm:px-6"
        >
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
              ISOLATED R&amp;D WORKSPACE · FORMYLAB.AI
            </span>
            <h2
              className="text-[28px] sm:text-[40px] font-medium text-[#0B2B26] leading-[1.08] tracking-[-0.035em] mb-4"
              style={{ textWrap: "balance" }}
            >
              Protect Your Proprietary Formulas at Every Stage of R&amp;D.
            </h2>
            <p className="text-[15.5px] text-[#2E524C] leading-[1.55] max-w-[620px] mb-8">
              Setiap brief klien, komposisi bahan aktif, dan dokumen trial Anda diproses dalam
              ruang kerja terenkripsi yang terisolasi serta patuh standar keamanan data, regulasi
              BPOM, dan Halal MUI/BPJPH.
            </p>
            <div className="flex items-center justify-center">
              <Link
                href="/faq"
                className="btn-glass-primary inline-flex items-center justify-center gap-2.5 min-h-[44px] px-8 py-3.5 text-[12px] uppercase tracking-[0.08em]"
              >
                <ShieldCheck aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                <span>Explore Security FAQ</span>
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
