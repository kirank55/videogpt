#!/usr/bin/env tsx
import { generateComposedVideo } from "@/lib/agent/videoParts/composedVideo";

async function main() {
  const prompt = "a 15-second video about client-server architecture";
  const start = Date.now();
  const result = await generateComposedVideo({ prompt, duration: 15 });
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`Done in ${elapsed}s`);
  console.log(`Title: ${result.projectName}`);
  console.log(`Summary: ${result.parts.summary.name}`);
  console.log(`Main diagram: ${result.parts.mainDiagram.name}`);
  console.log(`Events: ${result.project.events.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
