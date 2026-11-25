"use client";

import React, { useEffect, useMemo, useRef } from "react";

export type ScrollColorTheme = "dark" | "light" | "aqua";

interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a: number;
}

// Over clean light green base (--gradient-clean-base):
// rgba(14, 122, 120, 0.36) -> Aqua-Mint crest #1FA8A6 -> Deep Forest Ink #0B2B26
const AQUA_START: RgbaColor = { r: 14, g: 122, b: 120, a: 0.36 };
const AQUA_MID: RgbaColor = { r: 31, g: 168, b: 166, a: 1 };
const AQUA_END: RgbaColor = { r: 11, g: 43, b: 38, a: 1 };

// Over clean white / light clinical sections:
// rgba(14, 122, 120, 0.36) -> Aqua #3FC6C5 crest -> Deep Forest Ink #0B2B26
const LIGHT_START: RgbaColor = { r: 14, g: 122, b: 120, a: 0.36 };
const LIGHT_MID: RgbaColor = { r: 63, g: 198, b: 197, a: 1 };
const LIGHT_END: RgbaColor = { r: 11, g: 43, b: 38, a: 1 };

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function formatRgba(c: RgbaColor): string {
  const r = Math.round(c.r);
  const g = Math.round(c.g);
  const b = Math.round(c.b);
  const a = Math.round(c.a * 1000) / 1000;
  return a >= 1 ? `rgb(${r}, ${g}, ${b})` : `rgba(${r}, ${g}, ${b}, ${a})`;
}

function computeViewportProgress(
  rectTop: number,
  rectHeight: number,
  viewportHeight: number,
  startRatio: number,
  endRatio: number
): number {
  if (viewportHeight <= 0) return 1;
  const startY = viewportHeight * startRatio;
  const endY = viewportHeight * endRatio - Math.min(rectHeight * 0.22, 84);
  const span = startY - endY;
  if (span <= 0) return rectTop <= startY ? 1 : 0;
  return clamp01((startY - rectTop) / span);
}

export function computeScrollTargetProgress(
  rectTop: number,
  rectBottom: number,
  rectHeight: number,
  viewportHeight: number,
  scrollY: number,
  scrollHeight: number,
  startRatio: number,
  endRatio: number
): number {
  const baseProgress = computeViewportProgress(
    rectTop,
    rectHeight,
    viewportHeight,
    startRatio,
    endRatio
  );

  if (viewportHeight <= 0) return 1;

  // Apply bottom-of-page compensation only once the element has entered the viewport
  const isInViewport = rectTop < viewportHeight && rectBottom > 0;
  if (!isInViewport) return baseProgress;

  const distFromBottom = scrollHeight - (scrollY + viewportHeight);
  if (distFromBottom < 220) {
    const rawBoost = clamp01((220 - distFromBottom) / 200);
    const smoothBoost = rawBoost * rawBoost * (3 - 2 * rawBoost);
    return clamp01(baseProgress + (1 - baseProgress) * smoothBoost);
  }

  return baseProgress;
}

function computeCharProgress(
  overallProgress: number,
  charIndex: number,
  totalChars: number
): number {
  const p = clamp01(overallProgress);
  if (p <= 0) return 0;
  if (p >= 1) return 1;
  if (totalChars <= 1) return p;

  // Fluid overlap window so neighboring characters ripple smoothly like a liquid wave
  const windowSize = Math.min(0.42, Math.max(0.24, 10 / totalChars));
  const charPos = charIndex / (totalChars - 1);
  const start = charPos * (1 - windowSize);
  return clamp01((p - start) / windowSize);
}

function interpolatePhase2Color(colorT: number, theme: ScrollColorTheme): string {
  const t = clamp01(colorT);
  const isAqua = theme === "aqua" || theme === "dark";
  const start = isAqua ? AQUA_START : LIGHT_START;
  const mid = isAqua ? AQUA_MID : LIGHT_MID;
  const end = isAqua ? AQUA_END : LIGHT_END;

  if (t <= 0.5) {
    const k = t * 2;
    return formatRgba({
      r: lerp(start.r, mid.r, k),
      g: lerp(start.g, mid.g, k),
      b: lerp(start.b, mid.b, k),
      a: lerp(start.a, mid.a, k),
    });
  }

  const k = (t - 0.5) * 2;
  return formatRgba({
    r: lerp(mid.r, end.r, k),
    g: lerp(mid.g, end.g, k),
    b: lerp(mid.b, end.b, k),
    a: lerp(mid.a, end.a, k),
  });
}

function getInitialColor(theme: ScrollColorTheme): string {
  const isAqua = theme === "aqua" || theme === "dark";
  return formatRgba(isAqua ? AQUA_START : LIGHT_START);
}

function getFinalColor(theme: ScrollColorTheme): string {
  const isAqua = theme === "aqua" || theme === "dark";
  return formatRgba(isAqua ? AQUA_END : LIGHT_END);
}

interface ScrollColorTextProps {
  text: string;
  theme?: ScrollColorTheme;
  as?: "h2" | "h3" | "p" | "div";
  className?: string;
  style?: React.CSSProperties;
  startRatio?: number;
  endRatio?: number;
}

interface IndexedChar {
  char: string;
  index: number;
}

interface IndexedWord {
  word: string;
  chars: IndexedChar[];
}

export default function ScrollColorText({
  text,
  theme = "dark",
  as: Tag = "h2",
  className = "",
  style,
  startRatio = 0.90,
  endRatio = 0.28,
}: ScrollColorTextProps) {
  const containerRef = useRef<HTMLElement | null>(null);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const targetProgressRef = useRef<number>(0);
  const currentProgressRef = useRef<number>(0);
  const rafIdRef = useRef<number | null>(null);

  const { indexedWords, totalChars } = useMemo(() => {
    const rawWords = text.trim().split(/\s+/).filter(Boolean);
    let cursor = 0;
    const words: IndexedWord[] = rawWords.map((word) => {
      const chars = Array.from(word).map((ch) => ({
        char: ch,
        index: cursor++,
      }));
      return { word, chars };
    });
    return { indexedWords: words, totalChars: cursor };
  }, [text]);

  const initialColor = useMemo(() => getInitialColor(theme), [theme]);

  useEffect(() => {
    charRefs.current.length = totalChars;

    const applyFrame = (progress: number) => {
      for (let i = 0; i < totalChars; i++) {
        const el = charRefs.current[i];
        if (!el) continue;

        const charProgress = computeCharProgress(progress, i, totalChars);

        // Phase 1: Character Wave Assembly (charProgress 0.0 -> 0.55)
        const assembleT = Math.min(charProgress / 0.55, 1);
        const ease = 1 - Math.pow(1 - assembleT, 3);
        const waveCrest = Math.sin(assembleT * Math.PI) * -5;
        const translateY = (1 - ease) * 18 + waveCrest;
        const opacity = 0.18 + ease * 0.82;

        el.style.transform = `translate3d(0, ${translateY.toFixed(2)}px, 0)`;
        el.style.opacity = opacity.toFixed(3);

        // Phase 2: Gradual Color Transition (charProgress 0.40 -> 1.0)
        const colorT = clamp01((charProgress - 0.40) / 0.60);
        el.style.color = interpolatePhase2Color(colorT, theme);
      }
    };

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion) {
      const finalColor = getFinalColor(theme);
      for (let i = 0; i < totalChars; i++) {
        const el = charRefs.current[i];
        if (!el) continue;
        el.style.transform = "translate3d(0, 0px, 0)";
        el.style.opacity = "1";
        el.style.color = finalColor;
      }
      return;
    }

    const measureTarget = (): number => {
      const el = containerRef.current;
      if (!el) return 0;
      const rect = el.getBoundingClientRect();
      return computeScrollTargetProgress(
        rect.top,
        rect.bottom,
        rect.height,
        window.innerHeight,
        window.scrollY,
        document.documentElement.scrollHeight,
        startRatio,
        endRatio
      );
    };

    const tick = () => {
      rafIdRef.current = null;
      const target = targetProgressRef.current;
      let current = currentProgressRef.current;

      current += (target - current) * 0.12;

      if (Math.abs(target - current) < 0.0005) {
        current = target;
        currentProgressRef.current = current;
        applyFrame(current);
        return; // Auto-sleep: 0% CPU when idle
      }

      currentProgressRef.current = current;
      applyFrame(current);
      rafIdRef.current = window.requestAnimationFrame(tick);
    };

    const handleScrollOrResize = () => {
      targetProgressRef.current = measureTarget();
      if (
        rafIdRef.current === null &&
        Math.abs(targetProgressRef.current - currentProgressRef.current) >= 0.0005
      ) {
        rafIdRef.current = window.requestAnimationFrame(tick);
      }
    };

    // Initial synchronous paint so elements already visible on load render at their exact state
    const initialProgress = measureTarget();
    targetProgressRef.current = initialProgress;
    currentProgressRef.current = initialProgress;
    applyFrame(initialProgress);

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
      if (rafIdRef.current !== null) {
        window.cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [totalChars, theme, startRatio, endRatio]);

  return (
    <Tag
      ref={containerRef as React.RefObject<never>}
      aria-label={text}
      className={className}
      style={style}
    >
      <span aria-hidden="true">
        {indexedWords.map((wordObj, wordIdx) => (
          <React.Fragment key={`${wordObj.word}-${wordIdx}`}>
            <span className="inline-block whitespace-nowrap">
              {wordObj.chars.map((charObj) => (
                <span
                  key={charObj.index}
                  ref={(el) => {
                    charRefs.current[charObj.index] = el;
                  }}
                  className="inline-block will-change-transform"
                  style={{
                    color: initialColor,
                    opacity: 0.18,
                    transform: "translate3d(0, 18.00px, 0)",
                  }}
                >
                  {charObj.char}
                </span>
              ))}
            </span>
            {wordIdx < indexedWords.length - 1 ? " " : null}
          </React.Fragment>
        ))}
      </span>
    </Tag>
  );
}
