"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface TenantBranding {
  name: string;
  logo: string | null;
  primaryColor: string;
  accentColor: string;
}

export function SignUpForm({ tenant }: { tenant: TenantBranding | null }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pre-fill email from query string (e.g. invitation flow).
  useEffect(() => {
    const e = searchParams?.get("email");
    if (e) setEmail(e);
  }, [searchParams]);

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

    // Restrict callbackUrl to same-origin relative paths to prevent
    // open-redirect abuse.
    const params = new URLSearchParams(window.location.search);
    const callbackUrlRaw = params.get("callbackUrl");
    const callbackUrl =
      callbackUrlRaw &&
      callbackUrlRaw.startsWith("/") &&
      !callbackUrlRaw.startsWith("//") &&
      !callbackUrlRaw.startsWith("/\\")
        ? callbackUrlRaw
        : null;

    if (callbackUrl) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  const styleVars = tenant
    ? ({
        "--brand-primary": tenant.primaryColor,
        "--brand-accent": tenant.accentColor,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      style={styleVars}
      className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-8"
    >
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          {tenant?.logo ? (
            <>
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="mx-auto h-16 w-auto object-contain"
              />
              <p className="mt-3 text-sm text-text-secondary">{tenant.name}</p>
            </>
          ) : tenant ? (
            <>
              <h1
                className="font-heading text-3xl font-bold"
                style={{ color: "var(--brand-primary)" }}
              >
                {tenant.name}
              </h1>
              <p className="mt-2 text-text-secondary">Crea tu cuenta</p>
            </>
          ) : (
            <>
              <h1 className="font-heading text-3xl font-bold text-primary-600">
                PROL
              </h1>
              <p className="mt-2 text-text-secondary">Crea tu cuenta gratuita</p>
            </>
          )}
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
                autoComplete="name"
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2"
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
                autoComplete="email"
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2"
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
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 pr-11 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2"
                  placeholder="Mínimo 8 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={
                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                  }
                  aria-pressed={showPassword}
                  tabIndex={-1}
                  className="absolute inset-y-0 right-0 flex items-center justify-center px-3 text-text-tertiary transition-colors hover:text-text-primary"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 hover:opacity-90 disabled:opacity-50"
              style={
                tenant
                  ? { backgroundColor: "var(--brand-primary)" }
                  : undefined
              }
            >
              {loading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            ¿Ya tienes cuenta?{" "}
            <Link
              href={`/sign-in${typeof window !== "undefined" ? window.location.search : ""}`}
              className="font-medium text-primary-600 hover:text-primary-700"
              style={tenant ? { color: "var(--brand-primary)" } : undefined}
            >
              Iniciar sesión
            </Link>
          </p>
        </div>

        {tenant ? (
          <p className="mt-6 text-center text-[11px] text-text-tertiary">
            Powered by{" "}
            <Link href="https://prol.prosuite.pro" className="hover:underline">
              PROL
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
