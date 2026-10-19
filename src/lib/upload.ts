"use client";

import { createClient } from "@/lib/supabase/client";

/** Shrinks a photo to at most `max` px on the long side as JPEG — screenshots go from ~3 MB to ~200 KB. */
export async function compressImage(file: File, max = 1600, quality = 0.82): Promise<Blob> {
  if (!file.type.startsWith("image/")) throw new Error("Please choose an image file");
  if (file.size > 15 * 1024 * 1024) throw new Error("That image is too large (max 15 MB)");
  const bitmap = await createImageBitmap(file).catch(() => null);
  if (!bitmap) return file;
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", quality));
  return blob && blob.size < file.size ? blob : file;
}

/** SHA-256 of the original file, used to stop the same screenshot being submitted twice. */
export async function sha256(file: Blob): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const rand = () => Math.random().toString(36).slice(2, 8);

/** Upload to a Supabase Storage bucket; returns the stored path. */
export async function uploadTo(bucket: "payment-proofs" | "public-images", folder: string, blob: Blob): Promise<string> {
  const ext = blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg";
  const path = `${folder}/${Date.now()}-${rand()}.${ext}`;
  const { error } = await createClient().storage.from(bucket).upload(path, blob, {
    contentType: blob.type || "image/jpeg",
    cacheControl: "31536000",
    upsert: false,
  });
  if (error) {
    if (/bucket not found/i.test(error.message)) throw new Error("Storage is not set up yet. Run supabase/schema.sql again.");
    if (/row-level security|unauthorized/i.test(error.message)) throw new Error("You are not allowed to upload here. Please sign in again.");
    throw new Error(error.message);
  }
  return path;
}

export function publicUrl(path: string): string {
  return createClient().storage.from("public-images").getPublicUrl(path).data.publicUrl;
}
