import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "node:fs/promises";
import { join, normalize } from "node:path";
import { resolveUploadDir } from "@/lib/upload-paths";

export const dynamic = "force-dynamic";

// MIME map for the file kinds users can actually upload via our forms.
// Anything else returns application/octet-stream so the browser still
// downloads it instead of failing.
const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  txt: "text/plain; charset=utf-8",
  md: "text/markdown; charset=utf-8",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  zip: "application/zip",
};

/**
 * Serves user-uploaded files from the persistent volume.
 *
 * Why a route handler and not Next's automatic /public serving: the
 * standalone build snapshots /public at build time, so files written
 * after build (everything our users upload) aren't reachable via the
 * static path. This route reads from the live disk on each request.
 *
 * Path traversal is blocked: we reject any segment containing "..".
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  if (!path?.length) {
    return new NextResponse("Not found", { status: 404 });
  }
  // Reject path traversal attempts and absolute paths.
  for (const segment of path) {
    if (
      !segment ||
      segment === "." ||
      segment === ".." ||
      segment.includes("/") ||
      segment.includes("\\")
    ) {
      return new NextResponse("Bad request", { status: 400 });
    }
  }

  const [subdir, ...rest] = path;
  if (!subdir || rest.length === 0) {
    return new NextResponse("Not found", { status: 404 });
  }

  const dir = resolveUploadDir(subdir);
  const fullPath = normalize(join(dir, ...rest));
  // Defensive: ensure the resolved path is still inside `dir`.
  if (!fullPath.startsWith(normalize(dir))) {
    return new NextResponse("Bad request", { status: 400 });
  }

  let buffer: Buffer;
  try {
    const info = await stat(fullPath);
    if (!info.isFile()) {
      return new NextResponse("Not found", { status: 404 });
    }
    buffer = await readFile(fullPath);
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }

  const ext = (rest[rest.length - 1] ?? "")
    .split(".")
    .pop()
    ?.toLowerCase() ?? "";
  const contentType = MIME_BY_EXT[ext] ?? "application/octet-stream";

  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": contentType,
      // Long cache; the file name is content-addressed (uuid).
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
