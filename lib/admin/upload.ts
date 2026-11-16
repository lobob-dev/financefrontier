"use client";

import { browserClient } from "@/lib/supabase/browser";

const MAX_INPUT_BYTES = 25 * 1024 * 1024;
const BUCKET = "post-images";

export type UploadedImage = { url: string; width: number; height: number };

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Shrinks a photo to at most 1800 pixels wide (2400 tall) and saves it as WebP,
 * which is usually a tenth of the size of a phone photo. Animated GIFs are kept as they are.
 */
export async function compressImage(file: File, maxWidth = 1800, maxHeight = 2400) {
  if (!file.type.startsWith("image/")) throw new Error("That file is not an image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is larger than 25 MB.");

  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" }).catch(() => null);
  if (!bitmap) throw new Error("That image could not be opened. Try a JPEG, PNG or WebP file.");

  if (file.type === "image/gif") {
    const size = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    if (file.size > 5 * 1024 * 1024) throw new Error("Animated GIFs must be under 5 MB.");
    return { blob: file as Blob, type: "image/gif", ext: "gif", ...size };
  }

  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  let blob = await canvasToBlob(canvas, "image/webp", 0.82);
  let type = "image/webp";
  let ext = "webp";
  if (!blob || blob.type !== "image/webp") {
    blob = await canvasToBlob(canvas, "image/jpeg", 0.84);
    type = "image/jpeg";
    ext = "jpg";
  }
  if (!blob) throw new Error("That image could not be compressed.");
  return { blob, type, ext, width, height };
}

/** Compresses an image and uploads it to Supabase storage as the signed-in admin. */
export async function uploadImage(file: File): Promise<UploadedImage> {
  const { blob, type, ext, width, height } = await compressImage(file);
  const now = new Date();
  const path = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${crypto.randomUUID()}.${ext}`;
  const supabase = browserClient();
  const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
    contentType: type,
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) throw new Error(`Upload failed: ${error.message}`);
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, width, height };
}
