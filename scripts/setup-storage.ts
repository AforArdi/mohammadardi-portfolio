import { createClient } from "@supabase/supabase-js";
import { required } from "./env";

const storage = createClient(required("NEXT_PUBLIC_SUPABASE_URL"), required("SUPABASE_SECRET_KEY"), { auth: { persistSession: false } }).storage;
for (const [name, publicRead, types] of [
  ["private-documents", false, ["application/pdf"]],
  ["private-staging", false, ["image/webp"]],
  ["public-media", false, ["image/webp"]],
] as const) {
  const options = { public: publicRead, fileSizeLimit: 3_500_000, allowedMimeTypes: [...types] };
  const { data: existing, error: lookupError } = await storage.getBucket(name);
  if (lookupError && lookupError.message !== "Bucket not found" && !lookupError.message.includes("not found")) throw new Error("Storage lookup failed; check SUPABASE_SECRET_KEY.");
  const result = existing ? await storage.updateBucket(name, options) : await storage.createBucket(name, options);
  if (result.error) throw new Error(`Could not configure ${name}`);
  console.log(`Configured ${name} (${publicRead ? "published images" : "private"}).`);
}
