/**
 * Scopes de Google que pide PROL. Vive en su propio módulo (sin imports de
 * servidor) para que el componente cliente que dispara `linkSocial` y el
 * cliente de Calendar del servidor compartan exactamente la misma cadena.
 *
 * `calendar.events` es un scope SENSIBLE: en producción Google exige
 * verificar la app (video del flujo, política de privacidad, dominio
 * verificado). Sin verificar funciona en modo Testing con hasta 100 usuarios,
 * mostrando la pantalla de "app no verificada".
 */
export const GOOGLE_CALENDAR_SCOPE =
  "https://www.googleapis.com/auth/calendar.events";
