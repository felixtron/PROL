# PROL

## What This Is

Plataforma multi-tenant de formación y cumplimiento que usan consultoras para acompañar a sus empresas cliente. Reúne en un solo sitio los cursos y evaluaciones (con constancia DC-3 de la STPS), las encuestas y talleres, y —desde la entrega más reciente— la gestión documental de los sistemas de gestión ISO: manuales, evidencias y su flujo de aprobación.

El caso de uso que dirige el módulo de cumplimiento es IBIZA Consultores acompañando a sus clientes en ISO 9001:2015.

## Core Value

Que una empresa cliente llegue a su auditoría con el expediente completo, trazable y aprobado, sin que nadie haya tenido que intercambiar un archivo por correo.

## Requirements

### Validated

<!-- Enviado y confirmado como valioso. -->

- ✓ Cursos, lecciones, quizzes y examen final con gate de ≥80% — milestones previos
- ✓ Certificados y constancia DC-3 de la STPS en PDF — milestones previos
- ✓ Encuestas y talleres — milestones previos
- ✓ Manuales ISO por capítulos y secciones, activables por empresa — entrega anterior
- ✓ Evidencias con flujo Pendiente → En revisión → Requiere corrección → Aprobada, bitácora y baja con aprobación — entrega anterior
- ✓ Actividades recurrentes (única, semestral, anual) con agenda y recordatorios por correo — entrega anterior
- ✓ Matriz de riesgos y oportunidades llenada en la plataforma — entrega anterior

### Active

<!-- Alcance actual: milestone v1.1. Ver REQUIREMENTS.md para el detalle con REQ-IDs. -->

- [ ] Los procedimientos y registros se redactan, personalizan y versionan **dentro** de la plataforma, en HTML, en vez de intercambiarse como Word/Excel (DOC-01…07, REG-01…06)
- [ ] Todo documento nativo se exporta a PDF con encabezado ISO y pie numerado (PDF-01…04)
- [ ] Los archivos confidenciales viven en Cloudflare R2, con respaldo real (R2-01…06)
- [ ] Se cierra la deuda que el módulo anterior dejó abierta (OPS-01…05)

### Out of Scope

- **Convertir PROL en un ERP** — el módulo guía, documenta, evidencia, aprueba y recuerda. No planifica recursos ni gestiona procesos de negocio.
- **Generar `.docx` con plantillas** — la personalización se resuelve en tiempo de render; generar Office reintroduce el intercambio de archivos que este milestone elimina.
- **Migrar el tier público de archivos a R2** — sus URLs están incrustadas en el markdown de `Lesson.content`; migrarlo es reescribir una columna Json con expresiones regulares, mucho riesgo y ninguna ganancia.
- **Editor WYSIWYG** — el flujo de autoría real es pegar desde Word; un editor de bloques para el cuerpo lo destruiría.
- **Celdas combinadas verticalmente (`rowspan`) en el PDF** — exige un motor de maquetación real. Se documenta como limitación.
- **Suite de pruebas automatizadas** — el repo no tiene ninguna. Introducirla es un proyecto aparte (`/gsd:add-tests`).

## Context

- El módulo de cumplimiento se construyó y verificó en la sesión anterior (commit `2ea59dc`), pero **nunca corrió contra una base de datos**: `DATABASE_URL` apuntaba a la base de otro proyecto y `db push` jamás se ejecutó. Se resolvió al arrancar este milestone.
- El piloto que dirige el diseño es `downloads/piloto-modulo-4.1_1.html`, con dos arquetipos en extremos opuestos: `P-RFC-4.1-01` (procedimiento, prosa y tablas estáticas) y `R-RFC-4.1-01` (registro, matriz DAFO en cuatro cuadrantes).
- Roles: admin de plataforma, consultor/profesor, líder de proyecto de la empresa cliente, y usuario final que sube evidencias pero no puede borrarlas.
- Ver `.planning/codebase/` para el mapa del código.

## Constraints

- **Base de datos**: Prisma **sin directorio de migraciones**. El esquema se despliega con `db push`, así que sólo se admiten cambios aditivos. Relajar un `NOT NULL` está bien; renombrar o borrar una columna, no.
- **Infraestructura**: el VPS corre podman con quadlets. **No hay docker, ni git, ni CI/CD** en el host. El despliegue va por `git archive` y las tareas programadas por cron del host con `CRON_SECRET`.
- **Secretos**: nunca se commitean. Se aplican por SSH a `/opt/prol/.env` en el VPS.
- **Producción**: antes de tocar el VPS se presenta un plan de riesgo, alcance, rollback y verificación.
- **Verificación**: no hay pruebas automatizadas. La puerta es typecheck + `eslint --max-warnings 0` + build, manteniendo la línea base de 81 advertencias, y comprobación manual del comportamiento.
- **Idioma**: identificadores en inglés, texto de cara al usuario y mensajes de commit en español.

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Cuerpo del documento en HTML saneado, no en bloques | Ya se guarda, sanea, renderiza y estiliza; preserva el pegado desde Word y da la importación `.docx` gratis | — Pendiente |
| La parte llenable en JSON tipado con Zod, no en HTML | Los valores hay que validarlos, congelarlos de forma consultable y mapearlos a celdas de PDF | — Pendiente |
| `ManualDocumentKind` con tres valores, no `FILE\|NATIVE` | Un estado ternario no se codifica como booleano más campo opcional; la UX ramifica en tres | — Pendiente |
| Los registros llenos van a una tabla nueva `CompanyRecord` | `CompanyDocument` está claveada por versión y no tiene dimensión de periodo; meterlos ahí rompe la pantalla de sección | — Pendiente |
| El logo y la razón social se leen en vivo; sólo se congela lo acreditativo | Convención que ya sigue el emisor DC-3: son marca, no dato acreditativo | — Pendiente |
| R2 sólo para el tier confidencial | Claves opacas, un único módulo de acceso y una brecha de respaldo real; el tier público tiene las propiedades opuestas | — Pendiente |
| `aws4fetch` en vez de `@aws-sdk/client-s3` | ~6 KB sin dependencias frente a ~2 MB en ~40 paquetes, con el registry del VPS documentado como inestable | — Pendiente |
| Almacenamiento tras feature flag, no fail-fast | `lib/env.ts` reserva el esquema crítico a lo imprescindible; permite convivencia durante la migración y rollback quitando una variable | — Pendiente |

---
*Last updated: 2026-09-01 al abrir el milestone v1.1*
