"use client";

import React, { useEffect, useRef } from "react";

interface LivingLabBackgroundProps {
  variant?: "emerald" | "mint" | "obsidian";
}

export default function LivingLabBackground({
  variant = "mint",
}: LivingLabBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    let isScrolling = false;
    let scrollTimeout: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      drawFrame();
    };

    const handleScroll = () => {
      isScrolling = true;
      if (scrollTimeout !== null) {
        clearTimeout(scrollTimeout);
      }
      scrollTimeout = setTimeout(() => {
        isScrolling = false;
      }, 180);
    };

    window.addEventListener("resize", handleResize, { passive: true });
    window.addEventListener("scroll", handleScroll, { passive: true });

    const palette = ["#a4cf4a", "#00f5d4", "#38bdf8", "#2dd4bf"];
    const nodes = Array.from({ length: 22 }, (_, idx) => ({
      x: ((idx * 239) % Math.max(width - 80, 600)) + 40,
      y: ((idx * 173) % Math.max(height - 80, 500)) + 40,
      vx: ((idx % 5) - 2) * 0.16 || 0.14,
      vy: ((idx % 7) - 3) * 0.14 || -0.12,
      r: (idx % 3) + 3.0,
      color: palette[idx % palette.length],
    }));

    const maxDist = 160;
    const maxDistSq = maxDist * maxDist;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Batch connecting lines first with minimal state changes
      ctx.lineWidth = 1.15;
      ctx.strokeStyle = "rgba(0, 225, 195, 0.22)";
      ctx.beginPath();
      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        for (let j = i + 1; j < nodes.length; j++) {
          const p2 = nodes[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < maxDistSq) {
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
          }
        }
      }
      ctx.stroke();

      // Update positions and draw nodes
      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.88;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    // Draw initial frame immediately
    drawFrame();

    let lastTime = 0;
    const loop = (now: number) => {
      animationFrameId = requestAnimationFrame(loop);
      // Pause canvas redraws completely while user is actively scrolling or tab is hidden
      if (isScrolling || document.hidden) return;
      if (now - lastTime < 50) return;
      lastTime = now;
      drawFrame();
    };

    animationFrameId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeout !== null) clearTimeout(scrollTimeout);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant]);

  const isObsidian = variant === "obsidian";

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden"
      style={{
        contain: "strict",
        background: isObsidian
          ? "radial-gradient(circle at 15% 15%, rgba(45, 212, 191, 0.14), transparent 45%), radial-gradient(circle at 85% 40%, rgba(16, 185, 129, 0.12), transparent 50%), linear-gradient(135deg, #071310 0%, #0c211b 50%, #081713 100%)"
          : "radial-gradient(circle at 12% 12%, rgba(94, 234, 212, 0.28), transparent 42%), radial-gradient(circle at 88% 35%, rgba(52, 211, 153, 0.22), transparent 48%), radial-gradient(circle at 30% 88%, rgba(103, 232, 249, 0.2), transparent 45%), linear-gradient(135deg, #e6f7ec 0%, #d2f1dc 50%, #bde8cc 100%)",
      }}
      aria-hidden="true"
    >
      {/* Architectural SVG isometric lab grid mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.2]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="lab-grid-pattern"
            width="56"
            height="56"
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M 56 0 L 0 0 0 56"
              fill="none"
              stroke={isObsidian ? "#34d399" : "#164e41"}
              strokeWidth="0.6"
              strokeOpacity="0.3"
            />
            <circle
              cx="56"
              cy="56"
              r="1.2"
              fill={isObsidian ? "#34d399" : "#164e41"}
              fillOpacity="0.35"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lab-grid-pattern)" />
      </svg>

      {/* Interactive 2D Molecular Lattice Canvas (auto-paused during scroll) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
