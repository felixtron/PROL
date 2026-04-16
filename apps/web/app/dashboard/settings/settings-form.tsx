"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors active:bg-primary-800 disabled:opacity-50 md:w-auto md:rounded-lg md:py-2.5"
    >
      {pending && <Loader2 className="h-4 w-4 animate-spin" />}
      {pending ? "Guardando..." : "Guardar Cambios"}
    </button>
  );
}

export function SettingsForm() {
  return <SubmitButton />;
}
