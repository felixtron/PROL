import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { enrollmentConfirmation } from "./src/templates.ts";

const base = {
  name: "Ana",
  courseName: "Bioseguridad",
  courseUrl: "https://prol.example/dashboard/courses/c1",
  tenantName: "Tiva",
};

const DIPLOMA_NOTE =
  "Debes asegurarte que TU NOMBRE en el PERFIL de nuestra plataforma est&aacute; COMPLETO y es CORRECTO ya que, as&iacute; se imprimir&aacute; en los DIPLOMAS de los cursos en los que est&eacute;s inscrito(a); y tales diplomas NO PUEDEN MODIFICARSE despu&eacute;s de su emisi&oacute;n.";

describe("enrollmentConfirmation y la herramienta de diplomas", () => {
  it("mantiene la nota cuando student_tools es null", () => {
    const { html, subject } = enrollmentConfirmation({
      ...base,
      studentTools: null,
    });
    assert.ok(html.includes(DIPLOMA_NOTE));
    assert.equal(subject, "Inscripción confirmada: Bioseguridad");
  });

  it("mantiene la nota si diplomas están activos o si se apagó otra herramienta", () => {
    for (const studentTools of [
      { certificates: true },
      { workshops: false },
      {},
    ]) {
      const { html } = enrollmentConfirmation({ ...base, studentTools });
      assert.ok(html.includes(DIPLOMA_NOTE), JSON.stringify(studentTools));
    }
  });

  it("trata un valor que no es booleano como herramienta visible", () => {
    const { html } = enrollmentConfirmation({
      ...base,
      studentTools: { certificates: "false" },
    });
    assert.ok(html.includes(DIPLOMA_NOTE));
  });

  it("omite la nota y no menciona diplomas ni certificados cuando la herramienta está apagada", () => {
    const { html, subject } = enrollmentConfirmation({
      ...base,
      studentTools: { certificates: false },
    });
    assert.equal(html.includes(DIPLOMA_NOTE), false);
    assert.doesNotMatch(html, /diploma/i);
    assert.doesNotMatch(html, /certificado/i);
    assert.doesNotMatch(html, /certificate/i);
    assert.equal(html.includes("#FEF9C3"), false);
    assert.match(html, /Hola Ana/);
    assert.match(html, /Bioseguridad/);
    assert.match(html, /Acceder al curso/);
    assert.equal(subject, "Inscripción confirmada: Bioseguridad");
    assert.doesNotMatch(subject, /diploma|certificado|certificate/i);
  });
});
