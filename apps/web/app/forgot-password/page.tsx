import { ForgotPasswordForm } from "./forgot-password-form";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return (
    <ForgotPasswordForm
      turnstileSiteKey={process.env.TURNSTILE_SITE_KEY ?? null}
    />
  );
}
