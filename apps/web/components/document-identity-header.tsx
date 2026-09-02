import type { DocumentIdentity } from "@/lib/documents/document-identity";

/**
 * Cabecera de un documento controlado, en el orden en que se lee uno: logo
 * de la empresa (en vivo) + razón social, código documental + nombre,
 * versión/estatus/fecha/norma, y el aviso de plantilla desactualizada si
 * aplica. Recibe `DocumentIdentity` ya resuelta (patrón `renderCertificate`):
 * ningún `??` aquí — cualquier fallback que faltara se resuelve en
 * `buildDocumentIdentity`, no en la vista.
 */
export function DocumentIdentityHeader({
  identity,
}: {
  identity: DocumentIdentity;
}) {
  return (
    <header className="space-y-3 border-b border-border pb-4">
      <div className="flex items-center gap-3">
        {identity.companyLogo ? (
          // El logo se lee en vivo de la empresa: cambiarlo actualiza todos
          // sus documentos sin regenerar nada. `next/image` exigiría
          // declarar hosts remotos para una URL que es dato del cliente, y
          // la advertencia de `no-img-element` rompería la línea base de
          // lint del milestone.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={identity.companyLogo}
            alt={identity.companyName}
            className="h-10 w-10 rounded-md object-contain"
          />
        ) : null}
        <span className="font-medium text-text-primary">
          {identity.companyName}
        </span>
      </div>

      <div>
        <p className="font-mono text-xs text-text-tertiary">
          {identity.code}
        </p>
        <h1 className="font-heading text-xl font-bold text-text-primary">
          {identity.name}
        </h1>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
        <span>Versión {identity.version}</span>
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-medium ${identity.statusClass}`}
        >
          {identity.statusLabel}
        </span>
        <span>{identity.issuedAt}</span>
        {identity.normaLabel ? <span>{identity.normaLabel}</span> : null}
      </div>

      {identity.isOutdated ? (
        <div className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <p className="font-medium">{identity.outdatedLabel}</p>
          <p className="mt-0.5 text-xs text-amber-700">
            Tu documento sigue siendo válido; la consultora ha publicado una
            versión más reciente de la plantilla.
          </p>
        </div>
      ) : null}
    </header>
  );
}
