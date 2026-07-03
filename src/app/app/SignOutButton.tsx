"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton() {
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      onClick={signOut}
      className="rounded-xl px-3 py-2 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800"
    >
      Sign out
    </button>
  );
}
