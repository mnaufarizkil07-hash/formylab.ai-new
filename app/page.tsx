"use client";

import React, { useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  Mail,
  User,
  LogIn,
  FlaskConical,
  ShieldCheck,
  Target,
  Compass,
  Volume2,
  Eye,
  EyeOff,
  Cpu,
  Layers,
  Menu,
  X,
} from "lucide-react";
import {
  authenticateUser,
  registerUserAccount,
  ACCOUNTS_STORAGE_KEY,
  setActiveUserSession,
  type UserAccount,
} from "../lib/auth";
import { initializeAccountSavedRuns } from "../lib/formulationStorage";
import {
  FORMYLAB_AI_MODULES,
  FOUR_AI_PILLARS,
  WORKFLOW_TAHAPAN_FORMYLAB,
} from "../lib/interactiveAiEngine";
import BrandLogo from "../components/BrandLogo";
import ParticleSphere from "../components/ParticleSphere";
import AmbientBioluminescence from "../components/AmbientBioluminescence";
import ScrollColorText from "../components/ScrollColorText";

const REMEMBERED_EMAIL_STORAGE_KEY = "formylab_remembered_email";
const REMEMBER_PREF_STORAGE_KEY = "formylab_remember_pref";

export default function LandingAndLoginPage() {
  const router = useRouter();
  const [showLoginPage, setShowLoginPage] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navPulseKey, setNavPulseKey] = useState(0);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [activeNav, setActiveNav] = useState<string>("#tentang-website");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [pillarsVisible, setPillarsVisible] = useState(false);
  const pillarsGridRef = useRef<HTMLDivElement | null>(null);
  const prefersReducedMotion = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      mq.addEventListener("change", onStoreChange);
      return () => mq.removeEventListener("change", onStoreChange);
    },
    () =>
      typeof window !== "undefined" &&
      Boolean(
        window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ),
    () => false
  );
  const isPillarsRevealed = prefersReducedMotion || pillarsVisible;

  useEffect(() => {
    if (showLoginPage || prefersReducedMotion || typeof window === "undefined") {
      return;
    }

    const target = pillarsGridRef.current;
    if (!target || typeof IntersectionObserver === "undefined") {
      const rafId = window.requestAnimationFrame(() => setPillarsVisible(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setPillarsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.14, rootMargin: "0px 0px -40px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [showLoginPage, prefersReducedMotion]);

  useEffect(() => {
    if (showLoginPage || typeof window === "undefined" || typeof IntersectionObserver === "undefined") {
      return;
    }

    const sectionIds = ["tentang-website", "alur-kerja", "fungsi-ai", "visi-misi"];
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const visibleSections = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleSections.set(entry.target.id, entry.intersectionRatio);
          } else {
            visibleSections.delete(entry.target.id);
          }
        }

        if (visibleSections.size > 0) {
          const orderedMatch = sectionIds.find((id) => visibleSections.has(id));
          if (orderedMatch) {
            setActiveNav(`#${orderedMatch}`);
          }
        }
      },
      { rootMargin: "-18% 0px -58% 0px", threshold: [0, 0.15, 0.35] }
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [showLoginPage]);

  useEffect(() => {
    if (!showLoginPage && !mobileMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (mobileMenuOpen) {
          setMobileMenuOpen(false);
        } else if (showLoginPage) {
          setShowLoginPage(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showLoginPage, mobileMenuOpen]);

  const triggerNavPulse = () => {
    setNavPulseKey((k) => k + 1);
  };

  const openLoginWithMode = (mode: "login" | "register") => {
    triggerNavPulse();
    setMobileMenuOpen(false);
    setAuthMode(mode);
    setError("");
    setSuccessMessage("");
    if (typeof window !== "undefined") {
      try {
        const savedPref = window.localStorage.getItem(REMEMBER_PREF_STORAGE_KEY);
        const savedEmail = window.localStorage.getItem(REMEMBERED_EMAIL_STORAGE_KEY);
        if (savedPref === "false") {
          setRememberMe(false);
          if (mode === "login") setEmail("");
        } else if (savedEmail && mode === "login") {
          setRememberMe(true);
          setEmail(savedEmail);
        }
      } catch {
        // Ignore storage read errors in restricted environments
      }
    }
    setShowLoginPage(true);
    const shouldReduceMotion =
      typeof window !== "undefined" &&
      Boolean(
        window.matchMedia &&
          window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    window.scrollTo({
      top: 0,
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  };

  const switchMode = (mode: "login" | "register") => {
    setAuthMode(mode);
    setError("");
    setSuccessMessage("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const authParam = params.get("auth");
    if (authParam === "login" || authParam === "register") {
      queueMicrotask(() => {
        setAuthMode(authParam);
        setShowLoginPage(true);
      });
    }
  }, []);

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
        setActiveUserSession(result.user);
        initializeAccountSavedRuns(result.user.email);
        try {
          window.localStorage.setItem(
            REMEMBER_PREF_STORAGE_KEY,
            rememberMe ? "true" : "false"
          );
          if (rememberMe) {
            window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email.trim());
          } else {
            window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
          }
        } catch {
          // Ignore storage write errors
        }
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
          setActiveUserSession(result.account);
          initializeAccountSavedRuns(result.account.email);
        }
        try {
          window.localStorage.setItem(
            REMEMBER_PREF_STORAGE_KEY,
            rememberMe ? "true" : "false"
          );
          if (rememberMe) {
            window.localStorage.setItem(REMEMBERED_EMAIL_STORAGE_KEY, email.trim());
          } else {
            window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
          }
        } catch {
          // Ignore storage write errors
        }
      }
      setSuccessMessage(
        "Account created successfully! Redirecting to your R&D workspace..."
      );
      setTimeout(() => {
        router.push("/dashboard");
      }, 600);
    }
  };

  // ============================================================================
  // VIEW 2: CLEAN GLASSMORPHISM LOGIN & REGISTER PAGE (Light Aqua–Mint–Lemon)
  // ============================================================================
  if (showLoginPage) {
    return (
      <div className="min-h-screen relative flex flex-col justify-between bg-white overflow-hidden px-6 py-8 md:py-10 font-sans text-[#0B2B26]">
        {/* Living Aqua–Mint Teal–Soft Green–Lemon Lime Bioluminescence Behind Glass Card */}
        <AmbientBioluminescence variant="cta" />

        {navPulseKey > 0 && (
          <div
            key={navPulseKey}
            aria-hidden="true"
            className="fixed top-0 left-0 right-0 z-[70] h-[2px] origin-left pointer-events-none auros-nav-hairline bg-[#0B2B26]"
          />
        )}

        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:inline-flex focus:items-center focus:min-h-[44px] focus:px-5 focus:py-2.5 focus:rounded-full focus:bg-[#0B2B26] focus:text-white focus:text-[13px] focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#0E807E] focus:ring-offset-2"
        >
          Skip to main content
        </a>

        {/* Minimal Top Bar: BrandLogo + Subtle Back to Home */}
        <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={() => {
              triggerNavPulse();
              setShowLoginPage(false);
            }}
            className="flex items-center min-h-[44px] rounded-[10px] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
            aria-label="Formylab.ai Home"
          >
            <BrandLogo variant="light" size="sm" />
          </button>

          <button
            type="button"
            onClick={() => {
              triggerNavPulse();
              setShowLoginPage(false);
            }}
            className="btn-glass-compact group inline-flex items-center justify-center gap-1.5 min-h-[44px] px-4 py-2.5 text-[12px] tracking-[0.04em] cursor-pointer"
          >
            <ArrowLeft
              aria-hidden="true"
              className="w-3.5 h-3.5 text-[#0E807E] transition-transform duration-300 group-hover:-translate-x-0.5"
            />
            <span>Back to Home</span>
          </button>
        </header>

        {/* Single Centered Floating Clean Glassmorphism Card */}
        <main
          id="main-content"
          className="relative z-10 flex-1 flex items-center justify-center py-8"
        >
          <div className="max-w-[420px] w-full p-8 md:p-10 !rounded-[20px] card-glass-optical card-glass-static relative z-10">
            {/* Minimal Left-Aligned Header */}
            <div className="text-left">
              <h1 className="text-[32px] font-medium tracking-[-0.02em] leading-[1.1] text-[#0B2B26]">
                {authMode === "login" ? "Login" : "Create Account"}
              </h1>
              <p className="text-sm text-[#2E524C] mt-1 mb-7">
                {authMode === "login"
                  ? "Welcome back"
                  : "Start your R&D formulation workspace"}
              </p>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-5 px-3.5 py-2.5 bg-[#fff5f5]/90 border border-[#dc2626]/30 text-[#991b1b] text-[13px] rounded-[12px] font-normal"
              >
                {error}
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 px-3.5 py-2.5 bg-[#eaf9f0]/90 border border-[#47C4A5]/45 text-[#0B2B26] text-[13px] rounded-[12px] font-normal flex items-center gap-2"
              >
                <CheckCircle2 aria-hidden="true" className="w-4 h-4 shrink-0 text-[#0E807E]" />
                <span>{successMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              {authMode === "register" && (
                <div>
                  <label
                    htmlFor="auth-name"
                    className="block text-[12px] font-medium text-[#2E524C] mb-1.5"
                  >
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      id="auth-name"
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Full name"
                      autoComplete="name"
                      className="input-glass-clean w-full pl-4 pr-12 py-3.5 text-[14px]"
                    />
                    <User
                      aria-hidden="true"
                      className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 stroke-[1.75]"
                    />
                  </div>
                </div>
              )}

              <div>
                <label
                  htmlFor="auth-email"
                  className="block text-[12px] font-medium text-[#2E524C] mb-1.5"
                >
                  Email address
                </label>
                <div className="relative">
                  <input
                    id="auth-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email address"
                    autoComplete="email"
                    className="input-glass-clean w-full pl-4 pr-12 py-3.5 text-[14px]"
                  />
                  <Mail
                    aria-hidden="true"
                    className="w-4 h-4 text-[#2E524C] pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 stroke-[1.75]"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="auth-password"
                  className="block text-[12px] font-medium text-[#2E524C] mb-1.5"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="auth-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    autoComplete={
                      authMode === "login" ? "current-password" : "new-password"
                    }
                    className="input-glass-clean w-full pl-4 pr-12 py-3.5 text-[14px]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#2E524C] hover:text-[#0B2B26] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
                  >
                    {showPassword ? (
                      <EyeOff aria-hidden="true" className="w-4 h-4 stroke-[1.75]" />
                    ) : (
                      <Eye aria-hidden="true" className="w-4 h-4 stroke-[1.75]" />
                    )}
                  </button>
                </div>
              </div>

              {authMode === "register" && (
                <div>
                  <label
                    htmlFor="auth-confirm-password"
                    className="block text-[12px] font-medium text-[#2E524C] mb-1.5"
                  >
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      autoComplete="new-password"
                      className="input-glass-clean w-full pl-4 pr-12 py-3.5 text-[14px]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                      className="absolute right-1 top-1/2 -translate-y-1/2 min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-full text-[#2E524C] hover:text-[#0B2B26] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
                    >
                      {showConfirmPassword ? (
                        <EyeOff aria-hidden="true" className="w-4 h-4 stroke-[1.75]" />
                      ) : (
                        <Eye aria-hidden="true" className="w-4 h-4 stroke-[1.75]" />
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Remember me & clean Demo Quick-Fill */}
              <div className="flex items-center justify-between gap-3 pt-0.5 text-xs text-[#2E524C]">
                <label className="inline-flex items-center gap-2.5 min-h-[44px] pr-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => {
                      const next = e.target.checked;
                      setRememberMe(next);
                      if (!next && typeof window !== "undefined") {
                        try {
                          window.localStorage.setItem(REMEMBER_PREF_STORAGE_KEY, "false");
                          window.localStorage.removeItem(REMEMBERED_EMAIL_STORAGE_KEY);
                        } catch {
                          // Ignore storage errors
                        }
                      }
                    }}
                    className="w-4 h-4 rounded-[4px] border border-[#0B2B26]/25 accent-[#0E807E] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
                  />
                  <span>Remember me</span>
                </label>

                {authMode === "login" && (
                  <button
                    type="button"
                    onClick={() => {
                      setEmail("rnd.chemist@formylab.ai");
                      setPassword("12345");
                      setError("");
                    }}
                    className="inline-flex items-center min-h-[44px] px-2 -mr-2 rounded-[8px] text-xs font-medium text-[#2E524C] hover:text-[#0B2B26] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
                  >
                    Use demo account
                  </button>
                )}
              </div>

              <button
                type="submit"
                onClick={triggerNavPulse}
                className="btn-glass-primary w-full min-h-[44px] py-3.5 px-6 text-sm font-medium mt-4 inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{authMode === "login" ? "Login" : "Create Account"}</span>
                <ArrowRight aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
              </button>
            </form>

            {/* Centered Auth Switch Footer */}
            <p className="mt-4 text-center text-xs text-[#2E524C] flex items-center justify-center flex-wrap gap-x-1">
              {authMode === "login" ? (
                <>
                  <span>Don&apos;t have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("register")}
                    className="inline-flex items-center justify-center min-h-[44px] px-2 rounded-[8px] font-medium text-[#0B2B26] hover:text-[#0E807E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  <span>Already have an account?</span>
                  <button
                    type="button"
                    onClick={() => switchMode("login")}
                    className="inline-flex items-center justify-center min-h-[44px] px-2 rounded-[8px] font-medium text-[#0B2B26] hover:text-[#0E807E] transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
                  >
                    Login
                  </button>
                </>
              )}
            </p>
          </div>
        </main>

        {/* Quiet bottom balance */}
        <footer className="relative z-10 text-center text-[11px] text-[#2E524C]">
          © 2026 formylab.ai
        </footer>
      </div>
    );
  }

  // ============================================================================
  // VIEW 1 (DEFAULT): AQUA – LEMON LIME CLEAN SWISS-EDITORIAL LANDING PAGE
  // ============================================================================
  const navLinks = [
    { href: "#tentang-website", label: "Overview" },
    { href: "#alur-kerja", label: "Workflow" },
    { href: "#fungsi-ai", label: "9 AI Modules" },
    { href: "#visi-misi", label: "Vision & Mission" },
  ];

  return (
    <div className="min-h-screen relative font-sans bg-[#ffffff] text-[#0B2B26] overflow-x-clip">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:inline-flex focus:items-center focus:min-h-[44px] focus:px-5 focus:py-2.5 focus:rounded-full focus:bg-[#0B2B26] focus:text-white focus:text-[13px] focus:font-medium focus:outline-none focus:ring-2 focus:ring-[#0E807E] focus:ring-offset-2"
      >
        Skip to main content
      </a>

      {/* Top Navigation Progress Hairline (2px crisp indicator on route/view actions) */}
      {navPulseKey > 0 && (
        <div
          key={navPulseKey}
          aria-hidden="true"
          className="fixed top-0 left-0 right-0 z-[70] h-[2px] origin-left pointer-events-none auros-nav-hairline bg-[#0B2B26]"
        />
      )}

      {/* CRISP FROSTED WHITE NAVBAR (bg-white/85 backdrop-blur-md border-b border-[#0B2B26]/10) */}
      <header className="sticky top-0 z-40 w-full h-[80px] bg-white/85 backdrop-blur-md border-b border-[#0B2B26]/10">
        <div className="max-w-7xl h-full mx-auto px-4 sm:px-6 flex items-center justify-between gap-3 sm:gap-6">
          {/* Zone 1: Precision Light BrandLogo (#0B2222 + #3FC6C5) */}
          <a
            href="#tentang-website"
            onClick={() => {
              setActiveNav("#tentang-website");
              setMobileMenuOpen(false);
            }}
            className="flex items-center min-h-[44px] shrink-0 rounded-[10px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
          >
            <BrandLogo variant="light" size="sm" />
          </a>

          {/* Zone 2: Clean Editorial Navigation Links with Sliding Indicator */}
          <nav aria-label="Primary Navigation" className="hidden md:flex items-center gap-7">
            {navLinks.map((item) => {
              const isActive = activeNav === item.href;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  onClick={() => setActiveNav(item.href)}
                  aria-current={isActive ? "location" : undefined}
                  className={`group relative inline-flex items-center min-h-[44px] text-[12px] uppercase tracking-[0.12em] font-medium transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2 ${
                    isActive
                      ? "text-[#0B2B26]"
                      : "text-[#2E524C] hover:text-[#0B2B26]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute left-0 right-0 bottom-2 h-[1.5px] rounded-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive
                        ? "bg-[#0E807E] scale-x-100"
                        : "bg-[#3FC6C5] scale-x-0 group-hover:scale-x-100"
                    }`}
                  />
                </a>
              );
            })}
          </nav>

          {/* Zone 3: Right Auth Actions — Clear + Blur Optical Glass Pill Buttons + Mobile Menu Toggle */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => openLoginWithMode("register")}
              className="btn-glass-secondary hidden sm:inline-flex items-center justify-center min-h-[44px] px-6 py-2.5 text-[12px] uppercase tracking-[0.1em] cursor-pointer whitespace-nowrap"
            >
              <span>Create Account</span>
            </button>
            <button
              type="button"
              onClick={() => openLoginWithMode("login")}
              className="btn-glass-primary group inline-flex items-center justify-center gap-2 min-h-[44px] px-4 sm:px-6 py-2.5 text-[12px] uppercase tracking-[0.1em] cursor-pointer whitespace-nowrap"
            >
              <LogIn
                aria-hidden="true"
                className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
              />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={mobileMenuOpen ? "Close navigation menu" : "Open navigation menu"}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-nav-drawer"
              className="btn-glass-compact md:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] w-11 h-11 p-0 cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" className="w-5 h-5 text-[#0B2B26]" />
              ) : (
                <Menu aria-hidden="true" className="w-5 h-5 text-[#0B2B26]" />
              )}
            </button>
          </div>
        </div>

        {/* Clean Light Theme Mobile Navigation Drawer (<768px) */}
        {mobileMenuOpen && (
          <div
            id="mobile-nav-drawer"
            className="md:hidden absolute top-full left-0 right-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#0B2B26]/10 px-6 py-5"
          >
            <nav aria-label="Mobile Navigation" className="flex flex-col gap-1 mb-4">
              {navLinks.map((item) => {
                const isActive = activeNav === item.href;
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      setActiveNav(item.href);
                      setMobileMenuOpen(false);
                    }}
                    aria-current={isActive ? "location" : undefined}
                    className={`min-h-[44px] px-3 rounded-[10px] flex items-center justify-between text-[13px] uppercase tracking-[0.12em] font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2 ${
                      isActive
                        ? "bg-[#f4fbf8] text-[#0B2B26]"
                        : "text-[#2E524C] hover:bg-[#f8fdfb] hover:text-[#0B2B26]"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isActive && (
                      <span
                        aria-hidden="true"
                        className="w-1.5 h-1.5 rounded-full bg-[#0E807E]"
                      />
                    )}
                  </a>
                );
              })}
            </nav>

            <div className="pt-4 border-t border-[#0B2B26]/10 flex flex-col gap-2.5">
              <button
                type="button"
                onClick={() => openLoginWithMode("register")}
                className="btn-glass-secondary w-full min-h-[44px] inline-flex items-center justify-center px-6 py-2.5 text-[12px] uppercase tracking-[0.1em] cursor-pointer"
              >
                <span>Create Account</span>
              </button>
              <button
                type="button"
                onClick={() => openLoginWithMode("login")}
                className="btn-glass-primary group w-full min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 text-[12px] uppercase tracking-[0.1em] cursor-pointer"
              >
                <LogIn
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                />
                <span>Login</span>
              </button>
            </div>
          </div>
        )}
      </header>

      {/* MAIN CONTENT FLOW: 100% CLEAN LIGHT GREEN HERO & OVERVIEW → CRISP CLINICAL WORKFLOW & 9 AI MODULES → CLEAN LIGHT GREEN VISION & CTA → PURE WHITE FOOTER */}
      <main id="main-content" className="relative z-10">
        {/* CRISP WHITE CANVAS (#ffffff) SO MOVING MINT TEAL & SOFT GREEN LIGHT ORBS POP VIVIDLY */}
        <div className="relative overflow-hidden bg-[#ffffff]">
          {/* SECTION 1A: FULL-BLEED CLEAN LIGHT GREEN HERO + 6-COLOR SATURATED 3D PARTICLE SPHERE */}
          <section
            id="tentang-website"
            className="relative min-h-[680px] py-16 md:py-24 flex flex-col items-center justify-center overflow-hidden"
          >
            {/* GPU-Accelerated Mint Teal (#47C4A5), Soft Green (#89D78C) & Sweeping Aurora Light */}
            <AmbientBioluminescence variant="hero" />

            {/* Full-Bleed Zero-Dependency WebGL1 360° Particle Sphere (Explicitly stacked at z-[1] above ambient light) */}
            <div className="absolute inset-0 z-[1] pointer-events-none">
              <ParticleSphere />
            </div>

            {/* Centered Hero Content Stack (Strictly above ParticleSphere & Veil at z-10) */}
            <div className="relative z-10 max-w-[920px] mx-auto px-6 flex flex-col items-center text-center">
              <p className="eyebrow-liquid-glass px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-6">
                WE ARE EXPERT R&amp;D FORMULATION TEAM · FORMYLAB.AI
              </p>

              <h1
                className="text-[clamp(2.35rem,4.4vw,4rem)] font-medium text-[#0B2B26] leading-[1.03] tracking-[-0.04em] max-w-[900px] mb-7"
                style={{ textWrap: "balance" }}
              >
                We accelerate cosmetic formulation &amp; improve accuracy.
              </h1>

              <div className="max-w-[740px] mx-auto space-y-4 mb-9">
                <p className="text-[16px] text-[#2E524C] leading-[1.55]">
                  <span className="text-[#0B2B26] font-medium">formylab.ai</span> adalah{" "}
                  <span className="text-[#0B2B26] font-medium">AI Co-Pilot Formulasi Skincare</span> khusus untuk{" "}
                  <span className="text-[#0B2B26] font-medium">maklon dan produsen skincare</span>. Pelaku utamanya ada dua:{" "}
                  <span className="text-[#0B2B26] font-medium">Klien brand</span> datang ke maklon dengan permintaan produk
                  (misalnya <em>&ldquo;mau serum brightening ringan&rdquo;</em>), dan{" "}
                  <span className="text-[#0B2B26] font-medium">tim R&amp;D maklon</span> memakai AI ini secara internal untuk
                  menerjemahkan permintaan tersebut menjadi formula yang bisa langsung
                  dicoba di laboratorium.
                </p>

                <p className="text-[15px] text-[#2E524C] leading-[1.55]">
                  Dari pengisian <span className="text-[#0B2B26] font-medium">Otak Internal Gudang &amp; Bahan Baku</span>,
                  penerjemahan <span className="text-[#0B2B26] font-medium">Brief Klien jadi Spesifikasi Teknis</span>,
                  penyusunan <span className="text-[#0B2B26] font-medium">Draft Formula Awal</span>, penyaringan lewat{" "}
                  <span className="text-[#0B2B26] font-medium">5 Pengecekan Berlapis: Regulasi, Kompatibilitas, Halal, Stok &amp; Biaya</span>,
                  penyajian <span className="text-[#0B2B26] font-medium">Output Berlapis Formula A, B, C beserta Catatan Trade-off</span>,
                  perancangan <span className="text-[#0B2B26] font-medium">Strategi Percobaan Lab</span>, pencatatan hasil
                  racikan &amp; <span className="text-[#0B2B26] font-medium">Learning Loop</span>, hingga penyiapan{" "}
                  <span className="text-[#0B2B26] font-medium">Dokumentasi Formula Sheet, Notifikasi BPOM &amp; Checklist Halal</span>.
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={() => openLoginWithMode("login")}
                  className="btn-glass-primary group inline-flex items-center justify-center gap-2.5 min-h-[44px] px-7 py-3.5 text-[13px] uppercase tracking-[0.06em] cursor-pointer"
                >
                  <LogIn
                    aria-hidden="true"
                    className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                  />
                  <span>Login to R&amp;D Workspace</span>
                </button>

                <a
                  href="#alur-kerja"
                  onClick={() => setActiveNav("#alur-kerja")}
                  className="btn-glass-secondary group min-h-[44px] px-7 py-3.5 text-[13px] uppercase tracking-[0.06em] inline-flex items-center gap-2.5"
                >
                  <Layers
                    aria-hidden="true"
                    className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                  />
                  <span>View 8-Step Workflow</span>
                </a>
              </div>
            </div>
          </section>

          {/* SECTION 1B & 2: SELECTIVE OPTICAL GLASS OVERVIEW CARDS + SCROLL-REVEAL STATEMENT + COUNTERS */}
          <div className="relative overflow-hidden">
            <AmbientBioluminescence variant="section" />

            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 space-y-[80px] pt-8 pb-[88px]">
              {/* 3-Column Selective Glassmorphism Overview Cards */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Card 01 */}
                <article className="group card-glass-optical text-[#0B2B26] p-[36px] flex flex-col justify-between">
                  <div className="mb-5">
                    <span className="block text-[12px] font-mono tabular-nums font-medium uppercase tracking-[0.06em] text-[#2E524C] group-hover:text-[#0B2B26] transition-colors duration-300 mb-2.5">
                      01 · Brief Intake
                    </span>
                    <h2 className="text-[24px] font-medium text-[#0B2B26] leading-[1.12] tracking-[-0.03em]">
                      Brand Client → R&amp;D Formulation Team
                    </h2>
                  </div>
                  <p className="text-[15px] text-[#2E524C] leading-[1.5]">
                    Klien brand mengajukan brief produk (jenis sediaan, klaim, target
                    kulit/tekstur, target HPP, wajib halal, deadline &amp; MOQ), lalu tim R&amp;D
                    maklon memprosesnya dengan AI Co-Pilot.
                  </p>
                </article>

                {/* Card 02 */}
                <article className="group card-glass-optical text-[#0B2B26] p-[36px] flex flex-col justify-between">
                  <div className="mb-5">
                    <span className="block text-[12px] font-mono tabular-nums font-medium uppercase tracking-[0.06em] text-[#2E524C] group-hover:text-[#0B2B26] transition-colors duration-300 mb-2.5">
                      02 · Automated Verification
                    </span>
                    <h2 className="text-[24px] font-medium text-[#0B2B26] leading-[1.12] tracking-[-0.03em]">
                      5-Layer Automated Screening
                    </h2>
                  </div>
                  <p className="text-[15px] text-[#2E524C] leading-[1.5]">
                    Setiap draft formula disaring otomatis melewati 5 pengecek:{" "}
                    <span className="text-[#0B2B26] font-medium">Regulasi BPOM/ASEAN</span>,{" "}
                    <span className="text-[#0B2B26] font-medium">Kompatibilitas &amp; Stabilitas</span>,{" "}
                    <span className="text-[#0B2B26] font-medium">Status Halal</span>,{" "}
                    <span className="text-[#0B2B26] font-medium">Stok Gudang</span>, dan{" "}
                    <span className="text-[#0B2B26] font-medium">Biaya HPP / Percobaan</span>.
                  </p>
                </article>

                {/* Card 03 */}
                <article className="group card-glass-optical text-[#0B2B26] p-[36px] flex flex-col justify-between">
                  <div className="mb-5">
                    <span className="block text-[12px] font-mono tabular-nums font-medium uppercase tracking-[0.06em] text-[#2E524C] group-hover:text-[#0B2B26] transition-colors duration-300 mb-2.5">
                      03 · Multi-Candidate Output
                    </span>
                    <h2 className="text-[24px] font-medium text-[#0B2B26] leading-[1.12] tracking-[-0.03em]">
                      Tiered Formulas A, B, C &amp; Learning Loop
                    </h2>
                  </div>
                  <p className="text-[15px] text-[#2E524C] leading-[1.5]">
                    Menghasilkan <span className="text-[#0B2B26] font-medium">Formula A (Ideal)</span>,{" "}
                    <span className="text-[#0B2B26] font-medium">Formula B (Hemat/Halal)</span>, dan{" "}
                    <span className="text-[#0B2B26] font-medium">Formula C (Stok Tersedia)</span> lengkap dengan catatan{" "}
                    <em>trade-off</em>, rencana trial lab, dan pembelajaran dari hasil racikan.
                  </p>
                </article>
              </div>

              {/* EDITORIAL SCROLL-REVEAL STATEMENT BLOCK (Over Clean Light Green Base) */}
              <section
                aria-label="FormyLab Formulation Intelligence Statement"
                className="py-10 sm:py-16 max-w-[1160px]"
              >
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-5">
                  CLINICAL FORMULATION INTELLIGENCE · FORMYLAB.AI
                </p>
                <ScrollColorText
                  as="h2"
                  theme="aqua"
                  text="We unite cosmetic formulation science, 5-layer regulatory screening, and warehouse intelligence, turning brand briefs into lab-ready formulas."
                  className="text-[34px] sm:text-[50px] lg:text-[61px] font-medium leading-[1.06] tracking-[-0.04em]"
                  style={{ textWrap: "balance" }}
                />
              </section>

              {/* SECTION 2: STATISTICS / CAPABILITY COUNTER BLOCK (Crisp #0B2B26 Editorial Readouts) */}
              <section
                aria-label="FormyLab R&D Capabilities & Telemetry"
                className="py-10 border-y border-[#0E807E]/15"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                  <div>
                    <div className="text-[72px] sm:text-[86px] font-mono font-medium text-[#0B2B26] leading-none tracking-[-0.046em] tabular-nums mb-3">
                      05
                    </div>
                    <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-1.5">
                      LAYERED SCREENING GATES
                    </div>
                    <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                      BPOM/ASEAN Regulation, Stability, Halal Status, Warehouse Stock &amp; HPP Cost.
                    </p>
                  </div>

                  <div>
                    <div className="text-[72px] sm:text-[86px] font-mono font-medium text-[#0B2B26] leading-none tracking-[-0.046em] tabular-nums mb-3">
                      09
                    </div>
                    <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-1.5">
                      INTEGRATED AI R&amp;D MODULES
                    </div>
                    <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                      End-to-end co-pilot modules from client brief translator to lab trial learning loop.
                    </p>
                  </div>

                  <div>
                    <div className="text-[72px] sm:text-[86px] font-mono font-medium text-[#0B2B26] leading-none tracking-[-0.046em] tabular-nums mb-3">
                      A·B·C
                    </div>
                    <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-1.5">
                      TIERED FORMULA CANDIDATES
                    </div>
                    <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                      Ideal Benchmark, Cost/Halal Optimized, and Ready-Stock Warehouse formulations.
                    </p>
                  </div>

                  <div>
                    <div className="text-[72px] sm:text-[86px] font-mono font-medium text-[#0B2B26] leading-none tracking-[-0.046em] tabular-nums mb-3">
                      4.5–6.5
                    </div>
                    <div className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-1.5">
                      TARGET pH &amp; MOQ CALIBRATION
                    </div>
                    <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                      Precision rheology, HLB balance, HPP per unit, and MOQ scaling parameters.
                    </p>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>

        {/* SECTION 3: END-TO-END WORKFLOW — MOVING AMBIENT LIGHT BEHIND STICKY 5-GATE GLASS CARD + CRISP WHITE STEP LIST */}
        <section
          id="alur-kerja"
          className="relative w-full bg-[#fcfffe] text-[#0B2B26] border-y border-[#0E807E]/12"
        >
          {/* Overflow-clipped ambient layer so lg:sticky on the left column remains 100% intact */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
            <AmbientBioluminescence variant="section" />
          </div>

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-24">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
              {/* LEFT STICKY COLUMN (4 cols): Editorial Header + Selective Glass 5-Gate Card */}
              <div className="lg:col-span-4 lg:sticky lg:top-24 self-start space-y-4">
                <div>
                  <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-1.5">
                    AI SKINCARE FORMULATION CO-PILOT WORKFLOW
                  </p>
                  <ScrollColorText
                    as="h2"
                    theme="light"
                    text="End-to-End Formulation Workflow"
                    className="text-[30px] sm:text-[36px] font-medium leading-[1.06] tracking-[-0.035em] mb-2.5"
                    style={{ textWrap: "balance" }}
                  />
                  <p className="text-[13.5px] text-[#2E524C] leading-[1.5] mb-3.5">
                    Satu alur utama terstruktur yang menghubungkan database internal gudang
                    maklon, input brief klien brand, pengecekan berlapis, opsi formula A/B/C,
                    hingga rencana percobaan dan dokumentasi BPOM/Halal.
                  </p>

                  <button
                    type="button"
                    onClick={() => openLoginWithMode("login")}
                    className="btn-glass-primary group inline-flex items-center gap-2.5 min-h-[44px] px-6 py-2.5 text-[12px] uppercase tracking-[0.1em] cursor-pointer"
                  >
                    <span>Start Workflow in Workspace</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                    />
                  </button>
                </div>

                {/* SELECTIVE GLASSMORPHISM STICKY CARD: 5-Gate Automated Screening Architecture */}
                <div className="card-glass-optical card-glass-static text-[#0B2B26] overflow-hidden">
                  {/* Signature 6-Color Palette Spectrum Hairline */}
                  <div
                    aria-hidden="true"
                    className="h-[3px] w-full"
                    style={{
                      background:
                        "linear-gradient(90deg, #3FC6C5 0%, #47C4A5 22%, #89D78C 44%, #82CB82 64%, #ADE180 82%, #D9ED91 100%)",
                    }}
                  />

                  <div className="p-5">
                    <div className="pb-3 border-b border-[#0E807E]/15">
                      <span className="text-[10px] font-medium uppercase tracking-[0.14em] text-[#2E524C] block mb-1">
                        MOLECULAR &amp; PROCESS TOPOLOGY
                      </span>
                      <h3 className="text-[18px] sm:text-[19px] font-medium text-[#0B2B26] leading-[1.15] tracking-[-0.03em] mb-1">
                        5-Gate Automated Screening Architecture
                      </h3>
                      <p className="text-[12px] text-[#2E524C] leading-[1.45]">
                        Setiap node bahan baku dan fase emulsi divalidasi secara paralel terhadap
                        batas konsentrasi BPOM, kompatibilitas pH, sertifikasi Halal, stok aktif
                        gudang, serta target HPP.
                      </p>
                    </div>

                    {/* 5 Crisp White Gate Rows (01–05) — Zero nested backdrop-filter */}
                    <ol className="space-y-1.5 my-3">
                      {[
                        {
                          num: "01",
                          gate: "Regulasi BPOM / ASEAN",
                          spec: "Batas maks. % & audit klaim",
                        },
                        {
                          num: "02",
                          gate: "Kompatibilitas & Stabilitas",
                          spec: "Rentang pH, HLB & interaksi aktif",
                        },
                        {
                          num: "03",
                          gate: "Verifikasi Status Halal",
                          spec: "Audit SJPH MUI / BPJPH",
                        },
                        {
                          num: "04",
                          gate: "Ketersediaan Stok Gudang",
                          spec: "Ready-stock vs lead-time order",
                        },
                        {
                          num: "05",
                          gate: "Kalkulasi HPP & Trial",
                          spec: "Biaya per unit, BOM & MOQ",
                        },
                      ].map((g) => (
                        <li
                          key={g.num}
                          className="bg-white/88 border border-[#0B2B26]/10 rounded-[10px] px-3 py-2 flex items-start gap-2.5"
                        >
                          <span className="text-[12px] font-mono font-medium tracking-[0.04em] text-[#0E807E] tabular-nums shrink-0 pt-0.5 w-6">
                            {g.num}
                          </span>
                          <div className="min-w-0 flex-1">
                            <span className="text-[12.5px] font-medium text-[#0B2B26] leading-snug block">
                              {g.gate}
                            </span>
                            <span className="text-[11.5px] font-sans text-[#2E524C] leading-snug block">
                              {g.spec}
                            </span>
                          </div>
                        </li>
                      ))}
                    </ol>

                    <div className="pt-2.5 border-t border-[#0E807E]/15 flex items-center justify-between gap-2 text-[11px] font-sans uppercase tracking-[0.08em]">
                      <span className="text-[#2E524C]">
                        BPOM · HALAL · HLB · STOCK · HPP
                      </span>
                      <span className="text-[#2E524C] font-medium shrink-0">
                        Full Step Traceability
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (8 cols): EDITORIAL ARCHITECTURAL LIST ON CRISP WHITE (#ffffff) */}
              <div className="lg:col-span-8 bg-[#ffffff] rounded-[16px] border border-[#0B2B26]/10 divide-y divide-[#0B2B26]/10 overflow-hidden">
                {WORKFLOW_TAHAPAN_FORMYLAB.map((item, idx) => {
                  const stepNumber = String(idx + 1).padStart(2, "0");
                  return (
                    <article
                      key={item.tahap}
                      className="group relative p-7 sm:p-9 grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-start transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-[#f4fbf8]"
                    >
                      <span
                        aria-hidden="true"
                        className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#3FC6C5] scale-y-0 group-hover:scale-y-100 origin-top transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                      />
                      <div className="sm:col-span-2 flex sm:flex-col items-baseline sm:items-start gap-2.5 sm:gap-1">
                        <span className="text-3xl sm:text-[34px] font-mono font-medium tracking-tight text-[#0E807E] leading-none tabular-nums transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1">
                          {stepNumber}
                        </span>
                        <span className="text-[11px] font-sans font-medium uppercase tracking-[0.08em] text-[#2E524C]">
                          {item.tahap}
                        </span>
                      </div>

                      <div className="sm:col-span-10">
                        <h3 className="text-xl md:text-2xl font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.025em] mb-2">
                          {item.title.replace(/\s*—\s*/g, ": ")}
                        </h3>
                        <p className="text-[15px] font-medium text-[#0E807E] leading-relaxed mb-3.5">
                          {item.subtitle.replace(/\s*—\s*/g, ", ")}
                        </p>
                        <ul className="space-y-2.5 text-[15px] leading-relaxed text-[#2E524C]">
                          {item.bullets.map((b, i) => (
                            <li key={i} className="flex items-start gap-3">
                              <span
                                className="mt-[11px] w-2.5 h-[1.5px] bg-[#47C4A5] shrink-0"
                                aria-hidden="true"
                              />
                              <span>{b.replace(/\s*—\s*/g, ", ")}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: 9 INTEGRATED AI MODULES — CRISP 3×3 SWISS HAIRLINE MATRIX (#ffffff) */}
        <section
          id="fungsi-ai"
          className="w-full bg-[#ffffff] text-[#0B2B26] border-b border-[#0E807E]/12"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-24">
            {/* Clean Editorial Header */}
            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-12">
              <div className="max-w-[700px]">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#0E807E] mb-3">
                  FORMYLAB.AI WORKFLOW · AI FUNCTION SUMMARY
                </p>
                <ScrollColorText
                  as="h2"
                  theme="light"
                  text="9 Integrated AI Modules for Cosmetic R&D Laboratories"
                  className="text-[36px] sm:text-[46px] font-medium leading-[1.05] tracking-[-0.035em] mb-4"
                  style={{ textWrap: "balance" }}
                />
                <p className="text-[16px] text-[#2E524C] leading-[1.55]">
                  Seluruh modul di bawah ini bekerja di dalam satu alur utama{" "}
                  <span className="font-medium text-[#0B2B26]">formylab.ai</span> untuk mendampingi
                  tim R&amp;D maklon dari tahap interpretasi brief klien hingga pembelajaran hasil
                  lab tiap proyek.
                </p>
              </div>

              <button
                type="button"
                onClick={() => openLoginWithMode("login")}
                className="btn-glass-primary group inline-flex items-center gap-2.5 min-h-[44px] px-7 py-3.5 text-[12px] uppercase tracking-[0.1em] self-start lg:self-auto shrink-0 cursor-pointer"
              >
                <span>Login to Use 9 AI Modules</span>
                <ArrowRight
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                />
              </button>
            </div>

            {/* 3×3 Swiss Architectural Hairline Matrix */}
            <div className="border border-[#0B2B26]/10 rounded-[16px] overflow-hidden bg-[#0B2B26]/10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px">
              {FORMYLAB_AI_MODULES.map((mod, index) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => openLoginWithMode("login")}
                  aria-label={`Module ${String(index + 1).padStart(2, "0")}: ${mod.name}. Buka halaman Login untuk mengakses modul ini`}
                  className="bg-[#ffffff] hover:bg-[#f4fbf8] p-8 text-left flex flex-col justify-between transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] cursor-pointer group focus-visible:outline-none focus-visible:relative focus-visible:z-10 focus-visible:bg-[#f4fbf8] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0E807E]"
                >
                  <div>
                    <span className="text-[12px] font-mono font-medium tracking-[0.04em] text-[#0E807E] group-hover:text-[#0B2B26] transition-colors duration-300 tabular-nums block mb-5">
                      Module {String(index + 1).padStart(2, "0")}
                    </span>
                    <h3 className="text-xl font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.025em] mb-3 group-hover:text-[#0E807E] transition-colors duration-300">
                      {mod.name}
                    </h3>
                    <p className="text-[15px] text-[#2E524C] leading-[1.55]">
                      {mod.fungsi.replace(/\s*—\s*/g, ", ")}
                    </p>
                  </div>
                  <span className="mt-6 block text-[11px] font-medium uppercase tracking-[0.1em] text-[#2E524C] opacity-75 group-hover:opacity-100 group-focus-visible:opacity-100 group-hover:text-[#0E807E] group-focus-visible:text-[#0E807E] transition-all duration-300">
                    Login to open module
                  </span>
                </button>
              ))}
            </div>

            {/* Horizontal Editorial Sub-Banner: Clean Light Green 6-Color Base */}
            <div
              className="mt-8 border border-[#0B2B26]/10 rounded-[16px] px-7 py-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
              style={{ background: "var(--gradient-clean-base)" }}
            >
              <div className="max-w-[780px]">
                <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#2E524C] block mb-1.5">
                  CO-PILOT INTELLIGENCE GRAPH
                </span>
                <h3 className="text-lg sm:text-xl font-medium text-[#0B2B26] leading-[1.2] tracking-[-0.02em] mb-1.5">
                  Closed-Loop R&amp;D Knowledge Synthesis
                </h3>
                <p className="text-[14px] sm:text-[15px] text-[#2E524C] leading-[1.55]">
                  Menghubungkan 9 modul spesialis ke dalam satu memori kolektif
                  laboratorium maklon agar setiap hasil trial meningkatkan presisi batch
                  berikutnya.
                </p>
              </div>

              <div className="flex items-baseline lg:flex-col lg:items-end gap-3 lg:gap-1 shrink-0 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#0E807E]/15">
                <span className="text-3xl sm:text-[34px] font-mono font-medium text-[#0B2B26] leading-none tracking-[-0.03em] tabular-nums">
                  09
                </span>
                <span className="text-[11px] font-sans font-medium uppercase tracking-[0.12em] text-[#2E524C]">
                  Active Formulation Modules Ready
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* CRISP WHITE CANVAS (#fcfffe) + VIVID MOVING LIGHT ORBS: VISION & MISSION + 4 AI PILLARS + FINAL CTA */}
        <div className="relative overflow-hidden bg-[#fcfffe]">
          <AmbientBioluminescence variant="section" />

          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 space-y-[80px] pt-[80px] pb-[96px]">
            {/* SECTION 5: VISION & MISSION */}
            <section
              id="visi-misi"
              className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch pt-4"
            >
              {/* VISION CRISP WHITE CARD (Non-glass per DESIGN.md §4.2) */}
              <div className="lg:col-span-5 bg-white border border-[#0B2B26]/10 rounded-[16px] p-[36px] flex flex-col justify-between text-[#0B2B26]">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <span className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-[#0E807E]">
                      <Target aria-hidden="true" className="w-4 h-4 text-[#0E807E] stroke-[1.75]" />
                      <span>OUR VISION</span>
                    </span>
                  </div>

                  <ScrollColorText
                    as="h2"
                    theme="light"
                    text="Accelerating Innovation & Accuracy in Cosmetic Formulation R&D"
                    className="text-[32px] sm:text-[36px] font-medium leading-[1.08] tracking-[-0.04em] mb-5"
                  />
                  <p className="text-[16px] text-[#2E524C] leading-[1.5]">
                    Menjadi AI Co-Pilot R&amp;D kosmetik andalan bagi maklon dan produsen
                    skincare yang mempercepat proses penerjemahan brief klien brand serta
                    meningkatkan akurasi formulasi melalui pengecekan berlapis (regulasi,
                    kompatibilitas, halal, stok, biaya) dan pembelajaran hasil lab
                    berkelanjutan.
                  </p>
                </div>

                <div className="pt-6 mt-8 border-t border-[#0E807E]/15 flex items-center justify-between text-[12px] uppercase tracking-[0.12em] font-medium text-[#0B2B26]">
                  <span>Speed · Accuracy · Regulatory &amp; Halal Aligned</span>
                  <ShieldCheck aria-hidden="true" className="w-5 h-5 text-[#0E807E] stroke-[1.75]" />
                </div>
              </div>

              {/* MISSION CRISP WHITE CARD (Non-glass per DESIGN.md §4.2) */}
              <div className="lg:col-span-7 bg-white border border-[#0B2B26]/10 rounded-[16px] p-[36px] flex flex-col justify-between text-[#0B2B26]">
                <div>
                  <div className="flex items-center justify-between gap-4 mb-6">
                    <span className="inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.14em] text-[#0E807E]">
                      <Compass aria-hidden="true" className="w-4 h-4 text-[#0E807E] stroke-[1.75]" />
                      <span>OUR MISSION</span>
                    </span>
                  </div>

                  <ScrollColorText
                    as="h2"
                    theme="light"
                    text="4 Core Commitments of Our AI Co-Pilot for R&D Teams"
                    className="text-[32px] sm:text-[36px] font-medium leading-[1.08] tracking-[-0.04em] mb-7"
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-6 rounded-[12px] bg-[#f5fcf9] border border-[#3FC6C5]/20">
                      <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0B2B26] mb-2">
                        01. Client Brief to Technical Specifications
                      </div>
                      <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                        Menerjemahkan bahasa marketing klien brand menjadi parameter
                        formulator terukur (tipe sediaan, pH, viskositas cPs, kandidat bahan
                        aktif) dan bertanya balik bila brief kurang jelas.
                      </p>
                    </div>

                    <div className="p-6 rounded-[12px] bg-[#f5fcf9] border border-[#3FC6C5]/20">
                      <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0B2B26] mb-2">
                        02. 5-Layer Automated Screening
                      </div>
                      <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                        Menyaring setiap draft formula lewat pengecek Regulasi BPOM/ASEAN,
                        Kompatibilitas &amp; Stabilitas, Status Halal, Ketersediaan Stok Gudang,
                        dan Biaya HPP.
                      </p>
                    </div>

                    <div className="p-6 rounded-[12px] bg-[#f5fcf9] border border-[#3FC6C5]/20">
                      <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0B2B26] mb-2">
                        03. Tiered Formula A, B, C &amp; Trade-offs
                      </div>
                      <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                        Memberikan opsi Formula A (Ideal), Formula B (Hemat/Halal), dan
                        Formula C (Stok Tersedia di Gudang) lengkap dengan catatan
                        trade-off tiap substitusi.
                      </p>
                    </div>

                    <div className="p-6 rounded-[12px] bg-[#f5fcf9] border border-[#3FC6C5]/20">
                      <div className="text-[13px] font-medium uppercase tracking-[0.08em] text-[#0B2B26] mb-2">
                        04. Trial Planning, Learning Loop &amp; Documentation
                      </div>
                      <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                        Merancang strategi percobaan lab, menganalisis kegagalan racikan
                        sebagai knowledge base maklon, dan menyiapkan dokumen BPOM &amp; Halal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* SECTION 6: 4 AI PILLARS & 3D MOLECULAR STUDIO */}
            <section id="empat-pilar-ai" className="pt-4">
              <div className="mb-10">
                <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-[#2E524C] mb-3">
                  ARTIFICIAL INTELLIGENCE ARCHITECTURE
                </p>
                <ScrollColorText
                  as="h2"
                  theme="light"
                  text="4 Core AI Architectures & 3D Molecular Studio"
                  className="text-[36px] sm:text-[48px] font-medium leading-none tracking-[-0.04em]"
                />
              </div>

              <div
                ref={pillarsGridRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5"
              >
                {[
                  {
                    label: "Pillar 01",
                    data: FOUR_AI_PILLARS.generative,
                    Icon: FlaskConical,
                    delayMs: 0,
                  },
                  {
                    label: "Pillar 02",
                    data: FOUR_AI_PILLARS.analytical,
                    Icon: Cpu,
                    delayMs: 90,
                  },
                  {
                    label: "Pillar 03",
                    data: FOUR_AI_PILLARS.interactive,
                    Icon: Volume2,
                    delayMs: 180,
                  },
                  {
                    label: "Pillar 04",
                    data: FOUR_AI_PILLARS.vision,
                    Icon: Eye,
                    delayMs: 270,
                  },
                ].map(({ label, data, Icon, delayMs }) => (
                  <div
                    key={label}
                    className="h-full"
                    style={{
                      opacity: isPillarsRevealed ? 1 : 0,
                      transform: isPillarsRevealed
                        ? "translate3d(0, 0, 0)"
                        : "translate3d(0, 22px, 0)",
                      transition: prefersReducedMotion
                        ? "none"
                        : `transform 650ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms, opacity 650ms cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms`,
                      willChange: "transform, opacity",
                    }}
                  >
                    <div className="group h-full card-glass-optical p-[36px] flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-6">
                          <span className="text-[12px] font-mono tabular-nums font-medium tracking-[0.04em] text-[#2E524C]">
                            {label}
                          </span>
                          <Icon
                            aria-hidden="true"
                            className="w-5 h-5 text-[#0E807E] stroke-[1.75] transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:text-[#0B2B26] group-hover:scale-110"
                          />
                        </div>
                        <h3 className="text-[24px] font-medium text-[#0B2B26] leading-none tracking-[-0.04em] mb-2">
                          {data.name}
                        </h3>
                        <p className="text-[13px] font-medium text-[#2E524C] mb-3">
                          {data.indonesianTitle}
                        </p>
                        <p className="text-[14px] text-[#2E524C] leading-[1.45]">
                          {data.description.replace(/\s*—\s*/g, ", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Smooth bottom fade so Section 5-6 orbs dissolve cleanly into white without a hard edge */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-white to-transparent z-[5]"
          />
        </div>

        {/* SECTION 7: FINAL CTA BLOCK (Smooth Radial Gradient + Vertical Feather Fade to White, Zero Hard Clipping) */}
        <section
          aria-label="Workspace Launch Call to Action"
          className="relative min-h-[calc(100vh-160px)] flex flex-col items-center justify-center py-24 px-6 overflow-hidden bg-white"
          style={{ minHeight: "calc(100vh - 160px)" }}
        >
          {/* Smooth Radial Gradient + Living Bioluminescence with Vertical Mask Fade so top & bottom edges dissolve seamlessly into #ffffff */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-0"
            style={{
              background:
                "radial-gradient(ellipse 68% 58% at 50% 50%, rgba(71, 196, 165, 0.24) 0%, rgba(137, 215, 140, 0.22) 34%, rgba(217, 237, 145, 0.16) 54%, transparent 72%)",
              WebkitMaskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.38) 12%, black 26%, black 74%, rgba(0, 0, 0, 0.38) 88%, transparent 100%)",
              maskImage:
                "linear-gradient(to bottom, transparent 0%, rgba(0, 0, 0, 0.38) 12%, black 26%, black 74%, rgba(0, 0, 0, 0.38) 88%, transparent 100%)",
            }}
          >
            <AmbientBioluminescence variant="cta" />
          </div>

          {/* Top & Bottom Soft White Feather Overlays to guarantee zero clipping line */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#ffffff] via-[#ffffff]/80 to-transparent z-[1]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#ffffff] via-[#ffffff]/80 to-transparent z-[1]"
          />

          <div className="relative z-10 max-w-[960px] mx-auto sm:px-4 flex flex-col items-center text-center">
            <p className="bg-transparent border-0 p-0 text-[11px] font-medium uppercase tracking-[0.16em] text-[#2E524C] mb-5">
              FORMYLAB.AI · COSMETIC R&amp;D FORMULATION TERMINAL
            </p>

            <ScrollColorText
              as="h2"
              theme="light"
              text="Ready to Accelerate Formulation Research in Your R&D Lab?"
              className="text-center text-[36px] sm:text-[61px] font-medium leading-none tracking-[-0.04em] mb-6"
              style={{ textWrap: "balance" }}
            />

            <p className="max-w-[600px] text-[16px] text-[#2E524C] leading-[1.5] mb-9">
              Klik tombol Login untuk masuk ke ruang kerja R&amp;D Maklon,
              AI Chemist Co-Pilot, dan database bahan baku 3D.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4">
              <button
                type="button"
                onClick={() => openLoginWithMode("login")}
                className="btn-glass-primary group inline-flex items-center justify-center gap-2.5 min-h-[44px] px-8 py-3.5 text-[13px] uppercase tracking-[0.06em] cursor-pointer"
              >
                <LogIn
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-1"
                />
                <span>Open Login Page</span>
              </button>

              <button
                type="button"
                onClick={() => openLoginWithMode("register")}
                className="btn-glass-secondary min-h-[44px] px-7 py-3.5 text-[13px] uppercase tracking-[0.06em] cursor-pointer"
              >
                <span>Create R&amp;D Account</span>
              </button>
            </div>
          </div>
        </section>
      </main>

      {/* PURE WHITE EDITORIAL FOOTER (Top-Level Sibling Landmark, Zero Logo, Zero border-t) */}
      <footer className="relative z-10 w-full bg-[#ffffff] text-[#0B2B26]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center justify-center sm:justify-start gap-x-6 gap-y-1"
          >
            {[
              { href: "/about", label: "ABOUT US" },
              { href: "/careers", label: "CAREERS" },
              { href: "/trust", label: "TRUST" },
              { href: "/faq", label: "FAQ" },
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="group relative inline-flex items-center min-h-[44px] text-[12px] font-medium uppercase tracking-[0.12em] text-[#2E524C] hover:text-[#0B2B26] transition-colors duration-300 rounded-[6px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
              >
                <span>{item.label}</span>
                <span
                  aria-hidden="true"
                  className="absolute left-0 right-0 bottom-2 h-[1.5px] rounded-full bg-[#3FC6C5] origin-left scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
                />
              </Link>
            ))}
          </nav>

          <p className="text-[12px] text-[#2E524C] whitespace-nowrap">
            © 2026 formylab.ai
          </p>
        </div>
      </footer>
    </div>
  );
}