import { describe, expect, it } from "vitest";
import { getVideoPartBudget } from "@/lib/agent/videoParts/budgets";
import { buildVideoPartSystemPrompt } from "@/lib/agent/videoParts/prompts";

describe("video generation budgets", () => {
  it.each(["summary", "main-diagram"] as const)(
    "keeps the %s renderer contract compact",
    (part) => {
      const prompt = buildVideoPartSystemPrompt(part, 10);
      expect(prompt.length).toBeLessThan(8_000);
      expect(prompt).not.toContain('"$schema"');
      expect(prompt).not.toContain('"anyOf"');
    },
  );

  it("scales main-diagram work with requested duration", () => {
    expect(getVideoPartBudget("summary", 10)).toEqual({ maxTokens: 2_048, maxEvents: 10 });
    expect(getVideoPartBudget("main-diagram", 4)).toEqual({ maxTokens: 4_096, maxEvents: 14 });
    expect(getVideoPartBudget("main-diagram", 10)).toEqual({ maxTokens: 6_144, maxEvents: 20 });
    expect(getVideoPartBudget("main-diagram", 20)).toEqual({ maxTokens: 8_192, maxEvents: 28 });
  });
});
