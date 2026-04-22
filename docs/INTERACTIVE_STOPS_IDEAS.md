# Secciones Interactivas — Ideas y Roadmap

PROL ya soporta **4 tipos** de "interactive stops" en videos. Esta es una guia
de los tipos actuales, ideas concretas para nuevos tipos, y un roadmap para
extenderlos.

---

## Tipos implementados (en uso hoy)

### 1. QUESTION (opcion multiple)
- 2-6 opciones por pregunta
- Una respuesta correcta indexada
- Explicacion opcional al responder
- Validacion automatica
- **Caso de uso**: comprehension checks despues de un concepto clave

### 2. REFLECTION (texto libre)
- Textarea para respuesta libre
- No se califica, solo se registra
- **Caso de uso**: prompts de pensamiento profundo, journaling pedagogico

### 3. EXERCISE (instrucciones de practica)
- Muestra instrucciones de un ejercicio
- Hints opcionales (campo en schema, falta UI)
- Botton "completado" sin validacion automatica
- **Caso de uso**: pausar para hacer una tarea practica antes de continuar

### 4. POLL (encuesta)
- Opciones para votar (sin respuesta correcta)
- Resultados agregados por curso
- **Caso de uso**: medir opiniones del grupo, romper el hielo

---

## Ideas para nuevos tipos (priorizadas)

### A. ANNOTATION ⭐⭐⭐ (alto impacto, bajo esfuerzo)
Tarjeta informativa que aparece en un timestamp sin requerir respuesta.
- Formato: titulo + texto/imagen + link opcional
- No pausa el video automaticamente (configurable)
- **Implementacion**: nuevo enum `ANNOTATION`, nuevo componente overlay tipo "card" con auto-dismiss en 5-10s
- **Caso de uso**: ampliar contexto sin interrumpir el flujo

### B. HOTSPOT ⭐⭐⭐ (visual, demo-friendly)
Regiones clickeables sobre el video en momentos especificos.
- Formato: array de `{ x, y, w, h, label, popoverContent }`
- El usuario puede hacer hover/click para ver mas info
- **Limitante actual**: el iframe de Vimeo/Cloudflare no permite overlays sincronizados con frame exacto. Solucion: usar `<video>` HTML5 nativo con player customizado para Cloudflare (Vimeo expone `player.js` para esto).
- **Caso de uso**: tutoriales de software (hotspot en cada boton del UI)

### C. CODE_EXERCISE ⭐⭐ (ejercicio ejecutable)
Editor de codigo embebido + tests automatizados.
- Formato: `{ language, starterCode, testCases }`
- Resultado: pasa/falla con feedback
- **Implementacion**: integrar Monaco Editor + ejecucion server-side (Pyodide para Python en browser, o API server con sandbox)
- **Caso de uso**: cursos de programacion

### D. SCENARIO_BRANCH ⭐⭐ (decision con consecuencia)
Pregunta cuya respuesta cambia el siguiente video que se reproduce.
- Formato: `{ question, options: [{ label, nextVideoId }] }`
- Crea una experiencia tipo "elige tu propia aventura"
- **Implementacion**: requiere link entre stops y lecciones; flujo no lineal
- **Caso de uso**: simulaciones de venta, role-play medico, training de soft skills

### E. DRAG_DROP ⭐⭐ (matching)
Arrastrar etiquetas a sus categorias correctas.
- Formato: `{ items: [{ label, correctCategoryId }], categories: [{ id, label }] }`
- Validacion automatica
- **Caso de uso**: clasificar conceptos, ordenar pasos de un proceso

### F. TIMELINE_PLACEMENT ⭐ (ordenar eventos)
Arrastrar eventos a su posicion correcta en una linea de tiempo.
- **Caso de uso**: historia, secuencias de procesos quimicos

### G. FLASHCARD_REVIEW ⭐ (repaso espaciado)
Tarjetas de pregunta/respuesta con auto-evaluacion (Easy/Medium/Hard).
- Se almacenan para reaparecer en otras lecciones (spaced repetition)
- **Caso de uso**: idiomas, vocabulario tecnico, terminologia medica

---

## Mejoras a los tipos existentes (sin schema changes)

| Tipo | Mejora | Esfuerzo |
|------|--------|----------|
| QUESTION | Soporte de imagen en pregunta y opciones | S |
| QUESTION | Multi-respuesta correcta (checkbox en vez de radio) | S |
| REFLECTION | minLength configurable + contador de palabras | S |
| REFLECTION | Compartir respuestas anonimamente con la clase | M |
| EXERCISE | Subir entregable (archivo/screenshot) y validar manualmente | M |
| EXERCISE | Mostrar `hints` (ya en schema, falta UI) | S |
| EXERCISE | Mostrar `sampleAnswer` despues de N intentos | S |
| POLL | Opcion `allowMultiple` (ya en schema, falta UI) | S |
| POLL | Vista de resultados en tiempo real con barras animadas | M |
| POLL | Heatmap por demografica (por empresa, por cohorte) | L |

---

## Migracion a player propio

Para HOTSPOT, eventos precisos de progreso, y mejor sincronizacion de
TODOS los stops, recomiendo migrar de iframe a player propio:

1. Cloudflare Stream → usar [Stream Player React](https://github.com/cloudflare/stream-react)
   con eventos `onTimeUpdate`, `onPause`, `onEnded`
2. Vimeo → usar [`@vimeo/player`](https://www.npmjs.com/package/@vimeo/player)
   (acepta el iframe existente y expone API JS)
3. YouTube → usar [`react-youtube`](https://www.npmjs.com/package/react-youtube)
   (igual, wraps el iframe)

Beneficios:
- Pausa precisa al timestamp exacto del stop
- Track de cuanto del video se vio realmente
- Restaurar `videoPositionSeconds` al volver a la leccion
- Habilita HOTSPOT y CODE_EXERCISE

---

## Roadmap sugerido

1. **Sprint 1** (sin schema): mejoras a los 4 tipos existentes (allowMultiple,
   hints, minLength, imagenes en QUESTION).
2. **Sprint 2**: ANNOTATION (alto impacto, schema migration trivial).
3. **Sprint 3**: migrar a player propio + HOTSPOT.
4. **Sprint 4**: SCENARIO_BRANCH (alta diferenciacion vs Chamilo).
5. **Backlog**: CODE_EXERCISE, DRAG_DROP, TIMELINE_PLACEMENT, FLASHCARD_REVIEW.
