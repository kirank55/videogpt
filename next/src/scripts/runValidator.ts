/**
 * Quick script to run validateProject on the big demo and print results.
 * Usage: npx tsx src/scripts/runValidator.ts
 */

import { buildProjectFromBrief } from "../lib/brief/buildProjectFromBrief";
import { validateProject } from "../lib/renderer/validateProject";

const brief = {
  layout: "single-column" as const,
  title: "Demo Validation Project",
  blocks: [
    { heading: "Initialization", description: "Initializing the application state" },
    { heading: "Processing", description: "Processing chunked data pipelines in parallel" },
    { heading: "Completion", description: "Rendering complete visual timeline frames" },
  ],
  palette: "midnight",
  style: "modern",
};

const project = buildProjectFromBrief(brief, 10);
const results = validateProject(project);

if (results.length === 0) {
  console.log("✓ No validation issues found.");
} else {
  const errors = results.filter((r) => r.severity === "error");
  const warnings = results.filter((r) => r.severity === "warning");

  if (errors.length > 0) {
    console.log(`\n✗ ${errors.length} ERROR(S):`);
    for (const e of errors) {
      console.log(`  [${e.eventId}] ${e.message}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n⚠ ${warnings.length} WARNING(S):`);
    for (const w of warnings) {
      console.log(`  [${w.eventId}] ${w.message}`);
    }
  }

  console.log(`\nTotal: ${errors.length} errors, ${warnings.length} warnings`);
}
