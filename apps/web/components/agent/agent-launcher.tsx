"use client";

/**
 * Botón flotante que abre el copiloto.
 *
 * El panel se monta sólo cuando se abre: mientras está cerrado no hay estado,
 * ni listeners, ni peticiones. En una aplicación donde la mayoría de las
 * pantallas no lo necesitan, eso importa más que ahorrarse un montaje.
 */

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { AgentPanel } from "./agent-panel";

export function AgentLauncher({
  surface,
  liftForMobileBar = false,
}: {
  surface: string;
  /** Sube el botón para que no quede debajo de la barra inferior del teléfono. */
  liftForMobileBar?: boolean;
}) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir el asistente"
          className={`fixed right-6 z-30 flex min-h-11 min-w-11 items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-primary-700 ${
            liftForMobileBar
              ? "bottom-[calc(4.5rem+env(safe-area-inset-bottom))] md:bottom-6"
              : "bottom-6"
          }`}
        >
          <Sparkles className="h-4 w-4" />
          <span className="hidden sm:inline">Asistente</span>
        </button>
      )}
      {abierto && (
        <AgentPanel surface={surface} onClose={() => setAbierto(false)} />
      )}
    </>
  );
}
