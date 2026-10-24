import { db } from "@prol/db";
import {
  STUDENT_TOOLS,
  parseStudentToolPreferences,
  type StudentToolDefinition,
} from "@prol/shared";
import { getCurrentUser, requireTenantAdmin } from "@/lib/auth";
import { getConnectAccountStatus } from "@/lib/actions/payment";
import { getGoogleMeetStatus } from "@/lib/actions/google-integration";
import { ProfileForm } from "@/components/profile-form";
import { BrandingForm } from "./branding-form";
import { DocumentsMenuLabelForm } from "./documents-menu-label-form";
import { StripeConnectSection } from "./stripe-connect-section";
import { GoogleMeetSection } from "./google-meet-section";
import { ProfessorModeSwitch } from "./professor-mode-switch";
import { StudentToolsForm, type StudentToolRow } from "./student-tools-form";
import { TenantAdminSignOutButton } from "./sign-out-button";

function toolHint(
  tool: StudentToolDefinition,
  tenant: {
    documentsEnabled: boolean;
    advisoryEnabled: boolean;
    surveysEnabled: boolean;
  },
): string | null {
  const notes: string[] = [];
  if (tool.requiresModule === "documents" && !tenant.documentsEnabled) {
    notes.push("El módulo documental de la academia está apagado.");
  }
  if (tool.requiresModule === "advisory" && !tenant.advisoryEnabled) {
    notes.push("La consultoría online de la academia está apagada.");
  }
  if (tool.requiresModule === "surveys" && !tenant.surveysEnabled) {
    notes.push("Las encuestas de la academia están apagadas.");
  }
  if (tool.requiresCompany) {
    notes.push("Sólo la ven los alumnos que pertenecen a una empresa.");
  }
  return notes.length > 0 ? notes.join(" ") : null;
}

export default async function TenantAdminSettingsPage() {
  const user = await getCurrentUser();
  const admin = await requireTenantAdmin();
  const stripeStatus = await getConnectAccountStatus();
  const googleMeetStatus = await getGoogleMeetStatus();

  const tenant = admin.tenantId
    ? await db.tenant.findUnique({
        where: { id: admin.tenantId },
        select: {
          id: true,
          name: true,
          logo: true,
          primaryColor: true,
          accentColor: true,
          documentsEnabled: true,
          documentsMenuLabel: true,
          advisoryEnabled: true,
          surveysEnabled: true,
          studentTools: true,
        },
      })
    : null;

  const preferences = parseStudentToolPreferences(tenant?.studentTools);
  const studentToolRows: StudentToolRow[] = tenant
    ? STUDENT_TOOLS.map((tool) => ({
        id: tool.id,
        label: tool.label,
        description: tool.description,
        enabled: preferences[tool.id] !== false,
        hint: toolHint(tool, tenant),
      }))
    : [];

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Configuración
        </h1>
        <p className="mt-1 text-text-secondary">
          Administra tu perfil, la marca de tu academia y lo que ve el alumno.
        </p>
      </div>

      {user?.role === "ADMIN" ? (
        <ProfessorModeSwitch enabled={Boolean(user.professorModeEnabled)} />
      ) : null}

      {tenant ? <StudentToolsForm tools={studentToolRows} /> : null}

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

      {tenant?.documentsEnabled ? (
        <section>
          <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
            Menú de gestión documental
          </h2>
          <DocumentsMenuLabelForm initialLabel={tenant.documentsMenuLabel} />
        </section>
      ) : null}

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Pagos (Stripe Connect)
        </h2>
        <StripeConnectSection status={stripeStatus} />
      </section>

      <section>
        <h2 className="mb-3 font-heading text-sm font-semibold uppercase tracking-wider text-text-tertiary">
          Sesiones virtuales
        </h2>
        <GoogleMeetSection status={googleMeetStatus} />
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
