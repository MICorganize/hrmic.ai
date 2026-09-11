import { brotliCompressSync } from "node:zlib";
import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";

const chunksDirectory = path.join(process.cwd(), ".next", "static", "chunks");

async function filesIn(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return filesIn(fullPath);
    if (!entry.name.endsWith(".js")) return [];
    return [{ path: path.relative(process.cwd(), fullPath), bytes: (await stat(fullPath)).size }];
  }));
  return files.flat();
}

const routeManifests = [
  { route: "/dashboard", file: ".next/server/app/(portal)/dashboard/page_client-reference-manifest.js", budgetKiB: 150 },
  { route: "/organization/organization-employee", file: ".next/server/app/(portal)/organization/organization-employee/page_client-reference-manifest.js", budgetKiB: 190 },
  { route: "/salary/calculate/normal", file: ".next/server/app/(portal)/salary/calculate/normal/page_client-reference-manifest.js", budgetKiB: 160 },
];

async function routeSize({ route, file, budgetKiB }) {
  const source = await readFile(path.join(process.cwd(), file), "utf8");
  const assignment = source.split("\n").find((line) => line.includes("__RSC_MANIFEST[") && line.includes(" = {"));
  if (!assignment) throw new Error(`manifest assignment not found for ${route}`);
  const manifest = JSON.parse(assignment.slice(assignment.indexOf(" = ") + 3, -1));
  const entryFiles = Object.entries(manifest.entryJSFiles)
    .filter(([entry]) => entry.endsWith("/page"))
    .flatMap(([, files]) => files);
  const files = [...new Set(entryFiles)];
  const contents = await Promise.all(files.map((fileName) => readFile(path.join(process.cwd(), ".next", fileName))));
  const bytes = contents.reduce((total, content) => total + content.length, 0);
  const brotliBytes = contents.reduce((total, content) => total + brotliCompressSync(content).length, 0);
  return { route, files: files.length, kilobytes: bytes / 1024, brotliKiB: brotliBytes / 1024, budgetKiB, withinBudget: bytes / 1024 <= budgetKiB };
}

try {
  const chunks = (await filesIn(chunksDirectory)).sort((a, b) => b.bytes - a.bytes);
  if (chunks.length === 0) throw new Error("no JavaScript chunks were found");

  console.table(chunks.slice(0, 15).map((chunk) => ({
    file: chunk.path,
    kilobytes: Number((chunk.bytes / 1024).toFixed(1)),
  })));
  console.log(`Client JavaScript: ${(chunks.reduce((total, chunk) => total + chunk.bytes, 0) / 1024).toFixed(1)} KiB across ${chunks.length} chunks.`);

  const routes = await Promise.all(routeManifests.map(routeSize));
  console.table(routes.map((route) => ({
    route: route.route,
    files: route.files,
    kilobytes: Number(route.kilobytes.toFixed(1)),
    brotliKiB: Number(route.brotliKiB.toFixed(1)),
    budgetKiB: route.budgetKiB,
    status: route.withinBudget ? "pass" : "over",
  })));
  if (process.env.BUNDLE_BUDGET_ENFORCE === "true" && routes.some((route) => !route.withinBudget)) process.exitCode = 1;
} catch (error) {
  console.error("Run `npm run build` before analyzing client bundles.", error);
  process.exitCode = 1;
}
