"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import type { AdminPost } from "@/lib/types";
import type { DocNode } from "@/lib/content/doc";
import { readingMinutes, wordCount } from "@/lib/content/doc";
import { renderDoc } from "@/lib/content/render";
import { formatDate, slugify } from "@/lib/format";
import { deletePost, publishPost, savePost, unpublishPost, type PostInput, type SaveResult } from "@/app/admin/actions";
import { RichEditor } from "./RichEditor";
import { CoverField } from "./CoverField";
import { TagInput } from "./TagInput";
import { useNow } from "./useNow";

/** Whether there are unsaved changes is worked out from the data, not stored. */
type SaveState =
  | { kind: "saved"; at: Date }
  | { kind: "saving" }
  | { kind: "error"; message: string };

const AUTOSAVE_MS = 1500;

/** "2026-11-16T09:30" in the browser's own time zone, for a datetime-local field. */
function toLocalInput(iso: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function PostEditor({ initial, knownTags }: { initial: AdminPost; knownTags: string[] }) {
  const [post, setPost] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [slug, setSlug] = useState(initial.slug.startsWith("untitled-") ? "" : initial.slug);
  // The address follows the title until it is edited by hand or the post has been published.
  const [slugTouched, setSlugTouched] = useState(
    initial.status === "published" ||
      (!initial.slug.startsWith("untitled-") && initial.slug !== slugify(initial.title)),
  );
  const [excerpt, setExcerpt] = useState(initial.excerpt);
  const [content, setContent] = useState<DocNode>(initial.content);
  const [coverUrl, setCoverUrl] = useState(initial.coverImageUrl);
  const [coverAlt, setCoverAlt] = useState(initial.coverImageAlt);
  const [tags, setTags] = useState(initial.tags);
  const [seo, setSeo] = useState(initial.seoDescription);
  const [scheduleAt, setScheduleAt] = useState("");
  const [save, setSave] = useState<SaveState>({ kind: "saved", at: new Date(initial.updatedAt) });
  const [notice, setNotice] = useState<string | null>(null);
  const [view, setView] = useState<"write" | "preview">("write");
  const [pending, startTransition] = useTransition();
  const now = useNow();

  const effectiveSlug = slugTouched ? slug : slugify(title);

  const input = useMemo<PostInput>(
    () => ({
      title,
      slug: effectiveSlug || post.slug,
      excerpt,
      content,
      coverImageUrl: coverUrl,
      coverImageAlt: coverAlt,
      tags,
      seoDescription: seo,
    }),
    [title, effectiveSlug, post.slug, excerpt, content, coverUrl, coverAlt, tags, seo],
  );

  // The last version the server confirmed. Any other version of `input` is unsaved.
  const [savedInput, setSavedInput] = useState(input);
  const dirty = input !== savedInput;
  const latest = useRef(input);
  const saving = useRef<Promise<unknown> | null>(null);
  useEffect(() => {
    latest.current = input;
  }, [input]);

  const apply = useCallback((result: SaveResult, sent?: PostInput) => {
    if (result.ok) {
      if (sent) setSavedInput(sent);
      setPost(result.post);
      setSave({ kind: "saved", at: new Date(result.post.updatedAt) });
    } else {
      setSave({ kind: "error", message: result.error });
    }
    return result;
  }, []);

  const saveNow = useCallback(async () => {
    if (saving.current) await saving.current;
    setSave({ kind: "saving" });
    const sent = latest.current;
    const p = savePost(post.id, sent)
      .catch((): SaveResult => ({ ok: false, error: "Could not reach the server. Your changes will be saved on the next edit." }))
      .then((result) => apply(result, sent));
    saving.current = p;
    try {
      return await p;
    } finally {
      saving.current = null;
    }
  }, [post.id, apply]);

  // Autosave a moment after typing stops. This effect only starts a timer; it never sets state itself.
  useEffect(() => {
    if (!dirty) return;
    const timer = window.setTimeout(() => void saveNow(), AUTOSAVE_MS);
    return () => window.clearTimeout(timer);
  }, [dirty, input, saveNow]);

  // Warn before leaving with unsaved changes.
  const unsaved = dirty || save.kind !== "saved";
  useEffect(() => {
    if (!unsaved) return;
    const onLeave = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [unsaved]);

  // Ctrl+S or Cmd+S saves straight away.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        void saveNow();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saveNow]);

  const publishedAt = post.publishedAt ? new Date(post.publishedAt) : null;
  // Before the browser clock is known, a published post is shown as live.
  const isScheduled = post.status === "published" && !!publishedAt && now > 0 && publishedAt.getTime() > now;
  const isLive = post.status === "published" && !isScheduled;

  function runPublish(when: string | null) {
    setNotice(null);
    startTransition(async () => {
      if (saving.current) await saving.current;
      setSave({ kind: "saving" });
      const sent = latest.current;
      const result = apply(
        await publishPost(post.id, sent, when ? new Date(when).toISOString() : null).catch(
          (): SaveResult => ({ ok: false, error: "Could not reach the server. Please try again." }),
        ),
        sent,
      );
      if (result.ok) {
        setSlug(result.post.slug);
        setSlugTouched(true);
        setScheduleAt("");
        const at = new Date(result.post.publishedAt!);
        setNotice(at.getTime() > Date.now() ? `Scheduled for ${at.toLocaleString()}.` : "Published. It is live on the site and in the book.");
      }
    });
  }

  function runUnpublish() {
    setNotice(null);
    startTransition(async () => {
      const result = apply(
        await unpublishPost(post.id).catch((): SaveResult => ({ ok: false, error: "Could not reach the server. Please try again." })),
      );
      if (result.ok) setNotice("Moved back to drafts. It is no longer on the site.");
    });
  }

  const words = wordCount(content);
  const previewHtml = useMemo(() => (view === "preview" ? renderDoc(content) : ""), [view, content]);

  return (
    <div className="mx-auto w-full max-w-6xl px-5 pb-24 pt-6 sm:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/admin" className="text-sm font-medium text-accent-strong hover:underline">
          <span aria-hidden="true">←</span> All posts
        </Link>
        <div className="flex items-center gap-3">
          <SaveBadge state={save} dirty={dirty} />
          <div role="tablist" aria-label="Editor view" className="flex rounded-full bg-bg-soft p-1">
            {(["write", "preview"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                type="button"
                aria-selected={view === v}
                onClick={() => setView(v)}
                className={`rounded-full px-3.5 py-1.5 text-sm font-medium capitalize transition ${
                  view === v ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0">
          <div className={view === "write" ? "" : "hidden"}>
            <label htmlFor="post-title" className="sr-only">Title</label>
            <textarea
              id="post-title"
              rows={1}
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value.replace(/\n/g, " "))}
              placeholder="Post title"
              className="field-sizing-content w-full resize-none bg-transparent font-serif text-4xl font-semibold leading-tight tracking-tight text-ink outline-none placeholder:text-muted/70 sm:text-5xl"
            />
            <div className="mt-6">
              <RichEditor initial={initial.content} onChange={setContent} onStatus={setNotice} />
            </div>
            <p className="mt-2 text-xs text-muted">
              {words} words · about {readingMinutes(content)} min read · Ctrl+S saves straight away
            </p>
          </div>

          {view === "preview" && (
            <article className="rounded-2xl border border-line bg-surface px-5 py-8 shadow-soft sm:px-10">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-accent-strong">
                {post.publishedAt ? formatDate(post.publishedAt) : "Not published yet"} · {readingMinutes(content)} min read
              </p>
              <h1 className="mt-3 font-serif text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
                {title || "Untitled"}
              </h1>
              {tags.length > 0 && (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {tags.map((t) => (
                    <li key={t} className="rounded-full bg-accent-soft px-3 py-1 text-sm font-medium text-accent-strong">{t}</li>
                  ))}
                </ul>
              )}
              {coverUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={coverUrl} alt={coverAlt} className="mt-8 aspect-[16/9] w-full rounded-2xl object-cover" />
              )}
              <div className="prose-ff mt-8" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </article>
          )}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-20 lg:self-start" aria-label="Post settings">
          <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <h2 className="text-sm font-semibold text-ink">Status</h2>
            <p className="mt-1 text-sm text-ink-soft">
              {isLive && <>Published on {formatDate(post.publishedAt!)}.</>}
              {isScheduled && <>Scheduled for {publishedAt!.toLocaleString()}.</>}
              {post.status === "draft" && <>Draft. Only you can see it.</>}
            </p>
            {notice && (
              <p role="status" className="mt-3 rounded-xl bg-accent-soft px-3 py-2 text-sm text-ink">{notice}</p>
            )}
            <div className="mt-4 flex flex-wrap gap-2">
              {post.status === "draft" ? (
                <button type="button" className="btn-primary" disabled={pending} onClick={() => runPublish(null)}>
                  Publish now
                </button>
              ) : (
                <button type="button" className="btn-quiet" disabled={pending} onClick={runUnpublish}>
                  Unpublish
                </button>
              )}
              {isLive && (
                <a href={`/blog/${post.slug}`} target="_blank" rel="noreferrer" className="btn-quiet">
                  View post
                </a>
              )}
            </div>
            <div className="mt-5 border-t border-line pt-4">
              <label htmlFor="schedule" className="label">{isScheduled ? "Change the publish time" : "Schedule for later"}</label>
              <div className="flex gap-2">
                <input
                  id="schedule"
                  type="datetime-local"
                  className="field min-w-0 flex-1"
                  value={scheduleAt}
                  min={now ? toLocalInput(new Date(now).toISOString()) : undefined}
                  onChange={(e) => setScheduleAt(e.target.value)}
                />
                <button
                  type="button"
                  className="btn-quiet shrink-0"
                  disabled={pending || !scheduleAt || new Date(scheduleAt).getTime() <= Math.max(now, 1)}
                  onClick={() => runPublish(scheduleAt)}
                >
                  Schedule
                </button>
              </div>
              <p className="hint">In your own time zone. The post appears within about fifteen minutes of this time.</p>
            </div>
          </section>

          <section className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <div>
              <label htmlFor="slug" className="label">Web address</label>
              <div className="flex items-center rounded-xl border border-line bg-surface focus-within:border-accent focus-within:ring-4 focus-within:ring-accent/20">
                <span className="pl-3 text-sm text-muted">/blog/</span>
                <input
                  id="slug"
                  className="min-w-0 flex-1 bg-transparent py-2.5 pr-3 text-[0.95rem] text-ink outline-none"
                  value={effectiveSlug}
                  placeholder="made-from-the-title"
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                  onBlur={() => slugTouched && setSlug(slugify(slug))}
                />
              </div>
              <p className="hint">
                {post.status === "published"
                  ? "Changing this after publishing breaks old links to the post."
                  : "Made from the title. You can change it."}
              </p>
            </div>
            <div>
              <label htmlFor="excerpt" className="label">Excerpt</label>
              <textarea
                id="excerpt"
                rows={4}
                maxLength={600}
                className="field resize-y"
                value={excerpt}
                onChange={(e) => setExcerpt(e.target.value)}
                placeholder="Two or three sentences. Shown on the book page and in the post list."
              />
              <p className="hint">{excerpt.length}/600</p>
            </div>
            <TagInput value={tags} onChange={setTags} suggestions={knownTags} />
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <CoverField
              url={coverUrl}
              alt={coverAlt}
              onUrl={setCoverUrl}
              onAlt={setCoverAlt}
              onStatus={setNotice}
            />
          </section>

          <section className="rounded-2xl border border-line bg-surface p-5 shadow-soft">
            <label htmlFor="seo" className="label">Search engine description</label>
            <textarea
              id="seo"
              rows={3}
              maxLength={300}
              className="field resize-y"
              value={seo}
              onChange={(e) => setSeo(e.target.value)}
              placeholder="Leave empty to use the excerpt."
            />
            <p className="hint">{seo.length}/160 recommended. Shown under the title in Google and when the link is shared.</p>
          </section>

          <section className="rounded-2xl border border-line p-5">
            <form
              action={deletePost}
              onSubmit={(e) => {
                if (!window.confirm("Delete this post for good? This cannot be undone.")) e.preventDefault();
              }}
            >
              <input type="hidden" name="id" value={post.id} />
              <input type="hidden" name="from" value="editor" />
              <button type="submit" className="btn-danger">Delete post</button>
            </form>
          </section>
        </aside>
      </div>
    </div>
  );
}

function SaveBadge({ state, dirty }: { state: SaveState; dirty: boolean }) {
  const text =
    state.kind === "saved" && dirty
      ? "Unsaved changes"
      : state.kind === "saved"
      ? `Saved ${state.at.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
      : state.kind === "saving"
        ? "Saving…"
        : state.message;
  return (
    <p
      role="status"
      aria-live="polite"
      className={`text-sm ${state.kind === "error" ? "font-medium text-red-600 dark:text-red-300" : "text-muted"}`}
    >
      {text}
    </p>
  );
}
