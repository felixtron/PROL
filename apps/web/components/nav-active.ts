/**
 * Resuelve qué entrada del menú corresponde a la ruta actual.
 *
 * El match más largo gana. Sin esta regla, un `href` raíz como "/tenant-admin"
 * también satisface `startsWith` en "/tenant-admin/users" y se resaltan dos
 * ítems a la vez.
 */
export function resolveActiveHref(
  pathname: string | null | undefined,
  hrefs: string[],
): string | null {
  if (!pathname) return null;

  let best: string | null = null;
  for (const href of hrefs) {
    const matches = pathname === href || pathname.startsWith(href + "/");
    if (!matches) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}
