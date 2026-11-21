import assert from "node:assert/strict";
import { test } from "node:test";
import { canvasOutputScale, clampZoom, MIN_ZOOM, MAX_ZOOM } from "../src/lib/pdf/preview-layout";

test("PDF zoom stays within readable controls and returns exactly to fit width", () => {
  assert.equal(clampZoom(1), 1);
  assert.equal(clampZoom(0), MIN_ZOOM);
  assert.equal(clampZoom(100), MAX_ZOOM);
  assert.equal(clampZoom(1.25 - 0.25), 1);
  assert.equal(clampZoom(1.1 + 0.1), 1.2);
});

test("PDF backing bitmaps respect pixel and edge limits at high zoom, preserving CSS page dimensions", () => {
  assert.equal(canvasOutputScale(700, 990, 2), 2);
  for (const [width, height, dpr] of [[2750, 3900, 3], [1100, 30_000, 2], [300, 420, 1]]) {
    const scale = canvasOutputScale(width, height, dpr);
    assert.ok(width * scale * height * scale <= 6_000_001);
    assert.ok(Math.max(width, height) * scale <= 8192);
    assert.ok(scale > 0 && scale <= Math.min(dpr, 2));
  }
  assert.throws(() => canvasOutputScale(0, 100, 1));
  assert.throws(() => canvasOutputScale(100, Number.POSITIVE_INFINITY, 1));
});
