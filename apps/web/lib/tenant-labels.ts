/**
 * Rótulo del menú del módulo de gestión documental. Lo define cada tenant
 * («Ibiza Experts 360» es marca de una consultora concreta y PROL es
 * multi-tenant), y el neutro vive aquí y no como `@default` en la base: cambiar
 * este texto no debe exigir un backfill.
 */
export const DEFAULT_DOCUMENTS_MENU_LABEL = "Gestión documental";

/** El sidebar mide 256 px: a partir de ~40 caracteres el rótulo se parte en varias líneas. */
export const DOCUMENTS_MENU_LABEL_MIN = 2;
export const DOCUMENTS_MENU_LABEL_MAX = 40;

export function resolveDocumentsMenuLabel(
  label: string | null | undefined,
): string {
  const trimmed = (label ?? "").trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_DOCUMENTS_MENU_LABEL;
}
