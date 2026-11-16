"use client";

import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import type { PostSummary } from "@/lib/types";
import {
  BLOCK_T,
  COVER_H,
  COVER_T,
  COVER_TEX_H,
  COVER_W,
  MAX_DIP,
  PAGE_H,
  PAGE_W,
  SPINE_W,
  TEX_H,
  TEX_W,
  palette,
  type BookAction,
} from "./constants";
import { createPageGeometry, createPageMaterial } from "./pageMaterial";
import type { BookTextures } from "./textures";
import type { BookStore } from "./store";

const { clamp, lerp, damp } = THREE.MathUtils;
const smooth = (t: number) => t * t * (3 - 2 * t);
const smoothstep = (a: number, b: number, x: number) => smooth(clamp((x - a) / (b - a), 0, 1));
const EPS = 0.004;
const BLOCK_SEG = 20;
const RIBBON_ROWS = 11;

/** The sides of a stack of pages. Its top edge follows the curve of the open page. */
function createBlockGeometry(dir: 1 | -1) {
  const wallVerts = (BLOCK_SEG + 1) * 2;
  const count = wallVerts * 2 + 8;
  const pos = new Float32Array(count * 3);
  const nor = new Float32Array(count * 3);
  const uv = new Float32Array(count * 2);
  const idx: number[] = [];
  for (let w = 0; w < 2; w++) {
    const base = w * wallVerts;
    for (let i = 0; i <= BLOCK_SEG; i++) {
      for (let k = 0; k < 2; k++) {
        const v = base + i * 2 + k;
        nor[v * 3 + 1] = w === 0 ? 1 : -1;
      }
      if (i < BLOCK_SEG) {
        const a = base + i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
  }
  for (let f = 0; f < 2; f++) {
    const base = wallVerts * 2 + f * 4;
    for (let k = 0; k < 4; k++) {
      // the fore-edge faces outward; the hidden binding side is lit like the page above it
      if (f === 0) nor[(base + k) * 3] = dir;
      else nor[(base + k) * 3 + 2] = 1;
    }
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(uv, 2));
  geo.setIndex(idx);
  return geo;
}

function updateBlockGeometry(geo: THREE.BufferGeometry, dir: 1 | -1, zTop: number, zG: number) {
  const pos = geo.getAttribute("position") as THREE.BufferAttribute;
  const uv = geo.getAttribute("uv") as THREE.BufferAttribute;
  const wallVerts = (BLOCK_SEG + 1) * 2;
  const c = COVER_T;
  for (let w = 0; w < 2; w++) {
    const y = (w === 0 ? 1 : -1) * (PAGE_H / 2);
    for (let i = 0; i <= BLOCK_SEG; i++) {
      const u = i / BLOCK_SEG;
      const z = zTop - (zTop - zG) * Math.exp(-u * 9);
      const v = w * wallVerts + i * 2;
      pos.setXYZ(v, dir * u * PAGE_W, y, c);
      pos.setXYZ(v + 1, dir * u * PAGE_W, y, z);
      uv.setXY(v, u, 0);
      uv.setXY(v + 1, u, (z - c) / BLOCK_T);
    }
  }
  const fore = wallVerts * 2;
  const x = dir * PAGE_W;
  const h = PAGE_H / 2;
  pos.setXYZ(fore, x, -h, c);
  pos.setXYZ(fore + 1, x, h, c);
  pos.setXYZ(fore + 2, x, h, zTop);
  pos.setXYZ(fore + 3, x, -h, zTop);
  uv.setXY(fore, 0, 0);
  uv.setXY(fore + 1, 1, 0);
  uv.setXY(fore + 2, 1, (zTop - c) / BLOCK_T);
  uv.setXY(fore + 3, 0, (zTop - c) / BLOCK_T);
  const sp = fore + 4;
  pos.setXYZ(sp, 0, -h, c);
  pos.setXYZ(sp + 1, 0, h, c);
  pos.setXYZ(sp + 2, 0, h, zG);
  pos.setXYZ(sp + 3, 0, -h, zG);
  uv.setXY(sp, 0, 0);
  uv.setXY(sp + 1, 1, 0);
  uv.setXY(sp + 2, 1, (zG - c) / BLOCK_T);
  uv.setXY(sp + 3, 0, (zG - c) / BLOCK_T);
  pos.needsUpdate = true;
  uv.needsUpdate = true;
}

/** Fine horizontal lines that read as the edges of many pages. */
function createEdgeTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 256;
  const ctx = canvas.getContext("2d")!;
  let seed = 7;
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let y = 0; y < 256; y++) {
    const tone = 236 + Math.round(rand() * 14) - (y % 3 === 0 ? 16 : 0);
    ctx.fillStyle = `rgb(${tone},${tone - 4},${tone - 14})`;
    ctx.fillRect(0, y, 8, 1);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  return tex;
}

function createRibbonGeometry() {
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(RIBBON_ROWS * 2 * 3);
  const nor = new Float32Array(RIBBON_ROWS * 2 * 3);
  const idx: number[] = [];
  for (let i = 0; i < RIBBON_ROWS; i++) {
    nor[i * 6 + 2] = 1;
    nor[i * 6 + 5] = 1;
    if (i < RIBBON_ROWS - 1) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  geo.setIndex(idx);
  return geo;
}

type Props = {
  posts: PostSummary[];
  store: React.RefObject<BookStore>;
  textures: BookTextures;
  dark: boolean;
  onAction: (action: BookAction) => void;
  onReady: () => void;
};

export function Book({ posts, store, textures, dark, onAction, onReady }: Props) {
  const n = posts.length;
  const outer = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null);
  const front = useRef<THREE.Group>(null);
  const back = useRef<THREE.Group>(null);
  const spine = useRef<THREE.Mesh>(null);
  const rightBlock = useRef<THREE.Mesh>(null);
  const leftBlock = useRef<THREE.Mesh>(null);
  const sheets = useRef<(THREE.Mesh | null)[]>([null, null, null]);
  const lastK = useRef(-99);
  const lastBlock = useRef({ zR: -1, zL: -1, zG: -1 });

  const res = useMemo(() => {
    const pageGeo = createPageGeometry();
    const sheetMats = [createPageMaterial(), createPageMaterial(), createPageMaterial()];
    const coverGeoFront = new THREE.BoxGeometry(COVER_W, COVER_H, COVER_T);
    coverGeoFront.translate(COVER_W / 2, 0, COVER_T / 2);
    const coverGeoBack = new THREE.BoxGeometry(COVER_W, COVER_H, COVER_T);
    coverGeoBack.translate(COVER_W / 2, 0, -COVER_T / 2);
    const spineGeo = new THREE.BoxGeometry(SPINE_W, COVER_H, COVER_T);
    const edge = new THREE.MeshStandardMaterial({ color: palette.linen, roughness: 0.95 });
    const clothEdge = new THREE.MeshStandardMaterial({ color: palette.cloth, roughness: 0.95 });
    const printed = (id: string, orm?: string) => {
      const mat = new THREE.MeshStandardMaterial({
        map: textures.get(id),
        roughness: orm ? 1 : 0.92,
        metalness: orm ? 1 : 0,
      });
      if (orm) {
        mat.roughnessMap = textures.get(orm);
        mat.metalnessMap = textures.get(orm);
        mat.envMapIntensity = 1.15;
      }
      return mat;
    };
    const frontOuter = printed("coverFront", "coverFrontORM");
    const frontInner = printed("coverInner");
    const backOuter = printed("coverBack", "coverBackORM");
    const backInner = printed("backInner");
    const spineOuter = printed("spine", "spineORM");
    // box face order: +x, -x, +y, -y, +z, -z
    const frontMats = [edge, clothEdge, edge, edge, frontOuter, frontInner];
    const backMats = [edge, clothEdge, edge, edge, backInner, backOuter];
    const spineMats = [clothEdge, clothEdge, clothEdge, clothEdge, clothEdge, spineOuter];
    const edgeTex = createEdgeTexture();
    const blockMat = new THREE.MeshStandardMaterial({
      map: edgeTex,
      color: "#FFFFFF",
      roughness: 1,
      side: THREE.DoubleSide,
    });
    const blockGeoR = createBlockGeometry(1);
    const blockGeoL = createBlockGeometry(-1);
    const ribbonGeo = createRibbonGeometry();
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: palette.ribbon,
      roughness: 0.55,
      side: THREE.DoubleSide,
    });
    const hitGeo = new THREE.PlaneGeometry(PAGE_W, PAGE_H);
    const hitMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false });
    const disposables = [
      pageGeo, ...sheetMats, coverGeoFront, coverGeoBack, spineGeo, edge, clothEdge, frontOuter,
      frontInner, backOuter, backInner, spineOuter, edgeTex, blockMat, blockGeoR, blockGeoL,
      ribbonGeo, ribbonMat, hitGeo, hitMat,
    ];
    return {
      pageGeo, sheetMats, coverGeoFront, coverGeoBack, spineGeo, frontMats, backMats, spineMats,
      blockMat, blockGeoR, blockGeoL, ribbonGeo, ribbonMat, hitGeo, hitMat, disposables,
    };
  }, [textures]);

  useEffect(() => {
    onReady();
    return () => {
      res.disposables.forEach((d) => d.dispose());
      document.body.style.cursor = "";
    };
  }, [res, onReady]);

  useFrame((state, delta) => {
    const s = store.current;
    const dt = Math.min(delta, 0.05);
    s.p = damp(s.p, s.target, 5.2, dt);
    if (Math.abs(s.p - s.target) < 0.0004) s.p = s.target;
    s.zoomT = damp(s.zoomT, s.zoom, 4.2, dt);
    const p = s.p;
    const time = state.clock.elapsedTime;

    const o1 = smooth(clamp(p, 0, 1));
    const o2 = smooth(clamp(p - (n + 1), 0, 1));
    const open = o1 * (1 - o2);
    const thC = Math.PI * o1;
    const thB = Math.PI * o2;
    const c = COVER_T;

    // how the pages are shared between the two stacks
    // (the last sheet never crosses on its own: it rides over with the back cover)
    const turned = clamp(p - 1, 0, n);
    const tl = (BLOCK_T * turned) / (n + 1);
    const tr = BLOCK_T - tl;
    const zR = c + tr;
    const zL = c + tl;
    const openG = Math.max(c + 0.55 * Math.min(tl, tr), c + Math.max(tl, tr) - MAX_DIP);
    const closedG = p > n + 1 ? zL : zR;
    const zG = lerp(closedG, Math.min(openG, Math.max(zL, zR)), open);

    // pose: a slow float when closed, calm and readable when open
    const idle = lerp(1, 0.22, open) * (1 - s.zoomT);
    if (outer.current) {
      outer.current.position.y = Math.sin(time * 0.9) * 0.04 * lerp(1, 0.5, open) * (1 - s.zoomT);
      outer.current.rotation.y =
        lerp(0.5, 0, o1) + lerp(0, -0.24, o2) + Math.sin(time * 0.45) * 0.11 * idle + s.px * 0.06 * (1 - s.zoomT);
      outer.current.rotation.x =
        lerp(-0.08, -0.13, open) * (1 - s.zoomT) + Math.sin(time * 0.6 + 1) * 0.02 * idle - s.py * 0.035 * (1 - s.zoomT);
      outer.current.rotation.z = Math.sin(time * 0.5) * 0.014 * idle;
    }
    if (inner.current) {
      inner.current.position.x = (-COVER_W / 2) * (1 - o1) + (COVER_W / 2) * o2;
      inner.current.position.z = -SPINE_W / 2;
    }
    if (front.current) {
      front.current.position.z = c + (BLOCK_T * (1 + Math.cos(thC))) / 2;
      front.current.rotation.y = -thC;
    }
    if (back.current) {
      back.current.position.z = c + (BLOCK_T * (1 - Math.cos(thB))) / 2;
      back.current.rotation.y = -thB;
    }
    if (spine.current) {
      const a = ((thC + thB) / (2 * Math.PI) - 0.5) * Math.PI;
      spine.current.position.x = (Math.sin(a) * c) / 2;
      spine.current.position.z = -c / 2 + (SPINE_W / 2 + c / 2) * (1 - Math.cos(a));
      spine.current.rotation.y = -a;
    }

    // page stacks
    const lb = lastBlock.current;
    if (lb.zR !== zR || lb.zL !== zL || lb.zG !== zG) {
      updateBlockGeometry(res.blockGeoR, 1, zR, Math.min(zG, zR));
      updateBlockGeometry(res.blockGeoL, -1, zL, Math.min(zG, zL));
      lb.zR = zR;
      lb.zL = zL;
      lb.zG = zG;
    }
    // while the back cover closes, the pages still lying on it travel with it as one piece
    const hzB = c + (BLOCK_T * (1 - Math.cos(thB))) / 2;
    const rideX = c * Math.sin(thB);
    const rideZ = hzB - c * Math.cos(thB);
    if (rightBlock.current) {
      rightBlock.current.visible = tr > 0.0005;
      rightBlock.current.position.set(rideX, 0, rideZ);
      rightBlock.current.rotation.y = -thB;
    }
    if (leftBlock.current) leftBlock.current.visible = tl > 0.0005;

    // only three sheets ever exist: the one turning and its two neighbours
    const k = Math.min(Math.floor(p), n + 1);
    const frac = p - k;
    for (let i = 0; i < 3; i++) {
      const mesh = sheets.current[i];
      if (!mesh) continue;
      const j = k - 2 + i;
      if (j < 0 || j > n) {
        mesh.visible = false;
        continue;
      }
      mesh.visible = true;
      const riding = j === n;
      mesh.position.set(riding ? rideX : 0, 0, riding ? rideZ : 0);
      mesh.rotation.y = riding ? -thB : 0;
      const t = riding ? 0 : clamp(p - (j + 1), 0, 1);
      const u = res.sheetMats[i].uniforms;
      u.uTurn.value = t;
      u.uCurl.value = 1;
      u.uZR.value = zR;
      u.uZL.value = zL;
      u.uZG.value = zG;
      u.uLift.value = -EPS * Math.abs(j - (k - 1));
      const frontTex = t < 1 ? textures.get(`R${j}`) : null;
      const backTex = t > 0 ? textures.get(`L${j}`) : null;
      u.uFront.value = frontTex;
      u.uHasFront.value = frontTex ? 1 : 0;
      u.uBack.value = backTex;
      u.uHasBack.value = backTex ? 1 : 0;
      const tint = dark ? 0.9 : 1;
      u.uTint.value.setRGB(tint, tint, dark ? 0.93 : 1);
      if (j === k) {
        u.uShade.value.set(
          0.24 * smoothstep(0, 0.08, frac) * (1 - smoothstep(0.55, 1, frac)),
          Math.max(Math.cos(Math.PI * frac), 0),
        );
      } else if (j === k - 2) {
        u.uShade.value.set(0.24 * smoothstep(0.02, 0.5, frac), Math.max(-Math.cos(Math.PI * frac), 0));
      } else {
        u.uShade.value.set(0, 0);
      }
    }

    // draw the pages we are about to need a moment before they appear, and free distant ones
    if (k !== lastK.current) {
      lastK.current = k;
      const ids: string[] = [];
      for (let j = k - 3; j <= k + 2; j++) {
        if (j < 0 || j > n) continue;
        ids.push(`R${j}`, `L${j}`);
      }
      ids.forEach((id, i) => {
        if (!textures.peek(id)) {
          setTimeout(() => {
            const tex = textures.get(id);
            state.gl.initTexture(tex);
          }, 60 * (i + 1));
        }
      });
      textures.prune(k, 5);
    }

    // bookmark ribbon: lies in the gutter of the open spread and hangs below the book
    const rp = res.ribbonGeo.getAttribute("position") as THREE.BufferAttribute;
    const rx = 0.03;
    const half = 0.017;
    const zPage = zR - (zR - Math.min(zG, zR)) * Math.exp((-rx / PAGE_W) * 9) + 0.006;
    for (let i = 0; i < RIBBON_ROWS; i++) {
      let y: number;
      let sway = 0;
      let z = zPage;
      if (i === 0) y = PAGE_H / 2 - 0.02;
      else if (i === 1) y = -PAGE_H / 2 + 0.01;
      else {
        const f = (i - 1) / (RIBBON_ROWS - 2);
        y = -PAGE_H / 2 - f * 0.36;
        sway = Math.sin(time * 1.4 + f * 2.2) * 0.012 * f;
        z = zPage - f * f * 0.02 + Math.cos(time * 1.1 + f * 1.7) * 0.01 * f;
      }
      const cut = i === RIBBON_ROWS - 1 ? 0.05 : 0;
      rp.setXYZ(i * 2, rx - half + sway, y - cut, z);
      rp.setXYZ(i * 2 + 1, rx + half + sway, y, z);
    }
    rp.needsUpdate = true;
  });

  // ---------- interaction ----------

  const settledStep = () => {
    const s = store.current;
    const k = Math.round(s.p);
    return Math.abs(s.p - k) < 0.07 && s.zoom === 0 ? k : -1;
  };
  const findRegion = (id: string, uv: THREE.Vector2 | undefined, texH: number) => {
    if (!uv) return undefined;
    const x = uv.x * TEX_W;
    const y = (1 - uv.y) * texH;
    return textures.regions(id).find((r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h);
  };
  const pageRegion = (side: "L" | "R", e: ThreeEvent<MouseEvent | PointerEvent>) => {
    const k = settledStep();
    if (k < 1 || k > n + 1) return undefined;
    const sheet = side === "R" ? k - 1 : k - 2;
    if (sheet < 0) return undefined;
    return findRegion(`${side}${sheet}`, e.uv, TEX_H);
  };
  const pageHandlers = (side: "L" | "R") => ({
    onClick: (e: ThreeEvent<MouseEvent>) => {
      const region = pageRegion(side, e);
      if (!region) return;
      e.stopPropagation();
      onAction(region.action);
    },
    onPointerMove: (e: ThreeEvent<PointerEvent>) => {
      document.body.style.cursor = pageRegion(side, e) ? "pointer" : "";
    },
    onPointerOut: () => {
      document.body.style.cursor = "";
    },
  });
  const backRegion = (e: ThreeEvent<MouseEvent | PointerEvent>) => {
    if (settledStep() !== n + 2 || e.face?.materialIndex !== 5) return undefined;
    return findRegion("coverBack", e.uv, COVER_TEX_H);
  };

  return (
    <group ref={outer}>
      <group ref={inner}>
        {/* front cover */}
        <group ref={front}>
          <mesh
            geometry={res.coverGeoFront}
            material={res.frontMats}
            onClick={(e) => {
              if (settledStep() !== 0) return;
              e.stopPropagation();
              onAction({ type: "goto", step: 1 });
            }}
            onPointerMove={() => {
              if (settledStep() === 0) document.body.style.cursor = "pointer";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          />
        </group>
        {/* back cover */}
        <group ref={back}>
          <mesh
            geometry={res.coverGeoBack}
            material={res.backMats}
            onClick={(e) => {
              const region = backRegion(e);
              if (!region) return;
              e.stopPropagation();
              onAction(region.action);
            }}
            onPointerMove={(e) => {
              if (settledStep() === n + 2) document.body.style.cursor = backRegion(e) ? "pointer" : "";
            }}
            onPointerOut={() => {
              document.body.style.cursor = "";
            }}
          />
        </group>
        <mesh ref={spine} geometry={res.spineGeo} material={res.spineMats} />
        <mesh ref={rightBlock} geometry={res.blockGeoR} material={res.blockMat} frustumCulled={false} />
        <mesh ref={leftBlock} geometry={res.blockGeoL} material={res.blockMat} frustumCulled={false} />
        {[0, 1, 2].map((i) => (
          <mesh
            key={i}
            ref={(m) => {
              sheets.current[i] = m;
            }}
            geometry={res.pageGeo}
            material={res.sheetMats[i]}
            frustumCulled={false}
            raycast={() => null}
          />
        ))}
        <mesh geometry={res.ribbonGeo} material={res.ribbonMat} frustumCulled={false} raycast={() => null} />
        {/* invisible planes that receive clicks for the open pages */}
        <mesh
          geometry={res.hitGeo}
          material={res.hitMat}
          position={[PAGE_W / 2, 0, COVER_T + BLOCK_T + 0.02]}
          {...pageHandlers("R")}
        />
        <mesh
          geometry={res.hitGeo}
          material={res.hitMat}
          position={[-PAGE_W / 2, 0, COVER_T + BLOCK_T + 0.02]}
          {...pageHandlers("L")}
        />
      </group>
    </group>
  );
}
