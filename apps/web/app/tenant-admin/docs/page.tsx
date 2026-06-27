import {
  Building2,
  Users,
  GraduationCap,
  Settings,
  Upload,
  CreditCard,
} from "lucide-react";

const sections = [
  {
    title: "Dashboard del Líder",
    icon: Building2,
    items: [
      {
        name: "Consultar el resumen de tu academia",
        description:
          "El dashboard muestra un resumen general de tu academia: usuarios totales, empresas registradas y cursos publicados, junto con acciones rápidas para crear usuarios, importar CSV o crear empresas.",
        steps: [
          "Inicia sesión en el panel de administrador de tu academia.",
          "En la página principal, revisa las tarjetas de estadísticas: Usuarios, Empresas y Cursos publicados.",
          "Usa las acciones rápidas debajo para crear usuarios, importar CSV o crear empresas.",
        ],
        notes: "Los contadores reflejan solo los datos de tu academia (tenant). No ves datos de otras academias.",
      },
    ],
  },
  {
    title: "Gestión de Empresas",
    icon: Building2,
    items: [
      {
        name: "Crear una empresa",
        description:
          "Las empresas agrupan alumnos detipo B2B. Al crear una empresa, puedes asignarle cursos en lote y gestionar sus miembros.",
        steps: [
          "Ve a la sección Empresas en el menú lateral.",
          "Haz clic en Nueva empresa.",
          "Ingresa el nombre de la empresa y, opcionalmente, el email de contacto, límite de plazas (seats) y logotipo.",
          "Confirma la creación.",
        ],
        notes: "El slug se genera automáticamente a partir del nombre. Puedes asignar un líder de empresa que será el contacto principal.",
      },
      {
        name: "Editar datos de una empresa",
        description:
          "Modifica el nombre, email de contacto, límite de plazas, logotipo y configuración de auto-invitaciones de una empresa existente.",
        steps: [
          "Ve a la sección Empresas y haz clic en la empresa.",
          "Haz clic en Editar.",
          "Modifica los campos deseados.",
          "Guarda los cambios.",
        ],
        notes: "Si activas las auto-invitaciones, los miembros existentes podrán invitar a nuevos miembros por correo electrónico.",
      },
      {
        name: "Gestionar miembros de una empresa",
        description:
          "Agrega o elimina miembros de una empresa. Los miembros son alumnos de tu academia que pertenecen a esa organización cliente.",
        steps: [
          "Ve a la sección Empresas y selecciona la empresa.",
          "En la pestaña Miembros, haz clic en Agregar miembro.",
          "Selecciona el alumno que deseas agregar.",
          "Para eliminar un miembro, haz clic en Quitar y confirma.",
        ],
        notes: "Solo puedes agregar alumnos que pertenezcan a tu academia. Si defines un límite de plazas (seats), no podrás agregar más miembros del límite.",
      },
      {
        name: "Asignar cursos a una empresa",
        description:
          "Asigna cursos a una empresa para que todos sus miembros tengan acceso incluido. Cada asignación puede tener una fecha de expiración.",
        steps: [
          "Ve a la sección Empresas y selecciona la empresa.",
          "En la pestaña Cursos asignados, haz clic en Asignar curso.",
          "Selecciona el curso del listado.",
          "Opcionalmente define una fecha de expiración.",
          "Confirma la asignación.",
        ],
        notes: "Los miembros de la empresa verán los cursos asignados en su sección Mi Empresa. Si un curso expira, los alumnos deberán adquirirlo por su cuenta.",
      },
      {
        name: "Eliminar una empresa",
        description:
          "Elimina una empresa de tu academia. Los alumnos que pertenecían a la empresa no se eliminan, pero pierden el acceso a los cursos asignados por la empresa.",
        steps: [
          "Ve a la sección Empresas y selecciona la empresa.",
          "Haz clic en Eliminar empresa.",
          "Confirma la acción.",
        ],
        notes: "Esta acción no se puede deshacer. Los miembros de la empresa pasan a ser alumnos sin empresa asignada.",
      },
    ],
  },
  {
    title: "Gestión de Usuarios",
    icon: Users,
    items: [
      {
        name: "Crear un usuario",
        description:
          "Crea un nuevo usuario dentro de tu academia con rol Alumno, Profesor o Administrador. El usuario recibe un correo de bienvenida con contraseña temporal que debe cambiar en su primer inicio de sesión.",
        steps: [
          "Ve a la sección Usuarios en el menú lateral.",
          "Haz clic en Nuevo usuario.",
          "Ingresa email, nombre y selecciona el rol (Alumno, Profesor o Administrador).",
          "Opcionalmente asigna una empresa.",
          "Confirma la creación.",
        ],
        notes:
          "Solo un SUPER_ADMIN puede crear usuarios con rol Administrador. El nuevo usuario debe cambiar su contraseña en el primer inicio de sesión por seguridad.",
      },
      {
        name: "Editar un usuario",
        description:
          "Modifica el nombre, rol o empresa de un usuario existente en tu academia. También puedes deshabilitar temporalmente un usuario.",
        steps: [
          "Ve a la sección Usuarios.",
          "Ubica al usuario en la tabla y haz clic en las opciones de edición.",
          "Modifica los campos deseados (nombre, rol, empresa).",
          "Para deshabilitar, marca la opción correspondiente.",
          "Guarda los cambios.",
        ],
        notes: "No puedes cambiar tu propio rol ni deshabilitarte a ti mismo. No puedes editar otros usuarios con rol Administrador (solo SUPER_ADMIN puede).",
      },
      {
        name: "Deshabilitar o eliminar un usuario",
        description:
          "Deshabilita temporalmente un usuario para revocar su acceso sin eliminarlo, o elimínalo permanentemente de la academia.",
        steps: [
          "Ve a la sección Usuarios y ubica al usuario.",
          "Para deshabilitar: marca la opción de deshabilitar. El usuario no podrá acceder pero sus datos se conservan.",
          "Para eliminar: haz clic en Eliminar y confirma. Los datos del usuario se eliminan permanentemente.",
        ],
        notes: "No puedes eliminarte a ti mismo. No puedes eliminar usuarios con rol ADMIN si tú no eres SUPER_ADMIN.",
      },
      {
        name: "Importar usuarios desde CSV",
        description:
          "Carga masiva de usuarios mediante un archivo CSV con columnas: email, name, role, companyName. El sistema valida cada fila y reporta errores sin detener el proceso.",
        steps: [
          "Ve a la sección Usuarios.",
          "Haz clic en Importar CSV.",
          "Sube el archivo CSV con el formato requerido (encabezado: email, name, role, companyName).",
          "Revisa el resultado de la importación: usuarios creados, omitidos y errores.",
        ],
        notes:
          "Límite máximo: 500 filas por importación. Si la columna companyName referencia una empresa que no existe, se crea automáticamente. Si el email ya está registrado, la fila se omite.",
      },
      {
        name: "Reenviar correo de bienvenida",
        description:
          "Si un usuario no recibió o perdió su correo de bienvenida con la contraseña temporal, puedes reenviarlo. Se envía un enlace de restablecimiento de contraseña en lugar de la contraseña original.",
        steps: [
          "Ve a la sección Usuarios y ubica al usuario.",
          "Haz clic en Reenviar correo de bienvenida.",
          "El usuario recibirá un correo con un enlace para establecer su contraseña.",
        ],
        notes: "Se envía un enlace de restablecimiento, no la contraseña temporal original. El enlace tiene vigencia limitada.",
      },
      {
        name: "Inscribir alumno a un curso manualmente",
        description:
          "Inscribe directamente a un alumno a un curso sin que pase por el proceso de pago, útil para alumnos becados o asignaciones especiales.",
        steps: [
          "Ve a la sección Usuarios y ubica al alumno.",
          "En las opciones del usuario, selecciona Inscribir a curso.",
          "Selecciona el curso del listado.",
          "Confirma la inscripción.",
        ],
        notes: "La inscripción manual no genera un cobro en Stripe. El alumno obtiene acceso inmediato al curso.",
      },
    ],
  },
  {
    title: "Cursos",
    icon: GraduationCap,
    items: [
      {
        name: "Ver cursos de tu academia",
        description:
          "Consulta todos los cursos creados por los profesores de tu academia, incluyendo su estado, precio, profesor asignado, número de alumnos inscritos e ingresos generados.",
        steps: [
          "Ve a la sección Cursos en el menú lateral.",
          "Revisa la tabla con la información de cada curso.",
          "Filtra o busca si es necesario.",
        ],
        notes: "Esta sección es de solo lectura para los administradores de tenant. Para modificar un curso, el profesor correspondiente debe hacerlo desde su panel.",
      },
      {
        name: "Inscribir alumnos a un curso",
        description:
          "Como administrador de la academia, puedes inscribir manualmente alumnos a cualquier curso de tu academia, incluso sin pago.",
        steps: [
          "Ve a la sección Cursos.",
          "En el menú de acciones del curso (tres puntos), selecciona Inscribir alumno.",
          "Selecciona el alumno o alumnos del listado.",
          "Confirma la inscripción.",
        ],
        notes: "Las inscripciones manuales no generan cobro en Stripe. Úsalas para becas o casos especiales.",
      },
    ],
  },
  {
    title: "Pagos (Stripe Connect)",
    icon: CreditCard,
    items: [
      {
        name: "Conectar tu cuenta de Stripe",
        description:
          "Para recibir pagos de cursos, debes conectar tu cuenta de Stripe Connect. Esto permite que los pagos realizados por alumnos se procesen y depositen directamente en tu cuenta bancaria.",
        steps: [
          "Ve a la sección Configuración en el menú lateral.",
          "En la sección Pagos (Stripe Connect), haz clic en Conectar con Stripe.",
          "Serás redirigido a Stripe para completar el proceso de onboarding.",
          "Una vez completado, tu cuenta aparecerá como conectada.",
        ],
        notes: "Pasos por confirmar. Contacta a soporte@prol.prosuite.pro si necesitas ayuda con el proceso de Stripe Connect.",
      },
    ],
  },
  {
    title: "Configuración",
    icon: Settings,
    items: [
      {
        name: "Actualizar marca de la academia",
        description:
          "Modifica el nombre, logotipo, color primario y color de acento de tu academia. Estos cambios se reflejan en todas las interfaces que ven tus usuarios.",
        steps: [
          "Ve a la sección Configuración en el menú lateral.",
          "En la sección Marca de la academia, edita los campos deseados.",
          "Para cambiar el logotipo, haz clic en Subir logo y selecciona una imagen.",
          "Los colores deben ingresarse en formato hexadecimal (ej. #6366F1).",
          "Guarda los cambios.",
        ],
        notes: "El logotipo debe subirse desde el formulario (no se permiten URLs externas). Los cambios de marca se aplican de inmediato en todas las interfaces.",
      },
      {
        name: "Actualizar perfil de administrador",
        description:
          "Modifica tu nombre y avatar personales que se muestran en el panel de administración.",
        steps: [
          "Ve a la sección Configuración.",
          "En la sección Perfil, edita tu nombre.",
          "Para cambiar tu avatar, haz clic en Subir foto y selecciona una imagen.",
          "Guarda los cambios.",
        ],
        notes: "Los cambios de perfil solo afectan tu cuenta, no la marca de la academia.",
      },
      {
        name: "Cerrar sesión",
        description:
          "Cierra tu sesión en el dispositivo actual. Puedes volver a iniciar sesión en cualquier momento.",
        steps: [
          "Ve a la sección Configuración.",
          "En la sección Sesión, haz clic en Cerrar sesión.",
          "Serás redirigido a la página de inicio de sesión.",
        ],
        notes: "Ninguna.",
      },
    ],
  },
];

export default function TenantAdminDocsPage() {
  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-text-primary">
          Base de Conocimientos
        </h1>
        <p className="mt-1 text-text-secondary">
          Documentación de funcionalidades y pasos para administrar tu academia.
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
