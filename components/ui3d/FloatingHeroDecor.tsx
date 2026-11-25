"use client";

import React from "react";
import { Atom, Droplets, Leaf } from "lucide-react";

export default function FloatingHeroDecor() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none flex items-center gap-3 mb-4"
    >
      <div className="float-hero-slow w-9 h-9 rounded-[var(--radius-buttons)] bg-[var(--surface-liquid-kelp)] border border-[rgba(0,130,124,0.45)] text-[var(--color-liquid-mist)] flex items-center justify-center">
        <Atom className="w-4 h-4" />
      </div>
      <div className="float-hero-med w-9 h-9 rounded-[var(--radius-buttons)] bg-[var(--surface-liquid-deep)] border border-[rgba(112,119,119,0.3)] text-[var(--color-aurora-gradient)] flex items-center justify-center">
        <Droplets className="w-4 h-4" />
      </div>
      <div className="float-hero-fast w-9 h-9 rounded-[var(--radius-buttons)] bg-[var(--surface-liquid-deep)] border border-[rgba(112,119,119,0.3)] text-[var(--color-liquid-mist)] flex items-center justify-center">
        <Leaf className="w-4 h-4" />
      </div>
      <span className="eyebrow-label text-[var(--color-liquid-mist)]">
        3D Molecular · Emulsion · Botanical R&amp;D
      </span>
    </div>
  );
}
