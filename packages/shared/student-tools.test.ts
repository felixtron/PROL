import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  STUDENT_TOOLS,
  firstAllowedStudentHref,
  isKnownStudentToolId,
  isStudentPathAllowed,
  isStudentToolVisible,
  parseStudentToolPreferences,
  setStudentToolPreference,
  studentMobilePrimaryHrefs,
  type StudentPanelContext,
} from "./src/student-tools.ts";

const openAcademy: StudentPanelContext = {
  preferences: null,
  documentsEnabled: true,
  advisoryEnabled: true,
  surveysEnabled: true,
  hasCompany: true,
};

describe("herramientas del alumno", () => {
  it("con preferencias vacías deja visible todo lo que la academia ya muestra hoy", () => {
    for (const tool of STUDENT_TOOLS) {
      assert.equal(isStudentToolVisible(openAcademy, tool.id), true, tool.id);
    }
  });

  it("apaga sólo la herramienta elegida y la vuelve a encender", () => {
    const off = setStudentToolPreference(null, "workshops", false);
    assert.equal(
      isStudentToolVisible({ ...openAcademy, preferences: off }, "workshops"),
      false,
    );
    assert.equal(
      isStudentToolVisible({ ...openAcademy, preferences: off }, "courses"),
      true,
    );

    const on = setStudentToolPreference(off, "workshops", true);
    assert.equal(
      isStudentToolVisible({ ...openAcademy, preferences: on }, "workshops"),
      true,
    );
  });

  it("ignora claves desconocidas y valores que no son booleanos", () => {
    const parsed = parseStudentToolPreferences({
      courses: false,
      inventada: false,
      workshops: "no",
      home: true,
    });
    assert.deepEqual(parsed, { courses: false, home: true });
    assert.equal(isKnownStudentToolId("courses"), true);
    assert.equal(isKnownStudentToolId("inventada"), false);
    assert.throws(() => setStudentToolPreference(null, "inventada", false));
  });

  it("no abre la ruta de una herramienta apagada, incluidas las subrutas", () => {
    const preferences = setStudentToolPreference(null, "courses", false);
    const ctx = { ...openAcademy, preferences };
    assert.equal(isStudentPathAllowed("/dashboard/courses", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/courses/curso-1", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard", ctx), true);
    assert.equal(isStudentPathAllowed("/dashboard/settings", ctx), true);
    assert.equal(isStudentPathAllowed("/dashboard/notifications", ctx), true);
  });

  it("trata el inicio como ruta exacta, no como prefijo de todo el panel", () => {
    const preferences = setStudentToolPreference(null, "home", false);
    const ctx = { ...openAcademy, preferences };
    assert.equal(isStudentPathAllowed("/dashboard", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/certificates", ctx), true);
  });

  it("respeta los módulos que la academia no tiene contratados", () => {
    const ctx: StudentPanelContext = {
      ...openAcademy,
      documentsEnabled: false,
      advisoryEnabled: false,
      surveysEnabled: false,
    };
    assert.equal(isStudentPathAllowed("/dashboard/manuals", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/documents/doc-1", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/agenda", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/advisory", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/surveys/c1/results", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/courses", ctx), true);
  });

  it("oculta DC-3 y el módulo documental si el alumno no tiene empresa", () => {
    const ctx: StudentPanelContext = { ...openAcademy, hasCompany: false };
    assert.equal(isStudentToolVisible(ctx, "dc3"), false);
    assert.equal(isStudentToolVisible(ctx, "manuals"), false);
    assert.equal(isStudentToolVisible(ctx, "company"), true);
    assert.equal(isStudentPathAllowed("/dashboard/dc3/empresa", ctx), false);
    assert.equal(isStudentPathAllowed("/dashboard/company", ctx), true);
  });

  it("cierra evaluaciones y la matriz de riesgos cuando se apaga su sección", () => {
    const withoutCompany = {
      ...openAcademy,
      preferences: setStudentToolPreference(null, "company", false),
    };
    assert.equal(
      isStudentPathAllowed("/dashboard/evaluations/abc", withoutCompany),
      true,
    );

    const withoutDocs = {
      ...withoutCompany,
      preferences: setStudentToolPreference(
        withoutCompany.preferences,
        "manuals",
        false,
      ),
    };
    assert.equal(
      isStudentPathAllowed("/dashboard/evaluations/abc", withoutDocs),
      false,
    );
    assert.equal(isStudentPathAllowed("/dashboard/risk/xyz", withoutDocs), false);
  });

  it("saca de la barra móvil la herramienta apagada y manda al primer destino abierto", () => {
    const preferences = setStudentToolPreference(
      setStudentToolPreference(null, "home", false),
      "workshops",
      false,
    );
    const ctx = { ...openAcademy, preferences };
    assert.deepEqual(studentMobilePrimaryHrefs(ctx), [
      "/dashboard/courses",
      "/dashboard/certificates",
    ]);
    assert.equal(firstAllowedStudentHref(ctx), "/dashboard/courses");
  });

  it("cae en configuración si no queda ninguna herramienta", () => {
    let preferences: unknown = null;
    for (const tool of STUDENT_TOOLS) {
      preferences = setStudentToolPreference(preferences, tool.id, false);
    }
    const ctx = { ...openAcademy, preferences };
    assert.equal(firstAllowedStudentHref(ctx), "/dashboard/settings");
    assert.equal(isStudentPathAllowed("/dashboard/settings/perfil", ctx), true);
  });
});
