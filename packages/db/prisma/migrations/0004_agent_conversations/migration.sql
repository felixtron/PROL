-- Historial del copiloto por cuenta.
--
-- Todo aditivo: una tabla nueva. Ni DROP ni ALTER sobre nada existente.
--
--   agent_conversations   Ultimas conversaciones de cada usuario con el
--                         asistente. `messages` es un JSON de solo texto: ni
--                         llamadas a herramienta ni resultados, porque el
--                         historial viaja al navegador y de vuelta, y
--                         reinyectar desde ahi contenido de terceros seria
--                         saltarse la frontera de confianza. Es comodidad de
--                         uso, no archivo documental: eso vive en audit_logs.

-- CreateTable
CREATE TABLE "agent_conversations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "surface" TEXT NOT NULL,
    "messages" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_conversations_user_id_updated_at_idx" ON "agent_conversations"("user_id", "updated_at");

-- CreateIndex
CREATE INDEX "agent_conversations_tenant_id_idx" ON "agent_conversations"("tenant_id");

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agent_conversations" ADD CONSTRAINT "agent_conversations_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
