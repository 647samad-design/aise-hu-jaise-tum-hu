/** "{n} tickets" + {n: 5} -> "5 tickets". Numbers are shown with Western digits in both languages (what payment apps use). */
export function format(s: string, vars?: Record<string, string | number>): string {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}
