/**
 * Catálogos oficiales del formato DC-3, transcritos del reverso de la
 * plantilla de la STPS.
 *
 * Sin imports de servidor a propósito: los consumen los `<select>` de los
 * tres formularios (trabajador, líder y administrador), que son
 * componentes cliente.
 *
 * Las claves son las que se imprimen en el documento. NO se renumeran ni
 * se "corrigen": un DC-3 emitido con la clave 04.4 tiene que seguir
 * significando Informática dentro de cinco años.
 */

export interface Dc3CatalogEntry {
  code: string;
  label: string;
}

export interface Dc3OccupationArea extends Dc3CatalogEntry {
  subareas: Dc3CatalogEntry[];
}

/**
 * Áreas y subáreas del Catálogo Nacional de Ocupaciones (nota 1 del
 * formato). El campo "Ocupación específica" se llena con la clave de la
 * subárea; las áreas de primer nivel se ofrecen sólo como agrupador
 * visual, salvo que el usuario no encuentre subárea aplicable.
 */
export const DC3_OCCUPATION_AREAS: Dc3OccupationArea[] = [
  {
    code: "01",
    label: "Cultivo, crianza y aprovechamiento",
    subareas: [
      { code: "01.1", label: "Agricultura y silvicultura" },
      { code: "01.2", label: "Ganadería" },
      { code: "01.3", label: "Pesca y acuacultura" },
    ],
  },
  {
    code: "02",
    label: "Extracción y suministro",
    subareas: [
      { code: "02.1", label: "Exploración" },
      { code: "02.2", label: "Extracción" },
      { code: "02.3", label: "Refinación y beneficio" },
      { code: "02.4", label: "Provisión de energía" },
      { code: "02.5", label: "Provisión de agua" },
    ],
  },
  {
    code: "03",
    label: "Construcción",
    subareas: [
      { code: "03.1", label: "Planeación y dirección de obras" },
      { code: "03.2", label: "Edificación y urbanización" },
      { code: "03.3", label: "Acabado" },
      { code: "03.4", label: "Instalación y mantenimiento" },
    ],
  },
  {
    code: "04",
    label: "Tecnología",
    subareas: [
      { code: "04.1", label: "Mecánica" },
      { code: "04.2", label: "Electricidad" },
      { code: "04.3", label: "Electrónica" },
      { code: "04.4", label: "Informática" },
      { code: "04.5", label: "Telecomunicaciones" },
      { code: "04.6", label: "Procesos industriales" },
    ],
  },
  {
    code: "05",
    label: "Procesamiento y fabricación",
    subareas: [
      { code: "05.1", label: "Minerales no metálicos" },
      { code: "05.2", label: "Metales" },
      { code: "05.3", label: "Alimentos y bebidas" },
      { code: "05.4", label: "Textiles y prendas de vestir" },
      { code: "05.5", label: "Materia orgánica" },
      { code: "05.6", label: "Productos químicos" },
      { code: "05.7", label: "Productos metálicos y de hule y plástico" },
      { code: "05.8", label: "Productos eléctricos y electrónicos" },
      { code: "05.9", label: "Productos impresos" },
    ],
  },
  {
    code: "06",
    label: "Transporte",
    subareas: [
      { code: "06.1", label: "Ferroviario" },
      { code: "06.2", label: "Autotransporte" },
      { code: "06.3", label: "Aéreo" },
      { code: "06.4", label: "Marítimo y fluvial" },
      { code: "06.5", label: "Servicios de apoyo" },
    ],
  },
  {
    code: "07",
    label: "Provisión de bienes y servicios",
    subareas: [
      { code: "07.1", label: "Comercio" },
      { code: "07.2", label: "Alimentación y hospedaje" },
      { code: "07.3", label: "Turismo" },
      { code: "07.4", label: "Deporte y esparcimiento" },
      { code: "07.5", label: "Servicios personales" },
      {
        code: "07.6",
        label: "Reparación de artículos de uso doméstico y personal",
      },
      { code: "07.7", label: "Limpieza" },
      { code: "07.8", label: "Servicio postal y mensajería" },
    ],
  },
  {
    code: "08",
    label: "Gestión y soporte administrativo",
    subareas: [
      { code: "08.1", label: "Bolsa, banca y seguros" },
      { code: "08.2", label: "Administración" },
      { code: "08.3", label: "Servicios legales" },
    ],
  },
  {
    code: "09",
    label: "Salud y protección social",
    subareas: [
      { code: "09.1", label: "Servicios médicos" },
      { code: "09.2", label: "Inspección sanitaria y del medio ambiente" },
      { code: "09.3", label: "Seguridad social" },
      { code: "09.4", label: "Protección de bienes y/o personas" },
    ],
  },
  {
    code: "10",
    label: "Comunicación",
    subareas: [
      { code: "10.1", label: "Publicación" },
      { code: "10.2", label: "Radio, cine, televisión y teatro" },
      { code: "10.3", label: "Interpretación artística" },
      { code: "10.4", label: "Traducción e interpretación lingüística" },
      { code: "10.5", label: "Publicidad, propaganda y relaciones públicas" },
    ],
  },
  {
    code: "11",
    label: "Desarrollo y extensión del conocimiento",
    subareas: [
      { code: "11.1", label: "Investigación" },
      { code: "11.2", label: "Enseñanza" },
      { code: "11.3", label: "Difusión cultural" },
    ],
  },
];

/**
 * Áreas temáticas de los cursos (nota 2 del formato). Son claves de
 * cuatro dígitos, sin subniveles.
 */
export const DC3_THEMATIC_AREAS: Dc3CatalogEntry[] = [
  { code: "1000", label: "Producción general" },
  { code: "2000", label: "Servicios" },
  { code: "3000", label: "Administración, contabilidad y economía" },
  { code: "4000", label: "Comercialización" },
  { code: "5000", label: "Mantenimiento y reparación" },
  { code: "6000", label: "Seguridad" },
  { code: "7000", label: "Desarrollo personal y familiar" },
  { code: "8000", label: "Uso de tecnologías de la información y comunicación" },
  { code: "9000", label: "Participación Social" },
];

/**
 * Plano: áreas y subáreas ocupacionales en una sola lista, en el orden en
 * que aparecen en el formato. Útil para `<select>` y para resolver una
 * clave a su denominación.
 */
export const DC3_OCCUPATIONS: Dc3CatalogEntry[] = DC3_OCCUPATION_AREAS.flatMap(
  (area) => [
    { code: area.code, label: area.label },
    ...area.subareas,
  ]
);

const OCCUPATION_BY_CODE = new Map(
  DC3_OCCUPATIONS.map((o) => [o.code, o.label])
);
const THEMATIC_BY_CODE = new Map(
  DC3_THEMATIC_AREAS.map((t) => [t.code, t.label])
);

export function isDc3OccupationCode(value: unknown): value is string {
  return typeof value === "string" && OCCUPATION_BY_CODE.has(value);
}

export function isDc3ThematicAreaCode(value: unknown): value is string {
  return typeof value === "string" && THEMATIC_BY_CODE.has(value);
}

/** Denominación de una clave de ocupación, o null si no está en el catálogo. */
export function dc3OccupationLabel(code: string | null | undefined) {
  return (code && OCCUPATION_BY_CODE.get(code)) || null;
}

/** Denominación de un área temática, o null si no está en el catálogo. */
export function dc3ThematicAreaLabel(code: string | null | undefined) {
  return (code && THEMATIC_BY_CODE.get(code)) || null;
}
