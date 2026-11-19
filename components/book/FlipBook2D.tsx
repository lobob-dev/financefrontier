"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { PostSummary } from "@/lib/types";
import { site } from "@/lib/site";
import { formatDate, pad2 } from "@/lib/format";
import { stepInfo, type BookAction } from "./constants";

/**
 * The simple book. Used when 3D is not a good idea: reduced-motion settings,
 * low-power devices, or browsers without WebGL. Plain HTML, so it is light and accessible.
 */

type Props = {
  posts: PostSummary[];
  step: number;
  /** Narrow screens show one page at a time. */
  single: boolean;
  onAction: (action: BookAction) => void;
};

function subscribeMotion(cb: () => void) {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const getReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function Horizon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 50"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M4 42h112" />
      <path d="M42 42a18 18 0 0 1 36 0" />
      <path d="M60 14v-8M38 22l-6-6M82 22l6-6" />
    </svg>
  );
}

/** The closed cover, also shown as a placeholder while the 3D book loads. */
export function Cover() {
  const [first, ...rest] = site.name.split(" ");
  return (
    <div
      className="paper-page relative h-full overflow-hidden rounded-r-xl rounded-l-sm shadow-lift"
      style={{ background: "#ECE8DC" }}
    >
      <div
        className="absolute inset-y-0 left-0 w-[14%]"
        style={{ background: "#0F6E57" }}
      />
      <div
        className="absolute inset-y-[4%] left-[19%] right-[5%] rounded-md border-2"
        style={{ borderColor: "#11936F" }}
      />
      <div
        className="absolute inset-0 left-[14%] flex flex-col items-center justify-center text-center"
        style={{ color: "#0D7F60" }}
      >
        <Horizon className="mb-[5cqw] w-[30cqw]" />
        <p className="font-serif text-[length:13cqw] font-semibold leading-[1.08]">
          {first}
          <br />
          {rest.join(" ")}
        </p>
        <p className="mt-[5cqw] text-[length:2.2cqw] font-semibold uppercase tracking-[0.3em]">
          {site.tagline}
        </p>
      </div>
    </div>
  );
}

function Welcome() {
  return (
    <div
      className="paper-page grid h-full place-items-center rounded-l-xl"
      style={{ background: "#E4F3EC" }}
    >
      <div className="w-[64%] rounded-lg bg-paper p-[6cqw] text-center shadow-soft">
        <Horizon className="mx-auto w-[18cqw] text-[#0A7A5C]" />
        <p className="mt-[3cqw] font-serif text-[length:5.5cqw] font-semibold">
          {site.name}
        </p>
        <p className="mt-[2cqw] font-serif text-[length:2.9cqw] italic text-[#44525C]">
          A notebook on finding good businesses and paying a sensible price for
          them.
        </p>
      </div>
    </div>
  );
}

function Contents({
  posts,
  onAction,
  rounded,
}: {
  posts: PostSummary[];
  onAction: Props["onAction"];
  rounded: string;
}) {
  return (
    <div className={`paper-page h-full overflow-hidden ${rounded}`}>
      <div className="h-full px-[11cqw] pb-[8cqw] pt-[14cqw]">
        <p className="text-[length:2.1cqw] font-semibold uppercase tracking-[0.2em] text-[#0A7A5C]">
          Latest notes, newest first
        </p>
        <h2 className="mt-[2cqw] font-serif text-[length:10cqw] font-semibold leading-none">
          Contents
        </h2>
        <div className="mt-[3.5cqw] h-[0.8cqw] w-[8cqw] rounded-full bg-[#12A77C]" />
        <ol className="mt-[6cqw] space-y-[4.5cqw]">
          {posts.map((post, i) => (
            <li key={post.slug}>
              <button
                type="button"
                onClick={() => onAction({ type: "goto", step: i + 2 })}
                className="flex w-full items-baseline gap-[3cqw] text-left"
              >
                <span className="font-serif text-[length:3.2cqw] text-[#12A77C]">
                  {pad2(i + 1)}
                </span>
                <span className="flex-1">
                  <span className="block font-serif text-[length:3.6cqw] font-semibold leading-snug">
                    {post.title}
                  </span>
                  <span className="mt-[0.6cqw] block text-[length:2.2cqw] text-[#7C8891]">
                    {formatDate(post.date)} · {post.tags.join(", ")}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

function PostImage({ post, index }: { post: PostSummary; index: number }) {
  return (
    <div className="paper-page h-full overflow-hidden rounded-l-xl">
      <div className="h-full px-[10cqw] pt-[22cqw]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.coverImage}
          alt={post.coverAlt}
          loading="lazy"
          className="max-h-[70cqw] w-full rounded-[2.5cqw] bg-white object-contain shadow-soft"
        />
        <p className="mt-[6cqw] text-[length:2cqw] font-semibold uppercase tracking-[0.2em] text-[#0A7A5C]">
          Note {pad2(index + 1)}
        </p>
        <p className="mt-[1.5cqw] font-serif text-[length:3.1cqw] italic text-[#44525C]">
          {post.title}
        </p>
      </div>
    </div>
  );
}

function PostText({
  post,
  index,
  withImage,
  onAction,
  rounded,
}: {
  post: PostSummary;
  index: number;
  withImage: boolean;
  onAction: Props["onAction"];
  rounded: string;
}) {
  return (
    <div className={`paper-page h-full overflow-hidden ${rounded}`}>
      <div className="flex h-full flex-col px-[11cqw] pb-[10cqw] pt-[13cqw]">
        {withImage && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.coverImage}
            alt={post.coverAlt}
            loading="lazy"
            className="mb-[6cqw] aspect-[2/1] w-full rounded-[2.5cqw] object-cover"
          />
        )}
        <p className="text-[length:2.1cqw] font-semibold uppercase tracking-[0.16em] text-[#0A7A5C]">
          {formatDate(post.date)} · {post.readingMinutes} min read
        </p>
        <h2 className="mt-[3cqw] font-serif text-[length:7.4cqw] font-semibold leading-[1.14]">
          {post.title}
        </h2>
        <div className="mt-[4cqw] h-[0.8cqw] w-[8cqw] shrink-0 rounded-full bg-[#12A77C]" />
        <ul className="mt-[4.5cqw] flex flex-wrap gap-[1.5cqw]">
          {post.tags.map((tag) => (
            <li
              key={tag}
              className="rounded-full bg-[#DDF3EA] px-[2.2cqw] py-[0.8cqw] text-[length:2.3cqw] font-medium text-[#0A7A5C]"
            >
              {tag}
            </li>
          ))}
        </ul>
        <p className="mt-[5cqw] line-clamp-6 text-[length:3.25cqw] leading-[1.62] text-[#44525C]">
          {post.excerpt}
        </p>
        <button
          type="button"
          onClick={() => onAction({ type: "post", index })}
          className="mt-auto self-start rounded-full bg-[#0A7A5C] px-[4.5cqw] py-[2.2cqw] text-[length:2.9cqw] font-semibold text-white"
        >
          Read more →
        </button>
      </div>
    </div>
  );
}

function About({ onAction }: { onAction: Props["onAction"] }) {
  return (
    <div
      className="paper-page relative h-full overflow-hidden rounded-l-xl rounded-r-sm shadow-lift"
      style={{ background: "#ECE8DC" }}
    >
      <div
        className="absolute inset-y-0 right-0 w-[14%]"
        style={{ background: "#0F6E57" }}
      />
      <div className="absolute inset-0 right-[14%] px-[10cqw] pt-[16cqw]">
        <p className="text-[length:2.1cqw] font-semibold uppercase tracking-[0.24em] text-[#0A7A5C]">
          About the author
        </p>
        <h2 className="mt-[2cqw] font-serif text-[length:8.2cqw] font-semibold text-[#2B3A40]">
          {site.author}
        </h2>
        <div className="mt-[3.5cqw] h-[0.8cqw] w-[8cqw] rounded-full bg-[#11936F]" />
        <p className="mt-[5.5cqw] text-[length:3.1cqw] leading-[1.62] text-[#55646A]">
          {site.about}
        </p>
        <p className="mt-[6cqw] text-[length:2.1cqw] font-semibold uppercase tracking-[0.2em] text-[#2B3A40]">
          Say hello
        </p>
        <a
          href={`mailto:${site.contactEmail}`}
          className="mt-[1.5cqw] inline-block font-serif text-[length:3.4cqw] font-semibold text-[#0A7A5C] underline underline-offset-4"
        >
          {site.contactEmail}
        </a>
        <a
          href={site.linkedin}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-[2.5cqw] block text-[length:2.8cqw] font-semibold text-[#0A7A5C]"
        >
          Connect on LinkedIn ↗
        </a>
        <div>
          <button
            type="button"
            onClick={() => onAction({ type: "link", href: "/blog" })}
            className="mt-[5cqw] rounded-full border-2 border-[#11936F] px-[3.5cqw] py-[1.6cqw] text-[length:2.7cqw] font-semibold text-[#0A7A5C]"
          >
            Browse every post →
          </button>
        </div>
      </div>
    </div>
  );
}

export function FlipBook2D({ posts, step, single, onAction }: Props) {
  const n = posts.length;
  const reduced = useSyncExternalStore(
    subscribeMotion,
    getReducedMotion,
    () => false,
  );
  const [shown, setShown] = useState(step);
  const [anim, setAnim] = useState<{
    from: number;
    to: number;
    phase: 1 | 2;
  } | null>(null);
  const isSpread = (s: number) => s >= 1 && s <= n + 1;

  useEffect(() => {
    if (step === shown || anim) return;
    const flip = !single && !reduced && isSpread(step) && isSpread(shown);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the displayed page follows the step prop, with a flip in between
    if (flip) setAnim({ from: shown, to: step, phase: 1 });
    else setShown(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, shown, anim, single, reduced]);

  const left = (s: number) => {
    const info = stepInfo(s, n);
    if (info.kind === "contents") return <Welcome />;
    if (info.kind === "post")
      return <PostImage post={posts[info.index]} index={info.index} />;
    return null;
  };
  const right = (s: number, rounded = "rounded-r-xl") => {
    const info = stepInfo(s, n);
    if (info.kind === "contents")
      return <Contents posts={posts} onAction={onAction} rounded={rounded} />;
    if (info.kind === "post")
      return (
        <PostText
          post={posts[info.index]}
          index={info.index}
          withImage={single}
          onAction={onAction}
          rounded={rounded}
        />
      );
    return null;
  };

  const info = stepInfo(shown, n);
  const pageHeight = "min(72svh, calc((100vw - 2rem) * 1.4))";

  // closed book, front or back, and every page on a narrow screen
  if (info.kind === "cover" || info.kind === "about" || single) {
    return (
      <div
        key={shown}
        className="fade-in"
        style={{ height: pageHeight, aspectRatio: "800 / 1120" }}
      >
        {info.kind === "cover" ? (
          <button
            type="button"
            onClick={() => onAction({ type: "goto", step: 1 })}
            className="block h-full w-full text-left"
            aria-label="Open the book"
          >
            <Cover />
          </button>
        ) : info.kind === "about" ? (
          <About onAction={onAction} />
        ) : (
          <div className="h-full overflow-hidden rounded-xl shadow-lift">
            {right(shown, "rounded-xl")}
          </div>
        )}
      </div>
    );
  }

  const spreadHeight = "min(70svh, calc((100vw - 3rem) * 0.7))";
  const forward = anim ? anim.to > anim.from : true;
  const baseLeft = anim ? (forward ? anim.from : anim.to) : shown;
  const baseRight = anim ? (forward ? anim.to : anim.from) : shown;
  // the flipping leaf: first the old page folds toward the spine, then the new one unfolds
  let leaf: {
    side: "left" | "right";
    content: React.ReactNode;
    cls: string;
  } | null = null;
  if (anim) {
    if (forward) {
      leaf =
        anim.phase === 1
          ? {
              side: "right",
              content: right(anim.from),
              cls: "flip-out origin-left",
            }
          : {
              side: "left",
              content: left(anim.to),
              cls: "flip-in origin-right",
            };
    } else {
      leaf =
        anim.phase === 1
          ? {
              side: "left",
              content: left(anim.from),
              cls: "flip-out origin-right",
            }
          : {
              side: "right",
              content: right(anim.to),
              cls: "flip-in origin-left",
            };
    }
  }
  const coveredLeft =
    anim && ((forward && anim.phase === 2) || (!forward && anim.phase === 1));
  const coveredRight =
    anim && ((forward && anim.phase === 1) || (!forward && anim.phase === 2));

  return (
    <div
      className="fade-in relative flex rounded-xl shadow-lift"
      style={{ height: spreadHeight, aspectRatio: "1600 / 1120" }}
    >
      <div
        className="relative h-full w-1/2"
        aria-hidden={coveredLeft ? true : undefined}
      >
        {left(anim && !forward && anim.phase === 2 ? anim.to : baseLeft)}
      </div>
      <div
        className="relative h-full w-1/2"
        aria-hidden={coveredRight ? true : undefined}
      >
        {right(anim && forward && anim.phase === 2 ? anim.to : baseRight)}
      </div>
      {/* gutter shading */}
      <div className="pointer-events-none absolute inset-y-0 left-1/2 w-16 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/10 to-transparent" />
      {leaf && (
        <div
          key={`${anim!.from}-${anim!.to}-${anim!.phase}`}
          className={`absolute inset-y-0 w-1/2 ${leaf.side === "left" ? "left-0" : "left-1/2"} ${leaf.cls}`}
          onAnimationEnd={() => {
            if (!anim) return;
            if (anim.phase === 1) setAnim({ ...anim, phase: 2 });
            else {
              setShown(anim.to);
              setAnim(null);
            }
          }}
        >
          {leaf.content}
        </div>
      )}
    </div>
  );
}
