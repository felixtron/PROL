import { db } from "@prol/db";
import {
  Award,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Download,
  Hash,
  Calendar,
  Shield,
  Building2,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar Certificado - PROL",
  description: "Verifica la autenticidad de un certificado emitido por PROL",
};

interface PageProps {
  params: Promise<{ code: string }>;
}

const statusConfig = {
  ACTIVE: {
    icon: CheckCircle2,
    label: "Certificado Valido",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    description: "Este certificado es autentico y se encuentra vigente.",
  },
  REVOKED: {
    icon: XCircle,
    label: "Certificado Revocado",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    description: "Este certificado fue revocado por la academia emisora.",
  },
  EXPIRED: {
    icon: AlertTriangle,
    label: "Certificado Expirado",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    description: "Este certificado fue valido pero su vigencia ha terminado.",
  },
} as const;

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { code } = await params;

  // Look up by folio first (public, readable), fallback to hash for
  // backwards-compat with older certs.
  const certificate =
    (await db.certificate.findUnique({
      where: { folio: code },
      include: { tenant: { select: { name: true, logo: true } } },
    })) ??
    (await db.certificate.findUnique({
      where: { hash: code },
      include: { tenant: { select: { name: true, logo: true } } },
    }));

  if (!certificate) {
    return <NotFoundCard />;
  }

  const config = statusConfig[certificate.status];
  const StatusIcon = config.icon;

  return (
    <div className="min-h-screen bg-surface-secondary px-4 py-12">
      <div className="mx-auto max-w-xl">
        {/* Brand header */}
        <div className="text-center">
          <Link
            href="/"
            className="font-heading text-2xl font-bold text-primary-600"
          >
            PROL
          </Link>
          <div className="mt-3 flex items-center justify-center gap-2 text-sm text-text-tertiary">
            <Shield className="h-4 w-4" />
            Sistema de Verificación de Certificados
          </div>
        </div>

        {/* Status card */}
        <div
          className={`mt-8 rounded-2xl border-2 ${config.border} ${config.bg} p-8 text-center`}
        >
          <StatusIcon className={`mx-auto h-16 w-16 ${config.color}`} />
          <h1 className={`mt-4 font-heading text-2xl font-bold ${config.color}`}>
            {config.label}
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            {config.description}
          </p>
        </div>

        {/* Certificate details */}
        <div className="mt-6 overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 px-8 py-6 text-center">
            <Award className="mx-auto mb-3 h-12 w-12 text-white/90" />
            <h2 className="text-xs font-medium uppercase tracking-wider text-white/80">
              Certificado de Finalizacion
            </h2>
          </div>

          <div className="p-6">
            {/* Student */}
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Otorgado a
              </p>
              <p className="font-heading text-xl font-bold text-text-primary">
                {certificate.studentName}
              </p>
            </div>

            {/* Course */}
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Por completar el curso
              </p>
              <p className="text-lg font-semibold text-primary-600">
                {certificate.courseName}
              </p>
              {certificate.finalExamScore !== null && (
                <p className="mt-2 inline-flex items-center rounded-pill bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  Examen final: {certificate.finalExamScore}%
                </p>
              )}
            </div>

            {/* Professor */}
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Impartido por
              </p>
              <p className="text-base font-medium text-text-secondary">
                {certificate.professorName}
              </p>
            </div>

            <div className="mb-5 border-t border-border" />

            {/* Metadata */}
            <div className="space-y-3">
              <DetailRow
                icon={Hash}
                label="Folio"
                value={certificate.folio}
                mono
              />
              <DetailRow
                icon={Calendar}
                label="Fecha de emision"
                value={formatDate(certificate.issuedAt)}
              />
              <DetailRow
                icon={Building2}
                label="Emitido por"
                value={certificate.tenant.name}
              />
              {certificate.revokedAt && (
                <DetailRow
                  icon={XCircle}
                  label="Revocado el"
                  value={formatDate(certificate.revokedAt)}
                  danger
                />
              )}
              {certificate.revokedReason && (
                <DetailRow
                  icon={AlertTriangle}
                  label="Razon de revocacion"
                  value={certificate.revokedReason}
                  danger
                />
              )}
            </div>

            {/* SHA-256 */}
            <div className="mt-6 border-t border-border pt-4">
              <p className="text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Hash SHA-256 del documento
              </p>
              <p className="mt-1 break-all font-mono text-[10px] text-text-tertiary">
                {certificate.sha256}
              </p>
            </div>

            {/* Download */}
            {certificate.status === "ACTIVE" && (
              <div className="mt-6">
                <a
                  href={`/api/certificates/${certificate.id}/pdf`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                >
                  <Download className="h-4 w-4" />
                  Descargar certificado PDF
                </a>
              </div>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-text-tertiary">
          Verificación realizada el{" "}
          {formatDate(new Date())} a las{" "}
          {new Date().toLocaleTimeString("es-MX", {
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "America/Mexico_City",
          })}{" "}
          hrs
        </p>
      </div>
    </div>
  );
}

function DetailRow({
  icon: Icon,
  label,
  value,
  mono,
  danger,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
  danger?: boolean;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon
        className={`mt-0.5 h-4 w-4 ${danger ? "text-red-600" : "text-text-tertiary"}`}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-text-tertiary">{label}</p>
        <p
          className={`text-sm font-medium ${mono ? "font-mono" : ""} ${
            danger ? "text-red-700" : "text-text-secondary"
          }`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

function NotFoundCard() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-12">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <XCircle className="h-8 w-8 text-red-600" />
          </div>
          <h1 className="font-heading text-2xl font-bold text-text-primary">
            Certificado no encontrado
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            No se encontro ningun certificado con el identificador proporcionado.
            Verifica que el link sea correcto.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary-700"
          >
            <GraduationCap className="h-4 w-4" />
            Ir al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
