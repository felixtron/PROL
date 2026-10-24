/**
 * El administrador de una academia puede ejercer de profesor sin una segunda
 * cuenta. El rol PROFESSOR no cambia. El interruptor vive en la cuenta del
 * ADMIN y es reversible: apagado, el servidor deja de tratarlo como profesor.
 */
export interface ProfessorModeUser {
  role: string;
  professorModeEnabled: boolean;
  tenantId: string | null;
}

export function canUseProfessorTools(user: ProfessorModeUser): boolean {
  if (user.role === "PROFESSOR") return true;
  return (
    user.role === "ADMIN" &&
    user.professorModeEnabled === true &&
    Boolean(user.tenantId)
  );
}
