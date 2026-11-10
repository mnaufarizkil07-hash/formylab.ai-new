"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  Lock,
  Mail,
  User,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import {
  authenticateUser,
  registerUserAccount,
  ACCOUNTS_STORAGE_KEY,
  ACTIVE_USER_STORAGE_KEY,
  type UserAccount,
} from "../lib/auth";
import Logo from "../components/Logo";

const CAROUSEL_SLIDES = [
  {
    image: "/iklim.jpg",
    eyebrow: "1. TROPICAL CLIMATE",
    title: "Tropical Climate Challenges",
    desc: "High humidity and intense UV radiation in tropical regions trigger excess sebum, barrier disruption, and heightened skin reactivity across daily skincare users.",
  },
  {
    image: "/kulitsensitif.jpg",
    eyebrow: "2. SENSITIVE SKIN",
    title: "Sensitive Skin Vulnerability",
    desc: "As a direct consequence of tropical exposure, sensitive skin exhibits a narrow tolerance threshold, making it highly prone to irritation and requiring precise formulation standards.",
  },
  {
    image: "/trialanderor.jpg",
    eyebrow: "3. TRIAL & ERROR",
    title: "The Burden of R&D Trial & Error",
    desc: "To address sensitive skin challenges in tropical climates, conventional laboratory research is trapped in lengthy trial-and-error cycles—wasting valuable time, budget, and resources.",
  },
  {
    image: "/solusi-ai.jpg",
    eyebrow: "4. AI-POWERED SOLUTION",
    title: "Intelligent Cosmetic Formulation",
    desc: "FormyLab AI accelerates skincare R&D by predicting emulsion stability, optimizing pH and viscosity, and mapping verified Halal-certified ingredient suppliers instantly.",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Auto-scrolling photo carousel with pause-on-hover
  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused]);

  // Original Glowing Multi-Color Molecular Particle Network (Matching Reference Image 1)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId = 0;
    let stepTimer = 0;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", handleResize);

    const mouse = { x: -1000, y: -1000, targetX: -1000, targetY: -1000, radius: 220 };
    const handleMouseMove = (e: MouseEvent) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
    };
    const handleMouseLeave = () => {
      mouse.targetX = -1000;
      mouse.targetY = -1000;
    };
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);

    // Glowing Lime Green (#a4cf4a), Bright Cyan (#00f5d4), and Sky Blue (#38bdf8) Atom Nodes
    const palette = ["#a4cf4a", "#00f5d4", "#38bdf8", "#2dd4bf"];
    const particles: {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
    }[] = [];

    for (let i = 0; i < 56; i++) {
      particles.push({
        x: ((i * 179) % Math.max(width, 900)) + 25,
        y: ((i * 137) % Math.max(height, 700)) + 25,
        vx: ((i % 5) - 2) * 0.26 || 0.22,
        vy: ((i % 7) - 3) * 0.22 || -0.18,
        radius: (i % 4) + 3.4,
        color: palette[i % palette.length],
      });
    }

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      mouse.x += (mouse.targetX - mouse.x) * 0.08;
      mouse.y += (mouse.targetY - mouse.y) * 0.08;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0 || p.x > width) p.vx *= -1;
        if (p.y < 0 || p.y > height) p.vy *= -1;

        const dxMouse = mouse.x - p.x;
        const dyMouse = mouse.y - p.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        if (distMouse < mouse.radius && distMouse > 1) {
          const force = (mouse.radius - distMouse) / mouse.radius;
          p.x += (dxMouse / distMouse) * force * 1.4;
          p.y += (dyMouse / distMouse) * force * 1.4;
        }

        // Glowing Polygon Connection Lines (Reference Image 1)
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 165) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            let alpha = (1 - dist / 165) * 0.52;
            if (distMouse < mouse.radius) alpha = Math.min(0.9, alpha * 1.65);

            ctx.strokeStyle = `rgba(0, 245, 212, ${alpha.toFixed(3)})`;
            ctx.lineWidth = dist < 95 ? 1.9 : 1.2;
            ctx.stroke();
            ctx.restore();
          }
        }

        // Glowing Atom Node (Lime / Cyan / Sky Blue — Fast Dual-Circle Glow)
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 2.4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.24;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = 0.95;
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
      document.removeEventListener("mouseleave", handleMouseLeave);
      clearTimeout(stepTimer);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const switchMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setError("");
    setSuccessMessage("");
  };

  const handlePrevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_SLIDES.length) % CAROUSEL_SLIDES.length);
  };

  const handleNextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_SLIDES.length);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    let customAccounts: UserAccount[] = [];
    if (typeof window !== "undefined") {
      try {
        const raw = window.localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        if (raw) customAccounts = JSON.parse(raw);
      } catch {
        customAccounts = [];
      }
    }

    if (authMode === "login") {
      const result = authenticateUser(email, password, customAccounts);
      if (!result.success) {
        setError(result.error || "Invalid credentials.");
        return;
      }
      if (typeof window !== "undefined" && result.user) {
        window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(result.user));
      }
      router.push("/dashboard");
    } else {
      if (password !== confirmPassword) {
        setError("Passwords do not match. Please confirm your password.");
        return;
      }
      const result = registerUserAccount(email, password, customAccounts, name);
      if (!result.success) {
        setError(result.error || "Registration failed.");
        return;
      }
      if (typeof window !== "undefined" && result.updatedCustomAccounts) {
        window.localStorage.setItem(
          ACCOUNTS_STORAGE_KEY,
          JSON.stringify(result.updatedCustomAccounts)
        );
        if (result.account) {
          window.localStorage.setItem(ACTIVE_USER_STORAGE_KEY, JSON.stringify(result.account));
        }
      }
      setSuccessMessage("Account created successfully! Redirecting to your R&D workspace...");
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    }
  };

  const activeSlide = CAROUSEL_SLIDES[currentSlide];

  return (
    <div className="min-h-screen lg:h-screen relative flex items-center justify-center p-4 md:p-6 font-sans overflow-hidden bg-gradasi-animasi">
      {/* Interactive Glowing Molecular Polygon Network Canvas (Reference Image 1) */}
      <canvas
        ref={canvasRef}
        className="fixed inset-0 pointer-events-none z-0"
      />

      {/* MAIN SPLIT CONTAINER */}
      <div className="relative z-10 bg-white/95 backdrop-blur-xl rounded-[28px] shadow-[0_28px_70px_-15px_rgba(16,68,56,0.28)] border border-white/85 w-full max-w-6xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 min-h-[580px] lg:max-h-[90vh]">
        {/* LEFT 5 COLUMNS: AUTHENTICATION CONSOLE */}
        <div className="lg:col-span-5 p-7 sm:p-10 md:p-11 flex flex-col justify-center bg-white">
          {/* Brand Lockup (100% Identical Original Logo) */}
          <div className="mb-7">
            <div className="mb-2 -ml-2">
              <Logo size="lg" />
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              AI-Driven Cosmetic Formulation, 3D Molecular Conformer &amp; Halal Supply Chain Studio.
            </p>
          </div>

          <div className="mb-5">
            <h2 className="text-2xl font-extrabold text-slate-900 mb-1.5">
              {authMode === "login" ? "Welcome Back, Formulator" : "Create Your R&D Account"}
            </h2>
            <p className="text-slate-500 text-xs leading-relaxed">
              {authMode === "login"
                ? "Sign in with your laboratory credentials to access 3D formulation tools."
                : "Register a new account to design, simulate, and save cosmetic formulations."}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-semibold"
            >
              {error}
            </div>
          )}

          {successMessage && (
            <div
              role="status"
              className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-semibold flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#0f766e]" />
              <span>{successMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {authMode === "register" && (
              <div>
                <label
                  htmlFor="auth-name"
                  className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Full Name / Lead Chemist
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="auth-name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Dr. Nadia Pratama"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="auth-email"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Laboratory Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="auth-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="chemist@formylab.ai"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="auth-password"
                className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                <input
                  id="auth-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                />
              </div>
            </div>

            {authMode === "register" && (
              <div>
                <label
                  htmlFor="auth-confirm-password"
                  className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5"
                >
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                  <input
                    id="auth-confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-3.5 py-3 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-[#14b8a6] transition text-slate-900 text-sm"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3.5 px-6 bg-gradient-to-r from-[#14b8a6] to-[#12382f] text-white rounded-xl font-bold text-sm hover:opacity-95 transition shadow-md cursor-pointer mt-2 flex items-center justify-center gap-2"
            >
              <span>
                {authMode === "login"
                  ? "Access Formulation Lab"
                  : "Create Account & Enter Lab"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Bottom Small Account Switch Prompt with Bold Theme-Green Action */}
          <p className="mt-5 text-center text-xs text-slate-500">
            {authMode === "login" ? (
              <>
                Don&apos;t have an account yet?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="font-extrabold text-[#0f766e] hover:text-[#14b8a6] hover:underline transition cursor-pointer"
                >
                  Create Account
                </button>
              </>
            ) : (
              <>
                Already have a laboratory account?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("login")}
                  className="font-extrabold text-[#0f766e] hover:text-[#14b8a6] hover:underline transition cursor-pointer"
                >
                  Sign In
                </button>
              </>
            )}
          </p>
        </div>

        {/* RIGHT 7 COLUMNS: CLEAN HERO CAROUSEL SLIDER (MATCHING REFERENCE IMAGE 2 & 4) */}
        <div
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
          className="lg:col-span-7 relative aspect-[16/10] lg:aspect-auto lg:min-h-[580px] w-full overflow-hidden rounded-b-[24px] lg:rounded-b-none lg:rounded-r-[24px] bg-slate-900 select-none flex flex-col justify-end"
        >
          {/* Full Unobstructed Background Slides (350ms Smooth Transition, Center-Top Crop) */}
          {CAROUSEL_SLIDES.map((slide, index) => {
            const isActive = index === currentSlide;
            return (
              <div
                key={index}
                className={`absolute inset-0 transition-opacity duration-350 ease-out ${
                  isActive ? "opacity-100 z-10" : "opacity-0 z-0 pointer-events-none"
                }`}
              >
                <img
                  src={slide.image}
                  alt={slide.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover object-[center_top]"
                />
              </div>
            );
          })}

          {/* Single Bottom-Only Gradient Overlay (Transparent at top -> Dark Navy at bottom ~48% height) */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[50%] z-20 bg-gradient-to-t from-[#0f172a]/95 via-[#1e293b]/70 to-transparent"
          />

          {/* Left & Right Vertically Centered Circular Navigation Buttons */}
          <button
            type="button"
            onClick={handlePrevSlide}
            aria-label="Previous slide"
            className="absolute left-4 sm:left-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow-lg backdrop-blur-xs flex items-center justify-center transition duration-200 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.4]" />
          </button>

          <button
            type="button"
            onClick={handleNextSlide}
            aria-label="Next slide"
            className="absolute right-4 sm:right-6 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-white/80 hover:bg-white text-slate-900 shadow-lg backdrop-blur-xs flex items-center justify-center transition duration-200 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5 stroke-[2.4]" />
          </button>

          {/* Bottom-Left Unified Text Block (Matching Reference Image 2 100%) */}
          <div className="relative z-30 w-full p-5 sm:p-8 lg:p-10 text-left">
            {/* Eyebrow Label: Uppercase, Wide Tracking, Light Mint/Teal */}
            <p className="text-xs sm:text-[13px] font-extrabold uppercase tracking-[0.16em] text-[#86efac] mb-2">
              {activeSlide.eyebrow}
            </p>

            {/* Large Bold White Heading */}
            <h2 className="text-xl sm:text-3xl lg:text-[32px] font-extrabold text-white tracking-tight leading-tight mb-2.5">
              {activeSlide.title}
            </h2>

            {/* 1-2 Line Clean Description (~85% White Opacity) */}
            <p className="text-xs sm:text-[15px] text-white/85 leading-relaxed max-w-2xl">
              {activeSlide.desc}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}