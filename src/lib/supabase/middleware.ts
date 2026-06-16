import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** Rutas públicas que NO requieren sesión. */
const PUBLIC_ROUTES = ["/login", "/auth", "/reset-password", "/portal/login"];

/**
 * Refresca la sesión de Supabase en cada request y protege las rutas.
 * Redirige a `/login` cuando no hay usuario autenticado.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

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
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANTE: no ejecutar lógica entre createServerClient y getUser().
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );

  const esPortal = pathname === "/portal" || pathname.startsWith("/portal/");

  // Sin sesión y ruta protegida -> al login correcto (portal vs back-office).
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = esPortal ? "/portal/login" : "/login";
    url.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(url);
  }

  // Con sesión intentando ver una pantalla de login -> a su área.
  if (user && (pathname === "/login" || pathname === "/portal/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
