"use server";

import { NextRequest, NextResponse } from "next/server";
import { getQuizForStudent } from "@/lib/queries/quiz";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> },
) {
  const { lessonId } = await params;
  const enrollmentId = _req.nextUrl.searchParams.get("enrollmentId");

  if (!enrollmentId) {
    return NextResponse.json(
      { error: "enrollmentId es requerido" },
      { status: 400 },
    );
  }

  try {
    const quiz = await getQuizForStudent(lessonId, enrollmentId);
    return NextResponse.json(quiz);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 403 },
    );
  }
}
