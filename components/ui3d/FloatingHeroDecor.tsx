"use client";

import React from "react";
import { Atom, Droplets, Leaf } from "lucide-react";

/**
 * <FloatingHeroDecor />
 * Elemen dekoratif 3D (molekul, gelembung, daun) yang melayang pelan naik-turun
 * 3-5 detik secara loop dengan delay berbeda tiap elemen (transform only, 60fps).
 */
export default function FloatingHeroDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none flex items-center gap-3 mb-4"
    >
      <div className="float-hero-slow w-10 h-10 rounded-2xl bg-gradient-to-br from-[#14b8a6] to-[#0f766e] text-white shadow-md flex items-center justify-center">
        <Atom className="w-5 h-5" />
      </div>
      <div className="float-hero-med w-9 h-9 rounded-2xl bg-emerald-100 border border-emerald-200 text-[#0f766e] shadow-xs flex items-center justify-center">
        <Droplets className="w-4 h-4" />
      </div>
      <div className="float-hero-fast w-9 h-9 rounded-2xl bg-teal-50 border border-teal-200 text-[#12382f] shadow-xs flex items-center justify-center">
        <Leaf className="w-4 h-4" />
      </div>
      <span className="text-[11px] font-mono font-bold text-[#0f766e] tracking-wider uppercase">
        3D Molecular · Emulsion · Botanical R&amp;D
      </span>
    </div>
  );
}
