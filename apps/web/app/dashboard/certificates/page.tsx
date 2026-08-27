import Link from "next/link";
import { Award, Download, ExternalLink, FileText, Printer } from "lucide-react";
import { db } from "@prol/db";
import { requireUser } from "@/lib/auth";
import { getMyDc3Panel } from "@/lib/queries/dc3";

export default async function CertificatesPage() {
  const user = await requireUser();

  const [certificates, dc3Panel] = await Promise.all([
    db.certificate.findMany({
      where: {
        enrollment: { studentId: user.id },
      },
      include: {
        enrollment: {
          include: {
            course: { select: { title: true, thumbnail: true } },
          },
        },
      },
      orderBy: { issuedAt: "desc" },
    }),
    getMyDc3Panel(),
  ]);

  // El DC-3 se ofrece junto al diploma, no en una pantalla aparte: es el
  // mismo momento (acabo el curso, quiero mis papeles). La emisión sigue
  // pasando por /dashboard/dc3, que es donde vive la leyenda de
  // responsabilidad que hay que leer antes de imprimir.
  const dc3ByEnrollment = new Map(
    dc3Panel.rows
      .filter((row) => row.readiness.applicable)
      .map((row) => [row.enrollmentId, row])
  );

  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3 md:mb-6">
        <div>
          <h1 className="font-heading text-xl font-bold text-text-primary md:text-2xl">
            Mis Certificados
          </h1>
          <p className="mt-0.5 text-sm text-text-secondary">
            Certificados obtenidos al completar tus cursos.
          </p>
        </div>
        {dc3Panel.profile?.company && (
          <Link
            href="/dashboard/dc3"
            className="inline-flex items-center gap-2 rounded-lg border border-border px-3.5 py-2 text-xs font-medium text-text-secondary active:bg-surface-secondary md:text-sm"
          >
            <FileText className="h-4 w-4" />
            Constancias DC-3
          </Link>
        )}
      </div>

      {/* Certificates */}
      {certificates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-surface p-8 text-center md:p-12">
          <Award className="mx-auto h-8 w-8 text-text-tertiary md:h-10 md:w-10" />
          <p className="mt-2 text-sm font-medium text-text-secondary">
            Aún no tienes certificados
          </p>
          <p className="mt-1 text-xs text-text-tertiary">
            Completa un curso para obtener tu primer certificado.
          </p>
          <Link
            href="/dashboard/courses"
            className="mt-3 inline-flex items-center gap-2 rounded-lg bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm active:bg-primary-800"
          >
            Ir a Mis Cursos
          </Link>
        </div>
      ) : (
        <div className="space-y-3 md:grid md:grid-cols-2 md:gap-5 md:space-y-0 lg:grid-cols-3">
          {certificates.map((cert) => {
            const course = cert.enrollment.course;
            const dc3Row = dc3ByEnrollment.get(cert.enrollmentId);
            const issuedDate = new Date(cert.issuedAt).toLocaleDateString(
              "es-MX",
              { year: "numeric", month: "long", day: "numeric" },
            );

            return (
              <div
                key={cert.id}
                className="overflow-hidden rounded-xl bg-surface shadow-sm"
              >
                {/* Thumbnail / Gradient */}
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="h-32 w-full object-cover md:h-36"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-gradient-to-br from-primary-500 to-primary-700 md:h-36">
                    <Award className="h-10 w-10 text-white/80" />
                  </div>
                )}

                {/* Content */}
                <div className="p-4 md:p-5">
                  <h3 className="text-sm font-semibold text-text-primary md:font-heading md:text-base">
                    {course.title}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-tertiary md:mt-1 md:text-sm">
                    Emitido el {issuedDate}
                  </p>

                  {/* Certificate Hash */}
                  <div className="mt-2.5 rounded-lg bg-surface-secondary px-3 py-2 md:mt-3">
                    <p className="text-[10px] text-text-tertiary md:text-xs">
                      ID del certificado
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-text-secondary md:text-xs">
                      {cert.hash}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex items-center gap-2 md:mt-4 md:gap-3">
                    <a
                      href={`/api/certificates/${cert.id}/pdf`}
                      download={`certificado-${cert.hash}.pdf`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm active:bg-primary-800 md:text-sm"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Descargar
                    </a>
                    <Link
                      href={`/verify/${cert.hash}`}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary active:bg-surface-secondary transition-colors md:text-sm"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                      Verificar
                    </Link>
                  </div>

                  {/* Constancia DC-3, sólo para quien la tiene disponible */}
                  {dc3Row && (
                    <div className="mt-2.5 border-t border-border pt-2.5">
                      {dc3Row.dc3 ? (
                        <a
                          href={`/api/dc3/${dc3Row.dc3.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary active:bg-surface-secondary md:text-sm"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Imprimir DC-3
                        </a>
                      ) : (
                        <Link
                          href="/dashboard/dc3"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs font-medium text-text-secondary active:bg-surface-secondary md:text-sm"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          {dc3Row.readiness.ready
                            ? "Generar DC-3"
                            : "Completar datos del DC-3"}
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
