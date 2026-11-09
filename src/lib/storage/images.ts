import sharp from "sharp";

export const MAX_FILE_BYTES = 3_500_000;
export async function prepareImage(input: Buffer) {
  if (input.length > MAX_FILE_BYTES || input.length === 0) throw new Error("Image exceeds the 3.5 MB upload limit.");
  const image = sharp(input, { limitInputPixels: 24_000_000, animated: false });
  const metadata = await image.metadata();
  if (!["jpeg", "png", "webp"].includes(metadata.format || "")) throw new Error("Use a PNG, JPEG, or WebP image.");
  const { data, info } = await image.rotate().resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer({ resolveWithObject: true });
  if (data.length > MAX_FILE_BYTES) throw new Error("Choose a smaller image.");
  return { data, width: info.width, height: info.height };
}
