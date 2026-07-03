import { NextRequest, NextResponse } from "next/server";
import { generateMealPlan } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export const runtime = "nodejs";

/**
 * POST /api/mealplan
 * Body: { days?: number, mealTypes?: string[] }
 * Returns a personalized balanced plan as { meals: [{ dayOffset, mealType, title }] }.
 */
export async function POST(req: NextRequest) {
  let body: { days?: number; mealTypes?: string[] } = {};
  try {
    body = await req.json();
  } catch {
    /* defaults are fine */
  }
  const days = Math.min(Math.max(body.days ?? 7, 1), 31);
  const mealTypes = body.mealTypes?.length
    ? body.mealTypes
    : ["breakfast", "lunch", "dinner"];

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
    /* fall back to defaults */
  }

  try {
    const meals = await generateMealPlan({ profile, days, mealTypes });
    return NextResponse.json({ meals });
  } catch (err) {
    console.error("meal plan generation failed", err);
    return NextResponse.json(
      { error: "Could not build a plan right now. Please try again." },
      { status: 502 },
    );
  }
}
