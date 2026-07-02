"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { hydrateFromStorage } from "@/lib/persistence";

export function HydrateStore() {
  const hydrate = useStore((s) => s.hydrate);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const persisted = hydrateFromStorage();
    if (persisted) {
      hydrate(persisted);
    }
  }, [hydrate]);

  // Renders nothing — this is a behaviour-only component.
  return null;
}