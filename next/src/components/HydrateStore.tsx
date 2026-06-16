"use client";

import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store";
import { hydrateFromStorage } from "@/lib/persistence";

export function HydrateStore() {
  const hydrate = useStore((s) => s.hydrate);
  const theme = useStore((s) => s.theme);
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;

    const persisted = hydrateFromStorage();
    if (persisted) {
      hydrate(persisted);
    }
  }, [hydrate]);

  useEffect(() => {
    const root = document.documentElement;
    const applyTheme = (t: typeof theme) => {
      if (t === "dark") {
        root.classList.add("dark");
        root.classList.remove("light");
      } else if (t === "light") {
        root.classList.add("light");
        root.classList.remove("dark");
      } else {
        const isDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        if (isDark) {
          root.classList.add("dark");
          root.classList.remove("light");
        } else {
          root.classList.add("light");
          root.classList.remove("dark");
        }
      }
    };

    applyTheme(theme);

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add("dark");
          root.classList.remove("light");
        } else {
          root.classList.add("light");
          root.classList.remove("dark");
        }
      };
      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, [theme]);

  // Renders nothing — this is a behaviour-only component.
  return null;
}
