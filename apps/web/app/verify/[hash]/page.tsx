import { db } from "@prol/db";
import { Award, CheckCircle2, Download, Calendar, Hash } from "lucide-react";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Verificar Certificado — PROL",
  description: "Verifica la autenticidad de un certificado emitido por PROL",
};

interface PageProps {
  params: Promise<{
    hash: string;
  }>;
}

export default async function VerifyCertificatePage({ params }: PageProps) {
  const { hash } = await params;

  // Look up the certificate by hash (public access, no auth required)
  const certificate = await db.certificate.findUnique({
    where: { hash },
    include: {
      tenant: {
        select: {
          name: true,
          logo: true,
        },
      },
    },
  });

  // Certificate not found
  if (!certificate) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-12">
        <div className="w-full max-w-md">
          <div className="rounded-2xl bg-surface p-8 text-center shadow-lg">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
              <Award className="h-8 w-8 text-red-600" />
            </div>

            <h1 className="mb-2 font-heading text-2xl font-bold text-text-primary">
              Certificado no encontrado
            </h1>

            <p className="text-sm text-text-secondary">
              No se encontro ningun certificado con el ID proporcionado. Verifica que el
              enlace sea correcto.
            </p>

            <div className="mt-6">
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Format the issue date
  const issuedDate = new Date(certificate.issuedAt).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Certificate found - show verification card
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-secondary px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Success Icon */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-text-primary">
            Certificado Verificado
          </h1>
          <p className="mt-2 text-sm text-text-secondary">
            Este certificado es autentico y fue emitido por {certificate.tenant.name}
          </p>
        </div>

        {/* Certificate Details Card */}
        <div className="overflow-hidden rounded-2xl bg-surface shadow-lg">
          {/* Header */}
          <div className="bg-gradient-to-br from-primary-500 to-primary-700 px-8 py-6 text-center">
            <Award className="mx-auto mb-3 h-12 w-12 text-white/90" />
            <h2 className="text-sm font-medium uppercase tracking-wider text-white/80">
              Certificado de Finalizacion
            </h2>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Student Name */}
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Otorgado a
              </p>
              <p className="font-heading text-2xl font-bold text-text-primary">
                {certificate.studentName}
              </p>
            </div>

            {/* Course Name */}
            <div className="mb-6 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Por completar el curso
              </p>
              <p className="text-xl font-semibold text-primary-600">
                {certificate.courseName}
              </p>
            </div>

            {/* Professor */}
            <div className="mb-8 text-center">
              <p className="mb-1 text-xs font-medium uppercase tracking-wide text-text-tertiary">
                Impartido por
              </p>
              <p className="text-base font-medium text-text-secondary">
                {certificate.professorName}
              </p>
            </div>

            {/* Divider */}
            <div className="mb-6 border-t border-border" />

            {/* Metadata */}
            <div className="space-y-4">
              {/* Issue Date */}
              <div className="flex items-start gap-3">
                <Calendar className="mt-0.5 h-5 w-5 text-text-tertiary" />
                <div>
                  <p className="text-xs font-medium text-text-tertiary">
                    Fecha de emision
                  </p>
                  <p className="text-sm font-medium text-text-secondary">
                    {issuedDate}
                  </p>
                </div>
              </div>

              {/* Certificate Hash */}
              <div className="flex items-start gap-3">
                <Hash className="mt-0.5 h-5 w-5 text-text-tertiary" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-text-tertiary">
                    ID del certificado
                  </p>
                  <p className="break-all font-mono text-sm font-medium text-text-secondary">
                    {certificate.hash}
                  </p>
                </div>
              </div>

              {/* Issuing Organization */}
              <div className="flex items-start gap-3">
                <Award className="mt-0.5 h-5 w-5 text-text-tertiary" />
                <div>
                  <p className="text-xs font-medium text-text-tertiary">
                    Emitido por
                  </p>
                  <p className="text-sm font-medium text-text-secondary">
                    {certificate.tenant.name}
                  </p>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <div className="mt-8">
              <a
                href={`/api/certificates/${certificate.id}/pdf`}
                download={`certificado-${certificate.hash}.pdf`}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
              >
                <Download className="h-4 w-4" />
                Descargar Certificado PDF
              </a>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <p className="mt-6 text-center text-xs text-text-tertiary">
          Este certificado puede ser verificado en cualquier momento usando el ID unico
          proporcionado arriba.
        </p>
      </div>
    </div>
  );
}
