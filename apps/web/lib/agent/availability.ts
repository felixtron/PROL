/**
 * ¿Está el copiloto realmente disponible en esta instancia?
 *
 * Son dos condiciones, y las dos tienen que cumplirse:
 *
 *   - el tenant lo tiene contratado (`tenant.aiEnabled`), y
 *   - la instancia tiene clave de Gemini configurada.
 *
 * La segunda existe porque desplegar el código y configurar la clave son dos
 * actos distintos que pueden ir separados en el tiempo. Sin esta comprobación,
 * el primer despliegue le enseña a los usuarios de un tenant con la IA
 * contratada un botón que falla en cada intento — que es peor que no tenerlo.
 *
 * Sólo lo importan layouts de servidor. `GEMINI_API_KEY` no lleva prefijo
 * público, así que si alguien lo importara desde un componente cliente la
 * variable saldría vacía y el botón desaparecería — falla cerrado, no abierto.
 */
export function isAgentAvailable(tenantAiEnabled: boolean | undefined): boolean {
  return Boolean(tenantAiEnabled) && Boolean(process.env.GEMINI_API_KEY);
}
