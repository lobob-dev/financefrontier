"use client";

import { useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uScale;
  attribute float aSeed;
  attribute float aSize;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vec3 p = position;
    float speed = 0.05 + aSeed * 0.07;
    p.y = mod(p.y + uTime * speed + 4.5, 9.0) - 4.5;
    p.x += sin(uTime * 0.25 + aSeed * 40.0) * 0.35;
    p.z += cos(uTime * 0.2 + aSeed * 23.0) * 0.25;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSize * uScale / -mv.z;
    vColor = aColor;
    float twinkle = 0.7 + 0.3 * sin(uTime * (0.6 + aSeed) + aSeed * 60.0);
    vAlpha = smoothstep(4.5, 3.0, abs(p.y)) * twinkle;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float a = smoothstep(0.5, 0.05, d);
    gl_FragColor = vec4(vColor, a * vAlpha * uOpacity);
    #include <colorspace_fragment>
  }
`;

/** A few soft motes of light drifting slowly upward around the book. */
export function Particles({ count = 64, dark }: { count?: number; dark: boolean }) {
  const mat = useRef<THREE.ShaderMaterial>(null);
  const geo = useMemo(() => {
    let seed = 1234;
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const colors = ["#19B88A", "#5DB5EE", "#F3C969", "#FFFFFF", "#8FE0C4"].map((c) => new THREE.Color(c));
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const seeds = new Float32Array(count);
    const sizes = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (rand() - 0.5) * 11;
      pos[i * 3 + 1] = (rand() - 0.5) * 9;
      pos[i * 3 + 2] = -4.5 + rand() * 6;
      const c = colors[Math.floor(rand() * colors.length)];
      col[i * 3] = c.r;
      col[i * 3 + 1] = c.g;
      col[i * 3 + 2] = c.b;
      seeds[i] = rand();
      sizes[i] = 0.5 + rand() * 1.1;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(pos, 3));
    g.setAttribute("aColor", new THREE.BufferAttribute(col, 3));
    g.setAttribute("aSeed", new THREE.BufferAttribute(seeds, 1));
    g.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    return g;
  }, [count]);

  const uniforms = useMemo(
    () => ({ uTime: { value: 0 }, uScale: { value: 60 }, uOpacity: { value: 0.5 } }),
    [],
  );

  useFrame((state) => {
    if (!mat.current) return;
    mat.current.uniforms.uTime.value = state.clock.elapsedTime;
    mat.current.uniforms.uScale.value = state.size.height * state.viewport.dpr * 0.085;
    mat.current.uniforms.uOpacity.value = dark ? 0.75 : 0.55;
  });

  return (
    <points geometry={geo} frustumCulled={false}>
      <shaderMaterial
        ref={mat}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={dark ? THREE.AdditiveBlending : THREE.NormalBlending}
      />
    </points>
  );
}
