"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowLeft,
  LogIn,
  Plus,
  Minus,
  MessageCircle,
  X,
  ExternalLink,
} from "lucide-react";
import BrandLogo from "../../components/BrandLogo";

const FOOTER_LINKS = [
  { href: "/about", label: "ABOUT US" },
  { href: "/careers", label: "CAREERS" },
  { href: "/trust", label: "TRUST" },
  { href: "/faq", label: "FAQ" },
];

const ADMIN_WHATSAPP_CONTACTS = [
  {
    id: "admin-1",
    label: "Admin 1",
    phoneDisplay: "0877-8084-6549",
    whatsappUrl: "https://wa.me/6287780846549",
  },
  {
    id: "admin-2",
    label: "Admin 2",
    phoneDisplay: "0812-8342-1974",
    whatsappUrl: "https://wa.me/6281283421974",
  },
  {
    id: "admin-3",
    label: "Admin 3",
    phoneDisplay: "0856-8034-305",
    whatsappUrl: "https://wa.me/628568034305",
  },
] as const;

interface FaqItem {
  id: string;
  num: string;
  question: string;
  answer: string;
}

const GENERAL_FAQS: FaqItem[] = [
  {
    id: "faq-general-1",
    num: "01",
    question: "What is Formylab.ai?",
    answer:
      "Formylab.ai adalah platform AI Formulation Co-Pilot dan database 3D bahan baku tervalidasi yang dirancang khusus untuk tim R&D kosmetik serta pabrik maklon skincare. Platform ini membantu menerjemahkan brief produk dari klien menjadi spesifikasi teknis, menyaring kepatuhan regulasi, dan menyusun kandidat Formula A, B, dan C siap uji laboratorium.",
  },
  {
    id: "faq-general-2",
    num: "02",
    question: "Who is Formylab.ai built for?",
    answer:
      "Formylab.ai dibangun untuk tim R&D pabrik maklon kosmetik, formulator independen, cosmetic chemist, pemilik brand skincare yang sedang merancang brief produk, serta tim Regulatory Affairs yang memverifikasi kepatuhan BPOM dan Halal.",
  },
  {
    id: "faq-general-3",
    num: "03",
    question: "What is included in the Formylab.ai Workspace?",
    answer:
      "Workspace terintegrasi Formylab.ai mencakup Brief Interpreter, 5-Gate Automated Screening (BPOM/ASEAN, Kompatibilitas pH & HLB, Status Halal MUI/BPJPH, Stok Gudang, dan Kalkulasi HPP/MOQ), Formula A/B/C Engine, 3D Molecular Ingredient Library, serta AI Chemist Co-Pilot dengan konsultasi suara dan teks.",
  },
  {
    id: "faq-general-4",
    num: "04",
    question: "Are the ingredient regulations aligned with BPOM and Halal MUI/BPJPH?",
    answer:
      "Ya, seluruh bahan baku di dalam database Formylab.ai telah dikalibrasi dengan acuan batas konsentrasi aman regulasi BPOM dan ASEAN Cosmetic Directive, serta dilengkapi ketertelusuran status sertifikasi Halal dari lembaga LPPOM MUI, BPJPH, maupun badan sertifikasi halal internasional yang diakui.",
  },
  {
    id: "faq-general-5",
    num: "05",
    question: "Where does Formylab.ai source its formulation & chemical data?",
    answer:
      "Data formulasi dan parameter kimia bersumber dari basis data teknis INCI, nomor registrasi CAS, literatur stabilitas pH dan nilai HLB emulsi, profil kelarutan tiap fase, dataset optimasi Box-Behnken Design (BBD), serta registri Certificate of Analysis (CoA) dan daftar harga supplier bahan baku maklon terverifikasi.",
  },
  {
    id: "faq-general-6",
    num: "06",
    question: "Does Formylab.ai replace cosmetic chemists?",
    answer:
      "Tidak. Formylab.ai bertindak sebagai co-pilot laboratorium untuk memangkas waktu riset awal, kalkulasi HPP, dan skrining kompatibilitas bahan, sehingga cosmetic chemist serta formulator dapat berfokus pada pengujian fisik di laboratorium, penyempurnaan sensori tekstur, dan inovasi produk.",
  },
];

const TECH_SECURITY_FAQS: FaqItem[] = [
  {
    id: "faq-tech-7",
    num: "07",
    question: "Is our proprietary formula data kept confidential?",
    answer:
      "Ya, seluruh draft formula, komposisi persentase bahan aktif, dan parameter kalkulasi HPP terisolasi di dalam ruang kerja masing-masing laboratorium. Data formula milik tim Anda tidak dibagikan kepada pihak ketiga dan tidak pernah digunakan untuk melatih model AI publik.",
  },
  {
    id: "faq-tech-8",
    num: "08",
    question: "How does the 3D Molecular Ingredient Library work?",
    answer:
      "3D Molecular Ingredient Library merender struktur konformer molekul 3D interaktif berbasis WebGL secara langsung di peramban Anda. Setiap bahan dilengkapi dengan skor kompatibilitas, rentang pH optimal, dosis pemakaian lazim, daftar kombinasi sinergis, bahan yang harus dihindari (incompatibilities), serta rincian MOQ dan harga per gram dari supplier.",
  },
];

export default function FaqPage() {
  const pathname = usePathname();
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({
    "faq-general-1": true,
    "faq-tech-7": true,
  });
  const [isAdminModalOpen, setIsAdminModalOpen] = useState(false);

  useEffect(() => {
    if (!isAdminModalOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAdminModalOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAdminModalOpen]);

  const toggleItem = (id: string) => {
    setOpenIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

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
        {/* EDITORIAL HERO */}
        <section className="relative pt-10 sm:pt-14 pb-8 sm:pb-12">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 62% 50% at 50% 45%, rgba(63, 198, 197, 0.18) 0%, rgba(71, 196, 165, 0.15) 38%, rgba(217, 237, 145, 0.10) 60%, transparent 76%)",
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

            <div className="text-center flex flex-col items-center">
              <p className="text-[12px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-3">
                HELP CENTER &amp; DOCUMENTATION
              </p>
              <h1
                className="text-[36px] sm:text-[52px] font-medium text-[#0B2B26] leading-[1.05] tracking-[-0.04em] mb-4"
                style={{ textWrap: "balance" }}
              >
                Frequently Asked Questions
              </h1>
              <p className="text-[16px] text-[#2E524C] leading-[1.55] max-w-[660px]">
                Panduan teknis mengenai cara kerja AI Formulation Co-Pilot, validasi regulasi
                BPOM &amp; Halal MUI/BPJPH, katalog molekul 3D, serta perlindungan data formula
                laboratorium Anda.
              </p>
            </div>
          </div>
        </section>

        {/* ACCORDION CATEGORIES */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 mb-12 md:mb-16">
          <div className="max-w-[960px] mx-auto space-y-8">
          {/* KATEGORI 1: GENERAL */}
          <div className="bg-white border border-[#0B2B26]/10 rounded-[18px] overflow-hidden">
            <div className="px-6 sm:px-8 py-5 bg-[#f8fdfb] border-b border-[#0B2B26]/10 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-0.5">
                  CATEGORY 01 · PLATFORM &amp; R&amp;D WORKFLOW
                </span>
                <h2 className="text-[20px] sm:text-[22px] font-medium text-[#0B2B26] tracking-[-0.02em]">
                  General
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#2E524C]">
                {GENERAL_FAQS.length} Questions
              </span>
            </div>

            <div className="divide-y divide-[#0B2B26]/10">
              {GENERAL_FAQS.map((item) => {
                const isOpen = Boolean(openIds[item.id]);
                const panelId = `${item.id}-panel`;
                const buttonId = `${item.id}-trigger`;
                return (
                  <div key={item.id} className="bg-white">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="w-full min-h-[52px] px-6 sm:px-8 py-5 text-left flex items-center justify-between gap-4 cursor-pointer transition-colors duration-200 hover:bg-[#f8fdfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E807E]"
                      >
                        <span className="flex items-baseline gap-3.5 min-w-0">
                          <span className="text-[12px] font-mono tabular-nums font-medium text-[#0E807E] shrink-0">
                            {item.num}
                          </span>
                          <span className="text-[16px] sm:text-[17px] font-medium text-[#0B2B26] leading-snug">
                            {item.question}
                          </span>
                        </span>
                        <span className="w-8 h-8 rounded-full bg-[#f4fbf8] border border-[#0B2B26]/12 flex items-center justify-center shrink-0 text-[#0E807E]">
                          {isOpen ? (
                            <Minus aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                          ) : (
                            <Plus aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                          )}
                        </span>
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!isOpen}
                      className={isOpen ? "px-6 sm:px-8 pb-6 pt-1 bg-[#f8fdfb]/60" : "hidden"}
                    >
                      <p className="pl-7 text-[15px] text-[#2E524C] leading-[1.6]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* KATEGORI 2: TECHNOLOGY & SECURITY */}
          <div className="bg-white border border-[#0B2B26]/10 rounded-[18px] overflow-hidden">
            <div className="px-6 sm:px-8 py-5 bg-[#f8fdfb] border-b border-[#0B2B26]/10 flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] font-mono tabular-nums font-medium uppercase tracking-[0.14em] text-[#0E807E] block mb-0.5">
                  CATEGORY 02 · 3D WEBGL &amp; DATA ISOLATION
                </span>
                <h2 className="text-[20px] sm:text-[22px] font-medium text-[#0B2B26] tracking-[-0.02em]">
                  Technology &amp; Security
                </h2>
              </div>
              <span className="text-xs font-mono tabular-nums text-[#2E524C]">
                {TECH_SECURITY_FAQS.length} Questions
              </span>
            </div>

            <div className="divide-y divide-[#0B2B26]/10">
              {TECH_SECURITY_FAQS.map((item) => {
                const isOpen = Boolean(openIds[item.id]);
                const panelId = `${item.id}-panel`;
                const buttonId = `${item.id}-trigger`;
                return (
                  <div key={item.id} className="bg-white">
                    <h3>
                      <button
                        id={buttonId}
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        onClick={() => toggleItem(item.id)}
                        className="w-full min-h-[52px] px-6 sm:px-8 py-5 text-left flex items-center justify-between gap-4 cursor-pointer transition-colors duration-200 hover:bg-[#f8fdfb] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E807E]"
                      >
                        <span className="flex items-baseline gap-3.5 min-w-0">
                          <span className="text-[12px] font-mono tabular-nums font-medium text-[#0E807E] shrink-0">
                            {item.num}
                          </span>
                          <span className="text-[16px] sm:text-[17px] font-medium text-[#0B2B26] leading-snug">
                            {item.question}
                          </span>
                        </span>
                        <span className="w-8 h-8 rounded-full bg-[#f4fbf8] border border-[#0B2B26]/12 flex items-center justify-center shrink-0 text-[#0E807E]">
                          {isOpen ? (
                            <Minus aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                          ) : (
                            <Plus aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                          )}
                        </span>
                      </button>
                    </h3>
                    <div
                      id={panelId}
                      role="region"
                      aria-labelledby={buttonId}
                      hidden={!isOpen}
                      className={isOpen ? "px-6 sm:px-8 pb-6 pt-1 bg-[#f8fdfb]/60" : "hidden"}
                    >
                      <p className="pl-7 text-[15px] text-[#2E524C] leading-[1.6]">
                        {item.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          </div>
        </section>

        {/* CLOSING SEAMLESS EDITORIAL CTA SECTION */}
        <section
          aria-label="Formylab Support Call to Action"
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
              NEED MORE ASSISTANCE? · FORMYLAB.AI SUPPORT
            </span>
            <h2
              className="text-[28px] sm:text-[40px] font-medium text-[#0B2B26] leading-[1.08] tracking-[-0.035em] mb-4"
              style={{ textWrap: "balance" }}
            >
              Still Have Questions About Formylab.ai?
            </h2>
            <p className="text-[15.5px] text-[#2E524C] leading-[1.55] max-w-[620px] mb-8">
              Belum menemukan jawaban yang Anda cari terkait alur formulasi, regulasi BPOM/Halal,
              atau kebutuhan tim R&amp;D Anda? Hubungi admin kami secara langsung dan pilih kontak
              yang tersedia.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(true)}
                className="btn-glass-primary inline-flex items-center justify-center gap-2.5 min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.08em] cursor-pointer"
              >
                <MessageCircle aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                <span>Hubungi Admin</span>
              </button>
              <Link
                href="/trust"
                className="btn-glass-secondary inline-flex items-center justify-center min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.08em]"
              >
                <span>Security &amp; Trust</span>
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

      {/* CLINICAL OPTICAL-GLASS ADMIN WHATSAPP CONTACT MODAL */}
      {isAdminModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#0B2B26]/25 backdrop-blur-sm"
          onClick={() => setIsAdminModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="admin-contact-modal-title"
            className="relative w-full max-w-[440px] rounded-[20px] bg-gradient-to-b from-[#ffffff]/96 to-[#f6fcf9]/95 backdrop-blur-xl border border-[#0B2B26]/12 shadow-[inset_0_1px_1px_rgba(255,255,255,0.95),0_20px_48px_-24px_rgba(11,43,38,0.22)] p-6 sm:p-7 text-[#0B2B26]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 mb-2">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#0E807E]">
                  FORMYLAB.AI SUPPORT · WHATSAPP
                </p>
                <h3
                  id="admin-contact-modal-title"
                  className="text-[20px] font-medium text-[#0B2B26] tracking-[-0.025em] mt-1"
                >
                  Pilih Kontak Admin
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAdminModalOpen(false)}
                aria-label="Tutup pilihan kontak admin"
                className="w-10 h-10 rounded-full inline-flex items-center justify-center text-[#2E524C] hover:text-[#0B2B26] hover:bg-[#0B2B26]/6 transition-colors cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1"
              >
                <X aria-hidden="true" className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[13.5px] text-[#2E524C] leading-[1.55] mb-5">
              Pilih salah satu kontak admin kami di bawah ini untuk langsung memulai percakapan
              melalui WhatsApp.
            </p>

            <div className="space-y-2.5">
              {ADMIN_WHATSAPP_CONTACTS.map((contact) => (
                <a
                  key={contact.id}
                  href={contact.whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 w-full min-h-[58px] px-4 py-3 rounded-[14px] bg-[#ffffff]/85 hover:bg-[#f4fbf8] border border-[#0B2B26]/10 hover:border-[#0E807E]/35 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-1"
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className="w-9 h-9 rounded-full bg-[#f4fbf8] group-hover:bg-white border border-[#0B2B26]/10 inline-flex items-center justify-center shrink-0 transition-colors">
                      <MessageCircle aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-[14px] font-medium text-[#0B2B26] leading-snug">
                        {contact.label}
                      </span>
                      <span className="block text-[13px] text-[#2E524C] tabular-nums">
                        {contact.phoneDisplay}
                      </span>
                    </span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-[#0E807E] shrink-0">
                    <span>WhatsApp</span>
                    <ExternalLink aria-hidden="true" className="w-3.5 h-3.5" />
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
