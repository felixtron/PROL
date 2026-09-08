/**
 * Historial del copiloto, por cuenta.
 *
 * Comodidad de uso, no archivo documental: se guardan las últimas
 * conversaciones de cada persona y las viejas se podan. Lo que sí es archivo
 * —qué acción se confirmó, quién y con qué modelo— vive en `AuditLog`.
 *
 * Los mensajes son SOLO TEXTO a propósito. Ni llamadas a herramienta, ni sus
 * resultados, ni adjuntos: el historial vuelve al modelo en el turno
 * siguiente, y guardar ahí contenido de terceros permitiría reinyectarlo
 * saltándose la valla de `envelope.ts`.
 */

import { db, type Prisma } from "@prol/db";

/** Conversaciones que se conservan por persona. Por encima, se podan. */
export const MAX_CONVERSATIONS = 20;
/** Mensajes que se conservan dentro de una conversación. */
export const MAX_MESSAGES = 40;
/** Mensajes que se le devuelven al modelo como contexto. */
export const HISTORY_WINDOW = 12;

export interface StoredMessage {
  rol: "usuario" | "asistente";
  texto: string;
}

/**
 * Prisma tipa las columnas Json con `InputJsonValue`, que no acepta una
 * interfaz nombrada por no tener índice de cadena. Se convierte en el borde,
 * una sola vez, en lugar de ensuciar `StoredMessage` con `[k: string]:
 * unknown` — que dejaría entrar cualquier cosa en el resto del módulo.
 */
function toJson(messages: StoredMessage[]): Prisma.InputJsonValue {
  return messages as unknown as Prisma.InputJsonValue;
}

function isStoredMessage(value: unknown): value is StoredMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    (m.rol === "usuario" || m.rol === "asistente") && typeof m.texto === "string"
  );
}

/** Lee los mensajes de una fila sin fiarse de la forma guardada. */
export function parseMessages(raw: unknown): StoredMessage[] {
  return Array.isArray(raw) ? raw.filter(isStoredMessage) : [];
}

/** Título de la lista: las primeras palabras de la primera pregunta. */
export function deriveTitle(firstMessage: string): string {
  const flat = firstMessage.replace(/\s+/g, " ").trim();
  return flat.length > 70 ? `${flat.slice(0, 69)}…` : flat || "Conversación";
}

export interface ConversationSummary {
  id: string;
  title: string;
  updatedAt: Date;
  messageCount: number;
}

/** Lista para el desplegable. El `where` lleva el usuario: no hay otra vía. */
export async function listConversations(
  userId: string,
): Promise<ConversationSummary[]> {
  const rows = await db.agentConversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: MAX_CONVERSATIONS,
    select: { id: true, title: true, updatedAt: true, messages: true },
  });
  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    messageCount: parseMessages(row.messages).length,
  }));
}

/** Una conversación completa, o `null` si no es de esta persona. */
export async function getConversation(userId: string, id: string) {
  const row = await db.agentConversation.findFirst({
    where: { id, userId },
    select: { id: true, title: true, messages: true, updatedAt: true },
  });
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    updatedAt: row.updatedAt,
    messages: parseMessages(row.messages),
  };
}

export async function deleteConversation(
  userId: string,
  id: string,
): Promise<boolean> {
  const { count } = await db.agentConversation.deleteMany({
    where: { id, userId },
  });
  return count > 0;
}

interface AppendInput {
  userId: string;
  tenantId: string;
  surface: string;
  conversationId: string | null;
  userMessage: string;
  assistantMessage: string;
}

/**
 * Añade el par pregunta/respuesta y devuelve el id de la conversación.
 *
 * La poda va después de crear y sin transacción a propósito: con dos pestañas
 * a la vez lo peor que pasa es que queden una o dos conversaciones de más
 * hasta el turno siguiente. Envolverlo en una transacción por eso costaría un
 * bloqueo en cada turno para arreglar algo que nadie nota.
 */
export async function appendTurn(input: AppendInput): Promise<string> {
  const nuevo: StoredMessage[] = [
    { rol: "usuario", texto: input.userMessage },
    { rol: "asistente", texto: input.assistantMessage },
  ];

  if (input.conversationId) {
    const existing = await db.agentConversation.findFirst({
      where: { id: input.conversationId, userId: input.userId },
      select: { id: true, messages: true },
    });
    if (existing) {
      const messages = [...parseMessages(existing.messages), ...nuevo].slice(
        -MAX_MESSAGES,
      );
      await db.agentConversation.update({
        where: { id: existing.id },
        data: { messages: toJson(messages) },
      });
      return existing.id;
    }
    // Si el id no existe o no es suyo, se abre una conversación nueva en vez
    // de fallar: al usuario le importa su respuesta, no nuestro id perdido.
  }

  const created = await db.agentConversation.create({
    data: {
      userId: input.userId,
      tenantId: input.tenantId,
      surface: input.surface,
      title: deriveTitle(input.userMessage),
      messages: toJson(nuevo),
    },
    select: { id: true },
  });

  const stale = await db.agentConversation.findMany({
    where: { userId: input.userId },
    orderBy: { updatedAt: "desc" },
    skip: MAX_CONVERSATIONS,
    select: { id: true },
  });
  if (stale.length > 0) {
    await db.agentConversation.deleteMany({
      where: { id: { in: stale.map((c) => c.id) } },
    });
  }

  return created.id;
}
