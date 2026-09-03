import {
  KnowledgeBase,
  type DocsArticle,
  type DocsCategory,
} from "@/components/knowledge-base";
import { SUPPORT_EMAIL } from "@/lib/brand";

const categories: DocsCategory[] = [
  {
    id: "panorama",
    label: "Panorama",
    icon: "BarChart3",
    summary: "El resumen de tu academia y sus accesos rápidos.",
  },
  {
    id: "empresas",
    label: "Empresas",
    icon: "Building2",
    summary: "Organizaciones cliente, sus miembros y sus cursos.",
  },
  {
    id: "invitaciones",
    label: "Invitaciones",
    icon: "Mail",
    summary: "Altas por correo y control de plazas.",
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: "Users",
    summary: "Altas, roles, importación masiva y accesos.",
  },
  {
    id: "inscripciones",
    label: "Inscripciones",
    icon: "GraduationCap",
    summary: "Inscribir, suspender, reactivar y retirar alumnos.",
  },
  {
    id: "cursos",
    label: "Cursos e ingresos",
    icon: "DollarSign",
    summary: "Catálogo de tu academia y su desempeño económico.",
  },
  {
    id: "pagos",
    label: "Cobros",
    icon: "CreditCard",
    summary: "Stripe Connect y recepción de pagos.",
  },
  {
    id: "integraciones",
    label: "Integraciones",
    icon: "Laptop",
    summary: "Google Meet para talleres y consultorías.",
  },
  {
    id: "marca",
    label: "Marca y cuenta",
    icon: "Settings",
    summary: "Identidad visual de la academia y tu perfil.",
  },
  {
    id: "encuestas",
    label: "Encuestas",
    icon: "ListChecks",
    summary: "Satisfacción: cuestionarios, envíos y publicación de resultados.",
  },
  {
    id: "dc3",
    label: "Constancias DC-3",
    icon: "Stamp",
    summary:
      "Formato oficial de la STPS: agentes capacitadores, configuración por curso y emisión.",
  },
  {
    id: "modulos",
    label: "Módulos",
    icon: "ToggleLeft",
    summary: "Qué funcionalidades tiene activas tu academia.",
  },
];

const articles: DocsArticle[] = [
  // ─── Panorama ─────────────────────────────────────────────────────
  {
    category: "panorama",
    title: "Leer el resumen de tu academia",
    description:
      "El dashboard concentra los totales de tu academia —usuarios, empresas y cursos publicados— y los accesos rápidos a las altas más frecuentes.",
    steps: [
      "Entra al panel de administración de tu academia.",
      "Revisa las tarjetas de Usuarios, Empresas y Cursos publicados.",
      "Usa las acciones rápidas para crear usuarios, importar un CSV o dar de alta empresas.",
    ],
    notes:
      "Los contadores reflejan únicamente los datos de tu academia. No tienes visibilidad sobre otras academias de la plataforma.",
    keywords: ["dashboard", "resumen", "inicio", "totales", "kpi"],
  },

  // ─── Empresas ─────────────────────────────────────────────────────
  {
    category: "empresas",
    title: "Crear una empresa",
    description:
      "Las empresas agrupan a los alumnos de un mismo cliente corporativo y permiten asignarles cursos en bloque.",
    steps: [
      "Ve a Empresas en el menú lateral.",
      "Haz clic en Nueva empresa.",
      "Escribe el nombre y, opcionalmente, correo de contacto, límite de plazas y logotipo.",
      "Confirma la creación.",
    ],
    notes:
      "El identificador se genera automáticamente a partir del nombre. Puedes designar a un líder de empresa, que será el contacto principal y verá el reporte de avance de su equipo.",
    keywords: ["empresa", "cliente", "b2b", "organización", "alta"],
  },
  {
    category: "empresas",
    title: "Editar los datos de una empresa",
    description:
      "Ajusta nombre, correo de contacto, límite de plazas, logotipo y la política de invitaciones entre miembros.",
    steps: [
      "Ve a Empresas y abre la ficha de la empresa.",
      "Haz clic en Editar.",
      "Modifica los campos necesarios.",
      "Guarda los cambios.",
    ],
    notes:
      "Si activas las invitaciones entre miembros, cualquier persona de la empresa podrá invitar a nuevos compañeros por correo, no sólo su líder.",
    keywords: ["editar empresa", "plazas", "seats", "logo", "auto-invitación"],
  },
  {
    category: "empresas",
    title: "Gestionar los miembros de una empresa",
    description:
      "En la pestaña Miembros agregas o quitas a las personas que pertenecen a esa organización, con un buscador para no recorrer listas largas.",
    steps: [
      "Ve a Empresas y abre la ficha de la empresa.",
      "Entra a la pestaña Miembros.",
      "Para sumar personas, usa Agregar usuarios existentes y busca por nombre, correo o empresa actual.",
      "Selecciona a quien corresponda y agrégalo.",
      "Para retirarlo, haz clic en Quitar y confirma.",
    ],
    notes:
      "Cada candidato muestra la empresa a la que pertenece hoy: agregarlo lo mueve de una empresa a otra. La búsqueda ignora acentos y mayúsculas, y el listado de miembros actuales también se puede filtrar cuando la empresa pasa de ocho personas.",
    badge: "nuevo",
    keywords: ["miembros", "buscar", "agregar", "mover", "quitar", "plantilla"],
  },
  {
    category: "empresas",
    title: "Asignar cursos a una empresa",
    description:
      "Al asignar un curso a una empresa, todos sus miembros lo tienen cubierto sin pagarlo individualmente.",
    steps: [
      "Abre la ficha de la empresa y ve a la pestaña Cursos asignados.",
      "Haz clic en Asignar curso.",
      "Elige el curso del listado.",
      "Opcionalmente define una fecha de expiración.",
      "Confirma la asignación.",
    ],
    notes:
      "Los miembros ven estos cursos en su sección Mi Empresa. Cuando una asignación expira, el curso deja de estar cubierto y el alumno tendría que adquirirlo por su cuenta.",
    keywords: ["asignar", "cursos", "cubierto", "vigencia", "expiración"],
  },
  {
    category: "empresas",
    title: "Eliminar una empresa",
    description:
      "Elimina la organización de tu academia. Sus alumnos no se borran, pero dejan de tener cubiertos los cursos asignados por ella.",
    steps: [
      "Abre la ficha de la empresa.",
      "Haz clic en Eliminar empresa.",
      "Confirma la acción.",
    ],
    notes:
      "No se puede deshacer. Los miembros quedan como alumnos sin empresa asignada.",
    keywords: ["eliminar", "borrar empresa", "baja"],
  },

  // ─── Invitaciones ─────────────────────────────────────────────────
  {
    category: "invitaciones",
    title: "Invitar personas a una empresa por correo",
    description:
      "Desde la pestaña Invitaciones envías un enlace de alta a quien todavía no tiene cuenta en la academia.",
    steps: [
      "Abre la ficha de la empresa y ve a la pestaña Invitaciones.",
      "Escribe el correo de la persona a invitar.",
      "Envía la invitación.",
      "Sigue su estado en el listado: pendiente, aceptada o vencida.",
    ],
    notes:
      "Si una invitación no se puede enviar, el formulario indica el motivo exacto en pantalla en lugar de un error genérico. Reenviar una invitación ya existente no consume una plaza nueva.",
    badge: "actualizado",
    keywords: ["invitar", "invitación", "correo", "alta", "pendiente"],
  },
  {
    category: "invitaciones",
    title: "Cómo se cuentan las plazas de una empresa",
    description:
      "Si la empresa tiene un límite de plazas, cuentan tanto los miembros dados de alta como las invitaciones pendientes que siguen vigentes.",
    steps: [
      "Define el límite de plazas al crear o editar la empresa.",
      "Al invitar, la plataforma verifica que quede cupo disponible.",
      "Si el cupo está lleno, retira invitaciones pendientes o amplía el límite.",
    ],
    notes:
      "Las invitaciones pendientes que ya vencieron no ocupan plaza. Antes se quedaban contando para siempre y bloqueaban altas legítimas.",
    badge: "actualizado",
    keywords: ["plazas", "seats", "cupo", "límite", "vencida", "expirada"],
  },

  // ─── Usuarios ─────────────────────────────────────────────────────
  {
    category: "usuarios",
    title: "Crear un usuario",
    description:
      "Da de alta a una persona en tu academia con rol de Alumno, Profesor o Administrador. Recibe un correo de bienvenida con contraseña temporal.",
    steps: [
      "Ve a Usuarios en el menú lateral.",
      "Haz clic en Nuevo usuario.",
      "Escribe correo y nombre, y elige el rol.",
      "Asigna una empresa si corresponde.",
      "Confirma la creación.",
    ],
    notes:
      "Sólo un super administrador de la plataforma puede crear usuarios con rol Administrador. La persona está obligada a cambiar su contraseña en el primer inicio de sesión.",
    keywords: ["crear usuario", "alta", "rol", "bienvenida", "contraseña"],
  },
  {
    category: "usuarios",
    title: "Editar, deshabilitar o eliminar un usuario",
    description:
      "Puedes cambiar nombre, rol y empresa; deshabilitar revoca el acceso conservando los datos, y eliminar los borra.",
    steps: [
      "Ve a Usuarios y ubica a la persona en la tabla.",
      "Abre sus opciones de edición y ajusta nombre, rol o empresa.",
      "Para revocar el acceso temporalmente, márcalo como deshabilitado.",
      "Para borrarlo definitivamente, elige Eliminar y confirma.",
    ],
    notes:
      "No puedes cambiar tu propio rol, deshabilitarte ni eliminarte. Tampoco puedes editar o eliminar a otros administradores: eso queda reservado al super administrador de la plataforma.",
    keywords: ["editar", "deshabilitar", "eliminar", "bloquear", "rol"],
  },
  {
    category: "usuarios",
    title: "Importar usuarios desde un CSV",
    description:
      "Carga masiva a partir de un archivo con las columnas email, name, role y companyName. Cada fila se valida por separado.",
    steps: [
      "Ve a Usuarios y haz clic en Importar CSV.",
      "Sube el archivo con el encabezado: email, name, role, companyName.",
      "Revisa el resultado: usuarios creados, omitidos y errores por fila.",
    ],
    notes:
      "El límite es de 500 filas por importación. Si companyName referencia una empresa inexistente, se crea automáticamente. Si el correo ya está registrado, la fila se omite y el proceso continúa.",
    keywords: ["csv", "importar", "masiva", "carga", "bulk", "500"],
  },
  {
    category: "usuarios",
    title: "Reenviar el correo de bienvenida",
    description:
      "Si alguien no recibió o perdió su correo de alta, puedes reenviarlo desde su fila en la tabla de usuarios.",
    steps: [
      "Ve a Usuarios y ubica a la persona.",
      "Haz clic en Reenviar correo de bienvenida.",
      "La persona recibe un enlace para establecer su contraseña.",
    ],
    notes:
      "Se envía un enlace de restablecimiento, no la contraseña temporal original. El enlace tiene vigencia limitada.",
    keywords: ["reenviar", "bienvenida", "correo", "contraseña", "acceso"],
  },

  // ─── Inscripciones ────────────────────────────────────────────────
  {
    category: "inscripciones",
    title: "Inscribir a un alumno manualmente",
    description:
      "Puedes dar acceso a un curso sin pasar por el cobro, útil para becas, cortesías o casos especiales.",
    steps: [
      "Ve a Usuarios y ubica al alumno, o entra a Cursos y abre el menú de acciones del curso.",
      "Elige Inscribir a curso o Inscribir alumno.",
      "Selecciona el curso o la persona según corresponda.",
      "Confirma la inscripción.",
    ],
    notes:
      "La inscripción manual no genera ningún cobro en Stripe y el acceso es inmediato.",
    keywords: ["inscribir", "manual", "beca", "cortesía", "sin pago"],
  },
  {
    category: "inscripciones",
    title: "Ver las inscripciones de un usuario",
    description:
      "El contador de inscripciones de la tabla de usuarios abre el detalle con todos los cursos de esa persona y su estado.",
    steps: [
      "Ve a Usuarios.",
      "Haz clic en el número de la columna Inscripciones de la persona.",
      "Revisa el listado con el estado de cada curso: activo, completado, suspendido, expirado o reembolsado.",
    ],
    notes:
      "Sólo ves inscripciones de cursos de tu academia. Desde este mismo diálogo se ejecutan las acciones sobre cada inscripción.",
    badge: "nuevo",
    keywords: ["inscripciones", "estado", "cursos del usuario", "detalle"],
  },
  {
    category: "inscripciones",
    title: "Suspender y reactivar una inscripción",
    description:
      "Suspender bloquea el acceso del alumno al curso sin borrar su avance. Es reversible en cualquier momento.",
    steps: [
      "Abre el diálogo de inscripciones del usuario.",
      "En la inscripción que corresponda, elige Suspender.",
      "El alumno deja de poder abrir el curso.",
      "Para devolverle el acceso, elige Reactivar.",
    ],
    notes:
      "Al reactivar, el alumno retoma exactamente donde se quedó: progreso, intentos de quiz y entregas se conservan intactos.",
    badge: "nuevo",
    keywords: [
      "suspender",
      "reactivar",
      "bloquear",
      "pausar",
      "acceso",
      "morosidad",
    ],
  },
  {
    category: "inscripciones",
    title: "Retirar una inscripción",
    description:
      "Retirar elimina la inscripción y todo lo asociado a ella. A diferencia de suspender, no tiene vuelta atrás.",
    steps: [
      "Abre el diálogo de inscripciones del usuario.",
      "En la inscripción que corresponda, elige Retirar.",
      "Confirma la acción.",
    ],
    notes:
      "Se borran en cascada el avance de lecciones, los intentos de quiz, las entregas de tareas y el certificado de ese curso. Si sólo necesitas cortar el acceso de forma temporal, usa Suspender.",
    badge: "nuevo",
    keywords: ["retirar", "eliminar inscripción", "baja", "borrar avance"],
  },

  // ─── Cursos e ingresos ────────────────────────────────────────────
  {
    category: "cursos",
    title: "Consultar los cursos de tu academia y sus ingresos",
    description:
      "La sección Cursos concentra el catálogo de tu academia con su estado, precio, profesor responsable, alumnos inscritos e ingresos generados.",
    steps: [
      "Ve a Cursos en el menú lateral.",
      "Revisa la tabla: precio, alumnos e ingresos por curso.",
      "Consulta el total de ingresos en las tarjetas de resumen.",
    ],
    notes:
      "La gestión económica es responsabilidad de la administración de la academia: los profesores ya no ven importes en su panel. Para modificar el contenido de un curso, debe hacerlo el profesor responsable desde su propio panel.",
    badge: "actualizado",
    keywords: [
      "cursos",
      "ingresos",
      "ventas",
      "precio",
      "alumnos",
      "facturación",
    ],
  },
  {
    category: "cursos",
    title: "Cursos con varios profesores",
    description:
      "Un curso tiene siempre un profesor dueño y puede tener colaboradores invitados que lo construyen con él.",
    steps: [
      "En el listado de Cursos, el profesor que aparece es el dueño del curso.",
      "Los colaboradores editan contenido y publican, pero no archivan, ni cambian precio o título.",
      "Como administración de la academia tienes los mismos permisos que el dueño sobre cualquier curso.",
    ],
    notes:
      "El precio y el título quedan reservados porque el precio puede desalinearse con los enlaces de pago ya creados en Stripe y el título regenera la dirección pública del curso.",
    badge: "nuevo",
    keywords: ["colaborador", "dueño", "profesor", "permisos", "co-crear"],
  },

  // ─── Cobros ───────────────────────────────────────────────────────
  {
    category: "pagos",
    title: "Conectar tu cuenta de Stripe",
    description:
      "Para cobrar cursos necesitas vincular una cuenta de Stripe Connect: los pagos de tus alumnos se procesan y depositan en ella.",
    steps: [
      "Ve a Configuración en el menú lateral.",
      "En la sección de pagos, haz clic en conectar con Stripe.",
      "Completa el proceso de alta en Stripe (datos fiscales y bancarios).",
      "Al volver, la sección indicará si la cuenta ya puede recibir cobros.",
    ],
    notes:
      "El estado muestra por separado si enviaste toda la información y si los cobros están habilitados: Stripe puede tardar en aprobar la cuenta aunque el formulario esté completo.",
    keywords: ["stripe", "connect", "cobros", "pagos", "banco", "onboarding"],
  },
  {
    category: "pagos",
    title: "Métodos de pago disponibles para tus alumnos",
    description:
      "Los alumnos pueden pagar con tarjeta, en OXXO o por transferencia SPEI.",
    steps: [
      "Tarjeta: el cobro es inmediato y la inscripción se crea al confirmarse.",
      "OXXO: se genera un voucher con tres días de vigencia.",
      "SPEI: se entregan los datos para la transferencia bancaria.",
    ],
    notes:
      "OXXO y SPEI son asíncronos: la inscripción se crea cuando el pago se confirma, no al generar el voucher. Si un alumno reporta que pagó y no tiene acceso, verifica primero la confirmación del pago.",
    keywords: [
      "oxxo",
      "spei",
      "tarjeta",
      "métodos",
      "voucher",
      "transferencia",
    ],
  },

  // ─── Integraciones ────────────────────────────────────────────────
  {
    category: "integraciones",
    title: "Conectar Google Meet para talleres y consultorías",
    description:
      "Designas una cuenta de Google como anfitriona de la academia y, a partir de ahí, las sesiones virtuales obtienen su enlace de Meet automáticamente.",
    steps: [
      "Ve a Configuración en el menú lateral.",
      "En la sección de Google Meet, haz clic en conectar.",
      "Autoriza el acceso al calendario con la cuenta de Google que quieras usar como anfitriona.",
      "Al volver, la sección mostrará la cuenta conectada.",
    ],
    notes:
      "La cuenta anfitriona es única por academia: todos los talleres y consultorías virtuales generan su enlace desde su calendario. Puedes desconectarla cuando quieras; a partir de ese momento los enlaces habrá que ponerlos a mano.",
    badge: "nuevo",
    keywords: [
      "google",
      "meet",
      "calendar",
      "videollamada",
      "integración",
      "conectar",
    ],
  },
  {
    category: "integraciones",
    title: "Zona horaria de las sesiones",
    description:
      "Todos los horarios de talleres y consultorías se guardan y se muestran en la hora del centro de México.",
    steps: [
      "Programa las sesiones usando esa referencia horaria.",
      "Los correos de invitación y las pantallas de alumnos muestran la misma hora.",
    ],
    notes:
      "La zona horaria es única para toda la plataforma. Antes cada vista podía heredar la del navegador o la del servidor, y la misma sesión se leía con dos horas distintas.",
    badge: "nuevo",
    keywords: ["horario", "zona horaria", "timezone", "hora", "méxico"],
  },

  // ─── Marca y cuenta ───────────────────────────────────────────────
  {
    category: "marca",
    title: "Personalizar la marca de tu academia",
    description:
      "Define nombre, logotipo, color primario y color de acento. Estos ajustes se aplican en todas las pantallas que ven tus usuarios.",
    steps: [
      "Ve a Configuración en el menú lateral.",
      "En la sección de marca, edita los campos que necesites.",
      "Sube el logotipo desde el formulario.",
      "Escribe los colores en formato hexadecimal, por ejemplo #6366F1.",
      "Guarda los cambios.",
    ],
    notes:
      "El logotipo debe subirse como archivo; no se admiten URLs externas. Los cambios se reflejan de inmediato para todos los usuarios de la academia.",
    keywords: ["marca", "logo", "colores", "branding", "identidad"],
  },
  {
    category: "marca",
    title: "Actualizar tu perfil y cerrar sesión",
    description:
      "Tu perfil personal es independiente de la marca de la academia: cambiarlo sólo afecta a tu cuenta.",
    steps: [
      "Ve a Configuración.",
      "En la sección Perfil, edita tu nombre o sube una foto.",
      "Guarda los cambios.",
      "Para salir, usa Cerrar sesión en la sección de sesión.",
    ],
    keywords: ["perfil", "avatar", "cerrar sesión", "logout"],
  },

  // ─── Módulos ──────────────────────────────────────────────────────
  {
    category: "modulos",
    title: "Qué módulos puede tener activos tu academia",
    description:
      "Algunas secciones aparecen o desaparecen según lo que tenga habilitado tu academia. Los activa el super administrador de la plataforma.",
    steps: [
      "IA para cursos: generación de cursos con inteligencia artificial y consumo de créditos.",
      "Talleres: sesiones en vivo con cupo y reservas.",
      "Consultoría Online: citas de asesoría dirigidas a empresas o personas.",
      "Evaluaciones: diagnósticos por factores con reportes y PDF.",
      "Encuestas: evaluación de satisfacción que administras tú, con envíos, vencimientos y publicación controlada de resultados.",
    ],
    notes:
      "Al desactivar un módulo, sus secciones desaparecen del menú de profesores y alumnos, pero los datos existentes no se borran. Si necesitas activar o desactivar alguno, solicítalo al super administrador de la plataforma. Las constancias DC-3 no están en esta lista: no son un módulo de la academia sino un ajuste por curso, y lo controlas tú desde la sección DC-3.",
    badge: "actualizado",
    keywords: [
      "módulos",
      "toggles",
      "activar",
      "features",
      "consultoría",
      "encuestas",
    ],
  },

  // ─── Encuestas ────────────────────────────────────────────────────
  {
    category: "encuestas",
    title: "Cómo funciona el módulo de Encuestas",
    description:
      "Es una herramienta de evaluación de satisfacción que administras únicamente tú. El cliente responde y, cuando lo autorizas, consulta el consolidado: nunca crea, edita ni reenvía encuestas.",
    steps: [
      "Encuesta: el cuestionario. Es una plantilla reutilizable con sus preguntas, secciones y pesos.",
      "Lanzamiento: un envío concreto de esa plantilla a una empresa, con su contexto, sus fechas y sus destinatarios.",
      "Destinatario: cada persona convocada, con su enlace personal e irrepetible.",
      "Resultados: llegan primero a tu panel; el cliente no ve nada hasta que apruebas publicarlos.",
    ],
    notes:
      "La misma plantilla se relanza tantas veces como haga falta (por bloques, por etapa, por mes) sin duplicar el cuestionario, y el informe puede sumar todos esos lanzamientos por curso, empresa o periodo.",
    badge: "nuevo",
    keywords: ["encuesta", "satisfacción", "survey", "plantilla", "lanzamiento"],
  },
  {
    category: "encuestas",
    title: "Crear una encuesta y sus preguntas",
    description:
      "El cuestionario se define una vez. Las preguntas de estrellas alimentan el índice de satisfacción; las de opción múltiple aportan distribución pero no puntúan.",
    steps: [
      "Ve a Encuestas en el menú lateral y haz clic en Nueva encuesta.",
      "Escribe título, descripción y la duración sugerida (30 días por defecto, editable).",
      "Agrega preguntas indicando su sección y su peso en el índice.",
      "Pon peso 0 en las preguntas que no midan satisfacción (por ejemplo, de clasificación).",
      "Pulsa Activar cuando el cuestionario esté listo para lanzarse.",
    ],
    notes:
      "La sección es texto libre y sirve para agrupar métricas en el informe. Duplicar una encuesta copia sus preguntas y la deja en borrador, útil cuando una variante necesita cambios.",
    keywords: ["preguntas", "sección", "peso", "índice", "estrellas", "duplicar"],
  },
  {
    category: "encuestas",
    title: "Lanzar una encuesta y elegir destinatarios",
    description:
      "Cada lanzamiento apunta a una empresa y, opcionalmente, a un curso, workshop, consultoría o proyecto. Ese contexto se muestra en el correo y en el panel de quien responde.",
    steps: [
      "Abre la encuesta y usa Configurar envío.",
      "Elige la empresa y a quién va: sólo el líder, usuarios específicos o todos los usuarios de la empresa.",
      "Indica el contexto (curso, workshop, consultoría o proyecto) si aplica.",
      "Define la duración o la fecha de vencimiento y los días de recordatorio.",
      "Crea el lanzamiento y pulsa Enviar invitaciones para que salgan los correos.",
    ],
    notes:
      "El lanzamiento nace en borrador: no sale ningún correo hasta que pulsas Enviar. Cada destinatario recibe un enlace personal que sólo sirve para responder ese lanzamiento. Si además necesitas un enlace abierto (por ejemplo, asistentes a un evento que no son usuarios), actívalo desde el lanzamiento: quien lo use se identifica por correo y sigue pudiendo responder una sola vez.",
    keywords: ["lanzamiento", "destinatarios", "líder", "enlace", "envío"],
  },
  {
    category: "encuestas",
    title: "Vencimiento, recordatorios y cierre",
    description:
      "Una encuesta vencida deja de aceptar respuestas por sí sola. Los recordatorios salen automáticamente en los días que configures antes del cierre.",
    steps: [
      "Configura los días de recordatorio al lanzar (por defecto 7 y 2 días antes).",
      "Amplía la fecha de vencimiento desde el lanzamiento si necesitas dar prórroga.",
      "Usa Cerrar ahora para terminar la recolección antes de tiempo.",
      "Usa Anular sólo si el lanzamiento aún no tiene ninguna respuesta.",
    ],
    notes:
      "Ampliar la fecha de un lanzamiento ya cerrado lo reabre sin perder las respuestas recibidas. Los recordatorios sólo llegan a quien todavía no respondió.",
    keywords: ["vencimiento", "recordatorio", "cierre", "prórroga", "anular"],
  },
  {
    category: "encuestas",
    title: "Enviar la encuesta automáticamente al terminar un curso",
    description:
      "Una encuesta puede dispararse sola cuando el alumno completa un curso o cuando se emite su diploma.",
    steps: [
      "Abre la encuesta y ve al bloque Disparador automático.",
      "Elige Al finalizar el curso o Al emitir el diploma.",
      "Selecciona el curso, o deja Todos los cursos.",
      "Asegúrate de que la encuesta esté Activa: en borrador el disparador no actúa.",
    ],
    notes:
      "Las respuestas disparadas se acumulan en un lanzamiento mensual por curso y empresa, de modo que la ventana de respuesta no crece indefinidamente y el informe queda agrupado por periodo. Cada alumno entra una sola vez.",
    badge: "nuevo",
    keywords: ["automático", "disparador", "diploma", "curso", "trigger"],
  },
  {
    category: "encuestas",
    title: "Publicar los resultados al cliente",
    description:
      "Los resultados llegan primero a tu panel. Tú decides si el consolidado se hace visible y hasta dónde llega.",
    steps: [
      "Abre el lanzamiento y revisa el índice de satisfacción, el desglose por sección y el detalle por pregunta.",
      "En Publicación de resultados elige si lo ve sólo el líder de la empresa o también los participantes.",
      "Escribe una nota de contexto si quieres acompañar el consolidado.",
      "Marca si quieres generar un enlace de solo lectura y si se avisa por correo.",
      "Pulsa Publicar resultados. Puedes retirarlo después en cualquier momento.",
    ],
    notes:
      "El cliente sólo ve promedios y distribuciones del conjunto: nunca respuestas individuales, correos de respondientes ni resultados de otra empresa. Sin publicar, no ve absolutamente nada.",
    keywords: ["publicar", "resultados", "consolidado", "líder", "visibilidad"],
  },
  {
    category: "encuestas",
    title: "Leer el informe consolidado",
    description:
      "El informe suma varios lanzamientos y calcula el índice de satisfacción ponderado por número de respuestas.",
    steps: [
      "Ve a Encuestas y entra a Informe.",
      "Filtra por encuesta, empresa, curso o rango de fechas.",
      "Revisa el índice general y los desgloses por encuesta, empresa y curso.",
      "Entra a cualquier lanzamiento desde el detalle para ver su resultado completo.",
    ],
    notes:
      "Un lanzamiento con 2 respuestas no pesa lo mismo que uno con 200: el índice de cada grupo se pondera por respuestas, no por número de lanzamientos. Sólo cuentan los lanzamientos ya enviados.",
    keywords: ["informe", "consolidado", "índice", "ponderado", "periodo"],
  },

  // ─── Constancias DC-3 ─────────────────────────────────────────────
  {
    category: "dc3",
    title: "Qué es el DC-3 y a quién le corresponde",
    description:
      "La Constancia de Competencias o de Habilidades Laborales es el formato oficial con el que un patrón acredita ante la STPS que capacitó a un trabajador. Es un documento distinto del diploma de la plataforma.",
    steps: [
      "El diploma lo emite tu academia y lo recibe cualquier alumno que termina un curso.",
      "El DC-3 lo emite el patrón, y sólo le corresponde a quien se inscribió a través de una empresa con sus datos fiscales registrados.",
      "Un alumno sin empresa asociada no ve la opción, ni siquiera al terminar el curso: no es un dato que le falte, es un documento que no le toca.",
      "El curso también tiene que estar configurado para emitirlo. Arranca desactivado en todos.",
    ],
    notes:
      "Las cuatro condiciones se exigen a la vez: alumno con empresa, curso con DC-3 activado, curso concluido y datos completos de las tres partes. Si falta cualquiera, el botón no se habilita.",
    badge: "nuevo",
    keywords: [
      "dc3",
      "dc-3",
      "stps",
      "constancia",
      "capacitación",
      "competencias",
      "habilidades laborales",
    ],
  },
  {
    category: "dc3",
    title: "Paso 1 — Registrar el agente capacitador",
    description:
      "El agente capacitador es quien impartió la formación y firma esa casilla del formato. Sin al menos uno registrado, ningún curso puede emitir constancias.",
    steps: [
      "Ve a DC-3 en el menú lateral.",
      "En Agentes capacitadores, haz clic en Nuevo agente.",
      "Escribe el nombre o razón social tal y como debe imprimirse.",
      "Añade su registro ante la STPS si lo tiene, y su RFC si quieres dejarlo asentado.",
      "Sube su logotipo si quieres que aparezca en el encabezado de la constancia, junto al de la empresa.",
      "Guarda. A partir de ahí puedes elegirlo en cualquier curso.",
    ],
    notes:
      "No se asume que el agente capacitador sea tu academia: con frecuencia son empresas distintas, y la constancia debe decir quién impartió de verdad. Puedes registrar varios y elegir uno por curso. Marcar uno como inactivo lo retira de los cursos nuevos, pero no lo quita de los que ya lo tienen asignado.",
    badge: "nuevo",
    keywords: ["agente", "capacitador", "stps", "registro", "externo", "logo"],
  },
  {
    category: "dc3",
    title: "Paso 2 — Activar el DC-3 en un curso",
    description:
      "La configuración del programa de capacitación vive aquí, no en el editor del profesor: son datos con efectos ante la autoridad, no decisiones editoriales del curso.",
    steps: [
      "Ve a DC-3 y entra al curso desde la lista.",
      "Marca la casilla Este curso emite constancia DC-3.",
      "Nombre del curso en el DC-3: déjalo vacío para usar el título de la plataforma, o escribe otro si ese título lleva códigos o abreviaturas.",
      "Área temática: elígela del catálogo oficial de la STPS.",
      "Duración en horas: son las horas declaradas del programa, no la suma de los videos.",
      "Agente capacitador: elige uno de los registrados en el paso 1.",
      "Instructor o tutor: quien firma la primera casilla del bloque de firmas. Puede no ser el profesor dueño del curso.",
      "Elige la modalidad y guarda.",
    ],
    notes:
      "La lista de cursos marca en ámbar lo que falta en cada uno, así que puedes ver de un vistazo cuáles están listos para emitir y cuáles no.",
    badge: "nuevo",
    keywords: [
      "activar",
      "configurar",
      "curso",
      "área temática",
      "horas",
      "instructor",
    ],
  },
  {
    category: "dc3",
    title: "Paso 3 — La modalidad decide de dónde salen las fechas",
    description:
      "El formato exige el periodo real de ejecución. La fecha en que se creó el curso no sirve: no dice nada sobre cuándo se capacitó a nadie.",
    steps: [
      "En línea o pregrabado: el periodo es la ventana propia de cada alumno, de su inscripción a la fecha en que concluyó el curso. Es distinta para cada persona y el sistema la calcula solo.",
      "En vivo, presencial o virtual: el periodo lo fija la edición a la que asistió el alumno. Hay que registrarla y asignársela.",
      "Cambia la modalidad en la ficha del curso, en el bloque Modalidad y periodo de ejecución.",
    ],
    notes:
      "Si eliges En vivo y no registras ediciones, ningún alumno de ese curso podrá emitir su constancia: le faltará el periodo. La lista de cursos te lo señala como dato pendiente.",
    badge: "nuevo",
    keywords: [
      "periodo",
      "fechas",
      "ejecución",
      "modalidad",
      "en vivo",
      "en línea",
      "pregrabado",
    ],
  },
  {
    category: "dc3",
    title: "Paso 4 — Ediciones de un curso en vivo",
    description:
      "Una misma plantilla de curso se imparte muchas veces en fechas distintas. Cada impartición es una edición con sus fechas reales.",
    steps: [
      "En la ficha DC-3 del curso, ve a Ediciones e impartición y crea una Nueva edición.",
      "Ponle un nombre que reconozcas después, por ejemplo “Generación marzo 2026 — Monterrey”.",
      "Captura la fecha real de inicio y la de término, no las programadas.",
      "Si esa edición se dio en otras horas o con otro instructor, sobrescríbelo aquí; si no, déjalo vacío y hereda lo del curso.",
      "Más abajo, en Alumnos, asigna a cada inscrito su edición desde el desplegable.",
    ],
    notes:
      "Una edición con alumnos asignados no se puede eliminar: primero hay que reasignarlos, para que quien la borra vea a quién está dejando sin fechas.",
    badge: "nuevo",
    keywords: [
      "edición",
      "generación",
      "evento",
      "impartición",
      "asignar",
      "alumnos",
    ],
  },
  {
    category: "dc3",
    title: "Quién captura cada bloque del formato",
    description:
      "El DC-3 se llena a tres manos, igual que está pintado el formato oficial. Tú sólo controlas uno de los tres bloques.",
    steps: [
      "Datos del trabajador: los captura el propio alumno en su panel — nombre en orden oficial, CURP, ocupación del Catálogo Nacional de Ocupaciones y puesto.",
      "Datos de la empresa: los captura el líder de proyecto de esa empresa — razón social, RFC, representante legal y, si aplica, representante de los trabajadores.",
      "Datos del programa: los capturas tú, en la ficha DC-3 del curso.",
      "El periodo de ejecución y el folio de control los pone el sistema.",
    ],
    notes:
      "Los datos del patrón se guardan en la empresa y se reutilizan en las constancias de todos sus miembros: se capturan una vez, no una por alumno. Si una empresa no tiene líder designado, puedes capturar esos datos tú desde la ficha de la empresa.",
    badge: "nuevo",
    keywords: [
      "roles",
      "quién",
      "trabajador",
      "patrón",
      "líder",
      "responsable",
      "curp",
      "rfc",
    ],
  },
  {
    category: "dc3",
    title: "Paso 5 — Emitir la constancia",
    description:
      "Cuando las cuatro condiciones se cumplen, la constancia se puede emitir desde tu panel o desde el del propio alumno.",
    steps: [
      "Entra a DC-3 y abre el curso.",
      "En Alumnos, localiza a la persona: si está lista verás el botón Emitir DC-3.",
      "Púlsalo. El folio se asigna en ese momento, con una serie propia por academia y año.",
      "A partir de ahí el botón se sustituye por el folio, que abre el PDF.",
      "El alumno también puede emitirla él mismo desde Constancias DC-3 en su panel, y el líder de su empresa desde el suyo.",
    ],
    notes:
      "Emitir es idempotente: si alguien ya la emitió, volver a pulsar devuelve la misma constancia en vez de duplicarla. Al emitirse, todos los datos quedan congelados — corregir después el CURP del alumno o el RFC del patrón no cambia lo que dice un documento ya entregado.",
    badge: "nuevo",
    keywords: ["emitir", "generar", "folio", "imprimir", "expedir"],
  },
  {
    category: "dc3",
    title: "Por qué un alumno aparece bloqueado",
    description:
      "La lista de alumnos dice exactamente qué falta y de quién depende, para que no tengas que adivinar a quién ir a buscar.",
    steps: [
      "No aplica: el alumno no pertenece a ninguna empresa, o el curso no tiene el DC-3 activado.",
      "En progreso: todavía no concluye el curso. La constancia acredita formación terminada.",
      "Datos incompletos: bajo la fila aparece la lista de lo que falta, con el responsable de cada dato entre paréntesis.",
      "Actúa según el responsable: si es del trabajador o del patrón, avísales; si es del administrador, complétalo tú en la ficha del curso.",
    ],
    notes:
      "El puesto del trabajador y el representante de los trabajadores son opcionales en el formato oficial, así que nunca bloquean la emisión. La CURP y el RFC sí, y además se validan de formato: una CURP mal capturada invalida la constancia y el error suele descubrirse cuando el trabajador la necesita.",
    badge: "nuevo",
    keywords: [
      "bloqueado",
      "falta",
      "incompleto",
      "no puedo emitir",
      "pendiente",
      "error",
    ],
  },
  {
    category: "dc3",
    title: "Corregir o cancelar una constancia ya emitida",
    description:
      "Después de emitir, los datos están congelados. Corregirlos exige cancelar la constancia y volver a emitirla, y eso sólo lo puede hacer la administración.",
    steps: [
      "Pide a quien corresponda que corrija el dato en su panel: el alumno los suyos, el líder los del patrón, tú los del curso.",
      "Cancela la constancia equivocada indicando el motivo.",
      "Vuelve a emitirla: tomará los datos ya corregidos y un folio nuevo.",
    ],
    notes:
      "Una constancia cancelada se sigue pudiendo abrir —hace falta para auditar qué se entregó— pero sale marcada con un sello CANCELADA para que nadie la presente como válida. Antes de imprimir, tanto el alumno como el líder ven la leyenda que les advierte de esto.",
    badge: "nuevo",
    keywords: ["corregir", "error", "cancelar", "anular", "reemitir", "cambio"],
  },
  {
    category: "dc3",
    title: "Historial de impresiones",
    description:
      "Cada copia que sale queda registrada con quién la descargó y cuándo.",
    steps: [
      "La emisión se asienta una sola vez, en el momento de generar la constancia.",
      "Cada descarga posterior del PDF se asienta como una impresión más.",
      "El folio de control del pie del documento permite rastrear una copia concreta.",
    ],
    notes:
      "El PDF no es público como el del diploma: lleva la CURP del trabajador y el RFC de su patrón, así que sólo lo pueden abrir el propio trabajador, el líder de su empresa y la administración de la academia. Un enlace compartido a alguien fuera de ese círculo no abre.",
    badge: "nuevo",
    keywords: [
      "historial",
      "reimprimir",
      "reimpresión",
      "auditoría",
      "descargas",
      "privacidad",
    ],
  },
];

export default function TenantAdminDocsPage() {
  return (
    <div className="mx-auto max-w-4xl lg:max-w-none">
      <KnowledgeBase
        title="Base de conocimientos"
        subtitle="Busca por palabra clave o filtra por categoría para administrar tu academia: empresas, usuarios, inscripciones y cobros."
        categories={categories}
        articles={articles}
        supportEmail={SUPPORT_EMAIL}
      />
    </div>
  );
}
