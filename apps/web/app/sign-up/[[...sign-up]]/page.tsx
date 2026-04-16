"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function SignUpPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Error al crear la cuenta");
      return;
    }

    // Check for callback URL from middleware redirect
    const params = new URLSearchParams(window.location.search);
    const callbackUrl = params.get("callbackUrl");

    if (callbackUrl) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    // New users always go to dashboard first; professors who haven't
    // completed onboarding will be redirected from there.
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="font-heading text-3xl font-bold text-primary-600">
            PROL
          </h1>
          <p className="mt-2 text-text-secondary">
            Crea tu cuenta gratuita
          </p>
        </div>

        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Nombre completo
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Tu nombre"
              />
            </div>

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

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Contraseña
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Mínimo 8 caracteres"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            ¿Ya tienes cuenta?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-primary-600 hover:text-primary-700"
            >
              Iniciar sesión
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
