import { NextRequest, NextResponse } from "next/server";
import { getInteractiveStopsForPlayer } from "@/lib/queries/interactive-stops";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const lessonProgressId =
    _req.nextUrl.searchParams.get("lessonProgressId") ?? undefined;

  try {
    const stops = await getInteractiveStopsForPlayer(
      lessonId,
      lessonProgressId,
    );
    return NextResponse.json(stops);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 403 },
    );
  }
}
