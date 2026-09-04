import type { Metadata } from "next";
import Link from "next/link";
import { TenantBrand } from "@/components/tenant-brand";
import { BRAND_NAME } from "@/lib/brand";
import { TenantThemeStyle } from "@/components/tenant-theme";
import { getCurrentTenant } from "@/lib/tenant";
import { getCurrentUser } from "@/lib/auth";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  if (tenant) {
    return {
      title: `Cursos — ${tenant.name}`,
      icons: tenant.favicon ? { icon: tenant.favicon } : undefined,
    };
  }
  // `BRAND_NAME` y no "PROL" escrito a mano: esta rama es la que ve una
  // instancia dedicada mientras el tenant no resuelve, y con el literal
  // acababa poniendo la marca de otro en la pestaña del navegador.
  return { title: `Cursos — ${BRAND_NAME}` };
}

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();
  // El catálogo es público y se entra por él desde el dominio propio, así que
  // era la única pantalla con sesión iniciada sin ninguna salida hacia el
  // panel: había que escribir /dashboard a mano. `getCurrentUser` devuelve
  // null sin sesión, y no añade coste — la ruta ya era dinámica porque
  // `getCurrentTenant` lee la cabecera del tenant.
  const user = await getCurrentUser();

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <TenantThemeStyle
        primaryColor={tenant?.primaryColor}
        accentColor={tenant?.accentColor}
      />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/courses" className="flex items-center gap-2">
            <TenantBrand
              name={tenant?.name ?? BRAND_NAME}
              logo={tenant?.logo ?? null}
            />
          </Link>

          {user ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Mi panel
            </Link>
          ) : (
            <Link
              href="/sign-in"
              className="inline-flex items-center rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
            >
              Iniciar sesión
            </Link>
          )}
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
