import sharp, { type Metadata } from "sharp";

export const MAX_FILE_BYTES = 3_500_000;
export const UNIVERSAL_MAX_BYTES = 400_000;
export const MAX_INPUT_PIXELS = 24_000_000;

export const IMAGE_PURPOSES = ["icon", "portrait", "project", "certificate"] as const;
export type ImagePurpose = typeof IMAGE_PURPOSES[number];

export interface PurposeBudget {
  maxDimension: number;
  maxBytes: number;
  minDimensionFloor: number;
}

export const PURPOSE_BUDGETS: Record<ImagePurpose, PurposeBudget> = {
  icon: { maxDimension: 256, maxBytes: 40_000, minDimensionFloor: 96 },
  portrait: { maxDimension: 800, maxBytes: 160_000, minDimensionFloor: 360 },
  project: { maxDimension: 1600, maxBytes: 250_000, minDimensionFloor: 800 },
  certificate: { maxDimension: 2400, maxBytes: 400_000, minDimensionFloor: 1200 },
};

export async function prepareImage(input: Buffer, purpose: ImagePurpose = "certificate") {
  if (input.length > MAX_FILE_BYTES || input.length === 0) {
    throw new Error("Image exceeds the 3.5 MB upload limit.");
  }
  if (!IMAGE_PURPOSES.includes(purpose)) {
    throw new Error(`Invalid image purpose: "${purpose}". Use icon, portrait, project, or certificate.`);
  }

  const budget = PURPOSE_BUDGETS[purpose];
  const targetMaxBytes = Math.min(budget.maxBytes, UNIVERSAL_MAX_BYTES);

  // Decode only supported formats with pixel limits and disabled animation
  const decoder = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, animated: false });
  let metadata: Metadata;
  try {
    metadata = await decoder.metadata();
  } catch {
    throw new Error("Use a PNG, JPEG, or WebP image.");
  }

  const format = metadata.format || "";
  if (!["jpeg", "png", "webp"].includes(format)) {
    throw new Error("Use a PNG, JPEG, or WebP image.");
  }
  if (metadata.pages && metadata.pages > 1) {
    throw new Error("Animated images are not supported.");
  }
  if (!metadata.width || !metadata.height) {
    throw new Error("Could not determine image dimensions.");
  }

  // Base pipeline with auto-orientation (stripping EXIF)
  const base = sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).rotate();

  // Initial bounded dimensions respecting purpose max dimension without upscaling
  const swapsAxes = [5, 6, 7, 8].includes(metadata.orientation || 1);
  const orientedWidth = swapsAxes ? metadata.height : metadata.width;
  const orientedHeight = swapsAxes ? metadata.width : metadata.height;
  const initialScale = Math.min(1, budget.maxDimension / Math.max(orientedWidth, orientedHeight));
  let currentWidth = Math.max(1, Math.round(orientedWidth * initialScale));
  let currentHeight = Math.max(1, Math.round(orientedHeight * initialScale));

  let quality = 85;
  const MIN_QUALITY = 50;
  const MAX_ATTEMPTS = 8;
  let attempt = 0;

  while (attempt < MAX_ATTEMPTS) {
    attempt++;

    // Encode directly from the original decoded source to avoid iterative lossy generational degradation
    const { data, info } = await base
      .clone()
      .resize({
        width: currentWidth,
        height: currentHeight,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality, effort: 4 })
      .toBuffer({ resolveWithObject: true });

    if (data.length <= targetMaxBytes && data.length <= UNIVERSAL_MAX_BYTES) {
      return { data, width: info.width, height: info.height };
    }

    // Step down quality first until the clamped floor is reached
    if (quality > MIN_QUALITY) {
      quality = Math.max(MIN_QUALITY, quality - 10);
    } else {
      // Quality floor reached: downscale dimensions while respecting the readability floor
      const nextWidth = Math.max(1, Math.round(currentWidth * 0.8));
      const nextHeight = Math.max(1, Math.round(currentHeight * 0.8));
      const nextMaxDim = Math.max(nextWidth, nextHeight);

      if (nextMaxDim < budget.minDimensionFloor) {
        // Dimension floor reached; cannot shrink further without sacrificing readability
        break;
      }

      currentWidth = nextWidth;
      currentHeight = nextHeight;
      quality = 65; // Reset quality slightly for the reduced dimensions
    }
  }

  throw new Error(
    `Image is too complex to compress within the ${Math.round(targetMaxBytes / 1000)} KB limit while preserving readability. Choose a less complex or pre-scaled image.`
  );
}
