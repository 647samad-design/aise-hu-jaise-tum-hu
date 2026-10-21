import Link from "next/link";
import Icon from "@/components/Icon";
import { getT } from "@/lib/i18n/server";

// Two-column auth layout: brand story on the left (hidden on phones), form card on the right.
export default async function AuthShell({
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
  const t = await getT();
  return (
    <div className="auth-wrap">
      <aside className="auth-aside" aria-hidden="true">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <p className="eyebrow"><span className="status-dot" /> {t("au_aside_eyebrow")}</p>
        <h2>
          {t("au_aside_h2a")}<br />
          <em>{t("au_aside_h2b")}</em>
        </h2>
        <ul className="auth-points">
          <li><Icon name="shield" size={18} /> {t("au_aside_1")}</li>
          <li><Icon name="ticket" size={18} /> {t("au_aside_2")}</li>
          <li><Icon name="wallet" size={18} /> {t("au_aside_3")}</li>
        </ul>
        <div className="auth-mini-ticket" dir="ltr">
          <span>FROM PKR</span>
          <strong>1<small>.00</small></strong>
          <span className="stub">YOUR POSSIBILITY STARTS HERE</span>
        </div>
      </aside>

      <section className="auth-panel">
        <Link href="/" className="auth-back"><Icon name="arrow-left" size={16} className="flip-rtl" /> {t("back_draws")}</Link>
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

