import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import nextEnv from "@next/env";

nextEnv.loadEnvConfig(process.cwd());
const privateValues = Object.entries(process.env).filter(([key, value]) =>
  Boolean(value && value.length >= 8) && !key.startsWith("NEXT_PUBLIC_") &&
  (/^DATABASE_|^POSTGRES_/.test(key) || /(?:SECRET|PASSWORD)$/.test(key))
);
assert.ok(privateValues.length, "No private environment values were available for the bundle check");
let count = 0;
async function scan(directory: string) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(filename);
    else if (/\.(?:js|css|json|map)$/.test(entry.name)) {
      const contents = await readFile(filename, "utf8");
      count++;
      for (const [key, value] of privateValues) assert.equal(contents.includes(value!), false, `A configured private value (${key}) appeared in a browser asset`);
    }
  }
}
await scan(".next/static");
console.log(`Checked ${count} browser assets: no configured private values found. Values were not printed.`);
