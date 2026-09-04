/**
 * Crea el PRIMER superusuario de una instalación nueva. Nada más.
 *
 * Existe porque lo único disponible para arrancar una base era `seed.ts`, y ese
 * script siembra un tenant de demostración y cinco usuarios con la contraseña
 * `password123` — incluidos dos con rol SUPER_ADMIN. Es correcto para
 * desarrollo y es exactamente lo que no puede correr contra la base de un
 * cliente.
 *
 * Aquí no se crea ningún tenant, ningún curso y ningún dato de ejemplo: sólo la
 * cuenta con la que alguien entra por primera vez a `/admin` a configurar lo
 * demás. La contraseña se genera al azar, se imprime UNA vez y queda marcada
 * como `mustResetPassword`, así que sirve para un único acceso.
 *
 *   pnpm --filter @prol/db db:bootstrap -- --email=admin@dominio.mx --name="Nombre"
 */
import { randomBytes, randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "./seed-password";

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

/**
 * Contraseña de un solo uso. Base64url sobre 24 bytes: entra cómoda en un
 * portapapeles y no obliga a nadie a distinguir un 1 de una l al teclearla.
 */
function generatePassword(): string {
  return randomBytes(24).toString("base64url");
}

async function main(): Promise<void> {
  const email = arg("email")?.trim().toLowerCase();
  const name = arg("name")?.trim() || "Administrador";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    throw new Error(
      'Falta --email o no es válido.\n' +
        '  pnpm --filter @prol/db db:bootstrap -- --email=admin@dominio.mx --name="Nombre"',
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // No se toca una cuenta que ya existe: reescribirle la contraseña desde un
    // script de arranque sería una forma silenciosa de tomar el control de una
    // cuenta ajena. Si alguien perdió el acceso, ése es otro procedimiento.
    throw new Error(`Ya existe un usuario con ${email}; este script no modifica cuentas.`);
  }

  const password = generatePassword();
  const user = await prisma.user.create({
    data: {
      email,
      name,
      role: "SUPER_ADMIN",
      emailVerified: true,
      mustResetPassword: true,
      accounts: {
        create: {
          // `Account.id` no tiene default en el esquema: si no se pone,
          // Prisma falla al crear.
          id: randomUUID(),
          accountId: email,
          providerId: "credential",
          password: await hashPassword(password),
        },
      },
    },
    select: { id: true, email: true },
  });

  console.log("\n  Superusuario creado.");
  console.log(`  correo:      ${user.email}`);
  console.log(`  contraseña:  ${password}`);
  console.log("\n  Se muestra UNA sola vez y hay que cambiarla al primer acceso.\n");
}

main()
  .catch((err) => {
    console.error(`\n  ${err instanceof Error ? err.message : String(err)}\n`);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
