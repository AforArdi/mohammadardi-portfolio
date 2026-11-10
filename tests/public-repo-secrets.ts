import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import nextEnv from "@next/env";

// Optional operator check with the local ignored environment; never print its values.
nextEnv.loadEnvConfig(process.cwd());
const values = Object.entries(process.env).filter(([key, value]) =>
  value && value.length >= 8 && !key.startsWith("NEXT_PUBLIC_") &&
  (/^DATABASE_/.test(key) || /(?:SECRET|PASSWORD)$/.test(key))
);
for (const key of ["DATABASE_ADMIN_URL", "DATABASE_POOL_URL", "DATABASE_MIGRATION_URL"]) {
  const value = process.env[key];
  if (value) {
    try {
      const password = new URL(value).password;
      if (password) values.push([`${key}_PASSWORD`, decodeURIComponent(password)]);
    } catch { throw new Error(`Invalid ${key}; URL details are intentionally omitted.`); }
  }
}
if (!values.length) throw new Error("No configured private values were available; this check cannot establish their absence.");
const paths = [...new Set(execFileSync("git", ["ls-files", "-z", "--cached", "--others", "--exclude-standard"], { encoding: "utf8" }).split("\0").filter(Boolean))];
for (const filename of paths) {
  if (/(^|\/)\.env(\.|$)/.test(filename) && filename !== ".env.example") throw new Error("A non-example environment file would be public");
  const data = await readFile(filename);
  for (const [key, value] of values) if (value && data.includes(Buffer.from(value))) throw new Error(`Configured private value detected in ${filename} (${key})`);
}
const history = execFileSync("git", ["log", "--all", "-p", "--no-ext-diff", "--no-textconv", "--format=commit %h"], { maxBuffer: 128 * 1024 * 1024 });
for (const [key, value] of values) if (value && history.includes(Buffer.from(value))) throw new Error(`Configured private value detected in textual Git history (${key})`);
console.log(`Checked ${paths.length} current files and textual Git history: no configured private values found or printed. This is not an exhaustive secret detector.`);
