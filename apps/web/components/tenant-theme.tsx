/**
 * Inject CSS variables for the current tenant's brand colors. Renders a
 * single <style> block that overrides the default `--color-primary-*` and
 * `--color-accent-*` Tailwind tokens with shades derived from the
 * tenant's hex colors via color-mix(). Drop into any layout that already
 * fetches the tenant.
 *
 * Why color-mix: the tenant only chooses two base colors (primary and
 * accent) but our UI uses the 50/100/500/600/700 scale. We synthesise
 * the others by mixing toward white (lighter) or black (darker).
 */
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function shadesFor(token: string, base: string): string {
  return [
    `--color-${token}-50: color-mix(in srgb, ${base} 8%, white);`,
    `--color-${token}-100: color-mix(in srgb, ${base} 15%, white);`,
    `--color-${token}-200: color-mix(in srgb, ${base} 25%, white);`,
    `--color-${token}-300: color-mix(in srgb, ${base} 40%, white);`,
    `--color-${token}-400: color-mix(in srgb, ${base} 65%, white);`,
    `--color-${token}-500: ${base};`,
    `--color-${token}-600: color-mix(in srgb, ${base} 85%, black);`,
    `--color-${token}-700: color-mix(in srgb, ${base} 70%, black);`,
    `--color-${token}-800: color-mix(in srgb, ${base} 55%, black);`,
    `--color-${token}-900: color-mix(in srgb, ${base} 40%, black);`,
  ].join(" ");
}

export function TenantThemeStyle({
  primaryColor,
  accentColor,
}: {
  primaryColor?: string | null;
  accentColor?: string | null;
}) {
  // Validate hex format defensively so we never inject untrusted text
  // into a <style> tag — server-side colors come from DB, but better safe.
  const primary = primaryColor && HEX_RE.test(primaryColor) ? primaryColor : null;
  const accent = accentColor && HEX_RE.test(accentColor) ? accentColor : null;
  if (!primary && !accent) return null;

  const css =
    `:root { ` +
    (primary ? shadesFor("primary", primary) + " " : "") +
    (accent ? shadesFor("accent", accent) : "") +
    `}`;
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
