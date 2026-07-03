# Rasoi Assistant AI — Plan of Record

A clean, modern, voice-optional cooking assistant for **parents worldwide**.
Cost target: **$0** on free-tier infrastructure.

## Product principles
- **Text-first, voice-optional.** Typing works everywhere; voice is a toggle layer.
- **Global by default.** English default; units, cuisine, diet, language all per-profile.
- **Clean modern consumer look** with generous sizing (still comfortable for older users).
- **Personalized engine.** One Gemini system prompt, dynamically built from the user's profile.

## Architecture

| Layer | Choice |
|---|---|
| Frontend | Next.js (App Router) on Vercel free tier |
| Styling | Tailwind CSS, clean modern consumer UI |
| LLM | Google Gemini 2.5 Flash (text + audio), server-side key |
| STT | Hybrid: native `SpeechRecognition` (Android/Chrome) + `MediaRecorder`→Gemini audio (iOS/regional) |
| TTS | Web Speech Synthesis with graceful voice fallback (regional → Hindi → English) |
| Auth | Supabase Auth — Google sign-in + email magic link |
| DB | Supabase Postgres — `profiles`, `recipes`, `meal_plans` |
| i18n | English default; Hindi + regional (Tamil/Telugu/Kannada/Bengali) optional |

## Features
1. **Login page** — Supabase (Google + magic link), no passwords.
2. **Profile section** — name, language, region/units (metric/imperial/Indian), cuisines (global list),
   diet (veg/non-veg/vegan/Jain/halal/kosher), health flags (low-sodium/diabetic/low-carb/allergies),
   voice on/off + preferred voice language.
3. **Chat / "What's in the fridge" mode** — type or speak available ingredients → recipe suggestions.
4. **Guided cooking loop** — recipe step array + Next/Repeat/Back/Stop intents; optional hands-free voice.
5. **Meal planner + calendar** — weekly/monthly grid, Gemini-suggested balanced plans, editable, saved.
6. **Suggestions** — "what should I cook today?" from profile + variety + season.

## Data model (Supabase)
- `profiles { id (auth uid), name, language, units, cuisines[], diet, health_flags[], voice_enabled, voice_language }`
- `recipes { id, user_id, title, servings, ingredients (jsonb), steps (jsonb), cuisine, created_at }`
- `meal_plans { id, user_id, date, meal_type, recipe_id }`

## Recipe JSON contract (Gemini output)
`{ title, servings, ingredients: [{item, quantity, unit}], steps: [string], cuisine, notes? }`
Units adapt to profile (metric/imperial/Indian). Health flags injected as constraints.

## Build phases
- **Phase 0** — Scaffold: Next.js + Tailwind + Supabase clients + dynamic Gemini API route. ← current
- **Phase 1** — Login page + profile section (auth + profile CRUD).
- **Phase 2** — Chat/fridge mode → recipe (text-first) + optional voice cooking loop.
- **Phase 3** — Meal planner + calendar + suggestions.
- **Phase 4** — Polish: offline resilience, i18n, regional TTS tuning, error/loading states.

## Env required
- `GOOGLE_GENERATIVE_AI_API_KEY` — Google AI Studio (free)
- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase project (free)
