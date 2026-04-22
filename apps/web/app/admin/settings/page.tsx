import { Settings } from "lucide-react";
import { AdminSignOutButton } from "./sign-out-button";

export default function AdminSettingsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Configuracion
        </h1>
        <p className="mt-1 text-text-secondary">
          Configuracion general de la plataforma.
        </p>
      </div>

      {/* Placeholder */}
      <div className="rounded-xl border border-border bg-surface p-12 text-center shadow-sm">
        <Settings className="mx-auto h-12 w-12 text-text-tertiary" />
        <h2 className="mt-4 font-heading text-lg font-semibold text-text-primary">
          Configuracion de plataforma
        </h2>
        <p className="mt-2 text-sm text-text-secondary">Proximamente</p>
        <p className="mt-1 text-xs text-text-tertiary">
          Aqui podras configurar parametros globales de la plataforma, como
          tarifas predeterminadas, integraciones y mas.
        </p>
      </div>

      {/* Account section */}
      <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
        <h2 className="font-heading text-lg font-semibold text-text-primary">
          Cuenta
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          Cierra tu sesion en este dispositivo.
        </p>
        <div className="mt-4">
          <AdminSignOutButton />
        </div>
      </div>
    </div>
  );
}
