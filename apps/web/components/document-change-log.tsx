/**
 * Fila del historial de control de cambios (DOC-05), ya resuelta para
 * pintar. La construye `buildHistoryEntry` en
 * `lib/queries/manual-document.ts` a partir de columnas de `CompanyDocument`
 * que ya existían (`version`, `createdAt`/`publishedAt`,
 * `uploadedById`/`publishedById`, `notes` reutilizado como "descripción del
 * cambio", `status`) — nadie la redacta a mano.
 */
export interface DocumentHistoryRow {
  id: string;
  version: number;
  statusLabel: string;
  statusClass: string;
  date: string;
  author: string;
  change: string;
  isCurrent: boolean;
}

/**
 * Tabla de control de cambios (DOC-05): versión, fecha, autor, descripción
 * del cambio y estatus, generada en tiempo de render desde el historial de
 * `CompanyDocument`. Con `history` vacío no se pinta nada: no existe un
 * documento sin al menos una versión, así que ese caso sólo aparece si algo
 * fue mal aguas arriba, y una tabla con cabeceras y ninguna fila lo
 * disimularía en vez de hacerlo visible.
 */
export function DocumentChangeLog({
  history,
  title = "Control de cambios",
}: {
  history: DocumentHistoryRow[];
  title?: string;
}) {
  if (history.length === 0) return null;

  return (
    <section className="space-y-2">
      <h2 className="font-heading text-base font-semibold text-text-primary">
        {title}
      </h2>
      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-secondary text-xs uppercase tracking-wide text-text-tertiary">
              <th className="px-3 py-2 font-medium">Versión</th>
              <th className="px-3 py-2 font-medium">Fecha</th>
              <th className="px-3 py-2 font-medium">Autor</th>
              <th className="px-3 py-2 font-medium">Descripción del cambio</th>
              <th className="px-3 py-2 font-medium">Estatus</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {history.map((row) => (
              <tr
                key={row.id}
                className={
                  row.isCurrent
                    ? "bg-primary-50/60 font-medium text-text-primary"
                    : "text-text-secondary"
                }
              >
                <td className="px-3 py-2">{row.version}</td>
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2">{row.author}</td>
                {/* `change` ya llega resuelto a "—" cuando `notes` viene
                    vacío (ver buildHistoryEntry): una celda vacía en una
                    tabla de control de cambios se lee como un error de
                    carga, así que la resolución vive aguas arriba, no aquí. */}
                <td className="px-3 py-2">{row.change}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${row.statusClass}`}
                  >
                    {row.statusLabel}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
