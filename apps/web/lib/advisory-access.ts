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
 * La excepción es el SUPER_ADMIN de plataforma, que opera por encima de los
 * tenants. Se comprueba por ROL y no por `tenantId` vacío: hay usuarios sin
 * academia asignada que no son superadmins (altas a medio terminar), y con
 * el chequeo anterior les quedaba el módulo habilitado.
 */
export async function isAdvisoryEnabled(
  user: { tenantId: string | null | undefined; role: string },
): Promise<boolean> {
  if (user.role === "SUPER_ADMIN") return true;
  if (!user.tenantId) return false;
  const tenant = await db.tenant.findUnique({
    where: { id: user.tenantId },
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
  if (!(await isAdvisoryEnabled(user))) {
    redirect(redirectTo);
  }
}
