import { servePublicImage } from "@/lib/storage/public-media";

export async function GET(_request: Request, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { type, id } = await params;
  return servePublicImage(type, id);
}
