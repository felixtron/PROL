"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { authClient } from "@/lib/auth-client";

interface TenantBranding {
  name: string;
  logo: string | null;
  primaryColor: string;
  accentColor: string;
}

export function SignInForm({ tenant }: { tenant: TenantBranding | null }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    setLoading(false);

    if (authError) {
      setError(authError.message ?? "Error al iniciar sesión");
      return;
    }

    // Check for callback URL from middleware redirect. Restrict to
    // same-origin relative paths to prevent open-redirect abuse via
    // /sign-in?callbackUrl=https://evil.example/.
    const params = new URLSearchParams(window.location.search);
    const callbackUrlRaw = params.get("callbackUrl");
    const callbackUrl =
      callbackUrlRaw &&
      callbackUrlRaw.startsWith("/") &&
      !callbackUrlRaw.startsWith("//")
        ? callbackUrlRaw
        : null;

    if (callbackUrl) {
      router.push(callbackUrl);
      router.refresh();
      return;
    }

    // Redirect based on role, reset flag and onboarding status
    try {
      const res = await fetch("/api/auth/check-role");
      const data = await res.json();

      if (data.mustResetPassword) {
        router.push("/force-reset-password");
      } else if (data.role === "PROFESSOR" && !data.onboardingCompleted) {
        router.push("/onboarding");
      } else if (data.role === "ADMIN") {
        router.push("/tenant-admin");
      } else if (data.role === "SUPER_ADMIN") {
        router.push("/admin");
      } else if (data.role === "PROFESSOR") {
        router.push("/professor");
      } else {
        router.push("/dashboard");
      }
    } catch {
      router.push("/dashboard");
    }
    router.refresh();
  }

  // Apply tenant colors as CSS custom properties scoped to this form
  // so the primary button + focus rings match the academy branding
  // without leaking into other pages.
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
            // Tenant-branded header: logo on top, name below as a quiet caption.
            <>
              <img
                src={tenant.logo}
                alt={tenant.name}
                className="mx-auto h-16 w-auto object-contain"
              />
              <p className="mt-3 text-sm text-text-secondary">{tenant.name}</p>
            </>
          ) : tenant ? (
            // Tenant without logo: show the name in its primary color.
            <>
              <h1
                className="font-heading text-3xl font-bold"
                style={{ color: "var(--brand-primary)" }}
              >
                {tenant.name}
              </h1>
              <p className="mt-2 text-text-secondary">Inicia sesión</p>
            </>
          ) : (
            // No tenant (apex domain): default PROL branding.
            <>
              <h1 className="font-heading text-3xl font-bold text-primary-600">
                PROL
              </h1>
              <p className="mt-2 text-text-secondary">
                Inicia sesión en tu cuenta
              </p>
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
                style={
                  tenant
                    ? ({
                        outlineColor: "var(--brand-primary)",
                        "--tw-ring-color":
                          "color-mix(in srgb, var(--brand-primary) 20%, transparent)",
                      } as React.CSSProperties)
                    : undefined
                }
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-text-primary"
                >
                  Contraseña
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium hover:underline"
                  style={
                    tenant
                      ? { color: "var(--brand-primary)" }
                      : undefined
                  }
                >
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>

              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 pr-11 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2"
                  placeholder="••••••••"
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
              className="w-full rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: tenant
                  ? "var(--brand-primary)"
                  : undefined,
              }}
            >
              {loading ? "Iniciando sesión..." : "Iniciar sesión"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-text-secondary">
            ¿No tienes cuenta?{" "}
            <Link
              href="/sign-up"
              className="font-medium hover:underline"
              style={
                tenant ? { color: "var(--brand-primary)" } : undefined
              }
            >
              Crear cuenta
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
