// Gate del módulo de Consultoría Online. El acceso se controla por tenant
// con el flag `Tenant.advisoryEnabled`, que el superusuario activa o
// desactiva desde /admin/tenants. Se centraliza aquí para que las páginas
// (redirect) y las server actions (error) apliquen la misma regla.

import { redirect } from "next/navigation";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";

/**
 * ¿El tenant tiene habilitada la Consultoría Online?
 *
 * Sin `tenantId` (p. ej. un SUPER_ADMIN de plataforma) no hay tenant al que
 * aplicar el flag, así que no se bloquea.
 */
export async function isAdvisoryEnabled(
  tenantId: string | null | undefined,
): Promise<boolean> {
  if (!tenantId) return true;
  const tenant = await db.tenant.findUnique({
    where: { id: tenantId },
    select: { advisoryEnabled: true },
  });
  return tenant?.advisoryEnabled ?? false;
}

export const ADVISORY_DISABLED_ERROR =
  "Consultoría Online no está habilitada para tu academia.";

/**
 * Para páginas: si el tenant no tiene el módulo habilitado, saca al usuario
 * a `redirectTo` en vez de mostrar una sección que ya no le corresponde.
 */
export async function requireAdvisoryEnabled(redirectTo: string): Promise<void> {
  const user = await requireUser();
  if (!(await isAdvisoryEnabled(user.tenantId))) {
    redirect(redirectTo);
  }
}
