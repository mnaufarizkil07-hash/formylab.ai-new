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

    const palette = ["#3FC6C5", "#47C4A5", "#89D78C", "#82CB82"];
    const nodes = Array.from({ length: 20 }, (_, idx) => ({
      x: ((idx * 239) % Math.max(width - 80, 600)) + 40,
      y: ((idx * 173) % Math.max(height - 80, 500)) + 40,
      vx: ((idx % 5) - 2) * 0.14 || 0.12,
      vy: ((idx % 7) - 3) * 0.12 || -0.1,
      r: (idx % 3) + 2.0,
      color: palette[idx % palette.length],
    }));

    const maxDist = 150;
    const maxDistSq = maxDist * maxDist;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);

      // Subtle clinical molecular lattice lines in Mint Teal
      ctx.lineWidth = 0.85;
      ctx.strokeStyle = "rgba(63, 198, 197, 0.16)";
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

      // Update positions and draw subtle pastel clinical nodes
      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.12;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.1, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = 0.35;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    drawFrame();

    let lastTime = 0;
    const loop = (now: number) => {
      animationFrameId = requestAnimationFrame(loop);
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

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-[#f8fdfb]"
      style={{
        contain: "strict",
        background:
          "radial-gradient(circle at 12% 14%, rgba(63, 198, 197, 0.10), transparent 44%), radial-gradient(circle at 88% 28%, rgba(137, 215, 140, 0.11), transparent 46%), radial-gradient(circle at 50% 92%, rgba(217, 237, 145, 0.10), transparent 45%), #f8fdfb",
      }}
      aria-hidden="true"
    >
      {/* Subtle architectural laboratory grid mesh on crisp Light canvas */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.42]"
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
              stroke="#47C4A5"
              strokeWidth="0.6"
              strokeOpacity="0.18"
            />
            <circle
              cx="56"
              cy="56"
              r="1.1"
              fill="#3FC6C5"
              fillOpacity="0.22"
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
