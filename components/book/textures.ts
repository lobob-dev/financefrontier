import * as THREE from "three";
import type { PostSummary } from "@/lib/types";
import { site } from "@/lib/site";
import { formatDate, pad2 } from "@/lib/format";
import {
  COVER_TEX_H,
  TEX_H,
  TEX_W,
  palette as C,
  type Region,
} from "./constants";

/**
 * Every printed surface of the book is drawn onto a 2D canvas and used as a texture.
 * That keeps text sharp, lets it bend with the paper as a page turns, and means
 * the whole book is generated from post data with no hand-made assets.
 */

const SERIF = "Fraunces, Georgia, serif";
const SANS = "Inter, system-ui, sans-serif";

type Ctx = CanvasRenderingContext2D;

// ---------- small drawing helpers ----------

function roundRectPath(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function wrapLines(ctx: Ctx, text: string, maxWidth: number, maxLines = 99) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const cut = lines.slice(0, maxLines);
    let last = cut[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    cut[maxLines - 1] = `${last.replace(/[\s,.;:]+$/, "")}…`;
    return cut;
  }
  return lines;
}

/** Letter-spaced text, drawn glyph by glyph so it works in every browser. */
function spacedText(
  ctx: Ctx,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: "left" | "center" | "right" = "left",
) {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + spacing * (chars.length - 1);
  let cx = align === "left" ? x : align === "center" ? x - total / 2 : x - total;
  const prev = ctx.textAlign;
  ctx.textAlign = "left";
  chars.forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i] + spacing;
  });
  ctx.textAlign = prev;
  return total;
}

function drawImageCover(
  ctx: Ctx,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  if (!iw || !ih) return;
  const scale = Math.max(w / iw, h / ih);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, x, y, w, h);
}

/** Small deterministic random generator so the paper grain is stable. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function drawPaper(ctx: Ctx, w: number, h: number, side: "left" | "right", seed: number) {
  ctx.fillStyle = C.paper;
  ctx.fillRect(0, 0, w, h);
  // faint warmth toward the outer edge
  const g = ctx.createLinearGradient(side === "right" ? w : 0, 0, side === "right" ? w - 160 : 160, 0);
  g.addColorStop(0, "rgba(120,100,60,0.05)");
  g.addColorStop(1, "rgba(120,100,60,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  // paper grain
  const r = rng(seed);
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = r() > 0.5 ? "rgba(90,70,40,0.035)" : "rgba(255,255,255,0.5)";
    ctx.fillRect(r() * w, r() * h, 1.6, 1.6);
  }
}

function runningHead(ctx: Ctx, side: "left" | "right", label: string) {
  ctx.font = `600 15px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.textBaseline = "alphabetic";
  if (side === "right") spacedText(ctx, label.toUpperCase(), TEX_W - 75, 78, 3.2, "right");
  else spacedText(ctx, label.toUpperCase(), 75, 78, 3.2, "left");
}

function pageNumber(ctx: Ctx, side: "left" | "right", n: number) {
  ctx.font = `500 19px ${SERIF}`;
  ctx.fillStyle = C.muted;
  ctx.textAlign = side === "right" ? "right" : "left";
  ctx.fillText(String(n), side === "right" ? TEX_W - 75 : 75, TEX_H - 58);
  ctx.textAlign = "left";
}

function horizonMotif(ctx: Ctx, cx: number, cy: number, width: number, color: string, lw = 3) {
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx - width / 2, cy);
  ctx.lineTo(cx + width / 2, cy);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, width * 0.16, Math.PI, 0);
  ctx.stroke();
  // short rays
  for (let i = 0; i < 5; i++) {
    const a = Math.PI + (Math.PI * (i + 0.5)) / 5;
    const r1 = width * 0.21;
    const r2 = width * 0.265;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2);
    ctx.stroke();
  }
}

// ---------- pages ----------

function drawContents(ctx: Ctx, posts: PostSummary[]): Region[] {
  drawPaper(ctx, TEX_W, TEX_H, "right", 11);
  runningHead(ctx, "right", site.name);
  const left = 95;
  const right = TEX_W - 75;

  ctx.fillStyle = C.accentStrong;
  ctx.font = `600 17px ${SANS}`;
  spacedText(ctx, "LATEST NOTES, NEWEST FIRST", left, 178, 3.4);

  ctx.fillStyle = C.ink;
  ctx.font = `600 82px ${SERIF}`;
  ctx.fillText("Contents", left - 4, 268);

  ctx.fillStyle = C.accent;
  roundRectPath(ctx, left, 300, 64, 6, 3);
  ctx.fill();

  const regions: Region[] = [];
  const top = 350;
  const avail = TEX_H - 150 - top;
  const rowH = Math.min(118, avail / Math.max(posts.length, 1));
  const small = rowH < 80;
  posts.forEach((post, i) => {
    const y = top + i * rowH;
    // number
    ctx.fillStyle = C.accent;
    ctx.font = `500 ${small ? 22 : 26}px ${SERIF}`;
    ctx.fillText(pad2(i + 1), left, y + (small ? 30 : 40));
    // title
    ctx.fillStyle = C.ink;
    ctx.font = `600 ${small ? 23 : 29}px ${SERIF}`;
    const pageLabel = String(2 * (i + 1) + 1);
    const titleMax = right - left - 62 - 60;
    const title = wrapLines(ctx, post.title, titleMax, 1)[0];
    ctx.fillText(title, left + 62, y + (small ? 30 : 40));
    const tw = ctx.measureText(title).width;
    // dotted leader
    ctx.fillStyle = C.rule;
    for (let dx = left + 62 + tw + 14; dx < right - 44; dx += 9) {
      ctx.beginPath();
      ctx.arc(dx, y + (small ? 26 : 35), 1.5, 0, Math.PI * 2);
      ctx.fill();
    }
    // page number
    ctx.fillStyle = C.inkSoft;
    ctx.font = `500 ${small ? 19 : 22}px ${SERIF}`;
    ctx.textAlign = "right";
    ctx.fillText(pageLabel, right, y + (small ? 30 : 40));
    ctx.textAlign = "left";
    // meta line
    if (!small) {
      ctx.fillStyle = C.muted;
      ctx.font = `400 18px ${SANS}`;
      ctx.fillText(`${formatDate(post.date)}  ·  ${post.tags.join(", ")}`, left + 62, y + 72);
    }
    regions.push({
      x: left - 10,
      y: y,
      w: right - left + 20,
      h: rowH - 8,
      action: { type: "goto", step: i + 2 },
    });
  });

  pageNumber(ctx, "right", 1);
  return regions;
}

function drawPostText(
  ctx: Ctx,
  post: PostSummary,
  index: number,
  compact: boolean,
  img: HTMLImageElement | null,
): Region[] {
  drawPaper(ctx, TEX_W, TEX_H, "right", 100 + index);
  runningHead(ctx, "right", site.name);
  const left = 95;
  const right = TEX_W - 75;
  const width = right - left;
  let y = 170;

  if (compact) {
    // On narrow screens only this page is in view, so it carries the picture too.
    const ih = 300;
    ctx.save();
    roundRectPath(ctx, left, 112, width, ih, 18);
    ctx.clip();
    ctx.fillStyle = C.mintSoft;
    ctx.fillRect(left, 112, width, ih);
    if (img) drawImageCover(ctx, img, left, 112, width, ih);
    ctx.restore();
    y = 112 + ih + 62;
  }

  // kicker
  ctx.fillStyle = C.accentStrong;
  ctx.font = `600 17px ${SANS}`;
  spacedText(
    ctx,
    `${formatDate(post.date)}  ·  ${post.readingMinutes} min read`.toUpperCase(),
    left,
    y,
    2.6,
  );
  y += 30;

  // title
  const titleSize = compact ? 50 : 60;
  const titleLead = compact ? 58 : 70;
  ctx.fillStyle = C.ink;
  ctx.font = `600 ${titleSize}px ${SERIF}`;
  const titleLines = wrapLines(ctx, post.title, width, compact ? 3 : 4);
  titleLines.forEach((line) => {
    y += titleLead;
    ctx.fillText(line, left - 2, y);
  });
  y += 38;

  // rule
  ctx.fillStyle = C.accent;
  roundRectPath(ctx, left, y, 64, 6, 3);
  ctx.fill();
  y += 44;

  // tags
  ctx.font = `500 19px ${SANS}`;
  let tx = left;
  post.tags.slice(0, 3).forEach((tag) => {
    const w = ctx.measureText(tag).width + 34;
    if (tx + w > right) return;
    ctx.fillStyle = C.mintSoft;
    roundRectPath(ctx, tx, y, w, 40, 20);
    ctx.fill();
    ctx.fillStyle = C.accentStrong;
    ctx.fillText(tag, tx + 17, y + 27);
    tx += w + 12;
  });
  y += 40 + 52;

  // excerpt
  const buttonY = TEX_H - 196;
  const lead = compact ? 40 : 43;
  ctx.fillStyle = C.inkSoft;
  ctx.font = `400 ${compact ? 25 : 26.5}px ${SANS}`;
  const maxLines = Math.max(2, Math.floor((buttonY - 40 - y) / lead) + 1);
  wrapLines(ctx, post.excerpt, width, maxLines).forEach((line, i) => {
    ctx.fillText(line, left, y + i * lead);
  });

  // read more button
  const bw = 250;
  const bh = 66;
  ctx.save();
  ctx.shadowColor = "rgba(10,122,92,0.28)";
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = C.accentStrong;
  roundRectPath(ctx, left, buttonY, bw, bh, bh / 2);
  ctx.fill();
  ctx.restore();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = `600 23px ${SANS}`;
  ctx.textAlign = "center";
  ctx.fillText("Read more  →", left + bw / 2, buttonY + 42);
  ctx.textAlign = "left";

  pageNumber(ctx, "right", 2 * (index + 1) + 1);
  // the whole page opens the post
  return [{ x: 0, y: 0, w: TEX_W, h: TEX_H, action: { type: "post", index } }];
}

function drawPostImage(
  ctx: Ctx,
  post: PostSummary,
  index: number,
  img: HTMLImageElement | null,
): Region[] {
  drawPaper(ctx, TEX_W, TEX_H, "left", 200 + index);
  runningHead(ctx, "left", post.tags[0] ?? site.tagline);
  const left = 75;
  const width = TEX_W - 75 - 95;
  const ih = Math.round(width * 0.8);
  const iy = 196;

  // plate with a soft shadow
  ctx.save();
  ctx.shadowColor = "rgba(40,50,45,0.22)";
  ctx.shadowBlur = 40;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = "#FFFFFF";
  roundRectPath(ctx, left, iy, width, ih, 20);
  ctx.fill();
  ctx.restore();
  ctx.save();
  roundRectPath(ctx, left, iy, width, ih, 20);
  ctx.clip();
  const g = ctx.createLinearGradient(left, iy, left + width, iy + ih);
  g.addColorStop(0, C.mintSoft);
  g.addColorStop(1, C.skySoft);
  ctx.fillStyle = g;
  ctx.fillRect(left, iy, width, ih);
  if (img) drawImageCover(ctx, img, left, iy, width, ih);
  ctx.restore();

  // caption
  let y = iy + ih + 62;
  ctx.fillStyle = C.accentStrong;
  ctx.font = `600 16px ${SANS}`;
  spacedText(ctx, `NOTE ${pad2(index + 1)}`, left, y, 3.2);
  y += 40;
  ctx.fillStyle = C.inkSoft;
  ctx.font = `italic 400 25px ${SERIF}`;
  wrapLines(ctx, post.title, width, 2).forEach((line, i) => {
    ctx.fillText(line, left, y + i * 34);
  });

  // large numeral
  ctx.fillStyle = "rgba(18,167,124,0.13)";
  ctx.font = `300 230px ${SERIF}`;
  ctx.textAlign = "right";
  ctx.fillText(pad2(index + 1), left + width + 6, TEX_H - 96);
  ctx.textAlign = "left";

  pageNumber(ctx, "left", 2 * (index + 1));
  return [{ x: 0, y: 0, w: TEX_W, h: TEX_H, action: { type: "post", index } }];
}

function drawBlank(ctx: Ctx) {
  drawPaper(ctx, TEX_W, TEX_H, "left", 999);
}

// ---------- covers ----------

type CoverMode = "color" | "orm";

/** In "orm" mode green carries roughness and blue carries metalness, for the foil stamp. */
function coverInks(mode: CoverMode) {
  return mode === "color"
    ? { linen: C.linen, cloth: C.cloth, foil: C.foil, ink: "#22313A", inkSoft: "#3F4E56" }
    : {
        linen: "rgb(0,236,0)",
        cloth: "rgb(0,244,0)",
        foil: "rgb(0,78,255)",
        ink: "rgb(0,205,0)",
        inkSoft: "rgb(0,215,0)",
      };
}

function drawWeave(ctx: Ctx, w: number, h: number, seed: number, strength = 1) {
  const r = rng(seed);
  ctx.save();
  ctx.lineWidth = 1;
  for (let y = 0; y < h; y += 3) {
    ctx.strokeStyle = `rgba(${r() > 0.5 ? "255,255,255" : "70,60,40"},${0.05 * strength + r() * 0.05 * strength})`;
    ctx.beginPath();
    ctx.moveTo(0, y + r());
    ctx.lineTo(w, y + r());
    ctx.stroke();
  }
  for (let x = 0; x < w; x += 3) {
    ctx.strokeStyle = `rgba(${r() > 0.5 ? "255,255,255" : "70,60,40"},${0.04 * strength + r() * 0.05 * strength})`;
    ctx.beginPath();
    ctx.moveTo(x + r(), 0);
    ctx.lineTo(x + r(), h);
    ctx.stroke();
  }
  ctx.restore();
}

const BAND = 112; // width of the cloth quarter binding

function drawCoverFront(ctx: Ctx, mode: CoverMode) {
  const w = TEX_W;
  const h = COVER_TEX_H;
  const ink = coverInks(mode);
  ctx.fillStyle = ink.linen;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink.cloth;
  ctx.fillRect(0, 0, BAND, h);
  if (mode === "color") {
    drawWeave(ctx, w, h, 5);
    // soft crease where the cloth meets the board
    const g = ctx.createLinearGradient(BAND - 14, 0, BAND + 14, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(BAND - 14, 0, 28, h);
  }
  const cx = BAND + (w - BAND) / 2;

  // foil frame
  ctx.strokeStyle = ink.foil;
  ctx.lineWidth = 3;
  roundRectPath(ctx, BAND + 44, 48, w - BAND - 88, h - 96, 10);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  roundRectPath(ctx, BAND + 56, 60, w - BAND - 112, h - 120, 6);
  ctx.stroke();

  horizonMotif(ctx, cx, 390, 250, ink.foil, 4);

  ctx.fillStyle = ink.foil;
  ctx.textAlign = "center";
  const [first, ...rest] = site.name.split(" ");
  ctx.font = `600 104px ${SERIF}`;
  ctx.fillText(first, cx, 540);
  ctx.fillText(rest.join(" "), cx, 656);

  ctx.font = `600 18px ${SANS}`;
  spacedText(ctx, site.tagline.toUpperCase(), cx, 734, 5, "center");

  // small ornament near the foot
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 46, h - 150);
  ctx.lineTo(cx - 16, h - 150);
  ctx.moveTo(cx + 16, h - 150);
  ctx.lineTo(cx + 46, h - 150);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, h - 150, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.textAlign = "left";
}

function drawCoverBack(ctx: Ctx, mode: CoverMode): Region[] {
  const w = TEX_W;
  const h = COVER_TEX_H;
  const ink = coverInks(mode);
  ctx.fillStyle = ink.linen;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = ink.cloth;
  ctx.fillRect(w - BAND, 0, BAND, h);
  if (mode === "color") {
    drawWeave(ctx, w, h, 8);
    const g = ctx.createLinearGradient(w - BAND - 14, 0, w - BAND + 14, 0);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(0.5, "rgba(0,0,0,0.16)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(w - BAND - 14, 0, 28, h);
  }
  const left = 84;
  const width = w - BAND - left - 70;

  ctx.fillStyle = ink.foil;
  ctx.font = `600 17px ${SANS}`;
  spacedText(ctx, "ABOUT THE AUTHOR", left, 170, 4);

  ctx.fillStyle = ink.ink;
  ctx.font = `600 66px ${SERIF}`;
  ctx.fillText(site.author, left - 3, 262);

  ctx.fillStyle = ink.foil;
  roundRectPath(ctx, left, 296, 64, 6, 3);
  ctx.fill();

  ctx.fillStyle = ink.inkSoft;
  ctx.font = `400 27px ${SANS}`;
  let y = 376;
  wrapLines(ctx, site.about, width, 10).forEach((line) => {
    ctx.fillText(line, left, y);
    y += 43;
  });

  const regions: Region[] = [];
  // contact
  y += 34;
  ctx.fillStyle = ink.ink;
  ctx.font = `600 17px ${SANS}`;
  spacedText(ctx, "SAY HELLO", left, y, 3.4);
  y += 44;
  ctx.fillStyle = ink.foil;
  ctx.font = `600 27px ${SERIF}`;
  ctx.fillText(site.contactEmail, left, y);
  const ew = ctx.measureText(site.contactEmail).width;
  ctx.fillRect(left, y + 8, ew, 2.5);
  regions.push({
    x: left - 10,
    y: y - 40,
    w: ew + 20,
    h: 62,
    action: { type: "link", href: `mailto:${site.contactEmail}` },
  });
  y += 52;
  ctx.font = `600 23px ${SANS}`;
  const li = "Connect on LinkedIn  ↗";
  ctx.fillText(li, left, y);
  const lw = ctx.measureText(li).width;
  regions.push({ x: left - 10, y: y - 34, w: lw + 20, h: 50, action: { type: "link", href: site.linkedin } });

  // archive link
  y += 76;
  const label = "Browse every post  →";
  ctx.font = `600 22px ${SANS}`;
  const bw = ctx.measureText(label).width + 56;
  ctx.strokeStyle = ink.foil;
  ctx.lineWidth = 2.5;
  roundRectPath(ctx, left, y - 40, bw, 62, 31);
  ctx.stroke();
  ctx.fillStyle = ink.foil;
  ctx.fillText(label, left + 28, y);
  regions.push({ x: left, y: y - 40, w: bw, h: 62, action: { type: "link", href: "/blog" } });

  horizonMotif(ctx, left + 60, h - 118, 120, ink.foil, 3);
  ctx.fillStyle = ink.inkSoft;
  ctx.font = `400 15px ${SANS}`;
  wrapLines(ctx, site.disclaimer, width - 150, 3).forEach((line, i) => {
    ctx.fillText(line, left + 150, h - 136 + i * 22);
  });
  return regions;
}

function drawEndpaper(ctx: Ctx, plate: boolean) {
  const w = TEX_W;
  const h = COVER_TEX_H;
  ctx.fillStyle = "#DCEFE6";
  ctx.fillRect(0, 0, w, h);
  // quiet pattern of small rising strokes
  ctx.strokeStyle = "rgba(18,167,124,0.30)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  const step = 46;
  for (let row = 0; row * step < h + step; row++) {
    for (let col = 0; col * step < w + step; col++) {
      const x = col * step + (row % 2 ? step / 2 : 0);
      const y = row * step;
      ctx.beginPath();
      ctx.moveTo(x - 9, y + 5);
      ctx.lineTo(x - 2, y - 2);
      ctx.lineTo(x + 3, y + 2);
      ctx.lineTo(x + 10, y - 6);
      ctx.stroke();
    }
  }
  if (!plate) return;
  // bookplate with a short welcome
  const pw = 500;
  const ph = 420;
  const px = (w - pw) / 2 - 10;
  const py = (h - ph) / 2 - 20;
  ctx.save();
  ctx.shadowColor = "rgba(20,60,45,0.18)";
  ctx.shadowBlur = 36;
  ctx.shadowOffsetY = 14;
  ctx.fillStyle = C.paper;
  roundRectPath(ctx, px, py, pw, ph, 16);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = C.accent;
  ctx.lineWidth = 2;
  roundRectPath(ctx, px + 16, py + 16, pw - 32, ph - 32, 8);
  ctx.stroke();
  const cx = px + pw / 2;
  horizonMotif(ctx, cx, py + 118, 150, C.accentStrong, 3);
  ctx.textAlign = "center";
  ctx.fillStyle = C.ink;
  ctx.font = `600 44px ${SERIF}`;
  ctx.fillText(site.name, cx, py + 196);
  ctx.fillStyle = C.inkSoft;
  ctx.font = `italic 400 23px ${SERIF}`;
  wrapLines(ctx, "A notebook on finding good businesses and paying a sensible price for them.", pw - 110, 3).forEach(
    (line, i) => ctx.fillText(line, cx, py + 250 + i * 33),
  );
  ctx.fillStyle = C.accentStrong;
  ctx.font = `600 15px ${SANS}`;
  spacedText(ctx, "TURN THE PAGE TO BEGIN", cx, py + ph - 52, 3.4, "center");
  ctx.textAlign = "left";
}

function drawSpine(ctx: Ctx, w: number, h: number, mode: CoverMode) {
  const ink = coverInks(mode);
  ctx.fillStyle = ink.cloth;
  ctx.fillRect(0, 0, w, h);
  if (mode === "color") drawWeave(ctx, w, h, 3);
  ctx.fillStyle = ink.foil === C.foil ? "#BFEBD9" : ink.foil;
  ctx.strokeStyle = ctx.fillStyle;
  ctx.fillRect(14, 70, w - 28, 3);
  ctx.fillRect(14, h - 73, w - 28, 3);
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.rotate(Math.PI / 2);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `600 ${Math.round(w * 0.42)}px ${SERIF}`;
  ctx.fillText(site.name, 0, 2);
  ctx.restore();
  ctx.textBaseline = "alphabetic";
}

// ---------- texture store ----------

const imageCache = new Map<string, Promise<HTMLImageElement>>();
function loadImage(src: string) {
  let p = imageCache.get(src);
  if (!p) {
    p = new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.decoding = "async";
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
    imageCache.set(src, p);
  }
  return p;
}

export async function loadBookFonts() {
  if (typeof document === "undefined" || !document.fonts) return;
  await Promise.all([
    document.fonts.load(`600 60px Fraunces`),
    document.fonts.load(`300 60px Fraunces`),
    document.fonts.load(`italic 400 24px Fraunces`),
    document.fonts.load(`400 24px Inter`),
    document.fonts.load(`600 24px Inter`),
  ]).catch(() => undefined);
}

export type TextureOptions = {
  /** Texture resolution multiplier. */
  scale: number;
  /** Narrow screens show one page at a time, so the text page also carries the image. */
  compact: boolean;
  anisotropy: number;
};

/**
 * Creates page and cover textures on demand and frees the ones far from the open spread.
 * Page ids: `R{sheet}` is the front of a sheet (a right-hand page), `L{sheet}` its back.
 */
export class BookTextures {
  private cache = new Map<string, THREE.CanvasTexture>();
  private regionMap = new Map<string, Region[]>();
  private disposed = false;

  constructor(
    private posts: PostSummary[],
    private opts: TextureOptions,
  ) {}

  regions(id: string) {
    return this.regionMap.get(id) ?? [];
  }

  peek(id: string) {
    return this.cache.get(id) ?? null;
  }

  get(id: string) {
    return this.cache.get(id) ?? this.build(id);
  }

  private canvas(h: number, w = TEX_W) {
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(w * this.opts.scale);
    canvas.height = Math.round(h * this.opts.scale);
    const ctx = canvas.getContext("2d")!;
    ctx.scale(this.opts.scale, this.opts.scale);
    return { canvas, ctx };
  }

  private finish(id: string, canvas: HTMLCanvasElement, color = true) {
    const tex = new THREE.CanvasTexture(canvas);
    if (color) tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = this.opts.anisotropy;
    tex.generateMipmaps = true;
    tex.minFilter = THREE.LinearMipmapLinearFilter;
    tex.needsUpdate = true;
    this.cache.set(id, tex);
    return tex;
  }

  private build(id: string): THREE.CanvasTexture {
    const n = this.posts.length;
    const { compact } = this.opts;

    if (id === "coverFront" || id === "coverFrontORM") {
      const { canvas, ctx } = this.canvas(COVER_TEX_H);
      drawCoverFront(ctx, id === "coverFront" ? "color" : "orm");
      return this.finish(id, canvas, id === "coverFront");
    }
    if (id === "coverBack" || id === "coverBackORM") {
      const { canvas, ctx } = this.canvas(COVER_TEX_H);
      const regions = drawCoverBack(ctx, id === "coverBack" ? "color" : "orm");
      if (id === "coverBack") this.regionMap.set(id, regions);
      return this.finish(id, canvas, id === "coverBack");
    }
    if (id === "coverInner" || id === "backInner") {
      const { canvas, ctx } = this.canvas(COVER_TEX_H);
      drawEndpaper(ctx, id === "coverInner");
      return this.finish(id, canvas);
    }
    if (id === "spine" || id === "spineORM") {
      const w = 124;
      const { canvas, ctx } = this.canvas(COVER_TEX_H, w);
      drawSpine(ctx, w, COVER_TEX_H, id === "spine" ? "color" : "orm");
      return this.finish(id, canvas, id === "spine");
    }

    const sheet = Number(id.slice(1));
    const { canvas, ctx } = this.canvas(TEX_H);
    let post: PostSummary | null = null;
    let postIndex = -1;
    const draw = (img: HTMLImageElement | null) => {
      ctx.clearRect(0, 0, TEX_W, TEX_H);
      let regions: Region[] = [];
      if (id[0] === "R") {
        if (sheet === 0) regions = drawContents(ctx, this.posts);
        else if (post) regions = drawPostText(ctx, post, postIndex, compact, img);
        else drawBlank(ctx);
      } else {
        if (post) regions = drawPostImage(ctx, post, postIndex, img);
        else drawBlank(ctx);
      }
      this.regionMap.set(id, regions);
    };

    let needsImage = false;
    if (id[0] === "R" && sheet >= 1 && sheet <= n) {
      postIndex = sheet - 1;
      post = this.posts[postIndex];
      needsImage = compact;
    } else if (id[0] === "L" && sheet < n) {
      postIndex = sheet;
      post = this.posts[postIndex];
      needsImage = true;
    }
    draw(null);
    const tex = this.finish(id, canvas);
    if (post && needsImage && post.coverImage) {
      loadImage(post.coverImage)
        .then((img) => {
          if (this.disposed || this.cache.get(id) !== tex) return;
          draw(img);
          tex.needsUpdate = true;
        })
        .catch(() => undefined);
    }
    return tex;
  }

  /** Free page textures that are far from the sheet currently being read. */
  prune(currentSheet: number, keep = 4) {
    for (const [id, tex] of this.cache) {
      if (id[0] !== "R" && id[0] !== "L") continue;
      const sheet = Number(id.slice(1));
      if (Number.isNaN(sheet)) continue;
      if (Math.abs(sheet - currentSheet) > keep) {
        tex.dispose();
        this.cache.delete(id);
        this.regionMap.delete(id);
      }
    }
  }

  dispose() {
    this.disposed = true;
    for (const tex of this.cache.values()) tex.dispose();
    this.cache.clear();
  }
}
