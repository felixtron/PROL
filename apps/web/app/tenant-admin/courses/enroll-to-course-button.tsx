"use client";

import { useState } from "react";
import { UserPlus } from "lucide-react";
import {
  ManualEnrollDialog,
  type DialogCourse,
  type DialogStudent,
} from "../manual-enroll-dialog";

export function EnrollToCourseButton({
  course,
  students,
}: {
  course: DialogCourse;
  students: DialogStudent[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary hover:text-primary-700"
        title="Inscribir un alumno manualmente"
      >
        <UserPlus className="h-3 w-3" />
        Agregar alumno
      </button>
      <ManualEnrollDialog
        open={open}
        onClose={() => setOpen(false)}
        mode={{ kind: "pinned-course", course, students }}
      />
    </>
  );
}
