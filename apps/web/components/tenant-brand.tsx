interface TenantBrandProps {
  name: string;
  logo: string | null;
  badge?: string;
  badgeColor?: string;
}

/**
 * Renders the tenant's logo (if uploaded) + name, with an optional role
 * badge ("PRO" / "ADMIN"). Falls back to text-only PROL branding when
 * the tenant has no logo configured.
 */
export function TenantBrand({
  name,
  logo,
  badge,
  badgeColor = "bg-primary-500",
}: TenantBrandProps) {
  return (
    <>
      {logo ? (
        <img
          src={logo}
          alt={name}
          className="h-8 w-8 rounded-md object-contain"
        />
      ) : null}
      <span className="font-heading text-lg font-bold text-primary-700">
        {logo ? name : "PROL"}
      </span>
      {badge && (
        <span
          className={`rounded-pill px-2 py-0.5 text-xs font-semibold text-white ${badgeColor}`}
        >
          {badge}
        </span>
      )}
    </>
  );
}
