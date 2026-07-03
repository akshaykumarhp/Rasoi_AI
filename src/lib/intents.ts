export type CookIntent = "next" | "back" | "repeat" | "stop" | "unknown";

/**
 * Maps a spoken phrase to a cooking-control intent. Fuzzy and multilingual so
 * older users can speak naturally in English, Hindi, or common regional words.
 */
const PATTERNS: Record<Exclude<CookIntent, "unknown">, string[]> = {
  next: [
    "next", "next step", "go on", "continue", "done", "ready", "forward",
    "aage", "agla", "aage badho", "aगे", // Hindi: aage/agla
    "adutha", // Tamil: next
    "tarwata", // Kannada-ish
    "siguiente", "próximo", // Spanish
  ],
  back: [
    "back", "previous", "go back", "last step", "before",
    "peeche", "pichla", "wapas", // Hindi
    "anterior", "atrás", // Spanish
  ],
  repeat: [
    "repeat", "again", "say again", "one more time", "what", "come again",
    "phir se", "dobara", "dubara", "firse", // Hindi
    "otra vez", "repite", // Spanish
  ],
  stop: [
    "stop", "pause", "quit", "exit", "finish", "enough", "cancel", "end",
    "ruko", "band karo", "bas", "rukो", // Hindi
    "para", "detente", // Spanish
  ],
};

export function matchIntent(raw: string): CookIntent {
  const text = raw.toLowerCase().trim();
  if (!text) return "unknown";

  // Score each intent by whether any keyword appears as a whole word / substring.
  for (const intent of ["stop", "back", "next", "repeat"] as const) {
    if (PATTERNS[intent].some((kw) => text.includes(kw))) {
      return intent;
    }
  }
  return "unknown";
}
