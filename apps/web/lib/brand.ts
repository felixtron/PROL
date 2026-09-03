/**
 * Identidad de la instancia.
 *
 * Una misma imagen sirve a varias instalaciones —Ibiza bajo su dominio, PROL
 * bajo el suyo— y lo único que las distingue es el entorno. Todo lo que el
 * usuario ve escrito con el nombre de la plataforma sale de aquí, nunca de un
 * literal repartido por las pantallas.
 *
 * Los valores por defecto son los de PROL a propósito: desplegar esta imagen
 * sin configurar nada tiene que dejar el comportamiento exactamente como
 * estaba. Esa propiedad es la que permite separar el riesgo del código del
 * riesgo del cambio de dominio, que ocurre después y en otra ventana.
 *
 * Son variables de servidor sin prefijo `NEXT_PUBLIC_`: se leen en runtime y
 * NO se inlinan en el bundle del cliente. Quien las consuma desde una ruta
 * que Next prerenderiza tiene que forzar render dinámico (ver
 * `app/layout.tsx`), o el valor se hornearía en la imagen y las dos
 * instancias compartirían el mismo nombre.
 */
export const BRAND_NAME = process.env.BRAND_NAME || "PROL";

/** Complemento del `<title>` de la portada. */
export const BRAND_TAGLINE =
  process.env.BRAND_TAGLINE || "Enseña lo que sabes, en cualquier lugar";

/** Meta description por defecto del sitio. */
export const BRAND_DESCRIPTION =
  process.env.BRAND_DESCRIPTION ||
  "LMS mobile-first para salud, corporativo, manufactura, música y más. La IA te ayuda a armar el contenido aunque sea tu primera vez. Powered by ProSuite.";

/**
 * URL pública de esta instancia, para enlaces que salen de la aplicación
 * (correos, PDFs, códigos QR de certificados, callbacks de Stripe).
 *
 * `lib/env.ts` exige `APP_URL` en producción y revienta el arranque si falta,
 * así que este fallback sólo cubre desarrollo. Es `localhost` y no un dominio
 * real a propósito: un enlace roto en local se ve al instante, mientras que uno
 * que apunta a la instancia de otro cliente pasa desapercibido hasta que
 * alguien lo abre.
 *
 * No cae a `NEXT_PUBLIC_APP_URL`: esa variable se inlina en build, así que el
 * "fallback" sería una constante con el valor de la máquina que construyó la
 * imagen, no una lectura del entorno del contenedor.
 */
export const APP_URL = process.env.APP_URL || "http://localhost:3000";

/**
 * Buzón de soporte que la base de conocimientos ofrece al usuario.
 *
 * Vive aquí y no en el componente porque `KnowledgeBase` es un componente de
 * cliente: las variables de servidor no llegan a su bundle, así que se lo pasa
 * quien lo renderiza desde el servidor.
 */
export const SUPPORT_EMAIL =
  process.env.SUPPORT_EMAIL || "soporte@prol.prosuite.pro";

/**
 * Atribución "Powered by" del pie de las pantallas de acceso.
 *
 * El interruptor es una variable aparte y no "el nombre vacío" a propósito.
 * Docker Compose y los archivos de entorno convierten una variable no definida
 * en cadena vacía, así que un diseño donde vacío significa "ocúltalo" haría
 * desaparecer el pie en la instalación que hoy sí debe mostrarlo, sólo por
 * declarar la variable. Aquí no hay forma de ocultarlo por accidente: hace
 * falta escribir `false`.
 *
 * Lo consume un componente de cliente, así que se lo pasa como prop la página
 * de servidor que lo renderiza — igual que `turnstileSiteKey`.
 */
const POWERED_BY_ENABLED =
  (process.env.POWERED_BY_ENABLED || "true").trim().toLowerCase() !== "false";

export const POWERED_BY: { name: string; url: string } | null =
  POWERED_BY_ENABLED
    ? {
        name: process.env.POWERED_BY_NAME || "PROL",
        url: process.env.POWERED_BY_URL || "https://prol.prosuite.pro",
      }
    : null;
