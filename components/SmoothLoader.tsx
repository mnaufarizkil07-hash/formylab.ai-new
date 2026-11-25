"use client";

import React, { useEffect, useRef, useState } from "react";
import BrandLogo from "./BrandLogo";

const SESSION_KEY = "formylab_smooth_loader_shown";

/**
 * Lightweight, non-blocking GPU-accelerated initial page loader.
 * Shows once per browser session, fades/lifts cleanly at ~750ms, and unmounts from DOM
 * so WebGL and user interactions have zero runtime overhead.
 */
export default function SmoothLoader() {
  const [phase, setPhase] = useState<"hidden" | "visible" | "exiting">("hidden");
  const triggeredRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const prefersReducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) return;

    let alreadySeen = false;
    try {
      alreadySeen = window.sessionStorage.getItem(SESSION_KEY) === "1";
    } catch {
      alreadySeen = false;
    }

    if (!triggeredRef.current && alreadySeen) {
      return;
    }

    triggeredRef.current = true;
    try {
      window.sessionStorage.setItem(SESSION_KEY, "1");
    } catch {
      // Ignore storage access restrictions inside sandboxed iframes
    }

    const frameId = window.requestAnimationFrame(() => {
      setPhase("visible");
    });

    const exitTimer = window.setTimeout(() => {
      setPhase("exiting");
    }, 760);

    const unmountTimer = window.setTimeout(() => {
      setPhase("hidden");
    }, 1340);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(exitTimer);
      window.clearTimeout(unmountTimer);
    };
  }, []);

  if (phase === "hidden") return null;

  const isExiting = phase === "exiting";

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label="Loading formylab.ai"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center pointer-events-none select-none will-change-transform"
      style={{
        background: "var(--gradient-clean-base)",
        opacity: isExiting ? 0 : 1,
        transform: isExiting
          ? "translate3d(0, -12px, 0) scale(0.99)"
          : "translate3d(0, 0, 0) scale(1)",
        transition:
          "opacity 550ms cubic-bezier(0.22, 1, 0.36, 1), transform 550ms cubic-bezier(0.22, 1, 0.36, 1)",
      }}
    >
      {/* Subtle 6-Color Atmospheric Glow Behind Logo */}
      <div
        aria-hidden="true"
        className="absolute w-[580px] h-[580px] rounded-full pointer-events-none"
        style={{
          background:
            "radial-gradient(circle, rgba(63, 198, 197, 0.24) 0%, rgba(137, 215, 140, 0.16) 44%, transparent 72%)",
        }}
      />

      {/* Centered Clean BrandLogo Pill + Thin Aqua–Mint–Lime Progress Bar */}
      <div className="relative z-10 flex flex-col items-center auros-loader-reveal">
        <div className="bg-white/90 backdrop-blur-md border border-[#3FC6C5]/25 rounded-full px-8 py-4">
          <BrandLogo variant="light" size="md" />
        </div>
        <div className="mt-6 h-[2px] w-44 rounded-full bg-[#0B2B26]/12 overflow-hidden">
          <div
            className="h-full w-full rounded-full origin-left auros-loader-bar"
            style={{
              background:
                "linear-gradient(90deg, #0C8786 0%, #3FC6C5 45%, #82CB82 78%, #ADE180 100%)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
