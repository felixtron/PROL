// Validación temprana de variables de entorno críticas. Se invoca una sola
// vez al primer import (lazy singleton). En producción lanza un error si
// falta o está mal formada una variable obligatoria — preferimos crashear
// el boot del contenedor con un mensaje claro que entregar páginas con
// callbacks rotos (links localhost en certificados, redirects de Stripe a
// "/dashboard/...", etc.). En desarrollo solo registra un aviso para
// permitir prototipar con `.env.local` incompleto.

import { z } from "zod";

// Variables que deben existir para que la app sea funcional en cualquier
// despliegue real. No incluye llaves de servicios opcionales (IA, Stripe,
// Cloudflare Stream, Resend) — esas están gateadas por feature flags o
// rutas específicas y se validan en su propio módulo si se usan.
const CriticalEnvSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL es obligatoria"),
  NEXT_PUBLIC_APP_URL: z
    .string()
    .url("NEXT_PUBLIC_APP_URL debe ser una URL absoluta (https://...)"),
  NEXT_PUBLIC_DOMAIN: z.string().min(1, "NEXT_PUBLIC_DOMAIN es obligatoria"),
  BETTER_AUTH_SECRET: z
    .string()
    .min(32, "BETTER_AUTH_SECRET debe tener al menos 32 caracteres"),
});

let validated = false;

export function assertCriticalServerEnv(): void {
  if (validated) return;
  validated = true;

  const result = CriticalEnvSchema.safeParse(process.env);
  if (result.success) return;

  const issues = result.error.issues
    .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  const message = `Configuración de entorno inválida:\n${issues}\nRevisa /opt/prol/.env (producción) o .env (local).`;

  if (process.env.NODE_ENV === "production") {
    throw new Error(message);
  }
  console.warn(`[env] ${message}`);
}
