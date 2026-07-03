import {
  GoogleGenerativeAI,
  SchemaType,
  type ResponseSchema,
} from "@google/generative-ai";
import type { Profile } from "./types";

const MODEL = "gemini-2.5-flash";

export function getGenAI() {
  const key = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!key) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY is not set");
  return new GoogleGenerativeAI(key);
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
  const model = getGenAI().getGenerativeModel({
    model: MODEL,
    systemInstruction: buildSystemInstruction(profile),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RECIPE_SCHEMA,
    },
  });

  const result = await model.generateContent(prompt);
  return JSON.parse(result.response.text());
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
  const model = getGenAI().getGenerativeModel({
    model: MODEL,
    systemInstruction: buildSystemInstruction(profile),
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: MEAL_PLAN_SCHEMA,
    },
  });

  const prompt =
    `Create a balanced ${days}-day meal plan covering these meals each day: ` +
    `${mealTypes.join(", ")}. Vary cuisines, proteins, and vegetables across the ` +
    `days so nothing repeats. Keep each dish home-cookable. Use dayOffset 0 for ` +
    `the first day up to ${days - 1} for the last. Return only dish titles.`;

  const result = await model.generateContent(prompt);
  const parsed = JSON.parse(result.response.text());
  return (parsed.meals ?? []) as MealPlanSlot[];
}
