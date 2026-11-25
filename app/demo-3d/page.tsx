"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FlaskConical,
  Atom,
  ShieldCheck,
  RotateCcw,
  Sliders,
  MousePointerClick,
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
    <div className="min-h-screen relative bg-[#f8fdfb] text-[#0B2B26] pb-24 overflow-x-clip">
      <LivingLabBackground variant="mint" />
      <WorkspaceNavbar backHref="/" backLabel="Kembali ke Landpage" />

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-10">
        {/* HERO BANNER WITH FLOATING 3D DECOR */}
        <section className="relative bg-white rounded-[16px] p-8 sm:p-12 border border-[#0B2B26]/10 overflow-hidden">
          <FloatingHeroDecor />

          <div className="relative z-10 max-w-3xl">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-3">
              Interactive 3D UI System Playground · formylab.ai
            </p>

            <h1 className="text-3xl sm:text-5xl font-medium text-[#0B2B26] tracking-[-0.03em] leading-[1.08] mb-4">
              Uji Coba Komponen 3D Interaktif:{" "}
              <span className="text-[#0E807E]">Button3D, SpinLogo &amp; TiltCard</span>
            </h1>

            <p className="text-sm sm:text-base text-[#2E524C] leading-relaxed mb-6">
              Halaman demo khusus untuk mencoba tombol pill clean, logo berputar 360° pada sumbu Y saat{" "}
              <code className="text-[#0E807E] bg-[#eaf9f5] px-1.5 py-0.5 rounded-[4px]">mouseenter</code> / tap, kartu 3D tilt, serta kustomisasi langsung{" "}
              <span className="font-medium text-[#0B2B26]">Design Tokens CSS</span>.
            </p>

            <div className="flex flex-wrap items-center gap-3">
              <Button3D
                variant="primary"
                size="md"
                onClick={() => setClickCount((c) => c + 1)}
              >
                <MousePointerClick className="w-4 h-4 text-[#0E807E]" />
                <span>Klik Tombol Ini ({clickCount}x)</span>
              </Button3D>

              <Button3D
                variant="secondary"
                size="md"
                onClick={() => router.push("/dashboard")}
              >
                <span>Buka Dashboard R&amp;D</span>
                <ArrowRight className="w-4 h-4 text-[#0E807E]" />
              </Button3D>
            </div>
          </div>
        </section>

        {/* LIVE DESIGN TOKEN CONTROLLER */}
        <section className="bg-white rounded-[16px] p-7 sm:p-9 border border-[#0B2B26]/10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <Sliders className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />
              <div>
                <h2 className="text-xl font-medium text-[#0B2B26] tracking-[-0.02em]">
                  Live Design Token Customizer (CSS Variables)
                </h2>
                <p className="text-xs text-[#2E524C]">
                  Geser slider untuk mengubah variabel CSS di{" "}
                  <code className="text-[#0E807E]">:root</code> secara real-time
                </p>
              </div>
            </div>

            <Button3D
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleResetTokens}
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#0E807E]" />
              <span>Reset Default Tokens</span>
            </Button3D>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <div className="p-4 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10">
              <div className="flex justify-between text-xs font-sans font-medium text-[#2E524C] mb-2">
                <span>--btn-depth</span>
                <span className="text-[#0E807E] tabular-nums">{btnDepth}px</span>
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
                className="w-full accent-[#0E807E] cursor-pointer"
              />
              <p className="text-[11px] text-[#2E524C] mt-1.5">
                Tinggi timbul tombol saat kondisi normal (default: 6px).
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10">
              <div className="flex justify-between text-xs font-sans font-medium text-[#2E524C] mb-2">
                <span>--btn-press</span>
                <span className="text-[#0E807E] tabular-nums">{btnPress}px</span>
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
                className="w-full accent-[#0E807E] cursor-pointer"
              />
              <p className="text-[11px] text-[#2E524C] mt-1.5">
                Kedalaman tekan tombol saat <code className="text-[#0E807E]">:active</code> (default: 4px).
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10">
              <div className="flex justify-between text-xs font-sans font-medium text-[#2E524C] mb-2">
                <span>--spin-duration</span>
                <span className="text-[#0E807E] tabular-nums">{spinDuration}s</span>
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
                className="w-full accent-[#0E807E] cursor-pointer"
              />
              <p className="text-[11px] text-[#2E524C] mt-1.5">
                Durasi putaran 360° sumbu Y pada <code className="text-[#0E807E]">&lt;SpinLogo /&gt;</code>.
              </p>
            </div>

            <div className="p-4 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10">
              <div className="flex justify-between text-xs font-sans font-medium text-[#2E524C] mb-2">
                <span>--tilt-max</span>
                <span className="text-[#0E807E] tabular-nums">{tiltMax}deg</span>
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
                className="w-full accent-[#0E807E] cursor-pointer"
              />
              <p className="text-[11px] text-[#2E524C] mt-1.5">
                Sudut miring maksimal sumbu X/Y pada <code className="text-[#0E807E]">&lt;TiltCard /&gt;</code>.
              </p>
            </div>
          </div>
        </section>

        {/* DEMO 1 & 2: BUTTON3D & SPINLOGO */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          <div className="lg:col-span-7 bg-white rounded-[16px] p-7 sm:p-9 border border-[#0B2B26]/10 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-2">
                01 · &lt;Button3D /&gt;
              </p>
              <h2 className="text-2xl font-medium text-[#0B2B26] tracking-[-0.02em] mb-2">
                Clean Pill Action Buttons (Zero Shadow)
              </h2>
              <p className="text-xs sm:text-sm text-[#2E524C] leading-relaxed mb-6">
                Seluruh tombol menggunakan bentuk pill <code className="text-[#0E807E]">rounded-full</code> tanpa drop-shadow dengan feedback tekan halus <code className="text-[#0E807E]">active:scale-[0.97]</code>.
              </p>

              <div className="flex flex-wrap items-center gap-3.5 mb-6">
                <Button3D
                  variant="primary"
                  size="lg"
                  onClick={() => setClickCount((c) => c + 1)}
                >
                  <FlaskConical className="w-4 h-4 text-[#0E807E]" />
                  <span>Primary Ink</span>
                </Button3D>

                <Button3D
                  variant="navy"
                  size="lg"
                  onClick={() => setClickCount((c) => c + 1)}
                >
                  <span>Aqua–Lime Gradient</span>
                </Button3D>

                <Button3D
                  variant="secondary"
                  size="lg"
                  onClick={() => setClickCount((c) => c + 1)}
                >
                  <ShieldCheck className="w-4 h-4 text-[#0E807E]" />
                  <span>Secondary Clean</span>
                </Button3D>

                <Button3D variant="disabled" size="lg" disabled>
                  <span>Disabled</span>
                </Button3D>
              </div>
            </div>

            <div className="p-3.5 rounded-[12px] bg-[#f4fbf8] border border-[#0B2B26]/10 text-xs text-[#2E524C] flex items-center justify-between">
              <span>Dukungan Keyboard Focus &amp; Tap Target ≥ 40px</span>
              <span className="font-sans font-medium text-[#0E807E] tabular-nums">
                Total Klik: {clickCount}
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-[16px] p-7 sm:p-9 border border-[#0B2B26]/10 flex flex-col justify-between">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-2">
                02 · &lt;SpinLogo /&gt;
              </p>
              <h2 className="text-2xl font-medium text-[#0B2B26] tracking-[-0.02em] mb-2">
                Logo Berputar 360° Sumbu Y
              </h2>
              <p className="text-xs sm:text-sm text-[#2E524C] leading-relaxed mb-6">
                Arahkan kursor (<code className="text-[#0E807E]">mouseenter</code>) atau tap pada logo di bawah ini untuk memutar 360° pada sumbu Y.
              </p>

              <div className="grid grid-cols-1 gap-4">
                <div className="p-5 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10 flex flex-col items-center justify-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[#2E524C]">
                    Ukuran Large (Hero / Login)
                  </span>
                  <SpinLogo size="lg" />
                </div>

                <div className="p-4 rounded-[16px] bg-[#f4fbf8] border border-[#0B2B26]/10 flex flex-col items-center justify-center gap-2">
                  <span className="text-[11px] uppercase tracking-[0.08em] text-[#2E524C]">
                    Ukuran Small (Navbar / Footer)
                  </span>
                  <SpinLogo size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* DEMO 3: EDITORIAL CARDS */}
        <section className="bg-white rounded-[16px] p-8 sm:p-10 border border-[#0B2B26]/10">
          <div className="mb-8">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-[#0E807E] mb-2">
              03 · &lt;TiltCard /&gt;
            </p>
            <h2 className="text-2xl sm:text-3xl font-medium text-[#0B2B26] tracking-[-0.02em] mb-1.5">
              Clean Editorial R&amp;D Cards
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <TiltCard className="p-7 rounded-[16px] bg-[#f8fdfb] border border-[#0B2B26]/10 hover:border-[#47C4A5] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[12px] font-sans font-medium text-[#0E807E]">
                    01 · Modul AI
                  </span>
                  <FlaskConical className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-medium text-[#0B2B26] mb-2">
                  Formula Generator
                </h3>
                <p className="text-sm text-[#2E524C] leading-relaxed mb-6">
                  Menyusun kandidat formula lengkap beserta fase proses pembuatan, target
                  pH, dan viskositas Brookfield cPs.
                </p>
              </div>
              <div className="pt-4 border-t border-[#0B2B26]/10 text-xs font-medium text-[#0E807E] flex items-center justify-between">
                <span>Zero-Shadow Hairline Card</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </TiltCard>

            <TiltCard className="p-7 rounded-[16px] bg-[#f8fdfb] border border-[#0B2B26]/10 hover:border-[#47C4A5] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[12px] font-sans font-medium text-[#0E807E]">
                    02 · Molekul Aktif
                  </span>
                  <Atom className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-medium text-[#0B2B26] mb-2">
                  Niacinamide (Vit B3)
                </h3>
                <p className="text-sm text-[#2E524C] leading-relaxed mb-6">
                  CAS 98-92-0 · Kompatibilitas{" "}
                  <span className="text-[#0E807E] font-medium tabular-nums">98%</span> · Rentang pH Optimal 5.0–7.0 · Bersertifikat
                  Halal LPPOM MUI.
                </p>
              </div>
              <div className="pt-4 border-t border-[#0B2B26]/10 text-xs font-medium text-[#0E807E] flex items-center justify-between">
                <span>Clean Light Viewport</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </TiltCard>

            <TiltCard className="p-7 rounded-[16px] bg-[#f8fdfb] border border-[#0B2B26]/10 hover:border-[#47C4A5] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-5">
                  <span className="text-[12px] font-sans font-medium text-[#0E807E]">
                    03 · Hasil Analisis
                  </span>
                  <ShieldCheck className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />
                </div>
                <h3 className="text-xl font-medium text-[#0B2B26] mb-2">
                  Regulatory &amp; Halal Pass
                </h3>
                <p className="text-sm text-[#2E524C] leading-relaxed mb-6">
                  Seluruh bahan memenuhi batas konsentrasi BPOM/ASEAN Cosmetic Directive
                  dengan estimasi HPP{" "}
                  <span className="text-[#0E807E] font-medium tabular-nums">Rp 18.400 / unit</span>.
                </p>
              </div>
              <div className="pt-4 border-t border-[#0B2B26]/10 text-xs font-medium text-[#0E807E] flex items-center justify-between">
                <span>BPOM · Halal Verified</span>
                <CheckCircle2 className="w-4 h-4" />
              </div>
            </TiltCard>
          </div>
        </section>
      </main>
    </div>
  );
}
