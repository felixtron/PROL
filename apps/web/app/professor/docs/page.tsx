import {
  KnowledgeBase,
  type DocsArticle,
  type DocsCategory,
} from "@/components/knowledge-base";

const categories: DocsCategory[] = [
  {
    id: "cursos",
    label: "Cursos y estructura",
    icon: "BookOpen",
    summary: "Crear el curso, organizarlo en módulos y publicarlo.",
  },
  {
    id: "colaboracion",
    label: "Colaboración",
    icon: "Users",
    summary: "Co-crear un curso con otros profesores de tu academia.",
  },
  {
    id: "contenido",
    label: "Contenido de lecciones",
    icon: "Video",
    summary: "Video, PDFs, texto y lecciones multiformato.",
  },
  {
    id: "evaluacion",
    label: "Quizzes y tareas",
    icon: "ClipboardCheck",
    summary: "Cuestionarios, examen final y entregas de alumnos.",
  },
  {
    id: "interactivo",
    label: "Paradas interactivas",
    icon: "PauseCircle",
    summary: "Actividades dentro del video.",
  },
  {
    id: "ia",
    label: "Cursos con IA",
    icon: "Sparkles",
    summary: "Generar un curso completo a partir de un briefing.",
  },
  {
    id: "diplomas",
    label: "Diplomas",
    icon: "Stamp",
    summary: "Diseño, código de norma y firma del certificado del curso.",
  },
  {
    id: "alumnos",
    label: "Alumnos",
    icon: "GraduationCap",
    summary: "Seguimiento del avance y revocación de certificados.",
  },
  {
    id: "evaluaciones",
    label: "Evaluaciones",
    icon: "BarChart3",
    summary: "Diagnósticos por factores, resultados y reportes en PDF.",
  },
  {
    id: "talleres",
    label: "Talleres",
    icon: "Calendar",
    summary: "Sesiones en vivo con cupo y recurrencia.",
  },
  {
    id: "consultoria",
    label: "Consultoría Online",
    icon: "Laptop",
    summary: "Citas de asesoría por empresa o por personas.",
  },
  {
    id: "cuenta",
    label: "Cuenta",
    icon: "Settings",
    summary: "Perfil, límites de archivos y dudas administrativas.",
  },
];

const articles: DocsArticle[] = [
  // ─── Cursos y estructura ──────────────────────────────────────────
  {
    category: "cursos",
    title: "Crear un curso nuevo",
    description:
      "Crea el curso desde cero dentro de tu academia definiendo título, descripción, precio y categoría. El slug se genera automáticamente a partir del título.",
    steps: [
      "Ve a Cursos en el menú lateral.",
      "Haz clic en Crear curso.",
      "Ingresa título, descripción, precio y categoría.",
      "Confirma la creación.",
      "Agrega módulos y lecciones antes de publicarlo.",
    ],
    notes:
      "El curso nace en estado borrador y no es visible para los alumnos hasta que lo publiques.",
    keywords: ["crear", "nuevo curso", "borrador", "draft"],
  },
  {
    category: "cursos",
    title: "Editar los datos de un curso",
    description:
      "Modifica el título, la descripción, el precio, la categoría y la configuración del diploma de un curso existente.",
    steps: [
      "Ve a Cursos y selecciona el curso.",
      "Haz clic en Editar.",
      "Cambia los campos que necesites.",
      "Guarda los cambios.",
    ],
    notes:
      "Cambiar el título regenera el slug, así que cualquier enlace externo a la página pública del curso deja de funcionar. Si colaboras en un curso que no es tuyo, el precio y el título quedan reservados al dueño.",
    badge: "actualizado",
    keywords: ["editar", "precio", "título", "slug", "categoría"],
  },
  {
    category: "cursos",
    title: "Cambiar la imagen de portada",
    description:
      "Sube o reemplaza la portada que se muestra en el catálogo de cursos.",
    steps: [
      "Entra a la edición del curso.",
      "En la sección de portada, haz clic en Subir imagen.",
      "Selecciona el archivo desde tu equipo.",
      "La portada se actualiza al terminar la subida.",
    ],
    notes:
      "Se recomienda una imagen cuadrada de al menos 400×400 px. Formatos aceptados: JPG, PNG, WebP y GIF, hasta 5 MB.",
    keywords: ["portada", "thumbnail", "imagen", "miniatura"],
  },
  {
    category: "cursos",
    title: "Organizar el curso en módulos y submódulos",
    description:
      "Los módulos son las secciones principales del curso y admiten un nivel de submódulos para agrupar lecciones relacionadas.",
    steps: [
      "En la edición del curso, ve a la sección de estructura.",
      "Haz clic en Agregar módulo e ingresa su título.",
      "Para anidar, usa Agregar submódulo dentro de un módulo existente.",
      "Reordena módulos y submódulos con las flechas.",
    ],
    notes:
      "Sólo se permite un nivel de anidamiento: no hay submódulos dentro de submódulos. Al eliminar un módulo, el contador de lecciones del curso se ajusta en cascada.",
    keywords: ["módulo", "submódulo", "estructura", "secciones", "orden"],
  },
  {
    category: "cursos",
    title: "Crear, reordenar y mover lecciones",
    description:
      "Agrega lecciones dentro de un módulo o submódulo. Los tipos disponibles son Video, Texto, Quiz, Tarea, Multiformato y Descarga.",
    steps: [
      "Abre el módulo donde quieres la lección y haz clic en Agregar lección.",
      "Escribe el título y elige el tipo.",
      "Configura el contenido según el tipo elegido.",
      "Usa las flechas para reordenar dentro del mismo módulo.",
      "Para reubicarla, selecciona la lección y elige el módulo o submódulo destino.",
    ],
    notes:
      "Al mover una lección queda al final del contenedor destino. Sólo puedes moverla dentro del mismo curso. El contador de lecciones se incrementa y decrementa solo.",
    keywords: ["lección", "reordenar", "mover", "reparenting", "tipos"],
  },
  {
    category: "cursos",
    title: "Publicar un curso",
    description:
      "Al publicar, el curso aparece en el catálogo y los alumnos pueden inscribirse.",
    steps: [
      "Verifica que el curso tenga al menos una lección.",
      "Verifica que el título tenga al menos 3 caracteres.",
      "Haz clic en Publicar curso.",
    ],
    notes:
      "El contador de lecciones se recalcula al publicar, incluyendo las que viven dentro de submódulos.",
    keywords: ["publicar", "catálogo", "visible"],
  },
  {
    category: "cursos",
    title: "Archivar un curso",
    description:
      "Archivar retira el curso del catálogo sin borrarlo. Los alumnos ya inscritos conservan su acceso y su progreso.",
    steps: [
      "Ve a Cursos y selecciona el curso.",
      "Haz clic en Archivar.",
      "Confirma la acción.",
    ],
    notes:
      "Un curso archivado no admite inscripciones nuevas. Archivar está reservado al dueño del curso y a los administradores de la academia: un colaborador no puede hacerlo.",
    badge: "actualizado",
    keywords: ["archivar", "retirar", "ocultar", "baja"],
  },

  // ─── Colaboración ─────────────────────────────────────────────────
  {
    category: "colaboracion",
    title: "Invitar a otro profesor a co-crear tu curso",
    description:
      "Puedes sumar profesores de tu misma academia como colaboradores para construir el curso entre varios.",
    steps: [
      "Entra a la edición del curso del que eres dueño.",
      "Abre la sección de colaboradores.",
      "Busca al profesor de tu academia y agrégalo.",
      "El curso aparecerá en su panel como uno más de los suyos.",
    ],
    notes:
      "Sólo pueden colaborar usuarios con rol Profesor, de tu misma academia y que no estén deshabilitados. Volver a invitar a alguien que ya colabora no genera error ni duplicados.",
    badge: "nuevo",
    keywords: [
      "colaborador",
      "coautor",
      "compartir curso",
      "equipo",
      "co-crear",
    ],
  },
  {
    category: "colaboracion",
    title: "Qué puede hacer un colaborador y qué no",
    description:
      "El colaborador trabaja el curso casi como el dueño, pero las decisiones que afectan al negocio o a los enlaces públicos quedan fuera de su alcance.",
    steps: [
      "Un colaborador puede editar el contenido: módulos, lecciones, videos, quizzes y paradas interactivas.",
      "Puede publicar el curso y ver a sus alumnos inscritos.",
      "Puede agendar talleres asociados a ese curso.",
      "No puede archivar el curso ni transferirlo.",
      "No puede gestionar la lista de colaboradores.",
      "No puede cambiar el precio ni el título.",
    ],
    notes:
      "El precio queda reservado porque puede desalinearse con los enlaces de pago ya creados en Stripe, y el título porque regenera el slug y rompe los enlaces externos al curso. Los administradores de la academia tienen los mismos permisos que el dueño.",
    badge: "nuevo",
    keywords: ["permisos", "colaborador", "dueño", "propietario", "roles"],
  },
  {
    category: "colaboracion",
    title: "Quitar a un colaborador",
    description:
      "El dueño del curso puede retirar el acceso de un colaborador en cualquier momento.",
    steps: [
      "Entra a la edición del curso.",
      "Abre la sección de colaboradores.",
      "Quita al profesor de la lista.",
    ],
    notes:
      "El contenido que haya creado permanece en el curso. El dueño nunca aparece en la lista de colaboradores porque su acceso no depende de ella.",
    badge: "nuevo",
    keywords: ["quitar", "remover", "revocar acceso", "colaborador"],
  },

  // ─── Contenido de lecciones ───────────────────────────────────────
  {
    category: "contenido",
    title: "Subir un video a Cloudflare Stream",
    description:
      "Sube el archivo de video y la plataforma lo procesa y almacena en Cloudflare Stream para reproducirlo de forma optimizada.",
    steps: [
      "En la lección de tipo Video, haz clic en Subir video.",
      "Selecciona el archivo desde tu equipo.",
      "Espera a que termine la subida y el procesamiento.",
      "Cuando el estado indique que está listo, el video queda disponible para los alumnos.",
    ],
    notes:
      "El procesamiento puede tardar varios minutos según la duración y la calidad del video.",
    keywords: ["video", "cloudflare", "stream", "subir", "procesamiento"],
  },
  {
    category: "contenido",
    title: "Enlazar un video de Vimeo o YouTube",
    description:
      "En vez de subir el archivo, puedes pegar la URL de un video alojado en Vimeo o YouTube. La plataforma valida que exista y obtiene su duración.",
    steps: [
      "En la lección de tipo Video, elige Pegar URL.",
      "Pega la dirección del video.",
      "Espera la validación automática.",
      "Confirma para vincularlo a la lección.",
    ],
    notes:
      "El video debe ser público o no listado; los privados no se pueden reproducir. Si la URL de YouTube incluye un tiempo de inicio (por ejemplo ?t=120), la reproducción arranca desde ahí.",
    keywords: ["vimeo", "youtube", "url", "enlace", "externo"],
  },
  {
    category: "contenido",
    title: "Quitar el video de una lección",
    description:
      "Elimina el video vinculado a la lección limpiando todas sus referencias: URL, proveedor y duración.",
    steps: [
      "Entra a la edición de la lección.",
      "En la sección de video, haz clic en Quitar video.",
      "Confirma la acción.",
    ],
    notes:
      "Esto no borra el archivo original en Cloudflare Stream, Vimeo o YouTube.",
    keywords: ["quitar video", "eliminar", "desvincular"],
  },
  {
    category: "contenido",
    title: "Adjuntar un PDF a una lección",
    description:
      "Al subir un PDF, la plataforma extrae su texto para mostrarlo dentro de la lección y además deja el archivo original disponible para descarga.",
    steps: [
      "Entra a la lección donde quieres el material.",
      "Sube el archivo PDF.",
      "Revisa el texto extraído que verá el alumno.",
      "Guarda la lección: el alumno podrá leerlo en pantalla y descargar el original.",
    ],
    notes:
      "Los PDFs admiten hasta 10 MB. La extracción de texto no conserva imágenes ni maquetación; para eso está el archivo descargable.",
    badge: "actualizado",
    keywords: ["pdf", "adjuntar", "descargable", "material", "extracción"],
  },
  {
    category: "contenido",
    title: "Construir una lección multiformato",
    description:
      "Las lecciones multiformato combinan hasta 20 bloques de contenido —video, PDF, texto y quiz— que el alumno recorre en secuencia.",
    steps: [
      "Abre la lección de tipo Multiformato.",
      "Haz clic en Agregar bloque.",
      "Elige el tipo de bloque y configura su contenido.",
      "Repite para cada bloque adicional.",
      "Reordena arrastrando, o elimina los bloques que sobren.",
    ],
    notes:
      "Los bloques de tipo quiz deben apuntar a un quiz existente del mismo curso. Eliminar un bloque no afecta el progreso de quien ya lo completó.",
    keywords: ["multiformato", "bloques", "multi", "mixta"],
  },
  {
    category: "contenido",
    title: "Dar formato al texto de una lección",
    description:
      "Las lecciones de texto admiten formatos combinados: alineación, tamaños de letra e imágenes intercaladas.",
    steps: [
      "Abre la lección de tipo Texto.",
      "Escribe el contenido y aplica los formatos desde la barra del editor.",
      "Inserta imágenes donde las necesites.",
      "Guarda la lección y revisa cómo se ve para el alumno.",
    ],
    notes:
      "Las imágenes se suben desde el editor, con un límite de 5 MB por archivo.",
    keywords: ["texto", "editor", "formato", "alineación", "imágenes"],
  },

  // ─── Quizzes y tareas ─────────────────────────────────────────────
  {
    category: "evaluacion",
    title: "Crear un quiz",
    description:
      "Cada lección de tipo Quiz aloja un cuestionario con puntaje mínimo de aprobación, límite de tiempo y número máximo de intentos.",
    steps: [
      "Abre la lección de tipo Quiz.",
      "Haz clic en Crear quiz e ingresa su título.",
      "Define el puntaje mínimo de aprobación (0-100%).",
      "Agrega preguntas con al menos 2 opciones cada una.",
      "Marca la respuesta correcta de cada pregunta.",
      "Configura el límite de tiempo en minutos y el máximo de intentos.",
      "Guarda el quiz.",
    ],
    notes:
      "Sólo puede existir un quiz por lección de tipo Quiz, y cada pregunta necesita como mínimo dos opciones.",
    keywords: ["quiz", "cuestionario", "preguntas", "intentos", "puntaje"],
  },
  {
    category: "evaluacion",
    title: "Configurar el examen final",
    description:
      "El examen final es el quiz que cierra el curso: exige al menos 80% para aprobar y sólo puede haber uno por curso.",
    steps: [
      "Al crear o editar un quiz, marca la opción Examen final.",
      "Asegúrate de que el puntaje mínimo sea 80% o más.",
      "Guarda los cambios.",
    ],
    notes:
      "El alumno no puede abrir el examen final hasta aprobar con 80% o más todos los quizzes de módulo del curso. Al aprobarlo, el curso se marca como completado y se emite el certificado automáticamente.",
    keywords: ["examen final", "80", "gate", "bloqueo", "aprobar"],
  },
  {
    category: "evaluacion",
    title: "Editar o eliminar un quiz",
    description:
      "Puedes ajustar preguntas, puntaje mínimo, tiempo e intentos, o eliminar el quiz por completo.",
    steps: [
      "Abre la lección de tipo Quiz.",
      "Modifica los campos que necesites.",
      "Para borrarlo, haz clic en Eliminar quiz y confirma.",
    ],
    notes:
      "Eliminar un quiz borra también los intentos registrados de los alumnos. Es irreversible.",
    keywords: ["editar quiz", "eliminar", "borrar"],
  },
  {
    category: "evaluacion",
    title: "Configurar y revisar tareas",
    description:
      "Las lecciones de tipo Tarea permiten que el alumno suba un archivo o una respuesta para que la califiques.",
    steps: [
      "Crea o selecciona una lección de tipo Tarea.",
      "Escribe las instrucciones de la entrega.",
      "Publica el curso para que la tarea quede disponible.",
      "Revisa las entregas desde la sección Alumnos.",
    ],
    notes:
      "El alumno puede subir PDF, JPG, PNG o WebP de hasta 25 MB. La lección se marca como completada al entregar, no al calificar; las lecciones de tipo Tarea nunca se completan a mano.",
    badge: "actualizado",
    keywords: ["tarea", "assignment", "entrega", "calificar", "25 mb"],
  },

  // ─── Paradas interactivas ─────────────────────────────────────────
  {
    category: "interactivo",
    title: "Crear una parada interactiva en un video",
    description:
      "Las paradas se disparan en un segundo concreto del video, lo pausan y presentan una actividad al alumno.",
    steps: [
      "Abre una lección de tipo Video.",
      "Haz clic en Agregar parada interactiva.",
      "Indica el segundo del video en el que debe aparecer.",
      "Elige el tipo: Pregunta, Reflexión, Ejercicio o Encuesta.",
      "Configura su contenido (enunciado, opciones, respuesta correcta…).",
      "Marca si es obligatoria u opcional.",
      "Guarda los cambios.",
    ],
    notes:
      "Sólo están disponibles en lecciones de tipo Video. Las obligatorias impiden continuar hasta que el alumno responde.",
    keywords: ["parada", "interactiva", "timestamp", "pausa", "actividad"],
  },
  {
    category: "interactivo",
    title: "Editar o eliminar paradas interactivas",
    description:
      "Ajusta el momento, el tipo, el contenido o la obligatoriedad de una parada, o elimínala.",
    steps: [
      "Entra a la edición de la lección de video.",
      "Ubica la parada en la lista.",
      "Modifica los campos necesarios, o elimínala y confirma.",
    ],
    keywords: ["editar parada", "eliminar parada"],
  },

  // ─── Cursos con IA ────────────────────────────────────────────────
  {
    category: "ia",
    title: "Generar un curso con inteligencia artificial",
    description:
      "A partir de un briefing, la IA propone la estructura y el contenido del curso en cuatro etapas: briefing, outline, refinamiento y publicación.",
    steps: [
      "Ve a Cursos y haz clic en Generar con IA.",
      "Describe el tema, la audiencia y los objetivos del curso.",
      "Revisa el outline propuesto y ajústalo.",
      "Refina el contenido de cada módulo y lección.",
      "Publica el curso cuando estés conforme.",
    ],
    notes:
      "Requiere que el módulo de IA esté activado para tu academia. Cada generación consume créditos del saldo de la academia; consulta el disponible con tu administrador.",
    keywords: [
      "ia",
      "inteligencia artificial",
      "generar",
      "créditos",
      "claude",
    ],
  },

  // ─── Diplomas ─────────────────────────────────────────────────────
  {
    category: "diplomas",
    title: "Configurar el diploma de un curso",
    description:
      "Cada curso define su propio diploma: plantilla, código de norma, nombre impreso de la formación, texto descriptivo y quién firma.",
    steps: [
      "Entra a la edición del curso y abre la sección del diploma.",
      "Elige la plantilla: IBIZA (vertical) o Clásica (horizontal).",
      "Escribe el código o norma que encabeza el diploma, por ejemplo ISO 27001.",
      "Indica el nombre de la formación tal y como debe imprimirse.",
      "Redacta el párrafo descriptivo que aparece debajo del nombre.",
      "Define el nombre de quien firma.",
      "Guarda los cambios.",
    ],
    notes:
      "Si no eliges plantilla, se aplica el criterio histórico de tu academia, así que los cursos que ya existían siguen entregando el mismo diseño de siempre. El nombre impreso es útil cuando el título del curso lleva el código pegado delante.",
    badge: "nuevo",
    keywords: [
      "diploma",
      "certificado",
      "plantilla",
      "iso",
      "firma",
      "norma",
      "ibiza",
    ],
  },
  {
    category: "diplomas",
    title: "Ver la vista previa del diploma",
    description:
      "Puedes generar un PDF de muestra con lo que hay escrito en el formulario, esté guardado o no, sin esperar a que un alumno apruebe el curso.",
    steps: [
      "En la sección del diploma del curso, completa los campos.",
      "Haz clic en la vista previa.",
      "Revisa el PDF de muestra y ajusta lo que haga falta.",
    ],
    notes:
      "La vista previa usa datos de ejemplo para el titular y el folio: sirve para validar el diseño y los textos, no para emitir un diploma real.",
    badge: "nuevo",
    keywords: ["vista previa", "preview", "pdf", "muestra"],
  },
  {
    category: "diplomas",
    title: "Qué pasa con los diplomas ya emitidos si edito el curso",
    description:
      "La configuración del diploma se congela en el certificado en el momento de emitirlo, así que editar el curso nunca reescribe los diplomas ya entregados.",
    steps: [
      "Edita libremente la plantilla, el código, el nombre impreso o la firma.",
      "Los certificados emitidos antes del cambio conservan su diseño y sus textos.",
      "Los que se emitan a partir de ese momento usan la nueva configuración.",
    ],
    notes:
      "La plantilla también se resuelve al emitir, no al descargar: renombrar la academia no cambia el aspecto de diplomas ya entregados. El nombre impreso queda guardado en el certificado, de modo que la página pública de verificación dice exactamente lo mismo que el papel.",
    badge: "nuevo",
    keywords: ["histórico", "congelado", "snapshot", "verificación", "folio"],
  },

  // ─── Alumnos ──────────────────────────────────────────────────────
  {
    category: "alumnos",
    title: "Seguir el avance de tus alumnos",
    description:
      "Consulta quién está inscrito en tus cursos, su progreso, sus entregas de tareas y sus resultados de quizzes.",
    steps: [
      "Ve a Alumnos en el menú lateral.",
      "Filtra por curso o busca por nombre.",
      "Abre un alumno para ver su detalle.",
    ],
    notes:
      "Ves a los alumnos de los cursos que te pertenecen y también de aquellos en los que colaboras, siempre dentro de tu academia.",
    badge: "actualizado",
    keywords: ["alumnos", "progreso", "seguimiento", "inscritos"],
  },
  {
    category: "alumnos",
    title: "Revocar un certificado",
    description:
      "Si un diploma se emitió por error o dejó de ser válido, puedes revocarlo dejando registro del motivo.",
    steps: [
      "Ve a Alumnos y ubica a la persona.",
      "Busca el certificado en su historial de cursos completados.",
      "Haz clic en Revocar certificado.",
      "Escribe la razón de la revocación (entre 3 y 500 caracteres).",
      "Confirma la acción.",
    ],
    notes:
      "Sólo el profesor del curso, un administrador de la academia o un super administrador pueden revocar. La razón es obligatoria y queda en la bitácora de auditoría; la página pública de verificación pasa a mostrar el certificado como revocado.",
    keywords: ["revocar", "anular", "certificado", "auditoría"],
  },

  // ─── Evaluaciones ─────────────────────────────────────────────────
  {
    category: "evaluaciones",
    title: "Crear y asignar una evaluación",
    description:
      "Las evaluaciones son diagnósticos estructurados por factores e indicadores que se asignan a empresas o a personas concretas.",
    steps: [
      "Ve a Evaluaciones en el menú lateral.",
      "Haz clic en Crear evaluación.",
      "Define título, descripción y los factores a medir.",
      "Agrega las preguntas de cada sección.",
      "Publica la evaluación y asígnala a quien deba responderla.",
    ],
    notes:
      "La sección sólo aparece si el administrador de tu academia activó el módulo de Evaluaciones.",
    keywords: ["evaluación", "kpi", "factores", "diagnóstico", "asignar"],
  },
  {
    category: "evaluaciones",
    title: "Filtrar el listado de evaluaciones por empresa",
    description:
      "Cuando manejas varias plantillas asignadas a distintas empresas, el selector de empresa te lleva directo a lo que buscas.",
    steps: [
      "Ve a Evaluaciones.",
      "Abre el selector de empresa y escribe para buscarla.",
      "Elige la empresa: el listado se filtra a sus evaluaciones.",
      "El atajo de resultados de cada fila queda como enlace directo a las respuestas de esa empresa.",
    ],
    notes:
      "El selector sólo ofrece empresas con al menos una evaluación asignada. El contador de empresas de cada fila sigue mostrando el total real de asignaciones de la plantilla, no el del filtro.",
    badge: "nuevo",
    keywords: ["filtro", "empresa", "buscar", "resultados", "combobox"],
  },
  {
    category: "evaluaciones",
    title: "Descargar el reporte de resultados en PDF",
    description:
      "El PDF reproduce las mismas vistas que ves en pantalla, con indicadores visuales y gráficas en lugar de sólo texto.",
    steps: [
      "Entra a los resultados de la evaluación asignada.",
      "Descarga el reporte en PDF.",
      "Revisa los semáforos por pregunta y los porcentajes de cumplimiento.",
    ],
    notes:
      "El reporte incluye semáforos por pregunta (Sí / Parcial / No / N/A / sin respuesta), el panel de cumplimiento global con su distribución de respuestas, cumplimiento y GAP por sección, y el resumen DAFO con gráfica de pastel y cuadrantes internos y externos. Los números coinciden exactamente con los de la pantalla.",
    badge: "nuevo",
    keywords: ["pdf", "reporte", "semáforos", "dafo", "gap", "cumplimiento"],
  },

  // ─── Talleres ─────────────────────────────────────────────────────
  {
    category: "talleres",
    title: "Crear un taller",
    description:
      "Los talleres son sesiones en vivo con fecha, hora, cupo y modalidad, y pueden repetirse en el tiempo.",
    steps: [
      "Ve a Workshop en el menú lateral.",
      "Haz clic en Crear taller.",
      "Define título, descripción, fecha, horario y capacidad máxima.",
      "Elige la modalidad y, si aplica, el curso asociado.",
      "Configura la recurrencia si el taller se repite.",
      "Publícalo para que los alumnos puedan reservar.",
    ],
    notes:
      "Requiere que el módulo de Talleres esté activado en tu academia. El sistema protege contra reservas duplicadas y respeta el cupo. En el selector de curso aparecen tanto tus cursos como aquellos en los que colaboras.",
    badge: "actualizado",
    keywords: ["taller", "workshop", "cupo", "recurrencia", "sesión"],
  },
  {
    category: "talleres",
    title: "Generar el enlace de videollamada automáticamente",
    description:
      "Si el administrador de tu academia conectó una cuenta de Google, los talleres virtuales obtienen su enlace de Google Meet sin que tengas que crearlo a mano.",
    steps: [
      "Crea el taller y elige la modalidad virtual.",
      "Si la academia tiene Google conectado, el enlace de Meet se genera solo al guardar.",
      "Si no, pega manualmente el enlace de tu sala (Zoom, Teams, el que uses).",
    ],
    notes:
      "El enlace se muestra a los alumnos inscritos en el detalle de la sesión. La cuenta anfitriona es única por academia y la designa el administrador desde su configuración.",
    badge: "nuevo",
    keywords: ["meet", "google", "videollamada", "zoom", "enlace", "virtual"],
  },

  // ─── Consultoría Online ───────────────────────────────────────────
  {
    category: "consultoria",
    title: "Crear una sesión de Consultoría Online",
    description:
      "Las sesiones de asesoría son citas con un cliente: existen por sí solas, sin curso ni módulo asociado, y su audiencia es la empresa o las personas que convoques.",
    steps: [
      "Ve a Consultoría Online en el menú lateral.",
      "Haz clic en crear una sesión nueva.",
      "Escribe el título y la descripción (temas a revisar, entregables esperados).",
      "Elige la modalidad: virtual, presencial o híbrida.",
      "Define la audiencia y el horario.",
      "Publica la sesión o guárdala como borrador.",
    ],
    notes:
      "La sección sólo aparece si tu academia tiene el módulo habilitado. En las presenciales puedes registrar nombre del lugar, dirección y enlace a mapa; en las virtuales, el enlace de la reunión.",
    badge: "nuevo",
    keywords: [
      "consultoría",
      "asesoría",
      "advisory",
      "sesión",
      "cita",
      "cliente",
    ],
  },
  {
    category: "consultoria",
    title: "Elegir a quién se convoca",
    description:
      "Una sesión puede dirigirse a una empresa completa, sólo a algunos de sus miembros, o a una lista suelta de personas de tu academia.",
    steps: [
      "En el formulario de la sesión, elige la audiencia.",
      "Empresa: selecciona la organización cliente.",
      "Con la empresa elegida, decide entre convocar a toda la plantilla o acotar a miembros concretos.",
      "Personas: selecciona uno a uno a los participantes.",
      "Guarda la sesión.",
    ],
    notes:
      "Si acotas a miembros concretos, sólo ellos reciben el correo y sólo ellos ven la sesión en su panel. Si no acotas, la sesión es de toda la empresa. Los convocados deben pertenecer a esa empresa, y en el modo Personas, a tu academia.",
    badge: "nuevo",
    keywords: ["audiencia", "convocar", "participantes", "empresa", "miembros"],
  },
  {
    category: "consultoria",
    title: "Borradores, publicación e invitaciones por correo",
    description:
      "Un borrador sólo lo ves tú: no notifica a nadie ni aparece en el panel del cliente hasta que lo publicas.",
    steps: [
      "Guarda la sesión como borrador mientras la preparas.",
      "Cuando esté lista, publícala: se envía la invitación por correo a los convocados.",
      "Si necesitas volver a enviarla, usa la opción de reenviar invitaciones desde el detalle.",
    ],
    notes:
      "La invitación no se reenvía en cada edición. Si cambias el horario de una sesión ya invitada, los convocados reciben un aviso de reprogramación.",
    badge: "nuevo",
    keywords: [
      "borrador",
      "draft",
      "publicar",
      "invitación",
      "correo",
      "reenviar",
    ],
  },
  {
    category: "consultoria",
    title: "Sesiones recurrentes y cancelaciones",
    description:
      "Una sesión puede repetirse en serie. La primera ocurrencia es la sesión padre y el resto cuelga de ella, igual que en los talleres.",
    steps: [
      "Al crear la sesión, elige la frecuencia: diaria, semanal, quincenal o mensual.",
      "Define cuántas ocurrencias necesitas.",
      "Toda la serie se crea de una sola vez.",
      "Desde el detalle puedes navegar entre las sesiones de la serie o cancelar una.",
    ],
    notes:
      "El máximo es de 26 ocurrencias por serie. Los horarios se manejan siempre en la hora del centro de México, la misma que aparece en los correos de invitación.",
    badge: "nuevo",
    keywords: [
      "recurrencia",
      "serie",
      "repetir",
      "cancelar",
      "semanal",
      "mensual",
    ],
  },

  // ─── Cuenta ───────────────────────────────────────────────────────
  {
    category: "cuenta",
    title: "Actualizar tu perfil",
    description:
      "Modifica el nombre y el avatar con los que apareces en tu panel y ante tus alumnos.",
    steps: [
      "Ve a Configuración en el menú lateral.",
      "En la sección Perfil, edita tu nombre.",
      "Para cambiar el avatar, haz clic en Subir foto y elige una imagen.",
      "Guarda los cambios.",
    ],
    notes:
      "El avatar se sube desde el formulario; no se admiten URLs externas por seguridad.",
    keywords: ["perfil", "avatar", "nombre", "foto"],
  },
  {
    category: "cuenta",
    title: "Límites de tamaño de los archivos",
    description:
      "Cada tipo de archivo tiene su propio tope, definido por lo que la plataforma necesita servir después.",
    steps: [
      "Imágenes (portadas, avatares, imágenes en lecciones): hasta 5 MB, en JPG, PNG, WebP o GIF.",
      "PDFs de lecciones: hasta 10 MB.",
      "Entregas de tareas de los alumnos: hasta 25 MB, en PDF, JPG, PNG o WebP.",
    ],
    notes:
      "Si una subida falla sin mensaje claro, revisa primero el peso del archivo y luego su formato.",
    badge: "actualizado",
    keywords: ["límite", "tamaño", "peso", "mb", "subir", "archivo"],
  },
  {
    category: "cuenta",
    title: "¿Dónde veo los ingresos de mis cursos?",
    description:
      "La información monetaria ya no vive en el panel del profesor: la consolidan la administración de tu academia y la plataforma.",
    steps: [
      "Para conocer los ingresos de un curso, solicítalos al administrador de tu academia.",
      "El administrador los consulta en su sección de Cursos, con el detalle por curso.",
    ],
    notes:
      "Por eso ya no verás importes en tu dashboard, en tu listado de cursos ni en el feed de actividad. El precio de un curso lo sigue definiendo su dueño desde la edición del curso.",
    badge: "actualizado",
    keywords: ["ingresos", "dinero", "ventas", "revenue", "facturación"],
  },

  {
    category: "diplomas",
    title: "Las constancias DC-3 no se configuran desde el curso",
    description:
      "Además del diploma, la plataforma emite el formato DC-3 de la STPS. No lo verás en el editor de tu curso: lo administra la academia.",
    steps: [
      "El diploma sí es tuyo: plantilla, código, textos y firma los defines en los ajustes del curso.",
      "El DC-3 lo configura el administrador de la academia en su propia sección, curso por curso.",
      "Ahí se define el área temática oficial, las horas declaradas, el agente capacitador y el instructor que firma.",
      "Si un curso tuyo debe emitir DC-3, pídeselo al administrador.",
    ],
    notes:
      "Están separados a propósito: el diploma es una pieza de tu curso, y el DC-3 es un documento con efectos ante la autoridad que emite el patrón del alumno. Sólo lo reciben quienes se inscribieron a través de una empresa con datos fiscales registrados.",
    badge: "nuevo",
    keywords: [
      "dc3",
      "dc-3",
      "stps",
      "constancia",
      "capacitación",
      "diploma",
      "diferencia",
    ],
  },
];

export default function ProfessorDocsPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <KnowledgeBase
        title="Base de conocimientos"
        subtitle="Busca por palabra clave o filtra por categoría para resolver dudas sobre tus cursos, alumnos y sesiones."
        categories={categories}
        articles={articles}
      />
    </div>
  );
}
