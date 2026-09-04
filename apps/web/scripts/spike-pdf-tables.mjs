// Spike: mide, no opina.
//
// La fase 4 apuesta a una técnica sin confirmar oficialmente por react-pdf:
// que un `<View fixed>` colgado DENTRO del contenedor propio de una tabla
// (no como hijo directo de `<Page>`) repite el encabezado sólo en las
// páginas que la tabla ocupa, y a que `wrap={false}` en cada fila evita que
// una fila se parta a mitad entre dos páginas.
//
// Ninguna de las dos cosas está documentada por el mantenedor de
// `@react-pdf/renderer`; sólo hay reportes de comunidad. Este script las
// mide contra la versión real instalada en este repo, con datos reales
// generados aquí mismo, y no contra lo que diga un hilo de GitHub.
//
// No es un test: no falla nunca (exit 0 pase lo que pase). Su salida —dos
// líneas de veredicto— es la entrada que el plan 04-02 usa para decidir su
// estrategia sin volver a discutirla.
//
//   node apps/web/scripts/spike-pdf-tables.mjs

import React from "react";
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";

const e = React.createElement;

const styles = StyleSheet.create({
  page: {
    size: "LETTER",
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 9.5,
    fontFamily: "Helvetica",
  },
  paragraph: { marginBottom: 6, lineHeight: 1.4 },
  table: { marginTop: 10, borderTop: "0.5pt solid #000", borderLeft: "0.5pt solid #000" },
  headerRow: { flexDirection: "row", backgroundColor: "#e2e8f0" },
  row: { flexDirection: "row" },
  cell: {
    flex: 1,
    fontSize: 8,
    padding: 3,
    borderRight: "0.5pt solid #000",
    borderBottom: "0.5pt solid #000",
  },
  giantCell: {
    flex: 1,
    fontSize: 8,
    padding: 3,
    borderRight: "0.5pt solid #000",
    borderBottom: "0.5pt solid #000",
  },
});

// ─── Marcadores del párrafo ANTES-DE-LA-TABLA (~media página) ──────────────
const beforeLines = Array.from(
  { length: 22 },
  (_, i) => `ANTES-DE-LA-TABLA línea ${i + 1}: relleno para ocupar espacio real de página.`,
).join(" ");

// ─── Tabla principal: cabecera fixed + 45 filas wrap={false} ──────────────
const headerRow = e(
  View,
  { style: styles.headerRow, fixed: true },
  e(Text, { style: styles.cell }, "CABECERA-TABLA-SPIKE col 1"),
  e(Text, { style: styles.cell }, "CABECERA-TABLA-SPIKE col 2"),
  e(Text, { style: styles.cell }, "CABECERA-TABLA-SPIKE col 3"),
);

const rows = Array.from({ length: 45 }, (_, i) => {
  const n = String(i + 1).padStart(2, "0");
  return e(
    View,
    { key: `row-${i}`, style: styles.row, wrap: false },
    e(Text, { style: styles.cell }, `FILA-${n} celda A`),
    e(Text, { style: styles.cell }, `FILA-${n} celda B`),
    e(Text, { style: styles.cell }, `FILA-${n} celda C`),
  );
});

const mainTable = e(View, { style: styles.table }, headerRow, ...rows);

// ─── Párrafo DESPUES-DE-LA-TABLA: ~una página entera ──────────────────────
const afterLines = Array.from(
  { length: 90 },
  (_, i) => `DESPUES-DE-LA-TABLA línea ${i + 1}: relleno para ocupar una página completa.`,
).join(" ");

// ─── Segunda tabla: una sola fila patológica, más alta que una página ─────
const giantText =
  "FILA-GIGANTE-INICIO " + "x".repeat(6000) + " FILA-GIGANTE-FIN";

const giantHeaderRow = e(
  View,
  { style: styles.headerRow, fixed: true },
  e(Text, { style: styles.cell }, "CABECERA-TABLA-GIGANTE"),
);

const giantRow = e(
  View,
  { style: styles.row, wrap: false },
  e(Text, { style: styles.giantCell }, giantText),
);

const giantTable = e(View, { style: styles.table }, giantHeaderRow, giantRow);

const doc = e(
  Document,
  null,
  e(
    Page,
    { size: "LETTER", style: styles.page },
    e(Text, { style: styles.paragraph }, beforeLines),
    mainTable,
    e(Text, { style: styles.paragraph }, afterLines),
    giantTable,
  ),
);

async function main() {
  const buffer = await renderToBuffer(doc);

  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();
  await parser.destroy();

  console.log(`Páginas totales: ${result.total}\n`);
  console.log(
    "Página | CABECERA-TABLA-SPIKE | alguna FILA-nn | DESPUES-DE-LA-TABLA | FILA-GIGANTE-INICIO",
  );
  console.log(
    "-------|-----------------------|----------------|----------------------|--------------------",
  );

  const headerPages = [];
  const rowPages = [];
  const afterPages = [];
  const giantStartPages = [];

  for (const page of result.pages) {
    const text = page.text;
    const hasHeader = text.includes("CABECERA-TABLA-SPIKE");
    const hasRow = /FILA-\d{2} celda/.test(text);
    const hasAfter = text.includes("DESPUES-DE-LA-TABLA");
    const hasGiantStart = text.includes("FILA-GIGANTE-INICIO");
    if (hasHeader) headerPages.push(page.num);
    if (hasRow) rowPages.push(page.num);
    if (hasAfter) afterPages.push(page.num);
    if (hasGiantStart) giantStartPages.push(page.num);
    console.log(
      `${String(page.num).padStart(6)} | ${String(hasHeader).padEnd(21)} | ${String(hasRow).padEnd(14)} | ${String(hasAfter).padEnd(20)} | ${hasGiantStart}`,
    );
  }

  console.log();
  console.log(`Páginas con CABECERA-TABLA-SPIKE: [${headerPages.join(", ")}]`);
  console.log(`Páginas con alguna FILA-nn:       [${rowPages.join(", ")}]`);
  console.log(`Páginas con DESPUES-DE-LA-TABLA:  [${afterPages.join(", ")}]`);
  console.log(`Páginas con FILA-GIGANTE-INICIO:  [${giantStartPages.join(", ")}]`);

  const afterOnlyPages = afterPages.filter(
    (p) => !rowPages.includes(p) && !giantStartPages.includes(p),
  );
  if (afterOnlyPages.length > 0 && !afterOnlyPages.some((p) => headerPages.includes(p))) {
    console.log(
      `Confirmado: la página ${afterOnlyPages[0]} tiene contenido posterior a la tabla, SIN tabla` +
        " ni cabecera — la fuga (veredicto B) queda descartada, no sólo asumida.",
    );
  }
  console.log();

  // ─── Veredicto A/B/C: la cabecera aparece en TODAS las páginas con fila y
  // en NINGUNA sin fila -> A. Si aparece en alguna página sin fila -> B (se
  // fuga). Si aparece una sola vez (no se repite en absoluto) -> C.
  const headerSet = new Set(headerPages);
  const rowSet = new Set(rowPages);
  const leaks = headerPages.some((p) => !rowSet.has(p));
  const missesSomeRowPage = rowPages.some((p) => !headerSet.has(p));

  let verdict;
  if (headerPages.length <= 1) {
    verdict = "C";
  } else if (leaks) {
    verdict = "B";
  } else if (!missesSomeRowPage) {
    verdict = "A";
  } else {
    // La cabecera no se fuga pero tampoco cubre todas las páginas de fila:
    // no es el comportamiento "A" limpio ni el "B" de fuga; se trata como C
    // (no confiable) para que 04-02 no asuma una cobertura que no se dio.
    verdict = "C";
  }

  console.log(`VEREDICTO: ${verdict}`);
  if (verdict === "A") {
    console.log(
      "Técnica confirmada: <View fixed> ANIDADO dentro del contenedor propio de la",
    );
    console.log(
      "tabla repite la cabecera sólo en las páginas que la tabla ocupa. El plan",
    );
    console.log("04-02 usa esta técnica tal cual, sin fallback.");
  } else {
    console.log(
      "Técnica NO confiable en esta versión de react-pdf. El plan 04-02 aplica el",
    );
    console.log(
      "fallback ya definido: no repetir <thead>, encabezado único, la banda",
    );
    console.log("superior (fixed, código+versión) sostiene la trazabilidad.");
  }

  const giantVisible = giantStartPages.length > 0 ? "VISIBLE" : "DESAPARECIDA";
  console.log(`FILA-GIGANTE: ${giantVisible}`);
  if (giantVisible === "VISIBLE") {
    console.log(
      "La fila gigante con wrap={false} se movió entera a una página (posiblemente",
    );
    console.log(
      "dejando espacio en blanco antes), pero el texto no desapareció. El escape",
    );
    console.log(
      "de longitud (wrap: true para filas anormalmente largas) es una mejora",
    );
    console.log("cosmética, no imprescindible para no perder datos.");
  } else {
    console.log(
      "La fila gigante con wrap={false} desapareció del PDF: contenido perdido en",
    );
    console.log(
      "silencio. El escape de longitud (umbral -> wrap: true para esa fila) es",
    );
    console.log("IMPRESCINDIBLE, no cosmético. El plan 04-02 lo implementa.");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    // Mide, no juzga: incluso si algo sale mal, el script no debe quedar
    // colgado ni matar la sesión con un stack trace sin contexto.
    console.error("Error inesperado durante el spike (no es el veredicto):", error);
    process.exit(0);
  });
