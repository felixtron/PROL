import {
  Calendar,
  Clock,
  MapPin,
  Video,
  ExternalLink,
  Laptop,
} from "lucide-react";
import { getMyAdvisorySessions } from "@/lib/queries/advisory";
import { requireAdvisoryEnabled } from "@/lib/advisory-access";
import { APP_TIME_ZONE } from "@/lib/timezone";

const typeLabel: Record<string, string> = {
  IN_PERSON: "Presencial",
  VIRTUAL: "Virtual",
  HYBRID: "Híbrida",
};

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIME_ZONE,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(date));
}

function formatTime(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: APP_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

export default async function MyAdvisoryPage() {
  await requireAdvisoryEnabled("/dashboard");

  const sessions = await getMyAdvisorySessions();

  const now = new Date();
  const upcoming = sessions.filter((s) => new Date(s.endTime) >= now);
  const past = sessions.filter((s) => new Date(s.endTime) < now);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Consultoría Online
        </h1>
        <p className="mt-1 text-text-secondary">
          Sesiones de acompañamiento agendadas para ti o para tu empresa.
        </p>
      </div>

      {sessions.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-sm">
          <Laptop className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 font-medium text-text-primary">
            No tienes sesiones agendadas
          </p>
          <p className="mt-1 text-sm text-text-secondary">
            Cuando tu asesor programe una, aparecerá aquí.
          </p>
        </div>
      ) : (
        <>
          <Section title="Próximas" sessions={upcoming} highlight />
          <Section title="Anteriores" sessions={past} />
        </>
      )}
    </div>
  );
}

function Section({
  title,
  sessions,
  highlight = false,
}: {
  title: string;
  sessions: Awaited<ReturnType<typeof getMyAdvisorySessions>>;
  highlight?: boolean;
}) {
  if (sessions.length === 0) return null;

  return (
    <section>
      <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
        {title}
      </h2>
      <div className="space-y-3">
        {sessions.map((s) => (
          <div
            key={s.id}
            className={`rounded-xl border bg-surface p-5 shadow-sm ${
              highlight ? "border-primary-200" : "border-border"
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-heading font-semibold text-text-primary">
                  {s.title}
                </h3>
                <p className="mt-0.5 text-sm text-text-tertiary">
                  {s.advisorName}
                  {s.companyName ? ` · ${s.companyName}` : ""}
                </p>
                {s.description && (
                  <p className="mt-2 whitespace-pre-line text-sm text-text-secondary">
                    {s.description}
                  </p>
                )}
              </div>

              <div className="text-right text-sm text-text-secondary">
                <p className="flex items-center justify-end gap-1.5 font-medium capitalize text-text-primary">
                  <Calendar className="h-4 w-4" />
                  {formatDate(s.startTime)}
                </p>
                <p className="mt-0.5 flex items-center justify-end gap-1.5">
                  <Clock className="h-4 w-4" />
                  {formatTime(s.startTime)} – {formatTime(s.endTime)}
                </p>
                <p className="mt-0.5 text-text-tertiary">
                  {typeLabel[s.type] ?? s.type}
                </p>
              </div>
            </div>

            {s.meetingUrl && (
              <a
                href={s.meetingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
              >
                <Video className="h-4 w-4" />
                Entrar a la reunión
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}

            {(s.locationName || s.locationAddress) && (
              <p className="mt-3 flex items-start gap-1.5 text-sm text-text-secondary">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {s.locationName}
                  {s.locationAddress ? ` — ${s.locationAddress}` : ""}
                  {s.locationMapUrl && (
                    <>
                      {" "}
                      <a
                        href={s.locationMapUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-primary-600 hover:text-primary-700"
                      >
                        Ver mapa
                      </a>
                    </>
                  )}
                </span>
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
