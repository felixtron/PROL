import { getResend } from "./client";

/**
 * Remitente y buzón de respuesta de esta instancia.
 *
 * Una misma imagen sirve a varias instalaciones, así que ni el nombre ni el
 * dominio pueden vivir en un literal: los 19 puntos de envío de la aplicación
 * llaman aquí sin pasar `from`, y hasta ahora todos firmaban "PROL" pasara lo
 * que pasara. El valor por defecto sigue siendo el de PROL para que desplegar
 * sin configurar nada no cambie ni un correo.
 *
 * `EMAIL_REPLY_TO` no tiene default a propósito: sin él, las respuestas van a
 * `noreply@` y se pierden — que es el comportamiento de hoy. Configurarlo es
 * lo que las hace aterrizar en un buzón real.
 */
function defaultFrom(): string {
  const name = process.env.EMAIL_FROM_NAME || "PROL";
  const domain = process.env.RESEND_DOMAIN || "prol.prosuite.pro";
  return `${quoteDisplayName(name)} <noreply@${domain}>`;
}

/**
 * Entrecomilla el nombre visible del remitente según RFC 5322.
 *
 * Sin esto, una razón social con coma —"Ibiza Experts, S.A." es un nombre
 * perfectamente normal— produce una cabecera `From` inválida que Resend
 * rechaza. Y como `sendEmail` no lanza, el fallo sería invisible: TODO el
 * correo de la instancia dejaría de salir dejando sólo una línea de log.
 */
function quoteDisplayName(name: string): string {
  return `"${name.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function defaultReplyTo(): string | undefined {
  return process.env.EMAIL_REPLY_TO || undefined;
}

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailParams) {
  // When RESEND_API_KEY is not configured (e.g. fresh deploy, local dev),
  // skip sending instead of throwing so the caller's server action can
  // continue. The omission is logged so the operator notices.
  if (!process.env.RESEND_API_KEY) {
    logRecord("warn", "RESEND_API_KEY no configurada; envío omitido", {
      to,
      subject,
    });
    return null;
  }

  const fromAddress = from ?? defaultFrom();

  try {
    const { data, error } = await getResend().emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      replyTo: replyTo ?? defaultReplyTo(),
    });

    if (error) {
      logRecord("error", "Failed to send email", {
        to,
        subject,
        error: error.message ?? String(error),
      });
      return null;
    }

    return data;
  } catch (err) {
    logRecord("error", "Unexpected error sending email", {
      to,
      subject,
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

interface BulkRecipient {
  to: string;
  subject: string;
  html: string;
}

/**
 * Envío masivo del MISMO tipo de correo a muchos destinatarios.
 *
 * Usa el endpoint de lotes de Resend (hasta 100 por llamada) en vez de una
 * petición por persona. Con una empresa de 40+ miembros, mandarlos uno a uno
 * en paralelo choca contra el límite de tasa y varios se pierden en silencio.
 *
 * Devuelve cuántos se aceptaron. Nunca lanza: el llamador decide si el fallo
 * de correo debe afectar su flujo (normalmente no).
 */
export async function sendBulkEmail(
  recipients: BulkRecipient[],
  from?: string,
): Promise<number> {
  if (recipients.length === 0) return 0;

  if (!process.env.RESEND_API_KEY) {
    logRecord("warn", "RESEND_API_KEY no configurada; envío masivo omitido", {
      count: recipients.length,
    });
    return 0;
  }

  const fromAddress = from ?? defaultFrom();

  const BATCH_LIMIT = 100;
  let accepted = 0;

  for (let i = 0; i < recipients.length; i += BATCH_LIMIT) {
    const chunk = recipients.slice(i, i + BATCH_LIMIT);
    try {
      const { error } = await getResend().batch.send(
        chunk.map((r) => ({
          from: fromAddress,
          to: r.to,
          subject: r.subject,
          html: r.html,
          replyTo: defaultReplyTo(),
        })),
      );
      if (error) {
        logRecord("error", "Falló un lote de correos", {
          count: chunk.length,
          error: error.message ?? String(error),
        });
        continue;
      }
      accepted += chunk.length;
    } catch (err) {
      logRecord("error", "Error inesperado en envío masivo", {
        count: chunk.length,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return accepted;
}

/** Local structured log helper. We don't pull `@/lib/logger` here because
 * this package is consumed by both the web app and edge code paths and we
 * keep it dependency-free. */
function logRecord(
  level: "warn" | "error",
  msg: string,
  fields: Record<string, unknown>,
) {
  const record = { ts: new Date().toISOString(), level, component: "email", msg, ...fields };
  if (process.env.NODE_ENV === "production") {
    (level === "error" ? console.error : console.warn)(JSON.stringify(record));
  } else {
    (level === "error" ? console.error : console.warn)(
      `[${level.toUpperCase()}] [email] ${msg}`,
      fields,
    );
  }
}
