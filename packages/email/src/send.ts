import { getResend } from "./client";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  from?: string;
  replyTo?: string;
}

export async function sendEmail({ to, subject, html, from, replyTo }: SendEmailParams) {
  const fromAddress = from ?? `PROL <noreply@${process.env.RESEND_DOMAIN ?? "prol.prosuite.pro"}>`;

  const { data, error } = await getResend().emails.send({
    from: fromAddress,
    to,
    subject,
    html,
    replyTo,
  });

  if (error) {
    console.error("Failed to send email:", error);
    throw new Error(`Error enviando email: ${error.message}`);
  }

  return data;
}
