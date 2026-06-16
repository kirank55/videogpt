"use client";

type PromptFormProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  duration: number;
  onChangeDuration: (value: number) => void;
  isLoading?: boolean;
  onSubmit?: (prompt: string) => void;
};

export function PromptForm({
  prompt,
  setPrompt,
  duration,
  onChangeDuration,
  isLoading = false,
  onSubmit,
}: PromptFormProps) {
  const submit = () => {
    const trimmed = prompt.trim();
    console.log("[PromptForm] submit called", { trimmed, isLoading });
    if (!trimmed || isLoading) {
      console.log("[PromptForm] submit blocked", { trimmed: !!trimmed, isLoading });
      return;
    }
    console.log("[PromptForm] calling onSubmit →", trimmed);
    onSubmit?.(trimmed);
    setPrompt("");
    console.log("[PromptForm] prompt cleared, waiting for response…");
  };


  return (
    <form
      className="card sticky bottom-0 mt-6 p-4"
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
        rows={4}
        placeholder="Describe a scene, a mood, or a motion sequence..."
        className="min-h-28 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3.5 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-1 focus:ring-foreground/15"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Duration:</span>
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/50 p-0.5">
            {[5, 10, 15, 20, 30].map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => onChangeDuration(d)}
                className={`rounded-full px-3.5 py-1 text-xs font-bold transition-all cursor-pointer ${
                  duration === d
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                }`}
              >
                {d}s
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <p className="hidden sm:inline text-xs text-muted-foreground/85">
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
