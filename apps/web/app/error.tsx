"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, LogIn, RotateCw } from "lucide-react";

/**
 * Frontera de error de toda la aplicación.
 *
 * Sin esto, cualquier throw durante el render de un Server Component sube sin
 * que nadie lo recoja y Next pinta el body vacío: el usuario se queda mirando
 * una página en blanco, sin saber qué ha pasado ni cómo salir. Es exactamente
 * lo que ocurría al caducar la sesión — las consultas del panel llaman a
 * `requireUser()`, que lanza `UnauthenticatedError`, y no había nada debajo.
 *
 * No se intenta adivinar SI el fallo fue de sesión. En producción Next
 * reemplaza el `message` de los errores de servidor por un texto genérico y
 * sólo conserva el `digest`, así que mirar el mensaje —como hace la frontera
 * de `evaluations/[id]`— no distingue nada: esa rama está muerta en el
 * servidor. En lugar de afirmar una causa que no podemos comprobar, se ofrecen
 * las dos salidas y que elija quien sí sabe qué estaba haciendo.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // El digest es lo único que sobrevive a producción, y es la única forma de
    // atar lo que reporta el usuario con la traza real del contenedor.
    console.error("[app] render failed", error.message, error.digest);
  }, [error]);

  return (
    <div className="mx-auto max-w-xl px-4 py-12">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <AlertTriangle className="mx-auto h-10 w-10 text-amber-600" />
        <h1 className="mt-4 font-heading text-lg font-semibold text-amber-900">
          No pudimos cargar esta página
        </h1>
        <p className="mt-1 text-sm text-amber-800">
          Puede ser algo puntual: vuelve a intentarlo. Si llevabas un rato con
          la pestaña abierta, lo más probable es que tu sesión haya caducado.
        </p>
        {error.digest ? (
          <p className="mt-2 text-[11px] text-amber-700/80">
            Código: {error.digest}
          </p>
        ) : null}

        <div className="mt-5 flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <RotateCw className="h-4 w-4" />
            Reintentar
          </button>
          <Link
            href="/sign-in"
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
          >
            <LogIn className="h-4 w-4" />
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
