import { db, type RecurrenceFrequency } from "@prol/db";
import { auth } from "@/lib/auth";

/**
 * Integración con Google Calendar para generar links de Google Meet.
 *
 * Modelo: cada tenant designa UNA cuenta de Google "anfitriona"
 * (`Tenant.googleCalendarUserId` apunta al admin que la vinculó). Todos los
 * workshops virtuales del tenant generan su Meet en el calendario de esa
 * cuenta. Los tokens NO se guardan acá: viven en la tabla `accounts` y Better
 * Auth se encarga de refrescarlos.
 */

const CALENDAR_EVENTS_ENDPOINT =
  "https://www.googleapis.com/calendar/v3/calendars/primary/events";

export { GOOGLE_CALENDAR_SCOPE } from "@/lib/google-scopes";

/**
 * Zona con la que se etiquetan los eventos en Google. Los `dateTime` se
 * mandan en UTC absoluto (ISO con Z), así que esto sólo afecta cómo se
 * muestran y cómo se expande la recurrencia — no desplaza el horario.
 */
const EVENT_TIME_ZONE = process.env.WORKSHOP_TIME_ZONE || "America/Mexico_City";

/** true si el entorno tiene credenciales de Google. Sin ellas la integración
 *  se muestra deshabilitada en vez de romper. */
export function isGoogleMeetConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export type TenantMeetAccount = {
  userId: string;
  email: string | null;
};

/** Cuenta de Google designada por el tenant, o null si no hay ninguna. */
export async function getTenantMeetAccount(
  tenantId: string,
): Promise<TenantMeetAccount | null> {
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { googleCalendarUserId: true, googleCalendarEmail: true },
  });
  if (!tenant?.googleCalendarUserId) return null;

  // El puntero puede quedar colgado si el admin desvinculó Google (o si su
  // usuario fue borrado). Verificamos que la cuenta OAuth siga existiendo.
  const account = await db.account.findFirst({
    where: { userId: tenant.googleCalendarUserId, providerId: "google" },
    select: { id: true },
  });
  if (!account) return null;

  return {
    userId: tenant.googleCalendarUserId,
    email: tenant.googleCalendarEmail,
  };
}

/**
 * Access token de la cuenta anfitriona, refrescado por Better Auth si expiró.
 *
 * OJO: se llama SIN `headers` a propósito. `getAccessToken` prioriza la
 * sesión sobre el `userId` del body — si le pasáramos los headers de la
 * request, devolvería el token del profesor logueado en vez del de la cuenta
 * del tenant.
 */
async function getHostAccessToken(userId: string): Promise<string | null> {
  try {
    const result = await auth.api.getAccessToken({
      body: { providerId: "google", userId },
    });
    return result?.accessToken ?? null;
  } catch (e) {
    console.error("[google-calendar] no se pudo obtener el access token", e);
    return null;
  }
}

/**
 * RRULE equivalente a la recurrencia que PROL genera en `addRecurrence`.
 * Un solo evento recurrente = un solo Meet compartido por toda la serie,
 * que es como funciona una clase que se repite.
 */
function buildRecurrenceRule(
  frequency: RecurrenceFrequency | null,
  occurrences: number,
): string[] | undefined {
  if (!frequency || occurrences < 2) return undefined;
  const count = `COUNT=${occurrences}`;
  switch (frequency) {
    case "DAILY":
      return [`RRULE:FREQ=DAILY;${count}`];
    case "WEEKLY":
      return [`RRULE:FREQ=WEEKLY;${count}`];
    case "BIWEEKLY":
      return [`RRULE:FREQ=WEEKLY;INTERVAL=2;${count}`];
    case "MONTHLY":
      return [`RRULE:FREQ=MONTHLY;${count}`];
    default:
      return undefined;
  }
}

/** Extrae el link de Meet de una respuesta de la API de Calendar. */
function extractMeetUrl(event: {
  hangoutLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
}): string | null {
  if (event.hangoutLink) return event.hangoutLink;
  const video = event.conferenceData?.entryPoints?.find(
    (p) => p.entryPointType === "video",
  );
  return video?.uri ?? null;
}

export type CreateMeetResult =
  | { ok: true; meetingUrl: string; eventId: string }
  | { ok: false; error: string };

/**
 * Crea un evento en el calendario de la cuenta anfitriona del tenant con una
 * conferencia de Meet adjunta y devuelve el link.
 *
 * El evento es sólo el vehículo para obtener el Meet: no se invita a nadie
 * (`attendees` vacío), así no se filtran correos de alumnos entre sí ni hay
 * nada que sincronizar cuando cambian las reservas.
 */
export async function createMeetLinkForWorkshop(params: {
  tenantId: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  recurrence: RecurrenceFrequency | null;
  occurrences: number;
}): Promise<CreateMeetResult> {
  if (!isGoogleMeetConfigured()) {
    return {
      ok: false,
      error:
        "La integración con Google no está configurada en el servidor. Contacta al administrador.",
    };
  }

  const host = await getTenantMeetAccount(params.tenantId);
  if (!host) {
    return {
      ok: false,
      error:
        "No hay una cuenta de Google conectada para tu academia. Pídele al administrador que la conecte en Configuración.",
    };
  }

  const accessToken = await getHostAccessToken(host.userId);
  if (!accessToken) {
    return {
      ok: false,
      error:
        "La conexión con Google expiró o fue revocada. El administrador debe volver a conectar la cuenta en Configuración.",
    };
  }

  // `requestId` identifica el pedido de conferencia; debe ser único por
  // evento, si no Google reutiliza/rechaza la creación del Meet.
  const body = {
    summary: params.title,
    description: params.description ?? undefined,
    start: {
      dateTime: params.startTime.toISOString(),
      timeZone: EVENT_TIME_ZONE,
    },
    end: {
      dateTime: params.endTime.toISOString(),
      timeZone: EVENT_TIME_ZONE,
    },
    recurrence: buildRecurrenceRule(params.recurrence, params.occurrences),
    conferenceData: {
      createRequest: {
        requestId: crypto.randomUUID(),
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    },
  };

  let event: {
    id?: string;
    hangoutLink?: string;
    conferenceData?: {
      entryPoints?: { entryPointType?: string; uri?: string }[];
      createRequest?: { status?: { statusCode?: string } };
    };
  };

  try {
    const res = await fetch(
      `${CALENDAR_EVENTS_ENDPOINT}?conferenceDataVersion=1`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      },
    );

    if (!res.ok) {
      const detail = await res.text();
      console.error("[google-calendar] events.insert falló", res.status, detail);
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          error:
            "Google rechazó la petición. Es probable que falten permisos de Calendar: el administrador debe reconectar la cuenta en Configuración.",
        };
      }
      return {
        ok: false,
        error: "Google Calendar no pudo crear la reunión. Intenta de nuevo.",
      };
    }

    event = await res.json();
  } catch (e) {
    console.error("[google-calendar] error de red al crear el evento", e);
    return {
      ok: false,
      error: "No se pudo contactar a Google Calendar. Intenta de nuevo.",
    };
  }

  const eventId = event.id;
  if (!eventId) {
    return {
      ok: false,
      error: "Google Calendar devolvió una respuesta inesperada.",
    };
  }

  // La conferencia se crea de forma asíncrona: si Google responde "pending",
  // el link todavía no viene en el insert. Reintentamos leyendo el evento.
  let meetingUrl = extractMeetUrl(event);
  if (!meetingUrl) {
    meetingUrl = await pollForMeetUrl(eventId, accessToken);
  }

  if (!meetingUrl) {
    return {
      ok: false,
      error:
        "Google creó el evento pero no devolvió el link de Meet. Verifica que la cuenta conectada tenga Meet habilitado.",
    };
  }

  return { ok: true, meetingUrl, eventId };
}

/** Relee el evento hasta 3 veces esperando que Google termine de crear el Meet. */
async function pollForMeetUrl(
  eventId: string,
  accessToken: string,
): Promise<string | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 700));
    try {
      const res = await fetch(
        `${CALENDAR_EVENTS_ENDPOINT}/${encodeURIComponent(eventId)}?conferenceDataVersion=1`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      if (!res.ok) continue;
      const url = extractMeetUrl(await res.json());
      if (url) return url;
    } catch {
      // Reintento silencioso: el error definitivo lo reporta el caller.
    }
  }
  return null;
}
