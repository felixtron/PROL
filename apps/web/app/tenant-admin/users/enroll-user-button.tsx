"use client";

import { useState } from "react";
import { GraduationCap } from "lucide-react";
import {
  ManualEnrollDialog,
  type DialogCourse,
  type DialogStudent,
} from "../manual-enroll-dialog";

export function EnrollUserButton({
  student,
  courses,
}: {
  student: DialogStudent;
  courses: DialogCourse[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        title="Inscribir a un curso (manual)"
        onClick={() => setOpen(true)}
        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-secondary disabled:opacity-50"
      >
        <GraduationCap className="h-4 w-4" />
      </button>
      <ManualEnrollDialog
        open={open}
        onClose={() => setOpen(false)}
        mode={{ kind: "pinned-student", student, courses }}
      />
    </>
  );
}
