"use client";

import { useSyncExternalStore } from "react";

const DISMISSED_KEY = "firefox-warning-dismissed";
const DISMISSED_EVENT = "firefox-warning-dismissed-change";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(DISMISSED_EVENT, callback);

  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(DISMISSED_EVENT, callback);
  };
}

function shouldShowWarning() {
  const ua = navigator.userAgent.toLowerCase();
  const isFirefox = ua.includes("firefox") && !ua.includes("seamonkey");
  return isFirefox && localStorage.getItem(DISMISSED_KEY) !== "true";
}

export function FirefoxWarning() {
  const showWarning = useSyncExternalStore(
    subscribe,
    shouldShowWarning,
    () => false,
  );

  if (!showWarning) {
    return null;
  }

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "true");
    window.dispatchEvent(new Event(DISMISSED_EVENT));
  };

  return (
    <div className="mb-4 shrink-0 animate-fade-in">
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-4 backdrop-blur-md transition-all duration-300">
        {/* Subtle orange ambient glow */}
        <div className="absolute -left-12 -top-12 h-24 w-24 rounded-full bg-amber-500/10 blur-xl pointer-events-none" />
        
        <div className="flex items-start gap-3.5 relative z-10">
          {/* Icon wrapper with subtle glow */}
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/20 dark:bg-amber-500/30 text-amber-600 dark:text-amber-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5 animate-pulse">
              <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm0 8.25a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Z" clipRule="evenodd" />
            </svg>
          </div>

          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-300">
              Firefox Browser Detected
            </h3>
            <p className="mt-1 text-xs leading-relaxed text-amber-700/95 dark:text-amber-300/80">
              For the best experience with canvas drawing and video generation, please use a **Chromium-based browser** (like Google Chrome, Microsoft Edge, or Brave). Firefox support is coming soon.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-amber-700/60 dark:text-amber-300/60 hover:bg-amber-500/10 hover:text-amber-900 dark:hover:text-amber-100 transition-colors duration-150 cursor-pointer"
            aria-label="Dismiss warning"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5.47 5.47a.75.75 0 0 1 1.06 0L12 10.94l5.47-5.47a.75.75 0 1 1 1.06 1.06L13.06 12l5.47 5.47a.75.75 0 1 1-1.06 1.06L12 13.06l-5.47 5.47a.75.75 0 0 1-1.06-1.06L10.94 12 5.47 6.53a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
