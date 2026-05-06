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
    pathname.startsWith("/tenant-admin");

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
  const baseDomain = process.env.NEXT_PUBLIC_DOMAIN || "localhost:3000";
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

  // Create response with tenant headers if needed
  const requestHeaders = new Headers(req.headers);
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
  // and inline scripts (Next hydration) but block remote scripts. Images,
  // media and connect default to self with explicit allowances for the
  // providers actually used (Cloudflare Stream, Vimeo, YouTube, Stripe).
  // Tightening further requires moving to nonce-based CSP.
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://challenges.cloudflare.com",
      "frame-src 'self' https://js.stripe.com https://hooks.stripe.com https://player.vimeo.com https://www.youtube.com https://iframe.cloudflarestream.com",
      "connect-src 'self' https://api.stripe.com https://upload.cloudflarestream.com https://api.cloudflare.com https://api.assemblyai.com https://api.anthropic.com",
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
