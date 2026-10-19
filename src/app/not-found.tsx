import Link from "next/link";

export default function NotFound() {
  return <section className="empty-panel my-12"><p className="eyebrow">404 / A WRONG TURN</p><h1 className="section-title">A new possibility is this way.</h1><p>This page doesn’t exist, or the link is no longer available. Explore the latest draws from the homepage.</p><Link href="/" className="btn-primary mt-6">Back to home ↗</Link></section>;
}
