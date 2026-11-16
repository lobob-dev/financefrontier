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
