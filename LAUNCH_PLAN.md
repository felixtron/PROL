# PROL - Plan de Lanzamiento (Reformulado)

## Estado: DESPLEGADO EN PRODUCCION

**URL**: https://prol.prosuite.pro
**Repo**: https://github.com/felixtron/PROL
**VPS**: panel-prosuite (66.29.152.229, Debian 12)
**Build**: 0 errores en los 10 packages del monorepo
**Seed aplicado**: si (5 usuarios, 3 cursos, 50 lecciones, 4 pagos, 1 certificado)

---

## Resumen de modulos

| # | Modulo | Estado | Notas |
|---|--------|--------|-------|
| 0 | Infraestructura | COMPLETO | Docker + Traefik v3 + PostgreSQL+pgvector |
| 1 | Auth + Onboarding | COMPLETO | Better Auth, middleware, role enforcement |
| 2 | Catalogo + Inscripcion | COMPLETO | Busqueda, filtros, inscripcion gratis/pago |
| 3 | Profesor: Gestion de Cursos | COMPLETO | CRUD cursos/modulos/lecciones, quiz builder |
| 4 | Pagos con Stripe | COMPLETO | Codigo listo, requiere llenar API keys |
| 5 | Video + Contenido Interactivo | COMPLETO | Cloudflare Stream + Vimeo URL + interactive stops |
| 6 | Certificados + Notificaciones + Emails | COMPLETO | PDF certs, bell notifications, Resend |
| 7 | Multi-Tenancy + Admin | COMPLETO | Tenant CRUD, user management, revenue |
| 8 | Workshops | COMPLETO | Booking con transaccion anti race-condition |
| 9 | Deploy a Produccion | COMPLETO | HTTPS, SSL Let's Encrypt, wildcard subdomain ready |
| AI | Generacion con IA | ADICIONAL | Gated por `tenant.aiEnabled`, requiere API keys |

---

## Correcciones aplicadas durante el desarrollo

### M1: Auth + Onboarding
- Middleware redirige usuarios autenticados fuera de sign-in/sign-up
- Sign-in redirige segun rol + estado de onboarding
- Professor layout valida onboarding completado y tenant existente
- API check-role devuelve onboardingCompleted y tenantId

### M2-M4: Stripe + Enrollment + Course CRUD
- Stripe client singleton tambien en produccion (fix cache)
- Stripe webhook valida payment_intent no null (previene duplicados)
- Notifications API: PATCH endpoint para mark-as-read
- Admin queries: N+1 eliminado en getAdminProfessors (groupBy)
- Lesson CRUD: updateLesson action implementado
- createLesson/deleteLesson sincronizan totalLessons del curso
- publishCourse actualiza totalLessons y valida titulo

### M5: Video
- Integracion de Vimeo (Fases 1-3): schema + parser de URLs + UI con tabs + player unificado
- parseVimeoUrl() soporta todos los formatos de Vimeo
- setVideoFromVimeoUrl() valida via oEmbed publico (sin API key)
- VideoPlayer component decide el iframe segun proveedor

### M7: Admin
- createTenantAdmin action para crear tenants desde panel admin
- updateTenant action para editar nombre, email, dominio custom

### M8: Workshops
- bookWorkshop usa transaccion para prevenir race condition en ultimo spot

---

## Pendientes para operar 100%

### Alta prioridad

1. **Llenar API keys reales** en `/opt/prol/.env`:
   - `STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_STREAM_API_TOKEN` (si usas upload de video; con Vimeo URL funciona sin esto)

2. **Configurar webhook de Stripe** apuntando a `https://prol.prosuite.pro/api/webhooks/stripe`

3. **Cambiar passwords de seed** o crear tu propio super admin (ver [CREDENTIALS.md](./CREDENTIALS.md))

### Media prioridad

4. **DNS wildcard**: anadir `*.prol.prosuite.pro -> 66.29.152.229` si quieres usar subdominios por tenant

5. **Backups automaticos de DB** (cron job + rotacion)

### Baja prioridad (modulo AI - opcional)

6. **API keys para modulo AI**: `ANTHROPIC_API_KEY`, `ASSEMBLYAI_API_KEY`, `TRIGGER_SECRET_KEY`

7. **Habilitar AI por tenant**: `UPDATE tenants SET "aiEnabled"=true WHERE id='...';`

---

## Credenciales para testing inmediato

Ver [CREDENTIALS.md](./CREDENTIALS.md) para la lista completa. Login en https://prol.prosuite.pro/sign-in con:

- `super@prol.prosuite.pro` / `password123` → `/admin` (SUPER_ADMIN)
- `maria.garcia@academiadigitalmx.com` / `password123` → `/professor`
- `carlos.mendoza@gmail.com` / `password123` → `/dashboard`
