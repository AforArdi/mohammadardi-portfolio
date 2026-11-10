export function resolveVideoTitle(override: string | null | undefined, fetched: string | null | undefined) {
  return override?.trim() || fetched || "YouTube Video";
}
