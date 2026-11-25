"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { RotateCcw, Play, Pause, ZoomIn, ZoomOut, Atom, Layers } from "lucide-react";
import {
  ELEMENT_CPK_COLORS,
  getIngredientProfile,
  type EnrichedIngredientProfile,
} from "../lib/cosmeticChemistryData";

interface Molecule3DViewerProps {
  ingredientName: string;
  heightClass?: string;
  compact?: boolean;
}

export default function Molecule3DViewer({
  ingredientName,
  heightClass = "h-[340px]",
  compact = false,
}: Molecule3DViewerProps) {
  const profile: EnrichedIngredientProfile = getIngredientProfile(ingredientName);
  const molecule = profile.molecule3D;

  const canvasMountRef = useRef<HTMLDivElement | null>(null);
  const labelsOverlayRef = useRef<HTMLDivElement | null>(null);
  const profileRef = useRef<EnrichedIngredientProfile>(profile);

  const [autoRotate, setAutoRotate] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return true;
  });
  const [showLabels, setShowLabels] = useState(true);
  const [renderStyle, setRenderStyle] = useState<"ball-stick" | "space-fill">("ball-stick");

  const autoRotateRef = useRef(autoRotate);
  const renderStyleRef = useRef(renderStyle);

  const cameraDistanceRef = useRef(8.2);
  const rotationTargetRef = useRef({ x: 0.32, y: 0.65 });
  const currentRotationRef = useRef({ x: 0.32, y: 0.65 });
  const rebuildMoleculeRef = useRef<(() => void) | null>(null);
  const triggerRenderRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      autoRotateRef.current = false;
      queueMicrotask(() => {
        setAutoRotate(false);
      });
    }
  }, []);

  useEffect(() => {
    autoRotateRef.current = autoRotate;
  }, [autoRotate]);

  useEffect(() => {
    const mount = canvasMountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "high-performance",
      });
    } catch {
      return;
    }

    const gl = renderer.getContext();
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    const glRenderer = dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "";
    const isSoftwareGl = /SwiftShader|llvmpipe|Software|Basic Render Driver/i.test(glRenderer);

    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setClearColor(0xf4fbf8, 1);

    const width = mount.clientWidth || 480;
    const height = mount.clientHeight || 340;
    renderer.setSize(width, height);
    mount.innerHTML = "";
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xf4fbf8, 0.025);

    if (!isSoftwareGl) {
      const pmrem = new THREE.PMREMGenerator(renderer);
      scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
      pmrem.dispose();
    }

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0.6, cameraDistanceRef.current);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0xc8ece4, 1.15);
    scene.add(hemiLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(6, 8, 7);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x3fc6c5, 1.15);
    rimLight.position.set(-6, -4, -5);
    scene.add(rimLight);

    const pedestalGroup = new THREE.Group();
    pedestalGroup.position.y = -2.65;
    const ringGeo = new THREE.RingGeometry(2.2, 2.26, 48);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x3fc6c5,
      transparent: true,
      opacity: 0.36,
      side: THREE.DoubleSide,
    });
    pedestalGroup.add(new THREE.Mesh(ringGeo, ringMat));

    const innerRingGeo = new THREE.RingGeometry(1.15, 1.18, 36);
    innerRingGeo.rotateX(-Math.PI / 2);
    const innerRingMat = new THREE.MeshBasicMaterial({
      color: 0x47c4a5,
      transparent: true,
      opacity: 0.24,
      side: THREE.DoubleSide,
    });
    pedestalGroup.add(new THREE.Mesh(innerRingGeo, innerRingMat));
    scene.add(pedestalGroup);

    const moleculeGroup = new THREE.Group();
    scene.add(moleculeGroup);

    const sphereGeo = new THREE.SphereGeometry(1, isSoftwareGl ? 16 : 28, isSoftwareGl ? 14 : 24);
    const cylGeo = new THREE.CylinderGeometry(1, 1, 1, isSoftwareGl ? 10 : 16);

    const materialCache = new Map<string, THREE.MeshStandardMaterial>();
    const getAtomMaterial = (element: keyof typeof ELEMENT_CPK_COLORS) => {
      const key = `atom-${element}`;
      if (!materialCache.has(key)) {
        const spec = ELEMENT_CPK_COLORS[element] || ELEMENT_CPK_COLORS.C;
        materialCache.set(
          key,
          new THREE.MeshStandardMaterial({
            color: spec.number,
            roughness: element === "H" ? 0.25 : 0.18,
            metalness: element === "Na" || element === "Zn" || element === "Ti" ? 0.55 : 0.12,
          })
        );
      }
      return materialCache.get(key)!;
    };

    const bondMatSingle = new THREE.MeshStandardMaterial({
      color: 0x5c7c76,
      roughness: 0.35,
      metalness: 0.18,
    });
    const bondMatDouble = new THREE.MeshStandardMaterial({
      color: 0x0f8c88,
      roughness: 0.28,
      metalness: 0.25,
    });

    const buildMoleculeMeshes = () => {
      while (moleculeGroup.children.length > 0) {
        moleculeGroup.remove(moleculeGroup.children[0]);
      }

      const currentMol = profileRef.current.molecule3D;
      const style = renderStyleRef.current;
      const scaleMult = style === "space-fill" ? 1.85 : 1.0;

      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (const a of currentMol.atoms) {
        if (a.x < minX) minX = a.x;
        if (a.x > maxX) maxX = a.x;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
        if (a.z < minZ) minZ = a.z;
        if (a.z > maxZ) maxZ = a.z;
      }
      const cx = (minX + maxX) / 2 || 0;
      const cy = (minY + maxY) / 2 || 0;
      const cz = (minZ + maxZ) / 2 || 0;

      const atomPositions = new Map<number, THREE.Vector3>();

      for (const atom of currentMol.atoms) {
        const spec = ELEMENT_CPK_COLORS[atom.element] || ELEMENT_CPK_COLORS.C;
        const pos = new THREE.Vector3(atom.x - cx, atom.y - cy, atom.z - cz);
        atomPositions.set(atom.id, pos);

        const mesh = new THREE.Mesh(sphereGeo, getAtomMaterial(atom.element));
        mesh.position.copy(pos);
        const r = spec.radius * scaleMult;
        mesh.scale.set(r, r, r);
        moleculeGroup.add(mesh);
      }

      if (style === "ball-stick") {
        const upVec = new THREE.Vector3(0, 1, 0);
        for (const bond of currentMol.bonds) {
          const p1 = atomPositions.get(bond.from);
          const p2 = atomPositions.get(bond.to);
          if (!p1 || !p2) continue;

          const dir = new THREE.Vector3().subVectors(p2, p1);
          const len = dir.length();
          if (len < 0.001) continue;

          const mid = new THREE.Vector3().addVectors(p1, p2).multiplyScalar(0.5);
          const quat = new THREE.Quaternion().setFromUnitVectors(upVec, dir.clone().normalize());

          if (bond.order >= 2) {
            const perp = new THREE.Vector3(0, 0, 1).applyQuaternion(quat).multiplyScalar(0.09);
            for (const sign of [-1, 1]) {
              const bMesh = new THREE.Mesh(cylGeo, bondMatDouble);
              bMesh.position.copy(mid).addScaledVector(perp, sign);
              bMesh.quaternion.copy(quat);
              bMesh.scale.set(0.065, len, 0.065);
              moleculeGroup.add(bMesh);
            }
          } else {
            const bMesh = new THREE.Mesh(cylGeo, bondMatSingle);
            bMesh.position.copy(mid);
            bMesh.quaternion.copy(quat);
            bMesh.scale.set(0.085, len, 0.085);
            moleculeGroup.add(bMesh);
          }
        }
      }
    };

    buildMoleculeMeshes();
    rebuildMoleculeRef.current = buildMoleculeMeshes;

    let isDragging = false;
    let prevPointer = { x: 0, y: 0 };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevPointer = { x: e.clientX, y: e.clientY };
      mount.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevPointer.x;
      const dy = e.clientY - prevPointer.y;
      prevPointer = { x: e.clientX, y: e.clientY };
      rotationTargetRef.current.y += dx * 0.011;
      rotationTargetRef.current.x = Math.max(
        -1.35,
        Math.min(1.35, rotationTargetRef.current.x + dy * 0.011)
      );
    };

    const onPointerUp = (e: PointerEvent) => {
      isDragging = false;
      try {
        mount.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    mount.addEventListener("pointerdown", onPointerDown);
    mount.addEventListener("pointermove", onPointerMove);
    mount.addEventListener("pointerup", onPointerUp);

    const scratchVec = new THREE.Vector3();
    let rafId = 0;
    let stepTimer = 0;
    let disposed = false;
    let cachedW = width;
    let cachedH = height;
    let isVisible = true;
    let isPageScrolling = false;
    let scrollPauseTimer: ReturnType<typeof setTimeout> | null = null;

    const onWindowScroll = () => {
      isPageScrolling = true;
      if (scrollPauseTimer !== null) clearTimeout(scrollPauseTimer);
      scrollPauseTimer = setTimeout(() => {
        isPageScrolling = false;
      }, 160);
    };
    window.addEventListener("scroll", onWindowScroll, { passive: true });

    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0]) {
            isVisible = entries[0].isIntersecting;
          }
        },
        { threshold: 0.05 }
      );
      observer.observe(mount);
    }

    const updateOverlayLabels = () => {
      const overlay = labelsOverlayRef.current;
      if (!overlay) return;
      const currentMol = profileRef.current.molecule3D;
      const w = cachedW;
      const h = cachedH;

      let minX = Infinity,
        maxX = -Infinity,
        minY = Infinity,
        maxY = -Infinity,
        minZ = Infinity,
        maxZ = -Infinity;
      for (const a of currentMol.atoms) {
        if (a.x < minX) minX = a.x;
        if (a.x > maxX) maxX = a.x;
        if (a.y < minY) minY = a.y;
        if (a.y > maxY) maxY = a.y;
        if (a.z < minZ) minZ = a.z;
        if (a.z > maxZ) maxZ = a.z;
      }
      const cx = (minX + maxX) / 2 || 0;
      const cy = (minY + maxY) / 2 || 0;
      const cz = (minZ + maxZ) / 2 || 0;

      moleculeGroup.updateMatrixWorld();
      const children = overlay.children;
      let labelIdx = 0;
      for (const atom of currentMol.atoms) {
        if (!atom.label) continue;
        const el = children[labelIdx] as HTMLElement | undefined;
        labelIdx++;
        if (!el) continue;

        scratchVec.set(atom.x - cx, atom.y - cy, atom.z - cz);
        scratchVec.applyMatrix4(moleculeGroup.matrixWorld);
        scratchVec.project(camera);
        const sx = Math.round((scratchVec.x * 0.5 + 0.5) * w);
        const sy = Math.round((-(scratchVec.y * 0.5) + 0.5) * h);
        if (sx > 24 && sx < w - 24 && sy > 24 && sy < h - 40) {
          el.style.opacity = "1";
          el.style.transform = `translate3d(${sx}px, ${sy}px, 0) translate(-50%, -130%)`;
        } else {
          el.style.opacity = "0";
        }
      }
    };

    const renderFrame = () => {
      if (disposed || !renderer) return;

      if (!isVisible || (isPageScrolling && !isDragging) || document.hidden) {
        stepTimer = window.setTimeout(renderFrame, 120);
        return;
      }

      if (autoRotateRef.current && !isDragging) {
        rotationTargetRef.current.y += isSoftwareGl ? 0.015 : 0.007;
      }

      currentRotationRef.current.x +=
        (rotationTargetRef.current.x - currentRotationRef.current.x) * 0.16;
      currentRotationRef.current.y +=
        (rotationTargetRef.current.y - currentRotationRef.current.y) * 0.16;

      moleculeGroup.rotation.x = currentRotationRef.current.x;
      moleculeGroup.rotation.y = currentRotationRef.current.y;
      pedestalGroup.rotation.y = currentRotationRef.current.y * 0.35;

      camera.position.z += (cameraDistanceRef.current - camera.position.z) * 0.18;
      camera.lookAt(0, 0, 0);

      renderer.render(scene, camera);
      updateOverlayLabels();

      if (isSoftwareGl) {
        stepTimer = window.setTimeout(renderFrame, 110);
      } else {
        rafId = requestAnimationFrame(renderFrame);
      }
    };

    triggerRenderRef.current = () => {
      if (renderer) {
        renderer.render(scene, camera);
        updateOverlayLabels();
      }
    };

    // Initial render
    renderer.render(scene, camera);
    updateOverlayLabels();
    renderFrame();

    const onResize = () => {
      if (!mount || !renderer) return;
      cachedW = mount.clientWidth || 480;
      cachedH = mount.clientHeight || 340;
      camera.aspect = cachedW / cachedH;
      camera.updateProjectionMatrix();
      renderer.setSize(cachedW, cachedH);
    };
    window.addEventListener("resize", onResize, { passive: true });

    return () => {
      disposed = true;
      cancelAnimationFrame(rafId);
      clearTimeout(stepTimer);
      if (scrollPauseTimer !== null) clearTimeout(scrollPauseTimer);
      observer?.disconnect();
      window.removeEventListener("scroll", onWindowScroll);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("pointerdown", onPointerDown);
      mount.removeEventListener("pointermove", onPointerMove);
      mount.removeEventListener("pointerup", onPointerUp);
      sphereGeo.dispose();
      cylGeo.dispose();
      ringGeo.dispose();
      innerRingGeo.dispose();
      bondMatSingle.dispose();
      bondMatDouble.dispose();
      materialCache.forEach((m) => m.dispose());
      renderer?.dispose();
    };
  }, []);

  useEffect(() => {
    profileRef.current = profile;
    renderStyleRef.current = renderStyle;
    if (rebuildMoleculeRef.current) {
      rebuildMoleculeRef.current();
    }
    if (triggerRenderRef.current) {
      triggerRenderRef.current();
    }
  }, [ingredientName, profile, renderStyle]);

  const uniqueElements = Array.from(new Set(molecule.atoms.map((a) => a.element)));
  const labeledAtoms = molecule.atoms.filter((a) => Boolean(a.label)).slice(0, 8);

  return (
    <div
      className={`relative w-full ${heightClass} rounded-[16px] overflow-hidden bg-[#f4fbf8] border border-[#0B2B26]/10 select-none`}
      data-testid="webgl-molecule-viewer"
      data-ingredient={profile.inciName}
    >
      {/* Dedicated WebGL Mount Container */}
      <div
        ref={canvasMountRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        aria-label={`Interactive 3D molecular structure of ${profile.inciName}`}
      />

      {/* Semantic Projected Atom Labels Overlay (Updated via DOM Ref for zero React re-renders) */}
      {showLabels && (
        <div ref={labelsOverlayRef} className="absolute inset-0 pointer-events-none overflow-hidden">
          {labeledAtoms.map((atom) => (
            <span
              key={atom.id}
              style={{ opacity: 0 }}
              className="absolute top-0 left-0 px-2 py-0.5 rounded-full text-[10px] font-sans font-medium text-[#0B2B26] bg-white/92 border border-[#0B2B26]/12 whitespace-nowrap tabular-nums"
            >
              {atom.label}
            </span>
          ))}
        </div>
      )}

      {/* Top-Left Scientific HUD Header */}
      <div className="absolute top-3 left-3.5 right-3.5 flex items-start justify-between gap-2 pointer-events-none">
        <div className="bg-white/95 border border-[#0B2B26]/10 rounded-[12px] px-3 py-2 max-w-[72%]">
          <div className="flex items-center gap-2 text-[11px] font-sans font-medium text-[#0E807E] tabular-nums">
            <Atom aria-hidden="true" className="w-3.5 h-3.5 shrink-0 text-[#0E807E]" />
            <span className="truncate">{profile.molecularFormula}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#2E524C] truncate">CAS {profile.casNumber}</span>
          </div>
          {!compact && (
            <p className="text-[11px] text-[#2E524C] truncate mt-0.5">{molecule.iupacName}</p>
          )}
        </div>

        {/* CPK Element Key */}
        <div className="bg-white/95 border border-[#0B2B26]/10 rounded-full px-3 py-1.5 flex items-center gap-2">
          {uniqueElements.map((el) => {
            const cpk = ELEMENT_CPK_COLORS[el];
            return (
              <div key={el} className="flex items-center gap-1 text-[10px] font-sans font-medium text-[#0B2B26]">
                <span
                  aria-hidden="true"
                  className="w-2.5 h-2.5 rounded-full border border-[#0B2B26]/20 inline-block"
                  style={{ backgroundColor: cpk.hex }}
                />
                <span>{el}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Interactive Control Dock */}
      <div className="absolute bottom-3 left-3.5 right-3.5 flex items-center justify-between gap-2 pointer-events-auto">
        <div className="text-[11px] font-sans text-[#2E524C] bg-white/95 border border-[#0B2B26]/10 px-3 py-1.5 rounded-full hidden sm:block truncate">
          Drag to rotate 3D · Scroll to zoom · {molecule.geometryType}
        </div>

        <div
          role="group"
          aria-label="3D molecule viewer controls"
          className="flex flex-wrap items-center justify-end gap-1.5 ml-auto"
        >
          <button
            type="button"
            aria-pressed={autoRotate}
            onClick={() => setAutoRotate((v) => !v)}
            aria-label={autoRotate ? "Pause 3D rotation" : "Resume 3D rotation"}
            className="btn-glass-compact min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full text-[11px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
          >
            {autoRotate ? (
              <Pause aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
            ) : (
              <Play aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
            )}
            <span>{autoRotate ? "Spinning" : "Paused"}</span>
          </button>

          <button
            type="button"
            aria-pressed={renderStyle === "space-fill"}
            onClick={() =>
              setRenderStyle((s) => (s === "ball-stick" ? "space-fill" : "ball-stick"))
            }
            aria-label="Toggle CPK Space-Fill or Ball-and-Stick model"
            className="btn-glass-compact min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full text-[11px] font-medium inline-flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
          >
            <Layers aria-hidden="true" className="w-3.5 h-3.5 text-[#0E807E]" />
            <span>{renderStyle === "ball-stick" ? "Ball & Stick" : "CPK Van der Waals"}</span>
          </button>

          <button
            type="button"
            aria-pressed={showLabels}
            onClick={() => setShowLabels((v) => !v)}
            aria-label="Toggle atom labels"
            className={`min-h-[44px] min-w-[44px] px-3.5 py-2 rounded-full text-[11px] font-medium inline-flex items-center justify-center cursor-pointer whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E] ${
              showLabels ? "btn-glass-primary" : "btn-glass-compact"
            }`}
          >
            <span>Labels</span>
          </button>

          <button
            type="button"
            onClick={() => {
              cameraDistanceRef.current = Math.max(4.5, cameraDistanceRef.current - 1.1);
            }}
            aria-label="Zoom in 3D molecule"
            className="btn-glass-compact min-h-[44px] min-w-[44px] p-2.5 rounded-full inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
          >
            <ZoomIn aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
          </button>

          <button
            type="button"
            onClick={() => {
              cameraDistanceRef.current = Math.min(13.5, cameraDistanceRef.current + 1.1);
            }}
            aria-label="Zoom out 3D molecule"
            className="btn-glass-compact min-h-[44px] min-w-[44px] p-2.5 rounded-full inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
          >
            <ZoomOut aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
          </button>

          <button
            type="button"
            onClick={() => {
              rotationTargetRef.current = { x: 0.32, y: 0.65 };
              cameraDistanceRef.current = 8.2;
            }}
            aria-label="Reset 3D camera view"
            className="btn-glass-compact min-h-[44px] min-w-[44px] p-2.5 rounded-full inline-flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0E807E]"
          >
            <RotateCcw aria-hidden="true" className="w-4 h-4 text-[#0E807E]" />
          </button>
        </div>
      </div>
    </div>
  );
}
