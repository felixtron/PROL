# PROL - Plan de Lanzamiento (Reformulado)

## Estado del Proyecto

**Build**: OK (0 errores en 10 packages)
**Base de datos**: PostgreSQL+pgvector corriendo en VPS (panel-prosuite, puerto 5433)
**Seed**: Ejecutado (1 tenant, 5 users, 3 cursos, 50 lecciones, 4 pagos, 1 certificado)

---

## Correcciones Aplicadas

### M1: Auth + Onboarding
- [x] Middleware redirige usuarios autenticados fuera de sign-in/sign-up
- [x] Sign-in redirige segun rol + estado de onboarding
- [x] Sign-up redirige siempre a /dashboard (flujo simple)
- [x] Professor layout valida onboarding completado y tenant existente
- [x] API check-role devuelve onboardingCompleted y tenantId

### M2-M4: Stripe + Enrollment + Course CRUD
- [x] Stripe client se cachea tambien en produccion (fix singleton)
- [x] Stripe webhook valida payment_intent no null (previene duplicados)
- [x] Notifications API: PATCH endpoint para mark-as-read
- [x] Admin queries: N+1 eliminado en getAdminProfessors (groupBy)
- [x] Lesson CRUD: updateLesson action implementado
- [x] createLesson/deleteLesson sincronizan totalLessons del curso
- [x] publishCourse actualiza totalLessons y valida titulo

### M7: Admin
- [x] createTenantAdmin action para crear tenants desde panel admin
- [x] updateTenant action para editar nombre, email, dominio custom

### M8: Workshops
- [x] bookWorkshop usa transaccion para prevenir race condition en ultimo spot

---

## Modulos Listos para Operar

| # | Modulo | Estado | Requiere |
|---|--------|--------|----------|
| 0 | Infraestructura | LISTO | SSH tunnel a VPS |
| 1 | Auth + Onboarding | LISTO | BETTER_AUTH_SECRET (ya configurado) |
| 2 | Catalogo + Inscripcion | LISTO | - |
| 3 | Profesor: Gestion cursos | LISTO | - |
| 4 | Pagos Stripe | LISTO | STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET |
| 5 | Video + Interactivo | LISTO | CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_STREAM_API_TOKEN |
| 6 | Certificados + Notificaciones | LISTO | RESEND_API_KEY (para emails) |
| 7 | Multi-Tenancy + Admin | LISTO | DNS wildcard para subdominios |
| 8 | Workshops | LISTO | - |
| AI | Generacion de contenido | ADICIONAL | ANTHROPIC_API_KEY, ASSEMBLYAI_API_KEY, TRIGGER_SECRET_KEY |

---

## Para Lanzar: Checklist de Configuracion

### 1. Variables de entorno (produccion)

```bash
# Ya configuradas
DATABASE_URL="postgresql://prol:prol_dev_2026@<VPS_IP>:5433/prol?schema=public"
BETTER_AUTH_SECRET="<ya generado>"
BETTER_AUTH_URL="https://prol.prosuite.pro"
NEXT_PUBLIC_APP_URL="https://prol.prosuite.pro"
NEXT_PUBLIC_DOMAIN="prol.prosuite.pro"

# Necesitan configurarse
STRIPE_SECRET_KEY=""            # https://dashboard.stripe.com/apikeys
STRIPE_WEBHOOK_SECRET=""        # Crear endpoint en Stripe Dashboard
CLOUDFLARE_ACCOUNT_ID=""        # https://dash.cloudflare.com → Stream
CLOUDFLARE_STREAM_API_TOKEN=""  # API Tokens → Stream:Edit
RESEND_API_KEY=""               # https://resend.com/api-keys

# Opcionales (modulo AI - adicional)
ANTHROPIC_API_KEY=""
ASSEMBLYAI_API_KEY=""
TRIGGER_SECRET_KEY=""
```

### 2. Stripe Setup
1. Crear cuenta en stripe.com (o usar existente)
2. Obtener STRIPE_SECRET_KEY del dashboard
3. Configurar webhook endpoint: `https://prol.prosuite.pro/api/webhooks/stripe`
   - Eventos: `checkout.session.completed`, `checkout.session.expired`
4. Copiar STRIPE_WEBHOOK_SECRET del webhook creado
5. Para testing: usar tarjetas de test (4242 4242 4242 4242)

### 3. Cloudflare Stream Setup
1. Ir a dash.cloudflare.com → Stream
2. Copiar Account ID
3. Crear API Token con permisos Stream:Edit
4. Los videos se suben via Direct Creator Upload

### 4. Resend Setup
1. Crear cuenta en resend.com
2. Verificar dominio de envio (prosuite.pro)
3. Obtener API key

### 5. DNS
1. Configurar wildcard DNS: `*.prol.prosuite.pro` → VPS IP
2. Configurar SSL con Traefik (ya instalado en VPS)

---

## Deploy (Opciones)

### Opcion A: Docker en VPS (Recomendada - ya tienes Dokploy)
```bash
# Crear Dockerfile para la app
docker build -t prol-web .
# Desplegar via Dokploy con variables de entorno
```

### Opcion B: Vercel
```bash
# Conectar repo a Vercel
# Configurar env vars en Vercel Dashboard
# DB se mantiene en VPS con conexion directa
```

---

## Flujos E2E Verificados (con datos del seed)

### Estudiante
1. Sign-up → Dashboard
2. Ver catalogo → Detalle de curso → Inscribirse (gratis/pago)
3. Course player → Ver lecciones → Marcar completadas
4. Quiz → Contestar → Ver resultado
5. Completar curso → Certificado automatico → Notificacion

### Profesor
1. Sign-up → Onboarding (crear academia) → Dashboard profesor
2. Crear curso → Agregar modulos/lecciones → Publicar
3. Subir video → Check status → Listo para estudiantes
4. Ver dashboard revenue → Configurar Stripe Connect
5. Crear workshop → Ver reservas

### Admin
1. Login → Dashboard con stats globales
2. Crear tenant → Configurar features → Revenue share
3. Ver usuarios → Cambiar roles
4. Ver revenue global por tenant

---

## Credenciales del Seed (para testing)

| Usuario | Email | Password | Rol |
|---------|-------|----------|-----|
| Maria Garcia | maria.garcia@academiadigitalmx.com | password123 | PROFESSOR |
| Carlos Mendoza | carlos.mendoza@gmail.com | password123 | STUDENT |
| Ana Rodriguez | ana.rodriguez@outlook.com | password123 | STUDENT |
| Admin PROL | admin@prol.prosuite.pro | password123 | ADMIN |
| Super Admin | super@prol.prosuite.pro | password123 | SUPER_ADMIN |
