import { join } from "node:path";
import { existsSync } from "node:fs";

/**
 * Resolve the absolute upload directory for a given subdir
 * (e.g. "thumbnails", "pdfs", "assignments").
 *
 * In production the standalone Next.js server runs from
 * /app/apps/web, where the public dir lives at ./public/uploads. In
 * dev (`pnpm dev`) cwd may be the repo root or apps/web depending on
 * how it was started, so we try a couple of candidates and use the
 * first one that exists. UPLOAD_DIR overrides everything.
 */
export function resolveUploadDir(subdir: string): string {
  if (process.env.UPLOAD_DIR) {
    return join(process.env.UPLOAD_DIR, subdir);
  }
  const cwd = process.cwd();
  const candidates = [
    join(cwd, "public", "uploads", subdir),                 // standalone runtime
    join(cwd, "apps", "web", "public", "uploads", subdir),  // monorepo root in dev
  ];
  for (const c of candidates) {
    // Use the parent dir as the existence probe — the leaf might not exist
    // yet for a fresh deploy. Pick the first whose parent is reachable.
    const parent = c.replace(`/${subdir}`, "");
    if (existsSync(parent)) return c;
  }
  // Last resort: use the standalone path. mkdir -p will create it.
  return candidates[0]!;
}
