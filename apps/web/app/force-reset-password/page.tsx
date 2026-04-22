import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ForceResetForm } from "./force-reset-form";

export default async function ForceResetPasswordPage() {
  const user = await getCurrentUser();

  if (!user) redirect("/sign-in");
  if (!user.mustResetPassword) redirect("/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary-100">
            <Lock className="h-7 w-7 text-primary-700" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Cambia tu contrasena
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Por seguridad, debes establecer una contrasena nueva antes de
            continuar.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <ForceResetForm />
        </div>
      </div>
    </div>
  );
}
