"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Guardando..." : "Guardar Cambios"}
    </button>
  );
}

export function ProfessorSettingsForm() {
  return <SubmitButton />;
}
