# Deferred Items — Phase 02 (R2 para el tier confidencial)

Hallazgos fuera del alcance del plan que los descubrió. No se corrigen aquí:
scope boundary del executor (sólo se auto-arregla lo causado por la tarea
actual; lo demás se registra y se deja para quien decida priorizarlo).

## ✅ RESUELTO en `5e2352d` — [Plan 02-02] `requireUser()` ya no lanza `"Unauthorized"` — las rutas que
comparan ese string nunca devuelven 401 a una petición sin sesión

> **Cerrado el 2026-09-01, fuera del alcance de los cuatro planes.** El verificador
> de la fase lo confirmó de forma independiente y dejó el criterio 3 en *parcial*;
> el usuario decidió arreglarlo en vez de aceptar la salvedad. La solución no fue
> reescribir la comparación de cadenas —que volvería a romperse la próxima vez que
> alguien traduzca el mensaje— sino darle al error una identidad propia:
> `UnauthenticatedError` en `apps/web/lib/auth.ts`, y `instanceof` en las ocho
> rutas. `/api/upload/document-template` además separaba mal autenticación de
> autorización (las dos daban 403) y ahora las distingue.
>
> Verificado con las tres sesiones sobre las ocho rutas: sin sesión **401**, otra
> empresa **403**, empresa dueña **200**. El resto de este registro se conserva
> como está por su análisis de causa raíz.

**Encontrado durante:** Tarea 3 del plan 02-02, al demostrar el criterio 3
("sin sesión → 401"). La petición sin sesión a `/files/evidence/[id]` devolvió
**403** con cuerpo `"Sesión expirada. Inicia sesión de nuevo."`, no 401 con
`"No autenticado"` como documentaba el plan.

**Causa raíz:** El commit `d991c31` ("Hardening producción — bloque 4") cambió
el mensaje que lanza `getCurrentUser()` (vía `requireUser()`, en
`apps/web/lib/auth.ts`) de `"Unauthorized"` a
`"Sesión expirada. Inicia sesión de nuevo."`, pero no actualizó los `catch` que
comparan `message === "Unauthorized"` para decidir el 401. Es un bug
pre-existente, anterior a toda la fase 2, sin relación con el cambio de
backend de almacenamiento.

**Alcance del bug** (grep de `"Unauthorized"` en `apps/web/app`, 2026-09-02):
- `apps/web/app/files/evidence/[id]/route.ts`
- `apps/web/app/files/company-document/[id]/route.ts`
- `apps/web/app/files/manual-document/[id]/route.ts`
- `apps/web/app/api/assignments/[lessonId]/route.ts`
- `apps/web/app/api/upload/evidence/route.ts`
- `apps/web/app/api/upload/document-template/route.ts`
- `apps/web/app/api/upload/pdf/route.ts`
- `apps/web/app/api/upload/assignment/route.ts`

Los ocho devuelven 403 en vez de 401 ante una petición sin sesión, desde
`d991c31`.

**Por qué no se corrige en este plan:**
1. Las tres rutas `/files/*/[id]/route.ts` están explícitamente prohibidas de
   editar en el CONTEXT y en el propio plan 02-02 ("Cero ediciones... en las
   tres rutas `apps/web/app/files/*/[id]/route.ts`").
2. Aunque no estuviera prohibido, el bug no lo causó el cambio de backend de
   almacenamiento de este plan — es anterior y transversal a ocho rutas de
   varios módulos, fuera del radio de la tarea actual.
3. La autorización (403 para otra empresa, 200 para la empresa dueña y el
   revisor) sigue funcionando exactamente igual que antes del cambio de
   backend, que es lo que el criterio 3 de la fase realmente necesitaba
   demostrar. El código HTTP para "sin sesión" es 403 en vez de 401 tanto
   antes como después de este plan: es idéntico, sólo que distinto de lo que
   la documentación del plan asumía.

**Impacto real:** Bajo. Cualquier cliente que distinga 401 de 403 para
reintentar login vs. mostrar "no autorizado" recibe la señal equivocada, pero
el acceso sigue bloqueado en ambos casos. No es una fuga de datos ni un bypass
de autorización.

**Sugerencia para quien lo priorice:** Cambiar las ocho comparaciones
`message === "Unauthorized"` a `message === "Sesión expirada. Inicia sesión de
nuevo."`, o mejor, hacer que `getCurrentUser()` lance un error tipado (o dos
mensajes distintos: uno para "no autenticado" y otro para "sesión expirada")
en vez de comparar strings frágiles. Toca ocho archivos fuera de esta fase;
no se lista como requisito de ningún plan de la fase 2.
