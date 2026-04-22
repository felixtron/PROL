import Link from "next/link";
import { Building2, AlertCircle, CheckCircle2, Clock } from "lucide-react";
import { getInvitationByToken } from "@/lib/queries/company";
import { getCurrentUser } from "@/lib/auth";
import { AcceptInvitationButton } from "./accept-button";

export const dynamic = "force-dynamic";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const [invitation, user] = await Promise.all([
    getInvitationByToken(token),
    getCurrentUser(),
  ]);

  // Invalid token
  if (!invitation) {
    return (
      <ErrorCard
        icon={AlertCircle}
        title="Invitación invalida"
        message="Este link de invitación no es válido o fue eliminado."
      />
    );
  }

  // Status checks
  if (invitation.status === "REVOKED") {
    return (
      <ErrorCard
        icon={AlertCircle}
        title="Invitación revocada"
        message="Esta invitación fue revocada. Pide al administrador que te envíe una nueva."
      />
    );
  }
  if (invitation.status === "ACCEPTED") {
    return (
      <ErrorCard
        icon={CheckCircle2}
        title="Ya aceptaste esta invitación"
        message={`Ya eres miembro de ${invitation.company.name}.`}
        ok
      />
    );
  }
  if (invitation.expiresAt < new Date()) {
    return (
      <ErrorCard
        icon={Clock}
        title="Invitación expirada"
        message="Pide al administrador de la empresa que te envíe una nueva invitación."
      />
    );
  }

  // Not authenticated — send to sign-up with email pre-filled, redirect back here.
  if (!user) {
    const callback = `/invite/${token}`;
    const signUpUrl = `/sign-up?email=${encodeURIComponent(invitation.email)}&callbackUrl=${encodeURIComponent(callback)}`;
    return (
      <Card>
        <Header
          title={`Te invitaron a ${invitation.company.name}`}
          subtitle={invitation.company.tenant.name}
        />
        <div className="space-y-4 px-6 pb-6">
          <p className="text-sm text-text-secondary">
            Para aceptar esta invitación necesitas crear una cuenta o iniciar sesión
            con el email <strong>{invitation.email}</strong>.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <Link
              href={signUpUrl}
              className="rounded-lg bg-primary-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-primary-700"
            >
              Crear cuenta
            </Link>
            <Link
              href={`/sign-in?callbackUrl=${encodeURIComponent(callback)}`}
              className="rounded-lg border border-border px-4 py-2.5 text-center text-sm font-semibold text-text-primary transition-colors hover:bg-surface-secondary"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </Card>
    );
  }

  // Authenticated — but with a different email
  if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return (
      <Card>
        <Header
          title="Email diferente"
          subtitle={invitation.company.name}
        />
        <div className="space-y-4 px-6 pb-6">
          <p className="text-sm text-text-secondary">
            Esta invitación fue enviada a <strong>{invitation.email}</strong>, pero
            iniciaste sesión como <strong>{user.email}</strong>. Cierra sesión y
            entra con el email correcto.
          </p>
        </div>
      </Card>
    );
  }

  // Authenticated, matching email — show accept button
  return (
    <Card>
      <Header
        title={`Te invitaron a ${invitation.company.name}`}
        subtitle={invitation.company.tenant.name}
      />
      <div className="space-y-4 px-6 pb-6">
        <p className="text-sm text-text-secondary">
          {invitation.inviter.name ?? "Un miembro"} te invitó a unirte a{" "}
          <strong>{invitation.company.name}</strong>. Al aceptar tendrás acceso
          a los cursos asignados a esta empresa sin costo.
        </p>
        <AcceptInvitationButton token={token} />
      </div>
    </Card>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-12">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-surface shadow-sm">
        {children}
      </div>
    </div>
  );
}

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="border-b border-border bg-gradient-to-br from-primary-500 to-primary-700 px-6 py-8 text-center">
      <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-white/20">
        <Building2 className="h-6 w-6 text-white" />
      </div>
      <h1 className="font-heading text-xl font-bold text-white">{title}</h1>
      <p className="mt-1 text-sm text-white/80">{subtitle}</p>
    </div>
  );
}

function ErrorCard({
  icon: Icon,
  title,
  message,
  ok = false,
}: {
  icon: React.ElementType;
  title: string;
  message: string;
  ok?: boolean;
}) {
  return (
    <Card>
      <div className="px-6 py-8 text-center">
        <div
          className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
            ok ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
          }`}
        >
          <Icon className="h-7 w-7" />
        </div>
        <h1 className="font-heading text-xl font-bold text-text-primary">
          {title}
        </h1>
        <p className="mt-2 text-sm text-text-secondary">{message}</p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white"
        >
          Ir al inicio
        </Link>
      </div>
    </Card>
  );
}
