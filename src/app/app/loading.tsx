export default function AppLoading() {
  return (
    <div>
      <div className="h-6 w-32 rounded-full bg-muted shimmer" />
      <div className="mt-4 h-9 w-64 rounded-xl bg-muted shimmer" />
      <div className="mt-3 h-5 w-72 rounded-lg bg-muted shimmer" />
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-28 rounded-3xl bg-muted shimmer" />
        ))}
      </div>
    </div>
  );
}
