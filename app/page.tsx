"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Mail,
  User,
  LogIn,
  Sparkles,
  ShieldCheck,
  Target,
  Compass,
  Volume2,
  Eye,
  Cpu,
  Atom,
  Layers,
} from "lucide-react";
import {
  authenticateUser,
  registerUserAccount,
  ACCOUNTS_STORAGE_KEY,
  ACTIVE_USER_STORAGE_KEY,
  type UserAccount,
} from "../lib/auth";
import {
  FORMYLAB_AI_MODULES,
  FOUR_AI_PILLARS,
  WORKFLOW_TAHAPAN_FORMYLAB,
} from "../lib/interactiveAiEngine";
import Logo from "../components/Logo";
import SpinModuleCard from "../components/ui3d/SpinModuleBadge";

export default function LandingAndLoginPage() {
  const router = useRouter();
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Interactive Glowing Molecular Polygon Network Canvas (auto-paused during scroll for 60fps smoothness)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let isScrolling = false;
    let scrollTimer: ReturnType<typeof setTimeout> | null = null;

    const palette = ["#a4cf4a", "#00f5d4", "#38bdf8", "#2dd4bf"];
    const particles = Array.from({ length: 22 }, (_, i) => ({
      x: ((i * 239) % Math.max(width - 80, 600)) + 40,
      y: ((i * 173) % Math.max(height - 80, 500)) + 40,
      vx: ((i % 5) - 2) * 0.16 || 0.14,
      vy: ((i % 7) - 3) * 0.14 || -0.12,
      radius: (i % 3) + 3.0,
      color: palette[i % palette.length],
    }));

    const maxDistSq = 160 * 160;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      ctx.lineWidth = 1.15;
      ctx.strokeStyle = "rgba(0, 225, 195, 0.22)";
      ctx.beginPath();
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          if (dx * dx + dy * dy < maxDistSq) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      drawFrame();
    };

    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimer !== null) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
      }, 180);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    drawFrame();

    let lastTime = 0;
    const loop = (now: number) => {
      animationFrameId = requestAnimationFrame(loop);
      if (isScrolling || document.hidden) return;
      if (now - lastTime < 50) return;
      lastTime = now;
      drawFrame();
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimer !== null) clearTimeout(scrollTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const openLoginWithMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setError("");
    setSuccessMessage("");
    setShowLoginPage(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const switchMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setError("");
    setSuccessMessage("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    let customAccounts: UserAccount[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (raw) customAccounts = JSON.parse(raw);
      } catch {
        customAccounts = [];
      }
    }

    if (authMode === "login") {
      const result = authenticateUser(email, password, customAccounts);
      if (!result.success) {
        setError(result.error || "Invalid credentials.");
        return;
      }
      if (typeof window !== "undefined" && result.user) {
        window.localStorage.setItem(
          ACTIVE_USER_STORAGE_KEY,
          JSON.stringify(result.user)
        );
      }
      router.push("/dashboard");
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please confirm your password.");
        return;
      }
      const result = registerUserAccount(email, password, customAccounts, name);
      if (!result.success) {
        setError(result.error || "Registration failed.");
        return;
      }
      if (typeof window !== "undefined" && result.updatedCustomAccounts) {
        window.localStorage.setItem(
          ACCOUNTS_STORAGE_KEY,
          JSON.stringify(result.updatedCustomAccounts)
        );
        if (result.account) {
          window.localStorage.setItem(
            ACTIVE_USER_STORAGE_KEY,
            JSON.stringify(result.account)
          );
        }
      }
      setSuccessMessage(
        "Account created successfully! Redirecting to your R&D workspace..."
      );
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    }
  };

  // ============================================================================
  // VIEW 2: DEDICATED LOGIN / REGISTER PAGE (Opened when clicking top-right Login)
  // ============================================================================
  if (showLoginPage) {
    return (
      <div className="min-h-screen relative flex flex-col justify-between p-4 md:p-6 font-sans overflow-x-hidden bg-gradasi-animasi">
        <canvas
          ref={canvasRef}
          className="fixed inset-0 pointer-events-none z-0"
        />

        {/* Top Bar with Back to Dashboard Landpage button */}
        <header className="relative z-20 max-w-6xl w-full mx-auto flex items-center justify-between py-2 px-2">
          <button
            type="button"
            onClick={() => setShowLoginPage(false)}
            className="px-4 py-2 rounded-full bg-white/90 hover:bg-white text-slate-800 font-bold text-xs shadow-sm border border-emerald-900/10 flex items-center gap-2 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#0f766e]" />
            <span>Back to Landing Page</span>
          </button>

          <div className="text-xs font-bold text-slate-700 bg-white/80 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-emerald-900/10">
            formylab.ai · AI Skincare Formulation Co-Pilot
          </div>
        </header>

        {/* MAIN LOGIN CONTAINER (NO PHOTO CAROUSEL — CLEAN R&D OVERVIEW PANEL) */}
        <div className="relative z-10 my-auto bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_28px_70px_-15px_rgba(16,68,56,0.28)] border border-white/85 w-full max-w-6xl mx-auto overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[560px]">
          {/* LEFT 5 COLUMNS: AUTHENTICATION CONSOLE */}
          <div className="lg:col-span-5 p-7 sm:p-10 md:p-11 flex flex-col justify-center bg-white border-b lg:border-b-0 lg:border-r border-slate-100">
            <div className="mb-6">
              <div className="mb-2 -ml-2">
                <Logo size="lg" />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                AI Skincare Formulation Co-Pilot for OEM/ODM &amp; Cosmetic R&amp;D Teams.
              </p>
            </div>

            <div className="mb-5">
              <h2 className="text-2xl font-extrabold text-slate-900 mb-1.5">
                {authMode === "login"
                  ? "We accelerate & improve accuracy"
                  : "Create Your R&D Account"}
              </h2>
              <p className="text-slate-500 text-xs leading-relaxed">
                {authMode === "login"
                  ? "Masuk sebagai tim R&D maklon untuk mengakses alur kerja terpadu dan 9 Modul AI Co-Pilot."
                  : "Daftarkan akun tim R&D maklon Anda untuk mulai menerjemahkan brief klien menjadi formula teruji."}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold"
              >
                {error}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f766e]" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {authMode === "register" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Full Name / Lead Chemist
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Dr. Nadia Pratama"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Laboratory Email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. rnd.chemist@formylab.ai"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="auth-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                  />
                </div>
              </div>

              {authMode === "register" && (
                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                    <input
                      id="auth-confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your password"
                      className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-6 bg-gradient-to-r from-[#14b8a6] to-[#12382f] text-white rounded-xl font-bold text-sm hover:opacity-95 transition shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2"
              >
                <span>
                  {authMode === "login"
                    ? "Access Formulation Lab"
                    : "Create Account & Enter Lab"}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Bottom Small Account Switch Prompt with Bold Theme-Green Action */}
            <p className="mt-5 text-center text-xs text-slate-500">
              {authMode === "login" ? (
                <>
                  Don&apos;t have an account yet?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="font-extrabold text-[#0f766e] hover:text-[#14b8a6] hover:underline transition cursor-pointer"
                  >
                    Create Account
                  </button>
                </>
              ) : (
                <>
                  Already have a laboratory account?{" "}
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="font-extrabold text-[#0f766e] hover:text-[#14b8a6] hover:underline transition cursor-pointer"
                  >
                    Sign In
                  </button>
                </>
              )}
            </p>
          </div>

          {/* RIGHT 7 COLUMNS: STATIC R&D WORKFLOW & 9 AI MODULES SUMMARY (NO CAROUSEL) */}
          <div className="lg:col-span-7 bg-gradient-to-br from-[#0f2922] via-[#12382f] to-[#0f172a] text-white p-7 sm:p-10 flex flex-col justify-between">
            <div>
              <span className="inline-block text-[11px] font-extrabold uppercase tracking-[0.2em] text-emerald-300 mb-2">
                AI SKINCARE FORMULATION CO-PILOT WORKFLOW
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-3">
                We accelerate cosmetic formulation &amp; improve accuracy.
              </h3>
              <p className="text-xs sm:text-sm text-emerald-100/85 leading-relaxed mb-6">
                Dipakai internal oleh <strong>tim R&amp;D maklon &amp; produsen skincare</strong> untuk
                menerjemahkan permintaan klien brand menjadi formula siap coba melalui
                alur kerja terstruktur dan 9 Modul AI terintegrasi.
              </p>

              {/* Compact 9 Modules Grid inside Login Right Panel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {FORMYLAB_AI_MODULES.map((mod, idx) => (
                  <div
                    key={mod.id}
                    className="p-3 rounded-xl bg-white/8 border border-white/12 backdrop-blur-xs"
                  >
                    <div className="text-[11px] font-mono font-bold text-emerald-300 mb-0.5">
                      0{idx + 1}. {mod.name}
                    </div>
                    <p className="text-[11px] text-white/80 leading-snug">
                      {mod.fungsi}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 mt-6 border-t border-white/15 flex flex-wrap items-center justify-between gap-3 text-xs text-emerald-200">
              <span>Demo Lab Account: rnd.chemist@formylab.ai / Pass: 12345</span>
              <button
                type="button"
                onClick={() => setShowLoginPage(false)}
                className="underline font-bold text-white hover:text-emerald-300 cursor-pointer"
              >
                View Full Overview on Landing Page →
              </button>
            </div>
          </div>
        </div>

        <div className="h-2" />
      </div>
    );
  }

  // ============================================================================
  // VIEW 1 (DEFAULT): DASHBOARD LANDPAGE (Gambaran Besar Maklon, Alur Kerja Tahap 0–9, 9 Fungsi AI, Visi Misi)
  // ============================================================================
  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-20 overflow-x-hidden bg-gradasi-animasi">
      {/* Interactive Glowing Molecular Polygon Network Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* STICKY TOP NAVBAR WITH CLEAN ROUNDED "LOGIN" BUTTON IN TOP-RIGHT CORNER */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 pt-4 pb-2">
        <div className="max-w-7xl mx-auto bg-white/95 backdrop-blur-xl rounded-full px-5 sm:px-7 py-3 shadow-[0_14px_35px_-10px_rgba(16,68,56,0.16)] border border-emerald-900/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <span className="hidden md:inline-block text-[11px] font-extrabold uppercase tracking-wider text-[#0f766e] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
              AI Co-Pilot · Skincare R&amp;D Lab
            </span>
          </div>

          <nav className="hidden lg:flex items-center gap-6 text-xs font-bold text-slate-600">
            <a
              href="#tentang-website"
              className="hover:text-[#0f766e] transition"
            >
              Overview
            </a>
            <a href="#alur-kerja" className="hover:text-[#0f766e] transition">
              Workflow
            </a>
            <a href="#fungsi-ai" className="hover:text-[#0f766e] transition">
              9 AI Modules
            </a>
            <a href="#visi-misi" className="hover:text-[#0f766e] transition">
              Vision &amp; Mission
            </a>
          </nav>

          {/* TOMBOL LOGIN DI POJOK KANAN ATAS */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => openLoginWithMode("register")}
              className="hidden sm:inline-flex px-4 py-2.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-[#0f766e] font-bold text-xs border border-emerald-200 transition cursor-pointer"
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => openLoginWithMode("login")}
              className="px-5 py-2.5 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#12382f] text-white font-extrabold text-xs sm:text-sm shadow-md hover:opacity-95 transition flex items-center gap-2 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Login</span>
            </button>
          </div>
        </div>
      </header>

      {/* MAIN LANDPAGE DASHBOARD CONTENT */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-12">
        {/* SECTION 1: HERO OVERVIEW IN ENGLISH WITHOUT PARENTHETICAL STAGE NUMBERS */}
        <section
          id="tentang-website"
          className="bg-white rounded-[2.5rem] p-8 sm:p-12 lg:p-14 shadow-[0_24px_60px_-15px_rgba(16,68,56,0.18)] border border-emerald-900/10"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            <div className="lg:col-span-7">
              <p className="text-xs font-extrabold tracking-[0.22em] text-[#0d9488] uppercase mb-3">
                WE ARE EXPERT R&amp;D FORMULATION TEAM · FORMYLAB.AI
              </p>

              <h1
                className="text-3xl sm:text-5xl font-extrabold text-slate-900 leading-[1.14] tracking-tight mb-5"
                style={{ textWrap: "balance" }}
              >
                We accelerate cosmetic formulation &amp;{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0f766e] to-[#10b981]">
                  improve accuracy.
                </span>
              </h1>

              {/* MAIN DEFINITION IN BAHASA INDONESIA WITHOUT PARENTHETICAL STAGE LABELS */}
              <div className="space-y-3 text-sm sm:text-[15px] text-slate-600 leading-relaxed mb-6">
                <p>
                  <strong>formylab.ai</strong> adalah{" "}
                  <strong>AI Co-Pilot Formulasi Skincare</strong> khusus untuk{" "}
                  <strong>maklon dan produsen skincare</strong>. Pelaku utamanya ada dua:{" "}
                  <strong>Klien brand</strong> datang ke maklon dengan permintaan produk
                  (misalnya <em>&ldquo;mau serum brightening ringan&rdquo;</em>), dan{" "}
                  <strong>tim R&amp;D maklon</strong> memakai AI ini secara internal untuk
                  menerjemahkan permintaan tersebut menjadi formula yang bisa langsung
                  dicoba di laboratorium.
                </p>
                <p>
                  Dari pengisian <strong>Otak Internal Gudang &amp; Bahan Baku</strong>,
                  penerjemahan <strong>Brief Klien jadi Spesifikasi Teknis</strong>,
                  penyusunan <strong>Draft Formula Awal</strong>, penyaringan lewat{" "}
                  <strong>5 Pengecekan Berlapis: Regulasi, Kompatibilitas, Halal, Stok &amp; Biaya</strong>,
                  penyajian <strong>Output Berlapis Formula A, B, C beserta Catatan Trade-off</strong>,
                  perancangan <strong>Strategi Percobaan Lab</strong>, pencatatan hasil
                  racikan &amp; <strong>Learning Loop</strong>, hingga penyiapan{" "}
                  <strong>Dokumentasi Formula Sheet, Notifikasi BPOM &amp; Checklist Halal</strong>.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={() => openLoginWithMode("login")}
                  className="px-7 py-3.5 rounded-full bg-gradient-to-r from-[#14b8a6] to-[#0f766e] text-white font-bold text-sm shadow-md hover:opacity-95 transition flex items-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Login to R&amp;D Workspace</span>
                </button>

                <a
                  href="#alur-kerja"
                  className="px-6 py-3.5 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-800 border border-slate-200 font-bold text-sm transition flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-[#0f766e]" />
                  <span>Explore Workflow</span>
                </a>
              </div>
            </div>

            {/* Right Summary Card: English Titles + Indonesian Descriptions */}
            <div className="lg:col-span-5 bg-gradient-to-br from-[#0f2922] via-[#12382f] to-[#0f172a] rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-500/20">
              <div className="text-xs font-extrabold uppercase tracking-[0.18em] text-emerald-300 mb-2">
                FORMYLAB.AI WORKFLOW OVERVIEW
              </div>
              <h2 className="text-xl font-extrabold text-white mb-4">
                Internal AI Co-Pilot for R&amp;D Formulation Teams
              </h2>

              <div className="space-y-3.5 text-xs sm:text-sm">
                <div className="p-3.5 rounded-2xl bg-white/8 border border-white/10">
                  <div className="font-bold text-emerald-300 mb-0.5">
                    1. Brand Client → R&amp;D Formulation Team
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    Klien brand mengajukan brief produk (jenis sediaan, klaim, target
                    kulit/tekstur, target HPP, wajib halal, deadline &amp; MOQ), lalu tim R&amp;D
                    maklon memprosesnya dengan AI Co-Pilot.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/8 border border-white/10">
                  <div className="font-bold text-emerald-300 mb-0.5">
                    2. 5-Layer Automated Screening
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    Setiap draft formula disaring otomatis melewati 5 pengecek:{" "}
                    <strong>Regulasi BPOM/ASEAN</strong>,{" "}
                    <strong>Kompatibilitas &amp; Stabilitas</strong>, <strong>Status Halal</strong>,{" "}
                    <strong>Stok Gudang</strong>, dan <strong>Biaya HPP / Percobaan</strong>.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-white/8 border border-white/10">
                  <div className="font-bold text-emerald-300 mb-0.5">
                    3. Tiered Formulas A, B, C &amp; Learning Loop
                  </div>
                  <p className="text-slate-200 text-xs leading-relaxed">
                    Menghasilkan <strong>Formula A (Ideal)</strong>,{" "}
                    <strong>Formula B (Hemat/Halal)</strong>, dan{" "}
                    <strong>Formula C (Stok Tersedia)</strong> lengkap dengan catatan{" "}
                    <em>trade-off</em>, rencana trial lab, dan pembelajaran dari hasil racikan.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 2: END-TO-END WORKFLOW */}
        <section
          id="alur-kerja"
          className="bg-white rounded-[2.5rem] p-8 sm:p-10 lg:p-12 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.16)] border border-emerald-900/10"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-8">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
                AI SKINCARE FORMULATION CO-PILOT WORKFLOW
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                End-to-End Formulation Workflow
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-3xl">
                Satu alur utama terstruktur yang menghubungkan database internal gudang
                maklon, input brief klien brand, pengecekan berlapis, opsi formula A/B/C,
                hingga rencana percobaan dan dokumentasi BPOM/Halal.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openLoginWithMode("login")}
              className="px-5 py-2.5 rounded-full bg-[#12382f] hover:bg-[#0f766e] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer self-start lg:self-auto shrink-0 shadow-sm"
            >
              <span>Start Workflow in Workspace</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {WORKFLOW_TAHAPAN_FORMYLAB.map((item) => (
              <div
                key={item.tahap}
                className="p-5 rounded-3xl bg-slate-50/95 border border-slate-200/80 flex flex-col justify-between hover:border-[#14b8a6] transition"
              >
                <div>
                  <span className="inline-block text-[11px] font-mono font-extrabold uppercase tracking-wider text-white bg-[#0f766e] px-3 py-1 rounded-full mb-3">
                    {item.tahap}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 mb-1">
                    {item.title}
                  </h3>
                  <p className="text-xs font-semibold text-[#0f766e] mb-2.5">
                    {item.subtitle}
                  </p>
                  <ul className="space-y-1.5 text-xs text-slate-600 leading-relaxed list-disc pl-4">
                    {item.bullets.map((b, i) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3: 9 INTEGRATED AI MODULES */}
        <section
          id="fungsi-ai"
          className="bg-white rounded-[2.5rem] p-8 sm:p-10 lg:p-12 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.16)] border border-emerald-900/10"
        >
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
                FORMYLAB.AI WORKFLOW · AI FUNCTION SUMMARY
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                9 Integrated AI Modules for Cosmetic R&amp;D Laboratories
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 mt-1.5 max-w-3xl">
                Seluruh modul di bawah ini bekerja di dalam satu alur utama{" "}
                <strong>formylab.ai</strong> untuk mendampingi tim R&amp;D maklon dari tahap
                interpretasi brief klien hingga pembelajaran hasil lab tiap proyek.
              </p>
            </div>

            <button
              type="button"
              onClick={() => openLoginWithMode("login")}
              className="px-5 py-2.5 rounded-full bg-[#12382f] hover:bg-[#0f766e] text-white font-bold text-xs transition flex items-center gap-2 cursor-pointer self-start lg:self-auto shrink-0 shadow-sm"
            >
              <span>Login to Use 9 AI Modules</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* 2-COLUMN 360°-SPIN CIRCULAR ICON BADGE + BOLD TITLE + SUBTITLE */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-[#f4f9f9]/85 rounded-3xl p-6 sm:p-8 border border-emerald-900/5">
            {FORMYLAB_AI_MODULES.map((mod) => (
              <SpinModuleCard
                key={mod.id}
                moduleId={mod.id}
                name={mod.name}
                fungsi={mod.fungsi}
                onClick={() => openLoginWithMode("login")}
              />
            ))}
          </div>
        </section>

        {/* SECTION 4: VISION & MISSION */}
        <section
          id="visi-misi"
          className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch"
        >
          {/* VISION CARD */}
          <div className="lg:col-span-5 bg-gradient-to-b from-[#0d9488] to-[#115e59] text-white rounded-[2.2rem] p-8 sm:p-10 shadow-[0_20px_50px_-15px_rgba(13,148,136,0.35)] flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center mb-5">
                <Target className="w-6 h-6 text-emerald-200" />
              </div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-emerald-200 mb-2">
                OUR VISION
              </p>
              <h2 className="text-2xl sm:text-3xl font-extrabold leading-tight mb-4">
                Accelerating Innovation &amp; Accuracy in Cosmetic Formulation R&amp;D
              </h2>
              <p className="text-sm sm:text-[15px] text-emerald-50/95 leading-relaxed">
                Menjadi AI Co-Pilot R&amp;D kosmetik andalan bagi maklon dan produsen
                skincare yang mempercepat proses penerjemahan brief klien brand serta
                meningkatkan akurasi formulasi melalui pengecekan berlapis (regulasi,
                kompatibilitas, halal, stok, biaya) dan pembelajaran hasil lab
                berkelanjutan.
              </p>
            </div>

            <div className="pt-6 mt-6 border-t border-white/20 flex items-center justify-between text-xs font-bold text-emerald-100">
              <span>Speed · Accuracy · Regulatory &amp; Halal Aligned</span>
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>

          {/* MISSION CARD */}
          <div className="lg:col-span-7 bg-white rounded-[2.2rem] p-8 sm:p-10 shadow-[0_20px_50px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-[#0d9488] flex items-center justify-center">
                  <Compass className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0d9488]">
                    OUR MISSION
                  </p>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                    4 Core Commitments of Our AI Co-Pilot for R&amp;D Teams
                  </h2>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-extrabold text-[#0f766e] mb-1">
                    01. Client Brief to Technical Specifications
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Menerjemahkan bahasa marketing klien brand menjadi parameter
                    formulator terukur (tipe sediaan, pH, viskositas cPs, kandidat bahan
                    aktif) dan bertanya balik bila brief kurang jelas.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-extrabold text-[#0f766e] mb-1">
                    02. 5-Layer Automated Screening
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Menyaring setiap draft formula lewat pengecek Regulasi BPOM/ASEAN,
                    Kompatibilitas &amp; Stabilitas, Status Halal, Ketersediaan Stok Gudang,
                    dan Biaya HPP.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-extrabold text-[#0f766e] mb-1">
                    03. Tiered Formula A, B, C &amp; Trade-offs
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Memberikan opsi Formula A (Ideal), Formula B (Hemat/Halal), dan
                    Formula C (Stok Tersedia di Gudang) lengkap dengan catatan
                    trade-off tiap substitusi.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="text-xs font-extrabold text-[#0f766e] mb-1">
                    04. Trial Planning, Learning Loop &amp; Documentation
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Merancang strategi percobaan lab, menganalisis kegagalan racikan
                    sebagai knowledge base maklon, dan menyiapkan dokumen BPOM &amp; Halal.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 5: 4 AI PILLARS & 3D MOLECULAR STUDIO */}
        <section
          id="empat-pilar-ai"
          className="bg-white rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10"
        >
          <div className="mb-8">
            <p className="text-xs font-extrabold tracking-[0.2em] uppercase text-[#0d9488] mb-2">
              ARTIFICIAL INTELLIGENCE ARCHITECTURE
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              Powered by 4 Modern AI Pillars &amp; 3D Molecular Studio
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-11 h-11 rounded-xl bg-teal-100 text-[#0f766e] flex items-center justify-center mb-4">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {FOUR_AI_PILLARS.generative.name}
              </h3>
              <p className="text-xs font-bold text-[#0f766e] mb-2">
                {FOUR_AI_PILLARS.generative.indonesianTitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {FOUR_AI_PILLARS.generative.description}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-11 h-11 rounded-xl bg-teal-100 text-[#0f766e] flex items-center justify-center mb-4">
                <Cpu className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {FOUR_AI_PILLARS.analytical.name}
              </h3>
              <p className="text-xs font-bold text-[#0f766e] mb-2">
                {FOUR_AI_PILLARS.analytical.indonesianTitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {FOUR_AI_PILLARS.analytical.description}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-11 h-11 rounded-xl bg-teal-100 text-[#0f766e] flex items-center justify-center mb-4">
                <Volume2 className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {FOUR_AI_PILLARS.interactive.name}
              </h3>
              <p className="text-xs font-bold text-[#0f766e] mb-2">
                {FOUR_AI_PILLARS.interactive.indonesianTitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {FOUR_AI_PILLARS.interactive.description}
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="w-11 h-11 rounded-xl bg-teal-100 text-[#0f766e] flex items-center justify-center mb-4">
                <Eye className="w-5 h-5" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 mb-1">
                {FOUR_AI_PILLARS.vision.name}
              </h3>
              <p className="text-xs font-bold text-[#0f766e] mb-2">
                {FOUR_AI_PILLARS.vision.indonesianTitle}
              </p>
              <p className="text-xs text-slate-600 leading-relaxed">
                {FOUR_AI_PILLARS.vision.description}
              </p>
            </div>
          </div>

          {/* BOTTOM CTA BANNER */}
          <div className="mt-8 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-[#12382f] via-[#0f766e] to-[#14b8a6] text-white flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
                <Atom className="w-6 h-6 text-emerald-200" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold">
                  Ready to Accelerate Formulation Research in Your R&amp;D Lab?
                </h3>
                <p className="text-xs text-emerald-50/90 mt-0.5">
                  Klik tombol Login untuk masuk ke ruang kerja R&amp;D Maklon,
                  AI Chemist Co-Pilot, dan database bahan baku 3D.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => openLoginWithMode("login")}
              className="px-6 py-3 rounded-full bg-white text-[#12382f] hover:bg-emerald-50 font-extrabold text-xs sm:text-sm shadow-md transition flex items-center gap-2 cursor-pointer shrink-0"
            >
              <LogIn className="w-4 h-4" />
              <span>Open Login Page</span>
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}