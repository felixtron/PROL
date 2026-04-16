import { NextRequest, NextResponse } from "next/server";
import { getQuizWithAnswers } from "@/lib/queries/quiz";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const quizId = req.nextUrl.searchParams.get("quizId");
  const attemptId = req.nextUrl.searchParams.get("attemptId");

  if (!quizId || !attemptId) {
    return NextResponse.json(
      { error: "quizId y attemptId son requeridos" },
      { status: 400 },
    );
  }

  try {
    const data = await getQuizWithAnswers(quizId, attemptId);
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 403 },
    );
  }
}
