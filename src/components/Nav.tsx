import Link from "next/link";
import { getSessionProfile } from "@/lib/auth";
import { signOut } from "@/app/actions";
import { pkr } from "@/lib/format";

export default async function Nav() {
  const { user, profile } = await getSessionProfile();

  return (
    <header className="sticky top-0 z-40 border-b border-black/5 bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-5 py-4 flex-wrap">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-pine-900 font-display text-lg font-bold text-gold-300">
            1
          </span>
          <span className="brand-name text-pine-900">Rupya</span>
        </Link>

        <nav aria-label="Main navigation" className="ml-auto flex flex-wrap items-center gap-1 text-sm font-medium">
          <Link href="/#draws" className="hidden rounded-full px-3 py-2 text-pine-800 hover:bg-pine-50 sm:block">Explore draws</Link>
          <Link href="/#help" className="hidden rounded-full px-3 py-2 text-pine-800 hover:bg-pine-50 md:block">Help</Link>
          <Link href="/winners" className="rounded-full px-3 py-2 text-pine-800 hover:bg-pine-50">
            Winners
          </Link>
          {user ? (
            <>
              <Link href="/profile" className="rounded-full px-3 py-2 text-pine-800 hover:bg-pine-50">Profile</Link>
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
