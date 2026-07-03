"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  addDays,
  shortDate,
  startOfWeek,
  toISODate,
  WEEKDAYS,
  isSameDay,
} from "@/lib/dates";

type Entry = { id: string; date: string; meal_type: string; title: string };
type Cell = { id?: string; title: string };

const MEALS: { type: string; label: string; icon: string }[] = [
  { type: "breakfast", label: "Breakfast", icon: "🌅" },
  { type: "lunch", label: "Lunch", icon: "☀️" },
  { type: "dinner", label: "Dinner", icon: "🌙" },
];

const key = (date: string, meal: string) => `${date}|${meal}`;

export default function PlanClient({
  userId,
  initialEntries,
}: {
  userId: string;
  initialEntries: Entry[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [cells, setCells] = useState<Record<string, Cell>>(() => {
    const map: Record<string, Cell> = {};
    for (const e of initialEntries) {
      map[key(e.date, e.meal_type)] = { id: e.id, title: e.title };
    }
    return map;
  });
  const [generating, setGenerating] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  );
  const today = new Date();

  const weekHasMeals = useMemo(
    () =>
      days.some((d) =>
        MEALS.some((m) => cells[key(toISODate(d), m.type)]?.title),
      ),
    [days, cells],
  );

  async function saveMeal(date: string, meal: string, title: string) {
    const k = key(date, meal);
    const trimmed = title.trim();

    if (!trimmed) {
      const existing = cells[k];
      if (existing?.id) {
        await supabase.from("meal_plans").delete().eq("id", existing.id);
      }
      setCells((c) => {
        const next = { ...c };
        delete next[k];
        return next;
      });
      return;
    }

    setCells((c) => ({ ...c, [k]: { ...c[k], title: trimmed } }));
    const { data } = await supabase
      .from("meal_plans")
      .upsert(
        { user_id: userId, date, meal_type: meal, title: trimmed },
        { onConflict: "user_id,date,meal_type" },
      )
      .select("id")
      .single();
    if (data?.id) {
      setCells((c) => ({ ...c, [k]: { id: data.id, title: trimmed } }));
    }
  }

  async function autoPlan() {
    setGenerating(true);
    setError("");
    try {
      const res = await fetch("/api/mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: 7, mealTypes: MEALS.map((m) => m.type) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not build a plan");

      const rows = (data.meals as { dayOffset: number; mealType: string; title: string }[])
        .filter((m) => m.dayOffset >= 0 && m.dayOffset < 7)
        .map((m) => ({
          user_id: userId,
          date: toISODate(addDays(weekStart, m.dayOffset)),
          meal_type: m.mealType.toLowerCase(),
          title: m.title,
        }));

      const { data: saved } = await supabase
        .from("meal_plans")
        .upsert(rows, { onConflict: "user_id,date,meal_type" })
        .select("id, date, meal_type, title");

      setCells((c) => {
        const next = { ...c };
        for (const r of saved ?? []) {
          next[key(r.date, r.meal_type)] = { id: r.id, title: r.title };
        }
        return next;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }

  function cook(title: string) {
    router.push(`/app/cook?q=${encodeURIComponent(title)}`);
  }

  const weekLabel = `${shortDate(days[0])} – ${shortDate(days[6])}`;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-50">
          Meal plan
        </h1>
        <button onClick={autoPlan} disabled={generating} className="btn-primary disabled:opacity-60">
          {generating ? "Planning…" : "✨ Auto-plan this week"}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={() => setWeekStart((w) => addDays(w, -7))}
          className="btn-secondary !px-4 !py-2"
        >
          ←
        </button>
        <span className="font-semibold text-stone-700 dark:text-stone-200">{weekLabel}</span>
        <button
          onClick={() => setWeekStart((w) => addDays(w, 7))}
          className="btn-secondary !px-4 !py-2"
        >
          →
        </button>
        <button
          onClick={() => setWeekStart(startOfWeek(new Date()))}
          className="text-sm text-stone-500 hover:underline"
        >
          Today
        </button>
      </div>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {!weekHasMeals && !generating && (
        <div className="mt-5 rounded-3xl border-2 border-dashed border-stone-200 bg-stone-50 p-6 text-center dark:border-stone-700 dark:bg-stone-800/40">
          <div className="text-3xl">🍽️</div>
          <p className="mt-2 font-semibold text-stone-700 dark:text-stone-200">
            Nothing planned for this week yet
          </p>
          <p className="mt-1 text-sm text-stone-500">
            Let Rasoi build a balanced week for you, or tap any meal below to add
            your own.
          </p>
          <button onClick={autoPlan} className="btn-primary mt-4">
            ✨ Auto-plan this week
          </button>
        </div>
      )}

      <div className="mt-6 space-y-3">
        {days.map((day, i) => {
          const iso = toISODate(day);
          const isToday = isSameDay(day, today);
          return (
            <div
              key={iso}
              className={
                "card !p-4 " +
                (isToday ? "ring-2 ring-brand-300" : "")
              }
            >
              <div className="mb-3 flex items-baseline gap-2">
                <span className="font-bold text-stone-900 dark:text-stone-100">
                  {WEEKDAYS[i]}
                </span>
                <span className="text-sm text-stone-400">{shortDate(day)}</span>
                {isToday && (
                  <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-semibold text-brand-700">
                    Today
                  </span>
                )}
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                {MEALS.map((meal) => {
                  const k = key(iso, meal.type);
                  const cell = cells[k];
                  const isEditing = editing === k;
                  return (
                    <div
                      key={meal.type}
                      className="rounded-2xl bg-stone-50 p-3 dark:bg-stone-800/50"
                    >
                      <div className="mb-1 text-xs font-medium text-stone-400">
                        {meal.icon} {meal.label}
                      </div>

                      {isEditing ? (
                        <input
                          autoFocus
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => {
                            saveMeal(iso, meal.type, draft);
                            setEditing(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              saveMeal(iso, meal.type, draft);
                              setEditing(null);
                            }
                            if (e.key === "Escape") setEditing(null);
                          }}
                          placeholder="Dish name"
                          className="w-full rounded-lg border border-stone-200 bg-white px-2 py-1 text-sm outline-none focus:border-brand-400 dark:border-stone-600 dark:bg-stone-800"
                        />
                      ) : cell?.title ? (
                        <div>
                          <button
                            onClick={() => {
                              setDraft(cell.title);
                              setEditing(k);
                            }}
                            className="text-left text-sm font-medium text-stone-800 hover:text-brand-600 dark:text-stone-100"
                          >
                            {cell.title}
                          </button>
                          <div className="mt-1 flex gap-2">
                            <button
                              onClick={() => cook(cell.title)}
                              className="text-xs font-semibold text-brand-600 hover:underline"
                            >
                              🍳 Cook
                            </button>
                            <button
                              onClick={() => saveMeal(iso, meal.type, "")}
                              className="text-xs text-stone-400 hover:text-red-500"
                            >
                              Clear
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setDraft("");
                            setEditing(k);
                          }}
                          className="text-sm text-stone-400 hover:text-brand-500"
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
