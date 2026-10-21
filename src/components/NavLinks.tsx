"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";
import { useT } from "@/components/I18nProvider";
import type { Key } from "@/lib/i18n/messages";

const TOP: [string, Key][] = [
  ["/#draws", "nav_draws"],
  ["/#how-it-works", "nav_how"],
  ["/winners", "nav_winners"],
  ["/#fairness", "nav_promise"],
];

export function NavLinks() {
  const path = usePathname();
  const t = useT();
  return (
    <div className="nav-links">
      {TOP.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === path ? "page" : undefined}>
          {t(label)}
        </Link>
      ))}
    </div>
  );
}

// App-style tab bar on phones (hidden on wider screens and on sign-in pages).
export function BottomTabs({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  const t = useT();
  if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return null;

  const tabs: [string, Key, IconName][] = [
    ["/", "tab_home", "home"],
    ["/winners", "tab_winners", "trophy"],
    ["/tickets", "tab_tickets", "ticket"],
    ["/wallet", "tab_wallet", "wallet"],
    [signedIn ? "/profile" : "/login", signedIn ? "tab_account" : "tab_signin", "user"],
  ];

  return (
    <nav className="bottom-tabs" aria-label="Main">
      {tabs.map(([href, label, icon]) => {
        const active = href === "/" ? path === "/" || path.startsWith("/draws") : path.startsWith(href);
        return (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}>
            <Icon name={icon} size={22} />
            <span>{t(label)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
