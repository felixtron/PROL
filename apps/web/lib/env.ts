// Validación temprana de variables de entorno críticas. Se invoca una sola
// vez al primer import (lazy singleton). En producción lanza un error si
// falta o está mal formada una variable obligatoria — preferimos crashear
// el boot del contenedor con un mensaje claro que entregar páginas con
// callbacks rotos (links localhost en certificados, redirects de Stripe a
// "/dashboard/...", etc.). En desarrollo solo registra un aviso para
// permitir prototipar con `.env.local` incompleto.

import { z } from "zod";

import { missingR2Env } from "@/lib/r2";

// Variables que deben existir para que la app sea funcional en cualquier
// despliegue real. No incluye llaves de servicios opcionales (IA, Stripe,
// Cloudflare Stream, Resend) — esas están gateadas por feature flags o
// rutas específicas y se validan en su propio módulo si se usan.
const CriticalEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  // Sin prefijo `NEXT_PUBLIC_` y sin fallback a las públicas. Esas variables se
  // sustituyen por su valor durante el build, así que aceptarlas aquí haría que
  // esta comprobación pasara mirando una constante horneada en la imagen en vez
  // del entorno del contenedor — justo el fallo que esta validación existe para
  // detectar. Ver el comentario largo en `middleware.ts`.
  APP_URL: z.string().url("APP_URL debe ser una URL absoluta (https://...)"),
  APP_DOMAIN: z.string().min(1, "APP_DOMAIN es obligatoria"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET debe tener al menos 32 caracteres"),
});

let validated = false;

export function assertCriticalServerEnv(): void {
  if (validated) return;

  // Saltar durante `next build`: el binario construye el bundle sin las
  // variables de runtime — sólo importa módulos y recopila page data.
  // El assertion debe correr al arrancar el container, no al armar la
  // imagen. `NEXT_PHASE` lo setea Next.js automáticamente.
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  validated = true;

  // Coherencia del almacenamiento confidencial. No entra en `CriticalEnvSchema`
  // a propósito: el comentario de arriba dice que las llaves de servicios
  // opcionales se validan en su propio módulo si se usan. Aquí sólo se AVISA —
  // nada de esto puede impedir que la aplicación arranque.
  //
  // La asimetría es deliberada: `R2_BUCKET` es el interruptor. Sin ella la app
  // usa disco y las otras tres sobran — ése es el rollback de R2-04, un solo
  // cambio de variable. Con ella, las cuatro son obligatorias para que el backend
  // sea R2, y quien lo hace cumplir es `storePrivateFile`, que rechaza la
  // escritura antes que degradar a disco en silencio (plan 02-02).
  if (process.env.R2_BUCKET) {
    const missing = missingR2Env();
    if (missing.length > 0) {
      // Sin guarda de `NODE_ENV`: una configuración parcial de R2 no es nunca
      // intencional. En desarrollo y en CI no hay ninguna variable R2 puesta, así
      // que este camino ni se toca allí.
      console.warn(
        `[env] Configuración de R2 incompleta: R2_BUCKET está definida pero faltan ${missing.join(", ")}. ` +
          `La aplicación arranca en modo disco y RECHAZARÁ las subidas de archivos ` +
          `confidenciales hasta que se completen. Quita R2_BUCKET si el disco es lo que quieres.`,
      );
    }
  } else if (
    process.env.NODE_ENV === "production" &&
    !process.env.PRIVATE_UPLOAD_DIR
  ) {
    // Ni bucket ni volumen: los archivos confidenciales van a un directorio que
    // desaparece al recrear el contenedor. Espeja el aviso de
    // `warnedAboutPrivateDir` en `lib/upload-paths.ts`; aquí no hace falta su
    // propio flag anti-repetición porque `validated` ya protege toda la función.
    console.warn(
      `[env] Sin R2_BUCKET ni PRIVATE_UPLOAD_DIR: las evidencias van a un ` +
        `directorio no persistente`,
    );
  }

  // `R2_KEY_PREFIX` mal escrito hace que `lib/document-storage.ts` lance al
  // importarse. Sin esta comprobación el contenedor arranca sano, pasa el
  // healthcheck, y sólo revienta cuando alguien abre una evidencia — con el
  // despliegue ya dado por bueno. Se valida aquí para que falle en el arranque,
  // que es donde alguien está mirando.
  const prefix = process.env.R2_KEY_PREFIX;
  if (prefix && !/^\/?[a-z0-9][a-z0-9-]*\/?$/.test(prefix.trim())) {
    const msg = `R2_KEY_PREFIX inválido: ${JSON.stringify(prefix)}. Se espera un segmento simple, p. ej. "prol" o "ibiza".`;
    if (process.env.NODE_ENV === "production") throw new Error(msg);
    console.warn(`[env] ${msg}`);
  }

  const result = CriticalEnvSchema.safeParse(process.env);
  if (result.success) return;

  const issues = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  const message = `Configuración de entorno inválida:\n${issues}\nRevisa el archivo de entorno de la instancia (producción) o .env (local).`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(`[env] ${message}`);
}
