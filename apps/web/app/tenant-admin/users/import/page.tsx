import Link from "next/link";
import { ArrowLeft, Download } from "lucide-react";
import { ImportForm } from "./import-form";

export default function ImportUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/tenant-admin/users"
          className="inline-flex items-center gap-1 text-sm text-text-secondary hover:text-text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Usuarios
        </Link>
        <h1 className="mt-2 font-heading text-2xl font-bold text-text-primary">
          Importar usuarios desde CSV
        </h1>
        <p className="mt-1 text-text-secondary">
          Carga masiva hasta 500 usuarios por archivo. Cada usuario recibira un
          email con contrasena temporal.
        </p>
      </div>

      {/* Format guide */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="font-heading text-base font-semibold text-text-primary">
          Formato esperado
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          El CSV debe tener encabezados en la primera fila. Las columnas son:
        </p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-border">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-surface-secondary">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-text-primary">
                  email
                </th>
                <th className="px-3 py-2 text-left font-medium text-text-primary">
                  name
                </th>
                <th className="px-3 py-2 text-left font-medium text-text-primary">
                  role
                </th>
                <th className="px-3 py-2 text-left font-medium text-text-primary">
                  companyName
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr>
                <td className="px-3 py-2 text-text-tertiary">Requerido</td>
                <td className="px-3 py-2 text-text-tertiary">Requerido</td>
                <td className="px-3 py-2 text-text-tertiary">
                  STUDENT · PROFESSOR (default: STUDENT)
                </td>
                <td className="px-3 py-2 text-text-tertiary">
                  Opcional — si no existe, se crea
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <a
          href="/sample-users.csv"
          download
          className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700"
        >
          <Download className="h-4 w-4" />
          Descargar plantilla CSV
        </a>
      </div>

      <ImportForm />
    </div>
  );
}
