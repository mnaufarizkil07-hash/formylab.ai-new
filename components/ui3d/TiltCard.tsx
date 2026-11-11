"use client";

import React, { useRef, useEffect } from "react";

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Intensitas maksimal override (default mengambil dari CSS var(--tilt-max) = 10deg) */
  maxTiltDeg?: number;
  /** Tampilkan efek pantulan cahaya radial-gradient (default true) */
  glare?: boolean;
}

// Shared passive scroll detector so TiltCards never trigger 3D perspective transforms or layout reads while the user is scrolling
let isGlobalScrolling = false;
let globalScrollTimer: ReturnType<typeof setTimeout> | null = null;
let scrollListenerAttached = false;

function ensureGlobalScrollTracker() {
  if (scrollListenerAttached || typeof window === "undefined") return;
  scrollListenerAttached = true;

  const onScroll = () => {
    isGlobalScrolling = true;
    if (globalScrollTimer !== null) {
      clearTimeout(globalScrollTimer);
    }
    globalScrollTimer = setTimeout(() => {
      isGlobalScrolling = false;
    }, 160);
  };

  window.addEventListener("scroll", onScroll, { passive: true, capture: true });
}

export default function TiltCard({
  children,
  className = "",
  maxTiltDeg,
  glare = true,
  onMouseEnter,
  onMouseMove,
  onMouseLeave,
  ...rest
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const glareRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const cachedRectRef = useRef<DOMRect | null>(null);
  const isInteractiveRef = useRef<boolean>(false);
  const maxTiltRef = useRef<number>(maxTiltDeg ?? 4);

  useEffect(() => {
    if (typeof window === "undefined") return;
    ensureGlobalScrollTracker();

    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    isInteractiveRef.current = !isTouch && !isReduced;

    if (typeof maxTiltDeg === "number") {
      maxTiltRef.current = Math.min(maxTiltDeg, 5);
    } else {
      maxTiltRef.current = 4;
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [maxTiltDeg]);

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseEnter) onMouseEnter(e);
    if (!isInteractiveRef.current || isGlobalScrolling || !cardRef.current) return;
    cachedRectRef.current = cardRef.current.getBoundingClientRect();
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseMove) onMouseMove(e);
    if (!isInteractiveRef.current || !cardRef.current) return;

    // Never compute 3D tilt while user is actively scrolling the page
    if (isGlobalScrolling) {
      if (cardRef.current.style.transform) {
        cardRef.current.style.transform = "";
        cardRef.current.style.transition = "";
      }
      if (glareRef.current) {
        glareRef.current.style.opacity = "0";
      }
      return;
    }

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      const el = cardRef.current;
      if (!el || isGlobalScrolling) return;

      const rect = cachedRectRef.current || el.getBoundingClientRect();
      cachedRectRef.current = rect;

      const relX = (clientX - rect.left) / Math.max(rect.width, 1);
      const relY = (clientY - rect.top) / Math.max(rect.height, 1);

      const normX = Math.max(-1, Math.min(1, (relX - 0.5) * 2));
      const normY = Math.max(-1, Math.min(1, (relY - 0.5) * 2));

      const limit = maxTiltRef.current;
      const rotateX = (-normY * limit).toFixed(2);
      const rotateY = (normX * limit).toFixed(2);

      el.style.transition = "transform 90ms linear";
      el.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

      const glareEl = glareRef.current;
      if (glareEl) {
        const gx = Math.round(relX * 100);
        const gy = Math.round(relY * 100);
        glareEl.style.opacity = "0.18";
        glareEl.style.background = `radial-gradient(circle at ${gx}% ${gy}%, rgba(255, 255, 255, 0.75) 0%, rgba(255, 255, 255, 0) 65%)`;
      }
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseLeave) onMouseLeave(e);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    cachedRectRef.current = null;
    if (cardRef.current) {
      cardRef.current.style.transition = "transform 280ms cubic-bezier(0.22, 1, 0.36, 1)";
      cardRef.current.style.transform = "";
    }
    if (glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  };

  // Strip expensive per-frame backdrop-blur classes on scrolling cards to prevent GPU compositor stalls
  const optimizedClassName = className
    .replace(/\bbackdrop-blur(?:-[a-z0-9]+)?\b/g, "")
    .replace(/\bbg-white\/(?:80|85|90|95)\b/g, "bg-white");

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`tilt-card-body relative ${optimizedClassName}`}
      {...rest}
    >
      {glare && (
        <div
          ref={glareRef}
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 transition-opacity duration-200 opacity-0"
        />
      )}

      {children}
    </div>
  );
}
