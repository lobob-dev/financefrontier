/** A small line of the share price since the call. It draws itself in when the page loads. */
export function Sparkline({ values, up, delay = 0, className = "" }: { values: number[]; up: boolean; delay?: number; className?: string }) {
  if (values.length < 2) return null;
  const W = 120;
  const H = 34;
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => [(i / (values.length - 1)) * W, H - 3 - ((v - lo) / span) * (H - 6)] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const colour = up ? "var(--accent)" : "#d9634c";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className={`overflow-visible ${className}`} aria-hidden="true">
      <path d={`${d} L${W} ${H} L0 ${H} Z`} fill={colour} opacity="0.1" />
      <path
        d={d}
        pathLength={1}
        fill="none"
        stroke={colour}
        strokeWidth="2"
        strokeLinejoin="round"
        strokeLinecap="round"
        className="sparkline-draw"
        style={{ animationDelay: `${delay}ms` }}
      />
      <circle cx={pts[0][0]} cy={pts[0][1]} r="2.5" fill="var(--muted)" />
      <circle cx={pts.at(-1)![0]} cy={pts.at(-1)![1]} r="3" fill={colour} className="sparkline-dot" style={{ animationDelay: `${delay + 900}ms` }} />
    </svg>
  );
}
