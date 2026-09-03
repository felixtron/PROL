import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";

export function middleware(req: NextRequest) {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";
  const pathname = url.pathname;

  // --- Rate Limiting ---
  // Get IP address for rate limiting
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Apply different rate limits based on route type
  let rateLimitResult;
  if (pathname.startsWith("/api/auth")) {
    // Auth routes: 20 requests per minute
    rateLimitResult = checkRateLimit(`auth:${ip}`, 20, 60 * 1000);
  } else if (pathname.startsWith("/api")) {
    // API routes: 60 requests per minute
    rateLimitResult = checkRateLimit(`api:${ip}`, 60, 60 * 1000);
  }
  // Regular pages: no rate limiting

  // If rate limited, return 429 response
  if (rateLimitResult?.limited) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes. Intenta de nuevo en un momento." },
      {
        status: 429,
        headers: {
          "Retry-After": "60",
          "X-RateLimit-Limit": pathname.startsWith("/api/auth") ? "20" : "60",
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  // --- Auth protection ---
  // Better Auth uses different cookie names depending on the environment:
  //   HTTP (dev):   better-auth.session_token
  //   HTTPS (prod): __Secure-better-auth.session_token
  const hasSession =
    req.cookies.has("better-auth.session_token") ||
    req.cookies.has("__Secure-better-auth.session_token");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/professor") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/tenant-admin") ||
    pathname.startsWith("/preview");

  if (isProtectedRoute && !hasSession) {
    const signInUrl = new URL("/sign-in", url.origin);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  // Redirect authenticated users away from auth pages
  const isAuthPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  if (isAuthPage && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", url.origin));
  }

  // --- Tenant resolution ---
  // Extract tenant slug from subdomain
  // `APP_DOMAIN`, y SIN caer a `NEXT_PUBLIC_DOMAIN`.
  //
  // El middleware se empaqueta para el runtime edge, donde Next sustituye en
  // build toda variable con prefijo `NEXT_PUBLIC_` por su valor de entonces.
  // Un `?? process.env.NEXT_PUBLIC_DOMAIN` no es compatibilidad hacia atrás:
  // es una constante horneada con lo que hubiera en la máquina que construyó
  // la imagen. Se comprobó en el bundle — el término desaparecía y quedaba
  // `process.env.APP_DOMAIN||"localhost:3000"`, con el literal del .env local.
  //
  // Por eso `APP_DOMAIN` es obligatoria en producción (`lib/env.ts` revienta el
  // arranque si falta) en vez de degradar en silencio: un dominio base
  // equivocado no rompe nada visible, sólo deja de resolver todos los tenants.
  const baseDomain = process.env.APP_DOMAIN || "localhost:3000";
  let tenantSlug: string | null = null;

  if (hostname !== baseDomain && hostname.endsWith(baseDomain)) {
    tenantSlug = hostname.replace(`.${baseDomain}`, "");
  }
  // For local development: slug.localhost:3000
  if (!tenantSlug && hostname.includes("localhost")) {
    const parts = hostname.split(".");
    if (parts.length > 1 && parts[0] !== "www") {
      tenantSlug = parts[0] ?? null;
    }
  }

  // Instancia dedicada a un solo tenant: el apex ES el tenant.
  //
  // En el modelo multi-tenant cada academia vive en un subdominio, así que un
  // host igual al dominio base significa "portada de la plataforma" y no
  // resuelve ningún tenant. Una instalación dedicada invierte eso: su dominio
  // propio no tiene subdominio que mirar, y sin esta regla un visitante
  // anónimo vería el catálogo sin marca y quien se diera de alta quedaría con
  // `tenantId = null`, sin acceso a ningún curso.
  //
  // Va al final a propósito: un subdominio explícito siempre gana, así el
  // acceso por `<slug>.<dominio>` sigue funcionando durante la transición.
  // Sin la variable, el comportamiento es idéntico al de siempre.
  if (!tenantSlug && process.env.DEFAULT_TENANT_SLUG && hostname === baseDomain) {
    tenantSlug = process.env.DEFAULT_TENANT_SLUG;
  }

  // `x-tenant-slug` es una cabecera de confianza: `lib/auth.ts` la usa para
  // decidir en qué tenant nace un usuario, y `lib/tenant.ts` para resolver de
  // quién es el catálogo. Se BORRA antes de nada porque `new Headers(req.headers)`
  // copia también lo que mandó el cliente, y sin este delete bastaría un
  // `curl -H 'x-tenant-slug: <víctima>'` contra /api/auth/sign-up/email para
  // darse de alta dentro del tenant ajeno. El `input: false` de
  // `user.additionalFields` cierra la vía del cuerpo de la petición, no ésta.
  const requestHeaders = new Headers(req.headers);
  requestHeaders.delete("x-tenant-slug");
  if (tenantSlug) {
    requestHeaders.set("x-tenant-slug", tenantSlug);
  }

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // --- Security Headers ---
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("X-DNS-Prefetch-Control", "on");

  // HSTS: only emit over HTTPS (forwarded by Traefik) so we don't break
  // local dev. 1 year + subdomains; no preload yet so we can opt out.
  const proto = req.headers.get("x-forwarded-proto");
  if (proto === "https") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );
  }

  // Content Security Policy. We allow inline styles (Tailwind/Next runtime)
  // and inline scripts (Next hydration). Remote scripts are restricted to
  // the small set of providers we actively integrate with (Stripe,
  // Cloudflare Turnstile + Stream, Vimeo and YouTube player SDKs). The
  // video SDKs are required for interactive stops to work — without
  // them the iframes load but we can't subscribe to timeupdate events.
  // 'unsafe-eval' is permitted only in development because Next.js HMR
  // and the React refresh runtime rely on Function()/eval — production
  // bundles never need it, so blocking it there closes a real XSS escalation
  // vector without breaking anything. Tightening 'unsafe-inline' further
  // requires moving to nonce-based CSP.
  const isProduction = process.env.NODE_ENV === "production";
  const scriptSrc = [
    "script-src",
    "'self'",
    "'unsafe-inline'",
    ...(isProduction ? [] : ["'unsafe-eval'"]),
    "https://js.stripe.com",
    "https://challenges.cloudflare.com",
    "https://player.vimeo.com",
    "https://www.youtube.com",
    "https://embed.videodelivery.net",
  ].join(" ");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "media-src 'self' https://videodelivery.net https://customer-*.cloudflarestream.com https://*.vimeocdn.com",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      scriptSrc,
      // challenges.cloudflare.com: Turnstile renderiza su challenge en un
      // iframe y hace fetch a ese host. Sin estos dos, el CSP bloquearía el
      // widget y dejaría a los usuarios sin poder completar el captcha.
      "frame-src 'self' https://challenges.cloudflare.com https://js.stripe.com https://hooks.stripe.com https://player.vimeo.com https://www.youtube.com https://www.youtube-nocookie.com https://iframe.cloudflarestream.com https://iframe.videodelivery.net https://embed.videodelivery.net",
      "connect-src 'self' https://challenges.cloudflare.com https://api.stripe.com https://upload.cloudflarestream.com https://api.cloudflare.com https://api.assemblyai.com https://api.anthropic.com https://player.vimeo.com https://*.vimeocdn.com https://www.youtube.com https://www.youtube-nocookie.com https://videodelivery.net https://*.cloudflarestream.com",
    ].join("; "),
  );
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  // Add rate limit headers if applicable
  if (rateLimitResult) {
    const limit = pathname.startsWith("/api/auth") ? "20" : "60";
    response.headers.set("X-RateLimit-Limit", limit);
    response.headers.set(
      "X-RateLimit-Remaining",
      rateLimitResult.remaining.toString()
    );
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
