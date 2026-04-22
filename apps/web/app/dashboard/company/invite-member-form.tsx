"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Mail, Send, Loader2 } from "lucide-react";
import { inviteToCompany } from "@/lib/actions/company";

export function InviteMemberForm({ companyId }: { companyId: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function handleSubmit(e: React.FormEvent) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-border bg-surface p-5"
    >
      <h3 className="font-heading text-base font-semibold text-text-primary">
        Invitar a un companero
      </h3>
      <p className="mt-1 text-xs text-text-tertiary">
        Solo si tu empresa tiene activadas las auto-invitaciones.
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
          className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Invitar
        </button>
      </div>
      {error && <div className="mt-2 text-xs text-red-700">{error}</div>}
      {success && <div className="mt-2 text-xs text-emerald-700">{success}</div>}
    </form>
  );
}
