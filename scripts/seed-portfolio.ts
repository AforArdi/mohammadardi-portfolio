import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import sharp from "sharp";
import * as schema from "../src/db/schema";
import { initialAchievements, initialProfile, initialProjects, initialSkills, initialSocials, seedId } from "../src/lib/content/seed-data";
import { required } from "./env";

const client = postgres(required("DATABASE_MIGRATION_URL"), { ssl: "require", max: 1, prepare: false });
const db = drizzle(client);
const storage = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } }).storage;
async function image(id: string, source: string) {
  const [existing] = await db.select({ id: schema.mediaAssets.id }).from(schema.mediaAssets).where(eq(schema.mediaAssets.id, id));
  if (existing) return id;
  const input = source.startsWith("https:") ? await fetch(source).then(async response => { if (!response.ok) throw new Error("Seed image download failed"); return Buffer.from(await response.arrayBuffer()); }) : await readFile(source);
  const { data, info } = await sharp(input, { limitInputPixels: 40_000_000 }).rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 88 }).toBuffer({ resolveWithObject: true });
  const path = `${id}.webp`;
  const { error } = await storage.from("public-media").upload(path, data, { contentType: "image/webp", upsert: false });
  if (error && !error.message.toLowerCase().includes("already exists")) throw new Error("Seed image upload failed");
  await db.insert(schema.mediaAssets).values({ id, bucketName: "public-media", storagePath: path, filename: path, mimeType: "image/webp", fileSizeBytes: data.length, width: info.width, height: info.height, createdBy: required("OWNER_USER_ID") }).onConflictDoNothing();
  return id;
}
try {
  const avatarMediaId = await image(seedId(400), "src/assets/new-hero-avatar.png");
  await db.insert(schema.profile).values({ ...initialProfile, id: 1, avatarMediaId }).onConflictDoNothing();
  for (const [index, [name, iconKey, accentColor]] of initialSkills.entries()) {
    await db.insert(schema.skills).values({ id: seedId(index + 1), name, iconProvider: iconKey.startsWith("lucide:") ? "lucide" : "simple-icons", iconKey, accentColor, displayOrder: index, isPublished: true }).onConflictDoNothing();
  }
  for (const [index, { image: source, ...project }] of initialProjects.entries()) {
    const imageMediaId = await image(seedId(401 + index), source);
    await db.insert(schema.projects).values({ ...project, imageMediaId, id: seedId(101 + index), displayOrder: index, isPublished: true }).onConflictDoNothing();
  }
  for (const [index, { image: source, ...achievement }] of initialAchievements.entries()) {
    const imageMediaId = await image(seedId(410 + index), source);
    await db.insert(schema.achievements).values({ ...achievement, imageMediaId, id: seedId(201 + index), displayOrder: index, isPublished: true }).onConflictDoNothing();
  }
  for (const [index, social] of initialSocials.entries()) await db.insert(schema.socialLinks).values({ ...social, id: seedId(301 + index), displayOrder: index, isPublished: true }).onConflictDoNothing();
  console.log("Existing portfolio content seeded without overwriting edits. Upload your PDF through the dashboard to enable the CV button.");
} finally { await client.end(); }
