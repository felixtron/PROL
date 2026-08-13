# (Norma ISO 9001) Diagnóstico inicial: Sistemas de Gestión de la Calidad

**Especificación completa de construcción, contenido y modelo de calificación.**
Documento pensado para que un agente en otra herramienta pueda replicar el
instrumento sin acceso al código de PROL.

- Origen: módulo *Evaluaciones* de PROL (`kind = DIAGNOSTIC`).
- Versión de la norma: **ISO 9001:2015** (cláusulas 4 a 10). Si se trabaja con
  una revisión posterior, hay que revisar numeración y redacción de cláusulas.
- Estado de los datos: la **mecánica y las fórmulas** de este documento están
  extraídas literalmente del código de producción. El **cuestionario** (§4) está
  reconstruido a partir de la estructura de cláusulas de la norma, porque las
  filas reales viven únicamente en la base de datos de producción. Ver §9 para
  volcar el contenido exacto y sustituir §4 si se requiere fidelidad 1:1.

---

## 1. Resumen ejecutivo

Un **diagnóstico inicial** es una plantilla de evaluación que:

1. Se organiza en **secciones** (una por cláusula de la norma) con **preguntas**
   codificadas (`4.1.1`, `8.5.2`, …).
2. Se responde con **opción única: Sí / Parcialmente / No** (y opcionalmente
   *No aplica*, activable pregunta por pregunta).
3. Se **asigna a una empresa**; dentro de la empresa responden **varios
   participantes** (el líder + los miembros que designe).
4. Consolida las respuestas de todos los participantes en un **% de cumplimiento**
   y su complemento, el **GAP**, a nivel de pregunta, sección y global.
5. Produce un reporte web + PDF con barras apiladas y porcentajes.

Fórmula central:

```
cumplimiento = (Sí × 1 + Parcialmente × 0.5 + No × 0) / (Sí + Parcialmente + No) × 100
GAP          = 100 − cumplimiento
```

---

## 2. Modelo de datos

Siete entidades. Nombres de tabla entre paréntesis.

### 2.1 Enumeraciones

```
EvaluationKind        = DAFO | DIAGNOSTIC | GUIDELINES | STAKEHOLDERS | ROLES
EvaluationStatus      = DRAFT | PUBLISHED | ARCHIVED
EvaluationSectionType = INTERNAL | EXTERNAL
EvaluationQuestionType= MULTIPLE_CHOICE | OPEN_TEXT | MULTI_FACTOR | MULTI_SELECT
EvaluationAnswerValue = POSITIVE | PARTIAL | NEGATIVE | NOT_APPLICABLE
EvaluationFactor      = STRENGTH | WEAKNESS | OPPORTUNITY | THREAT
```

Para un diagnóstico ISO 9001 solo se usan:
`kind = DIAGNOSTIC`, `type = MULTIPLE_CHOICE` (+ algún `OPEN_TEXT`),
valores `POSITIVE | PARTIAL | NEGATIVE | NOT_APPLICABLE`.

> `EvaluationSectionType` (INTERNAL/EXTERNAL) es **obligatorio en el esquema pero
> irrelevante para el reporte de diagnóstico**: solo cambia las etiquetas del
> reporte DAFO (Fortaleza/Debilidad vs Oportunidad/Amenaza). En un diagnóstico
> se pone `INTERNAL` en todas las secciones.

### 2.2 Entidades

**`Evaluation` (evaluations)** — la plantilla.

| Campo | Tipo | Notas |
|---|---|---|
| `id` | cuid | |
| `tenantId` | FK Tenant | multi-tenant; una plantilla pertenece a una consultora |
| `createdById` | FK User | autor (PROFESSOR / ADMIN) |
| `title` | string 3–120 | `"(Norma ISO 9001) Diagnóstico inicial: Sistemas de Gestión de la Calidad"` |
| `description` | string? | propósito, a quién va dirigido |
| `methodology` | string? | cómo responder, criterios de Sí/Parcial/No |
| `status` | EvaluationStatus | `DRAFT` mientras se edita, `PUBLISHED` para asignar |
| `kind` | EvaluationKind | **`DIAGNOSTIC`** |

**`EvaluationSection` (evaluation_sections)** — un bloque = una cláusula.

| Campo | Tipo | Notas |
|---|---|---|
| `evaluationId` | FK | cascade delete |
| `title` | string | `"4. Contexto de la organización"` |
| `type` | INTERNAL/EXTERNAL | usar `INTERNAL` |
| `position` | int | orden ascendente |

**`EvaluationQuestion` (evaluation_questions)**

| Campo | Tipo | Notas |
|---|---|---|
| `sectionId` | FK | |
| `code` | string? | `"4.1.1"`. Se renderiza como `4.1.1.` en negrita antes del enunciado |
| `label` | string | el enunciado |
| `description` | string? | evidencia esperada / ayuda al respondiente |
| `position` | int | orden |
| `type` | EvaluationQuestionType | `MULTIPLE_CHOICE` para lo que puntúa |
| `options` | json? | solo `MULTI_SELECT` |
| `minSelections` / `maxSelections` | int? | solo `MULTI_SELECT` |
| `allowNotApplicable` | bool, default **false** | si `true`, el respondiente ve "No aplica" |

**`EvaluationAssignment` (evaluation_assignments)** — plantilla × empresa.
Único por `(evaluationId, companyId)`. Guarda `assignedById` y `assignedAt`.

**`EvaluationParticipant` (evaluation_participants)** — quién debe responder.
Único por `(assignmentId, userId)`. El líder de la empresa se añade
automáticamente y **no puede ser removido**.

**`EvaluationSubmission` (evaluation_submissions)** — un envío completo.
`version` autoincremental por participante, único `(participantId, version)`.
Cada "Enviar" crea una versión nueva; **solo la última cuenta**.

**`EvaluationAnswer` (evaluation_answers)** — una respuesta por pregunta.
Único `(submissionId, questionId)`. Campos mutuamente excluyentes según el tipo
de pregunta: `value` (opción única), `text` (abierta), `factors[]` (DAFO
múltiple), `selectedOptionIndexes[]` (multi-selección).

### 2.3 Diagrama de relaciones

```
Tenant ─┬─ Evaluation ─┬─ EvaluationSection ── EvaluationQuestion ──┐
        │              └─ EvaluationAssignment ── EvaluationParticipant
        └─ Company ────────────┘                        │
                                                        └─ EvaluationSubmission (v1..vN)
                                                                    └─ EvaluationAnswer ──┘
```

---

## 3. Construcción de la plantilla (flujo del autor)

1. **Crear la evaluación**: tipo `Diagnóstico`, título, descripción, metodología.
   Nace en `DRAFT`.
2. **Crear secciones** en orden (una por cláusula), todas `INTERNAL`.
3. **Crear preguntas** dentro de cada sección con `code`, `label`, `description`
   y `type = MULTIPLE_CHOICE`.
   - Activar `allowNotApplicable = true` **solo** en controles que legítimamente
     pueden no aplicar a una organización (diseño y desarrollo, propiedad del
     cliente, equipos de medición). Por defecto está apagado para forzar
     Sí/Parcial/No y no inflar el cumplimiento con exclusiones.
4. **Publicar** (`PUBLISHED`).
5. **Asignar a una empresa** → crea `EvaluationAssignment`; el líder queda como
   participante automáticamente.
6. **El líder añade participantes** (miembros de su empresa).
7. Los participantes responden; el reporte consolidado se calcula en vivo.

### Reglas de validación del autor

- Título de la evaluación: 3–120 caracteres.
- `PARTIAL` ("Parcialmente") **solo es válido si `kind = DIAGNOSTIC`**; en otros
  tipos el servidor rechaza la respuesta.
- `NOT_APPLICABLE` en un diagnóstico solo se acepta si la pregunta tiene
  `allowNotApplicable = true` (defensa en servidor, no solo en UI).

---

## 4. Contenido: secciones y preguntas

> Estructura por cláusulas de **ISO 9001:2015**. 71 preguntas puntuables +
> 3 abiertas de cierre. Para una versión corta, conservar 2–3 preguntas por
> cláusula (las marcadas con ★).
>
> `description` = evidencia que el consultor espera ver para justificar un "Sí".

### Sección 1 — `4. Contexto de la organización`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 4.1.1 ★ | ¿La organización ha identificado y documentado las cuestiones externas e internas pertinentes a su propósito y dirección estratégica? | Análisis de contexto vigente (DAFO, PESTEL) fechado y aprobado | no |
| 4.1.2 | ¿Se revisa y actualiza periódicamente ese análisis de contexto? | Acta o registro de revisión con fecha y versión | no |
| 4.2.1 ★ | ¿Están identificadas las partes interesadas pertinentes al sistema de gestión de la calidad? | Matriz de partes interesadas | no |
| 4.2.2 | ¿Están determinados sus requisitos y se realiza seguimiento de ellos? | Matriz con requisitos y su seguimiento | no |
| 4.3.1 ★ | ¿El alcance del SGC está definido y documentado (productos/servicios, ubicaciones, procesos)? | Documento de alcance disponible | no |
| 4.3.2 | ¿Se justifican documentalmente los requisitos de la norma considerados no aplicables? | Justificación dentro del alcance | no |
| 4.4.1 ★ | ¿Están identificados los procesos del SGC, sus entradas, salidas, secuencia e interacción? | Mapa de procesos | no |
| 4.4.2 | ¿Cada proceso tiene responsable, criterios de control e indicadores de desempeño? | Fichas de proceso con indicadores | no |
| 4.4.3 | ¿Se conserva información documentada que dé confianza en que los procesos se realizan según lo planificado? | Registros de operación de los procesos | no |

### Sección 2 — `5. Liderazgo`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 5.1.1 ★ | ¿La alta dirección demuestra liderazgo asumiendo la responsabilidad de la eficacia del SGC? | Participación en revisiones, asignación de recursos | no |
| 5.1.2 | ¿El SGC está integrado a los procesos de negocio (no es un sistema paralelo solo para auditorías)? | Procedimientos operativos = procedimientos del SGC | no |
| 5.1.3 ★ | ¿La alta dirección asegura que se determinan y cumplen los requisitos del cliente y los legales/reglamentarios aplicables? | Matriz de requisitos legales y de cliente | no |
| 5.1.4 | ¿Se determinan y abordan los riesgos y oportunidades que afectan la conformidad del producto/servicio y la satisfacción del cliente? | Matriz de riesgos vinculada a procesos | no |
| 5.2.1 ★ | ¿Existe una política de la calidad documentada, apropiada al propósito y contexto, con compromiso de cumplir requisitos y mejorar continuamente? | Política firmada y vigente | no |
| 5.2.2 | ¿La política está comunicada, entendida y aplicada internamente, y disponible para las partes interesadas? | Evidencia de difusión y comprensión | no |
| 5.3.1 ★ | ¿Están asignadas, comunicadas y entendidas las responsabilidades y autoridades de los roles pertinentes del SGC? | Organigrama y descripciones de puesto | no |
| 5.3.2 | ¿Hay un rol con autoridad asignada para informar a la alta dirección sobre el desempeño del SGC? | Nombramiento documentado | no |

### Sección 3 — `6. Planificación`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 6.1.1 ★ | ¿Se han determinado los riesgos y oportunidades considerando el contexto (4.1) y las partes interesadas (4.2)? | Matriz de riesgos trazable al contexto | no |
| 6.1.2 | ¿Existen acciones planificadas para abordarlos, integradas en los procesos del SGC? | Planes de acción con responsable y plazo | no |
| 6.1.3 | ¿Se evalúa la eficacia de esas acciones? | Registro de evaluación posterior | no |
| 6.2.1 ★ | ¿Hay objetivos de la calidad establecidos para las funciones y niveles pertinentes, coherentes con la política? | Tablero o documento de objetivos | no |
| 6.2.2 ★ | ¿Los objetivos son medibles y tienen plazo, responsable y recursos (qué, quién, cuándo, cómo se evalúa)? | Plan por objetivo | no |
| 6.2.3 | ¿Se hace seguimiento del avance de los objetivos y se comunica el resultado? | Reportes periódicos | no |
| 6.3.1 | ¿Los cambios en el SGC se planifican de forma controlada (propósito, consecuencias, recursos, responsabilidades)? | Registro de gestión del cambio | no |

### Sección 4 — `7. Apoyo`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 7.1.1 ★ | ¿Se determinan y proporcionan los recursos necesarios para el SGC (personas, presupuesto, tiempo)? | Presupuesto y plan de recursos | no |
| 7.1.2 | ¿La infraestructura necesaria (instalaciones, equipos, TI) está determinada, disponible y mantenida? | Plan de mantenimiento y registros | no |
| 7.1.3 | ¿Se gestiona el ambiente para la operación de los procesos (factores físicos, sociales, psicológicos)? | Evaluaciones de condiciones de trabajo | no |
| 7.1.4 | ¿Los equipos de seguimiento y medición están identificados, calibrados/verificados y con registros trazables? | Programa y certificados de calibración | **sí** |
| 7.1.5 | ¿Se determinan, mantienen y ponen a disposición los conocimientos necesarios para la operación? | Repositorio de conocimiento, lecciones aprendidas | no |
| 7.2.1 ★ | ¿Están definidos los perfiles de competencia (educación, formación, experiencia) de los puestos que afectan al desempeño del SGC? | Descripciones de puesto con competencias | no |
| 7.2.2 ★ | ¿Se evalúa la competencia y se toman acciones (formación, tutoría, reasignación) cuya eficacia se evalúa? | Plan de formación + evaluación de eficacia | no |
| 7.3.1 | ¿El personal es consciente de la política, los objetivos, su contribución y las implicaciones de no cumplir requisitos? | Registros de sensibilización | no |
| 7.4.1 | ¿Está definida la comunicación interna y externa del SGC (qué, cuándo, a quién, quién y cómo)? | Plan o matriz de comunicación | no |
| 7.5.1 ★ | ¿La información documentada requerida por la norma y la necesaria para la eficacia del SGC está creada y disponible? | Listado maestro de documentos | no |
| 7.5.2 | ¿Existe control de creación y actualización (identificación, formato, revisión y aprobación)? | Procedimiento de control documental | no |
| 7.5.3 | ¿Se controlan distribución, acceso, versiones, conservación y disposición, incluida la documentación de origen externo? | Registro de versiones y accesos | no |

### Sección 5 — `8. Operación`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 8.1.1 ★ | ¿Los procesos operativos están planificados, con criterios de aceptación y recursos definidos? | Planes de calidad o fichas de proceso | no |
| 8.1.2 | ¿Se controlan los procesos contratados externamente? | Contratos y controles definidos | no |
| 8.2.1 | ¿La comunicación con el cliente cubre información del producto/servicio, consultas, contratos, retroalimentación y quejas? | Canales y registros de atención | no |
| 8.2.2 ★ | ¿Se determinan los requisitos del producto/servicio, incluidos los legales/reglamentarios y los no declarados pero necesarios? | Especificaciones y matriz legal | no |
| 8.2.3 ★ | ¿Se revisan los requisitos antes de comprometerse con el cliente y se conservan registros de esa revisión? | Registro de revisión de pedidos/propuestas | no |
| 8.2.4 | ¿Los cambios en los requisitos se documentan y se comunican a las personas pertinentes? | Control de cambios de pedido | no |
| 8.3.1 | ¿Existe un proceso de diseño y desarrollo con etapas, controles, revisiones, verificación y validación? | Procedimiento y registros de diseño | **sí** |
| 8.3.2 | ¿Se controlan los cambios del diseño y se conservan registros? | Registro de cambios de diseño | **sí** |
| 8.4.1 ★ | ¿Están definidos los criterios de evaluación, selección, seguimiento y reevaluación de proveedores externos? | Procedimiento de compras y evaluación | no |
| 8.4.2 | ¿Se define el tipo y alcance del control sobre proveedores según su impacto? | Clasificación de proveedores | no |
| 8.4.3 | ¿Se comunica a los proveedores lo requerido (procesos, competencias, verificación en sus instalaciones)? | Órdenes de compra con requisitos | no |
| 8.5.1 ★ | ¿La producción/prestación se realiza en condiciones controladas (instrucciones, equipos, personal calificado, validaciones)? | Instructivos de trabajo y registros | no |
| 8.5.2 | ¿Se identifican las salidas y se mantiene trazabilidad cuando es requerida? | Sistema de identificación/lotes | no |
| 8.5.3 | ¿Se cuida la propiedad del cliente o de proveedores externos y se informa cualquier pérdida o deterioro? | Registro de bienes de terceros | **sí** |
| 8.5.4 | ¿Se preservan las salidas durante la producción y la entrega (manipulación, almacenamiento, protección)? | Condiciones de almacén y embalaje | no |
| 8.5.5 | ¿Se cumplen los requisitos de las actividades posteriores a la entrega (garantía, mantenimiento, soporte)? | Contratos de servicio y registros | no |
| 8.5.6 | ¿Se controlan y registran los cambios no planificados en la producción/prestación? | Registro de control de cambios | no |
| 8.6.1 ★ | ¿Se verifica el cumplimiento de los requisitos antes de liberar el producto/servicio, con registro de quién autoriza? | Registro de liberación firmado | no |
| 8.7.1 ★ | ¿Las salidas no conformes se identifican y controlan para prevenir su uso o entrega no intencionada? | Procedimiento de producto no conforme | no |
| 8.7.2 | ¿Se registran las no conformidades, la acción tomada, las concesiones obtenidas y quién decide? | Registros de no conformidad | no |

### Sección 6 — `9. Evaluación del desempeño`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 9.1.1 ★ | ¿Está definido qué se mide, con qué métodos, cuándo se mide y cuándo se analizan los resultados? | Plan de seguimiento y medición | no |
| 9.1.2 ★ | ¿Se realiza seguimiento de la percepción del cliente (encuestas, quejas, reuniones, felicitaciones)? | Resultados de satisfacción | no |
| 9.1.3 | ¿Se analizan y evalúan los datos para determinar conformidad, satisfacción, desempeño de procesos y proveedores, y eficacia de las acciones ante riesgos? | Informe de análisis de datos | no |
| 9.2.1 ★ | ¿Existe un programa de auditorías internas con frecuencia, métodos, responsabilidades y criterios definidos? | Programa anual de auditoría | no |
| 9.2.2 | ¿Los auditores son competentes y se asegura su objetividad e imparcialidad? | Perfiles y asignación de auditores | no |
| 9.2.3 | ¿Los resultados de auditoría se informan a la dirección pertinente y derivan en correcciones y acciones correctivas sin demora? | Informes y planes de acción | no |
| 9.3.1 ★ | ¿La alta dirección realiza revisiones del SGC a intervalos planificados? | Actas de revisión por la dirección | no |
| 9.3.2 | ¿La revisión cubre todas las entradas requeridas (acciones previas, cambios, desempeño, satisfacción, objetivos, no conformidades, auditorías, proveedores, recursos, riesgos y oportunidades)? | Acta con agenda completa | no |
| 9.3.3 | ¿Las salidas de la revisión incluyen decisiones sobre mejora, cambios y necesidad de recursos, con su registro? | Acta con acuerdos y responsables | no |

### Sección 7 — `10. Mejora`

| Código | Enunciado | Evidencia esperada | N/A |
|---|---|---|---|
| 10.1.1 ★ | ¿Se identifican y seleccionan oportunidades de mejora para cumplir requisitos y aumentar la satisfacción del cliente? | Registro de oportunidades de mejora | no |
| 10.2.1 ★ | ¿Ante una no conformidad se reacciona, se controla y corrige, y se afrontan sus consecuencias? | Registros de corrección inmediata | no |
| 10.2.2 ★ | ¿Se analiza la causa raíz y se evalúa la necesidad de acciones para que no vuelva a ocurrir? | Análisis causa raíz (5 porqués, Ishikawa) | no |
| 10.2.3 | ¿Se revisa la eficacia de las acciones correctivas y se actualizan riesgos/oportunidades y el SGC si es necesario? | Cierre de acción con verificación | no |
| 10.2.4 | ¿Se conserva información documentada de la naturaleza de las no conformidades y de los resultados de las acciones? | Base de no conformidades | no |
| 10.3.1 | ¿Se mejora continuamente la conveniencia, adecuación y eficacia del SGC usando los resultados del análisis, la evaluación y la revisión por la dirección? | Evidencia de mejoras implantadas | no |

### Sección 8 — `Cierre cualitativo` (no puntúa)

Preguntas `OPEN_TEXT`, excluidas de todo cálculo. Se muestran como listado de
respuestas atribuidas a cada participante.

| Código | Enunciado |
|---|---|
| C.1 | ¿Cuál considera el principal obstáculo para implantar o mantener el SGC en su organización? |
| C.2 | ¿Qué procesos considera más críticos para la calidad del producto o servicio? |
| C.3 | Comentarios adicionales para el equipo consultor. |

---

## 5. Flujo del respondiente y validaciones

### Opciones que ve el participante (kind = DIAGNOSTIC)

| Valor almacenado | Etiqueta | Peso |
|---|---|---|
| `POSITIVE` | Sí | 1.0 |
| `PARTIAL` | Parcialmente | 0.5 |
| `NEGATIVE` | No | 0.0 |
| `NOT_APPLICABLE` | No aplica | excluido |

`NOT_APPLICABLE` **solo aparece** si la pregunta tiene `allowNotApplicable = true`.

### Reglas de envío (validadas en servidor)

1. Deben responderse **todas** las preguntas; si faltan → error
   `Faltan N respuesta(s) por contestar`.
2. No se aceptan respuestas a preguntas que no pertenecen a la evaluación → `Respuestas inválidas`.
3. Forma por tipo: `MULTIPLE_CHOICE` requiere `value`; `OPEN_TEXT` requiere `text`
   no vacío; `MULTI_FACTOR` al menos un factor; `MULTI_SELECT` índices únicos y
   dentro de `[min, max]`.
4. `PARTIAL` fuera de `DIAGNOSTIC` → error.
5. `NOT_APPLICABLE` en pregunta sin `allowNotApplicable` → error.
6. Cada envío crea una **nueva versión** (`version = último + 1`), calculada
   dentro de una transacción con bloqueo de fila (`SELECT ... FOR UPDATE`) sobre
   el participante para evitar colisiones en envíos concurrentes.
7. El participante puede **re-enviar**: el formulario se precarga con la última
   versión y el nuevo envío la sustituye a efectos de reporte.

---

## 6. Modelo de calificación

Este es el núcleo a replicar. Todo se calcula **en lectura**, no se persiste
ningún puntaje.

### 6.0 Base de cálculo

- Se toma **la última versión (`version` máxima) de cada participante**. Las
  versiones anteriores se ignoran por completo.
- Los participantes que nunca enviaron **no cuentan** (no penalizan).
- Cada respuesta de cada participante es **un voto**; los votos de todos los
  participantes de una empresa se agregan por pregunta.

### 6.1 Conteos por pregunta

Para cada pregunta se acumula:

```
counts = { POSITIVE: n1, PARTIAL: n2, NEGATIVE: n3, NOT_APPLICABLE: n4 }
```

### 6.2 Cumplimiento de una pregunta

```js
function complianceOf(counts) {
  const denom = counts.POSITIVE + counts.PARTIAL + counts.NEGATIVE; // N/A excluido
  if (denom === 0) return null;   // sin respuestas computables → se excluye
  return ((counts.POSITIVE * 1 + counts.PARTIAL * 0.5) / denom) * 100;
}
const gapOf = (counts) => { const c = complianceOf(counts); return c === null ? null : 100 - c; };
```

Reglas clave:

- **`NOT_APPLICABLE` no está en el denominador**: no suma ni resta.
- Si todas las respuestas de una pregunta son N/A, `denom = 0` → la pregunta se
  **excluye de todos los agregados** (no cuenta como 0 %).
- Solo participan preguntas `MULTIPLE_CHOICE`. `OPEN_TEXT`, `MULTI_FACTOR` y
  `MULTI_SELECT` quedan fuera de todo cálculo.

### 6.3 Cumplimiento de una sección

Promedio **simple del cumplimiento de sus preguntas** (no promedio de votos):

```js
function sectionCompliance(section) {
  const values = section.questions
    .filter(q => q.type === "MULTIPLE_CHOICE")
    .map(q => complianceOf(q.counts))
    .filter(c => c !== null);
  if (values.length === 0) return null;
  return round1(values.reduce((a, b) => a + b, 0) / values.length);
}
const gapSection = round1(100 - sectionCompliance); // sobre el valor YA redondeado
```

### 6.4 Cumplimiento global

**No es el promedio de las secciones.** Es el promedio simple del cumplimiento
de **todas las preguntas `MULTIPLE_CHOICE` de la evaluación** con al menos una
respuesta computable:

```js
let sum = 0, n = 0, pos = 0, partial = 0, neg = 0;
for (const s of sections)
  for (const q of s.questions) {
    if (q.type !== "MULTIPLE_CHOICE") continue;
    const c = complianceOf(q.counts);
    if (c === null) continue;
    sum += c; n += 1;
    pos += q.counts.POSITIVE; partial += q.counts.PARTIAL; neg += q.counts.NEGATIVE;
  }
const overallCompliance = n > 0 ? round1(sum / n) : 0;
const overallGap        = round1(100 - overallCompliance);
```

> ⚠️ **Consecuencia de diseño**: al promediar por pregunta y no por sección, las
> cláusulas con más preguntas pesan más. Con el cuestionario de §4, la cláusula 8
> (20 preguntas) aporta ~28 % del puntaje global y la 10 (6 preguntas) ~8 %.
> Si se quiere igual peso por cláusula hay que promediar `sectionCompliance`
> — eso **sería una desviación** respecto a PROL, no su comportamiento actual.

### 6.5 Veredicto por pregunta (icono, no puntaje)

Independiente del %; sirve para el icono ✓ / ◑ / ✗ / — junto al enunciado:

```js
function verdictOf(counts) {
  if (!counts) return "NO_RESPONSE";
  const total = counts.POSITIVE + counts.PARTIAL + counts.NEGATIVE + counts.NOT_APPLICABLE;
  if (total === 0) return "NO_RESPONSE";
  if (counts.NOT_APPLICABLE === total) return "NOT_APPLICABLE"; // todos marcaron N/A
  const opts = [["POSITIVE", counts.POSITIVE], ["PARTIAL", counts.PARTIAL], ["NEGATIVE", counts.NEGATIVE]];
  opts.sort((a, b) => b[1] - a[1]);          // orden estable: empate favorece POSITIVE > PARTIAL > NEGATIVE
  return opts[0][1] === 0 ? "NOT_APPLICABLE" : opts[0][0];
}
```

### 6.6 Redondeo

```js
const round1  = (x) => Math.round(x * 10) / 10;      // porcentajes de cumplimiento y GAP
const pctOf   = (c, t) => t > 0 ? Math.round((c / t) * 1000) / 10 : 0; // leyendas de distribución
```

Los GAP se calculan **sobre el valor ya redondeado** del cumplimiento
(`100 − round1(cumplimiento)`), no sobre el crudo.

### 6.7 Ejemplo numérico

Empresa con 3 participantes; pregunta 8.5.1 responde `Sí, Sí, Parcialmente`:

```
denom = 2 + 1 + 0 = 3
cumplimiento = (2×1 + 1×0.5) / 3 × 100 = 83.3 %
GAP = 16.7 %
veredicto = POSITIVE (2 votos)
```

Pregunta 8.3.1 (`allowNotApplicable`) responde `N/A, N/A, N/A`:

```
denom = 0 → cumplimiento = null → la pregunta NO entra en el promedio de la
sección ni en el global. El divisor de la sección baja de 20 a 19.
```

### 6.8 Lo que PROL **no** hace (decisiones abiertas para quien replique)

- **No hay ponderación por pregunta ni por cláusula**: todas valen igual.
- **No hay bandas de madurez** (p. ej. 0–40 inicial / 41–70 en desarrollo /
  71–90 consolidado / 91–100 maduro). El reporte solo muestra % y GAP. Si el
  otro sistema las necesita, hay que definirlas explícitamente: es un añadido.
- **No hay umbral de aprobación** ni estado aprobado/reprobado.
- **No se detecta ni reporta la dispersión entre participantes** (dos respuestas
  contradictorias solo se promedian).
- **No hay ponderación por rol** del participante.

---

## 7. Reporte

### 7.1 Vista web consolidada

Tres bloques, en este orden:

1. **Tarjeta resumen GAP**
   - `Cumplimiento global` en grande (verde `#047857` en PDF, `emerald-700` en web).
   - Subtexto: `GAP de X% sobre N pregunta(s) con respuestas`.
   - Nota del método: `Cumplimiento = (Sí × 1 + Parcial × 0.5) / total · GAP = 100 − cumplimiento`.
   - **Distribución de respuestas**: barra apilada con los totales crudos de
     Sí / Parcial / No, más leyenda con conteo y porcentaje de cada uno.
2. **Detalle por sección**
   - Encabezado con `Cumplimiento X% · GAP Y%` de la sección.
   - Por pregunta: icono de veredicto, `código.` + enunciado, % de cumplimiento a
     la derecha, barra apilada y línea `n Sí · n Parcial · n No · n N/A`.
   - Preguntas abiertas: icono de mensaje y lista de respuestas con autor.
   - Sin respuestas: `Sin respuestas todavía`.
3. **Participantes** `(respondieron/total)` con estado `v{N}` o `Pendiente`.

### 7.2 Paleta

| Elemento | Color |
|---|---|
| Sí / positivo | `#10b981` (emerald-500) |
| Parcialmente | `#f59e0b` (amber-500) |
| No / negativo | `#ef4444` (red-500) |
| Pista/fondo de barra | `#e2e8f0` (slate-200) |

Chips de veredicto en PDF: Sí `bg #d1fae5 / fg #065f46`; Parcial `#fef3c7 / #92400e`;
No `#fee2e2 / #991b1b`; No aplica `#e2e8f0 / #475569`.

### 7.3 PDF

Endpoint `GET /api/evaluations/results/{assignmentId}/pdf`, generado con
`@react-pdf/renderer`. Replica exactamente los mismos agregados que la web
(mismo `complianceOf`, mismo promedio por pregunta). Incluye cabecera con logo y
nombre del tenant, título de la evaluación, empresa, fecha de generación,
número de respondientes, panel de cumplimiento global, y el detalle por sección.

### 7.4 Quién puede ver los resultados

- `SUPER_ADMIN`.
- `ADMIN` o `PROFESSOR` del mismo tenant que la evaluación.
- **Líder** de la empresa evaluada (y solo de su empresa).
- Los participantes ven su propio formulario, no el consolidado.

---

## 8. Replicación fuera de PROL

### 8.1 JSON canónico de la plantilla

Formato sugerido para transportar el instrumento a otra herramienta:

```json
{
  "kind": "DIAGNOSTIC",
  "title": "(Norma ISO 9001) Diagnóstico inicial: Sistemas de Gestión de la Calidad",
  "description": "Evaluación del grado de implantación del SGC frente a los requisitos de ISO 9001:2015.",
  "methodology": "Responda Sí solo si existe evidencia documentada y vigente; Parcialmente si existe de forma incompleta, informal o desactualizada; No si no existe.",
  "answerScale": [
    { "value": "POSITIVE",       "label": "Sí",           "weight": 1.0 },
    { "value": "PARTIAL",        "label": "Parcialmente", "weight": 0.5 },
    { "value": "NEGATIVE",       "label": "No",           "weight": 0.0 },
    { "value": "NOT_APPLICABLE", "label": "No aplica",    "weight": null }
  ],
  "sections": [
    {
      "position": 0,
      "title": "4. Contexto de la organización",
      "type": "INTERNAL",
      "questions": [
        {
          "position": 0,
          "code": "4.1.1",
          "label": "¿La organización ha identificado y documentado las cuestiones externas e internas pertinentes a su propósito y dirección estratégica?",
          "description": "Evidencia: análisis de contexto vigente (DAFO, PESTEL) fechado y aprobado.",
          "type": "MULTIPLE_CHOICE",
          "allowNotApplicable": false
        }
      ]
    }
  ]
}
```

### 8.2 Algoritmo de calificación (portable)

```
ENTRADA: plantilla + lista de envíos {participantId, version, answers[]}

1. Para cada participante, conservar solo el envío de mayor `version`.
2. Para cada pregunta MULTIPLE_CHOICE, contar votos por valor.
3. Por pregunta:
     denom = Sí + Parcial + No
     si denom == 0 -> excluir la pregunta
     cumplimiento_q = (Sí + 0.5*Parcial) / denom * 100
4. Por sección: promedio simple de los cumplimiento_q no excluidos; redondear a 1 decimal.
5. Global: promedio simple de TODOS los cumplimiento_q no excluidos de la evaluación;
   redondear a 1 decimal.  (No promediar secciones.)
6. GAP = 100 - cumplimiento (sobre el valor ya redondeado).
7. Distribución: sumar votos crudos Sí/Parcial/No de las preguntas no excluidas.
SALIDA: {global, porSección[], porPregunta[], distribución}
```

### 8.3 Casos borde a respetar

| Caso | Comportamiento correcto |
|---|---|
| Nadie ha respondido | Global = 0 %, `N = 0 preguntas con respuestas` |
| Una pregunta con solo N/A | Se excluye; no baja el promedio |
| Participante con varias versiones | Solo cuenta la última |
| Participante sin enviar | No cuenta, no penaliza |
| Empate 1 Sí / 1 No | Veredicto = `POSITIVE` (empate favorece positivo), cumplimiento = 50 % |
| Pregunta `OPEN_TEXT` | Fuera de todo cálculo |

---

## 9. Volcar el contenido real desde la base de datos de PROL

El cuestionario de §4 está reconstruido desde la norma. Para obtener las filas
exactas de la evaluación productiva (misma redacción, mismos códigos, mismo
`allowNotApplicable`), con la base accesible en `DATABASE_URL`:

```sql
SELECT s.position  AS sec_pos,
       s.title     AS seccion,
       s.type      AS sec_type,
       q.position  AS q_pos,
       q.code,
       q.label,
       q.description,
       q.type      AS q_type,
       q.allow_not_applicable
FROM evaluations e
JOIN evaluation_sections  s ON s.evaluation_id = e.id
JOIN evaluation_questions q ON q.section_id    = s.id
WHERE e.title ILIKE '%ISO 9001%'
ORDER BY s.position, q.position;
```

O con Prisma, desde `packages/db`:

```js
const ev = await db.evaluation.findFirst({
  where: { title: { contains: "ISO 9001" } },
  include: { sections: { orderBy: { position: "asc" },
             include: { questions: { orderBy: { position: "asc" } } } } },
});
console.log(JSON.stringify(ev, null, 2));
```

---

## 10. Referencias de implementación en PROL

| Qué | Dónde |
|---|---|
| Esquema de datos | `packages/db/prisma/schema.prisma` (modelos `Evaluation*`) |
| Acciones de autor y envío | `apps/web/lib/actions/evaluation.ts` |
| Consolidación y autorización | `apps/web/lib/queries/evaluation.ts` → `getEvaluationResults` |
| Formulario del respondiente | `apps/web/app/dashboard/evaluations/[id]/response-form.tsx` |
| Reporte de diagnóstico (web) | `apps/web/app/dashboard/company/evaluations/[assignmentId]/diagnostic-results-view.tsx` |
| Reporte PDF | `apps/web/app/api/evaluations/results/[assignmentId]/pdf/route.tsx` |
| Editor de la plantilla | `apps/web/app/professor/evaluations/[id]/evaluation-editor.tsx` |
