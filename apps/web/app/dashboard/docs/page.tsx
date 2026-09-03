import {
  KnowledgeBase,
  type DocsArticle,
  type DocsCategory,
} from "@/components/knowledge-base";
import { SUPPORT_EMAIL } from "@/lib/brand";

const categories: DocsCategory[] = [
  {
    id: "primeros-pasos",
    label: "Primeros pasos",
    icon: "Lock",
    summary: "Entrar por primera vez, contraseñas y datos de tu perfil.",
  },
  {
    id: "cursos",
    label: "Mis cursos",
    icon: "BookOpen",
    summary: "Inscribirte, avanzar y entender tu progreso.",
  },
  {
    id: "lecciones",
    label: "Lecciones y videos",
    icon: "Play",
    summary: "Videos, PDFs, lecciones multiformato y paradas interactivas.",
  },
  {
    id: "quizzes",
    label: "Quizzes y tareas",
    icon: "ClipboardCheck",
    summary: "Evaluaciones del curso, examen final y entregas.",
  },
  {
    id: "certificados",
    label: "Certificados",
    icon: "Award",
    summary: "Cómo se emite tu diploma y cómo se verifica.",
  },
  {
    id: "dc3",
    label: "Constancia DC-3",
    icon: "Stamp",
    summary: "El formato oficial de la STPS, si te inscribió tu empresa.",
  },
  {
    id: "empresa",
    label: "Mi empresa",
    icon: "Building2",
    summary: "Cursos cubiertos por tu organización e invitaciones.",
  },
  {
    id: "sesiones",
    label: "Talleres y consultoría",
    icon: "Calendar",
    summary: "Sesiones en vivo, workshops y Consultoría Online.",
  },
  {
    id: "evaluaciones",
    label: "Evaluaciones y encuestas",
    icon: "BarChart3",
    summary: "Cuestionarios de diagnóstico y encuestas de satisfacción que te asignen.",
  },
  {
    id: "pagos",
    label: "Pagos",
    icon: "CreditCard",
    summary: "Comprar un curso con tarjeta, OXXO o SPEI.",
  },
  {
    id: "cuenta",
    label: "Cuenta y avisos",
    icon: "Settings",
    summary: "Perfil, notificaciones y cierre de sesión.",
  },
];

const articles: DocsArticle[] = [
  // ─── Primeros pasos ───────────────────────────────────────────────
  {
    category: "primeros-pasos",
    title: "Entrar por primera vez",
    description:
      "Si tu academia o tu empresa dio de alta tu cuenta, recibiste un correo de bienvenida con una contraseña temporal. La plataforma te obliga a cambiarla antes de dejarte entrar.",
    steps: [
      "Abre el correo de bienvenida y copia la contraseña temporal.",
      "Ve a la pantalla de inicio de sesión e ingresa tu email y esa contraseña.",
      "El sistema te llevará automáticamente a la pantalla de cambio de contraseña.",
      "Define tu nueva contraseña y confírmala.",
      "Al guardar entrarás directo a tu panel de alumno.",
    ],
    notes:
      "Si no encuentras el correo, revisa la carpeta de spam. Tu administrador puede reenviarlo; en ese caso recibirás un enlace para establecer contraseña, no la contraseña original.",
    keywords: ["acceso", "login", "primera vez", "bienvenida", "temporal"],
  },
  {
    category: "primeros-pasos",
    title: "Recuperar tu contraseña",
    description:
      "Si olvidaste tu contraseña puedes pedir un enlace de restablecimiento desde la propia pantalla de inicio de sesión.",
    steps: [
      "En la pantalla de inicio de sesión, haz clic en ¿Olvidaste tu contraseña?",
      "Escribe el correo con el que estás registrado.",
      "Revisa tu bandeja: llegará un enlace para definir una contraseña nueva.",
      "Abre el enlace, escribe la nueva contraseña y confírmala.",
    ],
    notes:
      "El enlace tiene vigencia limitada; si expira, vuelve a solicitarlo. Por seguridad, el inicio de sesión aplica una verificación anti-robots y limita los intentos fallidos.",
    keywords: ["olvide", "contraseña", "reset", "recuperar", "captcha"],
  },
  {
    category: "primeros-pasos",
    title: "Actualizar tu perfil y tu foto",
    description:
      "Modifica el nombre y el avatar que se muestran en tu panel y en los listados que ve tu profesor.",
    steps: [
      "Ve a Configuración en el menú lateral.",
      "En la sección Perfil, edita tu nombre.",
      "Para cambiar tu avatar, haz clic en Subir foto y selecciona una imagen.",
      "Guarda los cambios.",
    ],
    notes:
      "El avatar debe subirse desde el formulario. No se aceptan URLs externas por seguridad. Tu nombre es el que se imprime en los certificados que emitas después del cambio.",
    keywords: ["avatar", "foto", "nombre", "perfil"],
  },

  // ─── Mis cursos ───────────────────────────────────────────────────
  {
    category: "cursos",
    title: "Inscribirte a un curso",
    description:
      "Puedes inscribirte desde el catálogo. Si el curso es gratuito o está cubierto por tu empresa, la inscripción es inmediata; si es de pago, pasa por el proceso de compra.",
    steps: [
      "Ve a Mis Cursos en el menú lateral y navega el catálogo.",
      "Abre el curso que te interesa.",
      "Si es gratuito o lo cubre tu empresa, confirma tu inscripción.",
      "Si es de pago, elige el método (tarjeta, OXXO o SPEI) y completa la compra.",
    ],
    notes:
      "No puedes inscribirte dos veces al mismo curso. Recibirás un correo de confirmación al quedar inscrito. Tu administrador también puede inscribirte manualmente, sin cobro.",
    keywords: ["catálogo", "inscripción", "matricular", "alta"],
  },
  {
    category: "cursos",
    title: "Cómo avanza tu progreso",
    description:
      "El porcentaje de avance se calcula sobre el total de lecciones del curso, incluidas las que viven dentro de submódulos.",
    steps: [
      "Abre el curso desde Mis Cursos y recorre las lecciones en orden.",
      "Las lecciones de video se completan al terminar la reproducción.",
      "Las lecciones de texto se marcan manualmente como completadas.",
      "Las lecciones multiformato se completan al terminar todos sus bloques.",
      "Los quizzes se completan al aprobarlos y las tareas al entregarlas.",
    ],
    notes:
      "Las lecciones de tipo Quiz y Tarea no se pueden marcar a mano: se completan solas al aprobar o entregar. Si un profesor agrega lecciones nuevas, tu porcentaje se recalcula sobre el total actualizado.",
    keywords: ["progreso", "avance", "porcentaje", "completado"],
  },
  {
    category: "cursos",
    title: "Si tu inscripción aparece suspendida",
    description:
      "El administrador de tu academia puede suspender temporalmente una inscripción. Mientras esté suspendida no puedes abrir el curso, pero tu avance queda intacto y se recupera al reactivarla.",
    steps: [
      "Si un curso deja de abrirse, revisa su estado en Mis Cursos.",
      "Contacta al administrador de tu academia para conocer el motivo.",
      "Cuando reactive tu inscripción, recuperas el acceso en el punto donde lo dejaste.",
    ],
    notes:
      "Suspender no borra nada. Distinto es retirar la inscripción: esa acción sí elimina avance, intentos de quiz, entregas y el certificado del curso, y no se puede deshacer.",
    badge: "nuevo",
    keywords: ["suspendida", "bloqueado", "sin acceso", "baja", "retirado"],
  },

  // ─── Lecciones y videos ───────────────────────────────────────────
  {
    category: "lecciones",
    title: "Reanudar un video donde lo dejaste",
    description:
      "Tu posición en cada video se guarda automáticamente, así que puedes cerrar y volver más tarde sin perder el punto.",
    steps: [
      "Abre la lección de video en la que habías pausado.",
      "El reproductor retoma en la última posición guardada.",
    ],
    keywords: ["reanudar", "continuar", "video", "posición"],
  },
  {
    category: "lecciones",
    title: "Responder paradas interactivas",
    description:
      "Algunos videos incluyen paradas que pausan la reproducción para plantearte una pregunta, una reflexión, un ejercicio o una encuesta.",
    steps: [
      "Reproduce el video de la lección.",
      "Al llegar a la parada, el video se pausa y aparece la actividad.",
      "Responde según su tipo:",
      "- Pregunta: elige la opción correcta y recibe retroalimentación inmediata.",
      "- Reflexión: escribe tu respuesta en texto libre.",
      "- Ejercicio: márcalo como completado cuando lo termines.",
      "- Encuesta: selecciona la opción por la que votas.",
      "Continúa la reproducción.",
    ],
    notes:
      "Las paradas marcadas como obligatorias deben responderse para poder seguir; las opcionales se pueden omitir.",
    keywords: ["parada", "interactiva", "pausa", "pregunta", "reflexión"],
  },
  {
    category: "lecciones",
    title: "Completar una lección multiformato",
    description:
      "Las lecciones multiformato combinan varios bloques —video, PDF, texto y quiz— que se presentan en secuencia.",
    steps: [
      "Abre la lección multiformato.",
      "Completa cada bloque en orden: mira el video, lee el texto, revisa el PDF, responde el quiz.",
      "Al terminar todos los bloques, la lección se marca como completada.",
    ],
    notes:
      "La lección no cuenta como completada hasta que termines todos sus bloques.",
    keywords: ["multiformato", "bloques", "multi"],
  },
  {
    category: "lecciones",
    title: "Leer y descargar el PDF de una lección",
    description:
      "Cuando el profesor adjunta un PDF, verás su contenido dentro de la lección y además podrás descargar el archivo original.",
    steps: [
      "Abre la lección que incluye el PDF.",
      "Lee el contenido directamente en pantalla.",
      "Usa el enlace de descarga para guardar el archivo original en tu dispositivo.",
    ],
    notes:
      "El texto que ves en pantalla se extrae del PDF al momento de cargarlo; el archivo descargable conserva el formato, las imágenes y las firmas del original.",
    badge: "actualizado",
    keywords: ["pdf", "descargar", "adjunto", "documento", "material"],
  },

  // ─── Quizzes y tareas ─────────────────────────────────────────────
  {
    category: "quizzes",
    title: "Responder un quiz",
    description:
      "Cada quiz tiene un puntaje mínimo de aprobación, un número máximo de intentos y, opcionalmente, un límite de tiempo.",
    steps: [
      "Abre la lección de tipo Quiz dentro del curso.",
      "Lee cada pregunta y selecciona tu respuesta.",
      "Envía todas las respuestas al terminar.",
      "Revisa el resultado: puntaje obtenido y si aprobaste.",
      "Si no aprobaste y te quedan intentos, vuelve a intentarlo.",
    ],
    notes:
      "Revisa tus respuestas antes de enviar: cada envío consume un intento y el número es limitado.",
    keywords: ["quiz", "cuestionario", "intentos", "puntaje"],
  },
  {
    category: "quizzes",
    title: "Presentar el examen final",
    description:
      "El examen final está bloqueado hasta que apruebes con al menos 80% todos los quizzes de los módulos del curso.",
    steps: [
      "Aprueba con 80% o más cada quiz de módulo del curso.",
      "Abre la lección del examen final, que quedará habilitada.",
      "Responde todas las preguntas y envía el examen.",
      "Si obtienes 80% o más, el curso se marca como completado.",
      "Tu certificado se emite automáticamente al aprobar.",
    ],
    notes:
      "Sólo existe un examen final por curso. Si no lo apruebas, puedes reintentarlo mientras te queden intentos disponibles.",
    keywords: ["examen final", "80", "bloqueado", "aprobar", "gate"],
  },
  {
    category: "quizzes",
    title: "Entregar una tarea",
    description:
      "En las lecciones de tipo Tarea subes tu trabajo para que el profesor lo revise y lo califique.",
    steps: [
      "Abre la lección de tipo Tarea y lee las instrucciones.",
      "Sube tu archivo o escribe tu respuesta según lo que se pida.",
      "Confirma la entrega.",
    ],
    notes:
      "El archivo puede pesar hasta 25 MB. Al entregar, la lección se marca como completada; la calificación la registra tu profesor después.",
    badge: "actualizado",
    keywords: ["tarea", "entrega", "assignment", "subir", "archivo", "25 mb"],
  },

  // ─── Certificados ─────────────────────────────────────────────────
  {
    category: "certificados",
    title: "Consultar y descargar tus certificados",
    description:
      "Los certificados se emiten automáticamente al completar un curso, ya sea terminando todas las lecciones o aprobando el examen final con 80% o más.",
    steps: [
      "Ve a Certificados en el menú lateral.",
      "Revisa la lista de diplomas obtenidos.",
      "Descarga el PDF del certificado que necesites.",
    ],
    notes:
      "Cada certificado lleva un folio único. El diseño, el código de norma y quién firma los define el profesor en la configuración de cada curso, así que dos cursos de la misma academia pueden entregar diplomas distintos.",
    badge: "actualizado",
    keywords: ["certificado", "diploma", "constancia", "descargar", "folio"],
  },
  {
    category: "certificados",
    title: "Verificar un certificado con su folio",
    description:
      "Cualquier persona puede comprobar la autenticidad de tu diploma en la página pública de verificación, sin necesidad de tener cuenta.",
    steps: [
      "Ubica el folio impreso en el certificado.",
      "Comparte el enlace de verificación que aparece junto al certificado.",
      "La página pública muestra el nombre del titular, el curso y la fecha de emisión.",
    ],
    notes:
      "El nombre de la formación que muestra la verificación es exactamente el impreso en el papel. Si un certificado fue revocado, la página lo indica junto con el motivo.",
    badge: "actualizado",
    keywords: ["verificar", "folio", "autenticidad", "público", "validar"],
  },
  {
    category: "certificados",
    title: "Emitir un certificado pendiente",
    description:
      "Si completaste un curso y el diploma no se generó automáticamente, puedes solicitarlo desde tu panel.",
    steps: [
      "Ve a Certificados.",
      "Localiza el curso completado en tu lista.",
      "Haz clic en Emitir certificado.",
      "El diploma se genera con un folio nuevo.",
    ],
    notes:
      "Sólo se pueden emitir certificados de cursos cuya inscripción esté marcada como completada.",
    keywords: ["emitir", "generar", "pendiente", "no llegó"],
  },

  // ─── Mi empresa ───────────────────────────────────────────────────
  {
    category: "empresa",
    title: "Ver los cursos que cubre tu empresa",
    description:
      "Si perteneces a una empresa, tu organización puede tener cursos asignados que quedan disponibles para ti sin costo.",
    steps: [
      "Ve a Mi Empresa en el menú lateral.",
      "Revisa la información de tu organización.",
      "Consulta los cursos asignados y su fecha de vigencia.",
      "Inscríbete directamente a los que sigan activos.",
    ],
    notes:
      "Si una asignación tiene fecha de expiración y ya venció, el curso deja de estar cubierto y tendrías que adquirirlo por tu cuenta.",
    keywords: ["empresa", "b2b", "asignados", "cubierto", "vigencia"],
  },
  {
    category: "empresa",
    title: "Invitar compañeros a tu empresa",
    description:
      "Si eres líder de la empresa —o si tu empresa habilitó las invitaciones entre miembros— puedes invitar por correo a nuevos compañeros.",
    steps: [
      "Ve a Mi Empresa.",
      "En el formulario de invitación, escribe el correo de la persona.",
      "Envía la invitación: recibirá un enlace para registrarse y quedar dentro de la empresa.",
    ],
    notes:
      "Si la empresa tiene un límite de plazas, las invitaciones sin usar ocupan lugar hasta que vencen. Cuando una invitación no se puede enviar, el formulario indica el motivo exacto.",
    badge: "actualizado",
    keywords: ["invitar", "invitación", "compañero", "plazas", "seats"],
  },
  {
    category: "empresa",
    title: "Reporte de equipo (líderes de empresa)",
    description:
      "El líder de la empresa ve, además, un reporte con el avance de los miembros y los resultados de encuestas que la academia haya publicado para su organización.",
    steps: [
      "Ve a Mi Empresa.",
      "Consulta el reporte de equipo con el progreso de cada miembro.",
      "Si tu academia tiene habilitadas las Evaluaciones, revisa desde ahí los resultados de tu empresa.",
      "Si tiene habilitadas las Encuestas, entra a Encuestas para responder las tuyas y consultar los consolidados publicados.",
    ],
    notes:
      "Estas secciones sólo las ve la persona designada como líder de la empresa, y sólo aparecen si el administrador de la academia activó los módulos correspondientes.",
    keywords: ["líder", "reporte", "equipo", "avance", "miembros"],
  },

  // ─── Talleres y consultoría ───────────────────────────────────────
  {
    category: "sesiones",
    title: "Reservar tu lugar en un taller",
    description:
      "Los talleres son sesiones en vivo con fecha, hora y cupo limitado. El sistema evita reservas duplicadas y respeta la capacidad máxima.",
    steps: [
      "Ve a Workshop en el menú lateral.",
      "Revisa los talleres disponibles con su fecha, horario y cupo.",
      "Haz clic en Reservar lugar en el que te interese.",
      "Confirma tu inscripción.",
    ],
    notes:
      "Si el taller ya no tiene lugares, no podrás reservar. En los talleres virtuales, el enlace de la videollamada aparece en el detalle de la sesión.",
    keywords: ["taller", "workshop", "cupo", "reservar", "sesión en vivo"],
  },
  {
    category: "sesiones",
    title: "Asistir a una sesión de Consultoría Online",
    description:
      "La Consultoría Online son citas de asesoría dirigidas a tu empresa o a un grupo concreto de personas. No dependen de ningún curso: aparecen en su propia sección.",
    steps: [
      "Ve a Consultoría Online en el menú lateral.",
      "Revisa tus sesiones próximas y las anteriores.",
      "Recibirás además un correo de invitación con los datos de la cita.",
      "A la hora acordada, entra con el botón Entrar a la reunión.",
    ],
    notes:
      "La sección sólo aparece si tu academia tiene el módulo habilitado. Ves una sesión si va dirigida a toda tu empresa o si te convocaron expresamente. Si el asesor reprograma la cita, te llega un correo de aviso.",
    badge: "nuevo",
    keywords: [
      "consultoría",
      "asesoría",
      "advisory",
      "meet",
      "cita",
      "reunión",
    ],
  },
  {
    category: "sesiones",
    title: "En qué horario se muestran las sesiones",
    description:
      "Todos los horarios de talleres y consultorías se muestran en la hora del centro de México, sin importar dónde estés o cómo tengas configurado tu equipo.",
    steps: [
      "Consulta la fecha y hora tal como aparecen en la plataforma.",
      "Si estás en otro huso horario, haz la conversión desde la hora del centro de México.",
    ],
    notes:
      "Antes cada pantalla podía mostrar una hora distinta según el navegador. Ahora la zona horaria es única en toda la plataforma y coincide con la de los correos de invitación.",
    badge: "nuevo",
    keywords: ["horario", "hora", "zona horaria", "timezone", "huso"],
  },

  // ─── Evaluaciones y encuestas ─────────────────────────────────────
  {
    category: "evaluaciones",
    title: "Responder una evaluación asignada",
    description:
      "Las evaluaciones son cuestionarios de diagnóstico con factores e indicadores que tu academia o tu empresa utiliza para medir desempeño y cumplimiento.",
    steps: [
      "Entra a la evaluación desde la notificación o desde la sección donde te la asignaron.",
      "Responde las preguntas de cada sección o factor.",
      "Envía tus respuestas al terminar.",
    ],
    notes:
      "Requiere que el administrador de tu academia tenga activado el módulo de Evaluaciones. Los resultados se consolidan en un reporte con semáforos y gráficas que revisa quien te asignó la evaluación.",
    keywords: ["evaluación", "kpi", "diagnóstico", "dafo", "cuestionario"],
  },
  {
    category: "evaluaciones",
    title: "Responder una encuesta de satisfacción",
    description:
      "Cuando la academia te asigna una encuesta, te llega un correo con un enlace personal y también aparece en Encuestas dentro de tu panel.",
    steps: [
      "Entra a Encuestas en el menú, o abre el enlace que recibiste por correo.",
      "Revisa a qué corresponde: verás la empresa y el curso, proyecto o evento asociado.",
      "Responde todas las preguntas y envía.",
    ],
    notes:
      "El enlace del correo es personal: no lo reenvíes, porque quien lo reciba respondería en tu nombre. Cada encuesta tiene fecha de vencimiento y, pasada esa fecha, deja de aceptar respuestas. Sólo se puede responder una vez y no se puede editar después de enviar.",
    badge: "actualizado",
    keywords: ["encuesta", "satisfacción", "survey", "enlace", "vencimiento"],
  },
  {
    category: "evaluaciones",
    title: "Ver los resultados de una encuesta",
    description:
      "Los resultados no son automáticos: la academia decide cuándo publicar el consolidado y a quién se lo muestra.",
    steps: [
      "Ve a Encuestas en el menú.",
      "Si hay un consolidado publicado para ti, aparece el botón Resultados.",
      "Ábrelo para ver el índice de satisfacción, el desglose por sección y el detalle por pregunta.",
    ],
    notes:
      "Sólo se publican promedios y distribuciones del conjunto. No verás respuestas individuales, ni quién contestó qué, ni resultados de otras empresas. Si eres líder de una empresa, además ves los consolidados publicados para tu organización.",
    badge: "nuevo",
    keywords: ["resultados", "consolidado", "índice", "satisfacción", "líder"],
  },

  // ─── Pagos ────────────────────────────────────────────────────────
  {
    category: "pagos",
    title: "Pagar un curso",
    description:
      "Los cursos de pago se cobran a través de Stripe con tres métodos: tarjeta de crédito o débito, pago en OXXO y transferencia SPEI.",
    steps: [
      "Abre el curso que quieres adquirir y pulsa Inscribirme o Comprar.",
      "Elige el método de pago:",
      "- Tarjeta: el cobro es inmediato y se confirma en pantalla.",
      "- OXXO: se genera un voucher con tres días de vigencia para pagar en tienda.",
      "- SPEI: se muestran los datos para hacer la transferencia bancaria.",
      "Completa el pago.",
      "Al confirmarse, tu inscripción se crea automáticamente.",
    ],
    notes:
      "OXXO y SPEI son asíncronos: la inscripción se activa cuando el banco confirma el pago, no al generar el voucher. En todos los casos recibes un correo de confirmación.",
    keywords: ["pago", "stripe", "oxxo", "spei", "tarjeta", "comprar"],
  },

  // ─── Cuenta y avisos ──────────────────────────────────────────────
  {
    category: "cuenta",
    title: "Revisar tus notificaciones",
    description:
      "La campana de la barra superior muestra el número de avisos sin leer: inscripciones, certificados emitidos y otros eventos relevantes.",
    steps: [
      "Haz clic en la campana o entra a Notificaciones.",
      "Revisa los avisos pendientes.",
      "Márcalos como leídos de uno en uno o todos a la vez.",
      "Elimina los que ya no necesites.",
    ],
    notes:
      "Cada notificación incluye un enlace directo al curso o certificado relacionado.",
    keywords: ["notificaciones", "campana", "avisos", "alertas"],
  },
  {
    category: "cuenta",
    title: "Cerrar sesión",
    description:
      "Cierra tu sesión en el dispositivo actual cuando termines, sobre todo en equipos compartidos.",
    steps: [
      "Abre el menú de tu usuario o ve a Configuración.",
      "Haz clic en Cerrar sesión.",
      "Volverás a la pantalla de inicio de sesión.",
    ],
    keywords: ["salir", "logout", "cerrar sesión"],
  },

  // ─── Constancia DC-3 ──────────────────────────────────────────────
  {
    category: "dc3",
    title: "Qué es la constancia DC-3 y si te toca",
    description:
      "Es el formato oficial de la STPS con el que tu empresa acredita que te capacitó. Es un documento distinto del diploma del curso, y no todo el mundo lo recibe.",
    steps: [
      "El diploma lo recibes siempre que terminas un curso.",
      "La constancia DC-3 sólo aplica si te inscribió una empresa que tiene sus datos fiscales registrados en la plataforma.",
      "Si tu cuenta no está asociada a ninguna empresa, no verás la sección: no es que te falte algo, es que ese documento no te corresponde.",
      "Además, el curso tiene que estar configurado por el administrador para emitirla.",
    ],
    notes:
      "Encontrarás la sección como Constancias DC-3 en el menú lateral, y también un acceso desde tus Diplomas.",
    badge: "nuevo",
    keywords: [
      "dc3",
      "dc-3",
      "stps",
      "constancia",
      "capacitación",
      "trabajo",
      "empresa",
    ],
  },
  {
    category: "dc3",
    title: "Completar tus datos para el DC-3",
    description:
      "Tú capturas el bloque del trabajador. Se guardan una sola vez y sirven para todas tus constancias.",
    steps: [
      "Ve a Constancias DC-3 en el menú.",
      "En Datos del trabajador, revisa tu nombre: viene de tu perfil, pero el formato lo pide como apellido paterno, materno y nombre(s), y así es como se imprimirá.",
      "Escribe tu CURP. Son 18 caracteres y se valida mientras escribes.",
      "Elige tu ocupación específica del Catálogo Nacional de Ocupaciones.",
      "Escribe tu puesto si quieres: el formato lo marca como dato no obligatorio.",
      "Marca la casilla de verificación y confirma.",
    ],
    notes:
      "Revisa bien antes de confirmar. Una vez emitida la constancia, los datos quedan congelados y cualquier corrección tiene que pedirse al administrador, que debe cancelarla y volver a emitirla.",
    badge: "nuevo",
    keywords: ["curp", "ocupación", "puesto", "datos", "capturar", "nombre"],
  },
  {
    category: "dc3",
    title: "Descargar tu constancia",
    description:
      "Cuando concluyes el curso y los datos de las tres partes están completos, la constancia se puede generar.",
    steps: [
      "Ve a Constancias DC-3 y busca el curso.",
      "Si dice Lista para emitir, lee la leyenda de responsabilidad y pulsa Generar DC-3.",
      "Se te asigna un folio y ya puedes imprimirla las veces que necesites.",
      "También aparece un botón junto al diploma del curso, en la sección Diplomas.",
    ],
    notes:
      "Necesitas tener la sesión abierta para descargar el PDF: el documento lleva tu CURP y el RFC de tu empresa, así que no es un enlace público como el del diploma. Cada descarga queda registrada.",
    badge: "nuevo",
    keywords: ["descargar", "imprimir", "generar", "pdf", "folio"],
  },
  {
    category: "dc3",
    title: "Dice que faltan datos y no puedo generarla",
    description:
      "La ficha del curso lista exactamente qué falta y quién es responsable de cada dato.",
    steps: [
      "Abre Constancias DC-3 y mira el recuadro ámbar del curso.",
      "Cada línea trae entre paréntesis al responsable: Trabajador, Líder de proyecto o Administrador.",
      "Lo que diga Trabajador lo arreglas tú en el formulario de esa misma pantalla.",
      "Lo que diga Líder de proyecto son los datos fiscales de tu empresa: avisa a quien la lidera.",
      "Lo que diga Administrador es configuración del curso: escribe a la academia.",
    ],
    notes:
      "Si el curso todavía no aparece como concluido, primero termínalo. La constancia acredita formación terminada, así que hasta entonces la opción no se habilita.",
    badge: "nuevo",
    keywords: ["falta", "incompleto", "bloqueado", "no puedo", "error"],
  },
  {
    category: "empresa",
    title: "Capturar los datos del patrón para las constancias DC-3",
    description:
      "Si lideras una empresa, tú capturas el bloque del patrón. Se reutiliza en las constancias de todos tus compañeros, así que se hace una vez.",
    steps: [
      "Ve a Mi empresa, o a Constancias DC-3.",
      "En Datos del patrón, escribe el nombre o razón social tal y como debe imprimirse.",
      "Escribe el RFC con homoclave: 12 caracteres si es persona moral, 13 si es persona física.",
      "Escribe el nombre del patrón o representante legal, que firma esa casilla del formato.",
      "Si la empresa tiene más de 50 trabajadores, añade también el representante de los trabajadores. Si no, déjalo vacío.",
      "Marca la casilla de verificación y confirma.",
    ],
    notes:
      "Mientras estos datos falten o el RFC sea inválido, ningún miembro de tu empresa podrá emitir su constancia. Los demás miembros ven estos datos pero no pueden editarlos.",
    badge: "nuevo",
    keywords: [
      "patrón",
      "rfc",
      "razón social",
      "representante",
      "líder",
      "dc3",
      "empresa",
    ],
  },
];

export default function StudentDocsPage() {
  return (
    <div className="px-4 py-5 md:p-6 lg:p-8">
      <div className="mx-auto max-w-4xl lg:max-w-6xl">
        <KnowledgeBase
          title="Centro de ayuda"
          subtitle="Busca por palabra clave o filtra por categoría para resolver dudas sobre tus cursos, certificados y sesiones."
          categories={categories}
          articles={articles}
          supportEmail={SUPPORT_EMAIL}
        />
      </div>
    </div>
  );
}
