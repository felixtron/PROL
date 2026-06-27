import {
  BookOpen,
  Video,
  LayoutGrid,
  ClipboardCheck,
  PauseCircle,
  FileText,
  Sparkles,
  ListChecks,
  Calendar,
  Users,
  DollarSign,
  Award,
  Settings,
} from "lucide-react";

const sections = [
  {
    title: "Gestión de Cursos",
    icon: BookOpen,
    items: [
      {
        name: "Crear un curso nuevo",
        description:
          "Crea un curso desde cero dentro de tu academia. Define el título, descripción, precio y categoría. El slug se genera automáticamente.",
        steps: [
          "Ve a la sección Cursos en el menú lateral.",
          "Haz clic en Crear curso.",
          "Ingresa el título, descripción, precio y categoría.",
          "Confirma la creación.",
          "Agrega módulos y lecciones antes de publicar.",
        ],
        notes: "El curso se crea en estado DRAFT. No será visible para alumnos hasta que lo publiques.",
      },
      {
        name: "Actualizar datos de un curso",
        description:
          "Modifica el título, descripción, precio, categoría y descripción del certificado de un curso existente.",
        steps: [
          "Ve a la sección Cursos y selecciona el curso.",
          "Haz clic en Editar.",
          "Modifica los campos deseados.",
          "Guarda los cambios.",
        ],
        notes: "Si cambias el título, el slug se regenera automáticamente.",
      },
      {
        name: "Actualizar imagen de portada del curso",
        description:
          "Sube o cambia la imagen de portada (thumbnail) que se muestra en el catálogo de cursos.",
        steps: [
          "Ve a la edición del curso.",
          "En la sección de portada, haz clic en Subir imagen.",
          "Selecciona la imagen desde tu dispositivo.",
          "La imagen se actualizará automáticamente.",
        ],
        notes: "Se recomienda una imagen cuadrada de al menos 400×400px.",
      },
      {
        name: "Archivar un curso",
        description:
          "Archiva un curso para que ya no aparezca en el catálogo. Los alumnos ya inscritos conservan su acceso y progreso.",
        steps: [
          "Ve a la sección Cursos y selecciona el curso.",
          "Haz clic en Archivar.",
          "Confirma la acción.",
        ],
        notes: "Un curso archivado no puede recibir nuevas inscripciones. Esta acción no elimina el curso.",
      },
      {
        name: "Crear módulos y submódulos",
        description:
          "Organiza tu curso en módulos (secciones principales) y submódulos (un nivel de anidamiento). Los módulos contienen lecciones y definen la estructura del curso.",
        steps: [
          "En la edición del curso, ve a la sección de Estructura.",
          "Haz clic en Agregar módulo e ingresa el título.",
          "Para crear un submódulo, haz clic en Agregar submódulo dentro de un módulo existente.",
          "Arrastra módulos y submódulos para reordenarlos.",
        ],
        notes: "Solo se permite un nivel de submódulos (no submódulos dentro de submódulos).",
      },
      {
        name: "Crear lecciones",
        description:
          "Agrega lecciones dentro de un módulo o submódulo. Los tipos disponibles son: Video, Texto, Quiz, Tarea, Multiformato y Descarga.",
        steps: [
          "En la edición del curso, ve al módulo donde deseas agregar la lección.",
          "Haz clic en Agregar lección.",
          "Ingresa el título y selecciona el tipo de lección.",
          "Configura el contenido según el tipo elegido.",
        ],
        notes:
          "Al crear una lección, el contador de totalLessons del curso se incrementa automáticamente. Al eliminarla, se decrementa.",
      },
      {
        name: "Reordenar y mover lecciones",
        description:
          "Cambia el orden de las lecciones dentro de un módulo o muévelas a otro módulo o submódulo dentro del mismo curso.",
        steps: [
          "En la edición del curso, ve a la sección de Estructura.",
          "Usa las flechas arriba/abajo para mover lecciones dentro del mismo módulo.",
          "Para mover a otro contenedor, selecciona la lección y elige el módulo destino.",
        ],
        notes: "La lección se coloca al final del módulo destino. Solo puedes mover lecciones dentro del mismo curso.",
      },
      {
        name: "Publicar un curso",
        description:
          "Una vez que el curso tiene al menos una lección y un título válido, publícalo para que aparezca en el catálogo de alumnos.",
        steps: [
          "Verifica que el curso tenga al menos una lección creada.",
          "Verifica que el título tenga al menos 3 caracteres.",
          "Haz clic en Publicar curso.",
          "El curso aparecerá en el catálogo y los alumnos podrán inscribirse.",
        ],
        notes: "El contador de lecciones se recalcula automáticamente al publicar, incluyendo lecciones de submódulos.",
      },
    ],
  },
  {
    title: "Contenido de Video",
    icon: Video,
    items: [
      {
        name: "Subir video directamente (Cloudflare Stream)",
        description:
          "Sube un archivo de video que se procesa y almacena en Cloudflare Stream para reproducción optimizada.",
        steps: [
          "En la edición de la lección de tipo Video, haz clic en Subir video.",
          "Selecciona el archivo de video desde tu dispositivo.",
          "Espera a que se complete la subida y el procesamiento.",
          "Verifica el estado de procesamiento; cuando esté listo, el video estará disponible para los alumnos.",
        ],
        notes: "El procesamiento puede tardar varios minutos dependiendo de la duración y calidad del video.",
      },
      {
        name: "Agregar video desde URL de Vimeo",
        description:
          "Pega una URL de un video público o no listado de Vimeo. El sistema valida la existencia del video y obtiene su duración automáticamente.",
        steps: [
          "En la edición de la lección, selecciona Pegar URL.",
          "Pega la URL del video de Vimeo.",
          "El sistema validará el video y obtendrá la duración.",
          "Confirma para vincular el video a la lección.",
        ],
        notes: "El video debe ser público o no listado en Vimeo. Videos privados no se pueden reproducir.",
      },
      {
        name: "Agregar video desde URL de YouTube",
        description:
          "Pega una URL de un video público o no listado de YouTube. El sistema valida que el video exista.",
        steps: [
          "En la edición de la lección, selecciona Pegar URL.",
          "Pega la URL del video de YouTube.",
          "El sistema validará la existencia del video.",
          "Confirma para vincular el video a la lección.",
        ],
        notes: "Si la URL incluye un timestamp de inicio (ej. ?t=120), el video comenzará desde ese punto.",
      },
      {
        name: "Quitar video de una lección",
        description:
          "Elimina el video asociado a una lección, limpiando todas las referencias (URL, proveedor, duración).",
        steps: [
          "En la edición de la lección, ve a la sección de video.",
          "Haz clic en Quitar video.",
          "Confirma la acción.",
        ],
        notes: "Esta acción no elimina el archivo original de Cloudflare Stream, Vimeo o YouTube.",
      },
    ],
  },
  {
    title: "Lecciones Multiformato",
    icon: LayoutGrid,
    items: [
      {
        name: "Agregar bloques a una lección multiformato",
        description:
          "Las lecciones de tipo MULTI permiten combinar hasta 20 bloques de contenido: video, PDF, texto y quiz. Cada bloque se presenta de forma secuencial al alumno.",
        steps: [
          "En la edición del curso, ve a la lección de tipo Multiformato.",
          "Haz clic en Agregar bloque.",
          "Selecciona el tipo de bloque (video, PDF, texto o quiz).",
          "Configura el contenido del bloque.",
          "Repite para cada bloque adicional.",
        ],
        notes:
          "Los bloques de tipo quiz deben referenciar un quiz existente dentro del mismo curso. Una lección multiformato no puede tener más de 20 bloques.",
      },
      {
        name: "Reordenar, editar y eliminar bloques",
        description:
          "Modifica el orden de los bloques, actualiza su contenido o elimina los que ya no necesites.",
        steps: [
          "En la edición de la lección multiformato, arrastra los bloques para reordenarlos.",
          "Para editar un bloque, haz clic en él y modifica los campos.",
          "Para eliminar un bloque, haz clic en el ícono de eliminar.",
        ],
        notes: "Eliminar un bloque no afecta el progreso de los alumnos que ya completaron ese bloque.",
      },
    ],
  },
  {
    title: "Quizzes y Exámenes",
    icon: ClipboardCheck,
    items: [
      {
        name: "Crear un quiz",
        description:
          "Crea un cuestionario para una lección de tipo Quiz. Define el título, puntaje mínimo para aprobar, preguntas con opciones y respuesta correcta, límite de tiempo y número máximo de intentos.",
        steps: [
          "En la edición del curso, ve a la lección de tipo Quiz.",
          "Haz clic en Crear quiz.",
          "Ingresa el título del quiz.",
          "Define el puntaje mínimo de aprobación (0-100%).",
          "Agrega preguntas con al menos 2 opciones cada una.",
          "Selecciona la respuesta correcta para cada pregunta.",
          "Configura el límite de tiempo (en minutos) y el máximo de intentos.",
          "Guarda el quiz.",
        ],
        notes: "Solo puede existir un quiz por lección de tipo Quiz. Cada pregunta debe tener al menos 2 opciones.",
      },
      {
        name: "Configurar examen final",
        description:
          "Designa un quiz como examen final del curso. El examen final requiere un puntaje mínimo de aprobación del 80% y solo se permite uno por curso.",
        steps: [
          "Al crear o editar un quiz, marca la opción Examen final.",
          "Verifica que el puntaje mínimo sea al menos 80%.",
          "Guarda los cambios.",
        ],
        notes:
          "Los alumnos deben aprobar todos los quizzes intermedios del curso con al menos 80% antes de poder acceder al examen final. Solo puede haber un examen final por curso.",
      },
      {
        name: "Editar y eliminar quizzes",
        description:
          "Modifica las preguntas, puntaje mínimo, límite de tiempo o elimina un quiz existente.",
        steps: [
          "En la edición del curso, ve a la lección de tipo Quiz.",
          "Edita los campos del quiz que deseas modificar.",
          "Para eliminar, haz clic en Eliminar quiz y confirma.",
        ],
        notes: "Eliminando un quiz se borran los intentos registrados de los alumnos.",
      },
    ],
  },
  {
    title: "Paradas Interactivas",
    icon: PauseCircle,
    items: [
      {
        name: "Crear paradas interactivas en videos",
        description:
          "Agrega puntos de interacción dentro de un video que se activan al alcanzar un momento específico. Los tipos disponibles son: Pregunta (con opción correcta), Reflexión (texto libre), Ejercicio (marca de completado) y Encuesta (voto).",
        steps: [
          "En la edición del curso, ve a una lección de tipo Video.",
          "Haz clic en Agregar parada interactiva.",
          "Define el momento del video (en segundos) donde aparecerá la parada.",
          "Selecciona el tipo: Pregunta, Reflexión, Ejercicio o Encuesta.",
          "Configura el contenido según el tipo (pregunta y opciones, texto de reflexión, etc.).",
          "Marca si la parada es obligatoria u opcional.",
          "Guarda los cambios.",
        ],
        notes: "Las paradas interactivas solo están disponibles en lecciones de tipo Video.",
      },
      {
        name: "Editar y eliminar paradas interactivas",
        description:
          "Modifica el contenido, timestamp o tipo de una parada interactiva, o elimínala si ya no la necesitas.",
        steps: [
          "En la edición de la lección de video, ubica la parada interactiva.",
          "Edita los campos que desees modificar (timestamp, tipo, contenido, obligatoriedad).",
          "Para eliminar, haz clic en Eliminar y confirma.",
        ],
        notes: "Ninguna.",
      },
    ],
  },
  {
    title: "Tareas",
    icon: FileText,
    items: [
      {
        name: "Configurar tareas en lecciones",
        description:
          "Crea tareas para que los alumnos entreguen trabajo en una lección de tipo Assignment. Los alumnos deben subir su entrega, y tú puedes calificarla.",
        steps: [
          "En la edición del curso, selecciona o crea una lección de tipo Tarea.",
          "Configura las instrucciones de la tarea.",
          "Publica el curso para que la tarea esté disponible.",
        ],
        notes: "Las lecciones de tipo Tarea no se pueden marcar como COMPLETED manualmente; se completan cuando el alumno entrega la tarea.",
      },
    ],
  },
  {
    title: "Generación de Cursos con IA",
    icon: Sparkles,
    items: [
      {
        name: "Generar un curso con inteligencia artificial",
        description:
          "Usa la IA (Anthropic Claude) para generar un curso completo a partir de un briefing. El proceso tiene 4 etapas: briefing, outline, refinamiento y publicación. Cada uso consume créditos de tu cuenta.",
        steps: [
          "Ve a la sección Cursos y haz clic en Generar con IA.",
          "Escribe un briefing describiendo el tema, audiencia y objetivos del curso.",
          "Revisa el outline generado por la IA y ajústalo si es necesario.",
          "Refina el contenido de cada módulo y lección.",
          "Cuando estés satisfecho, publica el curso.",
        ],
        notes:
          "Esta funcionalidad requiere que el toggle de IA esté activado en tu tenant. Cada generación consume créditos; consulta con tu administrador sobre el saldo disponible.",
      },
    ],
  },
  {
    title: "Evaluaciones",
    icon: ClipboardCheck,
    items: [
      {
        name: "Crear y gestionar evaluaciones",
        description:
          "Crea evaluaciones con factores KPI para medir el desempeño de los alumnos. Las evaluaciones contienen preguntas estructuradas y se asignan a alumnos específicos.",
        steps: [
          "Ve a la sección Evaluaciones en el menú lateral (visible si el toggle está activado).",
          "Haz clic en Crear evaluación.",
          "Define el título, descripción y factores KPI.",
          "Agrega las preguntas de la evaluación.",
          "Publica la evaluación para que los alumnos puedan responderla.",
        ],
        notes: "Esta funcionalidad requiere que el administrador haya activado el toggle de Evaluaciones en tu tenant.",
      },
    ],
  },
  {
    title: "Encuestas",
    icon: ListChecks,
    items: [
      {
        name: "Crear y gestionar encuestas",
        description:
          "Crea encuestas con un enlace público compartible. Las encuestas tienen un slug que permite acceso sin autenticación. Pueden ser creadas por profesores y admins de empresas.",
        steps: [
          "Ve a la sección Encuestas en el menú lateral (visible si el toggle está activado).",
          "Haz clic en Crear encuesta.",
          "Define el título, descripción y preguntas.",
          "Configura las opciones de respuesta para cada pregunta.",
          "Publica la encuesta y comparte el enlace público.",
        ],
        notes: "Esta funcionalidad requiere que el administrador haya activado el toggle de Encuestas en tu tenant. El enlace público permite responder a cualquier persona con la URL.",
      },
    ],
  },
  {
    title: "Sesiones y Talleres",
    icon: Calendar,
    items: [
      {
        name: "Crear y gestionar talleres",
        description:
          "Crea sesiones en vivo y talleres con capacidad, fecha, hora y soporte de recurrencia. Los alumnos pueden reservar su lugar con protección contra inscripciones duplicadas.",
        steps: [
          "Ve a la sección Sesiones y Talleres en el menú lateral.",
          "Haz clic en Crear taller.",
          "Define el título, descripción, fecha, hora y capacidad máxima.",
          "Configura la recurrencia si el taller se repite.",
          "Publica el taller para que los alumnos puedan reservar.",
        ],
        notes: "Esta funcionalidad requiere que el toggle de Talleres esté activado en tu tenant. El sistema previene inscripciones duplicadas (anti race-condition).",
      },
    ],
  },
  {
    title: "Alumnos",
    icon: Users,
    items: [
      {
        name: "Ver alumnos inscritos",
        description:
          "Consulta la lista de alumnos inscritos en tus cursos, su progreso, entregas de tareas y resultados de quizzes.",
        steps: [
          "Ve a la sección Alumnos en el menú lateral.",
          "Filtra por curso o busca por nombre.",
          "Haz clic en un alumno para ver su progreso detallado.",
        ],
        notes: "Solo ves alumnos de tus cursos dentro del mismo tenant.",
      },
    ],
  },
  {
    title: "Ingresos",
    icon: DollarSign,
    items: [
      {
        name: "Consultar ingresos por cursos",
        description:
          "Revisa los ingresos generados por tus cursos, desglosados por curso y periodo. Se muestra el monto total recibido después de la comisión de la plataforma.",
        steps: [
          "Ve a la sección Ingresos en el menú lateral.",
          "Revisa el resumen de ingresos por curso.",
          "Filtra por periodo si es necesario.",
        ],
        notes: "Los ingresos mostrados corresponden a tu participación después del revenue share de la plataforma.",
      },
    ],
  },
  {
    title: "Certificados",
    icon: Award,
    items: [
      {
        name: "Revocar un certificado",
        description:
          "Revoca un certificado emitido a un alumno de tus cursos si existe un motivo válido. La revocación queda registrada con la razón proporcionada.",
        steps: [
          "Ve a la sección Alumnos y ubica al alumno.",
          "Busca el certificado en su historial de cursos completados.",
          "Haz clic en Revocar certificado.",
          "Ingresa la razón de la revocación (entre 3 y 500 caracteres).",
          "Confirma la acción.",
        ],
        notes: "Solo el profesor del curso, el admin del tenant o un SUPER_ADMIN pueden revocar certificados. La razón es obligatoria y queda registrada como auditoría.",
      },
    ],
  },
  {
    title: "Configuración",
    icon: Settings,
    items: [
      {
        name: "Actualizar perfil de profesor",
        description:
          "Modifica tu nombre y avatar que se muestran en tu panel de profesor.",
        steps: [
          "Ve a la sección Configuración en el menú lateral.",
          "En la sección Perfil, edita tu nombre.",
          "Para cambiar tu avatar, haz clic en Subir foto y selecciona una imagen.",
          "Guarda los cambios.",
        ],
        notes: "El avatar debe subirse desde el formulario de perfil. No se permiten URLs externas por seguridad.",
      },
    ],
  },
];

export default function ProfessorDocsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Base de Conocimientos
        </h1>
        <p className="mt-1 text-text-secondary">
          Documentación de funcionalidades y pasos para gestionar tu academia.
        </p>
      </div>

      {sections.map((section) => {
        const SectionIcon = section.icon;
        return (
          <section key={section.title} className="space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-2">
              <SectionIcon className="h-5 w-5 text-primary-600" />
              <h2 className="font-heading text-lg font-semibold text-text-primary">
                {section.title}
              </h2>
            </div>

            {section.items.map((item) => (
              <div
                key={item.name}
                className="rounded-xl border border-border bg-surface p-5 shadow-sm"
              >
                <h3 className="font-heading text-base font-semibold text-text-primary">
                  {item.name}
                </h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">
                  {item.description}
                </p>

                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                    Pasos
                  </p>
                  <ol className="mt-2 space-y-1.5">
                    {item.steps.map((step, i) => (
                      <li
                        key={i}
                        className="flex gap-2 text-sm text-text-secondary"
                      >
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-100 text-xs font-semibold text-primary-700">
                          {i + 1}
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                <div className="mt-4 rounded-lg bg-surface-secondary px-3 py-2">
                  <p className="text-xs text-text-tertiary">
                    <span className="font-semibold">Notas:</span> {item.notes}
                  </p>
                </div>
              </div>
            ))}
          </section>
        );
      })}

      <div className="rounded-xl border border-primary-200 bg-primary-50 p-5">
        <p className="text-sm font-medium text-primary-800">
          Si requieres asistencia adicional, escribe a{" "}
          <a
            href="mailto:soporte@prol.prosuite.pro"
            className="underline hover:no-underline"
          >
            soporte@prol.prosuite.pro
          </a>
        </p>
      </div>
    </div>
  );
}
