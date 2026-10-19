import Link from "next/link";
import Icon from "@/components/Icon";

// Two-column auth layout: brand story on the left (hidden on phones), form card on the right.
export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="auth-wrap">
      <aside className="auth-aside" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <p className="eyebrow"><span className="status-dot" /> 1RUPYA MEMBERS</p>
        <h2>
          Small tickets.<br />
          <em>Verifiable</em> results.
        </h2>
        <ul className="auth-points">
          <li><Icon name="shield" size={18} /> Every winner can be re-checked by anyone</li>
          <li><Icon name="ticket" size={18} /> Draws run only after every ticket sells</li>
          <li><Icon name="wallet" size={18} /> Cancelled draws refund straight to your wallet</li>
        </ul>
        <div className="auth-mini-ticket">
          <span>FROM PKR</span>
          <strong>1<small>.00</small></strong>
          <span className="stub">YOUR POSSIBILITY STARTS HERE</span>
        </div>
      </aside>

      <section className="auth-panel">
        <Link href="/" className="auth-back"><Icon name="arrow-left" size={16} /> Back to draws</Link>
        <div className="auth-card">
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="auth-title">{title}</h1>
          {subtitle && <p className="auth-subtitle">{subtitle}</p>}
          <div className="auth-body">{children}</div>
        </div>
        {footer && <div className="auth-footer">{footer}</div>}
      </section>
    </div>
  );
}

export function Divider({ children = "or" }: { children?: React.ReactNode }) {
  return (
    <div className="auth-divider" role="separator">
      <span>{children}</span>
    </div>
  );
}
