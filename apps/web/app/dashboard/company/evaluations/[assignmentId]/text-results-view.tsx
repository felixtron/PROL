import { CheckCircle2, Clock, MessageSquare } from "lucide-react";
import type { EvaluationQuestionType } from "@prol/db";

interface SectionData {
  id: string;
  title: string;
  questions: {
    id: string;
    code: string | null;
    label: string;
    type: EvaluationQuestionType;
    textAnswers: { author: string; text: string }[];
  }[];
}

interface Data {
  sections: SectionData[];
  participants: {
    id: string;
    user: { id: string; name: string | null; email: string; avatar: string | null };
    respondedAt: Date | null;
    version: number | null;
  }[];
  totalParticipants: number;
  respondents: number;
}

/** Vista para evaluaciones de respuesta libre (Directrices, Cargos y roles). */
export function TextResultsView({ data }: { data: Data }) {
  return (
    <div className="space-y-6">
      {data.sections.map((s) => (
        <section
          key={s.id}
          className="rounded-xl border border-border bg-surface"
        >
          <div className="border-b border-border px-5 py-3">
            <h2 className="font-heading text-base font-semibold text-text-primary">
              {s.title}
            </h2>
          </div>
          <ul className="divide-y divide-border">
            {s.questions.map((q) => (
              <li key={q.id} className="px-5 py-3">
                <div className="flex items-start gap-3">
                  <span
                    className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700"
                    aria-label="Texto abierto"
                  >
                    <MessageSquare className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-text-primary">
                      {q.code && (
                        <span className="mr-1 font-semibold text-text-secondary">
                          {q.code}.
                        </span>
                      )}
                      {q.label}
                    </p>
                    {q.textAnswers.length === 0 ? (
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        Sin respuestas todavía
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-2">
                        {q.textAnswers.map((t, i) => (
                          <li
                            key={i}
                            className="rounded-lg border border-border bg-surface-secondary px-3 py-2"
                          >
                            <p className="text-[11px] font-medium text-text-tertiary">
                              {t.author}
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm text-text-secondary">
                              {t.text}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <section className="rounded-xl border border-border bg-surface">
        <div className="border-b border-border px-5 py-3">
          <h2 className="font-heading text-base font-semibold text-text-primary">
            Participantes ({data.respondents}/{data.totalParticipants})
          </h2>
        </div>
        <ul className="divide-y divide-border">
          {data.participants.map((p) => (
            <li key={p.id} className="flex items-center gap-3 px-5 py-3">
              {p.user.avatar ? (
                <img
                  src={p.user.avatar}
                  alt={p.user.name ?? p.user.email}
                  className="h-8 w-8 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                  {(p.user.name ?? p.user.email).slice(0, 1).toUpperCase()}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {p.user.name ?? p.user.email}
                </p>
                <p className="truncate text-xs text-text-tertiary">
                  {p.user.email}
                </p>
              </div>
              {p.version ? (
                <span className="inline-flex items-center gap-1 rounded-pill bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  v{p.version}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-pill bg-surface-tertiary px-2 py-0.5 text-[11px] font-medium text-text-tertiary">
                  <Clock className="h-3 w-3" />
                  Pendiente
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
