import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import SignOutButton from "./SignOutButton";
import OfflineBanner from "./OfflineBanner";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="min-h-dvh">
      <OfflineBanner />
      <header className="sticky top-0 z-10 border-b border-stone-100 bg-[var(--background)]/80 backdrop-blur dark:border-stone-800">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link href="/app" className="flex items-center gap-2 font-bold">
            <span className="text-xl">🍳</span> Rasoi
          </Link>
          <nav className="flex items-center gap-1 text-sm font-medium">
            <Link href="/app" className="rounded-xl px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800">
              Cook
            </Link>
            <Link href="/app/plan" className="rounded-xl px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800">
              Plan
            </Link>
            <Link href="/app/profile" className="rounded-xl px-3 py-2 hover:bg-stone-100 dark:hover:bg-stone-800">
              Profile
            </Link>
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-4xl px-5 py-8">{children}</main>
    </div>
  );
}
