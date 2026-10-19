import { redirect } from "next/navigation";
import ProfileForm from "@/components/ProfileForm";
import { getSessionProfile } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const { user, profile } = await getSessionProfile();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="font-display text-3xl font-bold text-pine-800">Your profile</h1>
      <p className="text-sm text-pine-900/70">
        We need your name and phone before you can buy tickets, so winners can be contacted.
      </p>
      <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? ""} />
    </div>
  );
}
