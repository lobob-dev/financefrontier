"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Node, mergeAttributes } from "@tiptap/core";
import { NodeViewWrapper, ReactNodeViewRenderer, type ReactNodeViewProps } from "@tiptap/react";
import {
  EXCHANGES,
  VERDICTS,
  emptySnapshot,
  formatMoney,
  parsePrice,
  readSnapshot,
  type StockSnapshot,
  type Verdict,
} from "@/lib/content/stock";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    stockSnapshot: { insertStockSnapshot: () => ReturnType };
  }
}

/** The company snapshot box as a block in the editor. */
export const StockSnapshotNode = Node.create({
  name: "stockSnapshot",
  group: "block",
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return Object.fromEntries(
      Object.entries(emptySnapshot).map(([key, value]) => [key, { default: value }]),
    );
  },

  parseHTML() {
    return [
      {
        tag: "aside[data-stock]",
        getAttrs: (el) => {
          try {
            return readSnapshot(JSON.parse((el as HTMLElement).getAttribute("data-stock") ?? "{}"));
          } catch {
            return false;
          }
        },
      },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return ["aside", mergeAttributes(HTMLAttributes, { "data-stock": JSON.stringify(node.attrs) })];
  },

  addCommands() {
    return {
      insertStockSnapshot:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { ...emptySnapshot, metrics: emptySnapshot.metrics.map((m) => ({ ...m })) } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(SnapshotView);
  },
});

function SnapshotView({ node, updateAttributes, deleteNode, selected }: ReactNodeViewProps) {
  const s = readSnapshot(node.attrs);
  const blank = !s.company && !s.ticker;
  const [open, setOpen] = useState(blank);
  const price = parsePrice(s.price);

  return (
    <NodeViewWrapper
      as="div"
      contentEditable={false}
      data-drag-handle
      className={`not-prose my-6 rounded-2xl border bg-bg-soft p-4 ${selected ? "border-accent ring-2 ring-accent/30" : "border-line"}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-accent-strong">Company snapshot</p>
          <p className="font-serif text-xl font-semibold text-ink">{s.company || "New company"}</p>
          <p className="text-sm text-muted">
            {[s.exchange !== "Other" ? s.exchange : "", s.ticker].filter(Boolean).join(": ") || "No ticker yet"}
            {price !== null && <> · {formatMoney(price, s.currency)} when written</>}
          </p>
        </div>
        <span className="rounded-full bg-surface px-3 py-1 text-sm font-semibold text-ink ring-1 ring-line">
          {VERDICTS[s.verdict].label}
        </span>
      </div>
      <div className="mt-3 flex gap-2">
        <button type="button" className="btn-quiet" onClick={() => setOpen(true)}>
          Edit snapshot
        </button>
        <button type="button" className="btn-danger" onClick={() => deleteNode()}>
          Remove
        </button>
      </div>
      {open && (
        <SnapshotForm
          initial={s}
          onCancel={() => (blank ? deleteNode() : setOpen(false))}
          onSave={(next) => {
            updateAttributes(next);
            setOpen(false);
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

function SnapshotForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: StockSnapshot;
  onSave: (s: StockSnapshot) => void;
  onCancel: () => void;
}) {
  const [s, setS] = useState<StockSnapshot>({ ...initial, metrics: initial.metrics.map((m) => ({ ...m })) });
  const set = <K extends keyof StockSnapshot>(key: K, value: StockSnapshot[K]) => setS((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onCancel();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const metric = (i: number, key: "label" | "value", value: string) =>
    setS((prev) => ({ ...prev, metrics: prev.metrics.map((m, j) => (j === i ? { ...m, [key]: value } : m)) }));

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="snap-title"
        className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-line bg-surface p-6 shadow-lift"
        onSubmit={(e) => {
          e.preventDefault();
          onSave({ ...s, ticker: s.ticker.trim().toUpperCase(), metrics: s.metrics.filter((m) => m.label.trim()) });
        }}
      >
        <h2 id="snap-title" className="font-serif text-2xl font-semibold">Company snapshot</h2>
        <p className="mt-1 text-sm text-ink-soft">
          A summary box for the top of the post. It also adds this pick to your track record page, which shows how the
          share price has moved since you wrote about it.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="snap-company" className="label">Company name</label>
            <input id="snap-company" className="field" value={s.company} onChange={(e) => set("company", e.target.value)} placeholder="Microsoft" autoFocus />
          </div>
          <div>
            <label htmlFor="snap-ticker" className="label">Ticker</label>
            <input id="snap-ticker" className="field uppercase" value={s.ticker} onChange={(e) => set("ticker", e.target.value)} placeholder="MSFT" />
          </div>
          <div>
            <label htmlFor="snap-exchange" className="label">Exchange</label>
            <select id="snap-exchange" className="field" value={s.exchange} onChange={(e) => {
              const exchange = e.target.value as StockSnapshot["exchange"];
              setS((prev) => ({ ...prev, exchange, currency: exchange === "ASX" ? "AUD" : exchange === "LSE" ? "GBP" : exchange === "TSX" ? "CAD" : prev.currency === "AUD" ? "USD" : prev.currency }));
            }}>
              {EXCHANGES.map((x) => <option key={x} value={x}>{x}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="snap-price" className="label">Share price when written</label>
            <input id="snap-price" className="field" inputMode="decimal" value={s.price} onChange={(e) => set("price", e.target.value)} placeholder="370.17" />
          </div>
          <div>
            <label htmlFor="snap-currency" className="label">Currency</label>
            <select id="snap-currency" className="field" value={s.currency} onChange={(e) => set("currency", e.target.value)}>
              {["USD", "AUD", "GBP", "EUR", "CAD"].map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <fieldset className="mt-5">
          <legend className="label">My verdict</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {(Object.keys(VERDICTS) as Verdict[]).map((v) => (
              <label key={v} className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-sm font-semibold transition ${s.verdict === v ? "border-accent bg-accent-soft text-accent-strong" : "border-line text-ink-soft hover:border-accent"}`}>
                <input type="radio" name="verdict" value={v} checked={s.verdict === v} onChange={() => set("verdict", v)} className="sr-only" />
                {VERDICTS[v].label}
              </label>
            ))}
          </div>
          <p className="hint">{VERDICTS[s.verdict].note}</p>
        </fieldset>

        <div className="mt-5">
          <p className="label">Key numbers (leave a value empty to hide it)</p>
          <div className="space-y-2">
            {s.metrics.map((m, i) => (
              <div key={i} className="flex gap-2">
                <input aria-label={`Number ${i + 1} name`} className="field" value={m.label} onChange={(e) => metric(i, "label", e.target.value)} placeholder="Market cap" />
                <input aria-label={`Number ${i + 1} value`} className="field" value={m.value} onChange={(e) => metric(i, "value", e.target.value)} placeholder="US$2.8T" />
                <button type="button" aria-label={`Remove number ${i + 1}`} className="btn-quiet shrink-0 px-3" onClick={() => setS((prev) => ({ ...prev, metrics: prev.metrics.filter((_, j) => j !== i) }))}>×</button>
              </div>
            ))}
          </div>
          {s.metrics.length < 6 && (
            <button type="button" className="mt-2 text-sm font-semibold text-accent-strong hover:underline" onClick={() => setS((prev) => ({ ...prev, metrics: [...prev.metrics, { label: "", value: "" }] }))}>
              + Add a number
            </button>
          )}
        </div>

        <div className="mt-5">
          <label htmlFor="snap-summary" className="label">One-line summary (optional)</label>
          <textarea id="snap-summary" rows={2} maxLength={280} className="field resize-y" value={s.summary} onChange={(e) => set("summary", e.target.value)} placeholder="A fortress balance sheet at a fair price." />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="btn-quiet" onClick={onCancel}>Cancel</button>
          <button type="submit" className="btn-primary" disabled={!s.company.trim() && !s.ticker.trim()}>Save snapshot</button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
