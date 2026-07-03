import Link from "next/link";
import {
  Refrigerator,
  Search,
  CalendarDays,
  Settings2,
  ArrowRight,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";

const tiles = [
  {
    href: "/app/cook",
    icon: Refrigerator,
    title: "What's in the fridge?",
    body: "Turn your ingredients into a recipe.",
    tone: "primary" as const,
  },
  {
    href: "/app/dish",
    icon: Search,
    title: "Find a dish",
    body: "Type any dish name and get the full recipe.",
    tone: "accent" as const,
  },
  {
    href: "/app/plan",
    icon: CalendarDays,
    title: "Plan your meals",
    body: "Build a balanced week in one tap.",
    tone: "primary" as const,
  },
  {
    href: "/app/profile",
    icon: Settings2,
    title: "Your preferences",
    body: "Cuisines, diet, units, and voice.",
    tone: "accent" as const,
  },
];

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

  const first = profile?.name?.split(" ")[0];
  const hour = new Date().getHours();
  const part = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";

  return (
    <div>
      <Reveal>
        <p className="eyebrow">{part}</p>
        <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          {first ? `Hello, ${first}` : "Hello there"}
        </h1>
        <p className="mt-2 text-muted-foreground">What would you like to cook today?</p>
      </Reveal>

      <RevealGroup className="mt-8 grid gap-4 sm:grid-cols-2">
        {tiles.map((t) => (
          <RevealItem key={t.href}>
            <Link
              href={t.href}
              className="group card flex h-full items-start gap-4 transition-all duration-300 hover:shadow-lift hover:-translate-y-1"
            >
              <div
                className={
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl " +
                  (t.tone === "primary"
                    ? "bg-primary-soft text-primary"
                    : "bg-accent-soft text-accent")
                }
              >
                <t.icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-1 font-heading text-lg font-semibold text-foreground">
                  {t.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                </div>
                <p className="text-sm text-muted-foreground">{t.body}</p>
              </div>
            </Link>
          </RevealItem>
        ))}
      </RevealGroup>
    </div>
  );
}
