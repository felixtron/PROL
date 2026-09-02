/**
 * Validación de los campos con formato oficial del DC-3.
 *
 * Vive aparte de los server actions porque la usan también los
 * formularios cliente: el usuario tiene que ver "CURP inválida" mientras
 * escribe, no después de un round-trip. El servidor la vuelve a aplicar —
 * la del cliente es comodidad, no la defensa.
 */

/**
 * CURP: 18 caracteres. La estructura completa (y no un `.{18}`) importa
 * porque un CURP mal capturado invalida la constancia ante la STPS y el
 * error sólo se descubre cuando el trabajador la necesita.
 *
 *   AAAA      inicial + primera vocal interna del apellido paterno,
 *             inicial del materno, inicial del nombre
 *   AAMMDD    fecha de nacimiento
 *   H|M       sexo
 *   EE        entidad federativa (catálogo cerrado de RENAPO)
 *   BBB       consonantes internas
 *   X         homoclave (dígito para nacidos antes del 2000, letra después)
 *   D         dígito verificador
 */
const CURP_STATES =
  "AS|BC|BS|CC|CH|CL|CM|CS|DF|DG|GR|GT|HG|JC|MC|MN|MS|NE|NL|OC|PL|QR|QT|SL|SP|SR|TC|TL|TS|VZ|YN|ZS";

export const CURP_REGEX = new RegExp(
  `^[A-Z][AEIOUX][A-Z]{2}\\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\\d|3[01])[HM](?:${CURP_STATES})[B-DF-HJ-NP-TV-Z]{3}[A-Z\\d]\\d$`
);

/**
 * RFC con homoclave. Persona moral = 3 letras + fecha + homoclave (12);
 * persona física = 4 letras + fecha + homoclave (13). El formato acepta
 * ambas porque el patrón puede ser una persona física ("En caso de
 * persona física, anotar apellido paterno, materno y nombre(s)").
 */
export const RFC_REGEX =
  /^[A-ZÑ&]{3,4}\d{2}(?:0[1-9]|1[0-2])(?:0[1-9]|[12]\d|3[01])[A-Z\d]{2}[A\d]$/;

/** Normaliza a como se imprime: mayúsculas, sin espacios ni guiones. */
export function normalizeCurp(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

/** Igual que el CURP: el RFC se imprime en mayúsculas y sin separadores. */
export function normalizeRfc(value: string): string {
  return value.toUpperCase().replace(/[\s-]/g, "");
}

export function isValidCurp(value: string): boolean {
  return CURP_REGEX.test(normalizeCurp(value));
}

export function isValidRfc(value: string): boolean {
  return RFC_REGEX.test(normalizeRfc(value));
}

/**
 * Leyenda que se muestra al trabajador y al administrador de cursos de la
 * empresa antes de confirmar sus datos. Es literal y vive en un solo
 * sitio para que no se reescriba distinta en cada formulario.
 */
export const DC3_RESPONSIBILITY_NOTICE =
  "Los datos capturados serán utilizados para la emisión del formato DC-3. " +
  "Es responsabilidad del usuario y del administrador de cursos de la " +
  "empresa verificar que sean correctos antes de imprimir, ya que después " +
  "de la emisión cualquier corrección deberá ser solicitada al administrador.";

/**
 * Advertencia posterior a la impresión. Se muestra una vez emitida la
 * constancia, cuando ya no hay vuelta atrás sin gestión administrativa.
 */
export const DC3_POST_PRINT_NOTICE =
  "Esta constancia ya fue emitida. Los datos impresos son responsabilidad " +
  "del usuario y del administrador de cursos de la empresa; cualquier " +
  "corrección posterior requiere gestión administrativa con el " +
  "administrador de la plataforma.";

/**
 * Instrucción de entrada para el administrador de cursos de una empresa.
 *
 * Es lo primero que ve al abrir el módulo, y no un texto de ayuda
 * escondido, porque su parte del formato —patrón y fechas de ejecución—
 * bloquea la emisión de TODOS los participantes de su empresa, no sólo la
 * suya. Sin este aviso, la persona que puede desatascarlas es justo la
 * que no sabe que le toca.
 */
export const DC3_COMPANY_ADMIN_NOTICE =
  "Como responsable de la administración de cursos de tu empresa, debes " +
  "capturar correctamente los datos del patrón y las fechas de ejecución " +
  "del curso para poder emitir las constancias DC-3 de todos los " +
  "participantes.";

/**
 * Nota del campo "representante de los trabajadores" (nota 5 del formato
 * oficial). Se muestra junto al campo, no como pie de página: es la
 * respuesta a "¿esto lo tengo que llenar?" en el momento en que se
 * pregunta.
 */
export const DC3_WORKERS_REP_NOTE =
  "Solo aplica para empresas con más de 50 trabajadores.";

/**
 * Lo que se imprime en el formato cuando un campo opcional se dejó vacío
 * a propósito. Un hueco en blanco se lee como un olvido; "No aplica" dice
 * que la decisión fue deliberada.
 */
export const DC3_NOT_APPLICABLE = "No aplica";
