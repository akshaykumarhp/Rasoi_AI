"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mic,
  Loader2,
  ChevronLeft,
  Volume2,
  X,
  Check,
  Play,
  ArrowLeft,
  Refrigerator,
  Search,
  Sparkles,
  Users,
  Utensils,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSpeech } from "@/lib/useSpeech";
import { matchIntent } from "@/lib/intents";
import RecipeImage from "@/components/RecipeImage";
import {
  flattenRecipeSteps,
  PHASE_LABELS,
  RECIPE_PHASES,
  type PhaseStep,
  type Profile,
  type Recipe,
} from "@/lib/types";

type Stage = "input" | "loading" | "recipe" | "cooking";
export type ExperienceMode = "fridge" | "dish";

const MODES = {
  fridge: {
    icon: Refrigerator,
    title: "What's in the fridge?",
    subtitle:
      "List your ingredients, or say what you feel like eating. Type or use the mic.",
    placeholder:
      "e.g. I have paneer, tomatoes, onions and rice. Something quick for dinner.",
    cta: "Get a recipe",
    suggestions: ["Quick dinner ideas", "Healthy breakfast", "Use up leftover rice"],
  },
  dish: {
    icon: Search,
    title: "Find any dish",
    subtitle: "Type a dish name and get the full recipe, made for your taste.",
    placeholder: "e.g. Chicken Biryani, Margherita Pizza, Masala Dosa…",
    cta: "Get the recipe",
    suggestions: ["Butter Chicken", "Pad Thai", "Tiramisu", "Paneer Tikka"],
  },
} as const;

function announce(step: PhaseStep, index: number, firstOfPhase: boolean): string {
  const prefix = firstOfPhase ? `${PHASE_LABELS[step.phase]}. ` : "";
  return `${prefix}Step ${index + 1}. ${step.text}`;
}

export default function RecipeExperience({
  profile,
  mode,
}: {
  profile: Profile;
  mode: ExperienceMode;
}) {
  const cfg = MODES[mode];
  const supabase = createClient();
  const speech = useSpeech(profile.language ?? "en", profile.voice_language ?? "en-US");

  const [stage, setStage] = useState<Stage>("input");
  const [prompt, setPrompt] = useState("");
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [voiceOn, setVoiceOn] = useState(Boolean(profile.voice_enabled));
  const [error, setError] = useState("");
  const [recording, setRecording] = useState(false);

  const flatSteps = useMemo(
    () => (recipe ? flattenRecipeSteps(recipe) : []),
    [recipe],
  );
  const stepRef = useRef(0);
  const flatStepsRef = useRef<PhaseStep[]>([]);
  useEffect(() => void (stepRef.current = stepIndex), [stepIndex]);
  useEffect(() => void (flatStepsRef.current = flatSteps), [flatSteps]);

  // Arrive from a link (?q=Dish) → prefill + auto-generate.
  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) {
      setPrompt(q);
      generate(q);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function generate(override?: string) {
    const text = (override ?? prompt).trim();
    if (!text) return;
    setStage("loading");
    setError("");
    try {
      const framed =
        mode === "dish" ? `Give me a recipe for: ${text}` : text;
      const res = await fetch("/api/recipe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: framed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong");
      const r: Recipe = data.recipe;
      setRecipe(r);
      setStepIndex(0);
      setStage("recipe");
      supabase
        .from("recipes")
        .insert({
          user_id: profile.id,
          title: r.title,
          servings: r.servings,
          cuisine: r.cuisine,
          ingredients: r.ingredients,
          steps: {
            preparation: r.preparation,
            cooking: r.cooking,
            garnishing: r.garnishing,
            postCooking: r.postCooking,
          },
          notes: r.notes ?? null,
        })
        .then(() => {});
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setStage("input");
    }
  }

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

  const goNext = useCallback(
    () => setStepIndex((i) => Math.min(i + 1, (flatStepsRef.current.length ?? 1) - 1)),
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

  const firstOfPhase = (steps: PhaseStep[], i: number) =>
    i === 0 || steps[i - 1]?.phase !== steps[i]?.phase;

  useEffect(() => {
    if (stage === "cooking" && voiceOn && flatSteps[stepIndex]) {
      speech.speak(announce(flatSteps[stepIndex], stepIndex, firstOfPhase(flatSteps, stepIndex)));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, stepIndex, voiceOn]);

  useEffect(() => {
    if (stage !== "cooking" || !voiceOn || !speech.canAutoListen) return;
    speech.startContinuous((phrase) => {
      const intent = matchIntent(phrase);
      if (intent === "next") goNext();
      else if (intent === "back") goBack();
      else if (intent === "stop") stopCooking();
      else if (intent === "repeat") {
        const steps = flatStepsRef.current;
        const i = stepRef.current;
        if (steps[i]) speech.speak(announce(steps[i], i, firstOfPhase(steps, i)));
      }
    });
    return () => speech.stopContinuous();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, voiceOn, speech.canAutoListen]);

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
      else if (intent === "repeat" && flatSteps[stepIndex])
        speech.speak(announce(flatSteps[stepIndex], stepIndex, firstOfPhase(flatSteps, stepIndex)));
    }
  }

  // ============ RENDER ============
  return (
    <AnimatePresence mode="wait">
      {stage === "loading" && (
        <motion.div
          key="loading"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="card flex flex-col items-center py-16 text-center"
        >
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 font-heading text-lg font-semibold text-foreground">
            Cooking up something delicious…
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Personalizing it to your taste
          </p>
        </motion.div>
      )}

      {stage === "cooking" && recipe && flatSteps.length > 0 && (
        <CookingStage
          key="cooking"
          recipe={recipe}
          steps={flatSteps}
          stepIndex={stepIndex}
          firstOfPhase={firstOfPhase(flatSteps, stepIndex)}
          onBack={goBack}
          onNext={goNext}
          onStop={stopCooking}
          onRepeat={() =>
            speech.speak(announce(flatSteps[stepIndex], stepIndex, firstOfPhase(flatSteps, stepIndex)))
          }
          voiceOn={voiceOn}
          canAutoListen={speech.canAutoListen}
          recording={recording}
          onPushCommand={pushCommand}
        />
      )}

      {stage === "recipe" && recipe && (
        <RecipeStage
          key="recipe"
          recipe={recipe}
          voiceOn={voiceOn}
          setVoiceOn={setVoiceOn}
          canAutoListen={speech.canAutoListen}
          voiceReady={speech.voiceReady}
          hasExactVoice={speech.hasExactVoice}
          onNew={() => setStage("input")}
          onStart={startCooking}
        />
      )}

      {stage === "input" && (
        <motion.div
          key="input"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span className="eyebrow">
            <cfg.icon className="h-3.5 w-3.5" /> {mode === "dish" ? "Find a dish" : "Fridge mode"}
          </span>
          <h1 className="mt-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
            {cfg.title}
          </h1>
          <p className="mt-2 text-muted-foreground">{cfg.subtitle}</p>

          <div className="card mt-6">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={mode === "dish" ? 2 : 4}
              placeholder={cfg.placeholder}
              onKeyDown={(e) => {
                if (mode === "dish" && e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generate();
                }
              }}
              className="field resize-none"
            />
            <div className="mt-3 flex items-center gap-3">
              <button
                onClick={() => generate()}
                disabled={!prompt.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {cfg.cta}
              </button>
              <button
                onClick={dictate}
                className={
                  "btn-secondary " +
                  (speech.listening || recording ? "ring-2 ring-destructive/50" : "")
                }
              >
                <Mic className="h-4 w-4" />
                {speech.listening || recording ? "Listening…" : "Speak"}
              </button>
            </div>
            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {cfg.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setPrompt(s);
                  if (mode === "dish") generate(s);
                }}
                className="chip-off"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {s}
              </button>
            ))}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/* ---------- Recipe view ---------- */
function RecipeStage({
  recipe,
  voiceOn,
  setVoiceOn,
  canAutoListen,
  voiceReady,
  hasExactVoice,
  onNew,
  onStart,
}: {
  recipe: Recipe;
  voiceOn: boolean;
  setVoiceOn: (v: boolean) => void;
  canAutoListen: boolean;
  voiceReady: boolean;
  hasExactVoice: boolean;
  onNew: () => void;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <button
        onClick={onNew}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> New recipe
      </button>

      <div className="overflow-hidden rounded-3xl bg-card shadow-soft ring-1 ring-border">
        <div className="relative h-52 w-full sm:h-64">
          <RecipeImage title={recipe.title} className="h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 p-5">
            <h1 className="font-heading text-2xl font-bold text-white drop-shadow sm:text-3xl">
              {recipe.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-white/90">
              <span className="inline-flex items-center gap-1">
                <Utensils className="h-4 w-4" /> {recipe.cuisine}
              </span>
              <span className="inline-flex items-center gap-1">
                <Users className="h-4 w-4" /> serves {recipe.servings}
              </span>
            </div>
          </div>
        </div>

        <div className="p-6">
          <h2 className="font-heading text-lg font-semibold text-foreground">
            Ingredients
          </h2>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {recipe.ingredients.map((ing, i) => (
              <li key={i} className="flex gap-2 text-[15px] text-foreground/90">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>
                  <strong className="font-semibold">
                    {ing.quantity} {ing.unit}
                  </strong>{" "}
                  {ing.item}
                </span>
              </li>
            ))}
          </ul>

          {RECIPE_PHASES.map((phase) => {
            const items = recipe[phase];
            if (!items?.length) return null;
            return (
              <div key={phase} className="mt-7">
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {PHASE_LABELS[phase]}
                </h2>
                <ol className="mt-3 space-y-3">
                  {items.map((s, i) => (
                    <li key={i} className="flex gap-3 text-[15px] text-foreground/90">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary-soft text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <span className="pt-0.5">{s}</span>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}

          {recipe.notes && (
            <p className="mt-6 flex gap-2 rounded-2xl bg-accent-soft p-4 text-sm text-foreground">
              <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              {recipe.notes}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={voiceOn}
            onChange={(e) => setVoiceOn(e.target.checked)}
            className="h-5 w-5 accent-primary"
          />
          Read steps aloud {canAutoListen ? "& listen for commands" : ""}
        </label>
        <button onClick={onStart} className="btn-primary w-full sm:w-auto">
          <Play className="h-4 w-4" /> Start cooking
        </button>
      </div>
      {voiceOn && voiceReady && !hasExactVoice && (
        <p className="mt-2 text-xs text-muted-foreground">
          Your device doesn&rsquo;t have a voice for this language yet — steps
          will be read in the closest available voice.
        </p>
      )}
    </motion.div>
  );
}

/* ---------- Guided cooking ---------- */
function CookingStage({
  recipe,
  steps,
  stepIndex,
  firstOfPhase,
  onBack,
  onNext,
  onStop,
  onRepeat,
  voiceOn,
  canAutoListen,
  recording,
  onPushCommand,
}: {
  recipe: Recipe;
  steps: PhaseStep[];
  stepIndex: number;
  firstOfPhase: boolean;
  onBack: () => void;
  onNext: () => void;
  onStop: () => void;
  onRepeat: () => void;
  voiceOn: boolean;
  canAutoListen: boolean;
  recording: boolean;
  onPushCommand: () => void;
}) {
  const isLast = stepIndex === steps.length - 1;
  const current = steps[stepIndex];
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h1 className="font-heading text-xl font-bold text-foreground">
          {recipe.title}
        </h1>
        <button onClick={onStop} className="btn-ghost !px-3 !py-2">
          <X className="h-4 w-4" /> Exit
        </button>
      </div>

      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full rounded-full bg-gradient-to-r from-primary to-primary-hover"
          animate={{ width: `${((stepIndex + 1) / steps.length) * 100}%` }}
          transition={{ ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="mb-4 text-sm font-semibold text-muted-foreground">
        Step {stepIndex + 1} of {steps.length}
      </p>

      <div className="card flex min-h-[42vh] flex-col items-center justify-center text-center">
        <span className="eyebrow">{PHASE_LABELS[current.phase]}</span>
        <AnimatePresence mode="wait">
          <motion.p
            key={stepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="mt-4 font-heading text-2xl leading-relaxed text-foreground sm:text-3xl"
          >
            {current.text}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-3">
        <button onClick={onBack} disabled={stepIndex === 0} className="btn-secondary disabled:opacity-40">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <button onClick={onRepeat} className="btn-secondary">
          <Volume2 className="h-4 w-4" /> Repeat
        </button>
        <button onClick={isLast ? onStop : onNext} className="btn-primary">
          {isLast ? (
            <>
              <Check className="h-4 w-4" /> Done
            </>
          ) : (
            <>
              Next <ChevronLeft className="h-4 w-4 rotate-180" />
            </>
          )}
        </button>
      </div>

      {voiceOn && (
        <div className="mt-5 text-center text-sm text-muted-foreground">
          {canAutoListen ? (
            <span className="inline-flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-destructive/60" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-destructive" />
              </span>
              Listening — say &ldquo;next&rdquo;, &ldquo;back&rdquo;, &ldquo;repeat&rdquo;, or &ldquo;stop&rdquo;
            </span>
          ) : (
            <button
              onClick={onPushCommand}
              className={"btn-secondary " + (recording ? "ring-2 ring-destructive/50" : "")}
            >
              <Mic className="h-4 w-4" />
              {recording ? "Listening… tap to send" : "Tap to speak a command"}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}
