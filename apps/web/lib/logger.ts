/**
 * Minimal structured logger. Emits one JSON line per event with a stable
 * shape so logs are easy to grep / ship to a log aggregator without
 * pulling in a runtime dependency. In dev (NODE_ENV !== 'production')
 * we also pretty-print for readability.
 *
 * Use this in server-side code instead of console.log/error when the
 * event is something an operator might want to query later (payment
 * events, certificate issuance, email failures, webhook errors...).
 */
type Level = "debug" | "info" | "warn" | "error";

interface LogFields {
  [key: string]: unknown;
}

function emit(level: Level, component: string, msg: string, fields: LogFields = {}) {
  const record = {
    ts: new Date().toISOString(),
    level,
    component,
    msg,
    ...fields,
  };
  const out = level === "error" || level === "warn" ? console.error : console.log;
  if (process.env.NODE_ENV === "production") {
    out(JSON.stringify(record));
  } else {
    const fieldsStr = Object.keys(fields).length
      ? " " + JSON.stringify(fields)
      : "";
    out(`[${level.toUpperCase()}] [${component}] ${msg}${fieldsStr}`);
  }
}

/** Create a logger bound to a component name. */
export function createLogger(component: string) {
  return {
    debug: (msg: string, fields?: LogFields) => emit("debug", component, msg, fields),
    info: (msg: string, fields?: LogFields) => emit("info", component, msg, fields),
    warn: (msg: string, fields?: LogFields) => emit("warn", component, msg, fields),
    error: (msg: string, fields?: LogFields) => emit("error", component, msg, fields),
  };
}

export type Logger = ReturnType<typeof createLogger>;
