import { getResend } from "./client";
import {
  buildMessage,
  postmarkSend,
  postmarkSendBatch,
  postmarkToken,
} from "./postmark";

/**
 * Proveedor activo. Se decide una vez por proceso, igual que el backend de
 * almacenamiento: describen el mismo entorno y no pueden discrepar a media
 * vida del contenedor.
 *
 * Sin `EMAIL_PROVIDER` se infiere de las credenciales presentes, de forma que
 * una instalación que hoy sólo tiene Resend siga exactamente igual: esta
 * imagen se despliega a las dos instancias y ninguna puede cambiar de
 * proveedor por el hecho de actualizar.
 */
function provider(): "postmark" | "resend" | "none" {
  const explicit = (process.env.EMAIL_PROVIDER || "").trim().toLowerCase();
  if (explicit === "postmark") return "postmark";
  if (explicit === "resend") return "resend";
  if (postmarkToken()) return "postmark";
  if (process.env.RESEND_API_KEY) return "resend";
  return "none";
}

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
  // `EMAIL_FROM_ADDRESS` es la dirección completa y es lo que debe usar una
  // instalación dedicada: su buzón no tiene por qué ser `noreply@` ni vivir en
  // el dominio de Resend. El derivado se conserva como compatibilidad con la
  // configuración anterior, que no tiene la variable nueva.
  const address =
    process.env.EMAIL_FROM_ADDRESS ||
    `noreply@${process.env.RESEND_DOMAIN || "prol.prosuite.pro"}`;
  return `${quoteDisplayName(name)} <${address}>`;
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
  // Sin proveedor configurado (despliegue nuevo, desarrollo local) no se lanza:
  // se omite el envío y se registra, para que la acción de servidor que llamó
  // pueda seguir. Un correo que no sale no debe tumbar una inscripción.
  const p = provider();
  if (p === "none") {
    logRecord("warn", "Sin proveedor de correo configurado; envío omitido", {
      to,
      subject,
    });
    return null;
  }

  const fromAddress = from ?? defaultFrom();

  if (p === "postmark") {
    try {
      const r = await postmarkSend(
        buildMessage({
          From: fromAddress,
          To: to,
          Subject: subject,
          HtmlBody: html,
          ReplyTo: replyTo ?? defaultReplyTo(),
        }),
      );
      return { id: r.MessageID ?? null };
    } catch (err) {
      logRecord("error", "Postmark rechazó el envío", {
        to,
        subject,
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  }

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

  const p = provider();
  if (p === "none") {
    logRecord("warn", "Sin proveedor de correo configurado; envío masivo omitido", {
      count: recipients.length,
    });
    return 0;
  }

  const fromAddress = from ?? defaultFrom();

  if (p === "postmark") {
    try {
      const results = await postmarkSendBatch(
        recipients.map((r) =>
          buildMessage({
            From: fromAddress,
            To: r.to,
            Subject: r.subject,
            HtmlBody: r.html,
            ReplyTo: defaultReplyTo(),
          }),
        ),
      );
      // Postmark responde con un ErrorCode POR DESTINATARIO, así que aquí se
      // sabe QUIÉN no recibió el correo y por qué. Es la razón de fondo para
      // preferirlo en los barridos de cumplimiento: hasta ahora un rebote se
      // contabilizaba como entrega y nadie se enteraba de que a esa persona no
      // le llegó su recordatorio.
      const failed = results.filter((r) => r.ErrorCode !== 0);
      for (const f of failed) {
        logRecord("error", "Postmark rechazó un destinatario", {
          to: f.To,
          error: `${f.ErrorCode} ${f.Message}`,
        });
      }
      return results.length - failed.length;
    } catch (err) {
      logRecord("error", "Error inesperado en envío masivo (Postmark)", {
        count: recipients.length,
        error: err instanceof Error ? err.message : String(err),
      });
      return 0;
    }
  }

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
