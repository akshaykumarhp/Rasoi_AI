# 🍳 Rasoi Assistant

A clean, modern, voice-optional cooking assistant for **parents worldwide** — plan
meals, cook hands-free, and turn whatever's in the fridge into dinner. Built to run
entirely on **free-tier** infrastructure.

## Features
- **Login + profile** — passwordless (Google or email magic link); personalize
  language, units (metric/imperial/Indian), cuisines, diet, health flags, allergies.
- **What's in the fridge** — type or speak your ingredients, get a recipe tailored
  to your profile.
- **Hands-free cooking** — steps read aloud; say "next / back / repeat / stop"
  (native on Android/Chrome, push-to-talk on iOS).
- **Meal planner** — weekly calendar with Gemini-powered auto-planning; tap any
  meal to cook it.

## Stack
- **Next.js 15** (App Router) + **React 19** + **Tailwind CSS**
- **Google Gemini** (text + audio) for recipes, plans, and transcription
- **Supabase** — auth + Postgres (row-level security)

## Staying within the free tier
Each free Gemini model has its own daily request quota, so the app **rotates
through all of them** (`gemini-2.5-flash` → `-flash-lite` → `2.0-flash` → … ),
skipping any that are rate-limited. This multiplies the effective requests-per-day
at no cost. If *every* Gemini model is exhausted, it falls back to a **local
Ollama** model (offline, unlimited):

```bash
# optional offline fallback
ollama pull llama3.1     # then just keep `ollama serve` running
```

No env changes needed — the app auto-detects Ollama at `localhost:11434`. Customize
the rotation with `GEMINI_MODELS` or the fallback with `OLLAMA_MODEL` (see
`.env.local.example`).

## Getting started
```bash
npm install
cp .env.local.example .env.local   # fill in your keys
npm run dev
```

Then, one-time setup:
1. Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor.
2. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/**`
   to Redirect URLs.

## Environment
| Variable | Where |
|---|---|
| `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com/apikey) |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |

See [`PLAN.md`](PLAN.md) for the full architecture and roadmap.
