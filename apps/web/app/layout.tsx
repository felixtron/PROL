import type { Metadata } from "next";
import { connection } from "next/server";
import localFont from "next/font/local";
import "./globals.css";
import { BRAND_NAME, BRAND_TAGLINE, BRAND_DESCRIPTION } from "@/lib/brand";

// Fonts servidas localmente desde /public/fonts. Variable fonts (un solo
// archivo .woff2 latin cubre todo el rango de pesos), descargadas desde
// fontsource para no depender de fonts.googleapis.com en build time —
// el firewall del VPS bloquea esos hosts.
const plusJakartaSans = localFont({
  src: "../public/fonts/plus-jakarta-sans-variable.woff2",
  variable: "--font-heading",
  display: "swap",
  weight: "200 800",
});

const inter = localFont({
  src: "../public/fonts/inter-variable.woff2",
  variable: "--font-body",
  display: "swap",
  weight: "100 900",
});

// `generateMetadata` en vez de un `metadata` estático, y con `connection()`
// dentro: `BRAND_NAME` es una variable de servidor, y Next sólo la evalúa en
// runtime cuando la ruta se renderiza de forma dinámica. Sin esto, las rutas
// que prerenderiza (`/`, `/onboarding`, `/reset-password`) hornearían el
// nombre en la imagen — y la misma imagen sirve a dos instancias con nombres
// distintos, así que una de las dos mostraría la marca de la otra en la
// pestaña del navegador.
//
// El costo es que esas tres rutas dejan de ser estáticas. Es deliberado y
// barato: son páginas de bajo tráfico detrás de Traefik, y la alternativa es
// una marca equivocada.
export async function generateMetadata(): Promise<Metadata> {
  await connection();
  return {
    title: `${BRAND_NAME} — ${BRAND_TAGLINE}`,
    description: BRAND_DESCRIPTION,
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${plusJakartaSans.variable} ${inter.variable}`}>
        {children}
      </body>
    </html>
  );
}
