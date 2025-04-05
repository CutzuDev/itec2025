import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export const updateSession = async (request: NextRequest) => {
  try {
    // Create an unmodified response
    let response = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) =>
              request.cookies.set(name, value)
            );
            response = NextResponse.next({
              request,
            });
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            );
          },
        },
      }
    );

    // Refresh session if expired - required for Server Components
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    // Define all protected routes that require authentication
    const protectedRoutes = [
      "/dashboard",
      "/sessions",
      "/sessions/create",
      "/calendar",
      "/search",
      "/curricula",
      "/summaries",
      "/podcasts",
      "/chatrooms",
      "/settings",
      "/",
    ];

    // Define public routes that should redirect to dashboard if logged in
    const publicOnlyRoutes = ["/sign-in", "/sign-up"];

    // Check if current path starts with any protected route
    const isProtectedRoute = protectedRoutes.some((route) => {
      // Special case for root route
      if (route === "/" && request.nextUrl.pathname === "/") {
        return true;
      }
      return (
        request.nextUrl.pathname === route ||
        request.nextUrl.pathname.startsWith(`${route}/`)
      );
    });

    // Check if current path is a public-only route
    const isPublicOnlyRoute = publicOnlyRoutes.includes(
      request.nextUrl.pathname
    );

    // Redirect to sign-in if trying to access protected route without authentication
    if (isProtectedRoute && error) {
      return NextResponse.redirect(new URL("/sign-in", request.url));
    }

    // Redirect to dashboard if accessing public-only routes while authenticated
    if ((isPublicOnlyRoute || request.nextUrl.pathname === "/") && user) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }

    return response;
  } catch (e) {
    console.error("Supabase client error:", e);
    // If Supabase client could not be created
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
};
