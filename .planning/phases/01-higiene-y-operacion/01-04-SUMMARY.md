# 01-04 — Snapshot de evidencia tipado y versionado

**Requisito:** OPS-04 · **Estado:** completo · **Fecha:** 2026-09-01

## Qué se hizo

`Evidence.formSnapshot` deja de leerse con un `as` de TypeScript —cero comprobación
en runtime— y pasa por `parseEvidenceSnapshot()`, una unión de Zod versionada.

| Rama | Cuándo aplica |
|---|---|
| legacy | filas escritas antes de este plan, sin discriminador |
| v1 | `snapshotVersion: 1`, `kind: "RISK_MATRIX"` — lo que escribe `submitRiskMatrix` desde ahora |
| — | cualquier otra forma degrada a `null`: la ficha se pinta sin tabla, no revienta |

**Commits:** `b697b3b` (esquema), `ab975e2` (lectura con `safeParse` y escritura con discriminador).

**Archivos:** `packages/shared/src/evidence-snapshot.ts` (nuevo), `packages/shared/src/index.ts`,
`apps/web/components/evidence-detail.tsx`, `apps/web/lib/actions/risk.ts`.

## Verificación

**1. Parseo, por código.** Un script desechable cargó de la base la fila legacy real
`cmtj938ve00053arl0omi0yrd` y la pasó por `parseEvidenceSnapshot()`: éxito, 2 items,
sin `snapshotVersion`. Un objeto con la forma v1 exacta que escribe hoy `risk.ts`:
éxito, `snapshotVersion: 1`, `kind: RISK_MATRIX`. Y `snapshotVersion: 2` se **rechaza
en ambas ramas** (no cae en legacy por descarte) gracias a `snapshotVersion: z.undefined()`
en la rama legacy — sin eso, un v2 mal formado se renderizaría como matriz de riesgos
en silencio, que es exactamente el bug que OPS-04 cierra.

**2. Las dos filas conviven.**

```sql
select version, (form_snapshot::jsonb ? 'snapshotVersion') as tiene_discriminador
from evidences where form_snapshot is not null order by version;
```
```
1|f      ← legacy, escrita antes del cambio
2|t      ← con discriminador
```

**3. Render real, con sesión autenticada.** El checkpoint pedía comprobación visual en
el navegador. Como no hay automatización de navegador, se hizo algo equivalente y más
comprobable: sesión obtenida por la API de Better Auth como `maria.garcia@…` (PROFESSOR)
y `GET` a las dos fichas de revisión, leyendo el HTML servido por el componente real.

| | legacy (v1 de fila) | con discriminador (v2 de fila) |
|---|---|---|
| HTTP | 200 | 200 |
| "Incumplimiento de requisitos legales" | ✓ | ✓ |
| "Certificación ISO 9001" | ✓ | ✓ |
| Responsables (Jurídico / Dirección) | ✓ | ✓ |
| Clase del nivel "Alto" (`bg-orange-100`) | ✓ | ✓ |
| Errores en la página | ninguno (`"error":"$undefined"`) | ninguno |

**Por qué esto basta para el criterio 4 de la fase:** el diff de `evidence-detail.tsx`
es de +2/−14 y **no toca la maqueta de la tabla** — sólo sustituye el cast por el
parser. El camino de render es idéntico al de antes del cambio, así que comprobar que
el contenido y las clases de nivel salen en el HTML servido cubre lo que la revisión
visual iba a cubrir. Lo que **no** se comprobó: apariencia visual en un navegador
real (CSS, espaciados). No cambió nada que pudiera afectarla.

**4. Puertas transversales:** `check-types` limpio, `lint` en `✖ 81 problems (0 errors,
81 warnings)` —la línea base exacta—, `build` verde.

## Notas para fases posteriores

- **Cómo añadir una rama nueva** (la fase 5 la va a necesitar para los registros
  nativos): añadir un esquema con su `kind` propio y `snapshotVersion: 1`, e incluirlo
  en la unión **antes** de la rama legacy. El orden importa: la legacy es la más
  permisiva y capturaría formas que no le corresponden si fuera primero.
- **`config` se deja sin validar a propósito.** `parseRiskConfig()` ya lo sanea campo a
  campo y degrada al default; duplicar esa validación en Zod obligaría a mantener dos
  definiciones del mismo contrato.
- **Las dos filas del fixture se quedan en la base local** (`1|f` y `2|t`). Son el
  banco de pruebas de regresión más barato que hay para cualquier cambio futuro sobre
  `formSnapshot`: si una deja de verse, algo se rompió.
