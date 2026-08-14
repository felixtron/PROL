/**
 * Catálogo de plantillas de diploma.
 *
 * Deliberadamente sin imports de @react-pdf/renderer: este módulo lo
 * consume también el editor de cursos, que es un componente cliente, y
 * arrastrar el renderer de PDF al bundle del navegador costaría cientos
 * de KB para pintar un <select>.
 */

export const CERTIFICATE_TEMPLATE_IDS = ["IBIZA", "CLASSIC"] as const;

export type CertificateTemplateId = (typeof CERTIFICATE_TEMPLATE_IDS)[number];

export interface CertificateTemplateInfo {
  id: CertificateTemplateId;
  label: string;
  description: string;
}

export const CERTIFICATE_TEMPLATES: CertificateTemplateInfo[] = [
  {
    id: "IBIZA",
    label: "IBIZA — vertical",
    description:
      "Hoja vertical con papel de seguridad, franja azul, código de norma sobre el nombre de la formación y bloque de firma autorizada.",
  },
  {
    id: "CLASSIC",
    label: "Clásica — horizontal",
    description:
      "Hoja horizontal con doble marco, calificación final del examen y el hash SHA-256 impreso junto al folio.",
  },
];

export function isCertificateTemplateId(
  value: unknown
): value is CertificateTemplateId {
  return (
    typeof value === "string" &&
    (CERTIFICATE_TEMPLATE_IDS as readonly string[]).includes(value)
  );
}

/**
 * Reconoce al tenant de IBIZA, que tiene logo y firma propios bundled en
 * el repo.
 *
 * El match NO puede ser un slug exacto: bastaba con que el tenant se
 * diera de alta (o se renombrara) con un slug distinto a
 * "ibiza-consultores" para que TODOS sus diplomas cayeran en silencio al
 * formato genérico, que es justo lo que pasó. Se compara contra slug y
 * nombre normalizados para que cualquier variante (ibiza, ibiza-bmb,
 * "IBIZA Consultores"…) reciba el mismo trato.
 */
export function isIbizaTenant(tenant: {
  name?: string | null;
  slug?: string | null;
}): boolean {
  const norm = (v: string | null | undefined) =>
    (v ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  return (
    norm(tenant.slug).includes("ibiza") || norm(tenant.name).includes("ibiza")
  );
}

/**
 * Decide qué plantilla imprimir.
 *
 * `explicit` es lo que eligió el profesor (en el curso, o congelado en el
 * certificado al emitirlo). Cuando no hay elección se cae al criterio
 * histórico por tenant, que es lo único que existía antes de que esto
 * fuera configurable: así los cursos y los diplomas ya emitidos siguen
 * saliendo con el mismo diseño de siempre.
 */
export function resolveCertificateTemplate(
  explicit: string | null | undefined,
  tenant: { name?: string | null; slug?: string | null }
): CertificateTemplateId {
  if (isCertificateTemplateId(explicit)) return explicit;
  return isIbizaTenant(tenant) ? "IBIZA" : "CLASSIC";
}
