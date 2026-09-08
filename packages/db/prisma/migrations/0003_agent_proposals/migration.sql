-- Propuestas de escritura del agente interno (copiloto de profesores y
-- administradores).
--
-- Todo aditivo: un enum nuevo y una tabla nueva. Ni DROP ni ALTER sobre nada
-- existente, asi que desplegar esto sin usar el agente no cambia nada.
--
--   agent_proposals   Una fila por accion que el agente PROPUSO y que aun no
--                     ha ocurrido. El bucle del agente no escribe nunca: deja
--                     la propuesta en PENDING y la ejecuta el endpoint de
--                     confirmacion cuando una persona le da al boton. `args`
--                     se guarda tal y como lo propuso el modelo y se vuelve a
--                     validar al confirmar; lo guardado no se considera de
--                     fiar. `user_id` impide que la confirme alguien que no
--                     vio la propuesta, y `expires_at` la caduca porque los
--                     datos en que se apoyaba envejecen.

-- CreateEnum
CREATE TYPE "AgentProposalStatus" AS ENUM ('PENDING', 'COMMITTED', 'REJECTED', 'EXPIRED');

-- CreateTable
CREATE TABLE "agent_proposals" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "tool_name" TEXT NOT NULL,
    "args" JSONB NOT NULL,
    "status" "AgentProposalStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "committed_at" TIMESTAMP(3),
    "rejected_at" TIMESTAMP(3),
    "model" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agent_proposals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_proposals_tenant_id_idx" ON "agent_proposals"("tenant_id");

-- CreateIndex
CREATE INDEX "agent_proposals_user_id_status_idx" ON "agent_proposals"("user_id", "status");

-- CreateIndex
CREATE INDEX "agent_proposals_expires_at_idx" ON "agent_proposals"("expires_at");

-- AddForeignKey
ALTER TABLE "agent_proposals" ADD CONSTRAINT "agent_proposals_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_proposals" ADD CONSTRAINT "agent_proposals_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
