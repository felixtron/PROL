import { PrismaClient } from "@prisma/client";

/**
 * Alta idempotente del agente capacitador por defecto.
 *
 * Existe aparte de `seed.ts` porque `seed.ts` VACÍA la base antes de
 * insertar: correrlo contra producción borraría a los clientes. Este
 * script no borra nada — crea el agente si falta y, si ya está, sólo
 * completa los campos que sigan vacíos. Se puede correr dos veces sin
 * consecuencias.
 *
 * El registro STPS, el RFC y el logotipo NO se codifican aquí: son datos
 * que la STPS verifica y que la administración captura desde el panel
 * (/tenant-admin/dc3). Inventarlos en un script sería sembrar datos
 * falsos en un documento oficial.
 *
 *   pnpm --filter @prol/db db:seed:agent -- <tenantSlug> ["Nombre del agente"]
 *
 * Sin argumentos usa el único tenant existente y "Ibiza Consultores".
 */

const prisma = new PrismaClient();

const DEFAULT_AGENT_NAME = "Ibiza Consultores";

async function main() {
  const [tenantSlugArg, agentNameArg] = process.argv.slice(2);
  const agentName = (agentNameArg || DEFAULT_AGENT_NAME).trim();

  const tenant = tenantSlugArg
    ? await prisma.tenant.findUnique({
        where: { slug: tenantSlugArg },
        select: { id: true, name: true, slug: true },
      })
    : await (async () => {
        const all = await prisma.tenant.findMany({
          select: { id: true, name: true, slug: true },
          take: 2,
        });
        if (all.length !== 1) return null;
        return all[0]!;
      })();

  if (!tenant) {
    console.error(
      tenantSlugArg
        ? `No existe ningún tenant con slug "${tenantSlugArg}".`
        : "Hay varios tenants (o ninguno): indica el slug como primer argumento.",
    );
    process.exit(1);
  }

  const existing = await prisma.trainingAgent.findFirst({
    where: { tenantId: tenant.id, name: agentName },
    select: { id: true, isActive: true },
  });

  if (existing) {
    console.log(
      `✅ "${agentName}" ya existe en ${tenant.name} (${existing.id})` +
        (existing.isActive ? "" : " — está INACTIVO: actívalo desde el panel"),
    );
    return;
  }

  const agent = await prisma.trainingAgent.create({
    data: { tenantId: tenant.id, name: agentName, isActive: true },
  });

  console.log(`✅ Agente capacitador creado: "${agentName}" (${agent.id})`);
  console.log(
    "   Falta capturar registro STPS, RFC y logotipo en /tenant-admin/dc3.",
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
