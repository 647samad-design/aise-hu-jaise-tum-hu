"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="status-page">
      <p className="status-code">Oops</p>
      <h1>Something went <em>wrong.</em></h1>
      <p>Your wallet and tickets are safe. Please try again in a moment.</p>
      <div className="status-actions">
        <button onClick={reset} className="btn-primary">Try again</button>
        <Link href="/" className="btn-ghost">Go home</Link>
      </div>
      {error.digest && <p className="status-ref">Reference: {error.digest}</p>}
    </div>
  );
}
