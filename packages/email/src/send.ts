import { getResend } from "./client";

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

  const fromAddress = from ?? `PROL <noreply@${process.env.RESEND_DOMAIN ?? "prol.prosuite.pro"}>`;

  try {
    const { data, error } = await getResend().emails.send({
      from: fromAddress,
      to,
      subject,
      html,
      replyTo,
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

  const fromAddress =
    from ?? `PROL <noreply@${process.env.RESEND_DOMAIN ?? "prol.prosuite.pro"}>`;

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
