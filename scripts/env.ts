import nextEnv from "@next/env";
import { readFile, writeFile } from "node:fs/promises";
nextEnv.loadEnvConfig(process.cwd());

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name} in .env.local`);
  return value;
}
export async function updateLocalEnv(values: Record<string, string>) {
  let contents = await readFile(".env.local", "utf8").catch(() => "");
  for (const [key, value] of Object.entries(values)) {
    if (!/^[A-Z_]+$/.test(key) || /[\r\n]/.test(value)) throw new Error("Invalid environment entry");
    const entry = `${key}=${value}`;
    const pattern = new RegExp(`^${key}=.*$`, "m");
    contents = pattern.test(contents) ? contents.replace(pattern, () => entry) : `${contents.trimEnd()}\n${entry}\n`;
    process.env[key] = value;
  }
  await writeFile(".env.local", contents, { mode: 0o600 });
}
