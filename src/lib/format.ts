export const pkr = (n: number) => `PKR ${n.toLocaleString("en-PK")}`;

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
  seed_hash: string;
  seed_revealed: string | null;
  winner_ticket: number | null;
  winner_label: string | null;
  proof: Record<string, unknown> | null;
  full_at: string | null;
  drawn_at: string | null;
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
};
