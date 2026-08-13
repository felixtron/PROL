/**
 * Zona horaria canónica de la plataforma.
 *
 * Todo horario de evento (consultorías, talleres) se guarda en UTC y se pinta
 * en esta zona, sin importar dónde esté el navegador ni cómo esté configurado
 * el contenedor. Antes cada vista heredaba la zona de su entorno: un Server
 * Component formateaba en UTC y un Client Component en la hora del asesor, así
 * que la misma sesión se leía con dos horas distintas.
 *
 * Es una constante y no una variable de entorno a propósito: los Client
 * Components no reciben env del servidor, y una env a medias es justo lo que
 * volvería a desincronizar servidor y navegador.
 */
export const APP_TIME_ZONE = "America/Mexico_City";

const PARTS = new Intl.DateTimeFormat("en-US", {
  timeZone: APP_TIME_ZONE,
  hourCycle: "h23",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type ZonedParts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

/** Descompone un instante en su hora de pared dentro de `APP_TIME_ZONE`. */
function zonedParts(date: Date): ZonedParts {
  const found = PARTS.formatToParts(date);
  const get = (type: string) =>
    Number(found.find((p) => p.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

/** Desfase de la zona respecto a UTC, en ms, para el instante dado. */
function zoneOffsetMs(date: Date): number {
  const p = zonedParts(date);
  const asUtc = Date.UTC(
    p.year,
    p.month - 1,
    p.day,
    p.hour,
    p.minute,
    p.second,
    date.getUTCMilliseconds(),
  );
  return asUtc - date.getTime();
}

const INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Convierte el valor de un `<input type="datetime-local">` — hora de pared sin
 * offset, p. ej. "2026-08-13T10:00" — al instante UTC que le corresponde en
 * `APP_TIME_ZONE`.
 *
 * `new Date(valor)` NO sirve aquí: el estándar interpreta esa forma en la zona
 * del runtime, que en el contenedor es UTC, así que "10:00" se guardaba como
 * las 10:00 UTC (04:00 en Ciudad de México).
 *
 * Devuelve una fecha inválida si el formato no coincide, para que quien llama
 * lo detecte con el mismo `Number.isNaN(d.getTime())` de siempre.
 */
export function parseZonedInput(value: string): Date {
  const m = INPUT_PATTERN.exec(value.trim());
  if (!m) return new Date(NaN);

  const naive = Date.UTC(
    Number(m[1]),
    Number(m[2]) - 1,
    Number(m[3]),
    Number(m[4]),
    Number(m[5]),
    m[6] ? Number(m[6]) : 0,
  );

  // Dos pasadas: la primera estima el desfase con la hora de pared, la segunda
  // lo recalcula ya sobre el instante real. Sólo cambia algo si la fecha cae
  // junto a un cambio de horario — Ciudad de México no lo tiene desde 2022,
  // pero la función no depende de eso.
  const first = naive - zoneOffsetMs(new Date(naive));
  return new Date(naive - zoneOffsetMs(new Date(first)));
}

/** Inverso de `parseZonedInput`: "YYYY-MM-DDTHH:mm" para prellenar el input. */
export function toZonedInputValue(date: Date): string {
  const p = zonedParts(new Date(date));
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}`;
}
