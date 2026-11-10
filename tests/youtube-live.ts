import assert from "node:assert/strict";
import { fetchYouTubeMetadata } from "../src/lib/youtube/service";

// Optional public-provider smoke probe, deliberately outside the offline *.test.ts suite.
const available = await fetchYouTubeMetadata("dQw4w9WgXcQ");
assert.equal(available.ok, true, "The known public video's oEmbed metadata should be available");
assert.ok(available.title && available.thumbnailUrl);
const missing = await fetchYouTubeMetadata("00000000000");
assert.equal(missing.ok, false, "An unavailable video's metadata should fail cleanly");
console.log("YouTube live metadata: public video available; missing video handled. No portfolio records were created.");
