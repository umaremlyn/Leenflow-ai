import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require authentication
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/assistant",   // public chat API (widget)
  "/api/webhook",     // Paystack + WhatsApp webhooks
  "/widget",          // embeddable widget JS
  "/_next",
  "/favicon.ico",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?"));
}

// Block obviously malicious path patterns
const BLOCKED_PATTERNS = [
  /\.env/i,
  /\/\.\./,           // path traversal
  /<script/i,         // XSS in path
  /\beval\b/i,
  /\/wp-admin/i,      // WordPress scan noise
  /\/phpMyAdmin/i,
  /\.php$/i,
  /\.asp$/i,
];

function isBlockedPath(pathname: string): boolean {
  return BLOCKED_PATTERNS.some(p => p.test(pathname));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Block malicious paths early ─────────────────────────
  if (isBlockedPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

  // ── Static assets — skip all auth logic ─────────────────
  if (pathname.startsWith("/_next/static") || pathname.startsWith("/_next/image")) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — do NOT remove; required by Supabase SSR
  const { data: { user } } = await supabase.auth.getUser();

  // ── Redirect unauthenticated users to login ─────────────
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // ── Redirect authenticated users away from auth pages ───
  if (user && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
    const url = request.nextUrl.clone();
    const redirectTo = request.nextUrl.searchParams.get("redirectTo") ?? "/dashboard";
    url.pathname = redirectTo.startsWith("/") ? redirectTo : "/dashboard";
    url.search   = "";
    return NextResponse.redirect(url);
  }

  // ── Add security headers to all responses ───────────────
  supabaseResponse.headers.set("X-Content-Type-Options", "nosniff");
  supabaseResponse.headers.set("X-Frame-Options",        "DENY");
  supabaseResponse.headers.set("Referrer-Policy",        "strict-origin-when-cross-origin");

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|js|css|woff2?)).*)",
  ],
};
