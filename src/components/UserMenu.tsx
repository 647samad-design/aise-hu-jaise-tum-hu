"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/actions";
import Icon from "@/components/Icon";
import { useT } from "@/components/I18nProvider";

export default function UserMenu({ name, email, isAdmin, needsPhone, unread = 0 }: { name: string; email: string; isAdmin: boolean; needsPhone: boolean; unread?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const path = usePathname();
  const t = useT();

  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const initials = name
    .split(/[\s@]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]!.toUpperCase())
    .join("");

  return (
    <div className="user-menu" ref={ref}>
      <button className="avatar" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)} aria-label={t("nav_menu")}>
        {initials || "?"}
        {needsPhone && <span className="avatar-dot" aria-hidden="true" />}
      </button>
      {open && (
        <div className="menu" role="menu">
          <div className="menu-head">
            <p className="menu-name">{name.includes("@") ? t("nav_your_account") : name}</p>
            <p className="menu-email">{email}</p>
          </div>
          {needsPhone && (
            <Link role="menuitem" href="/profile?welcome=1" className="menu-alert">
              <Icon name="alert" size={16} /> {t("nav_add_phone")}
            </Link>
          )}
          <Link role="menuitem" href="/notifications"><Icon name="bell" size={17} /> {t("nav_notifications")}{unread > 0 && <span className="menu-count">{unread}</span>}</Link>
          <Link role="menuitem" href="/tickets"><Icon name="ticket" size={17} /> {t("nav_tickets")}</Link>
          <Link role="menuitem" href="/wallet"><Icon name="wallet" size={17} /> {t("nav_wallet")}</Link>
          <Link role="menuitem" href="/profile"><Icon name="user" size={17} /> {t("nav_settings")}</Link>
          <Link role="menuitem" href="/download"><Icon name="download" size={17} /> {t("nav_app")}</Link>
          {isAdmin && <Link role="menuitem" href="/admin"><Icon name="settings" size={17} /> {t("nav_admin")}</Link>}
          <form action={signOut}>
            <button role="menuitem" className="menu-signout"><Icon name="logout" size={17} /> {t("nav_signout")}</button>
          </form>
        </div>
      )}
    </div>
  );
}
