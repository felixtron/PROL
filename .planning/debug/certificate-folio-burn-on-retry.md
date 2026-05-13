# Debug: certificate-folio-burn-on-retry

**Status:** RESOLVED
**Date:** 2026-05-12
**Method:** Manual investigation (bug acotado a un solo archivo, hipótesis clara)

## Hypothesis

`apps/web/lib/certificate-issuer.ts` incrementa el contador de folios (`CertificateCounter.lastSeq`) DENTRO de un `$transaction` propio (línea 63-70) y luego ejecuta `db.certificate.create()` FUERA de cualquier transacción (línea 97). Si el `create()` falla por cualquier razón (network, timeout, validación, constraint distinto del unique de `enrollmentId`), el counter ya quedó incrementado pero el certificate nunca existió. El próximo retry:

1. La idempotency check (línea 49) ve `certificate == null` → procede
2. Counter upsert (línea 63-70) → incrementa OTRO folio
3. `create()` ahora sí tiene éxito → emite el nuevo folio

Resultado: cada retry quema un folio del año del tenant. La secuencia visible en los certificados queda con huecos (ej. CERT-2026-0042, CERT-2026-0044, sin 0043). Para Ibiza Consultores con muchos certificados ISO 27001 esto se acumula.

## Verification

Confirmado leyendo el código:

```ts
// línea 63-70 — counter increment EN su propia tx
const folio = await db.$transaction(async (tx) => {
  const counter = await tx.certificateCounter.upsert({
    where: { tenantId_year: { tenantId: enrollment.tenantId, year } },
    create: { tenantId: enrollment.tenantId, year, lastSeq: 1 },
    update: { lastSeq: { increment: 1 } },
  });
  return generateCertificateFolio(prefix, year, counter.lastSeq);
});

// ... hash/sha256 cálculos ...

// línea 97 — create FUERA de cualquier tx
const certificate = await db.certificate.create({ data: {...} });
```

Si la red al DB se cae entre la tx (línea 63) y el create (línea 97), o si el create falla por validación, el contador queda incrementado sin certificate emitido.

Callers de `issueCertificateForEnrollment`:
- `lib/actions/enrollment.ts:163` — inscripción completa
- `lib/actions/certificate.ts:34` — admin re-issue manual
- `lib/actions/quiz.ts:394` — examen final aprobado

Los tres son operaciones donde un retry es plausible (network, doble click, Trigger.dev replay).

## Resolution

Envolver TODO el flow dentro de un `$transaction`:

- Idempotency check (`tx.certificate.findUnique`)
- Counter upsert
- Certificate create

Si `create` falla, el `ROLLBACK` revierte también el counter increment. Concurrencia: dos transacciones simultáneas que intentan crear para el mismo `enrollmentId` chocan en el unique constraint — la perdedora hace rollback de su contador. No quema folio.

Reads que NO requieren tx (enrollment + relaciones de display) se quedan afuera; tx solo envuelve la parte transaccional.

## Fix

`apps/web/lib/certificate-issuer.ts` — refactor del helper para que toda la mutación corra dentro de un `$transaction`. Se elimina el `findUnique(certificate)` externo de la línea 49 — la idempotency check ahora vive adentro de la tx.

## Followup

Sub-issue identificado en Sprint 1 (commit `3f25bd5`): "cert issuance fuera del $transaction del quiz" — sigue siendo cierto en quiz.ts línea 392-410 porque el helper sigue abriendo su propia tx. La opción de aceptar un `tx` cliente opcional queda en backlog para unificar el flow del examen final. No es bloqueante: el helper ya es atómico por sí solo.
