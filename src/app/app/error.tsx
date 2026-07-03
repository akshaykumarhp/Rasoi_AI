"use client";

import { CookingPot, RotateCcw } from "lucide-react";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft text-primary">
        <CookingPot className="h-7 w-7" />
      </div>
      <h2 className="mt-4 font-heading text-xl font-bold text-foreground">
        Something went wrong
      </h2>
      <p className="mt-2 text-muted-foreground">
        Don&rsquo;t worry — your saved recipes and plan are safe. Let&rsquo;s try
        that again.
      </p>
      <button onClick={reset} className="btn-primary mt-5">
        <RotateCcw className="h-4 w-4" /> Try again
      </button>
    </div>
  );
}
