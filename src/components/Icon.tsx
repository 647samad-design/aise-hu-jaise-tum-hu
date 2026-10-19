export default function Icon({ name, className = "" }: { name: "arrow" | "shield" | "ticket" | "wallet" | "check"; className?: string }) {
  const paths = {
    arrow: "M5 12h14m-6-6 6 6-6 6",
    shield: "M12 3 4 6v6c0 5 8 9 8 9s8-4 8-9V6l-8-3Zm-4 9 3 3 5-6",
    ticket: "M4 5h16v5a2 2 0 0 0 0 4v5H4v-5a2 2 0 0 0 0-4V5Zm10 0v3m0 3v2m0 3v3",
    wallet: "M20 8V5H5a2 2 0 0 0 0 4h15v11H5a2 2 0 0 1-2-2V7m17 6h-5v3h5",
    check: "m5 12 4 4L19 6",
  };
  return <svg className={className} width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>;
}
