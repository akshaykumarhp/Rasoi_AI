"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

/** Shows a friendly banner when the device loses its internet connection. */
export default function OfflineBanner() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-primary px-4 py-2 text-center text-sm font-semibold text-primary-foreground">
      <WifiOff className="h-4 w-4" />
      You&rsquo;re offline — recipes need internet. Your saved preferences still work.
    </div>
  );
}
