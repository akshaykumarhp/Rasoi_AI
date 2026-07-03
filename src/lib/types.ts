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

export interface Recipe {
  id?: string;
  user_id?: string;
  title: string;
  servings: number;
  cuisine: string;
  ingredients: Ingredient[];
  steps: string[];
  notes?: string;
  created_at?: string;
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
