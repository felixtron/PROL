import { getCurrentUser } from "@/lib/auth";
import { updateProfile } from "@/lib/actions/settings";
import { getConnectAccountStatus } from "@/lib/actions/payment";
import { ProfessorSettingsForm } from "./settings-form";
import { ProfessorSignOutButton } from "./sign-out-button";
import { StripeConnectSection } from "./stripe-connect-section";

export default async function ProfessorSettingsPage() {
  const user = await getCurrentUser();
  const stripeStatus = await getConnectAccountStatus();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Configuracion
        </h1>
        <p className="mt-1 text-text-secondary">
          Administra tu perfil y preferencias de cuenta.
        </p>
      </div>

      {/* Personal Information */}
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Informacion Personal
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">
          Actualiza tu informacion de perfil.
        </p>

        <form action={updateProfile} className="mt-6 max-w-md space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-text-primary"
            >
              Nombre
            </label>
            <input
              type="text"
              id="name"
              name="name"
              defaultValue={user?.name ?? ""}
              required
              minLength={2}
              className="mt-1.5 block w-full rounded-lg border border-border bg-surface px-3.5 py-2.5 text-sm text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20"
              placeholder="Tu nombre completo"
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-text-primary"
            >
              Correo electronico
            </label>
            <input
              type="email"
              id="email"
              value={user?.email ?? ""}
              readOnly
              className="mt-1.5 block w-full rounded-lg border border-border bg-surface-secondary px-3.5 py-2.5 text-sm text-text-tertiary shadow-sm"
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              Para cambiar tu correo electronico, contacta al soporte. Se
              requiere verificacion.
            </p>
          </div>

          {/* Save Button */}
          <ProfessorSettingsForm />
        </form>
      </div>

      {/* Stripe Connect */}
      <StripeConnectSection status={stripeStatus} />

      {/* Session Section */}
      <div className="rounded-lg border border-border bg-surface p-5 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Sesion
        </h2>
        <p className="mt-1 text-sm text-text-tertiary">
          Gestiona tu sesion activa.
        </p>

        <div className="mt-6">
          <ProfessorSignOutButton />
        </div>
      </div>
    </div>
  );
}
