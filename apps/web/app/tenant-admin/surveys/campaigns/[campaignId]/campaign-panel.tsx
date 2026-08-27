"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Loader2,
  Send,
  Copy,
  Check,
  Link2,
  Lock,
  Unlock,
  CalendarClock,
  XCircle,
  RefreshCw,
} from "lucide-react";
import {
  cancelCampaign,
  closeCampaign,
  publishCampaignResults,
  resendCampaign,
  sendCampaign,
  setCampaignShareLink,
  unpublishCampaignResults,
  updateCampaign,
} from "@/lib/actions/survey";
import type { CampaignState } from "@/lib/surveys";

interface Recipient {
  id: string;
  email: string;
  name: string | null;
  status: string;
  sentAt: Date | string | null;
  respondedAt: Date | string | null;
  remindersSent: number;
  token: string;
}

const RECIPIENT_LABEL: Record<string, { label: string; className: string }> = {
  PENDING: { label: "Sin enviar", className: "bg-surface-tertiary text-text-tertiary" },
  SENT: { label: "Enviada", className: "bg-sky-50 text-sky-700" },
  RESPONDED: { label: "Respondió", className: "bg-emerald-50 text-emerald-700" },
  EXPIRED: { label: "Vencida", className: "bg-amber-50 text-amber-700" },
  REVOKED: { label: "Revocada", className: "bg-red-50 text-red-700" },
};

function useAction() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const run = (fn: () => Promise<unknown>, ok?: string) => {
    setError(null);
    setNotice(null);
    startTransition(async () => {
      try {
        await fn();
        if (ok) setNotice(ok);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Ocurrió un error");
      }
    });
  };
  return { pending, error, notice, run };
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* el portapapeles puede estar bloqueado; el enlace sigue visible */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
      {copied ? "Copiado" : label}
    </button>
  );
}

/**
 * Acciones del lanzamiento. Todo lo que hay aquí es exclusivo del
 * administrador: enviar, reenviar, prorrogar, cerrar, anular, abrir el enlace
 * compartible y aprobar la publicación del consolidado.
 */
export function CampaignActions({
  campaignId,
  state,
  shareUrl,
  hasShareLink,
  closesOn,
  responses,
}: {
  campaignId: string;
  state: CampaignState;
  shareUrl: string | null;
  hasShareLink: boolean;
  closesOn: string;
  responses: number;
}) {
  const router = useRouter();
  const { pending, error, notice, run } = useAction();
  const [newClosesOn, setNewClosesOn] = useState(closesOn);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const canSend = state === "DRAFT" || state === "SCHEDULED" || state === "OPEN";

  function extend() {
    // La fecha se construye en el navegador para que "30 de septiembre"
    // signifique el final de ese día donde está el administrador.
    const [y, m, d] = newClosesOn.split("-").map(Number);
    const iso = new Date(y!, (m ?? 1) - 1, d ?? 1, 23, 59, 59).toISOString();
    run(async () => {
      await updateCampaign(campaignId, { closesAt: iso });
      router.refresh();
    }, "Fecha actualizada");
  }

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <h2 className="font-heading text-base font-semibold text-text-primary">
        Envío
      </h2>
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button
          disabled={pending || !canSend}
          onClick={() =>
            run(async () => {
              const res = await sendCampaign(campaignId);
              router.refresh();
              return res;
            }, "Invitaciones enviadas")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700 disabled:opacity-50"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {state === "DRAFT" ? "Enviar invitaciones" : "Enviar a los nuevos"}
        </button>

        <button
          disabled={pending || state !== "OPEN"}
          onClick={() =>
            run(async () => {
              await resendCampaign(campaignId);
              router.refresh();
            }, "Reenviado a quienes no han respondido")
          }
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
        >
          <RefreshCw className="h-4 w-4" />
          Reenviar a pendientes
        </button>

        {state === "OPEN" && (
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                await closeCampaign(campaignId);
                router.refresh();
              }, "Lanzamiento cerrado")
            }
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-4 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            <Lock className="h-4 w-4" />
            Cerrar ahora
          </button>
        )}

        {responses === 0 && state !== "CANCELLED" && (
          <button
            disabled={pending}
            onClick={() => {
              if (!confirmCancel) {
                setConfirmCancel(true);
                return;
              }
              run(async () => {
                await cancelCampaign(campaignId);
                router.refresh();
              }, "Lanzamiento anulado");
            }}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              confirmCancel
                ? "bg-red-600 text-white hover:bg-red-700"
                : "border border-border bg-surface text-red-700 hover:bg-red-50"
            }`}
          >
            <XCircle className="h-4 w-4" />
            {confirmCancel ? "Confirmar anulación" : "Anular"}
          </button>
        )}
      </div>

      <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-primary">
            <CalendarClock className="h-4 w-4 text-text-tertiary" />
            Vencimiento
          </label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={newClosesOn}
              onChange={(e) => setNewClosesOn(e.target.value)}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text-primary"
            />
            <button
              disabled={pending || newClosesOn === closesOn}
              onClick={extend}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
          <p className="mt-1.5 text-xs text-text-tertiary">
            Ampliar la fecha de un lanzamiento cerrado lo reabre sin perder las
            respuestas ya recibidas.
          </p>
        </div>

        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-text-primary">
            <Link2 className="h-4 w-4 text-text-tertiary" />
            Enlace compartible
          </label>
          {hasShareLink && shareUrl ? (
            <div className="space-y-2">
              <code className="block truncate rounded-lg bg-surface-secondary px-3 py-2 text-xs text-text-secondary">
                {shareUrl}
              </code>
              <div className="flex items-center gap-2">
                <CopyButton value={shareUrl} label="Copiar" />
                <button
                  disabled={pending}
                  onClick={() =>
                    run(async () => {
                      await setCampaignShareLink(campaignId, false);
                      router.refresh();
                    }, "Enlace desactivado")
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
                >
                  <Lock className="h-3.5 w-3.5" />
                  Desactivar
                </button>
              </div>
            </div>
          ) : (
            <>
              <button
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    await setCampaignShareLink(campaignId, true);
                    router.refresh();
                  }, "Enlace activado")
                }
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
              >
                <Unlock className="h-4 w-4" />
                Activar enlace abierto
              </button>
              <p className="mt-1.5 text-xs text-text-tertiary">
                Para asistentes que no son usuarios de la plataforma. Se
                identifican por correo y sólo pueden responder una vez.
              </p>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/** Tabla de destinatarios con su estado y su enlace personal. */
export function RecipientsTable({
  recipients,
  answerBase,
  campaignId,
  canResend,
}: {
  recipients: Recipient[];
  answerBase: string;
  campaignId: string;
  canResend: boolean;
}) {
  const router = useRouter();
  const { pending, error, run } = useAction();

  return (
    <section className="rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-6 py-4">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Destinatarios ({recipients.length})
        </h2>
        <p className="text-xs text-text-tertiary">
          Cada enlace es personal y sólo sirve para responder este lanzamiento.
        </p>
      </div>
      {error && (
        <div className="border-b border-red-200 bg-red-50 px-6 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {recipients.length === 0 ? (
        <p className="px-6 py-8 text-center text-sm text-text-tertiary">
          Todavía no hay destinatarios.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {recipients.map((r) => {
            const badge = RECIPIENT_LABEL[r.status] ?? RECIPIENT_LABEL.PENDING!;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-3 px-6 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {r.name ?? r.email}
                  </p>
                  <p className="truncate text-xs text-text-tertiary">
                    {r.email}
                    {r.remindersSent > 0 && ` · ${r.remindersSent} recordatorio${r.remindersSent !== 1 ? "s" : ""}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span
                    className={`rounded-pill px-2 py-0.5 text-xs font-medium ${badge.className}`}
                  >
                    {badge.label}
                  </span>
                  {r.status !== "RESPONDED" && r.status !== "REVOKED" && (
                    <CopyButton value={`${answerBase}/${r.token}`} label="Enlace" />
                  )}
                  {canResend && (r.status === "PENDING" || r.status === "SENT") && (
                    <button
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          await resendCampaign(campaignId, [r.id]);
                          router.refresh();
                        })
                      }
                      className="rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
                    >
                      Reenviar
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/**
 * Aprobación de la publicación del consolidado. Mientras esto no se use, el
 * resultado sólo lo ve el administrador.
 */
export function PublishPanel({
  campaignId,
  publishedAt,
  audience,
  note,
  resultsShareUrl,
  responses,
}: {
  campaignId: string;
  publishedAt: Date | string | null;
  audience: string;
  note: string | null;
  resultsShareUrl: string | null;
  responses: number;
}) {
  const router = useRouter();
  const { pending, error, notice, run } = useAction();
  const [target, setTarget] = useState<"LEADER" | "PARTICIPANTS">(
    audience === "PARTICIPANTS" ? "PARTICIPANTS" : "LEADER",
  );
  const [message, setMessage] = useState(note ?? "");
  const [shareLink, setShareLink] = useState(Boolean(resultsShareUrl));
  const [notify, setNotify] = useState(true);

  return (
    <section className="space-y-4 rounded-xl border border-border bg-surface p-6">
      <div>
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Publicación de resultados
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">
          Las respuestas llegan primero aquí. El cliente no ve un solo número
          hasta que apruebes la publicación, y nunca ve respuestas individuales.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-700">
          {notice}
        </div>
      )}

      {publishedAt && (
        <div className="rounded-lg border border-primary-200 bg-primary-50 px-4 py-3 text-sm text-primary-800">
          Publicado el{" "}
          {new Date(publishedAt).toLocaleDateString("es-MX", {
            day: "numeric",
            month: "long",
            year: "numeric",
          })}{" "}
          para {audience === "PARTICIPANTS" ? "líder y participantes" : "el líder"}.
          {resultsShareUrl && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <code className="truncate rounded bg-white px-2 py-1 text-xs">
                {resultsShareUrl}
              </code>
              <CopyButton value={resultsShareUrl} label="Copiar enlace" />
            </div>
          )}
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Visible para
          </label>
          <select
            value={target}
            onChange={(e) => setTarget(e.target.value as "LEADER" | "PARTICIPANTS")}
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          >
            <option value="LEADER">Sólo el líder de la empresa</option>
            <option value="PARTICIPANTS">Líder y participantes</option>
          </select>
        </div>
        <div className="flex flex-col justify-end gap-2">
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={shareLink}
              onChange={(e) => setShareLink(e.target.checked)}
              className="h-4 w-4"
            />
            Generar enlace de solo lectura
          </label>
          <label className="flex items-center gap-2 text-sm text-text-secondary">
            <input
              type="checkbox"
              checked={notify}
              onChange={(e) => setNotify(e.target.checked)}
              className="h-4 w-4"
            />
            Avisar por correo
          </label>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-medium text-text-primary">
            Nota para el cliente (opcional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={2}
            placeholder="Contexto o conclusiones que acompañan al consolidado."
            className="w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        <button
          disabled={pending || responses === 0}
          onClick={() =>
            run(async () => {
              await publishCampaignResults(campaignId, {
                audience: target,
                note: message || null,
                shareLink,
                notify,
              });
              router.refresh();
            }, "Resultados publicados")
          }
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          {pending && <Loader2 className="h-4 w-4 animate-spin" />}
          {publishedAt ? "Actualizar publicación" : "Publicar resultados"}
        </button>
        {publishedAt && (
          <button
            disabled={pending}
            onClick={() =>
              run(async () => {
                await unpublishCampaignResults(campaignId);
                router.refresh();
              }, "Publicación retirada")
            }
            className="rounded-lg border border-border bg-surface px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-surface-secondary disabled:opacity-50"
          >
            Retirar publicación
          </button>
        )}
        {responses === 0 && (
          <span className="text-xs text-text-tertiary">
            Todavía no hay respuestas que publicar.
          </span>
        )}
      </div>
    </section>
  );
}
