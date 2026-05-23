"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MoreVertical, UserPlus, Eye, ExternalLink } from "lucide-react";
import {
  ManualEnrollDialog,
  type DialogCourse,
  type DialogStudent,
} from "../manual-enroll-dialog";

type CourseStatus = "DRAFT" | "REVIEW" | "PUBLISHED" | "ARCHIVED";

export function CourseActionsMenu({
  course,
  students,
}: {
  course: DialogCourse & { slug: string; status: CourseStatus };
  students: DialogStudent[];
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointer(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  function openEnroll() {
    setMenuOpen(false);
    setEnrollOpen(true);
  }

  return (
    <div ref={rootRef} className="relative inline-block text-left">
      <button
        type="button"
        onClick={() => setMenuOpen((v) => !v)}
        className="rounded-lg p-1.5 text-text-secondary transition-colors hover:bg-surface-tertiary hover:text-text-primary"
        title="Acciones del curso"
        aria-haspopup="menu"
        aria-expanded={menuOpen}
      >
        <MoreVertical className="h-4 w-4" />
      </button>

      {menuOpen && (
        <div
          role="menu"
          className="absolute right-0 z-20 mt-1 w-52 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={openEnroll}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-text-primary transition-colors hover:bg-surface-secondary"
          >
            <UserPlus className="h-3.5 w-3.5 text-text-tertiary" />
            Agregar alumno
          </button>
          <Link
            href={`/preview/courses/${course.id}`}
            target="_blank"
            rel="noopener noreferrer"
            role="menuitem"
            onClick={() => setMenuOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-secondary"
          >
            <Eye className="h-3.5 w-3.5 text-text-tertiary" />
            Vista previa
          </Link>
          {course.status === "PUBLISHED" && (
            <Link
              href={`/courses/${course.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              role="menuitem"
              onClick={() => setMenuOpen(false)}
              className="flex items-center gap-2 px-3 py-2 text-sm text-text-primary transition-colors hover:bg-surface-secondary"
            >
              <ExternalLink className="h-3.5 w-3.5 text-text-tertiary" />
              Ver página pública
            </Link>
          )}
        </div>
      )}

      <ManualEnrollDialog
        open={enrollOpen}
        onClose={() => setEnrollOpen(false)}
        mode={{
          kind: "pinned-course",
          course: {
            id: course.id,
            title: course.title,
            priceInCents: course.priceInCents,
            currency: course.currency,
          },
          students,
        }}
      />
    </div>
  );
}
