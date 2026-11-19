"use client";

import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, Lightformer, PerformanceMonitor } from "@react-three/drei";
import type { PostSummary } from "@/lib/types";
import { Book } from "./Book";
import { Particles } from "./Particles";
import { BookTextures, loadBookFonts } from "./textures";
import { COVER_H, COVER_W, PAGE_H, PAGE_W, type BookAction } from "./constants";
import type { BookStore } from "./store";

const { clamp, lerp } = THREE.MathUtils;
const smooth = (t: number) => t * t * (3 - 2 * t);
const FOV = 30;

/** Keeps the whole book in frame on any screen, and flies into the page when a post is opened. */
function CameraRig({ store, postCount, compact }: { store: React.RefObject<BookStore>; postCount: number; compact: boolean }) {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const size = useThree((s) => s.size);
  useFrame(() => {
    const s = store.current;
    const aspect = size.width / size.height;
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const fit = (w: number, h: number) => Math.max(h / (2 * tan), w / (2 * tan * aspect));
    const o1 = smooth(clamp(s.p, 0, 1));
    const o2 = smooth(clamp(s.p - (postCount + 1), 0, 1));
    const open = o1 * (1 - o2);
    const dClosed = fit(COVER_W * 1.75, COVER_H * 1.62);
    const dOpen = compact ? fit(PAGE_W * 1.1, PAGE_H * 1.46) : fit(PAGE_W * 2 * 1.13, PAGE_H * 1.4);
    // ease back a little while a cover swings toward the viewer
    const swing = Math.sin(Math.PI * clamp(s.p, 0, 1)) + Math.sin(Math.PI * clamp(s.p - (postCount + 1), 0, 1));
    // during the first-visit opening scene the camera starts far back and glides in
    const d = lerp(dClosed, dOpen, open) + swing * 0.9 + (1 - s.introFly) * 6;
    const x = compact ? PAGE_W * 0.5 * open : 0;
    const y = (compact ? lerp(0.075, 0.13, open) : 0.075) * d * tan; // sit the book a touch above centre, clear of the controls
    const z = smooth(clamp(s.zoomT, 0, 1));
    const dZoom = fit(PAGE_W * 0.72, PAGE_H * 0.5);
    camera.position.set(lerp(x, PAGE_W * 0.5, z), lerp(-y, 0.12, z), lerp(d, dZoom, z));
    camera.lookAt(lerp(x, PAGE_W * 0.5, z), lerp(-y, 0.12, z), 0);
  });
  return null;
}

function GroundShadow({ store, postCount, dark }: { store: React.RefObject<BookStore>; postCount: number; dark: boolean }) {
  const tex = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d")!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, "rgba(20,45,40,1)");
    g.addColorStop(0.5, "rgba(20,45,40,0.35)");
    g.addColorStop(1, "rgba(20,45,40,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(canvas);
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  const [mesh, setMesh] = useState<THREE.Mesh | null>(null);
  useFrame((state) => {
    if (!mesh) return;
    const s = store.current;
    const open = smooth(clamp(s.p, 0, 1)) * (1 - smooth(clamp(s.p - (postCount + 1), 0, 1)));
    const bob = Math.sin(state.clock.elapsedTime * 0.9);
    mesh.scale.set(lerp(2.3, 3.9, open) * (1 - bob * 0.03), 1.25 * (1 - bob * 0.03), 1);
    (mesh.material as THREE.MeshBasicMaterial).opacity = (dark ? 0.5 : 0.2) * (1 - bob * 0.08) * (1 - s.zoomT);
  });
  return (
    <mesh ref={setMesh} position={[0, -PAGE_H / 2 - 0.62, 0]} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial map={tex} transparent depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

function PointerTracker({ store }: { store: React.RefObject<BookStore> }) {
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      store.current.px = (e.clientX / window.innerWidth) * 2 - 1;
      store.current.py = (e.clientY / window.innerHeight) * 2 - 1;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [store]);
  return null;
}

type Light = { key: string; keyBoost: number; ambient: number; fill: string; lamp: number; paper: [number, number, number]; label: string };

/** Lighting that follows the visitor's own clock. Subtle on purpose: the pages must stay easy to read. */
function lightForHour(hour: number): Light {
  if (hour >= 5 && hour < 10) return { key: "#FFE6C4", keyBoost: 1.05, ambient: 1, fill: "#FFE9D2", lamp: 0, paper: [1, 0.985, 0.95], label: "morning" };
  if (hour >= 10 && hour < 17) return { key: "#FFFFFF", keyBoost: 1, ambient: 1, fill: "#CDEBFF", lamp: 0, paper: [1, 1, 1], label: "day" };
  if (hour >= 17 && hour < 21) return { key: "#FFD3A3", keyBoost: 0.95, ambient: 0.92, fill: "#C9D6FF", lamp: 0.25, paper: [1, 0.965, 0.91], label: "evening" };
  return { key: "#FFEBD0", keyBoost: 0.82, ambient: 0.8, fill: "#9FB8FF", lamp: 0.55, paper: [0.97, 0.94, 0.88], label: "night" };
}

export type BookSceneProps = {
  posts: PostSummary[];
  store: React.RefObject<BookStore>;
  compact: boolean;
  dark: boolean;
  onAction: (action: BookAction) => void;
  onReady: () => void;
};

export default function BookScene({ posts, store, compact, dark, onAction, onReady }: BookSceneProps) {
  const [textures, setTextures] = useState<BookTextures | null>(null);
  const [maxDpr, setMaxDpr] = useState(2);
  // "?hour=21" in the address previews another time of day
  const [light] = useState(() => {
    const forced = Number(new URLSearchParams(window.location.search).get("hour"));
    return lightForHour(Number.isInteger(forced) && forced >= 0 && forced < 24 && window.location.search.includes("hour=") ? forced : new Date().getHours());
  });

  useEffect(() => {
    let alive = true;
    let created: BookTextures | null = null;
    loadBookFonts().then(() => {
      if (!alive) return;
      const sharp = !compact && window.devicePixelRatio > 1.2 && window.innerWidth >= 1100;
      created = new BookTextures(posts, { scale: sharp ? 1.6 : 1.28, compact, anisotropy: 8 });
      setTextures(created);
    });
    return () => {
      alive = false;
      created?.dispose();
      setTextures(null);
    };
  }, [posts, compact]);

  return (
    <Canvas
      flat
      dpr={[1, maxDpr]}
      camera={{ fov: FOV, near: 0.1, far: 60, position: [0, 0, 8] }}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      style={{ touchAction: "pan-y" }}
    >
      <PerformanceMonitor onDecline={() => setMaxDpr((d) => Math.max(1, d - 0.5))} />
      <ambientLight intensity={(dark ? 0.45 : 0.6) * light.ambient} />
      <directionalLight position={[-3, 4.5, 6]} intensity={(dark ? 1.0 : 1.2) * light.keyBoost} color={light.key} />
      <directionalLight position={[4, 1, 3]} intensity={0.25} color={light.fill} />
      {/* in the evening and at night, a warm desk lamp glows from just above the book */}
      {light.lamp > 0 && <pointLight position={[2.4, 2.6, 2.8]} intensity={light.lamp * 6} distance={12} decay={1.6} color="#FFB870" />}
      <Environment resolution={128} frames={1} environmentIntensity={dark ? 0.36 : 0.5}>
        <mesh scale={30}>
          <sphereGeometry args={[1, 16, 16]} />
          <meshBasicMaterial color={dark ? "#3a4a52" : "#c9d3cf"} side={THREE.BackSide} />
        </mesh>
        <Lightformer form="rect" intensity={2.4} position={[0, 6, 4]} rotation={[Math.PI / 2.4, 0, 0]} scale={[12, 6, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[-7, 1, 3]} rotation={[0, Math.PI / 2.5, 0]} scale={[6, 8, 1]} color="#EAFBF4" />
        <Lightformer form="rect" intensity={1.2} position={[7, 0, 4]} rotation={[0, -Math.PI / 2.5, 0]} scale={[5, 8, 1]} color="#E6F3FF" />
        <Lightformer form="circle" intensity={2} position={[2, 3, 8]} scale={3} />
      </Environment>
      <CameraRig store={store} postCount={posts.length} compact={compact} />
      <PointerTracker store={store} />
      <GroundShadow store={store} postCount={posts.length} dark={dark} />
      <Particles dark={dark} />
      {textures && (
        <Book posts={posts} store={store} textures={textures} dark={dark} onAction={onAction} onReady={onReady} pageTint={light.paper} />
      )}
    </Canvas>
  );
}
