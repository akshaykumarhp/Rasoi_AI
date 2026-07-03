import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
// Cache each dish lookup for a day — images rarely change.
export const revalidate = 86400;

/**
 * GET /api/dish-image?name=<dish>
 * Returns a real food photo for the dish from TheMealDB (free, keyless).
 * Tries the full name, then progressively shorter keyword matches.
 * Returns { image: string | null }.
 */
export async function GET(req: NextRequest) {
  const name = req.nextUrl.searchParams.get("name")?.trim();
  if (!name) return NextResponse.json({ image: null });

  // Build a few search terms, most specific first.
  const words = name.replace(/[()]/g, " ").split(/\s+/).filter(Boolean);
  const terms = Array.from(
    new Set([
      name,
      words.slice(0, 2).join(" "),
      words[0],
      words[words.length - 1],
    ]),
  ).filter(Boolean);

  try {
    for (const term of terms) {
      const res = await fetch(
        `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(term)}`,
        { next: { revalidate: 86400 } },
      );
      if (!res.ok) continue;
      const data = (await res.json()) as {
        meals?: { strMealThumb?: string }[] | null;
      };
      const thumb = data.meals?.[0]?.strMealThumb;
      if (thumb) return NextResponse.json({ image: thumb });
    }
  } catch {
    /* fall through to null */
  }

  return NextResponse.json({ image: null });
}
