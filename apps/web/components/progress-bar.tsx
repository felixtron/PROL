/**
 * Barra de avance accesible. El patrón estaba copiado a mano por toda la app
 * con cuatro alturas distintas y sin rol ARIA en ningún caso.
 */
export function ProgressBar({
  value,
  label,
  size = "md",
  tone = "primary",
  className = "",
}: {
  /** Porcentaje de 0 a 100. */
  value: number;
  /** Qué mide la barra, para lectores de pantalla. */
  label: string;
  size?: "sm" | "md";
  tone?: "primary" | "success" | "inverse";
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, Math.round(value)));

  const track = tone === "inverse" ? "bg-white/30" : "bg-primary-100";
  const fill =
    tone === "inverse"
      ? "bg-white"
      : tone === "success"
        ? "bg-emerald-500"
        : "bg-primary-600";

  return (
    <div
      role="progressbar"
      aria-valuenow={pct}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className={`w-full overflow-hidden rounded-pill ${
        size === "sm" ? "h-1.5" : "h-2"
      } ${track} ${className}`}
    >
      <div
        className={`h-full rounded-pill transition-all ${fill}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
