import fs from "fs";
import path from "path";
import { runQualityGate } from "../lib/renderer/validateProject";

const filePath = path.resolve(__dirname, "../../public/temp-project-data.js");
let fileContent = fs.readFileSync(filePath, "utf-8");

// Extract the JSON object by trimming window.tempProject prefix and trailing semicolon
fileContent = fileContent.replace(/^window\.tempProject\s*=\s*/, "").trim();
if (fileContent.endsWith(";")) {
  fileContent = fileContent.slice(0, -1).trim();
}

try {
  const project = JSON.parse(fileContent);
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
} catch (err) {
  console.error("Failed to parse temp project data:", err);
}
