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

/** True when an error is a rate-limit / quota-exhausted condition. */
function isQuotaError(e: unknown): boolean {
  const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("resource_exhausted") ||
    msg.includes("rate limit") ||
    msg.includes("exceeded")
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

/** JSON schema Gemini must follow when returning a recipe. */
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
    steps: { type: SchemaType.ARRAY, items: { type: SchemaType.STRING } },
    notes: { type: SchemaType.STRING },
  },
  required: ["title", "servings", "cuisine", "ingredients", "steps"],
};

export interface RecipeRequest {
  profile: Partial<Profile>;
  /** Free-text ask, e.g. ingredient list or "something light for dinner". */
  prompt: string;
}

/** Generates a single structured recipe personalized to the profile. */
export async function generateRecipe({ profile, prompt }: RecipeRequest) {
  return generateJSONWithFallback({
    system: buildSystemInstruction(profile),
    prompt,
    schema: RECIPE_SCHEMA,
    jsonHint:
      "Shape: {title:string, servings:number, cuisine:string, " +
      "ingredients:[{item:string, quantity:string, unit:string}], " +
      "steps:[string], notes?:string}.",
  });
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
