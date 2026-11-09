import { asc, and, eq, isNull, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { profile } from "@/db/schema";
import { requireOwnerAdmin } from "@/lib/auth/guard";
import { apiError, assertSameOrigin, boundedBody, HttpError } from "@/lib/api";
import { collectionTables, invalidatePortfolio, saveContent, type Collection } from "@/lib/content/mutations";
import { deleteInput } from "@/lib/content/validation";
import { drainCleanup } from "@/lib/storage/cleanup";

type Context = { params: Promise<{ collection: string }> };
export async function GET(_request: Request, { params }: Context) {
  try {
    await requireOwnerAdmin();
    const { collection } = await params;
    if (collection === "profile") return Response.json((await getDb().select().from(profile).where(eq(profile.id, 1)))[0] || null);
    if (!Object.hasOwn(collectionTables, collection)) throw new HttpError(404, "Section not found.");
    const table = collectionTables[collection as Collection];
    return Response.json(await getDb().select().from(table).where(isNull(table.deletedAt)).orderBy(asc(table.displayOrder), asc(table.id)), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request); await requireOwnerAdmin();
    const body = JSON.parse((await boundedBody(request, 40_000)).toString("utf8"));
    const result = await saveContent((await params).collection, body);
    invalidatePortfolio();
    await drainCleanup(1).catch(() => undefined);
    return Response.json(result);
  } catch (error) { return apiError(error); }
}
export async function DELETE(request: Request, { params }: Context) {
  try {
    assertSameOrigin(request); await requireOwnerAdmin();
    const { collection } = await params;
    if (!Object.hasOwn(collectionTables, collection)) throw new HttpError(404, "Section not found.");
    const { id, expectedVersion } = deleteInput.parse(JSON.parse((await boundedBody(request, 2000)).toString("utf8")));
    const table = collectionTables[collection as Collection];
    const deleted = await getDb().update(table).set({ deletedAt: new Date(), isPublished: false, version: sql`${table.version} + 1`, updatedAt: new Date() }).where(and(eq(table.id, id), eq(table.version, expectedVersion), isNull(table.deletedAt))).returning({ id: table.id });
    if (!deleted.length) throw new HttpError(409, "This item changed in another tab. Refresh and try again.");
    invalidatePortfolio();
    await drainCleanup(1).catch(() => undefined);
    return Response.json({ deleted: true });
  } catch (error) { return apiError(error); }
}
