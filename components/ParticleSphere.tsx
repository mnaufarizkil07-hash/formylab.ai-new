"use client";

import React, { useEffect, useRef } from "react";

const WEBGL_PARTICLE_COUNT = 24000;
const FALLBACK_2D_PARTICLE_COUNT = 2800;
const FLOATS_PER_VERTEX = 10; // a_position (3) + a_scatterDir (3) + a_seed (1) + a_random (3)

const VERTEX_SHADER_SOURCE = `
precision highp float;

attribute vec3 a_position;
attribute vec3 a_scatterDir;
attribute float a_seed;
attribute vec3 a_random;

uniform float u_time;
uniform float u_aspect;
uniform float u_scroll;
uniform float u_dpr;

varying float v_depth;
varying float v_rim;
varying float v_wave;
varying float v_seed;
varying float v_tonePick;
varying float v_alpha;
varying float v_diag;
varying vec2 v_screenPos;

mat3 rotateY(float a) {
  float c = cos(a);
  float s = sin(a);
  return mat3(
    c, 0.0, s,
    0.0, 1.0, 0.0,
    -s, 0.0, c
  );
}

void main() {
  // 1. Slow upright Y-axis rotation (zero tilt, strictly symmetrical 360° sphere)
  float rotYAngle = u_time * 0.085;
  mat3 rotMat = rotateY(rotYAngle);
  vec3 rotated = rotMat * a_position;
  vec3 normalRot = normalize(rotated);

  // 2. Ambient Per-Particle Organic Traveling Wave (sin/cos 3D waves + unique phase along normal)
  float phase = a_random.y * 6.2831853;
  float waveA = sin(rotated.x * 4.2 + rotated.y * 3.1 - u_time * 1.45 + phase * 0.25);
  float waveB = cos(rotated.y * 5.0 - rotated.z * 3.6 + u_time * 1.15 + phase * 0.35);
  float waveC = sin((rotated.x - rotated.z) * 3.4 + rotated.y * 2.4 + u_time * 0.95);
  float microPulse = sin(u_time * 2.1 + phase) * 0.22;

  float ambientWave = (waveA * 0.45 + waveB * 0.35 + waveC * 0.28 + microPulse) * 0.048;
  vec3 wavePos = rotated + normalRot * ambientWave;

  // 3. Full-Width Spherical Scroll-Driven Scatter & Reassembly (layered cleanly on top of organic wave)
  float scrollClamped = clamp(u_scroll, 0.0, 1.0);
  float scrollSq = scrollClamped * scrollClamped;
  float spreadAmount = 2.75;
  float particleSpread = spreadAmount * (0.68 + a_seed * 0.72);
  vec3 scatterVec = rotMat * a_scatterDir;
  vec3 finalPos = wavePos + scatterVec * (scrollSq * particleSpread);

  // 4. True 1:1 Perspective Projection centered at (0.0, 0.0) filling Hero cleanly
  float safeAspect = max(u_aspect, 0.1);
  float radiusNDCY = min(0.88, 0.92 * safeAspect);

  // Limb radius for unit sphere at cameraZ = 3.20 is 1 / sqrt(3.2^2 - 1) = 0.32898
  float cameraZ = 3.20;
  float viewZ = max(cameraZ - finalPos.z, 0.85);
  float fovScale = radiusNDCY / 0.32898;

  float projX = ((finalPos.x * fovScale) / viewZ) / safeAspect;
  float projY = (finalPos.y * fovScale) / viewZ;
  float projZ = clamp((viewZ - 1.2) / 4.2, 0.0, 1.0) * 2.0 - 1.0;

  gl_Position = vec4(projX, projY, projZ, 1.0);

  // Pass normalized device screen coordinates to Fragment Shader for randomized bottom-edge dissolve
  v_screenPos = gl_Position.xy / gl_Position.w;

  // 5. Shading factors: depth, crisp spherical rim, soft center readability dimming (0.20-0.32 behind Hero text)
  float depthNorm = clamp((wavePos.z + 1.08) / 2.16, 0.0, 1.0);
  float rim = pow(max(0.0, 1.0 - abs(normalRot.z)), 1.55);

  float baseViewZ = cameraZ - wavePos.z;
  float baseProjX = ((wavePos.x * fovScale) / baseViewZ) / safeAspect;
  float baseProjY = (wavePos.y * fovScale) / baseViewZ;
  float screenRadial = length(vec2(baseProjX * safeAspect, baseProjY)) / max(radiusNDCY, 0.01);
  float centerReadability = mix(0.24, 1.0, smoothstep(0.18, 0.72, screenRadial));

  // Crisp dynamic point size for vivid visibility over clean light green base
  float sizeBase = mix(1.85, 3.65, a_random.x);
  float depthScale = clamp(3.15 / max(viewZ, 1.25), 0.80, 1.28);
  float waveSizeBoost = 1.0 + clamp(ambientWave * 4.8, -0.14, 0.26);
  float scatterSizeScale = mix(1.0, 0.58, scrollSq);
  gl_PointSize = clamp(sizeBase * depthScale * waveSizeBoost * scatterSizeScale * u_dpr, 1.35 * u_dpr, 5.0 * u_dpr);

  float backDim = mix(0.56, 0.98, depthNorm);
  float rimBoost = mix(0.92, 1.24, rim);
  float baseAlpha = backDim * rimBoost * centerReadability;

  v_depth = depthNorm;
  v_rim = rim;
  v_wave = clamp(ambientWave * 11.0 + 0.5, 0.0, 1.0);
  v_seed = a_seed;
  v_tonePick = a_random.z;
  v_diag = clamp(0.5 + (rotated.x - rotated.y) * 0.48, 0.0, 1.0);
  v_alpha = clamp(baseAlpha, 0.20, 0.96);
}
`;

const FRAGMENT_SHADER_SOURCE = `
precision highp float;

uniform float u_scroll;

varying float v_depth;
varying float v_rim;
varying float v_wave;
varying float v_seed;
varying float v_tonePick;
varying float v_alpha;
varying float v_diag;
varying vec2 v_screenPos;

void main() {
  vec2 coord = gl_PointCoord - vec2(0.5, 0.5);
  float dist = length(coord);
  if (dist > 0.5) {
    discard;
  }

  // 1. Organic staggered scroll fade-out using per-particle v_seed (smoothly hits 0.0 at u_scroll = 1.0)
  float scrollClamped = clamp(u_scroll, 0.0, 1.0);
  float fadeStart = 0.06 + v_seed * 0.34;
  float fadeEnd = min(1.0, fadeStart + 0.56);
  float scrollFade = (1.0 - smoothstep(fadeStart, fadeEnd, scrollClamped)) *
                     (1.0 - smoothstep(0.94, 1.0, scrollClamped));

  // 2. Per-particle randomized bottom-edge dissolve ONLY (left, right & top remain 100% open)
  float bottomFadeStart = mix(-0.88, -0.35 - v_seed * 0.50, scrollClamped);
  float bottomFade = smoothstep(-0.98, bottomFadeStart, v_screenPos.y);

  float combinedFade = scrollFade * bottomFade;
  if (combinedFade <= 0.005) {
    discard;
  }

  // Crisp circular radial particle with defined micro-core so every dot reads sharply on light green
  float halo = smoothstep(0.5, 0.06, dist);
  float core = exp(-dist * dist * 14.0);
  float shape = mix(halo * 0.72, 1.0, core);

  // Rich Saturated 6-Color Palette Spatial Gradient (zero pale/white washout on #eaf9f2 base):
  // Upper-left & front contours -> Deep Aqua-Teal (#0C8786) & Rich Aqua (#22B0AE / #3FC6C5)
  // Mid-zone & wave crests      -> Rich Mint Teal (#2CA688 / #47C4A5) + Leaf Green (#56B462 / #82CB82)
  // Lower-right bright accents  -> Fresh Lime (#7CC44C / #ADE180) + subtle Soft Green (#89D78C)
  vec3 deepAquaTeal = vec3(0.047, 0.529, 0.525); // #0C8786
  vec3 richAqua     = vec3(0.133, 0.690, 0.682); // #22B0AE
  vec3 aquaBase     = vec3(0.247, 0.776, 0.773); // #3FC6C5
  vec3 richMint     = vec3(0.173, 0.651, 0.533); // #2CA688
  vec3 leafGreen    = vec3(0.337, 0.706, 0.384); // #56B462
  vec3 freshLime    = vec3(0.486, 0.769, 0.298); // #7CC44C
  vec3 softLime     = vec3(0.678, 0.882, 0.502); // #ADE180

  float gradT = clamp(v_diag + (v_wave - 0.5) * 0.16, 0.0, 1.0);

  vec3 band1 = mix(deepAquaTeal, richAqua, smoothstep(0.0, 0.30, gradT));
  vec3 band2 = mix(band1, richMint, smoothstep(0.25, 0.54, gradT));
  vec3 band3 = mix(band2, leafGreen, smoothstep(0.48, 0.78, gradT));
  vec3 color = mix(band3, freshLime, smoothstep(0.72, 1.0, gradT));

  // Crisp saturated rim & wave-crest accents (keeping contrast rich without washing into white)
  float accentPick = step(0.78, v_tonePick);
  vec3 waveAccent = mix(aquaBase, softLime, smoothstep(0.35, 0.90, gradT));
  color = mix(color, waveAccent, accentPick * 0.38 * smoothstep(0.25, 0.90, v_wave));

  // Anchor front silhouette contour with Deep Aqua-Teal for unmistakable 3D volume on light green
  float contourAnchor = smoothstep(0.42, 0.95, v_rim) * (1.0 - gradT * 0.45);
  color = mix(color, deepAquaTeal, contourAnchor * 0.42);

  // Subtle depth shading so front shell pops cleanly over back hemisphere
  color = mix(color * 0.92, color, v_depth);

  float finalAlpha = shape * v_alpha * combinedFade;
  if (finalAlpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(color, finalAlpha);
}
`;

function compileWebGLShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
  label: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) {
    console.error(`[ParticleSphere] Failed to allocate ${label} shader.`);
    return null;
  }
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      `[ParticleSphere] ${label} shader compile error:`,
      gl.getShaderInfoLog(shader)
    );
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function createWebGLProgram(
  gl: WebGLRenderingContext,
  vsSource: string,
  fsSource: string
): WebGLProgram | null {
  const vertexShader = compileWebGLShader(gl, gl.VERTEX_SHADER, vsSource, "Vertex");
  const fragmentShader = compileWebGLShader(gl, gl.FRAGMENT_SHADER, fsSource, "Fragment");
  if (!vertexShader || !fragmentShader) {
    if (vertexShader) gl.deleteShader(vertexShader);
    if (fragmentShader) gl.deleteShader(fragmentShader);
    return null;
  }

  const program = gl.createProgram();
  if (!program) {
    gl.deleteShader(vertexShader);
    gl.deleteShader(fragmentShader);
    return null;
  }

  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error(
      "[ParticleSphere] Program link error:",
      gl.getProgramInfoLog(program)
    );
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildFibonacciSphereData(count: number): Float32Array {
  const data = new Float32Array(count * FLOATS_PER_VERTEX);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  const rand = mulberry32(202607);

  for (let i = 0; i < count; i++) {
    // Full 360° symmetrical Fibonacci sphere (y from +1.0 down to -1.0) with organic micro-jitter
    const t = (i + 0.5) / count;
    const yBase = 1.0 - 2.0 * t;
    const rBase = Math.sqrt(Math.max(0, 1.0 - yBase * yBase));
    const theta = goldenAngle * i + (rand() - 0.5) * 0.14;

    const jitter = 0.016;
    let x = Math.cos(theta) * rBase + (rand() - 0.5) * jitter;
    let y = yBase + (rand() - 0.5) * jitter;
    let z = Math.sin(theta) * rBase + (rand() - 0.5) * jitter;

    const len = Math.sqrt(x * x + y * y + z * z) || 1.0;
    const nx = x / len;
    const ny = y / len;
    const nz = z / len;

    // Crisp spherical surface shell with subtle thickness
    const shell = 0.985 + rand() * 0.03;
    x = nx * shell;
    y = ny * shell;
    z = nz * shell;

    // Pure spherical-coordinate scatter vector (uniform S^2 perturbation blended with outward normal — zero cubic bias)
    const scatterPhi = rand() * Math.PI * 2;
    const scatterCosTheta = 2.0 * rand() - 1.0;
    const scatterSinTheta = Math.sqrt(Math.max(0, 1.0 - scatterCosTheta * scatterCosTheta));
    const randSphereX = scatterSinTheta * Math.cos(scatterPhi);
    const randSphereY = scatterCosTheta;
    const randSphereZ = scatterSinTheta * Math.sin(scatterPhi);

    let sx = nx * 0.78 + randSphereX * 0.42;
    let sy = ny * 0.78 + randSphereY * 0.42;
    let sz = nz * 0.78 + randSphereZ * 0.42;
    const sLen = Math.sqrt(sx * sx + sy * sy + sz * sz) || 1.0;
    // Per-particle radial speed in [0.4, 1.3]
    const speedVar = 0.4 + Math.pow(rand(), 1.15) * 0.9;
    sx = (sx / sLen) * speedVar;
    sy = (sy / sLen) * speedVar;
    sz = (sz / sLen) * speedVar;

    const offset = i * FLOATS_PER_VERTEX;
    // a_position (0..2)
    data[offset] = x;
    data[offset + 1] = y;
    data[offset + 2] = z;
    // a_scatterDir (3..5)
    data[offset + 3] = sx;
    data[offset + 4] = sy;
    data[offset + 5] = sz;
    // a_seed (6)
    data[offset + 6] = rand();
    // a_random (7..9): size variation, unique wave phase, shimmer seed
    data[offset + 7] = rand();
    data[offset + 8] = rand();
    data[offset + 9] = rand();
  }

  return data;
}

export default function ParticleSphere() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const glowRef = useRef<HTMLDivElement | null>(null);
  const webglCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fallback2DCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Strictly ref-based scroll tracking: ZERO useState / ZERO React re-renders
  const targetScrollRef = useRef(0);
  const currentScrollRef = useRef(0);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const container = containerRef.current;
    const webglCanvas = webglCanvasRef.current;
    const fallbackCanvas = fallback2DCanvasRef.current;
    if (!container || !webglCanvas || !fallbackCanvas) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    let rafId = 0;
    let isRunning = false;
    let lastTimestamp = performance.now();
    let elapsedSeconds = 0;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    // Standard WebGL1 initialization (clean premultiplied alpha compositing over Aqua–Lemon Lime gradient)
    const gl = webglCanvas.getContext("webgl", {
      alpha: true,
      antialias: true,
      depth: false,
      stencil: false,
      premultipliedAlpha: true,
    });

    const program = gl
      ? createWebGLProgram(gl, VERTEX_SHADER_SOURCE, FRAGMENT_SHADER_SOURCE)
      : null;

    let vbo: WebGLBuffer | null = null;
    let useWebGL = false;

    let posLoc = -1;
    let scatterLoc = -1;
    let seedLoc = -1;
    let randLoc = -1;
    let uTimeLoc: WebGLUniformLocation | null = null;
    let uAspectLoc: WebGLUniformLocation | null = null;
    let uScrollLoc: WebGLUniformLocation | null = null;
    let uDprLoc: WebGLUniformLocation | null = null;

    if (gl && program) {
      vbo = gl.createBuffer();
      if (vbo) {
        const sphereData = buildFibonacciSphereData(WEBGL_PARTICLE_COUNT);
        gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
        gl.bufferData(gl.ARRAY_BUFFER, sphereData, gl.STATIC_DRAW);

        posLoc = gl.getAttribLocation(program, "a_position");
        scatterLoc = gl.getAttribLocation(program, "a_scatterDir");
        seedLoc = gl.getAttribLocation(program, "a_seed");
        randLoc = gl.getAttribLocation(program, "a_random");
        uTimeLoc = gl.getUniformLocation(program, "u_time");
        uAspectLoc = gl.getUniformLocation(program, "u_aspect");
        uScrollLoc = gl.getUniformLocation(program, "u_scroll");
        uDprLoc = gl.getUniformLocation(program, "u_dpr");

        gl.useProgram(program);
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(
          gl.SRC_ALPHA,
          gl.ONE_MINUS_SRC_ALPHA,
          gl.ONE,
          gl.ONE_MINUS_SRC_ALPHA
        );
        gl.clearColor(0.0, 0.0, 0.0, 0.0);

        webglCanvas.style.display = "block";
        fallbackCanvas.style.display = "none";
        useWebGL = true;
      }
    }

    // Automatic 2D Canvas fallback (pure ref-driven, zero useState)
    let ctx2d: CanvasRenderingContext2D | null = null;
    let fallbackPoints: Float32Array | null = null;

    if (!useWebGL) {
      webglCanvas.style.display = "none";
      fallbackCanvas.style.display = "block";
      ctx2d = fallbackCanvas.getContext("2d", { alpha: true });
      fallbackPoints = buildFibonacciSphereData(FALLBACK_2D_PARTICLE_COUNT);
    }

    const activeCanvas = useWebGL ? webglCanvas : fallbackCanvas;

    const computeScrollProgress = (): number => {
      if (window.scrollY <= 1) return 0;
      const rect = activeCanvas.getBoundingClientRect();
      if (rect.height <= 0) return 0;
      return Math.min(Math.max(-rect.top / (rect.height * 0.65), 0), 1);
    };

    const resizeCanvas = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const rect = container.getBoundingClientRect();
      const cssW = Math.max(1, rect.width || window.innerWidth);
      const cssH = Math.max(1, rect.height || window.innerHeight);
      const targetW = Math.max(1, Math.floor(cssW * dpr));
      const targetH = Math.max(1, Math.floor(cssH * dpr));

      if (activeCanvas.width !== targetW || activeCanvas.height !== targetH) {
        activeCanvas.width = targetW;
        activeCanvas.height = targetH;
      }

      if (useWebGL && gl && program) {
        gl.viewport(0, 0, targetW, targetH);
        if (uAspectLoc) {
          gl.useProgram(program);
          gl.uniform1f(uAspectLoc, targetW / Math.max(targetH, 1));
        }
      }
    };

    resizeCanvas();
    const initialScroll = computeScrollProgress();
    targetScrollRef.current = initialScroll;
    currentScrollRef.current = initialScroll;

    const updateAmbientGlow = (scrollVal: number) => {
      if (glowRef.current) {
        const glowOpacity = Math.max(0, 1 - scrollVal * 1.35);
        glowRef.current.style.opacity = glowOpacity.toFixed(3);
      }
    };

    const renderWebGLFrame = (timeSec: number, scrollVal: number) => {
      if (!gl || !program || !vbo) return;
      const stride = FLOATS_PER_VERTEX * Float32Array.BYTES_PER_ELEMENT;

      gl.viewport(0, 0, webglCanvas.width, webglCanvas.height);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.useProgram(program);

      gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
      if (posLoc >= 0) {
        gl.enableVertexAttribArray(posLoc);
        gl.vertexAttribPointer(posLoc, 3, gl.FLOAT, false, stride, 0);
      }
      if (scatterLoc >= 0) {
        gl.enableVertexAttribArray(scatterLoc);
        gl.vertexAttribPointer(
          scatterLoc,
          3,
          gl.FLOAT,
          false,
          stride,
          3 * Float32Array.BYTES_PER_ELEMENT
        );
      }
      if (seedLoc >= 0) {
        gl.enableVertexAttribArray(seedLoc);
        gl.vertexAttribPointer(
          seedLoc,
          1,
          gl.FLOAT,
          false,
          stride,
          6 * Float32Array.BYTES_PER_ELEMENT
        );
      }
      if (randLoc >= 0) {
        gl.enableVertexAttribArray(randLoc);
        gl.vertexAttribPointer(
          randLoc,
          3,
          gl.FLOAT,
          false,
          stride,
          7 * Float32Array.BYTES_PER_ELEMENT
        );
      }

      if (uTimeLoc) gl.uniform1f(uTimeLoc, timeSec);
      if (uAspectLoc) {
        gl.uniform1f(
          uAspectLoc,
          webglCanvas.width / Math.max(webglCanvas.height, 1)
        );
      }
      if (uScrollLoc) gl.uniform1f(uScrollLoc, scrollVal);
      if (uDprLoc) gl.uniform1f(uDprLoc, dpr);

      gl.drawArrays(gl.POINTS, 0, WEBGL_PARTICLE_COUNT);
    };

    const renderFallback2DFrame = (timeSec: number, scrollVal: number) => {
      if (!ctx2d || !fallbackPoints) return;
      const w = fallbackCanvas.width;
      const h = fallbackCanvas.height;
      ctx2d.clearRect(0, 0, w, h);

      const scrollClamped = Math.min(Math.max(scrollVal, 0), 1);
      if (scrollClamped >= 0.995) return;

      const smoothstep = (e0: number, e1: number, x: number): number => {
        const t = Math.min(Math.max((x - e0) / Math.max(e1 - e0, 0.0001), 0), 1);
        return t * t * (3 - 2 * t);
      };

      const cx = w * 0.5;
      const cy = h * 0.5;
      const radius = Math.min(h * 0.44, w * 0.46);
      const scrollSq = scrollClamped * scrollClamped;

      const rotY = timeSec * 0.085;
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);

      for (let i = 0; i < FALLBACK_2D_PARTICLE_COUNT; i++) {
        const o = i * FLOATS_PER_VERTEX;
        const px = fallbackPoints[o];
        const py = fallbackPoints[o + 1];
        const pz = fallbackPoints[o + 2];
        const sdx = fallbackPoints[o + 3];
        const sdy = fallbackPoints[o + 4];
        const sdz = fallbackPoints[o + 5];
        const seed = fallbackPoints[o + 6];
        const rSize = fallbackPoints[o + 7];
        const phase = fallbackPoints[o + 8] * Math.PI * 2;

        const fadeStart = 0.06 + seed * 0.34;
        const fadeEnd = Math.min(1.0, fadeStart + 0.56);
        const scrollFade =
          (1 - smoothstep(fadeStart, fadeEnd, scrollClamped)) *
          (1 - smoothstep(0.94, 1.0, scrollClamped));
        if (scrollFade <= 0.01) continue;

        const rx = px * cosY + pz * sinY;
        const ry = py;
        const rz = -px * sinY + pz * cosY;

        const rsx = sdx * cosY + sdz * sinY;
        const rsy = sdy;
        const rsz = -sdx * sinY + sdz * cosY;

        // Ambient per-particle traveling wave
        const wA = Math.sin(rx * 4.2 + ry * 3.1 - timeSec * 1.45 + phase * 0.25);
        const wB = Math.cos(ry * 5.0 - rz * 3.6 + timeSec * 1.15 + phase * 0.35);
        const ambientWave = (wA * 0.5 + wB * 0.38) * 0.048;

        const spread = scrollSq * 2.75 * (0.68 + seed * 0.72);
        const fx = rx * (1 + ambientWave) + rsx * spread;
        const fy = ry * (1 + ambientWave) + rsy * spread;
        const fz = rz * (1 + ambientWave) + rsz * spread;

        const viewZ = Math.max(3.2 - fz, 0.85);
        const scale = 3.04 / viewZ;
        const sx = cx + fx * radius * scale;
        const sy = cy - fy * radius * scale;

        // Per-particle randomized bottom-edge dissolve ONLY (left, right & top remain 100% open)
        const ndcY = 1 - (sy / Math.max(h, 1)) * 2;
        const bottomFadeStart = -0.88 + (-0.35 - seed * 0.50 - -0.88) * scrollClamped;
        const bottomFade = smoothstep(-0.98, bottomFadeStart, ndcY);

        const combinedFade = scrollFade * bottomFade;
        if (combinedFade <= 0.008) continue;

        const depthNorm = Math.max(0, Math.min(1, (rz + 1.08) / 2.16));
        const rim = Math.pow(Math.max(0, 1 - Math.abs(rz)), 1.55);

        const baseScale = 3.04 / Math.max(3.2 - rz, 1.2);
        const radialNorm = Math.hypot(rx * radius * baseScale, ry * radius * baseScale) / Math.max(radius, 1);
        const centerRead = 0.24 + 0.76 * Math.max(0, Math.min(1, (radialNorm - 0.18) / 0.54));
        const diag = Math.max(0, Math.min(1, 0.5 + (rx - ry) * 0.48));

        if (diag < 0.22 || (rim > 0.65 && diag < 0.55)) {
          ctx2d.fillStyle = "#0C8786";
        } else if (diag < 0.44) {
          ctx2d.fillStyle = "#22B0AE";
        } else if (diag < 0.64) {
          ctx2d.fillStyle = "#2CA688";
        } else if (diag < 0.84) {
          ctx2d.fillStyle = "#56B462";
        } else {
          ctx2d.fillStyle = "#7CC44C";
        }

        const alpha = (0.54 + 0.44 * depthNorm) * centerRead * combinedFade;
        const dotR = (1.15 + rSize * 1.35) * (1 - scrollSq * 0.42) * dpr;

        ctx2d.globalAlpha = Math.max(0, Math.min(0.96, alpha));
        ctx2d.beginPath();
        ctx2d.arc(sx, sy, dotR, 0, Math.PI * 2);
        ctx2d.fill();
      }
      ctx2d.globalAlpha = 1;
    };

    const renderFrame = (timeSec: number, scrollVal: number) => {
      updateAmbientGlow(scrollVal);
      if (useWebGL) {
        renderWebGLFrame(timeSec, scrollVal);
      } else {
        renderFallback2DFrame(timeSec, scrollVal);
      }
    };

    const isScrollSettled = () =>
      Math.abs(targetScrollRef.current - currentScrollRef.current) < 0.0008;

    const tick = (now: number) => {
      if (document.hidden) {
        isRunning = false;
        rafId = 0;
        return;
      }

      const dt = Math.min(0.05, Math.max(0, (now - lastTimestamp) * 0.001));
      lastTimestamp = now;
      elapsedSeconds += dt;

      // Smooth lerp toward targetScroll (~0.08 per 60fps frame, frame-rate normalized)
      const lerpFactor = 1 - Math.pow(1 - 0.08, Math.min(dt * 60, 2.5));
      currentScrollRef.current +=
        (targetScrollRef.current - currentScrollRef.current) * lerpFactor;

      if (isScrollSettled()) {
        currentScrollRef.current = targetScrollRef.current;
      }

      renderFrame(elapsedSeconds, currentScrollRef.current);

      // Keep running until both Hero is offscreen AND currentScroll has fully converged
      if (!isVisibleRef.current && isScrollSettled()) {
        isRunning = false;
        rafId = 0;
        return;
      }

      rafId = requestAnimationFrame(tick);
    };

    const startLoop = () => {
      if (prefersReducedMotion) {
        currentScrollRef.current = targetScrollRef.current;
        renderFrame(1.2, currentScrollRef.current);
        return;
      }
      if (isRunning || document.hidden) return;
      if (!isVisibleRef.current && isScrollSettled()) return;
      isRunning = true;
      lastTimestamp = performance.now();
      rafId = requestAnimationFrame(tick);
    };

    const stopLoop = () => {
      isRunning = false;
      if (rafId !== 0) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };

    const handleScroll = () => {
      targetScrollRef.current = computeScrollProgress();
      if (prefersReducedMotion) {
        currentScrollRef.current = targetScrollRef.current;
        renderFrame(1.2, currentScrollRef.current);
        return;
      }
      // Wake loop if needed so scatter/reassembly finishes cleanly back to 0.0
      if (!isRunning && !document.hidden && (isVisibleRef.current || !isScrollSettled())) {
        startLoop();
      }
    };

    const handleResize = () => {
      resizeCanvas();
      targetScrollRef.current = computeScrollProgress();
      renderFrame(elapsedSeconds, currentScrollRef.current);
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopLoop();
      } else if (isVisibleRef.current || !isScrollSettled()) {
        startLoop();
      }
    };

    // Pause animation loop ONLY after Hero leaves viewport AND scroll lerp has finished converging
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        isVisibleRef.current = entry.isIntersecting;
        targetScrollRef.current = computeScrollProgress();
        if (entry.isIntersecting) {
          startLoop();
        }
        // When leaving viewport, tick() automatically stops once currentScroll converges
      },
      { threshold: 0 }
    );
    intersectionObserver.observe(container);

    // Keep canvas locked to Hero dimensions on font/layout shifts
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            resizeCanvas();
            targetScrollRef.current = computeScrollProgress();
            renderFrame(elapsedSeconds, currentScrollRef.current);
          })
        : null;
    if (resizeObserver) {
      resizeObserver.observe(container);
    }

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange, {
      passive: true,
    });

    renderFrame(0, currentScrollRef.current);
    startLoop();

    // IMPORTANT: Never call WEBGL_lose_context in cleanup so React StrictMode double-mount keeps context alive
    return () => {
      stopLoop();
      intersectionObserver.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      if (useWebGL && gl) {
        if (vbo) gl.deleteBuffer(vbo);
        if (program) gl.deleteProgram(program);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full z-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {/* Standard WebGL1 GPU-Accelerated 360° Ambient-Wave & Scroll-Scatter Particle Canvas */}
      <canvas
        ref={webglCanvasRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none will-change-transform"
        style={{ transform: "translateZ(0)" }}
      />

      {/* Automatic 2D Canvas Fallback (activated only if WebGL1 is unavailable) */}
      <canvas
        ref={fallback2DCanvasRef}
        className="absolute inset-0 w-full h-full z-0 pointer-events-none will-change-transform"
        style={{ display: "none", transform: "translateZ(0)" }}
      />

      {/* Compact Radial Readability Veil strictly behind center Hero text (leaves surrounding Mint Teal & Soft Green light open) */}
      <div
        ref={glowRef}
        className="absolute inset-0 z-[1] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 40% 38% at 50% 52%, rgba(242, 253, 248, 0.56) 0%, rgba(242, 253, 248, 0.18) 55%, rgba(242, 253, 248, 0) 100%)",
        }}
      />
    </div>
  );
}
