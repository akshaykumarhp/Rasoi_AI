export type Units = "metric" | "imperial" | "indian";

export type Diet =
  | "vegetarian"
  | "non-vegetarian"
  | "vegan"
  | "jain"
  | "halal"
  | "kosher";

export type HealthFlag =
  | "low-sodium"
  | "diabetic-friendly"
  | "low-carb"
  | "high-protein"
  | "gluten-free";

export interface Profile {
  id: string;
  name: string;
  language: string; // BCP-47, e.g. "en", "hi", "ta"
  units: Units;
  cuisines: string[]; // e.g. ["North Indian", "Italian"]
  diet: Diet;
  health_flags: HealthFlag[];
  allergies: string[];
  voice_enabled: boolean;
  voice_language: string; // BCP-47 for TTS/STT, e.g. "en-IN"
}

export interface Ingredient {
  item: string;
  quantity: string;
  unit: string;
}

/** Every recipe, from any provider, follows this same 5-part structure. */
export interface Recipe {
  id?: string;
  user_id?: string;
  title: string;
  servings: number;
  cuisine: string;
  ingredients: Ingredient[];
  preparation: string[]; // pre-cooking: washing, chopping, marinating…
  cooking: string[]; // the actual cooking steps
  garnishing: string[]; // garnish/plating — may be empty
  postCooking: string[]; // resting, serving, storage tips — may be empty
  notes?: string;
  created_at?: string;
}

export type RecipePhase = "preparation" | "cooking" | "garnishing" | "postCooking";

export const RECIPE_PHASES: RecipePhase[] = [
  "preparation",
  "cooking",
  "garnishing",
  "postCooking",
];

export const PHASE_LABELS: Record<RecipePhase, string> = {
  preparation: "Preparation",
  cooking: "Cooking",
  garnishing: "Garnishing",
  postCooking: "Finishing touches",
};

export interface PhaseStep {
  phase: RecipePhase;
  text: string;
}

/** Flattens a recipe's phases into one ordered list for the guided-cooking loop. */
export function flattenRecipeSteps(recipe: Recipe): PhaseStep[] {
  const out: PhaseStep[] = [];
  for (const phase of RECIPE_PHASES) {
    for (const text of recipe[phase] ?? []) out.push({ phase, text });
  }
  return out;
}

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export interface MealPlanEntry {
  id?: string;
  user_id?: string;
  date: string; // ISO yyyy-mm-dd
  meal_type: MealType;
  recipe_id?: string;
  title?: string; // denormalized for quick calendar rendering
}
