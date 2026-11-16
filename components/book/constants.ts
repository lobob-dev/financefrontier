/** World-space dimensions of the book. */
export const PAGE_W = 1.3;
export const PAGE_H = 1.82;
export const COVER_W = PAGE_W + 0.05;
export const COVER_H = PAGE_H + 0.1;
export const COVER_T = 0.03;
export const BLOCK_T = 0.17;
export const SPINE_W = BLOCK_T + COVER_T * 2;
/** How far the pages may dip into the gutter when the book lies open. */
export const MAX_DIP = 0.1;

/** Logical drawing size of a page texture (same aspect ratio as the page). */
export const TEX_W = 800;
export const TEX_H = 1120;
export const COVER_TEX_H = Math.round((TEX_W * COVER_H) / COVER_W);

export const palette = {
  paper: "#FBF8F1",
  ink: "#16232D",
  inkSoft: "#44525C",
  muted: "#7C8891",
  accent: "#12A77C",
  accentStrong: "#0A7A5C",
  mintSoft: "#DDF3EA",
  sky: "#3F9BDB",
  skySoft: "#E2F0FB",
  rule: "#E4DFD2",
  linen: "#ECE8DC",
  cloth: "#0F6E57",
  foil: "#11936F",
  ribbon: "#19B88A",
};

/**
 * Steps of the book:
 * 0 = closed (front cover), 1 = contents, 2..n+1 = one post each, n+2 = back cover.
 */
export type StepInfo =
  | { kind: "cover" }
  | { kind: "contents" }
  | { kind: "post"; index: number }
  | { kind: "about" };

export function stepCount(postCount: number) {
  return postCount + 3;
}

export function stepInfo(step: number, postCount: number): StepInfo {
  if (step <= 0) return { kind: "cover" };
  if (step === 1) return { kind: "contents" };
  if (step >= postCount + 2) return { kind: "about" };
  return { kind: "post", index: step - 2 };
}

export type BookAction =
  | { type: "goto"; step: number }
  | { type: "post"; index: number }
  | { type: "link"; href: string };

export type Region = {
  x: number;
  y: number;
  w: number;
  h: number;
  action: BookAction;
};
