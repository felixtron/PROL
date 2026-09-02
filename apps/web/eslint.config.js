import { nextJsConfig } from "@prol/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    // Scripts de Node sueltos (p. ej. la migración disco → R2), fuera del
    // árbol de Next.js: sólo necesitan el global `process`, que el resto de
    // la configuración no declara porque el resto del repo son componentes y
    // rutas de Next, no procesos de Node ejecutados por CLI.
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        process: "readonly",
      },
    },
  },
];
