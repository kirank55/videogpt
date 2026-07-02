/** Renders a fallback placeholder when no video preview is available. */
export function NoPreview() {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-xl bg-linear-to-tr from-muted/50 via-surface/40 to-muted/50 border border-dashed border-border/70 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/50">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor" className="w-5 h-5 mb-2 opacity-50">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
      </svg>
      No preview
    </div>
  );
}
