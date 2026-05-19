import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/tenant";
import { SignUpForm } from "./sign-up-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  if (tenant) {
    return {
      title: `Crear cuenta — ${tenant.name}`,
      icons: tenant.favicon ? { icon: tenant.favicon } : undefined,
    };
  }
  return { title: "Crear cuenta — PROL" };
}

/**
 * Tenant-branded sign-up page.
 *
 * Visitar `<slug>.prol.prosuite.pro/sign-up` resuelve el tenant via el header
 * `x-tenant-slug` puesto por `middleware.ts`. El form se renderiza con logo,
 * primaryColor y accentColor del tenant. El hook `databaseHooks.user.create.before`
 * en `lib/auth.ts` además ata el user al tenant durante el sign-up — el visitante
 * que llega de bmb.mx termina como STUDENT del tenant Ibiza sin pasos extra.
 */
export default async function SignUpPage() {
  const tenant = await getCurrentTenant();
  return (
    <SignUpForm
      tenant={
        tenant
          ? {
              name: tenant.name,
              logo: tenant.logo,
              primaryColor: tenant.primaryColor,
              accentColor: tenant.accentColor,
            }
          : null
      }
    />
  );
}
