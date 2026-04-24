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
    console.warn(
      `[email] RESEND_API_KEY no configurada; se omitió envío a ${to} ("${subject}")`,
    );
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
      console.error("[email] Failed to send email:", error);
      return null;
    }

    return data;
  } catch (err) {
    console.error("[email] Unexpected error sending email:", err);
    return null;
  }
}
