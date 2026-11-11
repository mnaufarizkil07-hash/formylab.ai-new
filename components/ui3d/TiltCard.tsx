"use client";

import React, { useRef, useState, useEffect } from "react";

export interface TiltCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  /** Intensitas maksimal override (default mengambil dari CSS var(--tilt-max) = 10deg) */
  maxTiltDeg?: number;
  /** Tampilkan efek pantulan cahaya radial-gradient (default true) */
  glare?: boolean;
}

/**
 * <TiltCard />
 * - Card miring mengikuti posisi kursor, maksimal var(--tilt-max) (10deg) di sumbu X dan Y dengan perspective 1000px
 * - Glare: lapisan radial-gradient putih transparan (opacity maks 0.25) mengikuti kursor
 * - Menggunakan requestAnimationFrame agar halus 60fps
 * - Saat kursor keluar, kembali datar dengan transisi 400ms
 * - Nonaktif otomatis pada perangkat touch & prefers-reduced-motion
 */
export default function TiltCard({
  children,
  className = "",
  maxTiltDeg,
  glare = true,
  onMouseMove,
  onMouseLeave,
  ...rest
}: TiltCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const [isInteractive, setIsInteractive] = useState(true);
  const [transformStyle, setTransformStyle] = useState(
    "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
  );
  const [transitionStyle, setTransitionStyle] = useState(
    "transform 400ms ease-out"
  );
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50, opacity: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(hover: none), (pointer: coarse)").matches;
    const isReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    queueMicrotask(() => {
      setIsInteractive(!isTouch && !isReduced);
    });
  }, []);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const resolveMaxTilt = (): number => {
    if (typeof maxTiltDeg === "number") return maxTiltDeg;
    if (typeof window !== "undefined") {
      const raw = getComputedStyle(document.documentElement)
        .getPropertyValue("--tilt-max")
        .trim();
      const parsed = parseFloat(raw);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    return 10;
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseMove) onMouseMove(e);
    if (!isInteractive || !cardRef.current) return;

    const clientX = e.clientX;
    const clientY = e.clientY;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    rafRef.current = requestAnimationFrame(() => {
      if (!cardRef.current) return;
      const rect = cardRef.current.getBoundingClientRect();
      const relX = (clientX - rect.left) / Math.max(rect.width, 1);
      const relY = (clientY - rect.top) / Math.max(rect.height, 1);

      // Normalisasi ke rentang [-1, 1]
      const normX = (relX - 0.5) * 2;
      const normY = (relY - 0.5) * 2;

      const limit = resolveMaxTilt();
      const rotateX = Number((-normY * limit).toFixed(2));
      const rotateY = Number((normX * limit).toFixed(2));

      setTransitionStyle("transform 80ms linear");
      setTransformStyle(
        `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.01, 1.01, 1.01)`
      );
      setGlarePos({
        x: Math.round(relX * 100),
        y: Math.round(relY * 100),
        opacity: 0.25,
      });
    });
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (onMouseLeave) onMouseLeave(e);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }
    // Saat kursor keluar, kembali datar dengan transisi 400ms
    setTransitionStyle("transform 400ms cubic-bezier(0.22, 1, 0.36, 1)");
    setTransformStyle(
      "perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)"
    );
    setGlarePos((prev) => ({ ...prev, opacity: 0 }));
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: isInteractive ? transformStyle : undefined,
        transition: isInteractive ? transitionStyle : undefined,
      }}
      className={`tilt-card-body relative ${className}`}
      {...rest}
    >
      {/* Lapisan Glare Radial-Gradient Putih Transparan (opacity maks 0.25) */}
      {glare && isInteractive && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] z-20 transition-opacity duration-300"
          style={{
            opacity: glarePos.opacity,
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0) 65%)`,
          }}
        />
      )}

      {children}
    </div>
  );
}
