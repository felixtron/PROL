import { getCurrentUser } from "@/lib/auth";
import { updateProfile } from "@/lib/actions/settings";
import { SettingsForm } from "./settings-form";
import { SignOutButton } from "./sign-out-button";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default async function SettingsPage() {
  const user = await getCurrentUser();
  const displayName = user?.name ?? "Estudiante";
  const initials = getInitials(displayName);

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 md:mb-6">
        <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
          Mi Cuenta
        </h1>
        <p className="mt-0.5 text-sm text-text-secondary">
          Administra tu perfil y preferencias.
        </p>
      </div>

      {/* Profile avatar (mobile-only hero) */}
      <div className="mb-5 flex items-center gap-4 rounded-xl bg-surface p-4 shadow-sm md:hidden">
        {user?.avatar ? (
          <img
            src={user.avatar}
            alt={displayName}
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-100 text-lg font-bold text-primary-700">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="truncate text-base font-semibold text-text-primary">
            {displayName}
          </p>
          <p className="truncate text-sm text-text-tertiary">
            {user?.email ?? ""}
          </p>
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {/* Personal Information */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
          <h2 className="font-heading text-base font-semibold text-text-primary md:text-lg">
            Informacion Personal
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary md:mt-1 md:text-sm">
            Actualiza tu informacion de perfil.
          </p>

          <form action={updateProfile} className="mt-4 space-y-4 md:mt-6 md:max-w-md">
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
                className="mt-1.5 block w-full rounded-xl border border-border bg-surface px-3.5 py-3 text-sm text-text-primary shadow-sm outline-none transition-colors placeholder:text-text-tertiary focus:border-primary-500 focus:ring-2 focus:ring-primary-500/20 md:rounded-lg md:py-2.5"
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
                className="mt-1.5 block w-full rounded-xl border border-border bg-surface-secondary px-3.5 py-3 text-sm text-text-tertiary shadow-sm md:rounded-lg md:py-2.5"
              />
              <p className="mt-1.5 text-xs text-text-tertiary">
                Para cambiar tu correo, contacta al soporte.
              </p>
            </div>

            {/* Save Button */}
            <SettingsForm />
          </form>
        </div>

        {/* Account Section */}
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm md:p-5">
          <h2 className="font-heading text-base font-semibold text-text-primary md:text-lg">
            Cuenta
          </h2>
          <p className="mt-0.5 text-xs text-text-tertiary md:mt-1 md:text-sm">
            Gestiona tu sesion.
          </p>

          <div className="mt-4 md:mt-6">
            <SignOutButton />
          </div>
        </div>
      </div>
    </div>
  );
}
