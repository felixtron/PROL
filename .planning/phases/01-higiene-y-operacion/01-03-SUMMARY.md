# 01-03 — Evidencia legacy de matriz de riesgos

**Requisito:** OPS-04 (precondición) · **Estado:** completo · **Fecha:** 2026-09-01

## Qué se hizo

Existe en la base local una fila `evidences` con `form_snapshot` no nulo y **sin
discriminador**, para que el plan 01-04 valide su rama legacy contra datos que no
generó él mismo.

## Desviación respecto al plan — importante

El plan pedía que la matriz se entregara **desde la interfaz autenticada**, para
que el `formSnapshot` lo escribiera `submitRiskMatrix`. No se pudo: la matriz sólo
se entrega por server actions (no hay ninguna ruta API equivalente, verificado) y
no hay automatización de navegador disponible.

**Degradación controlada aplicada.** En vez de fabricar la forma del snapshot —que
es justo lo que el plan quería evitar— se reutilizó el **bloque literal** de
`apps/web/lib/actions/risk.ts`, y el script **aborta si ese bloque deja de coincidir
carácter a carácter con el fuente** (comparación normalizando espacios). Además las
puntuaciones y niveles los calcularon los helpers reales `riskScore` y `riskLevel`
de `apps/web/lib/compliance.ts`, no valores escritos a mano.

| | |
|---|---|
| **No degradado** | La forma del snapshot sale del código real y se verifica contra el fuente. Las puntuaciones las calculan los helpers reales. |
| **Sí degradado** | Las filas `RiskAssessment`/`Evidence` se crearon con Prisma en vez de pasar por `submitEvidence()`, que exige sesión. |

Lo que esto **no** cubre: si `submitEvidence()` hiciera alguna transformación
adicional sobre el snapshot, no la veríamos. Se revisó y no la hace —`risk.ts`
escribe `formSnapshot` en un `update` posterior a `submitEvidence`—, pero queda
anotado.

## Identificadores

```
evidenceId:    cmtj938ve00053arl0omi0yrd
assessmentId:  cmtj938un00013arli9885or4
assignmentId:  cmtj66ac20009t30l32b3yipo
activityId:    cmtj66acc000bt30lckqtuh0d
sectionId:     cmtj66abo0005t30l4dkcn9ix
```

URLs de re-verificación (dev server local):
- `http://localhost:3000/professor/evidence/cmtj938ve00053arl0omi0yrd`
- `http://localhost:3000/tenant-admin/evidence/cmtj938ve00053arl0omi0yrd`

## El JSON legacy

Claves de primer nivel, confirmadas por consulta: `items`, `title`, `config`,
`periodLabel`, `submittedAt`. **Ni `snapshotVersion` ni `kind`.**

```json
{
    "items": [
        {
            "type": "RISK",
            "level": "Alto",
            "score": 12,
            "impact": 4,
            "actions": "Auditoría legal semestral",
            "description": "Incumplimiento de requisitos legales",
            "probability": 3,
            "responsible": "Jurídico"
        },
        {
            "type": "OPPORTUNITY",
            "level": "Alto",
            "score": 10,
            "impact": 5,
            "actions": "Contratar consultoría",
            "description": "Certificación ISO 9001",
            "probability": 2,
            "responsible": "Dirección"
        }
    ],
    "title": "Matriz de riesgos y oportunidades",
    "config": {
        "levels": [
            { "min": 15, "label": "Crítico", "className": "bg-rose-100 text-rose-700" },
            { "min": 9,  "label": "Alto",    "className": "bg-orange-100 text-orange-700" },
            { "min": 4,  "label": "Medio",   "className": "bg-amber-100 text-amber-800" },
            { "min": 0,  "label": "Bajo",    "className": "bg-emerald-100 text-emerald-700" }
        ],
        "scaleMax": 5,
        "impactLabels": ["Insignificante", "Menor", "Moderada", "Mayor", "Crítica"],
        "probabilityLabels": ["Muy baja", "Baja", "Media", "Alta", "Muy alta"]
    },
    "periodLabel": "2026",
    "submittedAt": "2026-09-01T22:40:23.180Z"
}
```

Comprobación de que es legacy:

```sql
select (form_snapshot::jsonb ? 'snapshotVersion') or (form_snapshot::jsonb ? 'kind')
from evidences where form_snapshot is not null;   -- devuelve f
```

## Verificación

- `bloque formSnapshot` idéntico al de `risk.ts` — comprobado por el propio script antes de escribir.
- Discriminador ausente — comprobado por consulta SQL.
- Puntuaciones: 3×4=12 → "Alto"; 2×5=10 → "Alto". Coinciden con `riskScore`/`riskLevel`.
- Sin cambios de código: los dos scripts desechables se borraron.

## Notas para fases posteriores

- **El seed no crea manuales.** Toda la cadena `Manual → Chapter → Section →
  EvidenceRequirement → Assignment → Activity` hubo que fabricarla a mano. La fase 3
  (Procedimientos nativos) la va a necesitar otra vez: conviene añadirla al seed en
  vez de repetir el fixture.
- **El seed sólo crea una empresa (Acme Corp).** El criterio 1 de la fase 3 exige
  emitir el mismo documento a **dos** empresas para comprobar la personalización.
- **Sigue pendiente la verificación visual** del criterio 4: nadie ha mirado con
  ojos humanos la tabla del snapshot en `/professor/evidence/<id>`. El plan 01-04
  la vuelve a pedir, y ahora es más barata porque la fila ya existe.
