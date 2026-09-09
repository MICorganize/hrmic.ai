import { readdir, stat } from "node:fs/promises";
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

try {
  const chunks = (await filesIn(chunksDirectory)).sort((a, b) => b.bytes - a.bytes);
  if (chunks.length === 0) throw new Error("no JavaScript chunks were found");

  console.table(chunks.slice(0, 15).map((chunk) => ({
    file: chunk.path,
    kilobytes: Number((chunk.bytes / 1024).toFixed(1)),
  })));
  console.log(`Client JavaScript: ${(chunks.reduce((total, chunk) => total + chunk.bytes, 0) / 1024).toFixed(1)} KiB across ${chunks.length} chunks.`);
} catch (error) {
  console.error("Run `npm run build` before analyzing client bundles.", error);
  process.exitCode = 1;
}
