import { db } from "@prol/db";
import { getCurrentUser, requireTenantAdmin } from "@/lib/auth";
import { getConnectAccountStatus } from "@/lib/actions/payment";
import { ProfileForm } from "@/components/profile-form";
import { BrandingForm } from "./branding-form";
import { StripeConnectSection } from "./stripe-connect-section";
import { TenantAdminSignOutButton } from "./sign-out-button";

export default async function TenantAdminSettingsPage() {
  const user = await getCurrentUser();
  const admin = await requireTenantAdmin();
  const stripeStatus = await getConnectAccountStatus();

  const tenant = admin.tenantId
    ? await db.tenant.findUnique({
        where: { id: admin.tenantId },
        select: {
          id: true,
          name: true,
          logo: true,
          primaryColor: true,
          accentColor: true,
        },
      })
    : null;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Configuración
        </h1>
        <p className="mt-1 text-text-secondary">
          Administra tu perfil y la marca de tu academia.
        </p>
      </div>

      {tenant && (
        <section>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Marca de la academia
          </h2>
          <BrandingForm
            tenantName={tenant.name}
            initialName={tenant.name}
            initialLogo={tenant.logo}
            initialPrimaryColor={tenant.primaryColor}
            initialAccentColor={tenant.accentColor}
          />
        </section>
      )}

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Pagos (Stripe Connect)
        </h2>
        <StripeConnectSection status={stripeStatus} />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Perfil
        </h2>
        <ProfileForm
          initialName={user?.name ?? ""}
          initialAvatar={user?.avatar ?? null}
          email={user?.email ?? ""}
        />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Sesión
        </h2>
        <div className="rounded-xl border border-border bg-surface p-6 shadow-sm">
          <p className="text-sm text-text-secondary">
            Cierra tu sesión en este dispositivo.
          </p>
          <div className="mt-3">
            <TenantAdminSignOutButton />
          </div>
        </div>
      </section>
    </div>
  );
}
