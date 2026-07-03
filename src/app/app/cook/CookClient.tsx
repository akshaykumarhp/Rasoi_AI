"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSpeech } from "@/lib/useSpeech";
import { matchIntent } from "@/lib/intents";
import type { Profile, Recipe } from "@/lib/types";

type Stage = "input" | "loading" | "recipe" | "cooking";

export default function CookClient({ profile }: { profile: Profile }) {
  const supabase = createClient();
  const speech = useSpeech(profile.language ?? "en", profile.voice_language ?? "en-US");

  const [stage, setStage] = useState<Stage>("input");
  const [prompt, setPrompt] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(Boolean(profile.voice_enabled));
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);

  const stepRef = useRef(0);
  const recipeRef = useRef<Recipe | null>(null);
  useEffect(() => {
    stepRef.current = stepIndex;
  }, [stepIndex]);
  useEffect(() => {
    recipeRef.current = recipe;
  }, [recipe]);

  // Prefill + auto-generate when arriving from the planner (?q=Dish name).
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setPrompt(q);
      generate(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- generate ----------
  async function generate(override?: string) {
    const text = (override ?? prompt).trim();
    if (!text) return;
    setStage("loading");
    setError("");
    try {
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const r: Recipe = data.recipe;
      setRecipe(r);
      setStepIndex(0);
      setStage("recipe");
      // Save for later (meal planning) — best effort, don't block the UI.
      supabase
        .from("recipes")
        .insert({
          user_id: profile.id,
          title: r.title,
          servings: r.servings,
          cuisine: r.cuisine,
          ingredients: r.ingredients,
          steps: r.steps,
          notes: r.notes ?? null,
        })
        .then(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("input");
    }
  }

  // ---------- voice input (dictation) ----------
  async function dictate() {
    if (speech.canAutoListen) {
      speech.startContinuous((text) => {
        setPrompt((p) => (p ? `${p} ${text}` : text));
        speech.stopContinuous();
      });
    } else if (!recording) {
      await speech.startRecording();
      setRecording(true);
    } else {
      const text = await speech.stopRecording();
      setRecording(false);
      if (text) setPrompt((p) => (p ? `${p} ${text}` : text));
    }
  }

  // ---------- cooking navigation ----------
  const steps = recipe?.steps ?? [];

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, (recipeRef.current?.steps.length ?? 1) - 1)),
    [],
  );
  const goBack = useCallback(() => setStepIndex((i) => Math.max(i - 1, 0)), []);

  const startCooking = () => {
    setStepIndex(0);
    setStage("cooking");
  };
  const stopCooking = useCallback(() => {
    speech.stopContinuous();
    speech.stopSpeaking();
    setStage("recipe");
  }, [speech]);

  // Speak the current step whenever it changes during cooking.
  useEffect(() => {
    if (stage === "cooking" && voiceOn && recipe) {
      speech.speak(`Step ${stepIndex + 1}. ${recipe.steps[stepIndex]}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, stepIndex, voiceOn]);

  // Hands-free command listening (native continuous) while cooking.
  useEffect(() => {
    if (stage !== "cooking" || !voiceOn || !speech.canAutoListen) return;
    speech.startContinuous((phrase) => {
      const intent = matchIntent(phrase);
      if (intent === "next") goNext();
      else if (intent === "back") goBack();
      else if (intent === "stop") stopCooking();
      else if (intent === "repeat" && recipeRef.current) {
        speech.speak(
          `Step ${stepRef.current + 1}. ${recipeRef.current.steps[stepRef.current]}`,
        );
      }
    });
    return () => speech.stopContinuous();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, voiceOn, speech.canAutoListen]);

  // Push-to-talk command (iOS fallback).
  async function pushCommand() {
    if (!recording) {
      await speech.startRecording();
      setRecording(true);
    } else {
      const text = await speech.stopRecording();
      setRecording(false);
      const intent = matchIntent(text);
      if (intent === "next") goNext();
      else if (intent === "back") goBack();
      else if (intent === "stop") stopCooking();
      else if (intent === "repeat" && recipe) {
        speech.speak(`Step ${stepIndex + 1}. ${recipe.steps[stepIndex]}`);
      }
    }
  }

  // ============ RENDER ============
  if (stage === "loading") {
    return (
      <div className="card flex flex-col items-center py-16 text-center">
        <div className="animate-spin text-4xl">🍳</div>
        <p className="mt-4 text-lg font-medium text-stone-600 dark:text-stone-300">
          Cooking up a recipe just for you…
        </p>
      </div>
    );
  }

  if (stage === "cooking" && recipe) {
    const isLast = stepIndex === steps.length - 1;
    return (
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50">
            {recipe.title}
          </h1>
          <button onClick={stopCooking} className="btn-secondary !py-2">
            ✕ Exit
          </button>
        </div>

        <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-stone-100 dark:bg-stone-800">
          <div
            className="h-full bg-brand-500 transition-all"
            style={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          />
        </div>
        <p className="mb-4 text-sm font-medium text-stone-400">
          Step {stepIndex + 1} of {steps.length}
        </p>

        <div className="card min-h-[40vh] items-center justify-center text-center">
          <p className="text-2xl leading-relaxed text-stone-900 dark:text-stone-50 sm:text-3xl">
            {steps[stepIndex]}
          </p>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <button onClick={goBack} disabled={stepIndex === 0} className="btn-secondary disabled:opacity-40">
            ⬅ Back
          </button>
          <button
            onClick={() => recipe && speech.speak(`Step ${stepIndex + 1}. ${steps[stepIndex]}`)}
            className="btn-secondary"
          >
            🔊 Repeat
          </button>
          <button
            onClick={isLast ? stopCooking : goNext}
            className="btn-primary"
          >
            {isLast ? "✓ Done" : "Next ➡"}
          </button>
        </div>

        {voiceOn && (
          <div className="mt-5 text-center text-sm text-stone-500">
            {speech.canAutoListen ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                Listening — say “next”, “back”, “repeat”, or “stop”
              </span>
            ) : (
              <button
                onMouseDown={pushCommand}
                onClick={pushCommand}
                className={"btn-secondary " + (recording ? "ring-2 ring-red-400" : "")}
              >
                {recording ? "● Listening… tap to send" : "🎤 Tap to speak a command"}
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (stage === "recipe" && recipe) {
    return (
      <div>
        <button onClick={() => setStage("input")} className="mb-4 text-sm text-stone-500 hover:underline">
          ← New recipe
        </button>
        <div className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
                {recipe.title}
              </h1>
              <p className="mt-1 text-stone-500">
                {recipe.cuisine} · serves {recipe.servings}
              </p>
            </div>
          </div>

          <h2 className="mt-6 font-bold text-stone-800 dark:text-stone-200">Ingredients</h2>
          <ul className="mt-2 space-y-1">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-2 text-stone-700 dark:text-stone-300">
                <span className="text-brand-500">•</span>
                <span>
                  <strong>
                    {ing.quantity} {ing.unit}
                  </strong>{" "}
                  {ing.item}
                </span>
              </li>
            ))}
          </ul>

          <h2 className="mt-6 font-bold text-stone-800 dark:text-stone-200">Steps</h2>
          <ol className="mt-2 space-y-2">
            {recipe.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-stone-700 dark:text-stone-300">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {i + 1}
                </span>
                <span>{s}</span>
              </li>
            ))}
          </ol>

          {recipe.notes && (
            <p className="mt-4 rounded-2xl bg-brand-50 p-3 text-sm text-brand-800">
              💡 {recipe.notes}
            </p>
          )}
        </div>

        <div className="mt-5 flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
            <input
              type="checkbox"
              checked={voiceOn}
              onChange={(e) => setVoiceOn(e.target.checked)}
              className="h-5 w-5 accent-brand-500"
            />
            Read steps aloud {speech.canAutoListen ? "& listen for commands" : ""}
          </label>
          <button onClick={startCooking} className="btn-primary">
            ▶ Start cooking
          </button>
        </div>
        {voiceOn && speech.voiceReady && !speech.hasExactVoice && (
          <p className="mt-2 text-xs text-stone-400">
            Your device doesn&rsquo;t have a voice for this language yet — steps
            will be read in the closest available voice.
          </p>
        )}
      </div>
    );
  }

  // stage === "input"
  return (
    <div>
      <h1 className="text-3xl font-extrabold text-stone-900 dark:text-stone-50">
        What&rsquo;s in the fridge?
      </h1>
      <p className="mt-2 text-stone-500 dark:text-stone-400">
        List your ingredients, or just say what you feel like eating. Type or use
        the mic.
      </p>

      <div className="card mt-6">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={4}
          placeholder="e.g. I have paneer, tomatoes, onions and rice. Something quick for dinner."
          className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-800"
        />
        <div className="mt-3 flex items-center gap-3">
          <button onClick={() => generate()} disabled={!prompt.trim()} className="btn-primary disabled:opacity-50">
            Get a recipe
          </button>
          <button
            onClick={dictate}
            className={"btn-secondary " + (speech.listening || recording ? "ring-2 ring-red-400" : "")}
          >
            {speech.listening || recording ? "● Listening…" : "🎤 Speak"}
          </button>
        </div>
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {["Quick dinner ideas", "Healthy breakfast", "Use up leftover rice"].map((s) => (
          <button
            key={s}
            onClick={() => setPrompt(s)}
            className="rounded-full bg-stone-100 px-4 py-2 text-sm text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-300"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
