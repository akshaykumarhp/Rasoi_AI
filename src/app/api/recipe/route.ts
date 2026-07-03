import { NextRequest, NextResponse } from "next/server";
import { generateRecipe } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/recipe
 * Body: { prompt: string }
 * Uses the signed-in user's saved profile to personalize the recipe.
 */
export async function POST(req: NextRequest) {
  let body: { prompt?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const prompt = body.prompt?.trim();
  if (!prompt) {
    return NextResponse.json({ error: "prompt is required" }, { status: 400 });
  }

  // Load the user's profile if signed in (falls back to sensible defaults).
  let profile: Partial<Profile> = { units: "metric", language: "en" };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (data) profile = data as Profile;
    }
  } catch {
    // Supabase not configured yet — continue with defaults so the route works.
  }

  try {
    const recipe = await generateRecipe({ profile, prompt });
    return NextResponse.json({ recipe });
  } catch (err) {
    console.error("recipe generation failed", err);
    return NextResponse.json(
      { error: "Could not generate a recipe right now. Please try again." },
      { status: 502 },
    );
  }
}
