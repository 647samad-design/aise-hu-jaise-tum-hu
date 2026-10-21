import "server-only";
import { cookies } from "next/headers";
import { M, type Key } from "@/lib/i18n/messages";
import { DEFAULT_LANG, LANG_COOKIE, isLang, type Lang } from "@/lib/i18n/types";
import { format } from "@/lib/i18n/format";

export async function getLang(): Promise<Lang> {
  try {
    const v = (await cookies()).get(LANG_COOKIE)?.value;
    return isLang(v) ? v : DEFAULT_LANG;
  } catch {
    return DEFAULT_LANG;
  }
}

/** Server-side translator: `const t = await getT(); t("nav_draws")`. */
export async function getT() {
  const lang = await getLang();
  const i = lang === "ur" ? 1 : 0;
  const t = (key: Key, vars?: Record<string, string | number>) => format(M[key][i], vars);
  return Object.assign(t, { lang });
}
