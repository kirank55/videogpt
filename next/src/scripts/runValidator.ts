/**
 * Quick script to run validateProject on the big demo and print results.
 * Usage: npx tsx src/scripts/runValidator.ts
 */

import { bigDemoProject } from "../app/demo/bigDemoProject";
import { validateProject } from "../lib/renderer/validateProject";

const results = validateProject(bigDemoProject);

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
