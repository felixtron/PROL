/**
 * Catálogo único de herramientas del agente.
 *
 * Importar este módulo valida todas las definiciones: nombres, descripciones
 * y esquemas de parámetros. Si alguna se sale del subconjunto permitido, el
 * arranque falla aquí y no en una conversación con un usuario delante.
 */

import { createRegistry } from "@prol/ai";
import { evidenceTools } from "./evidence";

export const agentRegistry = createRegistry([
  ...evidenceTools,
  // Los demás módulos —encuestas, manuales, consultoría, DC3, cursos— se
  // añaden aquí conforme se vayan envolviendo.
]);
