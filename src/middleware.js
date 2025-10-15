import { NextResponse } from "next/server";

const NAME = process.env.AUTH_COOKIE_NAME || "adatex_session";

export function middleware(request) {
  const token = request.cookies.get(NAME)?.value;
  const { pathname } = request.nextUrl;

  console.log(token, "TOKEN");

  // Rutas públicas que no requieren autenticación
  const isPublicPath = pathname.startsWith("/login");

  // Si no hay token y está intentando acceder a rutas protegidas
  if (!token && !isPublicPath) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay token y está intentando acceder al login, redirigir al dashboard
  if (token && isPublicPath) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};
