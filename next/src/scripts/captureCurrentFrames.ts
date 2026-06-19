import fs from "fs";
import path from "path";
import { execSync } from "child_process";

async function main() {
  const times = ["0.5", "1.2", "3.0", "4.8"];
  const outDir = "C:\\Users\\kiran\\.gemini\\antigravity-ide\\brain\\d459c086-a14c-4f2c-8b3c-0c521d1b36b9";

  console.log(`\n=== Visual Frame Capture for Recent Video ===`);
  console.log(`Timestamps:   ${times.join(", ")}s`);
  console.log(`Output Dir:   ${outDir}\n`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  
  for (const t of times) {
    const url = `http://localhost:3000/renderer-only?time=${t}`;
    const cleanTimeStr = t.replace(".", "_");
    const outFileName = `recent_capture_${cleanTimeStr}s.png`;
    const outPath = path.join(outDir, outFileName);

    console.log(`   [${t}s] -> ${outFileName}...`);
    try {
      execSync(`"${chromePath}" --headless --disable-gpu --window-size=1920,1080 --virtual-time-budget=2000 --screenshot="${outPath}" "${url}"`, { stdio: "ignore" });
    } catch (err) {
      console.error(`   ❌ Failed to capture frame at ${t}s:`, err);
    }
  }

  console.log("\n=== Frame captures completed successfully ===\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
