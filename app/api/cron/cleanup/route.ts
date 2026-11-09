import { timingSafeEqual } from "node:crypto";
import { drainCleanup, reconcileCleanup } from "@/lib/storage/cleanup";
export const maxDuration = 60;
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const actual = Buffer.from(request.headers.get("authorization") || "");
  const expected = Buffer.from(`Bearer ${secret || ""}`);
  if (!secret || actual.length !== expected.length || !timingSafeEqual(actual, expected)) return new Response(null, { status: 401 });
  await reconcileCleanup();
  return Response.json(await drainCleanup(10), { headers: { "Cache-Control": "no-store" } });
}
export const POST = GET;
