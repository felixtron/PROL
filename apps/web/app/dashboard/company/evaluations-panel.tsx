"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ClipboardCheck,
  CheckCircle2,
  Clock,
  UserPlus,
  X,
  Loader2,
  Crown,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import {
  addEvaluationParticipant,
  removeEvaluationParticipant,
} from "@/lib/actions/evaluation";

interface Participant {
  id: string;
  user: {
    id: string;
    name: string | null;
    email: string;
    avatar: string | null;
  };
  submissions: {
    id: string;
    version: number;
    submittedAt: Date;
  }[];
}

interface Assignment {
  id: string;
  assignedAt: Date;
  evaluation: {
    id: string;
    title: string;
    description: string | null;
    status: string;
    sections: { id: string; _count: { questions: number } }[];
  };
  participants: Participant[];
}

interface CompanyMember {
  id: string;
  name: string | null;
  email: string;
  avatar: string | null;
}

export function EvaluationsPanel({
  companyId,
  leaderId,
  assignments,
  members,
}: {
  companyId: string;
  leaderId: string | null;
  assignments: Assignment[];
  members: CompanyMember[];
}) {
  const [openId, setOpenId] = useState<string | null>(null);

  if (assignments.length === 0) {
    return (
      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
            <ClipboardCheck className="h-4 w-4 text-primary-600" />
            Evaluaciones del equipo
          </h2>
        </div>
        <p className="px-5 py-6 text-center text-sm text-text-tertiary">
          Aún no hay evaluaciones asignadas a tu empresa.
        </p>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="border-b border-border px-5 py-3">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-text-primary">
          <ClipboardCheck className="h-4 w-4 text-primary-600" />
          Evaluaciones del equipo
        </h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          Como líder puedes designar quién del equipo responde cada evaluación.
        </p>
      </div>

      <ul className="divide-y divide-border">
        {assignments.map((a) => {
          const total = a.participants.length;
          const answered = a.participants.filter(
            (p) => p.submissions.length > 0,
          ).length;
          const open = openId === a.id;
          return (
            <li key={a.id}>
              <button
                type="button"
                onClick={() => setOpenId(open ? null : a.id)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3 text-left transition-colors hover:bg-surface-secondary"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {open ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-text-tertiary" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {a.evaluation.title}
                    </p>
                    {a.evaluation.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-text-tertiary">
                        {a.evaluation.description}
                      </p>
                    )}
                  </div>
                </div>
                <span className="shrink-0 text-xs text-text-tertiary">
                  {answered}/{total} respondieron
                </span>
              </button>

              {open && (
                <AssignmentDetail
                  assignment={a}
                  companyId={companyId}
                  leaderId={leaderId}
                  members={members}
                />
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function AssignmentDetail({
  assignment,
  leaderId,
  members,
}: {
  assignment: Assignment;
  companyId: string;
  leaderId: string | null;
  members: CompanyMember[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [adding, setAdding] = useState(false);

  const participantIds = new Set(assignment.participants.map((p) => p.user.id));
  const assignableMembers = members.filter((m) => !participantIds.has(m.id));

  function run(userId: string, fn: () => Promise<unknown>) {
    setError("");
    setBusyUserId(userId);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error");
      } finally {
        setBusyUserId(null);
      }
    });
  }

  return (
    <div className="border-t border-border bg-surface-secondary px-5 py-3">
      {error && (
        <div className="mb-2 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <p className="mb-2 text-xs font-medium uppercase tracking-wider text-text-tertiary">
        Participantes ({assignment.participants.length})
      </p>

      {assignment.participants.length === 0 ? (
        <p className="mb-3 text-xs text-text-tertiary">
          Nadie asignado todavía.
        </p>
      ) : (
        <ul className="mb-3 space-y-1">
          {assignment.participants.map((p) => {
            const latest = p.submissions[0];
            const isLeader = p.user.id === leaderId;
            const busy = busyUserId === p.user.id && pending;
            return (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-lg bg-surface px-3 py-2"
              >
                {p.user.avatar ? (
                  <img
                    src={p.user.avatar}
                    alt={p.user.name ?? p.user.email}
                    className="h-7 w-7 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                    {(p.user.name ?? p.user.email).slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="truncate text-sm font-medium text-text-primary">
                      {p.user.name ?? p.user.email}
                    </p>
                    {isLeader && (
                      <Crown
                        className="h-3 w-3 text-amber-600"
                        aria-label="Líder"
                      />
                    )}
                  </div>
                  <p className="truncate text-xs text-text-tertiary">
                    {p.user.email}
                  </p>
                </div>
                {latest ? (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {latest.version > 1
                      ? `v${latest.version}`
                      : "Respondido"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-pill bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                    <Clock className="h-3 w-3" />
                    Pendiente
                  </span>
                )}
                {!isLeader && (
                  <button
                    type="button"
                    onClick={() =>
                      run(p.user.id, () =>
                        removeEvaluationParticipant(
                          assignment.id,
                          p.user.id,
                        ),
                      )
                    }
                    disabled={busy}
                    className="rounded-md p-1 text-red-600 hover:bg-red-50 disabled:opacity-50"
                    title="Quitar participante"
                  >
                    {busy ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <X className="h-3.5 w-3.5" />
                    )}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {!adding ? (
        <button
          type="button"
          onClick={() => setAdding(true)}
          disabled={assignableMembers.length === 0}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
        >
          <UserPlus className="h-3.5 w-3.5" />
          {assignableMembers.length === 0
            ? "Todos los miembros ya participan"
            : "Agregar participante"}
        </button>
      ) : (
        <div className="rounded-lg border border-border bg-surface p-2">
          <div className="flex items-center justify-between pb-2">
            <p className="text-xs font-medium text-text-secondary">
              Elige a quién asignar ({assignableMembers.length} disponibles)
            </p>
            <button
              type="button"
              onClick={() => setAdding(false)}
              className="text-xs text-text-secondary hover:text-text-primary"
            >
              Cerrar
            </button>
          </div>
          <ul className="max-h-64 overflow-y-auto">
            {assignableMembers.map((m) => {
              const busy = busyUserId === m.id && pending;
              return (
                <li
                  key={m.id}
                  className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 hover:bg-surface-secondary"
                >
                  <div className="flex min-w-0 items-center gap-2">
                    {m.avatar ? (
                      <img
                        src={m.avatar}
                        alt={m.name ?? m.email}
                        className="h-6 w-6 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-100 text-[10px] font-semibold text-primary-700">
                        {(m.name ?? m.email).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium text-text-primary">
                        {m.name ?? m.email}
                      </p>
                      <p className="truncate text-[11px] text-text-tertiary">
                        {m.email}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      run(m.id, () =>
                        addEvaluationParticipant(assignment.id, m.id),
                      )
                    }
                    disabled={busy}
                    className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] font-medium text-text-primary hover:bg-primary-50 hover:text-primary-700 disabled:opacity-50"
                  >
                    {busy ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <UserPlus className="h-3 w-3" />
                    )}
                    Agregar
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
