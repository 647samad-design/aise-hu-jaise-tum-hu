import Link from "next/link";
import Icon from "@/components/Icon";

export default function NotFound() {
  return (
    <div className="status-page">
      <p className="status-code">404</p>
      <h1>This page has <em>no ticket.</em></h1>
      <p>The link may be old, or the draw may have been removed.</p>
      <div className="status-actions">
        <Link href="/" className="btn-primary">Explore draws <Icon name="arrow" size={18} /></Link>
        <Link href="/winners" className="btn-ghost">Past results</Link>
      </div>
    </div>
  );
}
