"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon, { type IconName } from "@/components/Icon";

const TOP: [string, string][] = [
  ["/#draws", "Explore draws"],
  ["/#how-it-works", "How it works"],
  ["/winners", "Winners"],
  ["/#fairness", "Our promise"],
];

export function NavLinks() {
  const path = usePathname();
  return (
    <div className="nav-links">
      {TOP.map(([href, label]) => (
        <Link key={href} href={href} aria-current={href === path ? "page" : undefined}>
          {label}
        </Link>
      ))}
    </div>
  );
}

// App-style tab bar on phones (hidden on wider screens and on sign-in pages).
export function BottomTabs({ signedIn }: { signedIn: boolean }) {
  const path = usePathname();
  if (["/login", "/signup", "/forgot-password", "/reset-password"].includes(path)) return null;

  const tabs: [string, string, IconName][] = [
    ["/", "Draws", "home"],
    ["/winners", "Winners", "trophy"],
    ["/tickets", "Tickets", "ticket"],
    ["/wallet", "Wallet", "wallet"],
    [signedIn ? "/profile" : "/login", signedIn ? "Account" : "Sign in", "user"],
  ];

  return (
    <nav className="bottom-tabs" aria-label="Main">
      {tabs.map(([href, label, icon]) => {
        const active = href === "/" ? path === "/" || path.startsWith("/draws") : path.startsWith(href);
        return (
          <Link key={label} href={href} aria-current={active ? "page" : undefined}>
            <Icon name={icon} size={21} />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
