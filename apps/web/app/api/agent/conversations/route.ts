/**
 * Historial del copiloto: lista, carga y borrado.
 *
 * Todo se resuelve contra la sesión: `listConversations` y `getConversation`
 * llevan el `userId` en el `where`, así que la conversación de otra persona no
 * es que esté prohibida — es que no existe para quien pregunta.
 */

import { NextResponse } from "next/server";
import { isAgentRole } from "@prol/ai";
import { requireAIEnabled } from "@/lib/auth";
import {
  deleteConversation,
  getConversation,
  listConversations,
} from "@/lib/agent/conversations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function actor() {
  const user = await requireAIEnabled(["PROFESSOR", "ADMIN", "SUPER_ADMIN"]);
  return isAgentRole(user.role) ? user : null;
}

export async function GET(request: Request) {
  const user = await actor().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (id) {
    const conversation = await getConversation(user.id, id);
    if (!conversation) {
      return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    }
    return NextResponse.json({ conversacion: conversation });
  }

  return NextResponse.json({
    conversaciones: await listConversations(user.id),
  });
}

export async function DELETE(request: Request) {
  const user = await actor().catch(() => null);
  if (!user) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const id = new URL(request.url).searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Falta el id" }, { status: 400 });
  }
  if (!(await deleteConversation(user.id, id))) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
