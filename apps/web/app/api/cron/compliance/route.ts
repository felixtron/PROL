import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { sendActivityReminders } from "@/lib/compliance-dispatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Barrido programado del módulo de Gestión Documental: manda los
 * recordatorios de las actividades de cumplimiento que se acercan a su fecha.
 *
 * Se invoca desde el cron del host (no hay worker en producción), junto al de
 * encuestas y con el mismo secreto:
 *
 *   30 8 * * *  curl -fsS -X POST https://prol.prosuite.pro/api/cron/compliance \
 *                 -H "Authorization: Bearer $CRON_SECRET"
 *
 * Sin `CRON_SECRET` configurada la ruta responde 503 en vez de quedar
 * abierta: una ruta que dispara correos no puede ser pública por descuido.
 *
 * Aquí no hay nada que "cerrar": una actividad vencida se calcula por fecha en
 * cada lectura (`activityState`), así que si este barrido no corre sólo se
 * retrasan los avisos — la agenda sigue diciendo la verdad.
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
    const reminders = await sendActivityReminders(now);
    return NextResponse.json({ ok: true, at: now.toISOString(), reminders });
  } catch (err) {
    console.error(
      JSON.stringify({
        ts: now.toISOString(),
        level: "error",
        component: "compliance-cron",
        msg: "Falló el barrido de cumplimiento",
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
