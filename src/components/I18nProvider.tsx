"use client";

import { createContext, useContext } from "react";
import { M, type Key } from "@/lib/i18n/messages";
import { format } from "@/lib/i18n/format";
import { DEFAULT_LANG, type Lang } from "@/lib/i18n/types";

const Ctx = createContext<Lang>(DEFAULT_LANG);

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={lang}>{children}</Ctx.Provider>;
}

/** Client-side translator: `const t = useT(); t("nav_draws")`. */
export function useT() {
  const lang = useContext(Ctx);
  const i = lang === "ur" ? 1 : 0;
  const t = (key: Key, vars?: Record<string, string | number>) => format(M[key][i], vars);
  return Object.assign(t, { lang });
}
