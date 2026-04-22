import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { SignOutButton } from "./sign-out-button";

export default async function SettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Mi Cuenta
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          Administra tu perfil y preferencias.
        </p>
      </div>

      <div className="space-y-5">
        <section>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Perfil
          </h2>
          <ProfileForm
            initialName={user?.name ?? ""}
            initialAvatar={user?.avatar ?? null}
            email={user?.email ?? ""}
          />
        </section>

        <section>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Sesion
          </h2>
          <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
            <p className="text-sm text-text-secondary">
              Cierra tu sesion en este dispositivo.
            </p>
            <div className="mt-3">
              <SignOutButton />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
