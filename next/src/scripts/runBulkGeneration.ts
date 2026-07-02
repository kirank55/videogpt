import { runGeneratePipeline } from "../lib/agent/ai/pipeline";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { type VideoProject } from "../lib/ui/renderer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const PROMPTS = [
  "explain how skyscrappers are built",
  "Explain how the global GPS network knows exactly where my phone is.",
  "How do credit card transactions work in the 2 seconds after I tap my card?",
  "Explain how noise-canceling headphones actually block out sound.",
  "How does a modern container ship stay upright and navigate across oceans?",
  "Explain how search engines index the entire internet to give me results in milliseconds."
];

async function main() {
  const args = process.argv.slice(2);
  const indexArg = args.indexOf("--index");
  if (indexArg === -1) {
    console.error("Please specify a prompt index, e.g. --index 1");
    process.exit(1);
  }
  const idx = parseInt(args[indexArg + 1], 10);
  if (isNaN(idx) || idx < 0 || idx >= PROMPTS.length) {
    console.error(`Invalid index. Must be between 0 and ${PROMPTS.length - 1}`);
    process.exit(1);
  }

  const prompt = PROMPTS[idx];
  const duration = 5;
  const times = ["0.5", "1.2", "3.0", "4.8"];
  const brainDir = process.env.BRAIN_DIR ?? "C:\\Users\\kiran\\.gemini\\antigravity-ide\\brain\\b2bfb0e0-4179-4c14-9b4b-1cdd9d559cf5";
  const outDir = path.join(brainDir, `bulk_captures`, `prompt_${idx}`);

  console.log(`\n=== runBulkGeneration CLI (Prompt ${idx}) ===`);
  console.log(`Prompt:       "${prompt}"`);
  console.log(`Output Dir:   ${outDir}\n`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }



  // 1. Run AI generation pipeline
  console.log(`1. Running AI pipeline (OpenRouter) for prompt ${idx}...`);
  const start = Date.now();
  const result = await runGeneratePipeline(prompt, duration);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`   Pipeline done in ${elapsed}s`);

  const { brief, project, diagnostics } = result;
  if (diagnostics.llmError) {
    console.error(`❌ LLM Generation error: ${diagnostics.llmError}`);
    process.exit(1);
  }

  console.log(`   Brief: "${brief.title}" | Layout: ${brief.layout} | Score: ${diagnostics.qualityResult.score}/100`);

  // Write temporary project js data to public folder
  console.log("2. Writing temporary project js data to public folder...");
  const tempJSPath = path.join(__dirname, "../../public/temp-project-data.js");
  
  let existingProjects: VideoProject[] = [];
  if (fs.existsSync(tempJSPath)) {
    try {
      const content = fs.readFileSync(tempJSPath, "utf-8");
      const matchArray = content.match(/window\.tempProjects\s*=\s*(\[[\s\S]*?\]);/);
      if (matchArray) {
        existingProjects = JSON.parse(matchArray[1]) as VideoProject[];
      } else {
        const matchSingle = content.match(/window\.tempProject\s*=\s*(\{[\s\S]*?\});/);
        if (matchSingle) {
          existingProjects = [JSON.parse(matchSingle[1]) as VideoProject];
        }
      }
    } catch {
      console.warn("   ⚠️ Could not parse existing temp-project-data.js, starting with empty list.");
    }
  }

  // Merge & deduplicate
  const projectsList = existingProjects.filter((p: VideoProject) => p && p.id !== project.id);
  projectsList.push(project);

  const jsContent = `window.tempProject = ${JSON.stringify(project, null, 2)};\nwindow.tempProjects = ${JSON.stringify(projectsList, null, 2)};\n`;
  fs.writeFileSync(tempJSPath, jsContent);

  // Also write project.json in output directory
  fs.writeFileSync(path.join(outDir, "project.json"), JSON.stringify(project, null, 2));
  fs.writeFileSync(path.join(outDir, "brief.json"), JSON.stringify(brief, null, 2));

  // Flush file write wait
  await sleep(500);

  // 3. Capture screenshot of each requested timestamp
  console.log("3. Capturing screenshots via headless Chrome...");
  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  
  for (const t of times) {
    const url = `http://localhost:3000/dev/renderer-only?time=${t}`;
    const cleanTimeStr = t.replace(".", "_");
    const outFileName = `capture_${cleanTimeStr}s.png`;
    const outPath = path.join(outDir, outFileName);

    console.log(`   [${t}s] -> ${outFileName}...`);
    try {
      execSync(`"${chromePath}" --headless --disable-gpu --window-size=1920,1080 --virtual-time-budget=2000 --screenshot="${outPath}" "${url}"`, { stdio: "ignore" });
    } catch (err) {
      console.error(`   ❌ Failed to capture frame at ${t}s:`, err);
    }
  }

  console.log(`\n=== Prompt ${idx} bulk generation & capture completed successfully ===\n`);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
