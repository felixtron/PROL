"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2 } from "lucide-react";
import { acceptCompanyInvitation } from "@/lib/actions/company";

export function AcceptInvitationButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  function handleAccept() {
    setError("");
    startTransition(async () => {
      try {
        await acceptCompanyInvitation(token);
        setAccepted(true);
        setTimeout(() => {
          router.push("/dashboard");
          router.refresh();
        }, 1500);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al aceptar");
      }
    });
  }

  if (accepted) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm font-medium text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Invitación aceptada. Redirigiendo...
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      <button
        type="button"
        onClick={handleAccept}
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
      >
        {pending && <Loader2 className="h-4 w-4 animate-spin" />}
        {pending ? "Aceptando..." : "Aceptar invitación"}
      </button>
    </div>
  );
}
