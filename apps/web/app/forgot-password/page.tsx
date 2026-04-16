"use client";

import { useState } from "react";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await authClient.requestPasswordReset({
      email,
      redirectTo: "/reset-password",
    });

    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Error al enviar el enlace de restablecimiento");
      return;
    }

    setSubmitted(true);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary-600">
            PROL
          </h1>
          <p className="mt-2 text-text-secondary">
            Recupera el acceso a tu cuenta
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          {submitted ? (
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-text-primary">
                Revisa tu correo
              </h2>
              <p className="mb-6 text-sm text-text-secondary">
                Si existe una cuenta con ese email, recibiras un enlace para
                restablecer tu contrasena.
              </p>
              <Link
                href="/sign-in"
                className="text-sm font-medium text-primary-600 hover:text-primary-700"
              >
                Volver a iniciar sesion
              </Link>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="space-y-5">
                {error && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                    {error}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="email"
                    className="mb-1.5 block text-sm font-medium text-text-primary"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                    placeholder="tu@email.com"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
                >
                  {loading ? "Enviando..." : "Enviar enlace de restablecimiento"}
                </button>
              </form>

              <p className="mt-6 text-center text-sm text-text-secondary">
                <Link
                  href="/sign-in"
                  className="font-medium text-primary-600 hover:text-primary-700"
                >
                  Volver a iniciar sesion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
