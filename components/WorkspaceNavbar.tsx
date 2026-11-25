"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, LogOut, Menu, X } from "lucide-react";
import BrandLogo from "./BrandLogo";
import {
  ACTIVE_USER_STORAGE_KEY,
  AUTH_CHANGE_EVENT,
  clearActiveUserSession,
  getActiveUserAccount,
  type UserAccount,
} from "../lib/auth";

interface WorkspaceNavbarProps {
  backHref?: string;
  backLabel?: string;
}

export default function WorkspaceNavbar({ backHref, backLabel }: WorkspaceNavbarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserAccount | null>(null);

  const navItems = [
    { label: "Home", href: "/dashboard" },
    { label: "Formulate", href: "/formulate" },
    { label: "Ingredient Library", href: "/library" },
    { label: "AI Chemist", href: "/chat" },
  ];

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMobileMenuOpen(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mobileMenuOpen]);

  useEffect(() => {
    const syncUser = () => {
      setActiveUser(getActiveUserAccount());
    };
    syncUser();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === ACTIVE_USER_STORAGE_KEY) {
        syncUser();
      }
    };

    window.addEventListener(AUTH_CHANGE_EVENT, syncUser);
    window.addEventListener("storage", handleStorage);
    return () => {
      window.removeEventListener(AUTH_CHANGE_EVENT, syncUser);
      window.removeEventListener("storage", handleStorage);
    };
  }, []);

  const handlePrimaryAction = () => {
    setMobileMenuOpen(false);
    router.push(backHref || "/formulate");
  };

  const handleLogout = () => {
    clearActiveUserSession();
    setActiveUser(null);
    setMobileMenuOpen(false);
    router.push("/?auth=login");
  };

  return (
    <div className="w-full sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-[#0B2B26]/10">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6">
        {/* Clean Light Theme Editorial Top Bar */}
        <header className="w-full h-[80px] flex items-center justify-between gap-4 sm:gap-6">
          {/* Zone 1: ExtraBold 800 Precision BrandLogo (Light Variant) */}
          <Link
            href="/dashboard"
            onClick={() => setMobileMenuOpen(false)}
            className="min-h-[44px] inline-flex items-center whitespace-nowrap shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2"
          >
            <BrandLogo variant="light" size="sm" />
          </Link>

          {/* Zone 2: Concise single-line desktop navigation links with Aqua-to-SoftGreen active hairline */}
          <nav
            aria-label="Primary Workspace Navigation"
            className="hidden md:flex items-center gap-7"
          >
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`group relative min-h-[44px] inline-flex items-center px-1 text-[12px] font-medium uppercase tracking-[0.12em] transition-colors duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] whitespace-nowrap shrink-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2 ${
                    isActive
                      ? "text-[#0B2B26]"
                      : "text-[#2E524C] hover:text-[#0B2B26]"
                  }`}
                >
                  <span>{item.label}</span>
                  <span
                    aria-hidden="true"
                    className={`absolute left-1 right-1 bottom-2 h-[2px] rounded-full origin-left transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${
                      isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                    }`}
                    style={{
                      background:
                        "linear-gradient(90deg, #3FC6C5 0%, #89D78C 100%)",
                    }}
                  />
                </Link>
              );
            })}
          </nav>

          {/* Zone 3: Primary Optical Glass Action Button + Mobile Menu Trigger */}
          <div className="flex items-center gap-2.5 shrink-0">
            {backHref ? (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="btn-glass-secondary group hidden sm:inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-[12px] uppercase tracking-[0.08em] cursor-pointer whitespace-nowrap"
              >
                <ArrowLeft
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] transition-transform duration-300 group-hover:-translate-x-0.5"
                />
                <span>{backLabel || "Back to Home"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handlePrimaryAction}
                className="btn-glass-primary group hidden sm:inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-[12px] uppercase tracking-[0.08em] cursor-pointer whitespace-nowrap"
              >
                <span>New Formulation</span>
                <ArrowRight
                  aria-hidden="true"
                  className="w-4 h-4 text-[#0E807E] transition-transform duration-300 group-hover:translate-x-0.5"
                />
              </button>
            )}

            {activeUser && (
              <button
                type="button"
                onClick={handleLogout}
                aria-label="Logout"
                title={`Logout (${activeUser.email})`}
                className="btn-glass-compact hidden sm:inline-flex items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-3.5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#2E524C] hover:text-[#0B2B26] cursor-pointer whitespace-nowrap"
              >
                <LogOut aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                <span className="hidden lg:inline">Logout</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              aria-label={
                mobileMenuOpen
                  ? "Close workspace navigation menu"
                  : "Open workspace navigation menu"
              }
              aria-expanded={mobileMenuOpen}
              aria-controls="workspace-mobile-drawer"
              className="btn-glass-compact md:hidden inline-flex items-center justify-center min-h-[44px] min-w-[44px] cursor-pointer"
            >
              {mobileMenuOpen ? (
                <X aria-hidden="true" className="w-5 h-5 text-[#0B2B26]" />
              ) : (
                <Menu aria-hidden="true" className="w-5 h-5 text-[#0B2B26]" />
              )}
            </button>
          </div>
        </header>
      </div>

      {/* Clean Light Theme Mobile Drawer (no nested backdrop-blur) */}
      {mobileMenuOpen && (
        <nav
          id="workspace-mobile-drawer"
          aria-label="Mobile Workspace Navigation"
          className="md:hidden border-t border-[#0B2B26]/10 bg-white/96"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col gap-1.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname?.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isActive ? "page" : undefined}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`min-h-[44px] inline-flex items-center justify-between px-4 rounded-[12px] text-[12px] font-medium uppercase tracking-[0.12em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] focus-visible:ring-offset-2 ${
                    isActive
                      ? "bg-[#f4fbf8] text-[#0B2B26] border border-[#0B2B26]/10"
                      : "text-[#2E524C] hover:bg-[#f8fdfb] hover:text-[#0B2B26]"
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="w-2 h-2 rounded-full bg-[#47C4A5]"
                    />
                  )}
                </Link>
              );
            })}

            <div className="pt-3 mt-1.5 border-t border-[#0B2B26]/10 flex flex-col gap-2">
              <div className="sm:hidden">
                {backHref ? (
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="btn-glass-secondary w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-[12px] uppercase tracking-[0.08em] cursor-pointer"
                  >
                    <ArrowLeft
                      aria-hidden="true"
                      className="w-4 h-4 text-[#0E807E]"
                    />
                    <span>{backLabel || "Back to Home"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePrimaryAction}
                    className="btn-glass-primary w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-6 text-[12px] uppercase tracking-[0.08em] cursor-pointer"
                  >
                    <span>New Formulation</span>
                    <ArrowRight
                      aria-hidden="true"
                      className="w-4 h-4 text-[#0E807E]"
                    />
                  </button>
                )}
              </div>

              {activeUser && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="btn-glass-compact w-full inline-flex items-center justify-center gap-2 min-h-[44px] px-5 text-[12px] font-medium uppercase tracking-[0.08em] text-[#2E524C] hover:text-[#0B2B26] cursor-pointer"
                >
                  <LogOut aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
                  <span>Logout ({activeUser.email})</span>
                </button>
              )}
            </div>
          </div>
        </nav>
      )}
    </div>
  );
}
