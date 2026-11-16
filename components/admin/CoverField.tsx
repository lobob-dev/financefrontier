"use client";

import { useRef, useState } from "react";
import { uploadImage } from "@/lib/admin/upload";

export function CoverField({
  url,
  alt,
  onUrl,
  onAlt,
  onStatus,
}: {
  url: string | null;
  alt: string;
  onUrl: (url: string | null) => void;
  onAlt: (alt: string) => void;
  onStatus: (message: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);

  async function pick(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    onStatus("Uploading the cover image…");
    try {
      const uploaded = await uploadImage(file);
      onUrl(uploaded.url);
      onStatus("Cover image added. Add a short description below.");
    } catch (e) {
      onStatus(e instanceof Error ? e.message : "The image could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <p className="label">Cover image</p>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setOver(false);
          void pick(Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/")));
        }}
        disabled={busy}
        className={`relative grid aspect-[16/10] w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed text-sm transition ${
          over ? "border-accent bg-accent-soft" : "border-line bg-bg-soft hover:border-accent"
        }`}
        aria-label={url ? "Replace the cover image" : "Upload a cover image"}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <span className="px-4 text-center text-muted">{busy ? "Uploading…" : "Drop an image here or click to choose one"}</span>
        )}
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {url && (
        <>
          <label htmlFor="cover-alt" className="label mt-3">Describe the image</label>
          <input
            id="cover-alt"
            className="field"
            value={alt}
            maxLength={300}
            onChange={(e) => onAlt(e.target.value)}
            placeholder="For readers using screen readers"
          />
          <button type="button" className="mt-2 text-sm font-medium text-muted hover:text-ink" onClick={() => onUrl(null)}>
            Remove cover
          </button>
        </>
      )}
      <p className="hint">Resized and compressed before upload. Shown on the book page and at the top of the post.</p>
    </div>
  );
}
