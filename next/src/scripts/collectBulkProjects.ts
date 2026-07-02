import fs from "fs";
import path from "path";
import { type VideoProject } from "../lib/ui/renderer";

const DEFAULT_BULK_DIR = process.env.BRAIN_DIR 
  ? path.join(process.env.BRAIN_DIR, "bulk_captures")
  : "C:\\Users\\kiran\\.gemini\\antigravity-ide\\brain\\b2bfb0e0-4179-4c14-9b4b-1cdd9d559cf5\\bulk_captures";
const tempJSPath = path.resolve(__dirname, "../../public/temp-project-data.js");

async function main() {
  console.log("\n=== Bulk Projects Collection Script ===");
  console.log(`Source directory: ${DEFAULT_BULK_DIR}`);
  console.log(`Target JS file:   ${tempJSPath}\n`);

  if (!fs.existsSync(DEFAULT_BULK_DIR)) {
    console.error(`❌ Source directory does not exist: ${DEFAULT_BULK_DIR}`);
    process.exit(1);
  }

  // Find all prompt_* subfolders
  const subdirs = fs.readdirSync(DEFAULT_BULK_DIR);
  const gatheredProjects: VideoProject[] = [];

  for (const dirName of subdirs) {
    const dirPath = path.join(DEFAULT_BULK_DIR, dirName);
    if (!fs.statSync(dirPath).isDirectory()) continue;

    const projPath = path.join(dirPath, "project.json");
    if (fs.existsSync(projPath)) {
      try {
        const fileContent = fs.readFileSync(projPath, "utf-8");
        const project = JSON.parse(fileContent) as VideoProject;
        gatheredProjects.push(project);
        console.log(`✅ Loaded project from ${dirName}: "${project.name}" (ID: ${project.id})`);
      } catch (err) {
        console.error(`❌ Failed to parse ${projPath}:`, err);
      }
    }
  }

  console.log(`\nFound ${gatheredProjects.length} projects in bulk captures folder.`);

  // Load existing temp-project-data.js if it exists to preserve current tempProject/tempProjects
  let existingProjects: VideoProject[] = [];
  let currentTempProject: VideoProject | null = null;

  if (fs.existsSync(tempJSPath)) {
    try {
      const content = fs.readFileSync(tempJSPath, "utf-8");
      
      // Attempt to extract window.tempProject
      const matchSingle = content.match(/window\.tempProject\s*=\s*(\{[\s\S]*?\});/);
      if (matchSingle) {
        currentTempProject = JSON.parse(matchSingle[1]) as VideoProject;
      }

      // Attempt to extract window.tempProjects
      const matchArray = content.match(/window\.tempProjects\s*=\s*(\[[\s\S]*?\]);/);
      if (matchArray) {
        existingProjects = JSON.parse(matchArray[1]) as VideoProject[];
      } else if (currentTempProject) {
        existingProjects = [currentTempProject];
      }
    } catch {
      console.warn("⚠️  Could not parse existing temp-project-data.js, overwriting...");
    }
  }

  // Merge the gathered projects into the existing projects (deduplicate by id)
  const mergedProjectsMap = new Map<string, VideoProject>();
  
  // 1. Add existing ones
  for (const proj of existingProjects) {
    if (proj && proj.id) {
      mergedProjectsMap.set(proj.id, proj);
    }
  }

  // 2. Add new gathered ones (they can overwrite existing ones if we want the fresh copy)
  for (const proj of gatheredProjects) {
    if (proj && proj.id) {
      mergedProjectsMap.set(proj.id, proj);
    }
  }

  const finalProjectsList = Array.from(mergedProjectsMap.values());

  // Determine latest tempProject (either keep current one, or use the last one in final list)
  const latestProject = currentTempProject || finalProjectsList[finalProjectsList.length - 1] || null;

  // Write file contents
  const jsContent = `window.tempProject = ${JSON.stringify(latestProject, null, 2)};\nwindow.tempProjects = ${JSON.stringify(finalProjectsList, null, 2)};\n`;
  fs.writeFileSync(tempJSPath, jsContent);

  console.log(`\n🎉 Success! Wrote ${finalProjectsList.length} total projects to ${tempJSPath}`);
}

main().catch((err) => {
  console.error("Fatal error in collection script:", err);
  process.exit(1);
});
