"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { PostSummary } from "@/lib/types";
import { site } from "@/lib/site";
import { useTheme } from "@/components/site/useTheme";
import { stepInfo, type BookAction } from "./constants";
import { createBookStore } from "./store";
import { FlipBook2D } from "./FlipBook2D";

const BookScene = dynamic(() => import("./BookScene"), { ssr: false });

type Mode = "3d" | "2d";
const MODE_KEY = "ff-book-view";
const STEP_KEY = "ff-book-step";

/** Decide once, on the visitor's device, whether the full 3D book is a good idea. */
function detectMode(): Mode {
  try {
    const params = new URLSearchParams(window.location.search);
    const forced = params.get("view") ?? localStorage.getItem(MODE_KEY);
    if (forced === "2d" || forced === "3d") return forced;
  } catch {
    // ignore storage errors
  }
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return "2d";
  const nav = navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } };
  if (nav.connection?.saveData) return "2d";
  if ((nav.hardwareConcurrency ?? 8) <= 2 || (nav.deviceMemory ?? 8) <= 2) return "2d";
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    if (!gl) return "2d";
  } catch {
    return "2d";
  }
  return "3d";
}

let cachedMode: Mode | null = null;
const modeListeners = new Set<() => void>();
function subscribeMode(cb: () => void) {
  modeListeners.add(cb);
  return () => modeListeners.delete(cb);
}
function getMode(): Mode {
  if (!cachedMode) cachedMode = detectMode();
  return cachedMode;
}
function chooseMode(mode: Mode) {
  cachedMode = mode;
  try {
    localStorage.setItem(MODE_KEY, mode);
  } catch {
    // ignore
  }
  modeListeners.forEach((cb) => cb());
}

function subscribeCompact(cb: () => void) {
  window.addEventListener("resize", cb);
  return () => window.removeEventListener("resize", cb);
}
const getCompact = () => window.innerWidth / window.innerHeight < 0.9;

export default function BookExperience({ posts }: { posts: PostSummary[] }) {
  const router = useRouter();
  const n = posts.length;
  const maxStep = n + 2;
  const theme = useTheme();
  const mode = useSyncExternalStore<Mode | null>(subscribeMode, getMode, () => null);
  const compact = useSyncExternalStore(subscribeCompact, getCompact, () => false);

  const store = useRef(createBookStore());
  const spacer = useRef<HTMLDivElement>(null);
  const stepPx = useRef(520);
  const rest = useRef(0);
  const [step, setStep] = useState(0);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const info = stepInfo(step, n);
  const currentPost = info.kind === "post" ? posts[info.index] : null;

  // ---------- moving through the book ----------

  const goTo = useCallback(
    (target: number) => {
      const t = Math.max(0, Math.min(maxStep, target));
      rest.current = t;
      if (getMode() === "3d") {
        window.scrollTo({ top: t * stepPx.current, behavior: "smooth" });
      } else {
        setStep(t);
      }
    },
    [maxStep],
  );
  const next = useCallback(() => goTo(rest.current + 1), [goTo]);
  const prev = useCallback(() => goTo(rest.current - 1), [goTo]);

  // In 3D the book is driven by the page's scroll position.
  useEffect(() => {
    if (mode !== "3d") return;
    const s = store.current;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let touching = false;

    const measure = () => {
      stepPx.current = Math.max(320, Math.min(620, window.innerHeight * 0.62));
      if (spacer.current) spacer.current.style.height = `${stepPx.current * maxStep + window.innerHeight}px`;
    };
    const hasScrollEnd = "onscrollend" in window;
    const settle = () => {
      if (touching) return;
      const v = window.scrollY / stepPx.current;
      const d = v - rest.current;
      if (Math.abs(d) < 0.02) return;
      // a small nudge is enough to turn the page; anything less springs back
      const t = Math.max(0, Math.min(maxStep, d > 0 ? Math.floor(v + 0.86) : Math.ceil(v - 0.86)));
      rest.current = t;
      window.scrollTo({ top: t * stepPx.current, behavior: "smooth" });
    };
    const onScroll = () => {
      const v = Math.max(0, Math.min(maxStep, window.scrollY / stepPx.current));
      s.target = v;
      setStep(Math.round(v));
      // browsers that report the end of a scroll tell us exactly when to settle; others get a short timer
      if (!hasScrollEnd) {
        clearTimeout(timer);
        timer = setTimeout(settle, 160);
      }
    };
    const onResize = () => {
      measure();
      window.scrollTo({ top: rest.current * stepPx.current, behavior: "instant" as ScrollBehavior });
    };
    const onTouchStart = () => {
      touching = true;
    };
    const onTouchEnd = () => {
      touching = false;
      clearTimeout(timer);
      timer = setTimeout(settle, 160);
    };

    if (process.env.NODE_ENV !== "production") {
      // lets tests and tinkering pose the book at any point of a page turn
      (window as unknown as { __book?: unknown }).__book = s;
    }
    measure();
    // come back to the same spread after reading a post
    let saved = 0;
    try {
      saved = Number(sessionStorage.getItem(STEP_KEY) ?? 0) || 0;
    } catch {
      saved = 0;
    }
    saved = Math.max(0, Math.min(maxStep, saved));
    rest.current = saved;
    s.target = saved;
    s.p = saved;
    s.zoom = 0;
    s.zoomT = 0;
    const prevRestoration = history.scrollRestoration;
    history.scrollRestoration = "manual";

    window.addEventListener("scroll", onScroll, { passive: true });
    // jumping to the saved spread fires a scroll event, which updates the controls
    window.scrollTo({ top: saved * stepPx.current, behavior: "instant" as ScrollBehavior });
    if (hasScrollEnd) window.addEventListener("scrollend", settle);
    window.addEventListener("resize", onResize);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });
    window.addEventListener("touchcancel", onTouchEnd, { passive: true });
    return () => {
      clearTimeout(timer);
      history.scrollRestoration = prevRestoration;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchend", onTouchEnd);
      window.removeEventListener("touchcancel", onTouchEnd);
    };
  }, [mode, maxStep]);

  useEffect(() => {
    try {
      sessionStorage.setItem(STEP_KEY, String(step));
    } catch {
      // ignore
    }
  }, [step]);

  // Arrow keys, and sideways swipes on touch screens.
  useEffect(() => {
    if (!mode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName))) return;
      const onButton = el && /^(BUTTON|A)$/.test(el.tagName);
      if (e.key === "ArrowRight" || e.key === "ArrowDown" || e.key === "PageDown" || (e.key === " " && !onButton)) {
        e.preventDefault();
        next();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault();
        prev();
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(maxStep);
      }
    };
    let sx = 0;
    let sy = 0;
    const onStart = (e: TouchEvent) => {
      sx = e.touches[0].clientX;
      sy = e.touches[0].clientY;
    };
    const onEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
        if (dx < 0) next();
        else prev();
      }
    };
    let wheelLock = 0;
    const onWheel = (e: WheelEvent) => {
      if (getMode() !== "2d") return;
      const now = Date.now();
      if (Math.abs(e.deltaY) < 24 || now - wheelLock < 520) return;
      wheelLock = now;
      if (e.deltaY > 0) next();
      else prev();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("touchstart", onStart, { passive: true });
    window.addEventListener("touchend", onEnd, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("touchstart", onStart);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("wheel", onWheel);
    };
  }, [mode, next, prev, goTo, maxStep]);

  // ---------- opening a post ----------

  const openPost = useCallback(
    (index: number) => {
      const post = posts[index];
      if (!post || leaving) return;
      const href = `/blog/${post.slug}`;
      if (getMode() !== "3d") {
        router.push(href);
        return;
      }
      router.prefetch(href);
      setLeaving(true);
      store.current.zoom = 1; // the camera flies into the page
      setTimeout(() => router.push(href), 720);
    },
    [posts, leaving, router],
  );

  const onAction = useCallback(
    (action: BookAction) => {
      if (action.type === "goto") goTo(action.step);
      else if (action.type === "post") openPost(action.index);
      else if (action.href.startsWith("mailto:")) window.location.href = action.href;
      else router.push(action.href);
    },
    [goTo, openPost, router],
  );
  const onReady = useCallback(() => setReady(true), []);

  const label =
    info.kind === "cover"
      ? "Cover"
      : info.kind === "contents"
        ? "Contents"
        : info.kind === "about"
          ? "About"
          : `Note ${info.index + 1} of ${n}`;

  const stepLabel = (i: number) => {
    const si = stepInfo(i, n);
    if (si.kind === "post") return posts[si.index].title;
    return si.kind === "cover" ? "Cover" : si.kind === "contents" ? "Contents" : "About me";
  };

  return (
    <div className="stage-bg relative min-h-[100svh]">
      {/* Real text for search engines, screen readers and anyone without the 3D view. */}
      <div className="sr-only">
        <h1>{site.name}</h1>
        <p>{site.description}</p>
        <h2>Latest posts</h2>
        <ol>
          {posts.map((post) => (
            <li key={post.slug}>
              <Link href={`/blog/${post.slug}`}>{post.title}</Link>: {post.excerpt}
            </li>
          ))}
        </ol>
        <p>
          <Link href="/blog">Browse every post</Link>
        </p>
      </div>

      {mode === "3d" && (
        <>
          <div ref={spacer} aria-hidden="true" />
          <div
            className="fixed inset-0 z-0 transition-opacity duration-700"
            style={{ opacity: ready ? 1 : 0 }}
            aria-hidden="true"
          >
            <BookScene
              posts={posts}
              store={store}
              compact={compact}
              dark={theme === "dark"}
              onAction={onAction}
              onReady={onReady}
            />
          </div>
          {!ready && (
            <div className="fixed inset-0 z-10 grid place-items-center" role="status">
              <p className="font-serif text-lg italic text-muted">Fetching the book from the shelf…</p>
            </div>
          )}
        </>
      )}

      {mode === "2d" && (
        <div className="fixed inset-0 z-0 grid place-items-center px-4 pb-36 pt-20">
          <FlipBook2D posts={posts} step={step} single={compact} onAction={onAction} />
        </div>
      )}

      {/* position rail, shaped like a bookmark ribbon */}
      {mode && (
        <nav
          aria-label="Pages of the book"
          className="fixed right-3 top-1/2 z-20 hidden -translate-y-1/2 flex-col items-end gap-2 sm:right-5 md:flex"
        >
          {Array.from({ length: maxStep + 1 }, (_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => goTo(i)}
              aria-label={stepLabel(i)}
              aria-current={i === step ? "step" : undefined}
              title={stepLabel(i)}
              className="group flex h-4 items-center justify-end"
            >
              <span
                className={
                  i === step
                    ? "h-2.5 w-9 bg-accent transition-all duration-300 [clip-path:polygon(0_50%,22%_0,100%_0,100%_100%,22%_100%)]"
                    : "h-1 w-3.5 rounded-full bg-ink/20 transition-all duration-300 group-hover:w-6 group-hover:bg-accent/70"
                }
              />
            </button>
          ))}
        </nav>
      )}

      {/* controls */}
      {mode && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-20 flex flex-col items-center gap-3 px-4 pb-5 sm:pb-7">
          <div className="pointer-events-auto flex min-h-12 items-center gap-2">
            {info.kind === "cover" && (
              <button
                type="button"
                onClick={() => goTo(1)}
                className="rounded-full bg-accent-strong px-7 py-3 text-[0.95rem] font-semibold text-on-accent shadow-lift transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Open the book
              </button>
            )}
            {info.kind === "contents" && (
              <p className="rounded-full bg-surface/70 px-4 py-2 text-sm text-ink-soft shadow-soft backdrop-blur">
                Scroll, swipe or use the arrow keys to turn the page
              </p>
            )}
            {currentPost && info.kind === "post" && (
              <Link
                href={`/blog/${currentPost.slug}`}
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  openPost(info.index);
                }}
                className="rounded-full bg-accent-strong px-7 py-3 text-[0.95rem] font-semibold text-on-accent shadow-lift transition hover:-translate-y-0.5 hover:brightness-110"
              >
                Read this post <span aria-hidden="true">→</span>
              </Link>
            )}
            {info.kind === "about" && (
              <>
                <a
                  href={`mailto:${site.contactEmail}`}
                  className="rounded-full bg-accent-strong px-6 py-3 text-[0.95rem] font-semibold text-on-accent shadow-lift transition hover:-translate-y-0.5 hover:brightness-110"
                >
                  Get in touch
                </a>
                <Link
                  href="/blog"
                  className="rounded-full border border-line bg-surface/80 px-6 py-3 text-[0.95rem] font-semibold text-ink shadow-soft backdrop-blur transition hover:-translate-y-0.5"
                >
                  All posts
                </Link>
              </>
            )}
          </div>

          <div className="pointer-events-auto flex items-center gap-1 rounded-full border border-line bg-surface/80 p-1.5 shadow-soft backdrop-blur">
            <button
              type="button"
              onClick={prev}
              disabled={step <= 0}
              aria-label="Previous page"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition hover:bg-accent-soft hover:text-accent-strong disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 5l-7 7 7 7" />
              </svg>
            </button>
            <p className="min-w-32 px-2 text-center text-sm font-medium text-ink" aria-live="polite">
              {label}
            </p>
            <button
              type="button"
              onClick={next}
              disabled={step >= maxStep}
              aria-label="Next page"
              className="grid h-10 w-10 place-items-center rounded-full text-ink-soft transition hover:bg-accent-soft hover:text-accent-strong disabled:opacity-30 disabled:hover:bg-transparent"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {mode && (
        <button
          type="button"
          onClick={() => {
            const nextMode = mode === "3d" ? "2d" : "3d";
            setReady(false);
            rest.current = step;
            try {
              sessionStorage.setItem(STEP_KEY, String(step));
            } catch {
              // ignore
            }
            if (nextMode === "2d") window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
            chooseMode(nextMode);
          }}
          className="fixed bottom-5 left-4 z-20 hidden rounded-full px-3 py-2 text-xs font-medium text-muted transition hover:text-accent-strong sm:left-6 sm:bottom-7 md:block"
        >
          {mode === "3d" ? "Switch to simple view" : "Switch to 3D view"}
        </button>
      )}

      {/* soft wash that covers the zoom into a post */}
      <div
        className="pointer-events-none fixed inset-0 z-40 bg-bg transition-opacity duration-500"
        style={{ opacity: leaving ? 1 : 0, transitionDelay: leaving ? "220ms" : "0ms" }}
        aria-hidden="true"
      />
    </div>
  );
}
