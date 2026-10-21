import Link from "next/link";
import Icon from "@/components/Icon";
import { getT } from "@/lib/i18n/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <div className="status-page">
      <p className="status-code">404</p>
      <h1>{t("nf_h1a")}<em>{t("nf_h1b")}</em></h1>
      <p>{t("nf_p")}</p>
      <div className="status-actions">
        <Link href="/" className="btn-primary">{t("nf_draws")} <Icon name="arrow" size={18} className="flip-rtl" /></Link>
        <Link href="/winners" className="btn-ghost">{t("nf_results")}</Link>
      </div>
    </div>
  );
}
