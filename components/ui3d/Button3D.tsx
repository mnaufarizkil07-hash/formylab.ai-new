"use client";

import React from "react";

export type Button3DVariant = "primary" | "navy" | "secondary" | "disabled";

export interface Button3DProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Button3DVariant;
  size?: "sm" | "md" | "lg";
  children: React.ReactNode;
}

/**
 * Clean, smooth rounded button (restored to original sleek pill/rounded style
 * without boxy/stiff 3D bottom ledges, per user request).
 */
export default function Button3D({
  variant = "primary",
  size = "md",
  disabled,
  className = "",
  onClick,
  children,
  type = "button",
  ...rest
}: Button3DProps) {
  const isDisabled = Boolean(disabled || variant === "disabled");

  const sizeClasses =
    size === "sm"
      ? "px-4 py-2 text-xs sm:text-sm"
      : size === "lg"
      ? "px-7 py-3.5 text-sm"
      : "px-5 py-2.5 text-xs sm:text-sm";

  const variantClasses = isDisabled
    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
    : variant === "navy"
    ? "bg-[#12382f] hover:bg-[#0f766e] text-white shadow-sm hover:opacity-95 cursor-pointer"
    : variant === "secondary"
    ? "bg-slate-100 hover:bg-emerald-50 text-slate-800 border border-slate-200 cursor-pointer"
    : "bg-gradient-to-r from-[#14b8a6] to-[#0f766e] text-white shadow-md hover:opacity-95 cursor-pointer";

  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-bold transition whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}
