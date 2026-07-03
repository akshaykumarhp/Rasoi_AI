"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  UtensilsCrossed,
  Refrigerator,
  Search,
  CalendarDays,
  Settings2,
  LogOut,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const links = [
  { href: "/app/cook", label: "Cook", icon: Refrigerator },
  { href: "/app/dish", label: "Find", icon: Search },
  { href: "/app/plan", label: "Plan", icon: CalendarDays },
  { href: "/app/profile", label: "Profile", icon: Settings2 },
];

export default function AppNav() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function signOut() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur-lg">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-3">
          <Link href="/app" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary-hover">
              <UtensilsCrossed className="h-4 w-4 text-white" />
            </span>
            <span className="font-heading text-lg font-bold text-foreground">
              Rasoi
            </span>
          </Link>

          {/* desktop nav */}
          <nav className="hidden items-center gap-1 sm:flex">
            {links.map((l) => {
              const active = pathname === l.href;
              return (
                <Link
                  key={l.href}
                  href={l.href}
                  className={
                    "flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition " +
                    (active
                      ? "bg-primary-soft text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground")
                  }
                >
                  <l.icon className="h-4 w-4" />
                  {l.label}
                </Link>
              );
            })}
            <button
              onClick={signOut}
              className="ml-1 flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </nav>

          <button
            onClick={signOut}
            className="rounded-xl p-2 text-muted-foreground hover:bg-muted sm:hidden"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      {/* mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur-lg sm:hidden">
        <div className="mx-auto grid max-w-4xl grid-cols-4">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={
                  "flex flex-col items-center gap-1 py-2.5 text-xs font-semibold transition " +
                  (active ? "text-primary" : "text-muted-foreground")
                }
              >
                <l.icon className="h-5 w-5" />
                {l.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
