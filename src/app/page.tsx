import Link from "next/link";
import {
  Refrigerator,
  CalendarDays,
  Mic,
  ArrowRight,
  UtensilsCrossed,
  Sparkles,
} from "lucide-react";
import { Reveal, RevealGroup, RevealItem } from "@/components/Reveal";

const features = [
  {
    icon: Refrigerator,
    title: "Fridge to dinner",
    body: "Tell Rasoi what you have — get a recipe made just for you.",
  },
  {
    icon: CalendarDays,
    title: "Plan the week",
    body: "A balanced meal plan, built for your taste in one tap.",
  },
  {
    icon: Mic,
    title: "Cook hands-free",
    body: "Steps read aloud. Just say “next” while your hands are busy.",
  },
];

export default function Home() {
  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* soft ambient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute right-0 top-40 h-80 w-80 rounded-full bg-accent/10 blur-3xl" />
      </div>

      <div className="mx-auto flex min-h-dvh max-w-4xl flex-col items-center justify-center px-6 py-20 text-center">
        <Reveal>
          <span className="eyebrow">
            <Sparkles className="h-3.5 w-3.5" /> Your kitchen companion
          </span>
        </Reveal>

        <Reveal delay={0.05}>
          <div className="mt-6 flex items-center justify-center gap-3">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary to-primary-hover shadow-lift">
              <UtensilsCrossed className="h-8 w-8 text-white" />
            </div>
            <h1 className="font-heading text-5xl font-bold text-foreground sm:text-6xl">
              Rasoi
            </h1>
          </div>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            A warm, friendly cooking assistant for home cooks everywhere. Plan
            meals, cook hands-free, and turn whatever&rsquo;s in your fridge into
            dinner — by typing or just talking.
          </p>
        </Reveal>

        <Reveal delay={0.2}>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <Link href="/login" className="btn-primary group">
              Get started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link href="/login" className="btn-secondary">
              I already have an account
            </Link>
          </div>
        </Reveal>

        <RevealGroup className="mt-20 grid w-full grid-cols-1 gap-5 sm:grid-cols-3">
          {features.map((f) => (
            <RevealItem key={f.title}>
              <div className="card h-full text-left transition-all duration-300 hover:shadow-lift hover:-translate-y-1">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                  <f.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                  {f.title}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
              </div>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </main>
  );
}
