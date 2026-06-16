"use client";

type PromptFormProps = {
  prompt: string;
  setPrompt: (value: string) => void;
  isLoading?: boolean;
  onSubmit?: (prompt: string) => void;
};

export function PromptForm({
  prompt,
  setPrompt,
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
        className="min-h-28 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="mt-4 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Press Enter to send. Shift+Enter adds a new line.
        </p>
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70"
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
    </form>
  );
}
