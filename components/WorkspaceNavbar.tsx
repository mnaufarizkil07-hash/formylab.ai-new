"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Logo from "./Logo";

interface WorkspaceNavbarProps {
  backHref?: string;
  backLabel?: string;
}

export default function WorkspaceNavbar({ backHref, backLabel }: WorkspaceNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();

  const navItems = [
    { label: "Home", href: "/dashboard" },
    { label: "Formulate", href: "/formulate" },
    { label: "Ingredient Library", href: "/library" },
    { label: "AI Chemist", href: "/chat" },
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 pt-5 pb-2 relative z-30">
      {/* XTRA-style Floating Rounded Pill Top Bar following strict 3-zone contract */}
      <header className="w-full bg-white/95 backdrop-blur-md rounded-full shadow-[0_14px_40px_-12px_rgba(16,68,56,0.16)] border border-emerald-900/10 px-6 sm:px-8 py-3 flex items-center justify-between gap-8">
        {/* Zone 1: Original 100% Identical Brand Logo */}
        <Link
          href="/dashboard"
          className="flex items-center whitespace-nowrap shrink-0 hover:opacity-90 transition-opacity"
        >
          <Logo size="sm" />
        </Link>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-semibold text-slate-600">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href || (item.href !== "/dashboard" && pathname?.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`transition-colors whitespace-nowrap shrink-0 py-1 border-b-2 ${
                  isActive
                    ? "text-[#0f766e] border-[#10b981] font-bold"
                    : "border-transparent hover:text-[#12382f]"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Zone 3: 1 Primary Action */}
        <div className="flex items-center gap-3 shrink-0">
          {backHref ? (
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#14b8a6] to-[#0f766e] hover:opacity-95 transition shadow-sm flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{backLabel || "Back to Home"}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/formulate")}
              className="px-5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-[#14b8a6] to-[#0f766e] hover:opacity-95 transition shadow-sm cursor-pointer whitespace-nowrap shrink-0"
            >
              New Formulation
            </button>
          )}
        </div>
      </header>

      {/* Mobile Navigation Strip */}
      <nav className="flex md:hidden items-center justify-center gap-4 mt-2.5 bg-white/85 backdrop-blur-sm rounded-full px-4 py-2 border border-emerald-900/10 text-xs font-semibold text-slate-700 overflow-x-auto">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full ${
                isActive ? "bg-[#0f766e] text-white font-bold" : "text-slate-600"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
