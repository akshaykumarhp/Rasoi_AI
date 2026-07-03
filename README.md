# 🍳 Rasoi Assistant

A clean, modern, voice-optional cooking assistant for **parents worldwide** — plan
meals, cook hands-free, and turn whatever's in the fridge into dinner. Built to run
entirely on **free-tier** infrastructure.

## Features
- **Login + profile** — passwordless (Google or email magic link); personalize
  language, units (metric/imperial/Indian), cuisines, diet, health flags, allergies.
- **What's in the fridge** — type or speak your ingredients, get a recipe tailored
  to your profile. Every recipe — no matter which free model answers — follows the
  same structure: ingredients → preparation → cooking → garnishing → post-cooking.
- **Hands-free cooking** — steps read aloud; say "next / back / repeat / stop"
  (native on Android/Chrome, push-to-talk on iOS).
- **Meal planner** — weekly calendar with Gemini-powered auto-planning; tap any
  meal to cook it.

## Stack
- **Next.js 15** (App Router) + **React 19** + **Tailwind CSS**
- **Google Gemini** (text + audio) for recipes, plans, and transcription
- **Supabase** — auth + Postgres (row-level security)

## Staying within the free tier
The app cascades through free LLMs so it (practically) never runs out — all $0:

```
Gemini ×6 models  →  Groq  →  OpenRouter  →  GitHub Models  →  Ollama (local)
```

1. **Gemini rotation** — each free Gemini model has its own daily quota, so the app
   tries them in turn (`gemini-2.5-flash` → `-flash-lite` → `2.0-flash` → …),
   skipping any that are rate-limited. ~6× the effective RPD for free.
2. **Groq / OpenRouter / GitHub Models** — free OpenAI-compatible providers, each
   enabled only when its API key is set. Add keys in `.env.local`.
3. **Ollama** — final offline, unlimited fallback (`ollama pull llama3.1`, auto-detected
   at `localhost:11434`).

Get free keys: [Groq](https://console.groq.com/keys) ·
[OpenRouter](https://openrouter.ai/keys) ·
[GitHub Models](https://github.com/settings/tokens) (PAT with `models:read`).
All models and the rotation order are configurable — see `.env.local.example`.

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
