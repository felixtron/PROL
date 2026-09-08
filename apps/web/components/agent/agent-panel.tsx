"use client";

/**
 * Copiloto de Ibiza Online.
 *
 * Panel lateral por encima de todo, expandible a pantalla completa. Sólo lo
 * montan los layouts de profesor y administrador, y sólo si el tenant tiene la
 * IA activada — el agente no existe para el resto de roles.
 *
 * Dos cosas de la UI no son estética:
 *
 *   1. Las llamadas a herramienta se ven mientras ocurren. Que la persona lea
 *      "consultando evidencias pendientes" es lo que le permite juzgar de
 *      dónde salió la respuesta.
 *   2. Una acción propuesta se pinta como tarjeta con botones, nunca como algo
 *      ya hecho. El agente no escribe: propone, y hasta que alguien confirme
 *      no ha pasado nada.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  FileText,
  History,
  Loader2,
  Maximize2,
  Minimize2,
  Paperclip,
  Plus,
  SendHorizonal,
  ShieldAlert,
  Trash2,
  X,
} from "lucide-react";
import { formatTimeAgo } from "@/lib/format-time-ago";
import {
  MAX_FILES,
  MAX_FILE_BYTES,
  MIME_ACEPTADOS,
  EJEMPLOS,
  type Adjunto,
  type Mensaje,
  type Propuesta,
  type ResumenConversacion,
  fileToAdjunto,
} from "./agent-shared";

interface AgentPanelProps {
  surface: string;
  onClose: () => void;
}

export function AgentPanel({ surface, onClose }: AgentPanelProps) {
  const [expandido, setExpandido] = useState(false);
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [entrada, setEntrada] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);
  const [enviando, setEnviando] = useState(false);
  const [actividad, setActividad] = useState<string | null>(null);
  const [conversacionId, setConversacionId] = useState<string | null>(null);
  const [historialAbierto, setHistorialAbierto] = useState(false);
  const [conversaciones, setConversaciones] = useState<ResumenConversacion[]>([]);
  const [error, setError] = useState<string | null>(null);

  const finRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, actividad]);

  // Cerrar con Escape: sale de pantalla completa antes que del panel, para no
  // perder la conversación de un tecleo distraído.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (expandido) setExpandido(false);
      else if (historialAbierto) setHistorialAbierto(false);
      else onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [expandido, historialAbierto, onClose]);

  // Si el panel se cierra a mitad de un turno, se aborta: el servidor deja de
  // gastar en cuanto ve la conexión caída.
  useEffect(() => () => abortRef.current?.abort(), []);

  const cargarConversaciones = useCallback(async () => {
    const res = await fetch("/api/agent/conversations");
    if (res.ok) setConversaciones((await res.json()).conversaciones);
  }, []);

  async function abrirHistorial() {
    setHistorialAbierto((abierto) => !abierto);
    if (!historialAbierto) await cargarConversaciones();
  }

  async function cargarConversacion(id: string) {
    const res = await fetch(`/api/agent/conversations?id=${encodeURIComponent(id)}`);
    if (!res.ok) return;
    const { conversacion } = await res.json();
    setMensajes(
      conversacion.messages.map((m: { rol: string; texto: string }) => ({
        rol: m.rol,
        texto: m.texto,
      })),
    );
    setConversacionId(conversacion.id);
    setHistorialAbierto(false);
    setError(null);
  }

  async function borrarConversacion(id: string, event: React.MouseEvent) {
    event.stopPropagation();
    await fetch(`/api/agent/conversations?id=${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    setConversaciones((prev) => prev.filter((c) => c.id !== id));
    if (conversacionId === id) nuevaConversacion();
  }

  function nuevaConversacion() {
    abortRef.current?.abort();
    setMensajes([]);
    setConversacionId(null);
    setAdjuntos([]);
    setEntrada("");
    setError(null);
    setHistorialAbierto(false);
  }

  async function elegirArchivos(lista: FileList | null) {
    if (!lista) return;
    setError(null);
    const nuevos: Adjunto[] = [];
    for (const file of Array.from(lista).slice(0, MAX_FILES - adjuntos.length)) {
      if (file.size > MAX_FILE_BYTES) {
        setError(`"${file.name}" pasa de 6 MB.`);
        continue;
      }
      nuevos.push(await fileToAdjunto(file));
    }
    setAdjuntos((prev) => [...prev, ...nuevos].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = "";
  }

  async function enviar(texto?: string) {
    const mensaje = (texto ?? entrada).trim();
    if (!mensaje || enviando) return;

    const conAdjuntos = adjuntos;
    setMensajes((prev) => [
      ...prev,
      { rol: "usuario", texto: mensaje, adjuntos: conAdjuntos.map((a) => a.nombre) },
    ]);
    setEntrada("");
    setAdjuntos([]);
    setEnviando(true);
    setError(null);
    setActividad("Pensando…");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/agent/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          mensaje,
          superficie: surface,
          conversacionId,
          adjuntos: conAdjuntos.map((a) => ({
            nombre: a.nombre,
            mimeType: a.mimeType,
            datos: a.datos,
          })),
        }),
      });

      if (!res.ok || !res.body) {
        const detalle = await res.json().catch(() => null);
        throw new Error(detalle?.error ?? "No se pudo contactar con el asistente.");
      }

      await leerEventos(res.body, {
        onActividad: setActividad,
        onFin: (payload) => {
          setMensajes((prev) => [
            ...prev,
            {
              rol: "asistente",
              texto: payload.texto,
              propuestas: payload.propuestas,
              contaminado: payload.contaminado,
            },
          ]);
          if (payload.conversacionId) setConversacionId(payload.conversacionId);
        },
        onError: (texto) => setError(texto),
      });
      void cargarConversaciones();
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setError((err as Error).message);
      }
    } finally {
      setEnviando(false);
      setActividad(null);
      abortRef.current = null;
    }
  }

  const vacio = mensajes.length === 0;

  return (
    <div className="fixed inset-0 z-[60] flex" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="Cerrar asistente"
        onClick={onClose}
        className="flex-1 cursor-default bg-slate-900/30 backdrop-blur-[1px]"
      />

      <aside
        className={`flex h-full flex-col border-l border-slate-200 bg-white shadow-2xl transition-[width] duration-200 ${
          expandido ? "w-full" : "w-full max-w-xl"
        }`}
      >
        <header className="flex items-center gap-2 border-b border-slate-200 px-4 py-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Bot className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              Asistente de Ibiza Online
            </p>
            <p className="text-xs text-slate-500">Agente personalizado</p>
          </div>

          <IconButton
            label="Nueva conversación"
            onClick={nuevaConversacion}
            icon={<Plus className="h-4 w-4" />}
          />
          <div className="relative">
            <IconButton
              label="Tus conversaciones"
              onClick={abrirHistorial}
              active={historialAbierto}
              icon={<History className="h-4 w-4" />}
            />
            {historialAbierto && (
              <HistorialDesplegable
                conversaciones={conversaciones}
                activaId={conversacionId}
                onElegir={cargarConversacion}
                onBorrar={borrarConversacion}
                onCerrar={() => setHistorialAbierto(false)}
              />
            )}
          </div>
          <IconButton
            label={expandido ? "Reducir" : "Pantalla completa"}
            onClick={() => setExpandido((v) => !v)}
            icon={
              expandido ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )
            }
          />
          <IconButton
            label="Cerrar"
            onClick={onClose}
            icon={<X className="h-4 w-4" />}
          />
        </header>

        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className={expandido ? "mx-auto max-w-3xl" : ""}>
            {vacio ? (
              <Bienvenida onElegir={(texto) => void enviar(texto)} />
            ) : (
              <div className="space-y-4">
                {mensajes.map((mensaje, i) => (
                  <Burbuja key={i} mensaje={mensaje} />
                ))}
              </div>
            )}

            {actividad && (
              <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {actividad}
              </p>
            )}
            {error && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}
            <div ref={finRef} />
          </div>
        </div>

        <footer className="border-t border-slate-200 px-4 py-3">
          <div className={expandido ? "mx-auto max-w-3xl" : ""}>
            {adjuntos.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-2">
                {adjuntos.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
                  >
                    <FileText className="h-3.5 w-3.5 text-slate-400" />
                    <span className="max-w-[14rem] truncate">{a.nombre}</span>
                    <button
                      type="button"
                      aria-label={`Quitar ${a.nombre}`}
                      onClick={() =>
                        setAdjuntos((prev) => prev.filter((_, j) => j !== i))
                      }
                      className="text-slate-400 hover:text-slate-700"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <div className="flex items-end gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 focus-within:border-primary-500">
              <button
                type="button"
                aria-label="Adjuntar documento"
                title="Adjuntar documento (PDF, texto o imagen)"
                onClick={() => fileRef.current?.click()}
                disabled={adjuntos.length >= MAX_FILES}
                className="mb-1 text-slate-400 transition hover:text-slate-700 disabled:opacity-40"
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileRef}
                type="file"
                multiple
                accept={MIME_ACEPTADOS.join(",")}
                className="hidden"
                onChange={(e) => void elegirArchivos(e.target.files)}
              />

              <textarea
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void enviar();
                  }
                }}
                rows={1}
                placeholder="Pregúntame sobre cursos, evidencias o documentos…"
                className="max-h-40 flex-1 resize-none bg-transparent py-1 text-sm text-slate-900 outline-none placeholder:text-slate-400"
              />

              <button
                type="button"
                aria-label="Enviar"
                onClick={() => void enviar()}
                disabled={enviando || !entrada.trim()}
                className="mb-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-primary-600 text-white transition hover:bg-primary-700 disabled:opacity-40"
              >
                {enviando ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4 w-4" />
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-slate-400">
              Puede cometer errores. Verifica lo importante antes de decidir.
            </p>
          </div>
        </footer>
      </aside>
    </div>
  );
}

/* ── piezas ────────────────────────────────────────────────────────────── */

function IconButton({
  label,
  onClick,
  icon,
  active,
}: {
  label: string;
  onClick: () => void;
  icon: React.ReactNode;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`flex h-8 w-8 items-center justify-center rounded-lg border transition ${
        active
          ? "border-primary-300 bg-primary-50 text-primary-700"
          : "border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800"
      }`}
    >
      {icon}
    </button>
  );
}

function Bienvenida({ onElegir }: { onElegir: (texto: string) => void }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-900">
        ¿En qué puedo ayudarte?
      </h2>
      <p className="mt-2 text-sm text-slate-500">
        Puedo consultar tus cursos, evidencias y manuales, redactar borradores y
        preparar acciones para que tú las confirmes. Prueba con un ejemplo:
      </p>
      <ul className="mt-4 space-y-2">
        {EJEMPLOS.map((ejemplo) => (
          <li key={ejemplo.texto}>
            <button
              type="button"
              onClick={() => onElegir(ejemplo.texto)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-left transition hover:border-primary-300 hover:bg-primary-50/40"
            >
              <span className="block text-sm font-medium text-slate-800">
                {ejemplo.texto}
              </span>
              <span className="mt-0.5 block text-xs text-slate-500">
                {ejemplo.pista}
              </span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-slate-400">
        También puedes adjuntar un documento y pedirme que trabaje sobre él.
      </p>
    </div>
  );
}

function Burbuja({ mensaje }: { mensaje: Mensaje }) {
  if (mensaje.rol === "usuario") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary-600 px-4 py-2.5 text-sm text-white">
          <p className="whitespace-pre-wrap">{mensaje.texto}</p>
          {mensaje.adjuntos && mensaje.adjuntos.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-white/20 pt-2 text-xs text-primary-100">
              {mensaje.adjuntos.map((nombre) => (
                <li key={nombre} className="flex items-center gap-1.5">
                  <FileText className="h-3 w-3" />
                  <span className="truncate">{nombre}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="max-w-[92%] rounded-2xl rounded-bl-sm bg-slate-100 px-4 py-3 text-sm text-slate-800">
        <p className="whitespace-pre-wrap">{mensaje.texto}</p>
      </div>
      {mensaje.propuestas?.map((propuesta) => (
        <TarjetaPropuesta key={propuesta.id} propuesta={propuesta} />
      ))}
      {mensaje.contaminado && (
        <p className="flex items-center gap-1.5 text-xs text-slate-400">
          <ShieldAlert className="h-3.5 w-3.5" />
          Esta respuesta leyó documentos de terceros, así que el asistente no
          puede proponer cambios en este turno.
        </p>
      )}
    </div>
  );
}

function TarjetaPropuesta({ propuesta }: { propuesta: Propuesta }) {
  const [estado, setEstado] = useState<
    "pendiente" | "enviando" | "confirmada" | "rechazada"
  >("pendiente");
  const [error, setError] = useState<string | null>(null);

  async function resolver(accion: "confirmar" | "rechazar") {
    setEstado("enviando");
    setError(null);
    const res = await fetch(`/api/agent/proposal/${propuesta.id}`, {
      method: accion === "confirmar" ? "POST" : "DELETE",
    });
    if (res.ok) {
      setEstado(accion === "confirmar" ? "confirmada" : "rechazada");
    } else {
      const detalle = await res.json().catch(() => null);
      setError(detalle?.error ?? "No se pudo completar la acción.");
      setEstado("pendiente");
    }
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50/60 px-4 py-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-amber-700">
        Acción propuesta · pendiente de tu confirmación
      </p>
      <p className="mt-1 text-sm font-medium text-slate-800">
        {propuesta.toolName.replace(/_/g, " ")}
      </p>
      <dl className="mt-2 space-y-1 text-xs text-slate-600">
        {Object.entries(propuesta.args as Record<string, unknown>).map(
          ([clave, valor]) => (
            <div key={clave} className="flex gap-2">
              <dt className="shrink-0 font-medium text-slate-500">{clave}:</dt>
              <dd className="break-words">{String(valor)}</dd>
            </div>
          ),
        )}
      </dl>

      {estado === "confirmada" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
          <Check className="h-4 w-4" /> Hecho.
        </p>
      )}
      {estado === "rechazada" && (
        <p className="mt-3 text-sm text-slate-500">Descartada.</p>
      )}
      {(estado === "pendiente" || estado === "enviando") && (
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            disabled={estado === "enviando"}
            onClick={() => void resolver("confirmar")}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={estado === "enviando"}
            onClick={() => void resolver("rechazar")}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-white disabled:opacity-50"
          >
            Descartar
          </button>
        </div>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function HistorialDesplegable({
  conversaciones,
  activaId,
  onElegir,
  onBorrar,
  onCerrar,
}: {
  conversaciones: ResumenConversacion[];
  activaId: string | null;
  onElegir: (id: string) => void;
  onBorrar: (id: string, event: React.MouseEvent) => void;
  onCerrar: () => void;
}) {
  return (
    <div className="absolute right-0 top-10 z-10 w-80 rounded-xl border border-slate-200 bg-white shadow-xl">
      <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
        <p className="text-sm font-medium text-slate-800">Tus conversaciones</p>
        <button
          type="button"
          aria-label="Cerrar historial"
          onClick={onCerrar}
          className="text-slate-400 hover:text-slate-700"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {conversaciones.length === 0 ? (
        <p className="px-3 py-6 text-center text-sm text-slate-400">
          Todavía no hay conversaciones guardadas.
        </p>
      ) : (
        <ul className="max-h-80 overflow-y-auto py-1">
          {conversaciones.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => onElegir(c.id)}
                className={`group flex w-full items-start gap-2 px-3 py-2 text-left transition hover:bg-slate-50 ${
                  activaId === c.id ? "bg-primary-50/60" : ""
                }`}
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-slate-800">
                    {c.title}
                  </span>
                  <span className="text-xs text-slate-400">
                    {formatTimeAgo(new Date(c.updatedAt))} · {c.messageCount} msgs
                  </span>
                </span>
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={`Borrar ${c.title}`}
                  onClick={(e) => onBorrar(c.id, e)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") onBorrar(c.id, e as never);
                  }}
                  className="mt-0.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:text-red-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ── lectura del SSE ───────────────────────────────────────────────────── */

interface FinPayload {
  texto: string;
  propuestas: Propuesta[];
  contaminado: boolean;
  conversacionId: string | null;
}

async function leerEventos(
  body: ReadableStream<Uint8Array>,
  handlers: {
    onActividad: (texto: string | null) => void;
    onFin: (payload: FinPayload) => void;
    onError: (texto: string) => void;
  },
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  // Nombres legibles para lo que el agente está haciendo. Que la persona vea
  // qué se consultó es parte de poder confiar en la respuesta.
  const etiqueta: Record<string, string> = {
    listar_evidencias: "Consultando la cola de evidencias…",
    obtener_detalle_evidencia: "Abriendo el detalle de la evidencia…",
    comentar_evidencia: "Preparando el comentario…",
  };

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    let corte: number;
    while ((corte = buffer.indexOf("\n\n")) !== -1) {
      const bloque = buffer.slice(0, corte);
      buffer = buffer.slice(corte + 2);

      const evento = bloque.match(/^event: (.+)$/m)?.[1];
      const crudo = bloque.match(/^data: (.+)$/m)?.[1];
      if (!evento || !crudo) continue;
      const data = JSON.parse(crudo);

      if (evento === "herramienta_inicio") {
        handlers.onActividad(etiqueta[data.name] ?? "Consultando…");
      } else if (evento === "paso") {
        handlers.onActividad("Pensando…");
      } else if (evento === "fin") {
        handlers.onFin(data);
      } else if (evento === "error") {
        handlers.onError(data.texto);
      }
    }
  }
}
