import type { Metadata } from "next";
import { getCurrentTenant } from "@/lib/tenant";
import { SignInForm } from "./sign-in-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  if (tenant) {
    return {
      title: `Iniciar sesión — ${tenant.name}`,
      icons: tenant.favicon ? { icon: tenant.favicon } : undefined,
    };
  }
  return { title: "Iniciar sesión — PROL" };
}

/**
 * Tenant-branded sign-in page.
 *
 * Visiting `<slug>.prol.prosuite.pro/sign-in` resolves the tenant via the
 * `x-tenant-slug` header set by `middleware.ts`. The form is then rendered
 * with the academy's logo (or name), primary color and accent color so
 * students of each tenant see their own academy when logging in. Visiting
 * the apex `prol.prosuite.pro/sign-in` falls back to plain PROL branding.
 */
export default async function SignInPage() {
  const tenant = await getCurrentTenant();
  return (
    <SignInForm
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
