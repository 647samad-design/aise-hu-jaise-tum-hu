"use client";

import { useRef, useState } from "react";
import Icon from "@/components/Icon";
import { compressImage, publicUrl, uploadTo } from "@/lib/upload";

/** Admin-only uploads to the public-images bucket. First image = cover. */
export default function ImageUploader({
  value,
  onChange,
  folder,
  max = 8,
  label = "Add photos",
  hint,
}: {
  value: string[];
  onChange: (urls: string[]) => void;
  folder: string;
  max?: number;
  label?: string;
  hint?: string;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [err, setErr] = useState<string | null>(null);

  async function add(files: FileList | null) {
    if (!files?.length) return;
    setErr(null);
    const list = [...files].slice(0, max - value.length);
    setBusy(list.length);
    const urls: string[] = [];
    for (const f of list) {
      try {
        const blob = await compressImage(f, 1800, 0.85);
        urls.push(publicUrl(await uploadTo("public-images", folder, blob)));
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Upload failed");
      }
      setBusy((b) => b - 1);
    }
    onChange([...value, ...urls]);
    if (input.current) input.current.value = "";
  }

  const move = (i: number, d: number) => {
    const next = [...value];
    const [x] = next.splice(i, 1);
    next.splice(i + d, 0, x!);
    onChange(next);
  };

  return (
    <div className="uploader">
      <div className="uploader-grid">
        {value.map((u, i) => (
          <div key={u + i} className="uploader-item">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={u} alt="" />
            {i === 0 && max > 1 && <span className="uploader-cover">Cover</span>}
            <div className="uploader-tools">
              {i > 0 && <button type="button" onClick={() => move(i, -1)} aria-label="Move left">‹</button>}
              <button type="button" onClick={() => onChange(value.filter((_, n) => n !== i))} aria-label="Remove">×</button>
              {i < value.length - 1 && <button type="button" onClick={() => move(i, 1)} aria-label="Move right">›</button>}
            </div>
          </div>
        ))}
        {value.length < max && (
          <button type="button" className="uploader-add" onClick={() => input.current?.click()} disabled={busy > 0}>
            {busy > 0 ? <span className="spinner dark" /> : <Icon name="plus" size={22} />}
            <span>{busy > 0 ? `Uploading ${busy}…` : label}</span>
          </button>
        )}
      </div>
      <input ref={input} type="file" accept="image/*" multiple={max > 1} hidden onChange={(e) => add(e.target.files)} />
      {hint && <p className="field-hint mt-1">{hint}</p>}
      {err && <p className="field-error mt-1">{err}</p>}
    </div>
  );
}
