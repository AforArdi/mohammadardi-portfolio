import { AuthorizationError } from "./auth/policy";
import { ZodError } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}
export function assertSameOrigin(request: Request) {
  const expected = process.env.NODE_ENV === "production" ? new URL(process.env.APP_URL || request.url).origin : new URL(request.url).origin;
  if (request.headers.get("origin") !== expected) throw new HttpError(403, "Request origin was not accepted.");
}
export async function boundedBody(request: Request, limit: number) {
  if (Number(request.headers.get("content-length") || 0) > limit) throw new HttpError(413, "This upload is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "A request body is required.");
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    length += value.byteLength;
    if (length > limit) { await reader.cancel(); throw new HttpError(413, "This upload is too large."); }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}
export function apiError(error: unknown) {
  if (error instanceof SyntaxError) return Response.json({ error: "The request body is not valid JSON." }, { status: 400 });
  if (error instanceof AuthorizationError) return Response.json({ error: "Sign in again with your authenticator." }, { status: 401 });
  if (error instanceof HttpError) return Response.json({ error: error.message }, { status: error.status });
  if (error instanceof ZodError) return Response.json({ error: error.issues.map(issue => `${issue.path.join(".")}: ${issue.message}`).join("; ") }, { status: 400 });
  return Response.json({ error: "The operation could not finish. Please try again." }, { status: 500 });
}
