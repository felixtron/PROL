import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Inter } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
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
