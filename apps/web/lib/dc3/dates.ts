import { APP_TIME_ZONE } from "@/lib/timezone";

/**
 * Fechas del DC-3.
 *
 * El periodo de ejecución del formato es una fecha de calendario (año,
 * mes, día en tres casillas), no un instante. Se guarda en columnas
 * `@db.Date`, que Prisma entrega como un Date a medianoche UTC, así que
 * todo lo que las lea tiene que usar los getters UTC: con los locales,
 * una constancia emitida en México se imprimiría con el día anterior.
 */

const DATE_INPUT = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * Convierte el valor de un `<input type="date">` a la medianoche UTC que
 * le corresponde. Devuelve una fecha inválida si el formato no coincide,
 * para que quien llama lo detecte con `Number.isNaN(d.getTime())`.
 */
export function parseDateInput(value: string): Date {
  const m = DATE_INPUT.exec(value.trim());
  if (!m) return new Date(NaN);
  const [, y, mo, d] = m;
  const date = new Date(Date.UTC(Number(y), Number(mo) - 1, Number(d)));
  // Rechaza días que no existen ("2026-02-31" se desbordaría a marzo).
  if (date.getUTCMonth() !== Number(mo) - 1) return new Date(NaN);
  return date;
}

/** Inverso de `parseDateInput`: "YYYY-MM-DD" para prellenar el input. */
export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(
    date.getUTCDate()
  )}`;
}

const MX_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Reduce un instante (p. ej. `enrollment.completedAt`, guardado en UTC) a
 * la fecha de calendario que era en México en ese momento, ya como
 * medianoche UTC lista para una columna `@db.Date`.
 *
 * Importa porque un alumno que termina un curso a las 20:00 del día 5 en
 * Ciudad de México lo hace a las 02:00 UTC del día 6: sin esta
 * conversión su constancia diría que terminó un día después.
 */
export function toCalendarDate(instant: Date): Date {
  // "en-CA" produce siempre YYYY-MM-DD, así que el split es seguro.
  const parts = MX_PARTS.format(instant).split("-").map(Number);
  const [y = 1970, m = 1, d = 1] = parts;
  return new Date(Date.UTC(y, m - 1, d));
}

/** Casillas Año / Mes / Día del formato, como cadenas ya rellenadas. */
export function dc3DateCells(date: Date): {
  year: string;
  month: string;
  day: string;
} {
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    day: String(date.getUTCDate()).padStart(2, "0"),
  };
}

/** "5 de marzo de 2026" — para la UI, no para el formato oficial. */
export function formatDc3Date(date: Date): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}
