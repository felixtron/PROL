import type { Metadata } from "next";
import Link from "next/link";
import { TenantBrand } from "@/components/tenant-brand";
import { TenantThemeStyle } from "@/components/tenant-theme";
import { getCurrentTenant } from "@/lib/tenant";

export async function generateMetadata(): Promise<Metadata> {
  const tenant = await getCurrentTenant();
  if (tenant) {
    return {
      title: `Cursos — ${tenant.name}`,
      icons: tenant.favicon ? { icon: tenant.favicon } : undefined,
    };
  }
  return { title: "Cursos — PROL" };
}

export default async function CoursesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const tenant = await getCurrentTenant();

  return (
    <div className="min-h-dvh bg-surface-secondary">
      <TenantThemeStyle
        primaryColor={tenant?.primaryColor}
        accentColor={tenant?.accentColor}
      />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 sm:px-6 lg:px-8">
          <Link href="/courses" className="flex items-center gap-2">
            <TenantBrand
              name={tenant?.name ?? "PROL"}
              logo={tenant?.logo ?? null}
            />
          </Link>
        </div>
      </header>
      <main>{children}</main>
    </div>
  );
}
