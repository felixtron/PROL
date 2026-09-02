import type { PrismaClient } from "@prisma/client";

export interface DocumentFixtureIds {
  tenantId: string;
  manualId: string;
  chapterId: string;
  sectionId: string;
  documentId: string;
  companies: { id: string; name: string; slug: string; assignmentId: string }[];
  leaderUserId: string;
}

/** SVG de marca en línea, como data-URI: sin archivo en disco, sin red. */
function brandLogo(bg: string, initials: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64"><rect width="64" height="64" rx="8" fill="${bg}"/><text x="32" y="41" font-family="sans-serif" font-size="24" font-weight="bold" fill="#ffffff" text-anchor="middle">${initials}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

/** Cuerpo del `ManualDocument` de ejemplo: en el dialecto que sobrevive a
 * `sanitizeManualHtml` (h2-h4, p, ul/li, table con thead/tbody). Sin `<h1>`,
 * sin `style=`, sin `<script>`. La tabla importa: es lo que los planes 03-06
 * y 03-07 enseñan en pantalla. */
const PROCEDURE_BODY = `
<h2>Objetivo</h2>
<p>Establecer el método para identificar, revisar, aprobar y controlar los documentos del sistema de gestión, de modo que las versiones vigentes estén disponibles donde se necesitan y las obsoletas no se usen por error.</p>
<h2>Alcance</h2>
<p>Aplica a todos los documentos internos del sistema de gestión de calidad: manuales, procedimientos y registros.</p>
<h2>Responsabilidades</h2>
<ul>
  <li>El responsable de calidad revisa y aprueba cada documento antes de su publicación.</li>
  <li>Cada líder de área controla la distribución de los documentos vigentes en su área.</li>
  <li>Todo el personal reporta los documentos obsoletos que sigan circulando.</li>
</ul>
<h2>Control de cambios</h2>
<table>
  <thead>
    <tr><th>Versión</th><th>Fecha</th><th colspan="2">Descripción del cambio</th></tr>
  </thead>
  <tbody>
    <tr><td>1</td><td>2026-01-15</td><td colspan="2">Emisión inicial del procedimiento.</td></tr>
  </tbody>
</table>
`.trim();

/**
 * Juego mínimo del módulo documental para poder verificar la fase 3.
 *
 * Idempotente a propósito: se llama desde el seed (base recién limpiada) y
 * también desde un runner contra una base viva que NO se puede borrar — la fase 1
 * dejó dos evidencias con `form_snapshot` que son el banco de regresión de
 * OPS-04. Todo va por `upsert` o por búsqueda previa; ninguna sentencia borra.
 */
export async function seedDocumentFixture(
  prisma: PrismaClient,
  opts: { tenantId: string; authorUserId: string; hashPassword: (p: string) => Promise<string> },
): Promise<DocumentFixtureIds> {
  const { tenantId, authorUserId, hashPassword } = opts;

  // a) El módulo documental tiene que estar encendido para que
  // `assertDocumentsEnabled` no tumbe las rutas.
  await prisma.tenant.update({
    where: { id: tenantId },
    data: { documentsEnabled: true },
  });

  // b) Dos empresas con marca distinta — es lo único que hace observable que
  // la misma plantilla se ve diferente en cada una (criterio 1).
  const acme = await prisma.company.upsert({
    where: { tenantId_slug: { tenantId, slug: "acme-corp" } },
    create: {
      tenantId,
      name: "Acme Corp",
      slug: "acme-corp",
      dc3LegalName: "Acme Corporation, S.A. de C.V.",
      logo: brandLogo("#16a34a", "AC"),
    },
    update: {
      dc3LegalName: "Acme Corporation, S.A. de C.V.",
      logo: brandLogo("#16a34a", "AC"),
    },
  });

  const delta = await prisma.company.upsert({
    where: { tenantId_slug: { tenantId, slug: "constructora-delta" } },
    create: {
      tenantId,
      name: "Constructora Delta",
      slug: "constructora-delta",
      dc3LegalName: "Constructora Delta, S.A. de C.V.",
      logo: brandLogo("#2563eb", "CD"),
    },
    update: {
      dc3LegalName: "Constructora Delta, S.A. de C.V.",
      logo: brandLogo("#2563eb", "CD"),
    },
  });

  // c) Usuaria de la segunda empresa: sesión de "otra empresa" para las
  // verificaciones de autorización, y vista de cliente del documento.
  const hashedPw = await hashPassword("password123");
  const leader = await prisma.user.upsert({
    where: { email: "lucia.delgado@constructoradelta.test" },
    create: {
      email: "lucia.delgado@constructoradelta.test",
      name: "Lucía Delgado",
      role: "STUDENT",
      tenantId,
      companyId: delta.id,
      emailVerified: true,
      onboardingCompleted: true,
    },
    update: {
      tenantId,
      companyId: delta.id,
    },
  });

  await prisma.account.upsert({
    where: { id: `account_${leader.id}` },
    create: {
      id: `account_${leader.id}`,
      userId: leader.id,
      accountId: leader.id,
      providerId: "credential",
      password: hashedPw,
    },
    update: {},
  });

  if (delta.leaderId !== leader.id) {
    await prisma.company.update({
      where: { id: delta.id },
      data: { leaderId: leader.id },
    });
  }

  // d) Manual publicado. `Manual` no tiene clave única natural.
  const manualTitle = "Manual de Gestión de Calidad ISO 9001";
  let manual = await prisma.manual.findFirst({
    where: { tenantId, title: manualTitle },
  });
  if (!manual) {
    manual = await prisma.manual.create({
      data: {
        tenantId,
        createdById: authorUserId,
        title: manualTitle,
        normaLabel: "ISO 9001:2015",
        status: "PUBLISHED",
      },
    });
  }

  // e) Capítulo y sección.
  const chapterTitle = "4. Contexto de la organización";
  let chapter = await prisma.manualChapter.findFirst({
    where: { manualId: manual.id, title: chapterTitle },
  });
  if (!chapter) {
    chapter = await prisma.manualChapter.create({
      data: { manualId: manual.id, title: chapterTitle, position: 0 },
    });
  }

  let section = await prisma.manualSection.findFirst({
    where: { chapterId: chapter.id, code: "4.1" },
  });
  if (!section) {
    section = await prisma.manualSection.create({
      data: {
        chapterId: chapter.id,
        code: "4.1",
        title: "Comprensión de la organización y de su contexto",
        position: 0,
      },
    });
  }

  // f) ManualDocument PROCEDIMIENTO. En `update` NO se toca `contentHtml` ni
  // `templateVersion` si la fila ya existe, para no pisar lo que el
  // consultor haya escrito al ejecutar el runner una segunda vez.
  const document = await prisma.manualDocument.upsert({
    where: { manualId_code: { manualId: manual.id, code: "P-RFC-4.1-01" } },
    create: {
      manualId: manual.id,
      code: "P-RFC-4.1-01",
      name: "Procedimiento de control de documentos",
      description: "Cómo se identifican, revisan, aprueban y controlan los documentos del sistema de gestión.",
      kind: "PROCEDIMIENTO",
      templateVersion: 1,
      contentHtml: PROCEDURE_BODY,
      uploadedById: authorUserId,
    },
    update: {
      name: "Procedimiento de control de documentos",
      description: "Cómo se identifican, revisan, aprueban y controlan los documentos del sistema de gestión.",
      kind: "PROCEDIMIENTO",
    },
  });

  // g) Enlace documento↔sección.
  await prisma.manualSectionDocument.upsert({
    where: { sectionId_documentId: { sectionId: section.id, documentId: document.id } },
    create: { sectionId: section.id, documentId: document.id, position: 0 },
    update: {},
  });

  // h) Dos activaciones, una por empresa.
  const companies = [acme, delta];
  const companiesWithAssignment: DocumentFixtureIds["companies"] = [];
  for (const company of companies) {
    const assignment = await prisma.manualAssignment.upsert({
      where: { manualId_companyId: { manualId: manual.id, companyId: company.id } },
      create: {
        manualId: manual.id,
        companyId: company.id,
        tenantId,
        status: "ACTIVE",
        activatedById: authorUserId,
      },
      update: { status: "ACTIVE" },
    });
    companiesWithAssignment.push({
      id: company.id,
      name: company.name,
      slug: company.slug,
      assignmentId: assignment.id,
    });
  }

  const ids: DocumentFixtureIds = {
    tenantId,
    manualId: manual.id,
    chapterId: chapter.id,
    sectionId: section.id,
    documentId: document.id,
    companies: companiesWithAssignment,
    leaderUserId: leader.id,
  };

  console.log("   📄 Document fixture ids:", JSON.stringify(ids, null, 2));

  return ids;
}
