import { NextRequest, NextResponse } from "next/server";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ lessonId: string }> }
) {
  try {
    const user = await requireUser();
    const { lessonId } = await params;
    const enrollmentId = req.nextUrl.searchParams.get("enrollmentId");
    if (!enrollmentId) {
      return NextResponse.json(
        { error: "enrollmentId requerido" },
        { status: 400 }
      );
    }

    // Verify the enrollment belongs to the user
    const enrollment = await db.enrollment.findFirst({
      where: { id: enrollmentId, studentId: user.id },
      select: { id: true },
    });
    if (!enrollment) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const submission = await db.assignmentSubmission.findUnique({
      where: { enrollmentId_lessonId: { enrollmentId, lessonId } },
      select: {
        id: true,
        fileUrl: true,
        fileName: true,
        fileSize: true,
        notes: true,
        status: true,
        grade: true,
        feedback: true,
        submittedAt: true,
        reviewedAt: true,
      },
    });

    return NextResponse.json({ submission });
  } catch (err) {
    if (err instanceof Error && err.message === "Unauthorized") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}
