"use client";

import { useEffect, useState } from "react";

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
    <div className="bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white">
      📶 You&rsquo;re offline. Recipes and planning need internet — your saved
      preferences still work.
    </div>
  );
}
