-- Modo profesor del administrador de academia, y visibilidad del panel
-- del alumno por tenant.
--
-- Todo aditivo. Los valores por defecto conservan el comportamiento actual:
--   professor_mode_enabled  false  (el admin no entra al panel de profesor)
--   student_tools           NULL   (clave ausente = herramienta visible)

ALTER TABLE "users" ADD COLUMN "professor_mode_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tenants" ADD COLUMN "student_tools" JSONB;
