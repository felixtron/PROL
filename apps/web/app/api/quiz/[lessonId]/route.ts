"use server";

import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
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
    // Defense in depth: the query layer also checks ownership, but the
    // route should gate auth itself so refactors of the query can't
    // silently drop the guard.
    await requireUser();
    const quiz = await getQuizForStudent(lessonId, enrollmentId);
    return NextResponse.json(quiz);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error" },
      { status: 403 },
    );
  }
}
