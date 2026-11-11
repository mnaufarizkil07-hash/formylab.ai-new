"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  FlaskConical,
  Atom,
  ShieldCheck,
  RotateCcw,
  Sliders,
  MousePointerClick,
  Layers,
  CheckCircle2,
  ArrowRight,
} from "lucide-react";
import WorkspaceNavbar from "../../components/WorkspaceNavbar";
import LivingLabBackground from "../../components/LivingLabBackground";
import Button3D from "../../components/ui3d/Button3D";
import SpinLogo from "../../components/ui3d/SpinLogo";
import TiltCard from "../../components/ui3d/TiltCard";
import FloatingHeroDecor from "../../components/ui3d/FloatingHeroDecor";

export default function Demo3DUIPage() {
  const router = useRouter();
  const [btnDepth, setBtnDepth] = useState(6);
  const [btnPress, setBtnPress] = useState(4);
  const [spinDuration, setSpinDuration] = useState(0.8);
  const [tiltMax, setTiltMax] = useState(10);
  const [clickCount, setClickCount] = useState(0);

  const updateDesignToken = (token: string, value: string) => {
    if (typeof document !== "undefined") {
      document.documentElement.style.setProperty(token, value);
    }
  };

  const handleResetTokens = () => {
    setBtnDepth(6);
    setBtnPress(4);
    setSpinDuration(0.8);
    setTiltMax(10);
    updateDesignToken("--btn-depth", "6px");
    updateDesignToken("--btn-press", "4px");
    updateDesignToken("--spin-duration", "0.8s");
    updateDesignToken("--tilt-max", "10deg");
  };

  return (
    <div className="min-h-screen relative font-sans text-slate-800 pb-24 overflow-x-hidden">
      <LivingLabBackground variant="mint" />
      <WorkspaceNavbar backHref="/" backLabel="Kembali ke Landpage" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-4 space-y-10">
        {/* HERO BANNER WITH FLOATING 3D DECOR */}
        <section className="relative bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-12 shadow-[0_24px_60px_-15px_rgba(16,68,56,0.16)] border border-emerald-900/10 overflow-hidden">
          <FloatingHeroDecor />

          <div className="relative z-10 max-w-3xl">
            <span className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[#0d9488] bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-200 mb-4">
              <Layers className="w-3.5 h-3.5" />
              <span>Interactive 3D UI System Playground · formylab.ai</span>
            </span>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight mb-4">
              Uji Coba Komponen 3D Interaktif:{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#0f766e] to-[#10b981]">
                Button3D, SpinLogo &amp; TiltCard
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-600 leading-relaxed mb-6">
              Halaman demo khusus untuk mencoba efek tombol fisik 3D dengan{" "}
              <em>cursor-origin ripple</em>, logo berputar 360° pada sumbu Y saat{" "}
              <code>mouseenter</code> / tap, kartu 3D tilt dengan <em>radial glare</em>{" "}
              &amp; parallax <code>translateZ</code>, serta kustomisasi langsung{" "}
              <strong>Design Tokens CSS</strong>.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button3D
                variant="primary"
                size="md"
                onClick={() => setClickCount((c) => c + 1)}
              >
                <MousePointerClick className="w-4 h-4" />
                <span>Klik Tombol 3D Ini ({clickCount}x)</span>
              </Button3D>

              <Button3D
                variant="secondary"
                size="md"
                onClick={() => router.push("/dashboard")}
              >
                <span>Buka Dashboard R&amp;D</span>
                <ArrowRight className="w-4 h-4 text-[#0f766e]" />
              </Button3D>
            </div>
          </div>
        </section>

        {/* LIVE DESIGN TOKEN CONTROLLER */}
        <section className="bg-white/95 backdrop-blur-xl rounded-[2.2rem] p-7 sm:p-9 shadow-[0_20px_50px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 text-[#0f766e] flex items-center justify-center">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">
                  Live Design Token Customizer (CSS Variables)
                </h2>
                <p className="text-xs text-slate-500">
                  Geser slider untuk mengubah variabel CSS di <code>:root</code> secara real-time
                </p>
              </div>
            </div>

            <Button3D
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetTokens}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0f766e]" />
              <span>Reset Default Tokens</span>
            </Button3D>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex justify-between text-xs font-mono font-bold text-slate-700 mb-2">
                <span>--btn-depth</span>
                <span className="text-[#0f766e]">{btnDepth}px</span>
              </div>
              <input
                type="range"
                min={2}
                max={12}
                step={1}
                value={btnDepth}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBtnDepth(v);
                  updateDesignToken("--btn-depth", `${v}px`);
                }}
                className="w-full accent-[#0d9488] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Tinggi timbul 3D tombol saat kondisi normal (default: 6px).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex justify-between text-xs font-mono font-bold text-slate-700 mb-2">
                <span>--btn-press</span>
                <span className="text-[#0f766e]">{btnPress}px</span>
              </div>
              <input
                type="range"
                min={1}
                max={10}
                step={1}
                value={btnPress}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setBtnPress(v);
                  updateDesignToken("--btn-press", `${v}px`);
                }}
                className="w-full accent-[#0d9488] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Kedalaman tekan tombol saat <code>:active</code> (default: 4px).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex justify-between text-xs font-mono font-bold text-slate-700 mb-2">
                <span>--spin-duration</span>
                <span className="text-[#0f766e]">{spinDuration}s</span>
              </div>
              <input
                type="range"
                min={0.3}
                max={2.0}
                step={0.1}
                value={spinDuration}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setSpinDuration(v);
                  updateDesignToken("--spin-duration", `${v}s`);
                }}
                className="w-full accent-[#0d9488] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Durasi putaran 360° sumbu Y pada <code>&lt;SpinLogo /&gt;</code> (default: 0.8s).
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="flex justify-between text-xs font-mono font-bold text-slate-700 mb-2">
                <span>--tilt-max</span>
                <span className="text-[#0f766e]">{tiltMax}deg</span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                step={1}
                value={tiltMax}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTiltMax(v);
                  updateDesignToken("--tilt-max", `${v}deg`);
                }}
                className="w-full accent-[#0d9488] cursor-pointer"
              />
              <p className="text-[11px] text-slate-500 mt-1.5">
                Sudut miring maksimal sumbu X/Y pada <code>&lt;TiltCard /&gt;</code> (default: 10deg).
              </p>
            </div>
          </div>
        </section>

        {/* DEMO 1 & 2: BUTTON3D & SPINLOGO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* 1. BUTTON 3D SHOWCASE */}
          <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl rounded-[2.2rem] p-7 sm:p-9 shadow-[0_20px_50px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10 flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0d9488] mb-2">
                KOMPONEN 1 · &lt;Button3D /&gt;
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                Tombol Fisik 3D + Cursor-Origin Ripple
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Memiliki <code>box-shadow: 0 var(--btn-depth) 0</code> warna lebih gelap,
                naik <code>-2px</code> saat hover, turun <code>var(--btn-press)</code> saat
                ditekan (100ms ease-out), membal kembali dengan{" "}
                <code>var(--ease-spring)</code>, serta memunculkan lingkaran ripple
                transparan dari titik koordinat klik kursor selama 500ms.
              </p>

              <div className="flex flex-wrap items-center gap-4 mb-6">
                <Button3D
                  variant="primary"
                  size="lg"
                  onClick={() => setClickCount((c) => c + 1)}
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Primary Teal-Green</span>
                </Button3D>

                <Button3D
                  variant="navy"
                  size="lg"
                  onClick={() => setClickCount((c) => c + 1)}
                >
                  <FlaskConical className="w-4 h-4 text-emerald-300" />
                  <span>Brand Navy Gelap</span>
                </Button3D>

                <Button3D
                  variant="secondary"
                  size="lg"
                  onClick={() => setClickCount((c) => c + 1)}
                >
                  <ShieldCheck className="w-4 h-4 text-[#0f766e]" />
                  <span>Secondary Putih</span>
                </Button3D>

                <Button3D variant="disabled" size="lg" disabled>
                  <span>Disabled (Tanpa Tekan)</span>
                </Button3D>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200/80 text-xs text-slate-700 flex items-center justify-between">
              <span>
                Dukungan Keyboard Focus Ring (<code>Tab</code> + <code>Space/Enter</code>) &amp;
                Tap Target ≥ 44px
              </span>
              <span className="font-mono font-bold text-[#0f766e]">
                Total Klik: {clickCount}
              </span>
            </div>
          </div>

          {/* 2. SPIN LOGO 360 SHOWCASE */}
          <div className="lg:col-span-5 bg-white/95 backdrop-blur-xl rounded-[2.2rem] p-7 sm:p-9 shadow-[0_20px_50px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10 flex flex-col justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0d9488] mb-2">
                KOMPONEN 2 · &lt;SpinLogo /&gt;
              </p>
              <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
                Logo Berputar 360° Sumbu Y
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mb-6">
                Arahkan kursor (<code>mouseenter</code>) atau tap pada logo di bawah ini.
                Logo berputar sekali penuh 360° pada sumbu Y dengan{" "}
                <code>perspective: 800px</code> dan mengabaikan hover baru selama animasi
                masih berjalan agar bebas glitch.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center gap-2">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Ukuran Large (Hero / Login) — Hover atau Tap
                  </span>
                  <SpinLogo size="lg" />
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col items-center justify-center gap-2">
                  <span className="text-[11px] font-mono uppercase text-slate-400">
                    Ukuran Small (Navbar / Footer) — Hover atau Tap
                  </span>
                  <SpinLogo size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DEMO 3: 3D TILT CARDS WITH RADIAL GLARE & PARALLAX DEPTH */}
        <section className="bg-white/95 backdrop-blur-xl rounded-[2.5rem] p-8 sm:p-10 shadow-[0_22px_55px_-15px_rgba(16,68,56,0.14)] border border-emerald-900/10">
          <div className="mb-8">
            <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[#0d9488] mb-2">
              KOMPONEN 3 · &lt;TiltCard /&gt;
            </p>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5">
              Kartu Tilt 3D (Perspective 1000px + Glare + Parallax translateZ)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Gerakkan kursor di atas ketiga kartu di bawah ini untuk merasakan efek
              kemiringan 3D dengan <code>requestAnimationFrame</code>, pantulan cahaya
              radial, dan kedalaman berlapis pada ikon serta judul.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1: Kartu Fitur AI */}
            <TiltCard className="p-7 rounded-3xl bg-[#f4f9f9] border border-emerald-900/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="tilt-depth-lg w-16 h-16 rounded-full bg-[#007a99] flex items-center justify-center text-white shadow-md mb-5">
                  <FlaskConical className="w-7 h-7" />
                </div>
                <span className="tilt-depth-sm text-xs font-mono font-bold text-[#007a99] uppercase">
                  KARTU FITUR MODUL AI
                </span>
                <h3 className="tilt-depth-lg text-xl font-extrabold text-slate-900 mt-1 mb-2">
                  Formula Generator
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Menyusun kandidat formula lengkap beserta fase proses pembuatan, target
                  pH, dan viskositas Brookfield cPs.
                </p>
              </div>
              <div className="tilt-depth-sm pt-4 border-t border-slate-200/80 text-xs font-bold text-[#0f766e] flex items-center justify-between">
                <span>Parallax Icon: translateZ(34px)</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </TiltCard>

            {/* Card 2: Kartu Molekul 3D */}
            <TiltCard className="p-7 rounded-3xl bg-gradient-to-br from-[#0f2922] via-[#12382f] to-[#0f172a] text-white shadow-lg flex flex-col justify-between">
              <div>
                <div className="tilt-depth-lg w-16 h-16 rounded-full bg-[#52c484] flex items-center justify-center text-white shadow-md mb-5">
                  <Atom className="w-7 h-7" />
                </div>
                <span className="tilt-depth-sm text-xs font-mono font-bold text-emerald-300 uppercase">
                  KARTU MOLEKUL AKTIF
                </span>
                <h3 className="tilt-depth-lg text-xl font-extrabold text-white mt-1 mb-2">
                  Niacinamide (Vit B3)
                </h3>
                <p className="text-sm text-emerald-100/85 leading-relaxed mb-6">
                  CAS 98-92-0 · Kompatibilitas 98% · Rentang pH Optimal 5.0–7.0 · Bersertifikat
                  Halal LPPOM MUI.
                </p>
              </div>
              <div className="tilt-depth-sm pt-4 border-t border-white/15 text-xs font-bold text-emerald-300 flex items-center justify-between">
                <span>Glare Opacity Maks: 0.25</span>
                <Sparkles className="w-4 h-4" />
              </div>
            </TiltCard>

            {/* Card 3: Kartu Hasil Analisis */}
            <TiltCard className="p-7 rounded-3xl bg-[#f4f9f9] border border-emerald-900/10 shadow-sm flex flex-col justify-between">
              <div>
                <div className="tilt-depth-lg w-16 h-16 rounded-full bg-[#52c484] flex items-center justify-center text-white shadow-md mb-5">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <span className="tilt-depth-sm text-xs font-mono font-bold text-[#0f766e] uppercase">
                  KARTU HASIL ANALISIS
                </span>
                <h3 className="tilt-depth-lg text-xl font-extrabold text-slate-900 mt-1 mb-2">
                  Regulatory &amp; Halal Pass
                </h3>
                <p className="text-sm text-slate-600 leading-relaxed mb-6">
                  Seluruh bahan memenuhi batas konsentrasi BPOM/ASEAN Cosmetic Directive
                  dengan estimasi HPP Rp 18.400 / unit.
                </p>
              </div>
              <div className="tilt-depth-sm pt-4 border-t border-slate-200/80 text-xs font-bold text-[#0f766e] flex items-center justify-between">
                <span>Reset Transisi: 400ms</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </TiltCard>
          </div>
        </section>
      </main>
    </div>
  );
}
