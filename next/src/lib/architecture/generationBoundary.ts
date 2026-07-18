import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import ts from "typescript";

type GenerationOwner = "root" | "dev";

export interface GenerationBoundaryViolation {
  owner: GenerationOwner;
  targetOwner?: GenerationOwner;
  sourceFile: string;
  dependencyPath: string[];
  reason: "cross-stack-dependency" | "unapproved-shared-dependency";
}

const OWNER_DIRECTORIES: Record<GenerationOwner, string> = {
  root: "lib/agent/rootGeneration/",
  dev: "lib/agent/videoParts/",
};

const APPROVED_SHARED_PATHS = [
  "lib/env.ts",
  "lib/others/catalog/",
  "lib/others/schemas/",
  "lib/others/timeline/",
  "lib/ui/renderer/",
  "lib/ui/player/",
  "components/ui/",
] as const;

const SOURCE_EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
] as const;

function toProjectPath(sourceRoot: string, filePath: string): string {
  return path.relative(sourceRoot, filePath).replaceAll(path.sep, "/");
}

function getOwner(projectPath: string): GenerationOwner | undefined {
  return (Object.entries(OWNER_DIRECTORIES) as Array<
    [GenerationOwner, string]
  >).find(([, directory]) => projectPath.startsWith(directory))?.[0];
}

function isApprovedSharedPath(projectPath: string): boolean {
  return APPROVED_SHARED_PATHS.some((approvedPath) =>
    approvedPath.endsWith("/")
      ? projectPath.startsWith(approvedPath)
      : projectPath === approvedPath,
  );
}

function collectSourceFiles(directory: string): string[] {
  if (!existsSync(directory)) return [];

  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectSourceFiles(entryPath);
    return SOURCE_EXTENSIONS.some((extension) => entry.name.endsWith(extension))
      ? [entryPath]
      : [];
  });
}

function getModuleSpecifiers(filePath: string): string[] {
  const source = ts.createSourceFile(
    filePath,
    readFileSync(filePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const specifiers: string[] = [];

  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isImportEqualsDeclaration(node) &&
      ts.isExternalModuleReference(node.moduleReference) &&
      node.moduleReference.expression &&
      ts.isStringLiteral(node.moduleReference.expression)
    ) {
      specifiers.push(node.moduleReference.expression.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length >= 1 &&
      ts.isStringLiteralLike(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (node.arguments.length === 1 &&
          ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };

  visit(source);
  return specifiers;
}

function resolveSourceModule(
  sourceRoot: string,
  importerPath: string,
  moduleSpecifier: string,
): string | undefined {
  let unresolvedPath: string;
  if (moduleSpecifier.startsWith("@/")) {
    unresolvedPath = path.join(sourceRoot, moduleSpecifier.slice(2));
  } else if (moduleSpecifier.startsWith(".")) {
    unresolvedPath = path.resolve(path.dirname(importerPath), moduleSpecifier);
  } else {
    return undefined;
  }

  const candidates = [
    unresolvedPath,
    ...SOURCE_EXTENSIONS.map((extension) => `${unresolvedPath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) =>
      path.join(unresolvedPath, `index${extension}`),
    ),
  ];

  return candidates.find(
    (candidate) => existsSync(candidate) && statSync(candidate).isFile(),
  );
}

function buildDependencyGraph(sourceRoot: string): Map<string, string[]> {
  const graph = new Map<string, string[]>();

  for (const filePath of collectSourceFiles(sourceRoot)) {
    const dependencies = getModuleSpecifiers(filePath)
      .map((specifier) => resolveSourceModule(sourceRoot, filePath, specifier))
      .filter((dependency): dependency is string => dependency !== undefined);
    graph.set(filePath, dependencies);
  }

  return graph;
}

function findPathToOwner(
  graph: Map<string, string[]>,
  sourceRoot: string,
  startFile: string,
  targetOwner: GenerationOwner,
): string[] | undefined {
  const queue: string[][] = [[startFile]];
  const visited = new Set<string>([startFile]);

  while (queue.length > 0) {
    const dependencyPath = queue.shift()!;
    const currentFile = dependencyPath.at(-1)!;

    for (const dependency of graph.get(currentFile) ?? []) {
      if (visited.has(dependency)) continue;
      const nextPath = [...dependencyPath, dependency];
      if (getOwner(toProjectPath(sourceRoot, dependency)) === targetOwner) {
        return nextPath.map((filePath) => toProjectPath(sourceRoot, filePath));
      }
      visited.add(dependency);
      queue.push(nextPath);
    }
  }

  return undefined;
}

export function findGenerationBoundaryViolations(
  sourceRoot: string,
): GenerationBoundaryViolation[] {
  const resolvedSourceRoot = path.resolve(sourceRoot);
  const graph = buildDependencyGraph(resolvedSourceRoot);
  const violations: GenerationBoundaryViolation[] = [];

  for (const [sourceFile, directDependencies] of graph) {
    const sourceProjectPath = toProjectPath(resolvedSourceRoot, sourceFile);
    const owner = getOwner(sourceProjectPath);
    if (!owner) continue;

    const targetOwner: GenerationOwner = owner === "root" ? "dev" : "root";
    const crossStackPath = findPathToOwner(
      graph,
      resolvedSourceRoot,
      sourceFile,
      targetOwner,
    );
    if (crossStackPath) {
      violations.push({
        owner,
        targetOwner,
        sourceFile: sourceProjectPath,
        dependencyPath: crossStackPath,
        reason: "cross-stack-dependency",
      });
      continue;
    }

    for (const dependency of directDependencies) {
      const dependencyProjectPath = toProjectPath(resolvedSourceRoot, dependency);
      if (
        getOwner(dependencyProjectPath) === owner ||
        isApprovedSharedPath(dependencyProjectPath)
      ) {
        continue;
      }

      violations.push({
        owner,
        sourceFile: sourceProjectPath,
        dependencyPath: [sourceProjectPath, dependencyProjectPath],
        reason: "unapproved-shared-dependency",
      });
    }
  }

  return violations;
}

export function assertGenerationBoundary(sourceRoot: string): void {
  const violations = findGenerationBoundaryViolations(sourceRoot);
  if (violations.length === 0) return;

  const details = violations
    .map((violation) => {
      const label =
        violation.reason === "cross-stack-dependency"
          ? `${violation.owner} generation reaches ${violation.targetOwner} generation`
          : `${violation.owner} generation imports an unapproved shared dependency`;
      return `- ${label}: ${violation.dependencyPath.join(" -> ")}`;
    })
    .join("\n");

  throw new Error(`Generation-stack boundary violations:\n${details}`);
}
