import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  outputFileTracingRoot: path.join(__dirname, "../../"),
  // pdf-parse (pdfjs + binding nativo @napi-rs/canvas) no se empaqueta en el
  // bundle del servidor; se carga desde node_modules en runtime.
  serverExternalPackages: ["pdf-parse"],
  // pdfjs carga @napi-rs/canvas con un require dinámico que el tracer no ve;
  // sin estos archivos el import de pdf-parse revienta en el standalone
  // (DOMMatrix is not defined). Los globs cubren el paquete JS, el binario
  // de la plataforma del build y el symlink vía el que pdfjs lo resuelve.
  outputFileTracingIncludes: {
    "/api/upload/extract-text": [
      // Hoist oculto de pnpm: candidato real del algoritmo de resolución de
      // Node al que pdfjs llega subiendo directorios. Debe incluir tanto
      // @napi-rs/canvas como el paquete binario de la plataforma del build.
      "../../node_modules/.pnpm/node_modules/@napi-rs/**",
      "../../node_modules/.pnpm/@napi-rs+canvas*/**/*",
      "../../node_modules/.pnpm/pdfjs-dist@*/node_modules/@napi-rs/**",
      // El "fake worker" de pdfjs importa este módulo con ruta dinámica.
      "../../node_modules/.pnpm/pdfjs-dist@*/node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ],
  },
  transpilePackages: [
    "@prol/ui",
    "@prol/shared",
    "@prol/email",
    "@prol/ai",
    "@prol/content-factory",
  ],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.cloudflarestream.com" },
      { protocol: "https", hostname: "i.vimeocdn.com" },
      { protocol: "https", hostname: "**.vimeocdn.com" },
    ],
  },
};

export default nextConfig;
