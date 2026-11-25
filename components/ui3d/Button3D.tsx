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
 * Optical Glass Action Button (Clear iOS + Blur One UI, Zero Outer Shadow):
 * - Primary / Navy: .btn-glass-primary (Aqua / Mint Teal / Soft Green refractive tint)
 * - Secondary: .btn-glass-secondary (Clear frosted crystal)
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
      ? "px-5 py-2 text-[12px]"
      : size === "lg"
      ? "px-7 py-3.5 text-[13px]"
      : "px-6 py-2.5 text-[12.5px]";

  const variantClasses = isDisabled
    ? "btn-glass-secondary opacity-50 cursor-not-allowed"
    : variant === "secondary"
    ? "btn-glass-secondary cursor-pointer"
    : "btn-glass-primary cursor-pointer";

  return (
    <button
      {...rest}
      type={type}
      disabled={isDisabled}
      onClick={onClick}
      className={`inline-flex items-center justify-center gap-2 rounded-full font-medium uppercase tracking-[0.06em] whitespace-nowrap ${sizeClasses} ${variantClasses} ${className}`}
    >
      {children}
    </button>
  );
}
