import { Resend } from "resend";

const globalForResend = globalThis as unknown as { resend?: Resend };

export function getResend(): Resend {
  if (globalForResend.resend) return globalForResend.resend;

  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY no está configurada");
  }

  const instance = new Resend(process.env.RESEND_API_KEY);

  if (process.env.NODE_ENV !== "production") {
    globalForResend.resend = instance;
  }

  return instance;
}

/** @deprecated Use getResend() instead */
export const resend = undefined as unknown as Resend;
