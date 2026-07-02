import { useState } from "react";
import { useStore } from "@/lib/ui/store";

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
  const [showByok, setShowByok] = useState(false);
  const customApiKey = useStore((s) => s.customApiKey);
  const setCustomApiKey = useStore((s) => s.setCustomApiKey);
  const [keyInput, setKeyInput] = useState(customApiKey);

  const handleSaveKey = () => {
    setCustomApiKey(keyInput.trim());
    setShowByok(false);
  };

  const handleClearKey = () => {
    setKeyInput("");
    setCustomApiKey("");
    setShowByok(false);
  };

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
        className="min-h-20 w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none transition-all placeholder:text-muted-foreground focus:border-foreground/30 focus:ring-1 focus:ring-foreground/15"
        onChange={(event) => setPrompt(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="text-xs font-medium text-muted-foreground">Duration:</span>
          <div className="flex items-center gap-1 rounded-full border border-border bg-surface/50 p-0.5">
            {[5, 10, 15, 20].map((d) => (
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

        <div className="flex items-center gap-3.5">
          {/* BYOK button hidden for MVP
          <button
            type="button"
            onClick={() => setShowByok(!showByok)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3.5 py-2 text-xs font-semibold transition-all duration-150 hover:bg-foreground/5 cursor-pointer shadow-sm select-none ${
              customApiKey
                ? "border-emerald-500/35 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-border text-muted-foreground"
            }`}
            title="Bring Your Own Key (OpenRouter)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2.5}
              stroke="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z"
              />
            </svg>
            <span>{customApiKey ? "BYOK Active" : "BYOK"}</span>
          </button>
          */}

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

      {/* BYOK Drawer hidden for MVP
      {showByok && (
        <div className="mt-3 pt-3 border-t border-border/60 flex flex-col gap-2.5 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <label htmlFor="byok-input" className="text-xs font-semibold text-foreground">
              Bring Your Own OpenRouter Key
            </label>
            <span className="text-[10px] text-muted-foreground">
              Keys are stored securely in local storage.
            </span>
          </div>
          <div className="flex gap-2">
            <input
              id="byok-input"
              type="password"
              placeholder="sk-or-..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="flex-1 rounded-xl border border-border bg-surface px-3 py-1.5 text-xs text-foreground outline-none focus:border-foreground/30 focus:ring-1 focus:ring-foreground/15"
            />
            <button
              type="button"
              onClick={handleSaveKey}
              className="rounded-xl bg-primary px-4 py-1.5 text-xs font-bold text-primary-foreground hover:opacity-90 active:scale-95 cursor-pointer shadow-sm"
            >
              Save
            </button>
            {customApiKey && (
              <button
                type="button"
                onClick={handleClearKey}
                className="rounded-xl border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-400 px-4 py-1.5 text-xs font-bold active:scale-95 cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
      */}
    </form>
  );
}
