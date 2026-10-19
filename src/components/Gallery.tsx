"use client";

import { useState } from "react";

/** Product photos: big image + thumbnails. Falls back to the "1" placeholder. */
export default function Gallery({ images, title }: { images: string[]; title: string }) {
  const list = images.filter(Boolean);
  const [i, setI] = useState(0);
  const current = list[Math.min(i, list.length - 1)];
  return (
    <div className="gallery">
      <div className="gallery-main">
        {current ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={current} alt={`${title} — photo ${i + 1} of ${list.length}`} />
        ) : (
          <div className="grid h-full place-items-center font-display text-9xl text-pine-500/30">1</div>
        )}
        {list.length > 1 && <span className="gallery-count">{i + 1} / {list.length}</span>}
      </div>
      {list.length > 1 && (
        <div className="gallery-thumbs" role="tablist" aria-label="Product photos">
          {list.map((src, n) => (
            <button key={src + n} role="tab" aria-selected={n === i} onClick={() => setI(n)} aria-label={`Photo ${n + 1}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
