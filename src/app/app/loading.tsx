export default function AppLoading() {
  return (
    <div className="animate-pulse">
      <div className="h-9 w-56 rounded-xl bg-stone-200 dark:bg-stone-800" />
      <div className="mt-3 h-5 w-72 rounded-lg bg-stone-100 dark:bg-stone-800/60" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-32 rounded-3xl bg-stone-100 ring-1 ring-stone-100 dark:bg-stone-900 dark:ring-stone-800"
          />
        ))}
      </div>
    </div>
  );
}
