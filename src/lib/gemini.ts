import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { Profile } from "./types";

export function getGenAI() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
}

/**
 * Free-tier Gemini models to rotate through. Each model has its OWN daily
 * request quota, so trying them in turn multiplies the effective RPD. Ordered
 * best-quality first. Override with GEMINI_MODELS="a,b,c" if you like.
 */
export const TEXT_MODELS: string[] = (
  process.env.GEMINI_MODELS ??
  [
    "gemini-2.5-flash",
    "gemini-2.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-flash",
    "gemini-1.5-flash-8b",
  ].join(",")
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

/** Audio-capable subset (used for speech transcription). */
export const AUDIO_MODELS: string[] = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.0-flash",
];

/** True when an error is retriable (rate-limit, quota, transient service, or model not found). */
function isQuotaError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("503") ||
    msg.includes("404") ||
    msg.includes("quota") ||
    msg.includes("not found") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("exceeded") ||
    msg.includes("high demand") ||
    msg.includes("temporarily unavailable")
  );
}

/** Parse JSON even when a model wraps it in prose or code fences. */
function parseJSONLoose(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error("No JSON object found in model response");
  }
}

/** An OpenAI-compatible chat-completions provider (Groq, OpenRouter, GitHub…). */
interface OpenAIProvider {
  name: string;
  url: string; // full chat/completions endpoint
  apiKey: string;
  model: string;
  extraHeaders?: Record<string, string>;
}

/** Free OpenAI-compatible providers, in fallback order. Only enabled when a key is set. */
function openAIProviders(): OpenAIProvider[] {
  const list: (OpenAIProvider | null)[] = [
    process.env.GROQ_API_KEY
      ? {
          name: "Groq",
          url: "https://api.groq.com/openai/v1/chat/completions",
          apiKey: process.env.GROQ_API_KEY,
          model: process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile",
        }
      : null,
    process.env.OPENROUTER_API_KEY
      ? {
          name: "OpenRouter",
          url: "https://openrouter.ai/api/v1/chat/completions",
          apiKey: process.env.OPENROUTER_API_KEY,
          model: process.env.OPENROUTER_MODEL ?? "openai/gpt-oss-20b:free",
          extraHeaders: { "X-Title": "Rasoi Assistant" },
        }
      : null,
    process.env.GITHUB_MODELS_TOKEN
      ? {
          name: "GitHub Models",
          url:
            (process.env.GITHUB_MODELS_URL ??
              "https://models.github.ai/inference") + "/chat/completions",
          apiKey: process.env.GITHUB_MODELS_TOKEN,
          model: process.env.GITHUB_MODEL ?? "openai/gpt-4.1-mini",
        }
      : null,
  ];
  return list.filter((p): p is OpenAIProvider => p !== null);
}

/** Call an OpenAI-compatible provider and parse a JSON object from the reply. */
async function callOpenAIJSON(
  provider: OpenAIProvider,
  system: string,
  user: string,
): Promise<unknown> {
  const res = await fetch(provider.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
      ...(provider.extraHeaders ?? {}),
    },
    body: JSON.stringify({
      model: provider.model,
      stream: false,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`${provider.name} request failed (${res.status})`);
  }
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return parseJSONLoose(data.choices?.[0]?.message?.content ?? "{}");
}

/** Local Ollama fallback (structured JSON) when all Gemini models are spent. */
async function callOllamaJSON(system: string, user: string): Promise<unknown> {
  const url = process.env.OLLAMA_URL ?? "http://localhost:11434";
  const model = process.env.OLLAMA_MODEL ?? "llama3.1";
  const res = await fetch(`${url}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      stream: false,
      format: "json",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    throw new Error(`Ollama request failed (${res.status})`);
  }
  const data = (await res.json()) as { message?: { content?: string } };
  return parseJSONLoose(data.message?.content ?? "{}");
}

/**
 * Generates structured JSON: tries each free Gemini model in turn, skipping
 * ones that are rate-limited, and finally falls back to local Ollama.
 */
async function generateJSONWithFallback(opts: {
  system: string;
  prompt: string;
  schema: ResponseSchema;
  jsonHint: string;
}): Promise<unknown> {
  const genAI = getGenAI();
  let lastErr: unknown;
  const providers = openAIProviders();

  console.log(
    `[llm] starting cascade: ${TEXT_MODELS.length} Gemini models + ${providers.map((p) => p.name).join("/")} + Ollama`,
  );

  for (const model of TEXT_MODELS) {
    try {
      console.log(`[llm] trying Gemini ${model}…`);
      const m = genAI.getGenerativeModel({
        model,
        systemInstruction: opts.system,
        generationConfig: {
          responseMimeType: "application/json",
          responseSchema: opts.schema,
        },
      });
      const result = await m.generateContent(opts.prompt);
      console.log(`[llm] ✓ ${model} succeeded`);
      return JSON.parse(result.response.text());
    } catch (e) {
      lastErr = e;
      if (isQuotaError(e)) {
        console.warn(`[llm] ${model} rate-limited — trying next`);
        continue;
      }
      console.error(`[llm] ${model} failed (non-quota error)`, e);
      throw e; // real error, don't mask it
    }
  }

  // Gemini exhausted — try free OpenAI-compatible providers.
  const userWithHint = `${opts.prompt}\n\nReturn ONLY valid JSON. ${opts.jsonHint}`;
  if (providers.length === 0) {
    console.warn("[llm] no OpenAI-compatible providers configured");
  }
  for (const provider of providers) {
    try {
      console.log(`[llm] trying ${provider.name}…`);
      const result = await callOpenAIJSON(provider, opts.system, userWithHint);
      console.log(`[llm] ✓ ${provider.name} succeeded`);
      return result;
    } catch (e) {
      lastErr = e;
      console.warn(`[llm] ${provider.name} failed:`, (e as Error)?.message);
    }
  }

  // Finally, local Ollama.
  console.warn("[llm] all cloud providers exhausted — trying local Ollama…");
  try {
    const result = await callOllamaJSON(opts.system, userWithHint);
    console.log("[llm] ✓ Ollama succeeded");
    return result;
  } catch (ollamaErr) {
    console.error("[llm] Ollama fallback failed", ollamaErr);
    throw lastErr ?? ollamaErr;
  }
}

/** Transcribes audio, rotating through audio-capable Gemini models. */
export async function transcribeAudio(
  base64: string,
  mimeType: string,
  language: string,
): Promise<string> {
  const genAI = getGenAI();
  for (const model of AUDIO_MODELS) {
    try {
      const m = genAI.getGenerativeModel({ model });
      const result = await m.generateContent([
        {
          text:
            `Transcribe this spoken audio to plain text in its original ` +
            `language (expected code: ${language}). Return ONLY the transcript.`,
        },
        { inlineData: { mimeType, data: base64 } },
      ]);
      return result.response.text().trim();
    } catch (e) {
      console.warn(`[llm] transcription via ${model} failed — trying next`);
      // Audio support varies by model; move on regardless of error type.
    }
  }
  throw new Error("All Gemini models are exhausted for transcription today.");
}

const UNIT_GUIDANCE: Record<Profile["units"], string> = {
  metric: "Use metric units (grams, milliliters, °C).",
  imperial: "Use imperial units (ounces, cups, °F).",
  indian:
    "Use everyday Indian home measures: katori (bowl), chammach (spoon), cups, and °C. Add grams in parentheses when helpful.",
};

/**
 * Every recipe — regardless of which provider answered — must follow this
 * exact 5-part structure, in this order. Only Gemini gets schema enforcement;
 * the other providers only see this as an instruction, so it's spelled out
 * explicitly and reinforced by normalizeRecipe() below as a safety net.
 */
const RECIPE_STRUCTURE_RULES =
  "Structure every recipe into exactly these parts, in this order, and use " +
  "these exact JSON keys:\n" +
  "1. ingredients — full list with quantity and unit for each item.\n" +
  "2. preparation — pre-cooking prep: washing, chopping, marinating, preheating, mise en place.\n" +
  "3. cooking — the actual cooking steps, in order.\n" +
  "4. garnishing — garnish or plating steps. Use an empty array if the dish has no garnish.\n" +
  "5. postCooking — resting, serving, or storage tips. Use an empty array if not applicable.\n" +
  "Never merge these into one flat step list. Each array holds short, clear, one-action-at-a-time instructions.";

/**
 * Builds the system instruction for Gemini from the user's profile so every
 * response is personalized (language, units, cuisine, diet, health).
 */
export function buildSystemInstruction(profile: Partial<Profile>): string {
  const lines: string[] = [
    "You are Rasoi Assistant, a warm, patient cooking companion for home cooks of all ages worldwide.",
    "Speak simply and encouragingly. Keep steps short, clear, and doable one at a time.",
  ];

  if (profile.language && profile.language !== "en") {
    lines.push(
      `Respond in the user's language (BCP-47 code: ${profile.language}). Keep ingredient names recognizable.`,
    );
  }
  lines.push(UNIT_GUIDANCE[profile.units ?? "metric"]);

  if (profile.cuisines?.length) {
    lines.push(`Favor these cuisines when relevant: ${profile.cuisines.join(", ")}.`);
  }
  if (profile.diet) {
    lines.push(`The user's diet is ${profile.diet}. Never suggest anything that violates it.`);
  }
  if (profile.health_flags?.length) {
    lines.push(
      `Respect these health needs: ${profile.health_flags.join(", ")}. Adjust ingredients accordingly.`,
    );
  }
  if (profile.allergies?.length) {
    lines.push(
      `ALLERGIES — must never appear in any recipe: ${profile.allergies.join(", ")}.`,
    );
  }

  return lines.join("\n");
}

/**
 * JSON schema every recipe must follow, regardless of which provider answers.
 * Steps are split into fixed phases so the UI (and voice cooking loop) can
 * render/announce them the same way no matter which free model responded.
 */
export const RECIPE_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    title: { type: SchemaType.STRING },
    servings: { type: SchemaType.NUMBER },
    cuisine: { type: SchemaType.STRING },
    ingredients: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          item: { type: SchemaType.STRING },
          quantity: { type: SchemaType.STRING },
          unit: { type: SchemaType.STRING },
        },
        required: ["item", "quantity", "unit"],
      },
    },
    preparation: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    cooking: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    garnishing: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    postCooking: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    notes: { type: SchemaType.STRING },
  },
  required: [
    "title",
    "servings",
    "cuisine",
    "ingredients",
    "preparation",
    "cooking",
    "garnishing",
    "postCooking",
  ],
};

/** Coerce a string field, defaulting when missing/wrong type. */
function str(v: unknown, fallback = ""): string {
  return typeof v === "string" && v.trim() ? v : fallback;
}

/** Coerce a phase into a clean string array, tolerating odd shapes from weaker models. */
function stepArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v
    .map((s) => (typeof s === "string" ? s : typeof s === "object" && s && "text" in s ? String((s as { text: unknown }).text) : ""))
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Normalizes whatever a provider returns into the standard 5-part recipe
 * shape. Gemini's schema enforces this already; the fallback providers
 * (Groq/OpenRouter/GitHub/Ollama) only get a text instruction, so this is
 * the safety net that guarantees every response looks identical to the UI.
 */
function normalizeRecipe(raw: unknown): unknown {
  const r = (raw ?? {}) as Record<string, unknown>;

  const ingredients = Array.isArray(r.ingredients)
    ? r.ingredients.map((i) => {
        const ing = (i ?? {}) as Record<string, unknown>;
        return {
          item: str(ing.item, "Ingredient"),
          quantity: str(ing.quantity, ""),
          unit: str(ing.unit, ""),
        };
      })
    : [];

  // Some weaker models still return a flat "steps" array despite instructions —
  // treat that whole list as the "cooking" phase rather than losing the data.
  const legacySteps = stepArray(r.steps);

  return {
    title: str(r.title, "Recipe"),
    servings: typeof r.servings === "number" && r.servings > 0 ? r.servings : 2,
    cuisine: str(r.cuisine, "International"),
    ingredients,
    preparation: stepArray(r.preparation),
    cooking: stepArray(r.cooking).length ? stepArray(r.cooking) : legacySteps,
    garnishing: stepArray(r.garnishing),
    postCooking: stepArray(r.postCooking),
    notes: typeof r.notes === "string" ? r.notes : undefined,
  };
}

export interface RecipeRequest {
  profile: Partial<Profile>;
  /** Free-text ask, e.g. ingredient list or "something light for dinner". */
  prompt: string;
}

/** Generates a single structured recipe, normalized to the same shape for every provider. */
export async function generateRecipe({ profile, prompt }: RecipeRequest) {
  const raw = await generateJSONWithFallback({
    system: `${buildSystemInstruction(profile)}\n${RECIPE_STRUCTURE_RULES}`,
    prompt,
    schema: RECIPE_SCHEMA,
    jsonHint:
      "Shape: {title:string, servings:number, cuisine:string, " +
      "ingredients:[{item:string, quantity:string, unit:string}], " +
      "preparation:[string], cooking:[string], garnishing:[string], " +
      "postCooking:[string], notes?:string}.",
  });
  return normalizeRecipe(raw);
}

/** JSON schema for an auto-generated meal plan. */
export const MEAL_PLAN_SCHEMA: ResponseSchema = {
  type: SchemaType.OBJECT,
  properties: {
    meals: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          dayOffset: { type: SchemaType.NUMBER }, // 0 = first day
          mealType: { type: SchemaType.STRING }, // breakfast | lunch | dinner
          title: { type: SchemaType.STRING },
        },
        required: ["dayOffset", "mealType", "title"],
      },
    },
  },
  required: ["meals"],
};

export interface MealPlanSlot {
  dayOffset: number;
  mealType: string;
  title: string;
}

/** Generates a balanced multi-day meal plan personalized to the profile. */
export async function generateMealPlan({
  profile,
  days,
  mealTypes,
}: {
  profile: Partial<Profile>;
  days: number;
  mealTypes: string[];
}): Promise<MealPlanSlot[]> {
  const prompt =
    `Create a balanced ${days}-day meal plan covering these meals each day: ` +
    `${mealTypes.join(", ")}. Vary cuisines, proteins, and vegetables across the ` +
    `days so nothing repeats. Keep each dish home-cookable. Use dayOffset 0 for ` +
    `the first day up to ${days - 1} for the last. Return only dish titles.`;

  const parsed = (await generateJSONWithFallback({
    system: buildSystemInstruction(profile),
    prompt,
    schema: MEAL_PLAN_SCHEMA,
    jsonHint:
      "Shape: {meals:[{dayOffset:number, mealType:string, title:string}]}.",
  })) as { meals?: MealPlanSlot[] };

  return parsed.meals ?? [];
}
