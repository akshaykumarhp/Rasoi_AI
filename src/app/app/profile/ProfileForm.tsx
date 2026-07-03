"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  CUISINES,
  DIETS,
  HEALTH_FLAGS,
  LANGUAGES,
  UNITS,
} from "@/lib/options";
import type { Diet, HealthFlag, Profile, Units } from "@/lib/types";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded-full px-4 py-2 text-sm font-medium transition " +
        (active
          ? "bg-brand-500 text-white shadow-sm"
          : "bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300")
      }
    >
      {children}
    </button>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-stone-100 py-5 first:border-t-0 first:pt-0 dark:border-stone-800">
      <div className="mb-3 font-semibold text-stone-800 dark:text-stone-200">
        {label}
      </div>
      {children}
    </div>
  );
}

export default function ProfileForm({
  initial,
  email,
}: {
  initial: Profile;
  email: string;
}) {
  const supabase = createClient();
  const [p, setP] = useState<Profile>(initial);
  const [allergyInput, setAllergyInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  function toggle<T>(list: T[], value: T): T[] {
    return list.includes(value)
      ? list.filter((v) => v !== value)
      : [...list, value];
  }

  function addAllergy() {
    const v = allergyInput.trim().toLowerCase();
    if (v && !p.allergies.includes(v)) {
      setP({ ...p, allergies: [...p.allergies, v] });
    }
    setAllergyInput("");
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    const { error } = await supabase.from("profiles").upsert({
      id: p.id,
      name: p.name,
      language: p.language,
      units: p.units,
      cuisines: p.cuisines,
      diet: p.diet,
      health_flags: p.health_flags,
      allergies: p.allergies,
      voice_enabled: p.voice_enabled,
      voice_language: p.voice_language,
      updated_at: new Date().toISOString(),
    });
    setSaving(false);
    if (!error) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } else {
      alert(error.message);
    }
  }

  return (
    <div className="card">
      <Field label="Name">
        <input
          value={p.name}
          onChange={(e) => setP({ ...p, name: e.target.value })}
          placeholder="What should we call you?"
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-800"
        />
        <p className="mt-1 text-sm text-stone-400">Signed in as {email}</p>
      </Field>

      <Field label="Language">
        <select
          value={p.language}
          onChange={(e) => {
            const lang = LANGUAGES.find((l) => l.code === e.target.value)!;
            setP({ ...p, language: lang.code, voice_language: lang.voice });
          }}
          className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-400 dark:border-stone-700 dark:bg-stone-800"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Units">
        <div className="flex flex-wrap gap-2">
          {UNITS.map((u) => (
            <Chip
              key={u.value}
              active={p.units === u.value}
              onClick={() => setP({ ...p, units: u.value as Units })}
            >
              {u.label} · {u.hint}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Favorite cuisines">
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <Chip
              key={c}
              active={p.cuisines.includes(c)}
              onClick={() => setP({ ...p, cuisines: toggle(p.cuisines, c) })}
            >
              {c}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Diet">
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Chip
              key={d.value}
              active={p.diet === d.value}
              onClick={() => setP({ ...p, diet: d.value as Diet })}
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Health preferences">
        <div className="flex flex-wrap gap-2">
          {HEALTH_FLAGS.map((h) => (
            <Chip
              key={h.value}
              active={p.health_flags.includes(h.value)}
              onClick={() =>
                setP({
                  ...p,
                  health_flags: toggle(p.health_flags, h.value) as HealthFlag[],
                })
              }
            >
              {h.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Allergies (never included in recipes)">
        <div className="flex flex-wrap gap-2">
          {p.allergies.map((a) => (
            <span
              key={a}
              className="flex items-center gap-1 rounded-full bg-red-50 px-3 py-1.5 text-sm text-red-700"
            >
              {a}
              <button
                type="button"
                onClick={() =>
                  setP({ ...p, allergies: p.allergies.filter((x) => x !== a) })
                }
                className="text-red-400 hover:text-red-600"
                aria-label={`Remove ${a}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
        <div className="mt-2 flex gap-2">
          <input
            value={allergyInput}
            onChange={(e) => setAllergyInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addAllergy();
              }
            }}
            placeholder="e.g. peanuts"
            className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 outline-none focus:border-brand-400 dark:border-stone-700 dark:bg-stone-800"
          />
          <button type="button" onClick={addAllergy} className="btn-secondary">
            Add
          </button>
        </div>
      </Field>

      <Field label="Voice">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={p.voice_enabled}
            onChange={(e) => setP({ ...p, voice_enabled: e.target.checked })}
            className="h-5 w-5 accent-brand-500"
          />
          <span className="text-stone-700 dark:text-stone-300">
            Enable hands-free voice cooking (read steps aloud, listen for
            &ldquo;next / repeat / back&rdquo;)
          </span>
        </label>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && <span className="text-sm font-medium text-green-600">✓ Saved</span>}
      </div>
    </div>
  );
}
