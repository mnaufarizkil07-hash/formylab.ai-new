"use client";

import React, { useState, useRef } from "react";
import {
  FileText,
  FlaskConical,
  ShieldCheck,
  CheckCircle2,
  Scale,
  Calculator,
  Repeat,
  ClipboardList,
  RefreshCw,
} from "lucide-react";

export const MODULE_ICONS: Record<string, React.ReactNode> = {
  "brief-interpreter": <FileText className="w-7 h-7 text-white stroke-[2]" />,
  "formula-generator": <FlaskConical className="w-7 h-7 text-white stroke-[2]" />,
  "regulatory-checker": <ShieldCheck className="w-7 h-7 text-white stroke-[2]" />,
  "halal-checker": <CheckCircle2 className="w-7 h-7 text-white stroke-[2]" />,
  "compatibility-checker": <Scale className="w-7 h-7 text-white stroke-[2]" />,
  "inventory-cost-optimizer": <Calculator className="w-7 h-7 text-white stroke-[2]" />,
  "substitution-engine": <Repeat className="w-7 h-7 text-white stroke-[2]" />,
  "trial-planner": <ClipboardList className="w-7 h-7 text-white stroke-[2]" />,
  "learning-loop": <RefreshCw className="w-7 h-7 text-white stroke-[2]" />,
};

interface SpinModuleCardProps {
  moduleId: string;
  name: string;
  fungsi: string;
  onClick?: () => void;
  actionLabel?: string;
}

/**
 * <SpinModuleCard />
 * Menampilkan item modul AI dengan:
 * - Satu warna brand tunggal yang bersih dan rapi (tanpa warna-warni pelangi & tanpa efek pantulan cahaya/glare)
 * - Tanpa label Tahap
 * - Efek putar 360 derajat pada sumbu Y saat mouseenter atau tap
 */
export default function SpinModuleCard({
  moduleId,
  name,
  fungsi,
  onClick,
}: SpinModuleCardProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const spinningLockRef = useRef(false);

  const icon = MODULE_ICONS[moduleId] || MODULE_ICONS["brief-interpreter"];

  const triggerSpin = () => {
    if (spinningLockRef.current) return;
    spinningLockRef.current = true;
    setIsSpinning(true);
  };

  const handleAnimationEnd = () => {
    spinningLockRef.current = false;
    setIsSpinning(false);
  };

  return (
    <div
      onMouseEnter={triggerSpin}
      onTouchStart={triggerSpin}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                triggerSpin();
                onClick();
              }
            }
          : undefined
      }
      className={`group flex items-center gap-5 p-5 sm:p-6 rounded-3xl bg-white hover:bg-emerald-50/40 border border-slate-200/80 hover:border-[#0d9488]/40 shadow-xs hover:shadow-md transition-all ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      {/* 3D Perspective Wrapper for 360° Y-Axis Spin — Clean Single Solid Brand Color, No Glare */}
      <div className="spin-logo-wrapper shrink-0">
        <div
          onAnimationEnd={handleAnimationEnd}
          className={`spin-logo-inner w-16 h-16 sm:w-18 sm:h-18 rounded-full bg-[#10b981] flex items-center justify-center ${
            isSpinning ? "is-spinning" : ""
          }`}
        >
          {icon}
        </div>
      </div>

      {/* Right Column: Clean Heading + Subtitle (No Stage Tag) */}
      <div className="min-w-0 flex-1">
        <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 tracking-tight mb-1 group-hover:text-[#0f766e] transition-colors">
          {name}
        </h3>
        <p className="text-sm sm:text-[15px] text-slate-500 font-medium leading-relaxed">
          {fungsi}
        </p>
      </div>
    </div>
  );
}
