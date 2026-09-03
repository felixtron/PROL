import { NextRequest, NextResponse } from "next/server";
import { db } from "@prol/db";
import { renderToStream } from "@react-pdf/renderer";
import QRCode from "qrcode";
import { getCurrentUser } from "@/lib/auth";
import { courseAccessWhere } from "@/lib/course-access";
import {
  buildVerificationUrl,
  generateCertificateFolio,
  canonicalCertificateString,
  sha256Hex,
} from "@/lib/certificates";
import {
  loadBundledCertAsset,
  loadUploadAsDataUrl,
} from "@/lib/certificate-assets";
import {
  isIbizaTenant,
  renderCertificate,
  resolveCertificateTemplate,
} from "@/lib/certificate-templates";
import { BRAND_NAME } from "@/lib/brand";

/**
 * Vista previa del diploma de un curso, con un alumno ficticio.
 *
 * Existe para que el profesor no tenga que esperar a que alguien apruebe
 * el examen final para descubrir cómo quedó su configuración. Los campos
 * llegan por query string —no de la base— para poder previsualizar lo que
 * hay escrito en el formulario antes de guardarlo; lo que no venga se
 * toma de lo ya guardado en el curso.
 *
 * No emite nada: no toca el contador de folios ni crea Certificate. El
 * folio y el hash son de muestra y el PDF lleva marca de agua.
 */
export async function GET(request: NextRequest) {
  try {
    // getCurrentUser en vez de requireUser: este ultimo lanza, y el catch de
    // abajo lo convertiria en un 500 con traza en los logs. Una peticion sin
    // sesion no es un fallo del servidor.
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const courseId = searchParams.get("courseId");

    if (!courseId) {
      return NextResponse.json({ error: "Falta courseId" }, { status: 400 });
    }

    // Mismo gate que el editor: dueño o colaborador del curso.
    const course = await db.course.findFirst({
      where: { id: courseId, ...courseAccessWhere(user.id) },
      select: {
        title: true,
        certificateTemplate: true,
        certificateCode: true,
        certificateCourseName: true,
        certificateDescription: true,
        certificateSignerName: true,
        professor: { select: { name: true } },
        tenant: {
          select: {
            name: true,
            slug: true,
            logo: true,
            contactEmail: true,
            certificatePrefix: true,
          },
        },
      },
    });

    if (!course) {
      return NextResponse.json({ error: "Curso no encontrado" }, { status: 404 });
    }

    // El override vacío ("") es intencional: significa "el profesor borró
    // este campo en el formulario", y debe previsualizarse como vacío en
    // vez de recuperar el valor guardado. Por eso se distingue de null.
    const override = (key: string) => {
      const raw = searchParams.get(key);
      return raw === null ? null : raw.trim();
    };
    const pick = (key: string, stored: string | null) => {
      const o = override(key);
      return (o === null ? stored?.trim() || null : o || null);
    };

    const professorName = course.professor.name ?? "Profesor";
    const templateId = resolveCertificateTemplate(
      override("template") ?? course.certificateTemplate,
      course.tenant
    );
    const courseName =
      pick("name", course.certificateCourseName) ?? course.title;
    const description =
      pick("description", course.certificateDescription) ??
      `Curso impartido por ${professorName}.`;
    const signerName =
      pick("signer", course.certificateSignerName) ?? course.tenant.name;

    const studentName = "Nombre del Alumno";
    const issuedAt = new Date();
    const folio = generateCertificateFolio(
      course.tenant.certificatePrefix ?? BRAND_NAME,
      issuedAt.getUTCFullYear(),
      0
    );
    const verificationUrl = buildVerificationUrl(folio);
    const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
      width: 360,
      margin: 1,
      color: { dark: "#1e293b", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
    });

    const ibizaBranding = isIbizaTenant(course.tenant);
    const brandLogoDataUrl = ibizaBranding
      ? ((await loadBundledCertAsset("ibiza-white.png", "image/png")) ??
        (await loadUploadAsDataUrl(course.tenant.logo)))
      : await loadUploadAsDataUrl(course.tenant.logo);
    const signatureDataUrl = ibizaBranding
      ? await loadBundledCertAsset("firma-diploma.png", "image/png")
      : null;

    const pdf = renderCertificate(templateId, {
      tenantName: course.tenant.name,
      studentName,
      courseCode: pick("code", course.certificateCode),
      courseName,
      description,
      professorName,
      signerName,
      signatureDataUrl,
      brandLogoDataUrl,
      folio,
      sha256: sha256Hex(
        canonicalCertificateString({
          folio,
          studentName,
          courseName,
          professorName,
          tenantName: course.tenant.name,
          issuedAt,
        })
      ),
      issuedAt,
      verificationUrl,
      qrDataUrl,
      finalScore: 100,
      verifyEmail: course.tenant.contactEmail ?? "asesoria@ibizabmb.com",
      isRevoked: false,
      // Deja claro que esta hoja no acredita nada aunque alguien la
      // imprima o la reenvíe: el folio y el QR son de muestra y no
      // resuelven a ningún certificado emitido.
      watermark: "VISTA PREVIA",
    });

    const stream = await renderToStream(pdf);

    return new NextResponse(stream as unknown as ReadableStream, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'inline; filename="vista-previa-diploma.pdf"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Error generating certificate preview:", error);
    return NextResponse.json(
      { error: "Error al generar la vista previa" },
      { status: 500 }
    );
  }
}
