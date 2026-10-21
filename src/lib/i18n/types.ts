export type Lang = "ur" | "en";
export const LANGS: Lang[] = ["ur", "en"];
export const DEFAULT_LANG: Lang = "ur";
export const LANG_COOKIE = "lang";
export const isLang = (v: unknown): v is Lang => v === "ur" || v === "en";
