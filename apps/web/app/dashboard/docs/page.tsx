import {
  BookOpen,
  Play,
  ClipboardCheck,
  FileText,
  Building2,
  Calendar,
  Award,
  Bell,
  CreditCard,
  Settings,
} from "lucide-react";

const sections = [
  {
    title: "Mis Cursos",
    icon: BookOpen,
    items: [
      {
        name: "Inscribirse a un curso",
        description:
          "Inscríbete en cursos disponibles en el catálogo. Si el curso es gratis o está cubierto por tu empresa, la inscripción es inmediata. Si es de pago, se redirige al proceso de compra.",
        steps: [
          "Ve a la sección Mis Cursos en el menú lateral.",
          "Navega el catálogo de cursos disponibles.",
          "Haz clic en el curso que te interesa.",
          "Si es gratis o está cubierto por tu empresa, confirma tu inscripción.",
          "Si es de pago, selecciona el método de pago (tarjeta, OXXO o transferencia SPEI) y completa la compra.",
        ],
        notes:
          "Si ya estás inscrito en un curso, no puedes inscribirte de nuevo. Recibirás un correo de confirmación al inscribirte exitosamente.",
      },
      {
        name: "Seguir el progreso de un curso",
        description:
          "Marca las lecciones como completadas conforme avanzas en el curso. El sistema calcula tu porcentaje de avance automáticamente.",
        steps: [
          "Ve a Mis Cursos y selecciona el curso.",
          "Avanza por cada lección en orden.",
          "Las lecciones de video se marcan como completadas al finalizar la reproducción.",
          "Las lecciones de texto se marcan manualmente como completadas.",
          "Las lecciones de tipo Quiz y Tarea se completan al aprobar o entregar, respectivamente.",
        ],
        notes:
          "No puedes marcar manualmente como completadas las lecciones de tipo Quiz o Tarea; éstas se completan automáticamente al aprobar el quiz o entregar la tarea.",
      },
      {
        name: "Reanudar video",
        description:
          "Tu posición en el video se guarda automáticamente. Al regresar a una lección, el video continúa donde lo dejaste.",
        steps: [
          "Abre la lección de video donde habías pausado.",
          "El video se reanudará automáticamente en la última posición guardada.",
        ],
        notes: "Ninguna.",
      },
    ],
  },
  {
    title: "Quizzes y Exámenes",
    icon: ClipboardCheck,
    items: [
      {
        name: "Responder un quiz",
        description:
          "Completa los quizzes dentro de tus cursos. Cada quiz tiene un número máximo de intentos y un puntaje mínimo para aprobar.",
        steps: [
          "En tu curso, ve a la lección de tipo Quiz.",
          "Lee cada pregunta y selecciona tu respuesta.",
          "Envía todas las respuestas al terminar.",
          "Revisa tus resultados: puntaje obtenido y si aprobaste.",
          "Si no aprobaste y tienes intentos restantes, puedes volver a intentarlo.",
        ],
        notes: "El número de intentos es limitado. Verifica tus respuestas antes de enviar.",
      },
      {
        name: "Presentar el examen final",
        description:
          "El examen final es un quiz especial que requiere al menos 80% para aprobar. Antes de acceder, debes haber aprobado todos los quizzes intermedios del curso con al menos 80%.",
        steps: [
          "Completa y aprueba todos los quizzes de los módulos del curso con al menos 80%.",
          "Cuando habiliten el examen final, ve a la lección correspondiente.",
          "Responde todas las preguntas del examen.",
          "Envía tus respuestas.",
          "Si apruebas con 80% o más, el curso se marca como completado y se emite tu certificado automáticamente.",
        ],
        notes:
          "Si no apruebas, puedes volver a intentar mientras tengas intentos disponibles. Al aprobar el examen final, se emite un certificado que podrás consultar en la sección de Certificados.",
      },
    ],
  },
  {
    title: "Tareas",
    icon: FileText,
    items: [
      {
        name: "Entregar una tarea",
        description:
          "Sube la entrega de tus asignaciones en lecciones de tipo Tarea. Tu profesor podrá calificarla posteriormente.",
        steps: [
          "En tu curso, ve a la lección de tipo Tarea.",
          "Lee las instrucciones de la tarea.",
          "Sube tu archivo o ingresa tu respuesta según las indicaciones.",
          "Confirma la entrega.",
        ],
        notes: "Una vez entregada, la tarea se marca como completada automáticamente. Consulta la calificación con tu profesor.",
      },
    ],
  },
  {
    title: "Paradas Interactivas en Videos",
    icon: Play,
    items: [
      {
        name: "Responder paradas interactivas",
        description:
          "Durante la reproducción de un video, pueden aparecer paradas interactivas que pausan el video y te presentan una pregunta, reflexión, ejercicio o encuesta.",
        steps: [
          "Reproduce el video de la lección.",
          "Al alcanzar una parada interactiva, el video se pausará.",
          "Responde a la parada según su tipo:",
          "  - Pregunta: selecciona la opción correcta y recibe feedback.",
          "  - Reflexión: escribe tu reflexión en texto libre.",
          "  - Ejercicio: marca como completado.",
          "  - Encuesta: selecciona tu opción de voto.",
          "Continúa la reproducción del video.",
        ],
        notes: "Las paradas obligatorias deben responderse para continuar. Las opcionales se pueden omitir.",
      },
    ],
  },
  {
    title: "Lecciones Multiformato",
    icon: Play,
    items: [
      {
        name: "Completar bloques en lecciones multiformato",
        description:
          "Algunas lecciones combinan varios bloques de contenido (video, PDF, texto, quiz). Debes completar cada bloque en orden para avanzar.",
        steps: [
          "Abre la lección multiformato.",
          "Completa cada bloque en orden: mira el video, lee el texto, descarga el PDF, responde el quiz.",
          "Al completar todos los bloques, la lección se marca como completada automáticamente.",
        ],
        notes: "Debes completar todos los bloques para que la lección se marque como completada.",
      },
    ],
  },
  {
    title: "Mi Empresa",
    icon: Building2,
    items: [
      {
        name: "Ver mi empresa y cursos asignados",
        description:
          "Si perteneces a una empresa, puedes ver los cursos que tu empresa tiene asignados para ti, incluyendo la fecha de vigencia de cada asignación.",
        steps: [
          "Ve a la sección Mi Empresa en el menú lateral.",
          "Revisa la información de tu empresa.",
          "Consulta los cursos asignados y su fecha de vigencia.",
          "Los cursos activos están disponibles directamente para inscripción.",
        ],
        notes:
          "Si un curso asignado a tu empresa tiene fecha de expiración y ya expiró, deberás adquirirlo por tu cuenta para inscribirte.",
      },
    ],
  },
  {
    title: "Sesiones y Talleres",
    icon: Calendar,
    items: [
      {
        name: "Inscribirse a un taller",
        description:
          "Reserva tu lugar en talleres y sesiones en vivo disponibles. El sistema previene inscripciones duplicadas.",
        steps: [
          "Ve a la sección Sesiones y Talleres en el menú lateral.",
          "Revisa los talleres disponibles con fecha, hora y cupo.",
          "Haz clic en Reservar lugar en el taller que te interese.",
          "Confirma tu inscripción.",
        ],
        notes: "Si el taller ya no tiene lugares disponibles, no podrás inscribirte. El sistema protege contra inscripciones duplicadas.",
      },
    ],
  },
  {
    title: "Certificados",
    icon: Award,
    items: [
      {
        name: "Ver mis certificados",
        description:
          "Consulta los certificados obtenidos al completar cursos. Cada certificado tiene un folio único que puede verificarse públicamente.",
        steps: [
          "Ve a la sección Certificados en el menú lateral.",
          "Revisa la lista de certificados obtenidos.",
          "Para compartir o verificar un certificado, usa el enlace de verificación con el folio.",
        ],
        notes: "Los certificados se emiten automáticamente al completar un curso (ya sea al terminar todas las lecciones o al aprobar el examen final con 80% o más).",
      },
      {
        name: "Solicitar certificado de curso completado",
        description:
          "Si completaste un curso y no recibiste tu certificado automáticamente, puedes solicitarlo desde la sección de certificados.",
        steps: [
          "Ve a la sección Certificados.",
          "Busca el curso completado en tu lista.",
          "Haz clic en Emitir certificado.",
          "El certificado se generará con un folio único.",
        ],
        notes: "Solo puedes emitir certificados para cursos donde tu inscripción esté marcada como COMPLETED.",
      },
    ],
  },
  {
    title: "Evaluaciones",
    icon: ClipboardCheck,
    items: [
      {
        name: "Responder evaluaciones asignadas",
        description:
          "Si tu profesor te asignó una evaluación con factores KPI, podrás verla y responderla desde tu panel.",
        steps: [
          "Ve al curso donde tienes una evaluación pendiente.",
          "Haz clic en la evaluación asignada.",
          "Responde las preguntas de cada factor KPI.",
          "Envía tus respuestas.",
        ],
        notes: "Esta funcionalidad requiere que el administrador de tu academia haya activado el toggle de Evaluaciones.",
      },
    ],
  },
  {
    title: "Notificaciones",
    icon: Bell,
    items: [
      {
        name: "Revisar notificaciones",
        description:
          "Consulta las notificaciones de inscripción, certificados y otros eventos del sistema. El ícono de campana en la barra lateral muestra el conteo de no leídas.",
        steps: [
          "Haz clic en el ícono de campana en la barra superior o ve a Notificaciones.",
          "Revisa las notificaciones pendientes.",
          "Marca como leídas individualmente o todas a la vez.",
          "Elimina las notificaciones que ya no necesites.",
        ],
        notes: "Las notificaciones incluyen enlaces directos al curso o certificado relacionado.",
      },
    ],
  },
  {
    title: "Pagos",
    icon: CreditCard,
    items: [
      {
        name: "Pagar un curso",
        description:
          "Los cursos de pago se adquieren mediante Stripe con tres métodos disponibles: tarjeta de crédito/débito, OXXO y transferencia SPEI.",
        steps: [
          "Ve al curso que deseas adquirir.",
          "Haz clic en Inscribirme o Comprar.",
          "Selecciona tu método de pago:",
          "  - Tarjeta: pago inmediato con confirmación en pantalla.",
          "  - OXXO: se genera un voucher con vigencia de 3 días para pagar en tienda.",
          "  - SPEI: se muestran las instrucciones de transferencia bancaria.",
          "Completa el proceso de pago.",
          "Al confirmarse el pago, se crea tu inscripción automáticamente.",
        ],
        notes:
          "Los pagos con OXXO y SPEI son asíncronos: la inscripción se crea hasta que se confirma el pago. Los pagos con tarjeta son inmediatos. El correo de confirmación se envía automáticamente.",
      },
    ],
  },
  {
    title: "Configuración",
    icon: Settings,
    items: [
      {
        name: "Actualizar perfil",
        description:
          "Modifica tu nombre y avatar que se muestran en tu panel de alumno.",
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

export default function StudentDocsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Base de Conocimientos
        </h1>
        <p className="mt-1 text-text-secondary">
          Documentación de funcionalidades y pasos para aprovechar tu experiencia en PROL.
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
