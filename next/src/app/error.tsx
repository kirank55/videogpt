"use client";

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app] uncaught route error:", error);
  }, [error]);

  return (
    <div className="flex h-full flex-1 items-center justify-center p-6" role="alert">
      <div className="card max-w-lg p-8 text-center">
        <h2 className="text-lg font-semibold text-foreground">This view could not be loaded.</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your saved projects are still available. Try loading the view again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-full bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
