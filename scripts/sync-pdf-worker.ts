import { existsSync, readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, "..");

const sourceWorker = resolve(root, "node_modules", "pdfjs-dist", "build", "pdf.worker.min.mjs");
const destWorker = resolve(root, "public", "pdf.worker.min.mjs");
const pkgPath = resolve(root, "node_modules", "pdfjs-dist", "package.json");

if (!existsSync(sourceWorker)) {
  console.error("PDF.js worker is missing. Run pnpm install before building.");
  process.exit(1);
}

let version = "unknown";
if (existsSync(pkgPath)) {
  try {
    const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
    version = pkg.version || "unknown";
  } catch {
    // ignore
  }
}

mkdirSync(resolve(root, "public"), { recursive: true });

const sourceContent = readFileSync(sourceWorker);
let shouldCopy = true;

if (existsSync(destWorker)) {
  const destContent = readFileSync(destWorker);
  if (sourceContent.equals(destContent)) {
    shouldCopy = false;
  }
}

if (shouldCopy) {
  writeFileSync(destWorker, sourceContent);
  console.log(`[sync-pdf-worker] Copied pdf.worker.min.mjs (v${version}) -> public/pdf.worker.min.mjs`);
} else {
  console.log(`[sync-pdf-worker] public/pdf.worker.min.mjs is already synchronized (v${version})`);
}
