#!/usr/bin/env tsx
// Quick single-prompt test through the real pipeline.
// Run: npm run diag

import { runGeneratePipeline } from "@/lib/agent/ai/pipeline";

async function main() {
  console.log("Testing pipeline with: 'client-server architecture' (15s)…\n");
  const start = Date.now();
  const result = await runGeneratePipeline("a 15-second video about client-server architecture", 15);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);

  const { brief, diagnostics } = result;
  console.log(`Done in ${elapsed}s`);
  console.log(`Layout:   ${brief.layout}`);
  console.log(`Title:    ${brief.title}`);
  console.log(`Palette:  ${brief.palette} / ${brief.style}`);
  console.log(`Events:   ${result.project.events.length}`);
  if (diagnostics.llmError) console.log(`\n❌ LLM error: ${diagnostics.llmError}`);
  else console.log(`\n✅ No LLM error`);
}

main().catch((e) => { console.error(e); process.exit(1); });
