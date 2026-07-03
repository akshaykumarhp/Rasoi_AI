"use client";

import { useEffect, useState } from "react";
import { ChefHat } from "lucide-react";

/**
 * Shows a real food photo for a dish (via /api/dish-image → TheMealDB).
 * While loading it shimmers; if no photo is found it renders a warm
 * gradient placeholder so the layout never breaks.
 */
export default function RecipeImage({
  title,
  className = "",
}: {
  title: string;
  className?: string;
}) {
  const [state, setState] = useState<"loading" | "image" | "fallback">(
    "loading",
  );
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setState("loading");
    fetch(`/api/dish-image?name=${encodeURIComponent(title)}`)
      .then((r) => r.json())
      .then((d: { image: string | null }) => {
        if (!active) return;
        if (d.image) {
          setSrc(d.image);
          setState("image");
        } else {
          setState("fallback");
        }
      })
      .catch(() => active && setState("fallback"));
    return () => {
      active = false;
    };
  }, [title]);

  if (state === "loading") {
    return <div className={`shimmer bg-muted ${className}`} />;
  }

  if (state === "image" && src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={title}
        loading="lazy"
        onError={() => setState("fallback")}
        className={`object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-primary/90 via-primary to-primary-hover ${className}`}
    >
      <ChefHat className="h-1/4 w-1/4 min-h-8 min-w-8 text-white/90" strokeWidth={1.5} />
    </div>
  );
}
