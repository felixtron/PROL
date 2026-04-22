"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, X, Loader2, Send } from "lucide-react";
import { inviteToCompany, revokeInvitation } from "@/lib/actions/company";

interface Invitation {
  id: string;
  email: string;
  status: string;
  expiresAt: Date;
  createdAt: Date;
  inviter: { name: string | null; email: string };
}

function formatDate(d: Date): string {
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function InvitationsTab({
  companyId,
  invitations,
  allowMemberInvitations,
}: {
  companyId: string;
  invitations: Invitation[];
  allowMemberInvitations: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccess("");
    startTransition(async () => {
      try {
        await inviteToCompany(companyId, email);
        setSuccess(`Invitacion enviada a ${email}`);
        setEmail("");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      }
    });
  }

  function handleRevoke(invitationId: string) {
    if (!confirm("Revocar esta invitacion?")) return;
    setError("");
    setRevokingId(invitationId);
    startTransition(async () => {
      try {
        await revokeInvitation(invitationId);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setRevokingId(null);
      }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>
      )}
      {success && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      )}

      <form
        onSubmit={handleInvite}
        className="rounded-xl border border-border bg-surface p-5"
      >
        <h3 className="font-heading text-base font-semibold text-text-primary">
          Invitar nuevo miembro
        </h3>
        <p className="mt-1 text-xs text-text-tertiary">
          Se enviara un email con un link unico para que se una a la empresa.
        </p>
        <div className="mt-3 flex gap-2">
          <div className="relative flex-1">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@empresa.com"
              className="w-full rounded-lg border border-border bg-surface py-2 pl-9 pr-3 text-sm focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
          </div>
          <button
            type="submit"
            disabled={pending || !email}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Invitar
          </button>
        </div>
        {!allowMemberInvitations && (
          <p className="mt-3 text-xs text-amber-700">
            Solo los administradores pueden invitar a esta empresa. Activa
            &quot;auto-invitaciones&quot; en la configuracion para que los miembros
            tambien puedan invitar.
          </p>
        )}
      </form>

      <div className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h3 className="font-heading text-base font-semibold text-text-primary">
            Invitaciones pendientes ({invitations.length})
          </h3>
        </div>
        {invitations.length === 0 ? (
          <p className="p-6 text-center text-sm text-text-tertiary">
            No hay invitaciones pendientes.
          </p>
        ) : (
          <ul className="divide-y divide-border">
            {invitations.map((i) => (
              <li key={i.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {i.email}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    Invitado por {i.inviter.name ?? i.inviter.email} ·{" "}
                    Expira {formatDate(i.expiresAt)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevoke(i.id)}
                  disabled={pending && revokingId === i.id}
                  className="rounded-lg p-2 text-red-600 transition-colors hover:bg-red-50 disabled:opacity-50"
                  title="Revocar invitacion"
                >
                  {pending && revokingId === i.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
