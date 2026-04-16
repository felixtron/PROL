"use client";

import { useState } from "react";
import { createTenant } from "@/lib/actions/onboarding";
import { GraduationCap, ArrowRight } from "lucide-react";

export default function OnboardingPage() {
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const formData = new FormData(e.currentTarget);

    try {
      await createTenant(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear la academia");
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary-100">
            <GraduationCap className="h-8 w-8 text-primary-600" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Crea tu Academia
          </h1>
          <p className="mt-2 text-text-secondary">
            Configura tu espacio para empezar a vender cursos en linea.
          </p>
        </div>

        {/* Form */}
        <div className="rounded-lg border border-border bg-surface p-8 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            )}

            {/* Academy Name */}
            <div>
              <label
                htmlFor="name"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Nombre de tu academia
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                maxLength={100}
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="Ej: Academia de Marketing Digital"
              />
              <p className="mt-1.5 text-xs text-text-tertiary">
                Este sera el nombre visible para tus alumnos.
              </p>
            </div>

            {/* Contact Email */}
            <div>
              <label
                htmlFor="contactEmail"
                className="mb-1.5 block text-sm font-medium text-text-primary"
              >
                Correo de contacto
              </label>
              <input
                id="contactEmail"
                name="contactEmail"
                type="email"
                required
                className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
                placeholder="contacto@tuacademia.com"
              />
              <p className="mt-1.5 text-xs text-text-tertiary">
                Se usara para notificaciones y comunicacion con alumnos.
              </p>
            </div>

            {/* Info Box */}
            <div className="rounded-lg bg-primary-50 p-4">
              <h3 className="text-sm font-semibold text-primary-800">
                Tu prueba gratuita de 7 dias incluye:
              </h3>
              <ul className="mt-2 space-y-1 text-sm text-primary-700">
                <li>• Cursos ilimitados</li>
                <li>• Subdominio personalizado (tuacademia.prol.prosuite.pro)</li>
                <li>• Pagos integrados con Stripe</li>
                <li>• Alumnos ilimitados</li>
              </ul>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? (
                "Creando academia..."
              ) : (
                <>
                  Crear Academia
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-4 text-center text-xs text-text-tertiary">
            Sin tarjeta de credito. Cancela cuando quieras.
          </p>
        </div>
      </div>
    </div>
  );
}
