// Arnés de verificación por HTTP + pdf-parse para las dos rutas de descarga
// del puente HTML->PDF. Reutilizado por los planes 04-02 y 04-03: lo que
// cambia entre ellos es qué comprobaciones adicionales se agregan, no cómo
// se autentica ni cómo se lee un PDF.
//
// Node puro, sin importar `@prol/db` (es TypeScript y no resuelve desde un
// `.mjs`). No escribe en la base ni borra nada — sólo hace `GET` y compara
// texto extraído con `pdf-parse`.
//
//   node apps/web/scripts/verify-document-pdf.mjs \
//     --template <manualDocumentId> \
//     --company-doc <companyDocumentId> \
//     [--base-url http://localhost:3000] \
//     [--norma-label "ISO 9001:2015"] \
//     [--company-legal-name "Acme Corporation, S.A. de C.V."]
//
// El limitador de `middleware.ts` corta `/api/*` a 60 peticiones por minuto
// por IP y el de auth a 20/min: este arnés hace un puñado de peticiones, no
// cientos — no hace falta espaciarlas.

function parseArgs(argv) {
  const out = {
    baseUrl: "http://localhost:3000",
    companyDoc: null,
    template: null,
    normaLabel: null,
    companyLegalName: null,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--base-url") out.baseUrl = argv[++i];
    else if (a === "--company-doc") out.companyDoc = argv[++i];
    else if (a === "--template") out.template = argv[++i];
    else if (a === "--norma-label") out.normaLabel = argv[++i];
    else if (a === "--company-legal-name") out.companyLegalName = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv.slice(2));

if (!args.template || !args.companyDoc) {
  console.error("Uso: node verify-document-pdf.mjs --template <id> --company-doc <id> [--base-url ...]");
  process.exit(1);
}

const failures = [];

function assert(cond, msg) {
  if (cond) {
    console.log(`✓ ${msg}`);
  } else {
    console.log(`✗ ${msg}`);
    failures.push(msg);
  }
}

/** `POST /api/auth/sign-in/email` -> cookie `name=value` lista para `Cookie:`. */
async function login(email, password) {
  const res = await fetch(`${args.baseUrl}/api/auth/sign-in/email`, {
    method: "POST",
    // Better Auth exige un `Origin` no nulo en peticiones que mutan estado;
    // un cliente HTTP sin contexto de navegador (este script) no lo manda
    // por defecto, así que se declara explícitamente como el propio
    // `--base-url` contra el que se está probando.
    headers: { "Content-Type": "application/json", Origin: args.baseUrl },
    body: JSON.stringify({ email, password }),
  });
  if (res.status !== 200) {
    throw new Error(`login falló para ${email}: HTTP ${res.status}`);
  }
  const setCookie = res.headers.get("set-cookie");
  if (!setCookie) {
    throw new Error(`login sin set-cookie para ${email}`);
  }
  return setCookie.split(";")[0];
}

/** `GET` crudo con o sin cookie de sesión. */
async function getPdf(path, cookie) {
  const res = await fetch(`${args.baseUrl}${path}`, {
    headers: cookie ? { Cookie: cookie } : {},
  });
  const bytes = new Uint8Array(await res.arrayBuffer());
  return {
    status: res.status,
    contentType: res.headers.get("content-type"),
    contentDisposition: res.headers.get("content-disposition"),
    cacheControl: res.headers.get("cache-control"),
    bytes,
  };
}

/** Texto por página con `pdf-parse` v2. */
async function textPages(bytes) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: bytes });
  const result = await parser.getText();
  await parser.destroy();
  return result;
}

async function main() {
  console.log(`Base URL: ${args.baseUrl}\n`);

  // ─── 1. admin -> plantilla, sin empresa ──────────────────────────────────
  const adminCookie = await login("admin@prol.prosuite.pro", "password123");

  const templatePath = `/api/documents/template/${args.template}/pdf`;
  const templateRes = await getPdf(templatePath, adminCookie);

  assert(templateRes.status === 200, `admin -> plantilla: 200 (obtuvo ${templateRes.status})`);
  assert(
    templateRes.contentType === "application/pdf",
    `plantilla: Content-Type application/pdf (obtuvo ${templateRes.contentType})`,
  );
  const templateFilename = /filename="([^"]+)"/.exec(templateRes.contentDisposition ?? "")?.[1] ?? "";
  const filenameMatch = /^([A-Za-z0-9._-]+)-v(\d+)\.pdf$/.exec(templateFilename);
  assert(
    filenameMatch !== null,
    `plantilla: Content-Disposition trae filename "<código>-v<versión>.pdf" (obtuvo "${templateFilename}")`,
  );

  if (templateRes.status === 200 && filenameMatch) {
    const [, code, version] = filenameMatch;
    const parsed = await textPages(templateRes.bytes);
    const total = parsed.total;

    const everyPageHasCode = parsed.pages.every((p) => p.text.includes(code));
    assert(everyPageHasCode, `plantilla: "${code}" aparece en las ${total} páginas`);

    const everyPageHasPageNumber = parsed.pages.every((p) =>
      p.text.includes(`Página ${p.num} de ${total}`),
    );
    assert(everyPageHasPageNumber, `plantilla: "Página N de ${total}" con numeración correcta en cada página`);

    const everyPageSealed = parsed.pages.every((p) => p.text.includes("BORRADOR"));
    assert(everyPageSealed, `plantilla: "BORRADOR" en las ${total} páginas (la vista previa siempre lo es)`);

    const page1 = parsed.pages.find((p) => p.num === 1)?.text ?? "";
    assert(page1.includes("Empresa de ejemplo"), 'plantilla: página 1 contiene "Empresa de ejemplo"');
    if (args.normaLabel) {
      assert(page1.includes(args.normaLabel), `plantilla: página 1 contiene la norma "${args.normaLabel}"`);
    } else {
      console.log("  (sin --norma-label: se omite la comprobación de la norma en página 1)");
    }
    assert(templateFilename.includes(`v${version}`), "plantilla: versión del nombre de archivo consistente consigo misma");
  }

  // ─── 2. Acme -> su propio documento de empresa ───────────────────────────
  const acmeCookie = await login("carlos.mendoza@gmail.com", "password123");
  const companyPath = `/api/documents/company/${args.companyDoc}/pdf`;
  const acmeRes = await getPdf(companyPath, acmeCookie);

  assert(acmeRes.status === 200, `Acme -> su documento: 200 (obtuvo ${acmeRes.status})`);
  if (acmeRes.status === 200) {
    const parsed = await textPages(acmeRes.bytes);
    const page1 = parsed.pages.find((p) => p.num === 1)?.text ?? "";
    const legalName = args.companyLegalName ?? "Acme Corporation, S.A. de C.V.";
    assert(page1.includes(legalName), `Acme: página 1 contiene "${legalName}"`);

    const noSeal = parsed.pages.every(
      (p) => !p.text.includes("BORRADOR") && !p.text.includes("OBSOLETO"),
    );
    assert(noSeal, "Acme: ninguna página lleva BORRADOR ni OBSOLETO (documento VIGENTE)");
  }

  // ─── 3. Constructora Delta -> el documento de Acme: 403 ──────────────────
  const deltaCookie = await login("lucia.delgado@constructoradelta.test", "password123");
  const crossRes = await getPdf(companyPath, deltaCookie);
  assert(crossRes.status === 403, `Constructora Delta -> documento de Acme: 403 (obtuvo ${crossRes.status})`);

  // ─── 4. Sin cookie: 401 en las dos rutas ─────────────────────────────────
  const noCookieTemplate = await getPdf(templatePath, null);
  assert(noCookieTemplate.status === 401, `sin sesión -> plantilla: 401 (obtuvo ${noCookieTemplate.status})`);
  const noCookieCompany = await getPdf(companyPath, null);
  assert(noCookieCompany.status === 401, `sin sesión -> documento de empresa: 401 (obtuvo ${noCookieCompany.status})`);

  // ─── 5. Id inexistente: 404 ───────────────────────────────────────────────
  const missingRes = await getPdf(`/api/documents/company/id-inexistente-000/pdf`, adminCookie);
  assert(missingRes.status === 404, `companyDocumentId inexistente: 404 (obtuvo ${missingRes.status})`);

  console.log();
  if (failures.length > 0) {
    console.log(`${failures.length} comprobación(es) fallida(s):`);
    for (const f of failures) console.log(`  - ${f}`);
    process.exit(1);
  }
  console.log("Todas las comprobaciones pasaron.");
  process.exit(0);
}

main().catch((error) => {
  console.error("Error inesperado en el arnés de verificación:", error);
  process.exit(1);
});
