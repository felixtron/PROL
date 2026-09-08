/**
 * Confirmar (POST) o rechazar (DELETE) una propuesta del agente.
 *
 * Éste es el ÚNICO sitio de la aplicación donde el agente llega a cambiar
 * algo, y sólo porque una persona le ha dado a un botón. El bucle deja las
 * propuestas en PENDING y nunca las ejecuta.
 *
 * Se vuelve a comprobar todo, sin fiarse de lo guardado:
 *
 *   1. La propuesta es de QUIEN la está confirmando. Si no, no existe para él.
 *   2. Sigue PENDING y no ha caducado.
 *   3. La herramienta existe, es de escritura, y el rol y la superficie
 *      siguen permitiéndola — el rol pudo cambiar desde que se propuso.
 *   4. Los argumentos se revalidan contra el esquema Zod de la herramienta.
 *      Lo que hay en la base lo escribió un modelo; no es de fiar.
 *   5. `tool.commit()` ejecuta la acción real, que a su vez vuelve a pasar por
 *      los `requireX()` de la aplicación con la sesión de quien confirma.
 *
 * Cinco barreras para un comentario en una bitácora puede parecer mucho. No lo
 * es: este endpoint es la plantilla de todas las escrituras que vengan
 * después, incluidas las que sí cambian estados y avisan a las empresas.
 */

import { NextResponse } from "next/server";
import { db } from "@prol/db";
import { denyReason, isAgentRole } from "@prol/ai";
import { requireAIEnabled } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { createLogger } from "@/lib/logger";
import { agentRegistry } from "@/lib/agent/tools";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const log = createLogger("agent-proposal");

const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60_000;

interface Params {
  params: Promise<{ id: string }>;
}

/** Un solo mensaje para "no existe", "no es tuya" y "ya no vale". */
const NOT_ACTIONABLE =
  "Esa propuesta ya no está disponible. Vuelve a pedírsela al asistente.";

async function loadActor() {
  const user = await requireAIEnabled(["PROFESSOR", "ADMIN", "SUPER_ADMIN"]);
  const role = user.role;
  if (!isAgentRole(role)) return null;
  return { user, role };
}

export async function POST(request: Request, { params }: Params) {
  const actor = await loadActor().catch(() => null);
  if (!actor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { user, role } = actor;

  if (checkRateLimit(`agent-commit:${user.id}`, RATE_LIMIT, RATE_WINDOW_MS).limited) {
    return NextResponse.json({ error: "Demasiadas peticiones" }, { status: 429 });
  }

  const { id } = await params;

  // La propiedad va en el WHERE, no en un `if` posterior: así una propuesta de
  // otra persona sencillamente no aparece.
  const proposal = await db.agentProposal.findFirst({
    where: { id, userId: user.id, status: "PENDING" },
  });
  if (!proposal || proposal.expiresAt < new Date()) {
    if (proposal) {
      await db.agentProposal.update({
        where: { id: proposal.id },
        data: { status: "EXPIRED" },
      });
    }
    return NextResponse.json({ error: NOT_ACTIONABLE }, { status: 404 });
  }

  const tool = agentRegistry.get(proposal.toolName);
  if (!tool || tool.kind !== "write") {
    // La herramienta se retiró o cambió de tipo entre la propuesta y ahora.
    log.warn("propuesta sobre herramienta inválida", {
      proposalId: proposal.id,
      tool: proposal.toolName,
    });
    return NextResponse.json({ error: NOT_ACTIONABLE }, { status: 409 });
  }

  // El rol o la pantalla pudieron cambiar desde que se propuso. `tainted:
  // false` porque aquí ya no hay turno: la contaminación vive dentro de un
  // turno y quien confirma es una persona, no el modelo.
  const denied = denyReason(tool, {
    role,
    surface: proposal.surface,
    tainted: false,
  });
  if (denied) {
    log.warn("confirmación denegada por política", {
      proposalId: proposal.id,
      tool: tool.name,
      reason: denied,
    });
    return NextResponse.json({ error: NOT_ACTIONABLE }, { status: 403 });
  }

  // `commit` revalida los argumentos contra el esquema antes de ejecutar.
  const result = await tool.commit(proposal.args);

  if (!result.ok) {
    await db.agentProposal.update({
      where: { id: proposal.id },
      data: { error: result.error.slice(0, 500) },
    });
    log.warn("confirmación fallida", {
      proposalId: proposal.id,
      tool: tool.name,
      error: result.error,
    });
    // Se queda en PENDING: muchos fallos son transitorios y la persona puede
    // reintentar sin volver a pedirle la propuesta al agente.
    return NextResponse.json({ error: result.error }, { status: 422 });
  }

  await db.$transaction([
    db.agentProposal.update({
      where: { id: proposal.id },
      data: { status: "COMMITTED", committedAt: new Date(), error: null },
    }),
    db.auditLog.create({
      data: {
        tenantId: proposal.tenantId,
        userId: user.id,
        action: `agent.${tool.name}`,
        entity: "AgentProposal",
        entityId: proposal.id,
        metadata: {
          // `via` es lo que permite responder más tarde a "¿esto lo hizo una
          // persona o el agente?". El actor sigue siendo el humano.
          via: "agent",
          tool: tool.name,
          module: tool.module,
          surface: proposal.surface,
          args: proposal.args,
          model: proposal.model,
        },
      },
    }),
  ]);

  log.info("propuesta confirmada", {
    proposalId: proposal.id,
    userId: user.id,
    tool: tool.name,
  });

  return NextResponse.json({ ok: true, resultado: result.data });
}

export async function DELETE(_request: Request, { params }: Params) {
  const actor = await loadActor().catch(() => null);
  if (!actor) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  const { id } = await params;

  const { count } = await db.agentProposal.updateMany({
    where: { id, userId: actor.user.id, status: "PENDING" },
    data: { status: "REJECTED", rejectedAt: new Date() },
  });
  if (count === 0) {
    return NextResponse.json({ error: NOT_ACTIONABLE }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
