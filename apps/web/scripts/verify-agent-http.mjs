// Arnés HTTP de las rutas del agente. Mismo patrón que
// `verify-document-pdf.mjs`: Node puro, sin importar `@prol/db`, contra el
// servidor de desarrollo y la base local.
//
//   pnpm --filter web dev            # en otra terminal
//   node apps/web/scripts/verify-agent-http.mjs
//
// Comprueba la MATRIZ DE AUTORIZACIÓN, que es lo que no puede fallar:
// quién llega a las rutas del agente y qué ve cuando no le corresponde.
//
// NO llama a Gemini. El único POST a `/api/agent/turn` que hace con sesión
// válida lleva el cuerpo mal a propósito, así que la petición muere en la
// validación de entrada antes de tocar el modelo. Un arnés que gastara tokens
// no se ejecutaría nunca.
//
// Lo que este arnés NO cubre y hay que probar aparte: que la propuesta de otra
// persona devuelve el mismo 404 que una inexistente. Hace falta una propuesta
// sembrada en la base, y este fichero no escribe en ella.
//
// El limitador corta a 12 turnos/min y 30 confirmaciones/min por usuario: aquí
// se hacen menos de diez peticiones por sesión.

const BASE_URL = process.argv.includes("--base-url")
  ? process.argv[process.argv.indexOf("--base-url") + 1]
  : "http://localhost:3000";

const ADMIN = { email: "admin@prol.prosuite.pro", password: "password123" };
const STUDENT = { email: "carlos.mendoza@gmail.com", password: "password123" };

let passed = 0;
const failures = [];

function check(name, condition, detail) {
  if (condition) {
    passed += 1;
    console.log(`  ok  ${name}`);
  } else {
    failures.push({ name, detail });
    console.log(`FAIL  ${name}`);
    console.log(`      ${detail}`);
  }
}

/** `POST /api/auth/sign-in/email` -> cookie `name=value` lista para `Cookie:`. */
async function login({ email, password }) {
  const res = await fetch(`${BASE_URL}/api/auth/sign-in/email`, {
    method: "POST",
    // Better Auth exige un `Origin` no nulo en peticiones que mutan estado;
    // Node no lo manda por defecto. Mismo motivo y misma solucion que en
    // `verify-document-pdf.mjs`.
    headers: { "Content-Type": "application/json", Origin: BASE_URL },
    body: JSON.stringify({ email, password }),
  });
  const setCookie = res.headers.get("set-cookie");
  if (!res.ok || !setCookie) {
    throw new Error(`login fallido para ${email} (${res.status})`);
  }
  return setCookie.split(";")[0];
}

async function call(method, path, { cookie, body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Origin: BASE_URL,
      ...(cookie ? { Cookie: cookie } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  return { status: res.status, payload };
}

const FAKE_ID = "propuesta-que-no-existe";

async function main() {
  // Preflight: sin servidor no hay nada que comprobar, y un arnés que falla
  // por eso con veinte errores rojos no dice nada útil.
  try {
    await fetch(`${BASE_URL}/api/health`);
  } catch {
    console.log(`No hay servidor en ${BASE_URL}. Arranca \`pnpm --filter web dev\`.`);
    process.exit(2);
  }

  console.log("\nSin sesión");
  {
    const turn = await call("POST", "/api/agent/turn", {
      body: { mensaje: "hola", superficie: "evidence" },
    });
    check("POST /turn sin sesión -> 403", turn.status === 403, `dio ${turn.status}`);

    const commit = await call("POST", `/api/agent/proposal/${FAKE_ID}`);
    check("POST /proposal sin sesión -> 403", commit.status === 403, `dio ${commit.status}`);

    const reject = await call("DELETE", `/api/agent/proposal/${FAKE_ID}`);
    check("DELETE /proposal sin sesión -> 403", reject.status === 403, `dio ${reject.status}`);
  }

  console.log("\nSesión de STUDENT (el agente es sólo de profesores y admins)");
  {
    const cookie = await login(STUDENT);
    const turn = await call("POST", "/api/agent/turn", {
      cookie,
      body: { mensaje: "hola", superficie: "evidence" },
    });
    check("POST /turn como STUDENT -> 403", turn.status === 403, `dio ${turn.status}`);

    const commit = await call("POST", `/api/agent/proposal/${FAKE_ID}`, { cookie });
    check("POST /proposal como STUDENT -> 403", commit.status === 403, `dio ${commit.status}`);

    const reject = await call("DELETE", `/api/agent/proposal/${FAKE_ID}`, { cookie });
    check("DELETE /proposal como STUDENT -> 403", reject.status === 403, `dio ${reject.status}`);
  }

  console.log("\nSesión de ADMIN");
  {
    const cookie = await login(ADMIN);

    // Cuerpo inválido: muere en la validación de entrada, sin llegar a Gemini.
    const malformed = await call("POST", "/api/agent/turn", { cookie, body: {} });
    check(
      "POST /turn con cuerpo inválido -> 400 (sin llamar al modelo)",
      malformed.status === 400,
      `dio ${malformed.status}`,
    );

    const longMessage = await call("POST", "/api/agent/turn", {
      cookie,
      body: { mensaje: "x".repeat(5_000), superficie: "evidence" },
    });
    check(
      "POST /turn con mensaje desmedido -> 400",
      longMessage.status === 400,
      `dio ${longMessage.status}`,
    );

    const badSurface = await call("POST", "/api/agent/turn", {
      cookie,
      body: { mensaje: "hola", superficie: "../admin" },
    });
    check(
      "POST /turn con superficie inventada -> 400",
      badSurface.status === 400,
      `dio ${badSurface.status}`,
    );

    const commit = await call("POST", `/api/agent/proposal/${FAKE_ID}`, { cookie });
    check(
      "POST /proposal inexistente -> 404",
      commit.status === 404,
      `dio ${commit.status}`,
    );
    check(
      "el 404 no revela si la propuesta existe o es de otro",
      typeof commit.payload?.error === "string" &&
        commit.payload.error.includes("ya no está disponible"),
      `mensaje: ${JSON.stringify(commit.payload)}`,
    );

    const reject = await call("DELETE", `/api/agent/proposal/${FAKE_ID}`, { cookie });
    check(
      "DELETE /proposal inexistente -> 404",
      reject.status === 404,
      `dio ${reject.status}`,
    );

    const wrongMethod = await call("GET", `/api/agent/proposal/${FAKE_ID}`, { cookie });
    check(
      "GET /proposal no existe como método -> 405",
      wrongMethod.status === 405,
      `dio ${wrongMethod.status}`,
    );
  }

  console.log(
    `\n${failures.length === 0 ? "TODO EN VERDE" : "HAY FALLOS"} — ` +
      `${passed} comprobaciones pasadas, ${failures.length} fallidas`,
  );
  if (failures.length > 0) {
    for (const f of failures) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("El arnés no pudo completarse:", error.message);
  process.exit(2);
});
