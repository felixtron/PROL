import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { canUseProfessorTools } from "./src/professor-mode.ts";

describe("canUseProfessorTools", () => {
  it("deja entrar al profesor aunque el interruptor esté apagado", () => {
    assert.equal(
      canUseProfessorTools({
        role: "PROFESSOR",
        professorModeEnabled: false,
        tenantId: "tenant_1",
      }),
      true,
    );
  });

  it("deja entrar al administrador de academia sólo con el modo encendido y un tenant", () => {
    assert.equal(
      canUseProfessorTools({
        role: "ADMIN",
        professorModeEnabled: true,
        tenantId: "tenant_1",
      }),
      true,
    );
  });

  it("niega al administrador cuando apaga el modo, aunque tenga tenant", () => {
    assert.equal(
      canUseProfessorTools({
        role: "ADMIN",
        professorModeEnabled: false,
        tenantId: "tenant_1",
      }),
      false,
    );
  });

  it("niega al administrador sin academia, aunque encienda el modo", () => {
    assert.equal(
      canUseProfessorTools({
        role: "ADMIN",
        professorModeEnabled: true,
        tenantId: null,
      }),
      false,
    );
  });

  it("niega al alumno y al super admin aunque el campo esté encendido", () => {
    assert.equal(
      canUseProfessorTools({
        role: "STUDENT",
        professorModeEnabled: true,
        tenantId: "tenant_1",
      }),
      false,
    );
    assert.equal(
      canUseProfessorTools({
        role: "SUPER_ADMIN",
        professorModeEnabled: true,
        tenantId: "tenant_1",
      }),
      false,
    );
  });
});
