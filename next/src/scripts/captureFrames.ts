import { runGeneratePipeline } from "../lib/agent/ai/pipeline";
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { type VideoProject } from "../lib/ui/renderer";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function main() {
  const args = process.argv.slice(2);
  let prompt = "how are skyscrapper built";
  let duration: 5 | 10 | 15 | 20 = 5;
  let times = ["1.0", "3.0", "5.0"];
  let outDir = process.cwd();

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--prompt" && args[i + 1]) {
      prompt = args[i + 1];
      i++;
    } else if (args[i] === "--duration" && args[i + 1]) {
      duration = parseInt(args[i + 1], 10) as 5 | 10 | 15 | 20;
      i++;
    } else if (args[i] === "--times" && args[i + 1]) {
      times = args[i + 1].split(",").map((t) => t.trim());
      i++;
    } else if (args[i] === "--outDir" && args[i + 1]) {
      outDir = args[i + 1];
      i++;
    }
  }

  console.log(`\n=== Visual Frame Capture CLI ===`);
  console.log(`Prompt:       "${prompt}"`);
  console.log(`Duration:     ${duration}s`);
  console.log(`Timestamps:   ${times.join(", ")}s`);
  console.log(`Output Dir:   ${outDir}\n`);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  // 1. Run AI generation pipeline
  console.log("1. Running AI pipeline (OpenRouter)...");
  const start = Date.now();
  const result = await runGeneratePipeline(prompt, duration);
  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`   Pipeline done in ${elapsed}s`);

  const { brief, project, diagnostics } = result;
  if (diagnostics.llmError) {
    console.error(`❌ LLM Generation error: ${diagnostics.llmError}`);
    process.exit(1);
  }

  console.log(
    `   Brief: "${brief.title}" | Scenes: ${brief.scenes.length} ` +
    `(${brief.scenes.map((scene) => scene.diagramLayout).join(", ")})`,
  );
  console.log(
    `   Graph nodes: ${brief.scenes.reduce((sum, scene) => sum + scene.graph.nodes.length, 0)} items`,
  );

  // 2. Save project temporarily to public folder as a synchronous script file
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
  
  // Flush file write wait
  await sleep(300);

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
      // Add a slight virtual time budget delay in Chrome (1000ms) to allow canvas rendering script to complete
      execSync(`"${chromePath}" --headless --disable-gpu --window-size=1920,1080 --virtual-time-budget=1000 --screenshot="${outPath}" "${url}"`, { stdio: "ignore" });
    } catch (err) {
      console.error(`   ❌ Failed to capture frame at ${t}s:`, err);
    }
  }

  // 4. Clean up temporary files (disabled to allow viewing on /brief-only page)
  console.log("4. Preserving temp project data for /brief-only viewer...");
  // if (fs.existsSync(tempJSPath)) {
  //   fs.unlinkSync(tempJSPath);
  // }


  console.log("\n=== Success! Frame captures completed successfully ===\n");
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
