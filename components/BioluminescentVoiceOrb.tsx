"use client";

import React, { useEffect, useRef } from "react";

export type VoiceOrbStatus = "greeting" | "listening" | "thinking" | "speaking";

interface BioluminescentVoiceOrbProps {
  status: VoiceOrbStatus;
  isMuted?: boolean;
  size?: number;
}

interface OrbParticle {
  x: number;
  y: number;
  z: number;
  phase: number;
  sizeSeed: number;
  rimTint: number;
  orbitSpeed: number;
}

function createMulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildOrbParticles(count: number): OrbParticle[] {
  const particles: OrbParticle[] = [];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const rand = createMulberry32(739104);

  for (let i = 0; i < count; i++) {
    const t = (i + 0.5) / count;
    const yBase = 1 - 2 * t;
    const rBase = Math.sqrt(Math.max(0, 1 - yBase * yBase));
    const theta = goldenAngle * i + (rand() - 0.5) * 0.16;

    const shell = 0.88 + rand() * 0.18;
    const x = Math.cos(theta) * rBase * shell;
    const y = yBase * shell;
    const z = Math.sin(theta) * rBase * shell;

    particles.push({
      x,
      y,
      z,
      phase: rand() * Math.PI * 2,
      sizeSeed: rand(),
      rimTint: rand(),
      orbitSpeed: 0.7 + rand() * 0.6,
    });
  }

  return particles;
}

function lerpChannel(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

export default function BioluminescentVoiceOrb({
  status,
  isMuted = false,
  size = 216,
}: BioluminescentVoiceOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const statusRef = useRef<VoiceOrbStatus>(status);
  const mutedRef = useRef<boolean>(isMuted);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    mutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(size * dpr);
    canvas.height = Math.round(size * dpr);

    const particles = buildOrbParticles(1600);

    let rafId = 0;
    let lastTime = performance.now();
    let elapsed = 0;
    let smoothEnergy = 0.65;
    let smoothRotSpeed = 0.28;

    const drawFrame = (timeSec: number) => {
      const w = canvas.width;
      const h = canvas.height;
      const cx = w * 0.5;
      const cy = h * 0.5;
      const baseRadius = w * 0.31;

      ctx.clearRect(0, 0, w, h);

      const currentStatus = statusRef.current;
      const muted = mutedRef.current;

      const targetEnergy = muted
        ? 0.18
        : currentStatus === "speaking" || currentStatus === "greeting"
          ? 1.0
          : currentStatus === "thinking"
            ? 0.78
            : 0.52;

      const targetRotSpeed = muted
        ? 0.1
        : currentStatus === "thinking"
          ? 0.58
          : currentStatus === "speaking" || currentStatus === "greeting"
            ? 0.34
            : 0.2;

      smoothEnergy += (targetEnergy - smoothEnergy) * 0.08;
      smoothRotSpeed += (targetRotSpeed - smoothRotSpeed) * 0.08;

      // 1. Clean Light-Theme Radial Aura: Aqua (#3FC6C5) -> Mint Teal (#47C4A5) -> Soft Green (#89D78C) -> Lemon Lime (#D9ED91)
      const coreGrad = ctx.createRadialGradient(
        cx,
        cy,
        baseRadius * 0.05,
        cx,
        cy,
        baseRadius * 1.44
      );
      coreGrad.addColorStop(0, "rgba(63, 198, 197, 0.26)");
      coreGrad.addColorStop(0.45, "rgba(71, 196, 165, 0.17)");
      coreGrad.addColorStop(0.74, "rgba(137, 215, 140, 0.12)");
      coreGrad.addColorStop(0.9, "rgba(217, 237, 145, 0.14)");
      coreGrad.addColorStop(1, "rgba(255, 255, 255, 0)");

      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, baseRadius * 1.44, 0, Math.PI * 2);
      ctx.fill();

      // 2. Crisp Acoustic Harmonic Wave Rings for Light Theme
      const wavePulseA = Math.sin(timeSec * 2.1) * 0.5 + 0.5;
      const wavePulseB = Math.sin(timeSec * 3.0 + 1.5) * 0.5 + 0.5;

      ctx.save();
      ctx.lineWidth = 1.2 * dpr;

      ctx.strokeStyle = `rgba(63, 198, 197, ${(0.24 + smoothEnergy * 0.28 * wavePulseA).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        baseRadius * (1.22 + smoothEnergy * 0.06 * wavePulseA),
        0,
        Math.PI * 2
      );
      ctx.stroke();

      ctx.strokeStyle = `rgba(137, 215, 140, ${(0.22 + smoothEnergy * 0.26 * wavePulseB).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(
        cx,
        cy,
        baseRadius * (1.13 + smoothEnergy * 0.045 * wavePulseB),
        0,
        Math.PI * 2
      );
      ctx.stroke();
      ctx.restore();

      // 3. 3D Rotating Fibonacci Particle Sphere (source-over for crisp contrast on pure white)
      const rotY = timeSec * smoothRotSpeed;
      const rotX = Math.sin(timeSec * 0.4) * 0.16;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);

      ctx.save();
      ctx.globalCompositeOperation = "source-over";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        const x1 = p.x * cosY + p.z * sinY;
        const y1 = p.y;
        const z1 = -p.x * sinY + p.z * cosY;

        const rx = x1;
        const ry = y1 * cosX - z1 * sinX;
        const rz = y1 * sinX + z1 * cosX;

        const wave1 = Math.sin(
          rx * 4.8 + ry * 3.5 - timeSec * (2.1 + smoothEnergy * 2.3) + p.phase * 0.3
        );
        const wave2 = Math.cos(
          ry * 5.2 - rz * 3.9 + timeSec * (1.6 + smoothEnergy * 1.7) + p.phase * 0.45
        );
        const acousticRipple =
          (wave1 * 0.56 + wave2 * 0.44) * (0.042 + smoothEnergy * 0.088);

        const breath =
          1 + Math.sin(timeSec * 2.4 + p.phase * 0.25) * 0.024 * smoothEnergy;
        const disp = breath + acousticRipple;

        const fx = rx * disp;
        const fy = ry * disp;
        const fz = rz * disp;

        const viewZ = Math.max(3.05 - fz, 0.9);
        const persp = 2.85 / viewZ;
        const sx = cx + fx * baseRadius * persp;
        const sy = cy - fy * baseRadius * persp;

        const depthNorm = Math.max(0, Math.min(1, (fz + 1.1) / 2.2));
        const radialDist = Math.hypot(fx, fy);
        const rimFactor = Math.pow(Math.max(0, Math.min(1, radialDist / 1.05)), 1.9);
        const crestFactor = Math.max(0, Math.min(1, acousticRipple * 7.2 + 0.5));

        // Deep Clinical Teal (#0E7A78) -> Aqua (#3FC6C5) -> Mint Teal (#47C4A5) -> Soft Green (#89D78C)
        const paletteMix = Math.min(1, depthNorm * 0.55 + crestFactor * 0.45);
        let r = lerpChannel(14, 63, paletteMix);
        let g = lerpChannel(122, 198, paletteMix);
        let b = lerpChannel(120, 197, paletteMix);

        // Infuse Soft Green (#89D78C) & Lime Green (#ADE180) along crests & rim
        const limeMix = Math.max(
          0,
          Math.min(1, (rimFactor - 0.35) * 1.85 * (0.55 + p.rimTint * 0.55))
        );
        if (limeMix > 0.02) {
          r = lerpChannel(r, 137, limeMix * 0.85);
          g = lerpChannel(g, 215, limeMix * 0.85);
          b = lerpChannel(b, 140, limeMix * 0.85);
        }

        // Front core accent deepens slightly for sharp silhouette on white canvas
        if (depthNorm > 0.65 && rimFactor < 0.5) {
          const coreDepth = (depthNorm - 0.65) * 1.1;
          r = lerpChannel(r, 11, coreDepth * 0.42);
          g = lerpChannel(g, 110, coreDepth * 0.42);
          b = lerpChannel(b, 108, coreDepth * 0.42);
        }

        const alpha =
          (0.22 + depthNorm * 0.68) *
          (0.75 + rimFactor * 0.35) *
          (muted ? 0.45 : 1.0);

        const dotRadius =
          (0.7 + p.sizeSeed * 0.95) *
          (0.8 + depthNorm * 0.42) *
          (1 + Math.max(0, acousticRipple) * 1.45) *
          dpr;

        ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${Math.min(0.95, alpha).toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(sx, sy, dotRadius, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    };

    if (prefersReducedMotion) {
      drawFrame(1.4);
      return;
    }

    const tick = (now: number) => {
      if (document.hidden) {
        rafId = requestAnimationFrame(tick);
        return;
      }
      const dt = Math.min(0.05, Math.max(0, (now - lastTime) * 0.001));
      lastTime = now;
      elapsed += dt;
      drawFrame(elapsed);
      rafId = requestAnimationFrame(tick);
    };

    drawFrame(0);
    rafId = requestAnimationFrame(tick);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${size}px`, height: `${size}px` }}
      className="block pointer-events-none select-none"
      aria-hidden="true"
    />
  );
}
