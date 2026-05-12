import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

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

export const metadata: Metadata = {
  title: "PROL — Enseña lo que sabes, en cualquier lugar",
  description:
    "LMS mobile-first para salud, corporativo, manufactura, música y más. La IA te ayuda a armar el contenido aunque sea tu primera vez. Powered by ProSuite.",
};

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
