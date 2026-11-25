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
  "brief-interpreter": <FileText aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "formula-generator": <FlaskConical aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "regulatory-checker": <ShieldCheck aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "halal-checker": <CheckCircle2 aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "compatibility-checker": <Scale aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "inventory-cost-optimizer": <Calculator aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "substitution-engine": <Repeat aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "trial-planner": <ClipboardList aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
  "learning-loop": <RefreshCw aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />,
};

interface SpinModuleCardProps {
  moduleId: string;
  name: string;
  fungsi: string;
  onClick?: () => void;
  actionLabel?: string;
}

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
      className={`group flex items-start gap-4 p-6 rounded-[16px] bg-white hover:bg-[#f6fdfb] border border-[#0B2B26]/10 hover:border-[#47C4A5] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] ${
        onClick ? "cursor-pointer" : ""
      }`}
    >
      <div className="spin-logo-wrapper shrink-0 pt-0.5">
        <div
          onAnimationEnd={handleAnimationEnd}
          className={`spin-logo-inner flex items-center justify-center ${
            isSpinning ? "is-spinning" : ""
          }`}
        >
          {icon}
        </div>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="text-[17px] font-medium text-[#0B2B26] tracking-[-0.02em] mb-1.5 group-hover:text-[#0E807E] transition-colors">
          {name}
        </h3>
        <p className="text-[14px] text-[#2E524C] font-normal leading-[1.45]">
          {fungsi.replace(/\s*—\s*/g, ", ")}
        </p>
      </div>
    </div>
  );
}
