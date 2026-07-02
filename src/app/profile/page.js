import { db } from "@/lib/db";
import { getSession, hashPassword } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import AppLayout from "@/components/AppLayout";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

export const metadata = {
  title: "My Profile Settings - PADEMCO",
};

export default async function ProfilePage({ searchParams }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const user = await db.user.findUnique({
    where: { id: session.id },
  });

  if (!user) redirect("/login");

  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams.error || null;
  const success = resolvedSearchParams.success || null;

  async function updateProfile(formData) {
    "use server";
    const session = await getSession();
    if (!session) throw new Error("Unauthorized");

    const name = formData.get("name")?.trim();
    const username = formData.get("username")?.trim().toLowerCase();
    const password = formData.get("password");
    const confirmPassword = formData.get("confirmPassword");

    if (!name || !username) {
      redirect(`/profile?error=${encodeURIComponent("Name and Username are required.")}`);
    }

    try {
      // Check duplicate username case-insensitively
      const allUsers = await db.user.findMany();
      const existingUser = allUsers.find(
        (u) => u.username.toLowerCase() === username.toLowerCase() && u.id !== session.id
      );

      if (existingUser) {
        redirect(`/profile?error=${encodeURIComponent("Username is already taken by another system user.")}`);
      }

      let passwordHash = undefined;
      if (password) {
        if (password !== confirmPassword) {
          redirect(`/profile?error=${encodeURIComponent("Passwords do not match.")}`);
        }
        passwordHash = hashPassword(password);
      }

      await db.user.update({
        where: { id: session.id },
        data: {
          name,
          username,
          passwordHash: passwordHash || undefined,
        },
      });

      await logAction(
        session.id,
        "UPDATE",
        "USER",
        `User ${username} updated their own profile settings.`
      );
    } catch (e) {
      console.error(e);
      redirect(`/profile?error=${encodeURIComponent("Failed to update profile settings.")}`);
    }

    revalidatePath("/profile");
    revalidatePath("/");
    redirect(`/profile?success=${encodeURIComponent("Profile settings updated successfully!")}`);
  }

  return (
    <AppLayout user={session}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-black text-primary">My Profile Settings</h1>
          <p className="text-sm text-slate-500">
            Customize your account display name, username credentials, and secure login password.
          </p>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-4 animate-fadeIn">
            <p className="text-xs font-bold text-rose-700">⚠️ {error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-4 animate-fadeIn">
            <p className="text-xs font-bold text-emerald-700">✓ {success}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
          <form action={updateProfile} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Display Name</label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  required
                  autoComplete="off"
                  defaultValue={user.name}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-medium"
                />
              </div>

              <div>
                <label htmlFor="username" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Username</label>
                <input
                  type="text"
                  name="username"
                  id="username"
                  required
                  autoComplete="off"
                  defaultValue={user.username}
                  className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm font-medium font-mono"
                />
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <span className="block text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  Change Password (Leave blank to keep same)
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="password" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">New Password</label>
                    <input
                      type="password"
                      name="password"
                      id="password"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirmPassword" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">Confirm Password</label>
                    <input
                      type="password"
                      name="confirmPassword"
                      id="confirmPassword"
                      autoComplete="new-password"
                      placeholder="••••••••"
                      className="mt-1.5 block w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-slate-900 text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-hover text-white py-3 px-8 rounded-xl text-sm font-black shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                Save Profile Changes
              </button>
            </div>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
