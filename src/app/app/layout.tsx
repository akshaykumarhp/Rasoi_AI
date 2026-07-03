import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import OfflineBanner from "./OfflineBanner";
import AppNav from "./AppNav";

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
      <AppNav />
      <main className="mx-auto max-w-4xl px-5 pb-28 pt-8 sm:pb-10">{children}</main>
    </div>
  );
}
