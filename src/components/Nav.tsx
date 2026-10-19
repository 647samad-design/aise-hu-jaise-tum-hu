import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { pkr } from "@/lib/format";

export default async function Nav() {
  const session = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ? await getSessionProfile().catch(() => null)
    : null;
  const user = session?.user;
  const profile = session?.profile;

  return (
    <header className="site-header">
      <div className="nav-inner">
        <Link href="/" className="flex items-center gap-2">
          <span className="brand-mark">
            1
          </span>
          <span className="brand-name">Rupya</span>
        </Link>

        <div className="nav-links"><Link href="/#draws">Explore draws</Link><Link href="/#how-it-works">How it works</Link><Link href="/#fairness">Our promise</Link></div>
        <nav aria-label="Account and results" className="ml-auto flex items-center gap-1 text-sm font-medium">
          <Link href="/winners" className="rounded-full px-3 py-2 text-pine-800 hover:bg-pine-50">
            Winners
          </Link>
          {user ? (
            <>
              {profile?.is_admin && (
                <Link href="/admin" className="rounded-full px-3 py-2 text-pine-800 hover:bg-pine-50">
                  Admin
                </Link>
              )}
              <Link href="/wallet" className="btn-gold !px-4 !py-2">
                {pkr(profile?.balance ?? 0)}
              </Link>
              <form action={signOut}>
                <button className="rounded-full px-3 py-2 text-pine-800/70 hover:bg-pine-50">Sign out</button>
              </form>
            </>
          ) : (
            <Link href="/login" className="btn-primary !px-4 !py-2">
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
