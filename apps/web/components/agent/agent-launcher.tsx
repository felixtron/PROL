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

export function AgentLauncher({ surface }: { surface: string }) {
  const [abierto, setAbierto] = useState(false);

  return (
    <>
      {!abierto && (
        <button
          type="button"
          onClick={() => setAbierto(true)}
          aria-label="Abrir el asistente"
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-primary-600 px-4 py-3 text-sm font-medium text-white shadow-lg transition hover:bg-primary-700"
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
