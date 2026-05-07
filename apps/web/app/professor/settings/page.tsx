import { getCurrentUser } from "@/lib/auth";
import { ProfileForm } from "@/components/profile-form";
import { ProfessorSignOutButton } from "./sign-out-button";

export default async function ProfessorSettingsPage() {
  const user = await getCurrentUser();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Configuración
        </h1>
        <p className="mt-1 text-text-secondary">
          Administra tu perfil y preferencias.
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
          Sesión
        </h2>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm text-text-secondary">
            Cierra tu sesión en este dispositivo.
          </p>
          <div className="mt-3">
            <ProfessorSignOutButton />
          </div>
        </div>
      </section>
    </div>
  );
}
