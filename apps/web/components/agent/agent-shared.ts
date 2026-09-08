/**
 * Tipos y constantes compartidos del copiloto en el cliente.
 *
 * Los topes de adjunto están duplicados con los del servidor a propósito: aquí
 * son para avisar antes de subir 6 MB en balde, allí son la barrera de verdad.
 * Si divergen, el que manda es el servidor.
 */

export const MAX_FILES = 3;
export const MAX_FILE_BYTES = 6 * 1024 * 1024;

export const MIME_ACEPTADOS = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/csv",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export interface Adjunto {
  nombre: string;
  mimeType: string;
  /** base64 sin el prefijo `data:`. */
  datos: string;
}

export interface Propuesta {
  id: string;
  toolName: string;
  args: unknown;
}

export interface Mensaje {
  rol: "usuario" | "asistente";
  texto: string;
  adjuntos?: string[];
  propuestas?: Propuesta[];
  contaminado?: boolean;
}

export interface ResumenConversacion {
  id: string;
  title: string;
  updatedAt: string;
  messageCount: number;
}

/**
 * Ejemplos de la pantalla de bienvenida. Son lo primero que lee alguien que
 * abre el panel sin saber qué pedir, así que van en el lenguaje del trabajo
 * —evidencias, manuales, cursos— y no en el de la herramienta.
 */
export const EJEMPLOS = [
  {
    texto: "¿Qué evidencias tengo pendientes de revisar?",
    pista: "Consulta la cola de tus empresas y te dice qué va con retraso",
  },
  {
    texto: "Ayúdame a armar el temario de un curso de seguridad e higiene",
    pista: "Propone módulos y lecciones que puedes editar antes de crearlos",
  },
  {
    texto: "Resume esta evidencia y dime si le falta algo",
    pista: "Lee las notas y la bitácora, y señala lo que está incompleto",
  },
  {
    texto: "Con este documento prepárame un manual de procedimiento",
    pista: "Adjunta un PDF o un texto y trabaja a partir de él",
  },
] as const;

/** Lee el archivo a base64 sin el prefijo `data:`. */
export async function fileToAdjunto(file: File): Promise<Adjunto> {
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  // En trozos: `String.fromCharCode(...bytes)` con un PDF de megas desborda
  // la pila de argumentos y revienta la pestaña.
  let binario = "";
  const TROZO = 0x8000;
  for (let i = 0; i < bytes.length; i += TROZO) {
    binario += String.fromCharCode(...bytes.subarray(i, i + TROZO));
  }
  return {
    nombre: file.name,
    mimeType: file.type || "application/octet-stream",
    datos: btoa(binario),
  };
}
