"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/ui/store";
import { hydrateFromStorage } from "@/lib/ui/persistence";

export function HydrateStore() {
  const hydrate = useStore((s) => s.hydrate);
  const finishHydration = useStore((s) => s.finishHydration);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const persisted = hydrateFromStorage();
    // guarded — no data no hydrate call
    if (persisted) hydrate(persisted);
    else finishHydration();

  }, [finishHydration, hydrate]);

  // Renders nothing — this is a behaviour-only component.
  return null;
}
