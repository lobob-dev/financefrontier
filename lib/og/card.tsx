import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

/** The picture shown when a link to the site is shared. */
export function ogCard({ title, kicker }: { title: string; kicker: string }) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(160deg, #0f1a22 0%, #13262e 55%, #0f3b30 100%)",
          color: "#eaf1f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: "#5be0b6" }}>
          <svg width="48" height="48" viewBox="0 0 32 32" fill="none" stroke="#5be0b6" strokeWidth="2" strokeLinecap="round">
            <path d="M4 21h24" />
            <path d="M10.5 21a5.5 5.5 0 0 1 11 0" />
            <path d="M16 11.5V9M9.3 14.3 7.5 12.5M22.7 14.3l1.8-1.8" />
          </svg>
          <span style={{ color: "#eaf1f0", fontWeight: 700 }}>{site.name}</span>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <span style={{ fontSize: 26, letterSpacing: 4, textTransform: "uppercase", color: "#5be0b6" }}>{kicker}</span>
          <span style={{ fontSize: title.length > 60 ? 58 : 70, fontWeight: 700, lineHeight: 1.1, maxWidth: 1000 }}>{title}</span>
        </div>
        <div style={{ display: "flex", height: 6, width: 220, borderRadius: 3, background: "#12a77c" }} />
      </div>
    ),
    ogSize,
  );
}

const VERDICT_COLOURS: Record<string, { bg: string; fg: string }> = {
  buy: { bg: "#12a77c", fg: "#ffffff" },
  hold: { bg: "#2f86c5", fg: "#ffffff" },
  watch: { bg: "#e9b949", fg: "#2b2205" },
  avoid: { bg: "#d9634c", fg: "#ffffff" },
};

/** The share picture for a post with a company snapshot: ticker, verdict and the move since the call. */
export function ogPickCard(p: {
  title: string;
  company: string;
  listing: string;
  verdict: string;
  verdictLabel: string;
  change: number | null;
  since: string;
  vsMarket: string | null;
}) {
  const colours = VERDICT_COLOURS[p.verdict] ?? VERDICT_COLOURS.watch;
  const up = (p.change ?? 0) >= 0;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 76px",
          background: "linear-gradient(160deg, #0f1a22 0%, #13262e 55%, #0f3b30 100%)",
          color: "#eaf1f0",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, fontSize: 28 }}>
            <svg width="44" height="44" viewBox="0 0 32 32" fill="none" stroke="#5be0b6" strokeWidth="2" strokeLinecap="round">
              <path d="M4 21h24" />
              <path d="M10.5 21a5.5 5.5 0 0 1 11 0" />
              <path d="M16 11.5V9M9.3 14.3 7.5 12.5M22.7 14.3l1.8-1.8" />
            </svg>
            <span style={{ fontWeight: 700 }}>{site.name}</span>
          </div>
          <span style={{ fontSize: 24, color: "#93a3a9" }}>By {site.author}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 40 }}>
          <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
            <span style={{ fontSize: 26, letterSpacing: 4, color: "#5be0b6", textTransform: "uppercase" }}>{p.listing}</span>
            <span style={{ fontSize: 76, fontWeight: 700, lineHeight: 1.05, marginTop: 10 }}>{p.company}</span>
            <span style={{ fontSize: 30, color: "#c3cfd0", marginTop: 18, lineHeight: 1.3 }}>{p.title}</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", minWidth: 300 }}>
            <span
              style={{
                display: "flex",
                background: colours.bg,
                color: colours.fg,
                borderRadius: 999,
                padding: "10px 30px",
                fontSize: 34,
                fontWeight: 700,
                letterSpacing: 2,
                textTransform: "uppercase",
              }}
            >
              {p.verdictLabel}
            </span>
            {p.change !== null && (
              <span style={{ fontSize: 84, fontWeight: 700, marginTop: 20, color: up ? "#5be0b6" : "#f08f7a" }}>
                {up ? "▲" : "▼"} {Math.abs(p.change).toFixed(1)}%
              </span>
            )}
            <span style={{ fontSize: 26, color: "#93a3a9" }}>since the call on {p.since}</span>
            {p.vsMarket && <span style={{ fontSize: 26, color: "#c3cfd0", marginTop: 6 }}>{p.vsMarket}</span>}
          </div>
        </div>
      </div>
    ),
    ogSize,
  );
}
