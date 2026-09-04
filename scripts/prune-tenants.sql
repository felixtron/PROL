-- Deja en la base SÓLO los tenants indicados y borra el resto.
--
-- Uso:  psql -v conservar=a,b -v ON_ERROR_STOP=1 -f prune-tenants.sql
--
-- La lista va separada por comas y SIN comillas: `:'conservar'` la recibe como
-- un texto y `string_to_array` la parte. Anidar comillas dentro de -v es la
-- forma más rápida de que el mismo script funcione en tu terminal y falle en
-- el del servidor.
--
-- Por qué no basta con `DELETE FROM tenants`: el esquema tiene 110 cascadas y
-- `User → Tenant` es una de ellas, pero además hay 11 claves foráneas con
-- `ON DELETE RESTRICT` apuntando a `users`. Postgres evalúa esas restricciones
-- al borrar cada fila, y aborta antes de que la cascada hermana haya llegado a
-- limpiar al hijo que las sostiene. Hay que retirar esos hijos primero.
--
-- Todo en una transacción: o se va el tenant entero o no se va nada.
BEGIN;

\echo '--- antes ---'
SELECT slug, (SELECT count(*) FROM users WHERE tenant_id = t.id) AS usuarios
  FROM tenants t ORDER BY slug;

CREATE TEMP TABLE _fuera ON COMMIT DROP AS
  SELECT id, slug FROM tenants
   WHERE slug <> ALL (string_to_array(:'conservar', ','));

\echo '--- se eliminan ---'
SELECT slug FROM _fuera;

-- 1) Hijos con FK RESTRICT hacia `users`, acotados por su propio tenant_id.
DELETE FROM survey_campaigns   WHERE tenant_id IN (SELECT id FROM _fuera);
DELETE FROM manual_assignments WHERE tenant_id IN (SELECT id FROM _fuera);
DELETE FROM manuals            WHERE tenant_id IN (SELECT id FROM _fuera);
DELETE FROM dc3_certificates   WHERE tenant_id IN (SELECT id FROM _fuera);
DELETE FROM advisory_sessions  WHERE tenant_id IN (SELECT id FROM _fuera);
DELETE FROM workshops          WHERE tenant_id IN (SELECT id FROM _fuera);
DELETE FROM courses            WHERE tenant_id IN (SELECT id FROM _fuera);

-- 2) La rama de evaluaciones no lleva tenant_id: cuelga en cadena de
--    `evaluations`. Se recorre de hoja a raíz, y la cadena real es
--    evaluations -> assignments -> participants -> submissions -> answers,
--    NO la que sugieren los nombres (una submission no apunta a su evaluación
--    sino a su participante).
DELETE FROM evaluation_answers WHERE submission_id IN (
  SELECT s.id FROM evaluation_submissions s
    JOIN evaluation_participants p ON p.id = s.participant_id
    JOIN evaluation_assignments  a ON a.id = p.assignment_id
    JOIN evaluations             e ON e.id = a.evaluation_id
   WHERE e.tenant_id IN (SELECT id FROM _fuera));
DELETE FROM evaluation_submissions WHERE participant_id IN (
  SELECT p.id FROM evaluation_participants p
    JOIN evaluation_assignments a ON a.id = p.assignment_id
    JOIN evaluations            e ON e.id = a.evaluation_id
   WHERE e.tenant_id IN (SELECT id FROM _fuera));
DELETE FROM evaluation_participants WHERE assignment_id IN (
  SELECT a.id FROM evaluation_assignments a
    JOIN evaluations e ON e.id = a.evaluation_id
   WHERE e.tenant_id IN (SELECT id FROM _fuera));
DELETE FROM evaluation_assignments WHERE evaluation_id IN (
  SELECT id FROM evaluations WHERE tenant_id IN (SELECT id FROM _fuera));
DELETE FROM evaluations WHERE tenant_id IN (SELECT id FROM _fuera);

-- 3) Ahora sí: el tenant, y las 110 cascadas hacen el resto.
DELETE FROM tenants WHERE id IN (SELECT id FROM _fuera);

-- 4) Residuo de `ON DELETE SET NULL`: las bitácoras sobreviven al tenant que
--    las generó y se quedarían huérfanas con tenant_id nulo.
DELETE FROM audit_logs WHERE tenant_id IS NULL;

\echo '--- despues ---'
SELECT slug, (SELECT count(*) FROM users WHERE tenant_id = t.id) AS usuarios
  FROM tenants t ORDER BY slug;

\echo '--- comprobacion: usuarios sin tenant que no sean SUPER_ADMIN ---'
SELECT count(*) AS huerfanos_inesperados FROM users
 WHERE tenant_id IS NULL AND role <> 'SUPER_ADMIN';

COMMIT;
