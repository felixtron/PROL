import { BookOpen, Building2, Users, DollarSign, Settings, ToggleLeft } from "lucide-react";

const sections = [
  {
    title: "Gestión de Tenants",
    icon: Building2,
    items: [
      {
        name: "Ver y listar tenants",
        description:
          "Consulta todos los tenants (academias) registrados en la plataforma. Cada tenant agrupa profesores, alumnos, cursos y configuración propia.",
        steps: [
          "Ve a la sección Tenants en el menú lateral.",
          "Revisa la lista de academias registradas con su nombre, slug, estado y fecha de creación.",
          "Haz clic en un tenant para ver su detalle.",
        ],
        notes: "Solo los roles ADMIN y SUPER_ADMIN tienen acceso a esta sección.",
      },
      {
        name: "Crear un nuevo tenant",
        description:
          "Registra una nueva academia en la plataforma. Al crearlo, el tenant inicia en estado TRIAL con 7 días de prueba.",
        steps: [
          "Ve a la sección Tenants en el menú lateral.",
          "Haz clic en el botón Crear tenant.",
          "Completa el nombre de la academia y el correo de contacto.",
          "Confirma la creación.",
        ],
        notes: "El slug se genera automáticamente a partir del nombre. Si ya existe un slug igual, se agrega un sufijo numérico.",
      },
      {
        name: "Actualizar datos de un tenant",
        description:
          "Modifica el nombre, correo de contacto, estado (TRIAL/ACTIVE/SUSPENDED) y fecha de fin de prueba de un tenant.",
        steps: [
          "Ve a la sección Tenants y haz clic en el tenant que deseas modificar.",
          "Edita los campos que necesites actualizar.",
          "Guarda los cambios.",
        ],
        notes: "Cambiar el estado a SUSPENDED deshabilita el acceso para todos los usuarios de ese tenant.",
      },
      {
        name: "Activar o desactivar features de un tenant",
        description:
          "Controla qué funcionalidades están disponibles para un tenant específico mediante toggles. Las features disponibles son: IA para cursos, Talleres, Evaluaciones y Encuestas.",
        steps: [
          "Ve a la sección Tenants y haz clic en el tenant objetivo.",
          "Ubica la sección Feature Toggles.",
          "Activa o desactiva cada toggle según lo requerido.",
          "Los cambios se aplican de inmediato.",
        ],
        notes:
          "Al desactivar una feature, las secciones correspondientes desaparecen del menú lateral de los profesores y alumnos de ese tenant. Los datos existentes no se eliminan.",
      },
      {
        name: "Configurar revenue share",
        description:
          "Define el porcentaje de comisión que PROL retiene de cada pago realizado en un tenant. Este porcentaje se aplica tanto a pagos por Stripe como a pagos manuales registrados por el admin del tenant.",
        steps: [
          "Ve a la sección Tenants y selecciona el tenant.",
          "Ubica el campo Revenue Share.",
          "Ingresa el porcentaje deseado (ej. 30 para 30%).",
          "Guarda los cambios.",
        ],
        notes:
          "El valor por defecto se establece al crear el tenant. Este porcentaje afecta todos los pagos futuros; los pagos ya procesados no se recalculan.",
      },
    ],
  },
  {
    title: "Gestión de Usuarios",
    icon: Users,
    items: [
      {
        name: "Ver todos los usuarios de la plataforma",
        description:
          "Consulta la lista completa de usuarios registrados en PROL, independientemente del tenant al que pertenezcan.",
        steps: [
          "Ve a la sección Usuarios en el menú lateral.",
          "Filtra o busca usuarios por nombre, email o rol.",
          "Haz clic en un usuario para ver su detalle.",
        ],
        notes: "Esta vista es global. Para gestionar usuarios de un tenant específico, usa el panel de Admin de Tenant.",
      },
      {
        name: "Cambiar el rol de un usuario",
        description:
          "Modifica el rol de cualquier usuario de la plataforma. Los roles disponibles son: STUDENT, PROFESSOR, ADMIN y SUPER_ADMIN.",
        steps: [
          "Ve a la sección Usuarios.",
          "Ubica al usuario y haz clic en la opción de cambiar rol.",
          "Selecciona el nuevo rol del menú desplegable.",
          "Confirma el cambio.",
        ],
        notes:
          "Solo SUPER_ADMIN puede asignar el rol SUPER_ADMIN. Cambiar el rol de un usuario puede modificar las secciones a las que tiene acceso inmediatamente.",
      },
      {
        name: "Crear un usuario en un tenant específico",
        description:
          "Crea directamente un usuario dentro de un tenant determinado, asignando rol, empresa opcional y enviando correo de bienvenida con contraseña temporal.",
        steps: [
          "Ve a la sección Tenants y selecciona el tenant destino.",
          "Haz clic en Crear usuario.",
          "Ingresa email, nombre y rol del nuevo usuario.",
          "Opcionalmente asigna una empresa.",
          "Confirma la creación.",
        ],
        notes:
          "El usuario recibirá un correo con contraseña temporal y deberá cambiarla en su primer inicio de sesión. Solo SUPER_ADMIN puede crear usuarios con rol ADMIN.",
      },
    ],
  },
  {
    title: "Ingresos",
    icon: DollarSign,
    items: [
      {
        name: "Consultar ingresos de la plataforma",
        description:
          "Revisa el resumen de ingresos globales de PROL, incluyendo la comisión (revenue share) retenida por cada pago de curso.",
        steps: [
          "Ve a la sección Ingresos en el menú lateral.",
          "Revisa el desglose por periodo, tenant y método de pago.",
        ],
        notes:
          "Los ingresos mostrados corresponden a la comisión de PROL, no al total cobrado al alumno. El admin puede filtrar por rango de fechas.",
      },
    ],
  },
  {
    title: "Profesores",
    icon: Settings,
    items: [
      {
        name: "Ver y gestionar profesores",
        description:
          "Consulta la lista de profesores registrados en la plataforma, su tenant asociado y métricas de actividad.",
        steps: [
          "Ve a la sección Profesores en el menú lateral.",
          "Revisa la lista de profesores con sus datos.",
          "Filtra por tenant o estado si es necesario.",
        ],
        notes: "Esta sección es de solo lectura. Para modificar profesores, usa la gestión de usuarios.",
      },
    ],
  },
  {
    title: "Configuración",
    icon: Settings,
    items: [
      {
        name: "Actualizar perfil de administrador",
        description:
          "Modifica tu nombre y avatar que se muestran en el panel de administración.",
        steps: [
          "Ve a la sección Configuración en el menú lateral.",
          "En la sección Perfil, edita tu nombre.",
          "Para cambiar tu avatar, haz clic en Subir foto y selecciona una imagen.",
          "Guarda los cambios.",
        ],
        notes:
          "El avatar debe subirse desde el formulario de perfil. No se permiten URLs externas por seguridad.",
      },
    ],
  },
];

export default function AdminDocsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Base de Conocimientos
        </h1>
        <p className="mt-1 text-text-secondary">
          Documentación de funcionalidades y pasos para administrar PROL.
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
