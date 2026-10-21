// Wrapped in invisible left-to-right isolates so "PKR 1,240" never gets scrambled inside Urdu text.
export const pkr = (n: number) => `\u2066PKR ${n.toLocaleString("en-PK")}\u2069`;

export function timeLeft(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (ms <= 0) return "Ended";
  const d = Math.floor(ms / 86_400_000);
  const h = Math.floor((ms % 86_400_000) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  if (d > 0) return `${d}d ${h}h left`;
  if (h > 0) return `${h}h ${m}m left`;
  return `${m}m left`;
}

export function shortDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type Draw = {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  ticket_price: number;
  target_tickets: number;
  max_per_user: number;
  sold_tickets: number;
  status: "open" | "full" | "drawn" | "cancelled";
  ends_at: string | null;
  opens_at?: string | null;
  gallery?: string[];
  facts?: string[];
  prize_value?: number | null;
  participants?: number;
  delivery_image?: string | null;
  delivery_note?: string | null;
  delivered_at?: string | null;
  seed_hash: string;
  seed_revealed: string | null;
  winner_ticket: number | null;
  winner_label: string | null;
  proof: Record<string, unknown> | null;
  full_at: string | null;
  drawn_at: string | null;
  created_at: string;
};

/** Ticket sales have not started yet. */
export const isUpcoming = (d: Pick<Draw, "opens_at" | "status">) =>
  d.status === "open" && !!d.opens_at && new Date(d.opens_at).getTime() > Date.now();

export function longDate(iso: string): string {
  return new Date(iso).toLocaleString("en-PK", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "Asia/Karachi",
  });
}

export function timeAgo(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 604800) return `${Math.floor(s / 86400)}d ago`;
  return shortDate(iso);
}

export type Notification = {
  id: number;
  user_id: string | null;
  kind: "welcome" | "topup" | "ticket" | "soldout" | "result" | "win" | "refund" | "draw" | "announcement";
  title: string;
  body: string | null;
  link: string | null;
  created_at: string;
};

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  is_admin: boolean;
  balance: number;
  created_at: string;
  notifications_seen_at?: string;
};
