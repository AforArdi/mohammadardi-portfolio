export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.5;
const MAX_CANVAS_PIXELS = 6_000_000;
const MAX_CANVAS_EDGE = 8192;

export function clampZoom(value: number) {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value * 100) / 100));
}

// CSS dimensions remain readable at any zoom; bound only the backing bitmap.
export function canvasOutputScale(width: number, height: number, deviceScale: number) {
  if (![width, height, deviceScale].every(value => Number.isFinite(value) && value > 0)) throw new Error("Invalid PDF page dimensions.");
  return Math.min(deviceScale, 2, Math.sqrt(MAX_CANVAS_PIXELS / (width * height)), MAX_CANVAS_EDGE / Math.max(width, height));
}
