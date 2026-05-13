import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { getQuizForLesson } from "@/lib/queries/quiz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;

  try {
    await requireUser();
    const quiz = await getQuizForLesson(lessonId);
    return NextResponse.json(quiz);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 403 },
    );
  }
}
