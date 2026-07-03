"use client";

import { useState } from "react";
import { Check, X, Plus, Ruler, Globe, Salad, HeartPulse, Mic, TriangleAlert } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { CUISINES, DIETS, HEALTH_FLAGS, LANGUAGES, UNITS } from "@/lib/options";
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
    <button type="button" onClick={onClick} className={active ? "chip-on" : "chip-off"}>
      {active && <Check className="h-3.5 w-3.5" />}
      {children}
    </button>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-border py-5 first:border-t-0 first:pt-0">
      <div className="mb-3 flex items-center gap-2 font-heading font-semibold text-foreground">
        {Icon && <Icon className="h-4 w-4 text-primary" />}
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
    return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
  }

  function addAllergy() {
    const v = allergyInput.trim().toLowerCase();
    if (v && !p.allergies.includes(v)) setP({ ...p, allergies: [...p.allergies, v] });
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
          className="field"
        />
        <p className="mt-1.5 text-sm text-muted-foreground">Signed in as {email}</p>
      </Field>

      <Field label="Language" icon={Globe}>
        <select
          value={p.language}
          onChange={(e) => {
            const lang = LANGUAGES.find((l) => l.code === e.target.value)!;
            setP({ ...p, language: lang.code, voice_language: lang.voice });
          }}
          className="field"
        >
          {LANGUAGES.map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Units" icon={Ruler}>
        <div className="flex flex-wrap gap-2">
          {UNITS.map((u) => (
            <Chip key={u.value} active={p.units === u.value} onClick={() => setP({ ...p, units: u.value as Units })}>
              {u.label} · {u.hint}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Favorite cuisines" icon={Globe}>
        <div className="flex flex-wrap gap-2">
          {CUISINES.map((c) => (
            <Chip key={c} active={p.cuisines.includes(c)} onClick={() => setP({ ...p, cuisines: toggle(p.cuisines, c) })}>
              {c}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Diet" icon={Salad}>
        <div className="flex flex-wrap gap-2">
          {DIETS.map((d) => (
            <Chip key={d.value} active={p.diet === d.value} onClick={() => setP({ ...p, diet: d.value as Diet })}>
              {d.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Health preferences" icon={HeartPulse}>
        <div className="flex flex-wrap gap-2">
          {HEALTH_FLAGS.map((h) => (
            <Chip
              key={h.value}
              active={p.health_flags.includes(h.value)}
              onClick={() => setP({ ...p, health_flags: toggle(p.health_flags, h.value) as HealthFlag[] })}
            >
              {h.label}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Allergies (never included in recipes)" icon={TriangleAlert}>
        <div className="flex flex-wrap gap-2">
          {p.allergies.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-3 py-1.5 text-sm font-medium text-destructive"
            >
              {a}
              <button
                type="button"
                onClick={() => setP({ ...p, allergies: p.allergies.filter((x) => x !== a) })}
                aria-label={`Remove ${a}`}
              >
                <X className="h-3.5 w-3.5" />
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
            className="field flex-1"
          />
          <button type="button" onClick={addAllergy} className="btn-secondary">
            <Plus className="h-4 w-4" /> Add
          </button>
        </div>
      </Field>

      <Field label="Voice" icon={Mic}>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={p.voice_enabled}
            onChange={(e) => setP({ ...p, voice_enabled: e.target.checked })}
            className="h-5 w-5 accent-primary"
          />
          <span className="text-[15px] text-foreground/90">
            Enable hands-free voice cooking (read steps aloud, listen for
            &ldquo;next / repeat / back&rdquo;)
          </span>
        </label>
      </Field>

      <div className="flex items-center gap-3 pt-2">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? "Saving…" : "Save preferences"}
        </button>
        {saved && (
          <span className="inline-flex items-center gap-1 text-sm font-semibold text-accent">
            <Check className="h-4 w-4" /> Saved
          </span>
        )}
      </div>
    </div>
  );
}
