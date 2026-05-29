import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = [
  "/",
  "/login",
  "/register",
  "/api/auth",
  "/api/assistant",
  "/api/webhook",
  "/api/health",
  "/widget",
];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + "/")
  );
}

export async function proxy(request: NextRequest) {
  const response = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },

        setAll(cookiesToSet: { name: string; value: string; options?: any }[]) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // Refresh auth session
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Protect private routes
  if (!user && !isPublic(pathname)) {
    const url = request.nextUrl.clone();

    url.pathname = "/login";

    if (pathname !== "/login") {
      url.searchParams.set("redirectTo", pathname);
    }

    return NextResponse.redirect(url);
  }

  // Prevent logged-in users from revisiting auth pages
  if (user && (pathname === "/login" || pathname === "/register")) {
    return NextResponse.redirect(
      new URL("/dashboard", request.url)
    );
  }

  // Pass user ID to API routes
  if (user && pathname.startsWith("/api/")) {
    response.headers.set("x-user-id", user.id);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};