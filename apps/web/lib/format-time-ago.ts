/**
 * Antigüedad en palabras ("hace 3 horas"). Vivía copiada en la campana, en la
 * página de notificaciones y en su lista.
 */
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - new Date(date).getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return "hace un momento";
  if (diffMins < 60) return `hace ${diffMins} min`;
  if (diffHours < 24)
    return `hace ${diffHours} hora${diffHours > 1 ? "s" : ""}`;
  return `hace ${diffDays} día${diffDays > 1 ? "s" : ""}`;
}
