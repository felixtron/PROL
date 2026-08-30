import {
  KnowledgeBase,
  type DocsArticle,
  type DocsCategory,
} from "@/components/knowledge-base";

const categories: DocsCategory[] = [
  {
    id: "tenants",
    label: "Academias",
    icon: "Building2",
    summary: "Alta, estado y datos de cada academia de la plataforma.",
  },
  {
    id: "modulos",
    label: "Módulos",
    icon: "ToggleLeft",
    summary: "Qué funcionalidades tiene habilitada cada academia.",
  },
  {
    id: "usuarios",
    label: "Usuarios",
    icon: "Users",
    summary: "Búsqueda global, roles y altas dentro de una academia.",
  },
  {
    id: "tablas",
    label: "Búsqueda y filtros",
    icon: "BarChart3",
    summary: "Cómo filtrar, buscar y ordenar las tablas del panel.",
  },
  {
    id: "profesores",
    label: "Profesores",
    icon: "GraduationCap",
    summary: "Listado global de profesores y su actividad.",
  },
  {
    id: "ingresos",
    label: "Ingresos",
    icon: "DollarSign",
    summary: "Comisión de la plataforma y reparto por academia.",
  },
  {
    id: "cuenta",
    label: "Cuenta",
    icon: "Settings",
    summary: "Tu perfil de administrador de plataforma.",
  },
];

const articles: DocsArticle[] = [
  // ─── Academias ────────────────────────────────────────────────────
  {
    category: "tenants",
    title: "Consultar las academias registradas",
    description:
      "Cada academia (tenant) agrupa a sus profesores, alumnos, empresas, cursos y su propia configuración. Desde aquí las ves todas.",
    steps: [
      "Ve a Tenants en el menú lateral.",
      "Revisa el listado con nombre, identificador, estado y fecha de alta.",
      "Abre una academia para ver su ficha completa.",
    ],
    notes:
      "Esta sección está reservada al super administrador de la plataforma. Un administrador de academia que entre aquí se redirige a su propio panel.",
    keywords: ["tenant", "academia", "listado", "clientes"],
  },
  {
    category: "tenants",
    title: "Dar de alta una academia",
    description:
      "Al crear un tenant, éste arranca en estado de prueba con siete días de vigencia.",
    steps: [
      "Ve a Tenants y haz clic en Crear tenant.",
      "Escribe el nombre de la academia y su correo de contacto.",
      "Confirma la creación.",
    ],
    notes:
      "El identificador se genera a partir del nombre; si ya existe uno igual, se añade un sufijo numérico. Ten en cuenta que el nombre influye en el diseño de diploma por defecto de los cursos que no lo configuren expresamente.",
    keywords: ["crear tenant", "alta", "academia", "trial", "prueba"],
  },
  {
    category: "tenants",
    title: "Editar los datos y el estado de una academia",
    description:
      "Actualiza nombre, correo de contacto, estado y fin del periodo de prueba.",
    steps: [
      "Abre la ficha de la academia desde Tenants.",
      "Edita los campos que necesites.",
      "Cambia el estado entre prueba, activa o suspendida.",
      "Guarda los cambios.",
    ],
    notes:
      "Pasar una academia a suspendida deshabilita el acceso de todos sus usuarios. Los datos no se borran.",
    keywords: ["editar", "estado", "suspender", "activar", "trial"],
  },
  {
    category: "tenants",
    title: "Configurar el revenue share de una academia",
    description:
      "Define el porcentaje de comisión que la plataforma retiene de cada pago realizado en esa academia.",
    steps: [
      "Abre la ficha de la academia.",
      "Ubica el campo de revenue share.",
      "Escribe el porcentaje, por ejemplo 30 para un 30%.",
      "Guarda los cambios.",
    ],
    notes:
      "El porcentaje aplica tanto a los cobros por Stripe como a los pagos manuales registrados por la academia. Sólo afecta a pagos futuros: los ya procesados no se recalculan.",
    keywords: ["revenue share", "comisión", "porcentaje", "reparto"],
  },

  // ─── Módulos ──────────────────────────────────────────────────────
  {
    category: "modulos",
    title: "Activar o desactivar módulos de una academia",
    description:
      "Los módulos determinan qué secciones ven los profesores y alumnos de cada academia. Se activan uno a uno desde la ficha del tenant.",
    steps: [
      "Abre la ficha de la academia desde Tenants.",
      "Ubica la sección de módulos.",
      "Activa o desactiva cada uno según lo contratado.",
      "Los cambios se aplican de inmediato.",
    ],
    notes:
      "Al desactivar un módulo, sus secciones desaparecen del menú lateral de los usuarios de esa academia, pero los datos existentes se conservan y vuelven a aparecer si se reactiva.",
    keywords: ["toggle", "módulo", "feature", "activar", "habilitar"],
  },
  {
    category: "modulos",
    title: "Qué hace cada módulo",
    description:
      "Estos son los módulos que se pueden habilitar por academia y qué desbloquea cada uno.",
    steps: [
      "IA: generación de cursos con inteligencia artificial, con consumo de créditos.",
      "Talleres: sesiones en vivo con cupo, reservas y recurrencia.",
      "Consultoría Online: citas de asesoría dirigidas a una empresa o a personas concretas, sin curso asociado.",
      "Evaluaciones: diagnósticos por factores, con resultados y reporte en PDF.",
      "Encuestas: cuestionarios con enlace público, sin necesidad de cuenta.",
    ],
    notes:
      "Consultoría Online viene habilitada por defecto en las academias, porque el módulo ya estaba disponible para todas antes de existir el interruptor. Desactívalo expresamente si una academia no debe verlo. Las constancias DC-3 no son un módulo y no aparecen aquí: se activan curso por curso desde el panel de cada academia, y sólo aplican a alumnos inscritos por una empresa con datos fiscales registrados.",
    badge: "nuevo",
    keywords: [
      "consultoría",
      "advisory",
      "talleres",
      "encuestas",
      "evaluaciones",
      "ia",
    ],
  },

  // ─── Usuarios ─────────────────────────────────────────────────────
  {
    category: "usuarios",
    title: "Consultar todos los usuarios de la plataforma",
    description:
      "La sección Usuarios reúne a todas las personas registradas, sin importar a qué academia pertenezcan, con su empresa y su último acceso.",
    steps: [
      "Ve a Usuarios en el menú lateral.",
      "Usa la barra de filtros para acotar el listado.",
      "Revisa nombre, correo, rol, empresa, academia y último acceso.",
    ],
    notes:
      "Es una vista global. Para operaciones del día a día sobre una academia concreta conviene usar el panel de administración de esa academia.",
    badge: "actualizado",
    keywords: ["usuarios", "global", "listado", "empresa", "último acceso"],
  },
  {
    category: "usuarios",
    title: "Cambiar el rol de un usuario",
    description:
      "Desde la propia tabla puedes reasignar el rol de cualquier persona entre Alumno, Profesor, Administrador y Super Administrador.",
    steps: [
      "Ve a Usuarios y localiza a la persona.",
      "Abre el selector de rol en su fila.",
      "Elige el nuevo rol y confirma.",
    ],
    notes:
      "Sólo un super administrador puede otorgar el rol de super administrador. El cambio de rol modifica de inmediato las secciones a las que esa persona tiene acceso.",
    keywords: ["rol", "permisos", "cambiar", "super admin", "profesor"],
  },
  {
    category: "usuarios",
    title: "Crear un usuario dentro de una academia",
    description:
      "Da de alta directamente a una persona en la academia que elijas, asignándole rol y, si aplica, empresa.",
    steps: [
      "Ve a Tenants y abre la academia de destino.",
      "Haz clic en Crear usuario.",
      "Escribe correo y nombre, y elige el rol.",
      "Asigna una empresa si corresponde.",
      "Confirma la creación.",
    ],
    notes:
      "La persona recibe un correo de bienvenida con contraseña temporal y está obligada a cambiarla en su primer inicio de sesión. Sólo un super administrador puede crear usuarios con rol Administrador.",
    keywords: ["crear usuario", "alta", "tenant", "bienvenida", "temporal"],
  },

  // ─── Búsqueda y filtros ───────────────────────────────────────────
  {
    category: "tablas",
    title: "Filtrar y buscar en las tablas",
    description:
      "Usuarios y Profesores comparten una barra de filtros que se resuelve en servidor: la búsqueda cubre nombre, correo, empresa y nombre o identificador de la academia.",
    steps: [
      "Escribe tu término en el buscador y pulsa Enter para aplicarlo.",
      "Acota con los selectores de rol, empresa y academia.",
      "Combina varios filtros: se aplican a la vez.",
      "Usa Limpiar para volver al listado completo.",
    ],
    notes:
      "La búsqueda se envía con Enter, no en cada tecla, para no saturar la base de datos. Al cambiar de academia se descarta la empresa seleccionada, porque pertenecía a la anterior.",
    badge: "nuevo",
    keywords: ["filtro", "buscar", "búsqueda", "rol", "empresa", "limpiar"],
  },
  {
    category: "tablas",
    title: "Ordenar los resultados",
    description:
      "En Usuarios, los encabezados de columna son clicables y ordenan el listado por nombre, correo, rol, empresa, academia o último acceso.",
    steps: [
      "Haz clic en el encabezado de la columna por la que quieras ordenar.",
      "Vuelve a hacer clic para invertir la dirección.",
      "Combina el orden con los filtros que ya tengas aplicados.",
    ],
    notes:
      "Los registros sin valor quedan siempre al final, ordenes como ordenes. El orden y los filtros viajan en la dirección del navegador, así que puedes compartir o guardar una vista concreta como enlace.",
    badge: "nuevo",
    keywords: ["ordenar", "sort", "columna", "clasificar", "url"],
  },
  {
    category: "tablas",
    title: "Por qué las tarjetas de resumen no cambian al filtrar",
    description:
      "Las tarjetas superiores muestran siempre los totales globales de la plataforma, aunque la tabla esté filtrada.",
    steps: [
      "Aplica cualquier filtro sobre la tabla.",
      "Observa que las tarjetas mantienen los totales globales.",
      "Para contar resultados filtrados, usa la propia tabla.",
    ],
    notes:
      "Es deliberado: las tarjetas responden a la pregunta “cuántos hay en total”, y perderían sentido si cambiaran con cada búsqueda.",
    badge: "nuevo",
    keywords: ["tarjetas", "totales", "resumen", "contadores", "kpi"],
  },

  // ─── Profesores ───────────────────────────────────────────────────
  {
    category: "profesores",
    title: "Consultar el listado global de profesores",
    description:
      "Reúne a los profesores de todas las academias, con la academia a la que pertenecen y sus métricas de actividad.",
    steps: [
      "Ve a Profesores en el menú lateral.",
      "Usa la barra de filtros para acotar por academia o buscar por nombre o correo.",
      "Revisa los datos de cada profesor.",
    ],
    notes:
      "Es una vista de consulta. Para modificar a un profesor —cambiar su rol o deshabilitarlo— usa la sección de Usuarios.",
    keywords: ["profesores", "listado", "actividad", "consulta"],
  },

  // ─── Ingresos ─────────────────────────────────────────────────────
  {
    category: "ingresos",
    title: "Revisar los ingresos de la plataforma",
    description:
      "La sección de Ingresos desglosa el dinero movido en la plataforma separando la comisión que retiene PROL de lo que corresponde a cada academia.",
    steps: [
      "Ve a Ingresos en el menú lateral.",
      "Revisa las tarjetas de ingresos totales, comisiones de la plataforma y pagos a creadores.",
      "Consulta la tabla de ingresos por academia: ventas, total, comisión y pago al creador.",
    ],
    notes:
      "La comisión de cada fila depende del revenue share configurado en esa academia. Los profesores ya no ven importes en su panel: la información monetaria la consulta la administración de cada academia y este panel.",
    badge: "actualizado",
    keywords: [
      "ingresos",
      "comisión",
      "revenue",
      "ventas",
      "creadores",
      "reparto",
    ],
  },

  // ─── Cuenta ───────────────────────────────────────────────────────
  {
    category: "cuenta",
    title: "Actualizar tu perfil",
    description:
      "Modifica el nombre y el avatar con los que apareces en el panel de administración.",
    steps: [
      "Ve a Configuración en el menú lateral.",
      "En la sección Perfil, edita tu nombre.",
      "Para cambiar el avatar, haz clic en Subir foto y elige una imagen.",
      "Guarda los cambios.",
    ],
    notes:
      "El avatar se sube desde el formulario; no se admiten URLs externas por seguridad.",
    keywords: ["perfil", "avatar", "nombre", "cuenta"],
  },
];

export default function AdminDocsPage() {
  return (
    <div className="mx-auto max-w-4xl lg:max-w-none">
      <KnowledgeBase
        title="Base de conocimientos"
        subtitle="Busca por palabra clave o filtra por categoría para administrar academias, usuarios e ingresos de la plataforma."
        categories={categories}
        articles={articles}
      />
    </div>
  );
}
