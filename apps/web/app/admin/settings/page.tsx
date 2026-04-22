import { Settings } from "lucide-react";
import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { AdminSignOutButton } from "./sign-out-button";

export default async function AdminSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Configuracion
        </h1>
        <p className="mt-1 text-text-secondary">
          Administra tu perfil y la plataforma.
        </p>
      </div>

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
          Plataforma
        </h2>
        <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-sm">
          <Settings className="mx-auto h-10 w-10 text-text-tertiary" />
          <p className="mt-3 text-sm text-text-secondary">
            Configuracion global de la plataforma proximamente
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Tarifas, integraciónes globales y feature flags.
          </p>
        </div>
      </section>

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Sesión
        </h2>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm text-text-secondary">
            Cierra tu sesión en este dispositivo.
          </p>
          <div className="mt-3">
            <AdminSignOutButton />
          </div>
        </div>
      </section>
    </div>
  );
}
