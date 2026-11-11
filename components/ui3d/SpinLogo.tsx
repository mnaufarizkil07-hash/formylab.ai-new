"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";

export interface SpinLogoProps {
  size?: "sm" | "lg";
  className?: string;
}

/**
 * <SpinLogo />
 * - Berputar 360 derajat pada sumbu Y (flip 3D) saat mouseenter (desktop) atau tap (mobile)
 * - Durasi dikontrol oleh CSS variable var(--spin-duration) (default 0.8s, ease-in-out)
 * - Putar SEKALI per hover: selama animasi berjalan, hover berikutnya diabaikan (cegah patah/glitch)
 * - Setelah selesai, kembali ke 0 derajat tanpa lompatan visual
 */
export default function SpinLogo({ size = "lg", className = "" }: SpinLogoProps) {
  const [isSpinning, setIsSpinning] = useState(false);
  const lockRef = useRef(false);

  const isLg = size === "lg";
  const imageSize = isLg ? 64 : 44;
  const textSize = isLg ? "text-4xl" : "text-2xl";

  const triggerSpin = () => {
    if (lockRef.current) return;
    lockRef.current = true;
    setIsSpinning(true);
  };

  const handleAnimationEnd = () => {
    setIsSpinning(false);
    lockRef.current = false;
  };

  return (
    <div
      onMouseEnter={triggerSpin}
      onTouchStart={triggerSpin}
      className={`spin-logo-wrapper min-h-[44px] select-none ${className}`}
      title="formylab.ai — Hover atau tap untuk putaran 3D 360°"
    >
      <div
        onAnimationEnd={handleAnimationEnd}
        className={`spin-logo-inner flex items-center gap-0 ${
          isSpinning ? "is-spinning" : ""
        }`}
      >
        <Image
          src="/logo.png"
          alt="Logo formylab"
          width={imageSize}
          height={imageSize}
          referrerPolicy="no-referrer"
          className={`object-contain w-auto h-auto ${
            isLg ? "max-h-16 -mr-3" : "max-h-11 -mr-2.5"
          }`}
        />
        <span
          className={`font-extrabold text-[var(--color-navy)] tracking-tighter ${textSize}`}
        >
          formylab<span className="text-[var(--color-menthe)]">.ai</span>
        </span>
      </div>
    </div>
  );
}
