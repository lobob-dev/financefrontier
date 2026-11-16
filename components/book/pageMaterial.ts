import * as THREE from "three";
import { PAGE_H, PAGE_W, palette } from "./constants";

/**
 * A sheet of paper that bends as it turns.
 *
 * The sheet is a flat grid whose vertices are placed entirely in the vertex shader.
 * uTurn runs from 0 (lying on the right-hand stack) to 1 (lying on the left-hand stack).
 * The angle at the spine leads and the free edge lags behind, and the sheet is laid
 * out along a circular arc between those two angles, so the paper never stretches.
 * The lower corner leads slightly, which gives the diagonal curl of a hand-turned page.
 */

const vertexShader = /* glsl */ `
  uniform float uTurn;
  uniform float uCurl;
  uniform float uZR;
  uniform float uZL;
  uniform float uZG;
  uniform float uLift;
  uniform float uW;
  uniform float uH;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  const float PI = 3.141592653589793;

  float gut(float u) { return exp(-u * 9.0); }

  vec3 pagePos(float u, float v) {
    float t = uTurn;
    float lead = smoothstep(0.0, 0.76, t);
    float lag = smoothstep(0.24, 1.0, t);
    float a0 = PI * mix(t, lead, uCurl);
    float a1 = PI * mix(t, lag, uCurl) + (0.5 - v) * 0.5 * sin(PI * t) * uCurl;
    float k = a1 - a0;
    float ang = a0 + k * u;
    float x;
    float z;
    if (abs(k) < 0.0005) {
      x = u * uW * cos(a0);
      z = u * uW * sin(a0);
    } else {
      float r = uW / k;
      x = r * (sin(ang) - sin(a0));
      z = r * (cos(a0) - cos(ang));
    }
    // rest on whichever stack the sheet is currently above
    float hR = (uZR - uZG) * (1.0 - gut(u));
    float hL = (uZL - uZG) * (1.0 - gut(u));
    float wR = 0.5 + 0.5 * cos(ang);
    z += uZG + hR * wR + hL * (1.0 - wR) + uLift;
    return vec3(x, (v - 0.5) * uH, z);
  }

  void main() {
    vUv = uv;
    vec3 p = pagePos(uv.x, uv.y);
    float e = 0.004;
    vec3 du = pagePos(uv.x + e, uv.y) - p;
    vec3 dv = pagePos(uv.x, uv.y + e) - p;
    vec3 n = normalize(cross(du, dv));
    vWorldNormal = normalize(mat3(modelMatrix) * n);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uFront;
  uniform sampler2D uBack;
  uniform float uHasFront;
  uniform float uHasBack;
  uniform vec3 uPaper;
  uniform vec3 uTint;
  uniform vec3 uLightDir;
  uniform vec2 uShade;
  uniform float uFade;

  varying vec2 vUv;
  varying vec3 vWorldNormal;

  void main() {
    bool front = gl_FrontFacing;
    vec2 uv = front ? vUv : vec2(1.0 - vUv.x, vUv.y);
    vec3 base = uPaper;
    // a small negative mip bias keeps printed text crisp when the page is viewed at an angle
    if (front && uHasFront > 0.5) base = texture2D(uFront, uv, -0.85).rgb;
    if (!front && uHasBack > 0.5) base = texture2D(uBack, uv, -0.85).rgb;

    vec3 n = normalize(vWorldNormal) * (front ? 1.0 : -1.0);
    float ndl = dot(n, normalize(uLightDir));
    float light = mix(0.70, 1.0, smoothstep(-0.35, 0.72, ndl));

    // soft shading in the gutter, and the shadow of a page turning overhead
    float gutter = 1.0 - 0.26 * exp(-vUv.x * 15.0);
    float castShade = 1.0 - uShade.x * (1.0 - smoothstep(uShade.y - 0.2, uShade.y + 0.14, vUv.x));

    vec3 col = base * light * gutter * castShade * uTint;
    gl_FragColor = vec4(col, uFade);
    #include <colorspace_fragment>
  }
`;

export function createPageMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: false,
    vertexShader,
    fragmentShader,
    uniforms: {
      uTurn: { value: 0 },
      uCurl: { value: 1 },
      uZR: { value: 0 },
      uZL: { value: 0 },
      uZG: { value: 0 },
      uLift: { value: 0 },
      uW: { value: PAGE_W },
      uH: { value: PAGE_H },
      uFront: { value: null },
      uBack: { value: null },
      uHasFront: { value: 0 },
      uHasBack: { value: 0 },
      uPaper: { value: new THREE.Color(palette.paper) },
      uTint: { value: new THREE.Color(1, 1, 1) },
      uLightDir: { value: new THREE.Vector3(-0.35, 0.55, 0.8).normalize() },
      uShade: { value: new THREE.Vector2(0, 0) },
      uFade: { value: 1 },
    },
  });
}

/** A unit grid. The shader reads only the uv coordinates. */
export function createPageGeometry() {
  const geo = new THREE.PlaneGeometry(1, 1, 48, 10);
  geo.translate(0.5, 0, 0);
  return geo;
}
