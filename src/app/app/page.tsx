import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name")
    .eq("id", user!.id)
    .single();

  const greeting = profile?.name ? `Hello, ${profile.name}` : "Hello there";

  const tiles = [
    { href: "/app/cook", icon: "🧊", title: "What's in the fridge?", body: "Turn your ingredients into a recipe." },
    { href: "/app/plan", icon: "🗓️", title: "Plan your meals", body: "Build a balanced week or month." },
    { href: "/app/profile", icon: "⚙️", title: "Your preferences", body: "Cuisines, diet, units, and voice." },
  ];

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-50">
        {greeting} 👋
      </h1>
      <p className="mt-2 text-stone-500 dark:text-stone-400">
        What would you like to do today?
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="card transition hover:shadow-md">
            <div className="text-3xl">{t.icon}</div>
            <div className="mt-3 text-lg font-bold text-stone-900 dark:text-stone-100">
              {t.title}
            </div>
            <div className="text-stone-500 dark:text-stone-400">{t.body}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
