"use client";

/**
 * HydrateStore
 *
 * A zero-render client component that runs once on mount to restore persisted
 * state into the Zustand store.  Must be placed inside the root layout so it
 * runs on every page before any store reads occur.
 *
 * Why a separate component instead of doing this in the store itself?
 * - Next.js server components cannot access `localStorage`.
 * - The store module is shared by both server and client; we cannot call
 *   `localStorage` at module initialisation time (SSR would throw).
 * - A `"use client"` leaf component is the idiomatic Next.js solution.
 */

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
