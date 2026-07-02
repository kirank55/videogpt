#!/usr/bin/env tsx
/**
 * Session A: Quality Gate check for "Client-Server Architecture" brief.
 * Builds the project locally (no LLM call) and prints score + all issues.
 * Run: npx tsx --tsconfig tsconfig.scripts.json src/scripts/checkQualityGate.ts
 */

import { buildProjectFromBrief } from "@/lib/agent/brief/buildProjectFromBrief";
import { runQualityGate } from "@/lib/ui/renderer/validateProject";
import type { VideoBrief, SupportedDuration } from "@/lib/agent/schemas/brief";

const DUR: SupportedDuration = 15;

const brief: VideoBrief = {
  layout: "two-column",
  title: "Client-Server Architecture",
  subtitle: "How browsers talk to servers",
  leftHeader: "CLIENT",
  rightHeader: "SERVER",
  leftRows: ["Browser"],
  rightRows: ["Application Logic", "Database"],
  flow: true,
  flowStyle: "arc",
  requestLabel: "HTTP REQUEST",
  responseLabel: "HTTP RESPONSE",
  processingSteps: ["Parse Request", "Query DB", "Build Response"],
  annotations: ["TCP/IP", "HTTP/1.1"],
  closingLine: "Request-response cycle — the backbone of the web.",
  palette: "midnight",
  style: "sharp",
  emphasizeLeft: 0,
  emphasizeRight: 0,
};

const project = buildProjectFromBrief(brief, DUR);
const result = runQualityGate(project);

console.log(`\n=== Quality Gate: ${result.score}/100 (${result.passed ? "PASSED ✅" : "FAILED ❌"}) ===\n`);

const errors   = result.issues.filter(i => i.severity === "error");
const warnings = result.issues.filter(i => i.severity === "warning");
const infos    = result.issues.filter(i => i.severity === "info");

if (errors.length > 0) {
  console.log(`❌ ERRORS (${errors.length}):`);
  for (const e of errors) console.log(`   [${e.eventId}] ${e.code}: ${e.message}`);
  console.log();
}
if (warnings.length > 0) {
  console.log(`⚠️  WARNINGS (${warnings.length}):`);
  for (const w of warnings) console.log(`   [${w.eventId}] ${w.code}: ${w.message}`);
  console.log();
}
if (infos.length > 0) {
  console.log(`ℹ️  INFO (${infos.length}):`);
  for (const info of infos) console.log(`   [${info.eventId}] ${info.code}: ${info.message}`);
  console.log();
}

if (result.issues.length === 0) {
  console.log("✅ No issues found.");
}

console.log(`Total events: ${project.events.length}`);
