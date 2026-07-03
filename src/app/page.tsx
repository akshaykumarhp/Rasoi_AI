import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-brand-100 text-4xl">
        🍳
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight text-stone-900 sm:text-5xl dark:text-stone-50">
        Rasoi Assistant
      </h1>
      <p className="mt-4 max-w-xl text-lg text-stone-600 dark:text-stone-300">
        Your friendly kitchen companion. Cook hands-free, plan the week&rsquo;s
        meals, and turn whatever&rsquo;s in your fridge into dinner — by typing
        or just talking.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Link href="/login" className="btn-primary">
          Get started
        </Link>
        <Link href="/login" className="btn-secondary">
          I already have an account
        </Link>
      </div>

      <div className="mt-16 grid w-full grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: "🧊", title: "Fridge to dinner", body: "Tell it what you have." },
          { icon: "🗓️", title: "Plan the week", body: "Balanced meals, auto-made." },
          { icon: "🎙️", title: "Hands-free", body: "Cook while it reads steps." },
        ].map((f) => (
          <div key={f.title} className="card text-left">
            <div className="text-2xl">{f.icon}</div>
            <div className="mt-2 font-semibold text-stone-900 dark:text-stone-100">
              {f.title}
            </div>
            <div className="text-sm text-stone-500 dark:text-stone-400">
              {f.body}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
