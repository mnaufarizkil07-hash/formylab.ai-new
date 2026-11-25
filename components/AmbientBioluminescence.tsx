"use client";

import React, { useEffect, useRef } from "react";

export type AmbientVariant = "hero" | "section" | "cta";

interface AmbientBioluminescenceProps {
  variant?: AmbientVariant;
  className?: string;
}

export interface OrbMotionConfig {
  id: string;
  sizeClass: string;
  positionClass: string;
  background: string;
  blurPx: number;
  ampX: number;
  ampY: number;
  speedX: number;
  speedY: number;
  phaseX: number;
  phaseY: number;
  scaleSpeed: number;
  scaleAmp: number;
  scalePhase: number;
  baseOpacity: number;
  opacitySpeed: number;
  opacityAmp: number;
  opacityPhase: number;
}

export interface OrbFrame {
  dx: number;
  dy: number;
  scale: number;
  opacity: number;
  transform: string;
}

export function computeOrbFrame(
  timeSec: number,
  cfg: Pick<
    OrbMotionConfig,
    | "ampX"
    | "ampY"
    | "speedX"
    | "speedY"
    | "phaseX"
    | "phaseY"
    | "scaleSpeed"
    | "scaleAmp"
    | "scalePhase"
    | "baseOpacity"
    | "opacitySpeed"
    | "opacityAmp"
    | "opacityPhase"
  >
): OrbFrame {
  const dx = Math.sin(timeSec * cfg.speedX + cfg.phaseX) * cfg.ampX;
  const dy = Math.cos(timeSec * cfg.speedY + cfg.phaseY) * cfg.ampY;
  const scale = 1 + Math.sin(timeSec * cfg.scaleSpeed + cfg.scalePhase) * cfg.scaleAmp;
  const rawOpacity =
    cfg.baseOpacity + Math.sin(timeSec * cfg.opacitySpeed + cfg.opacityPhase) * cfg.opacityAmp;
  const opacity = Math.max(0.45, Math.min(1, rawOpacity));
  const transform = `translate3d(calc(-50% + ${dx.toFixed(2)}px), calc(-50% + ${dy.toFixed(2)}px), 0) scale(${scale.toFixed(4)})`;

  return { dx, dy, scale, opacity, transform };
}

const ORB_CONFIGS: Record<AmbientVariant, OrbMotionConfig[]> = {
  hero: [
    {
      id: "hero-mint",
      sizeClass: "w-[520px] h-[520px] md:w-[680px] md:h-[680px]",
      positionClass: "left-[24%] top-[44%]",
      background:
        "radial-gradient(circle, rgba(43, 184, 150, 0.88) 0%, rgba(71, 196, 165, 0.68) 32%, rgba(63, 198, 197, 0.30) 56%, rgba(71, 196, 165, 0) 74%)",
      blurPx: 24,
      ampX: 155,
      ampY: 75,
      speedX: 0.62,
      speedY: 0.52,
      phaseX: 0.2,
      phaseY: 0.9,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 0.0,
      baseOpacity: 0.9,
      opacitySpeed: 0.55,
      opacityAmp: 0.1,
      opacityPhase: 0.4,
    },
    {
      id: "hero-softgreen",
      sizeClass: "w-[540px] h-[540px] md:w-[700px] md:h-[700px]",
      positionClass: "left-[76%] top-[38%]",
      background:
        "radial-gradient(circle, rgba(114, 209, 118, 0.88) 0%, rgba(137, 215, 140, 0.70) 34%, rgba(173, 225, 128, 0.32) 58%, rgba(137, 215, 140, 0) 74%)",
      blurPx: 26,
      ampX: -165,
      ampY: 82,
      speedX: 0.54,
      speedY: 0.66,
      phaseX: 1.7,
      phaseY: 0.3,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 2.2,
      baseOpacity: 0.88,
      opacitySpeed: 0.48,
      opacityAmp: 0.1,
      opacityPhase: 1.8,
    },
    {
      id: "hero-aqua-lime",
      sizeClass: "w-[440px] h-[440px] md:w-[560px] md:h-[560px]",
      positionClass: "left-[50%] top-[76%]",
      background:
        "radial-gradient(circle, rgba(217, 237, 145, 0.84) 0%, rgba(137, 215, 140, 0.52) 40%, rgba(63, 198, 197, 0.20) 64%, transparent 78%)",
      blurPx: 22,
      ampX: 175,
      ampY: -68,
      speedX: 0.78,
      speedY: 0.58,
      phaseX: 3.1,
      phaseY: 1.4,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 4.1,
      baseOpacity: 0.84,
      opacitySpeed: 0.65,
      opacityAmp: 0.12,
      opacityPhase: 2.9,
    },
  ],
  section: [
    {
      id: "section-mint",
      sizeClass: "w-[520px] h-[520px] md:w-[680px] md:h-[680px]",
      positionClass: "left-[22%] top-[36%]",
      background:
        "radial-gradient(circle, rgba(43, 184, 150, 0.84) 0%, rgba(71, 196, 165, 0.64) 32%, rgba(63, 198, 197, 0.28) 56%, rgba(71, 196, 165, 0) 74%)",
      blurPx: 24,
      ampX: 145,
      ampY: 72,
      speedX: 0.58,
      speedY: 0.5,
      phaseX: 0.6,
      phaseY: 1.5,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 0.8,
      baseOpacity: 0.88,
      opacitySpeed: 0.52,
      opacityAmp: 0.1,
      opacityPhase: 0.7,
    },
    {
      id: "section-softgreen",
      sizeClass: "w-[540px] h-[540px] md:w-[700px] md:h-[700px]",
      positionClass: "left-[78%] top-[44%]",
      background:
        "radial-gradient(circle, rgba(114, 209, 118, 0.84) 0%, rgba(137, 215, 140, 0.66) 34%, rgba(173, 225, 128, 0.30) 58%, rgba(137, 215, 140, 0) 74%)",
      blurPx: 26,
      ampX: -155,
      ampY: 85,
      speedX: 0.52,
      speedY: 0.64,
      phaseX: 2.2,
      phaseY: 0.5,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 2.6,
      baseOpacity: 0.86,
      opacitySpeed: 0.46,
      opacityAmp: 0.1,
      opacityPhase: 1.9,
    },
    {
      id: "section-aqua-lime",
      sizeClass: "w-[440px] h-[440px] md:w-[560px] md:h-[560px]",
      positionClass: "left-[50%] top-[72%]",
      background:
        "radial-gradient(circle, rgba(217, 237, 145, 0.80) 0%, rgba(137, 215, 140, 0.50) 40%, rgba(63, 198, 197, 0.18) 64%, transparent 78%)",
      blurPx: 22,
      ampX: 165,
      ampY: -65,
      speedX: 0.82,
      speedY: 0.56,
      phaseX: 1.1,
      phaseY: 2.8,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 4.5,
      baseOpacity: 0.82,
      opacitySpeed: 0.62,
      opacityAmp: 0.12,
      opacityPhase: 3.1,
    },
  ],
  cta: [
    {
      id: "cta-mint-core",
      sizeClass: "w-[560px] h-[560px] md:w-[780px] md:h-[780px]",
      positionClass: "left-[43%] top-[48%]",
      background:
        "radial-gradient(circle, rgba(71, 196, 165, 0.56) 0%, rgba(71, 196, 165, 0.28) 38%, rgba(71, 196, 165, 0) 70%)",
      blurPx: 26,
      ampX: 130,
      ampY: 55,
      speedX: 0.65,
      speedY: 0.54,
      phaseX: 0.3,
      phaseY: 1.1,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 0.0,
      baseOpacity: 0.92,
      opacitySpeed: 0.58,
      opacityAmp: 0.08,
      opacityPhase: 0.2,
    },
    {
      id: "cta-softgreen-aura",
      sizeClass: "w-[580px] h-[580px] md:w-[820px] md:h-[820px]",
      positionClass: "left-[57%] top-[52%]",
      background:
        "radial-gradient(circle, rgba(137, 215, 140, 0.58) 0%, rgba(173, 225, 128, 0.26) 40%, rgba(137, 215, 140, 0) 70%)",
      blurPx: 28,
      ampX: -145,
      ampY: -60,
      speedX: 0.55,
      speedY: 0.64,
      phaseX: 1.6,
      phaseY: 0.6,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 2.1,
      baseOpacity: 0.92,
      opacitySpeed: 0.5,
      opacityAmp: 0.08,
      opacityPhase: 1.7,
    },
    {
      id: "cta-aqua-lemon-sweep",
      sizeClass: "w-[420px] h-[420px] md:w-[580px] md:h-[580px]",
      positionClass: "left-[50%] top-[56%]",
      background:
        "radial-gradient(circle, rgba(63, 198, 197, 0.44) 0%, rgba(217, 237, 145, 0.34) 44%, transparent 72%)",
      blurPx: 24,
      ampX: 160,
      ampY: 45,
      speedX: 0.8,
      speedY: 0.62,
      phaseX: 0.9,
      phaseY: 2.3,
      scaleSpeed: 0.7,
      scaleAmp: 0.14,
      scalePhase: 4.0,
      baseOpacity: 0.88,
      opacitySpeed: 0.66,
      opacityAmp: 0.1,
      opacityPhase: 2.8,
    },
  ],
};

/**
 * Real-time GPU-accelerated ambient bioluminescence driven by requestAnimationFrame + useRef.
 * Eliminates CSS @keyframes/translate conflicts and auto-pauses offscreen via IntersectionObserver.
 */
export default function AmbientBioluminescence({
  variant = "hero",
  className = "",
}: AmbientBioluminescenceProps) {
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const orbRefs = useRef<(HTMLDivElement | null)[]>([]);
  const orbs = ORB_CONFIGS[variant];

  useEffect(() => {
    const configs = ORB_CONFIGS[variant];
    const wrapperEl = wrapperRef.current;
    if (!wrapperEl || typeof window === "undefined") return;

    const applyAt = (timeSec: number) => {
      for (let i = 0; i < configs.length; i++) {
        const el = orbRefs.current[i];
        if (!el) continue;
        const frame = computeOrbFrame(timeSec, configs[i]);
        el.style.transform = frame.transform;
        el.style.opacity = frame.opacity.toFixed(3);
      }
    };

    const reducedMotion =
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reducedMotion) {
      for (let i = 0; i < configs.length; i++) {
        const el = orbRefs.current[i];
        if (!el) continue;
        el.style.transform = "translate3d(-50%, -50%, 0) scale(1)";
        el.style.opacity = configs[i].baseOpacity.toFixed(3);
      }
      return;
    }

    let rafId: number | null = null;
    let isIntersecting = true;
    let lastTimestamp: number | null = null;
    let elapsedSec = 0;

    // Initial synchronous paint so first frame is immediately positioned
    applyAt(0);

    const step = (now: number) => {
      rafId = null;
      if (!isIntersecting || document.hidden) {
        lastTimestamp = null;
        return;
      }

      if (lastTimestamp !== null) {
        const dt = Math.min(Math.max((now - lastTimestamp) / 1000, 0), 0.05);
        elapsedSec += dt;
      }
      lastTimestamp = now;

      applyAt(elapsedSec);
      rafId = window.requestAnimationFrame(step);
    };

    const startLoop = () => {
      if (rafId === null && isIntersecting && !document.hidden) {
        lastTimestamp = null;
        rafId = window.requestAnimationFrame(step);
      }
    };

    const stopLoop = () => {
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
        rafId = null;
      }
      lastTimestamp = null;
    };

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          isIntersecting = entry.isIntersecting;
          if (isIntersecting) {
            startLoop();
          } else {
            stopLoop();
          }
        },
        { rootMargin: "120px 0px" }
      );
      observer.observe(wrapperEl);
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (isIntersecting) {
        startLoop();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    startLoop();

    return () => {
      stopLoop();
      if (observer) observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [variant]);

  return (
    <div
      ref={wrapperRef}
      aria-hidden="true"
      data-ambient-variant={variant}
      className={`pointer-events-none absolute inset-0 overflow-hidden select-none z-0 ${className}`}
    >
      {orbs.map((orb, index) => (
        <div
          key={orb.id}
          ref={(el) => {
            orbRefs.current[index] = el;
          }}
          className={`pointer-events-none will-change-transform absolute rounded-full ${orb.sizeClass} ${orb.positionClass}`}
          style={{
            background: orb.background,
            filter: `blur(${orb.blurPx}px)`,
            transform: "translate3d(-50%, -50%, 0) scale(1)",
            opacity: orb.baseOpacity,
          }}
        />
      ))}
    </div>
  );
}
