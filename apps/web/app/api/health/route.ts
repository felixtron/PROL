import { NextResponse } from "next/server";
import { db } from "@prol/db";

export const dynamic = "force-dynamic";

/**
 * Liveness + readiness probe for the container. Returns 200 if the web
 * process can reach the database, 503 otherwise. Used by docker compose
 * healthcheck and by Traefik to decide if the service is ready.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "db error" },
      { status: 503 },
    );
  }
}
