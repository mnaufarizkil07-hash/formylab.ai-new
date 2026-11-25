"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LogIn,
  Globe,
  FlaskConical,
  Compass,
  HeartPulse,
  BookOpen,
  Building2,
  Mail,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";

const FOOTER_LINKS = [
  { href: "/about", label: "ABOUT US" },
  { href: "/careers", label: "CAREERS" },
  { href: "/trust", label: "TRUST" },
  { href: "/faq", label: "FAQ" },
];

const CULTURE_BENEFITS = [
  {
    num: "01",
    title: "Flexible Hybrid Lab & Remote",
    description:
      "Kebebasan bekerja secara remote untuk pengembangan perangkat lunak dan riset komputasi, dipadukan dengan akses kolaborasi langsung di laboratorium mitra formulasi.",
    Icon: Globe,
  },
  {
    num: "02",
    title: "AI × Cosmetic Chemistry Team",
    description:
      "Berkolaborasi lintas disiplin antara cosmetic chemist, formulator maklon, AI/ML engineer, dan perancang produk dalam satu tim riset terpadu.",
    Icon: FlaskConical,
  },
  {
    num: "03",
    title: "Focused Research Autonomy",
    description:
      "Budaya kerja tenang dengan kepemilikan penuh atas eksperimen model, arsitektur algoritma reologi, maupun kurasi dataset bahan baku 3D.",
    Icon: Compass,
  },
  {
    num: "04",
    title: "Health & Wellness Support",
    description:
      "Dukungan kesehatan menyeluruh, jam kerja yang menghargai keseimbangan hidup, serta fasilitas penunjang ergonomi dan kebugaran tim.",
    Icon: HeartPulse,
  },
  {
    num: "05",
    title: "Continuous R&D Learning",
    description:
      "Alokasi khusus untuk jurnal ilmiah kosmetik, konferensi teknologi AI, sertifikasi regulasi BPOM/ASEAN, serta literatur sistem jaminan produk halal.",
    Icon: BookOpen,
  },
  {
    num: "06",
    title: "Direct Industry & Maklon Impact",
    description:
      "Setiap fitur dan model yang Anda bangun langsung digunakan oleh laboratorium R&D maklon untuk mempercepat peluncuran produk skincare yang aman dan teruji.",
    Icon: Building2,
  },
];

export default function CareersPage() {
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
        {/* CENTERED EDITORIAL HERO */}
        <section className="relative pt-10 sm:pt-14 pb-10 sm:pb-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 62% 52% at 50% 45%, rgba(63, 198, 197, 0.20) 0%, rgba(71, 196, 165, 0.16) 36%, rgba(217, 237, 145, 0.12) 58%, transparent 74%)",
            }}
          />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6">
            <div className="mb-6 sm:hidden">
              <Link
                href="/"
                className="btn-glass-compact inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2 text-[12px] tracking-[0.04em]"
              >
                <ArrowLeft aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
                <span>Back to Home</span>
              </Link>
            </div>

            <div className="max-w-[780px] mx-auto text-center flex flex-col items-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-3">
                CAREERS AT FORMYLAB.AI
              </p>
              <h1
                className="text-[36px] sm:text-[52px] font-medium text-[#0B2B26] leading-[1.05] tracking-[-0.04em] mb-4"
                style={{ textWrap: "balance" }}
              >
                Working at Formylab.ai
              </h1>
              <p className="text-[18px] sm:text-[21px] font-medium text-[#2E524C] leading-[1.35] tracking-[-0.015em]">
                Building the Next Generation of Cosmetic R&amp;D Intelligence
              </p>
            </div>
          </div>
        </section>

        {/* 6 CULTURE & WORK BENEFIT CARDS */}
        <section
          aria-label="Culture and Work Benefits"
          className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 md:mb-16"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {CULTURE_BENEFITS.map(({ num, title, description, Icon }) => (
              <article
                key={num}
                className="bg-white border border-[#0B2B26]/10 rounded-[16px] p-6 sm:p-7 flex flex-col justify-between transition-colors duration-200 hover:bg-[#f8fdfb]"
              >
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span className="w-10 h-10 rounded-[12px] bg-[#f4fbf8] border border-[#0E807E]/20 flex items-center justify-center text-[#0E807E]">
                      <Icon aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />
                    </span>
                    <span className="text-[12px] font-mono tabular-nums font-medium text-[#0E807E] tracking-[0.06em]">
                      {num}
                    </span>
                  </div>
                  <h2 className="text-[19px] font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.02em] mb-2.5">
                    {title}
                  </h2>
                  <p className="text-[14.5px] text-[#2E524C] leading-[1.55]">
                    {description}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        {/* JOIN US SEAMLESS EDITORIAL CTA SECTION (Soft Radial Glow + Vertical Feather Fade to White, Zero Card Box) */}
        <section
          aria-label="Open Collaboration and R&D Talent Call to Action"
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

          <div className="relative z-10 max-w-[780px] mx-auto text-center flex flex-col items-center">
            <span className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-3">
              OPEN COLLABORATION &amp; R&amp;D TALENT
            </span>
            <h2
              className="text-[28px] sm:text-[38px] font-medium text-[#0B2B26] leading-[1.1] tracking-[-0.035em] mb-6"
              style={{ textWrap: "balance" }}
            >
              Shape the Future of Scientific Skincare Formulation With Us
            </h2>

            <div className="space-y-4 text-[15.5px] text-[#2E524C] leading-[1.6] text-left sm:text-center mb-8">
              <p>
                Di <span className="font-medium text-[#0B2B26]">Formylab.ai</span>, kami mencari
                talenta <span className="font-medium text-[#0B2B26]">Cosmetic Chemist</span>,{" "}
                <span className="font-medium text-[#0B2B26]">AI/ML Engineer</span>, dan{" "}
                <span className="font-medium text-[#0B2B26]">Product Designer</span> yang memiliki
                ketertarikan mendalam pada sains formulasi, pemodelan molekul 3D, serta kepatuhan
                regulasi industri kosmetik. Kami percaya bahwa perangkat lunak laboratorium terbaik
                lahir dari dialog erat antara keahlian kimia emulsi dan rekayasa kecerdasan
                buatan yang presisi.
              </p>
              <p>
                Jika Anda ingin berkontribusi membangun sistem ko-pilot R&amp;D yang membantu
                formulator maklon merancang produk skincare yang lebih aman, transparan dalam
                perhitungan HPP, dan patuh standar BPOM serta Halal MUI/BPJPH, kirimkan portofolio
                atau ringkasan riset Anda kepada tim kami.
              </p>
            </div>

            <a
              href="mailto:careers@formylab.ai?subject=Application%20%E2%80%93%20Formylab.ai%20R%26D%20Team"
              className="btn-glass-primary inline-flex items-center justify-center gap-2.5 min-h-[44px] px-8 py-3.5 text-[13px] uppercase tracking-[0.08em]"
            >
              <Mail aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
              <span>Join Us</span>
            </a>
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
