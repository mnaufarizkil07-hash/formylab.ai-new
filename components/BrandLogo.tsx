"use client";

import React, { useId } from "react";

interface BrandLogoProps {
  variant?: "dark" | "light";
  size?: "sm" | "md" | "lg";
  className?: string;
}

const SIZE_CONFIG = {
  sm: {
    icon: "w-9 h-9",
    text: "text-[23px]",
    gap: "gap-2.5",
  },
  md: {
    icon: "w-11 h-11",
    text: "text-[28px]",
    gap: "gap-2.5",
  },
  lg: {
    icon: "w-14 h-14",
    text: "text-[36px]",
    gap: "gap-3",
  },
} as const;

/**
 * Precision BrandLogo for formylab.ai:
 * - Sculpted open-base Erlenmeyer flask with organic liquid wave, 2 rising bubbles, and rounded "+" mark
 * - Vivid cyan -> mint -> lime gradient (#06b6d4 -> #2dd4bf -> #a3e635)
 * - ExtraBold (800) geometric wordmark with tight -0.045em tracking
 * - Subtle 60fps hover micro-interaction on bubbles and "+" symbol
 */
export default function BrandLogo({
  variant = "dark",
  size = "sm",
  className = "",
}: BrandLogoProps) {
  const uid = useId().replace(/:/g, "");
  const gradFlaskId = `formylab-flask-${uid}`;
  const gradLiquidId = `formylab-liquid-${uid}`;
  const gradAccentId = `formylab-accent-${uid}`;

  const dims = SIZE_CONFIG[size];
  const primaryTextColor =
    variant === "light" ? "text-[#0B2222]" : "text-[#ffffff]";
  const accentTextColor =
    variant === "light" ? "text-[#3FC6C5]" : "text-[#2dd4bf]";

  return (
    <div
      className={`inline-flex items-center ${dims.gap} group select-none ${className}`}
    >
      <svg
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={`${dims.icon} shrink-0 overflow-visible`}
        aria-hidden="true"
      >
        <defs>
          <linearGradient
            id={gradFlaskId}
            x1="14"
            y1="92"
            x2="86"
            y2="14"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="54%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>

          <linearGradient
            id={gradLiquidId}
            x1="28"
            y1="88"
            x2="68"
            y2="46"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="48%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>

          <linearGradient
            id={gradAccentId}
            x1="40"
            y1="44"
            x2="92"
            y2="8"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#2dd4bf" />
            <stop offset="100%" stopColor="#a3e635" />
          </linearGradient>
        </defs>

        {/* Left Sculpted Erlenmeyer Flask Wall */}
        <path
          d="M36 33.5C33.4 33.5 31.8 35.4 32.3 37.8C32.5 38.8 32.6 40 32.6 41.2V45.4C32.6 47.4 31.8 49.4 30.5 51L17.4 66.8C10.9 74.6 14.3 87.2 24.4 91.2L26.2 91.9C21.2 84.8 20.6 74.8 26.2 67.5L39.6 50.6C41.3 48.5 42.2 45.9 42.2 43.2V37.6C42.2 35.3 40.4 33.5 38.1 33.5H36Z"
          fill={`url(#${gradFlaskId})`}
        />

        {/* Right Sculpted Erlenmeyer Flask Wall & Base */}
        <path
          d="M55.5 33.5C53.2 33.5 51.4 35.3 51.4 37.6V43.2C51.4 45.9 52.3 48.5 54 50.6L66.8 66.8C71.4 72.6 69.7 80.9 62.9 83.6L57.8 85.7C53.6 87.4 50.4 90.2 48.5 93.4H62.8C76.2 93.4 84.6 79.4 77.4 67.8L63.1 50.8C61.8 49.2 61 47.2 61 45.1V41.2C61 40 61.1 38.8 61.3 37.8C61.8 35.4 60.2 33.5 57.6 33.5H55.5Z"
          fill={`url(#${gradFlaskId})`}
        />

        {/* Organic Liquid Wave Inside Bowl */}
        <path
          d="M35.8 61.2C32.8 61.1 30.3 63.4 28.6 66C24.2 72.7 25.1 82.8 31.3 88.2C36.6 92.8 44.3 91.6 47.4 85.2C49.7 80.5 53.7 77.6 58.6 75.7C63.6 73.8 66.2 69.8 64.9 64.5C64.2 61.6 64.8 58.2 67.8 54.4C64 57.1 60.7 57.6 56.6 57.9C51.4 58.3 47.9 60.7 45 63.2C42.2 65.6 39.2 61.3 35.8 61.2Z"
          fill={`url(#${gradLiquidId})`}
        />

        {/* Hover-Reactive Group: 2 Ascending Bubbles + Rounded "+" Mark */}
        <g className="transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:-translate-y-[1.5px]">
          {/* Lower-Left Bubble */}
          <circle cx="42.5" cy="25.5" r="5.3" fill={`url(#${gradAccentId})`} />
          {/* Upper-Right Bubble */}
          <circle cx="54.2" cy="14.5" r="6.4" fill={`url(#${gradAccentId})`} />

          {/* Bold Rounded "+" Mark */}
          <rect
            x="74.5"
            y="21.5"
            width="9.4"
            height="25"
            rx="3.6"
            fill={`url(#${gradAccentId})`}
          />
          <rect
            x="66.7"
            y="29.3"
            width="25"
            height="9.4"
            rx="3.6"
            fill={`url(#${gradAccentId})`}
          />
        </g>
      </svg>

      <span
        className={`${dims.text} leading-none tracking-[-0.045em] ${primaryTextColor}`}
        style={{
          fontFamily: "var(--font-logo), var(--font-matter)",
          fontWeight: 800,
        }}
      >
        formylab<span className={accentTextColor}>.ai</span>
      </span>
    </div>
  );
}
