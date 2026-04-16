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
  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/professor") ||
    pathname.startsWith("/admin");

  if (isProtectedRoute) {
    const sessionCookie = req.cookies.get("better-auth.session_token");
    if (!sessionCookie) {
      const signInUrl = new URL("/sign-in", url.origin);
      signInUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(signInUrl);
    }
  }

  // Redirect authenticated users away from auth pages
  const isAuthPage =
    pathname.startsWith("/sign-in") || pathname.startsWith("/sign-up");
  if (isAuthPage) {
    const sessionCookie = req.cookies.get("better-auth.session_token");
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/dashboard", url.origin));
    }
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
