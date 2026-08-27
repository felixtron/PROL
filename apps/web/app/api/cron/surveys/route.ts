import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  closeExpiredCampaigns,
  sendCampaignReminders,
} from "@/lib/survey-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Barrido programado del módulo de Encuestas: manda los recordatorios que
 * tocan hoy y cierra los lanzamientos vencidos.
 *
 * Se invoca desde el cron del host (no hay worker en producción):
 *
 *   0 8 * * *  curl -fsS -X POST https://prol.prosuite.pro/api/cron/surveys \
 *                -H "Authorization: Bearer $CRON_SECRET"
 *
 * Sin `CRON_SECRET` configurada la ruta responde 503 en vez de quedar
 * abierta: una ruta que dispara correos no puede ser pública por descuido.
 * El cierre por vencimiento es housekeeping — el rechazo de respuestas
 * vencidas lo decide la propia acción de responder, así que si este barrido
 * no corre nadie puede contestar una encuesta caducada.
 */
async function handle(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurada" },
      { status: 503 },
    );
  }

  const header = req.headers.get("authorization") ?? "";
  const provided = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (provided !== secret) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();
  try {
    // Recordatorios primero: si cerráramos antes, los lanzamientos que
    // vencen hoy perderían su último aviso.
    const reminders = await sendCampaignReminders(now);
    const closed = await closeExpiredCampaigns(now);
    return NextResponse.json({ ok: true, at: now.toISOString(), reminders, closed });
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: now.toISOString(),
        level: "error",
        component: "surveys-cron",
        msg: "Falló el barrido de encuestas",
        error: err instanceof Error ? err.message : String(err),
      }),
    );
    return NextResponse.json({ error: "Error en el barrido" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  return handle(req);
}

// GET se acepta para que un cron sencillo (o un uptime check) pueda dispararlo
// sin construir un POST. Exige el mismo secreto.
export async function GET(req: NextRequest) {
  return handle(req);
}
