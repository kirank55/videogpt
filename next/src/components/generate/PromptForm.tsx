import { useState } from "react";

type PromptFormProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  duration: number;
  onChangeDuration: (value: number) => void;
  isLoading?: boolean;
  onSubmit?: (prompt: string) => void;
  /** Minimum character count required to submit. Only enforced when set. */
  minLength?: number;
};

export function PromptForm({
  prompt,
  setPrompt,
  duration,
  onChangeDuration,
  isLoading = false,
  onSubmit,
  minLength,
}: PromptFormProps) {
  const [touched, setTouched] = useState(false);

  const trimmed = prompt.trim();
  const charCount = trimmed.length;
  const tooShort = minLength !== undefined && charCount < minLength;
  const showError = touched && tooShort;

  const submit = () => {
    setTouched(true);
    console.log("[PromptForm] submit called", { charCount, isLoading, tooShort });
    if (!trimmed || isLoading || tooShort) {
      console.log("[PromptForm] submit blocked", { trimmed: !!trimmed, isLoading, tooShort });
      return;
    }
    console.log("[PromptForm] calling onSubmit →", trimmed);
    onSubmit?.(trimmed);
    setPrompt("");
    setTouched(false);
    console.log("[PromptForm] prompt cleared, waiting for response…");
  };

  return (
    <form
      className="card mt-2 p-3.5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <label className="sr-only" htmlFor="prompt-input">
        Prompt
      </label>
      <textarea
        id="prompt-input"
        value={prompt}
        rows={2}
        placeholder="Describe a scene, a mood, or a motion sequence..."
        className={`min-h-20 w-full resize-none rounded-2xl border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-1 ${showError
          ? "border-rose-500/60 focus:border-rose-500/60 focus:ring-rose-500/20"
          : "border-border focus:border-amber-500/60 focus:ring-amber-500/20"
          }`}
        onChange={(event) => {
          setPrompt(event.target.value);
          if (touched) setTouched(false);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />

      {/* Live progress bar + counter — only when minLength is active */}
      {minLength !== undefined && (
        <div className="mt-2 space-y-1 px-0.5">
          {/* Track */}
          <div className="h-0.5 w-full overflow-hidden rounded-full bg-border">
            <div
              className={`h-full rounded-full transition-all duration-150 ${tooShort
                ? charCount === 0
                  ? "bg-transparent"
                  : charCount < minLength * 0.6
                    ? "bg-muted-foreground/40"
                    : "bg-amber-500/70"
                : "bg-emerald-500"
                }`}
              style={{ width: `${Math.min(100, (charCount / minLength) * 100)}%` }}
            />
          </div>
          {/* Label row */}
          <div className="flex items-center justify-between">
            {showError ? (
              <p className="text-xs text-rose-500 font-medium">
                Please enter at least {minLength} characters to start.
              </p>
            ) : (
              <span />
            )}
            <span
              className={`ml-auto text-xs tabular-nums transition-colors ${tooShort
                ? charCount === 0
                  ? "text-muted-foreground/40"
                  : "text-foreground"
                : "text-emerald-500 font-medium"
                }`}
            >
              {charCount}/{minLength}
            </span>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Duration:</span>
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/50 p-0.5">
            {[5, 10, 15, 20].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChangeDuration(d)}
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${duration === d
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3.5">
          <p className="hidden md:inline text-xs text-muted-foreground/85">
            Press Enter to send. Shift+Enter adds a new line.
          </p>
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-all duration-150 hover:bg-primary/95 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-primary-foreground/35 border-t-primary-foreground" />
                Sending
              </>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </form>
  );
}
