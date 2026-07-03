"use client";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="card mx-auto mt-10 max-w-md text-center">
      <div className="text-4xl">😕</div>
      <h2 className="mt-3 text-xl font-bold text-stone-900 dark:text-stone-50">
        Something went wrong
      </h2>
      <p className="mt-2 text-stone-500 dark:text-stone-400">
        Don&rsquo;t worry — your saved recipes and plan are safe. Let&rsquo;s try
        that again.
      </p>
      <button onClick={reset} className="btn-primary mt-5">
        Try again
      </button>
    </div>
  );
}
