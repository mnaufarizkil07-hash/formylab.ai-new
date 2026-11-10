"use client";

import React, { useEffect, useRef } from "react";

interface LivingLabBackgroundProps {
  variant?: "emerald" | "mint" | "obsidian";
}

export default function LivingLabBackground({ variant = "mint" }: LivingLabBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const mouse = { x: -1000, y: -1000 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    };
    window.addEventListener("mousemove", handleMouseMove);

    const palette = ["#a4cf4a", "#00f5d4", "#38bdf8", "#2dd4bf"];
    const nodes = Array.from({ length: 48 }, (_, idx) => ({
      x: ((idx * 197) % Math.max(width, 800)) + 40,
      y: ((idx * 131) % Math.max(height, 600)) + 40,
      vx: ((idx % 5) - 2) * 0.22 || 0.18,
      vy: ((idx % 7) - 3) * 0.18 || -0.16,
      r: (idx % 4) + 3.2,
      color: palette[idx % palette.length],
    }));

    let stepTimer = 0;
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      for (let i = 0; i < nodes.length; i++) {
        const p = nodes[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < 180 && distMouse > 1) {
          const force = (180 - distMouse) / 180;
          p.x += (dxMouse / distMouse) * force * 1.2;
          p.y += (dyMouse / distMouse) * force * 1.2;
        }

        // Jaringan Garis Poligon Glowing (seperti Gambar 1)
        for (let j = i + 1; j < nodes.length; j++) {
          const p2 = nodes[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 165) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            let alpha = (1 - dist / 165) * 0.45;
            if (distMouse < 180) alpha = Math.min(0.85, alpha * 1.6);
            ctx.strokeStyle = `rgba(0, 245, 212, ${alpha.toFixed(3)})`;
            ctx.lineWidth = dist < 95 ? 1.8 : 1.1;
            ctx.stroke();
            ctx.restore();
          }
        }

        // Titik Atom Glowing (Lime / Cyan / Blue seperti Gambar 1)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.22;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.92;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      stepTimer = window.setTimeout(() => {
        animationFrameId = requestAnimationFrame(render);
      }, 80);
    };

    render();

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      clearTimeout(stepTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, [variant]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
      {/* Multi-layered living scientific gradient canvas */}
      <div
        className={`absolute inset-0 ${
          variant === "obsidian"
            ? "bg-gradient-to-br from-[#071310] via-[#0c211b] to-[#081713]"
            : "bg-gradient-to-br from-[#e6f7ec] via-[#d2f1dc] to-[#bde8cc]"
        }`}
      />

      {/* Architectural SVG isometric lab grid mesh */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.22]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="lab-grid-pattern" width="56" height="56" patternUnits="userSpaceOnUse">
            <path
              d="M 56 0 L 0 0 0 56"
              fill="none"
              stroke={variant === "obsidian" ? "#34d399" : "#164e41"}
              strokeWidth="0.6"
              strokeOpacity="0.3"
            />
            <circle
              cx="56"
              cy="56"
              r="1.2"
              fill={variant === "obsidian" ? "#34d399" : "#164e41"}
              fillOpacity="0.35"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#lab-grid-pattern)" />
      </svg>

      {/* Soft depth ambient glow orbs */}
      <div className="absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full bg-teal-300/30 blur-3xl" />
      <div className="absolute top-1/3 -right-28 w-[560px] h-[560px] rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="absolute -bottom-36 left-1/4 w-[480px] h-[480px] rounded-full bg-cyan-300/20 blur-3xl" />

      {/* Interactive 2D Molecular Lattice Canvas */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
}
