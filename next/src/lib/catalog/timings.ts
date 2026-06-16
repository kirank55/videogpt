import type { SupportedDuration } from "@/lib/schemas/brief";

// ── Act Timing Tables ────────────────────────────────────────────────────────
//
// One table per supported duration.  Every event start/end in the Brief Expander
// is derived from these tables — never hardcoded.
//
// Act structure:
//   Act 1 — title card
//   Act 2 — stacks / content blocks appear (staggered)
//   Act 3 — request phase (Two-Column flow=true only)
//   Act 4 — processing phase (Two-Column flow=true only)
//   Act 5 — response + outro
//
// The acts are contiguous: act(n).end === act(n+1).start.

export type ActTiming = {
  act1: { start: number; end: number };
  act2: { start: number; end: number; stagger: number };
  act3: { start: number; end: number };
  act4: { start: number; end: number; stepStagger: number };
  act5: { start: number; end: number; closingStart: number };
};

export const TIMINGS: Record<SupportedDuration, ActTiming> = {
  5: {
    act1: { start: 0,    end: 0.9  },
    act2: { start: 0.9,  end: 2.0,  stagger: 0.15 },
    act3: { start: 2.0,  end: 3.0  },
    act4: { start: 3.0,  end: 3.9,  stepStagger: 0.20 },
    act5: { start: 3.9,  end: 5.0,  closingStart: 4.1 },
  },
  10: {
    act1: { start: 0,    end: 1.5  },
    act2: { start: 1.5,  end: 4.0,  stagger: 0.25 },
    act3: { start: 4.0,  end: 6.0  },
    act4: { start: 6.0,  end: 8.0,  stepStagger: 0.35 },
    act5: { start: 8.0,  end: 10.0, closingStart: 8.5 },
  },
  15: {
    act1: { start: 0,    end: 2.5  },
    act2: { start: 2.5,  end: 4.5,  stagger: 0.30 },
    act3: { start: 4.5,  end: 7.5  },
    act4: { start: 7.5,  end: 10.5, stepStagger: 0.40 },
    act5: { start: 10.5, end: 15.0, closingStart: 13.0 },
  },
  20: {
    act1: { start: 0,    end: 3.0  },
    act2: { start: 3.0,  end: 7.0,  stagger: 0.35 },
    act3: { start: 7.0,  end: 11.0 },
    act4: { start: 11.0, end: 15.0, stepStagger: 0.50 },
    act5: { start: 15.0, end: 20.0, closingStart: 17.0 },
  },
  30: {
    act1: { start: 0,    end: 4.0  },
    act2: { start: 4.0,  end: 9.5,  stagger: 0.50 },
    act3: { start: 9.5,  end: 16.0 },
    act4: { start: 16.0, end: 22.0, stepStagger: 0.70 },
    act5: { start: 22.0, end: 30.0, closingStart: 25.0 },
  },
};
