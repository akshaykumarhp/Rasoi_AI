"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState("");

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${location.origin}/auth/callback` },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
    }
  }

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-12">
      <Link
        href="/"
        className="mb-8 flex items-center gap-2 text-lg font-bold text-stone-900 dark:text-stone-100"
      >
        <span className="text-2xl">🍳</span> Rasoi Assistant
      </Link>

      <div className="card">
        <h1 className="text-2xl font-extrabold text-stone-900 dark:text-stone-50">
          Welcome
        </h1>
        <p className="mt-1 text-stone-500 dark:text-stone-400">
          Sign in to cook, plan, and save your recipes.
        </p>

        <button
          onClick={signInWithGoogle}
          className="btn-secondary mt-6 w-full"
          type="button"
        >
          <span className="text-lg">🇬</span> Continue with Google
        </button>

        <div className="my-5 flex items-center gap-3 text-sm text-stone-400">
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
          or
          <span className="h-px flex-1 bg-stone-200 dark:bg-stone-700" />
        </div>

        {status === "sent" ? (
          <div className="rounded-2xl bg-brand-50 p-4 text-center text-brand-800">
            📬 Check <strong>{email}</strong> for a sign-in link.
          </div>
        ) : (
          <form onSubmit={sendMagicLink} className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-stone-600 dark:text-stone-300">
                Email address
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="mt-1 w-full rounded-2xl border border-stone-200 bg-white px-4 py-3 text-base outline-none focus:border-brand-400 focus:ring-2 focus:ring-brand-200 dark:border-stone-700 dark:bg-stone-800"
              />
            </label>
            <button
              type="submit"
              disabled={status === "sending"}
              className="btn-primary w-full disabled:opacity-60"
            >
              {status === "sending" ? "Sending…" : "Email me a sign-in link"}
            </button>
            {status === "error" && (
              <p className="text-sm text-red-600">{message}</p>
            )}
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-stone-400">
        No passwords. We&rsquo;ll email you a secure link.
      </p>
    </main>
  );
}
