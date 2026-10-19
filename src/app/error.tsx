"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <section className="empty-panel my-12" role="alert"><span className="empty-mark">!</span><p className="eyebrow">A LITTLE INTERRUPTION</p><h1 className="section-title">Let’s give that another try.</h1><p>Something interrupted this page. Please try again in a moment.</p><button className="btn-primary mt-6" onClick={reset}>Try again ↗</button><a href="/" className="btn-ghost ml-3 mt-6">Back to home</a></section>;
}
