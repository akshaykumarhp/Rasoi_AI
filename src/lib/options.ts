import type { Diet, HealthFlag, Units } from "./types";

export const LANGUAGES: { code: string; label: string; voice: string }[] = [
  { code: "en", label: "English", voice: "en-US" },
  { code: "hi", label: "हिन्दी (Hindi)", voice: "hi-IN" },
  { code: "ta", label: "தமிழ் (Tamil)", voice: "ta-IN" },
  { code: "te", label: "తెలుగు (Telugu)", voice: "te-IN" },
  { code: "kn", label: "ಕನ್ನಡ (Kannada)", voice: "kn-IN" },
  { code: "bn", label: "বাংলা (Bengali)", voice: "bn-IN" },
  { code: "es", label: "Español", voice: "es-ES" },
  { code: "fr", label: "Français", voice: "fr-FR" },
];

export const UNITS: { value: Units; label: string; hint: string }[] = [
  { value: "metric", label: "Metric", hint: "grams, ml, °C" },
  { value: "imperial", label: "Imperial", hint: "cups, oz, °F" },
  { value: "indian", label: "Indian", hint: "katori, chammach" },
];

export const DIETS: { value: Diet; label: string }[] = [
  { value: "non-vegetarian", label: "Non-vegetarian" },
  { value: "vegetarian", label: "Vegetarian" },
  { value: "vegan", label: "Vegan" },
  { value: "jain", label: "Jain" },
  { value: "halal", label: "Halal" },
  { value: "kosher", label: "Kosher" },
];

export const HEALTH_FLAGS: { value: HealthFlag; label: string }[] = [
  { value: "low-sodium", label: "Low sodium" },
  { value: "diabetic-friendly", label: "Diabetic-friendly" },
  { value: "low-carb", label: "Low carb" },
  { value: "high-protein", label: "High protein" },
  { value: "gluten-free", label: "Gluten-free" },
];

export const CUISINES: string[] = [
  "North Indian",
  "South Indian",
  "Italian",
  "Mexican",
  "Chinese",
  "Thai",
  "Japanese",
  "Mediterranean",
  "American",
  "Middle Eastern",
  "French",
  "Korean",
];
