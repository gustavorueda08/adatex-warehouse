import { NextResponse } from "next/server";

const NAME = process.env.AUTH_COOKIE_NAME || "adatex_session";

export function middleware(request) {
  const token = request.cookies.get(NAME)?.value;
  const { pathname } = request.nextUrl;

  // Deja pasar archivos estáticos y assets del core de Next
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    /\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif|ttf|otf|woff|woff2)$/.test(pathname)
  ) {
    return NextResponse.next();
  }

  console.log("🔐 Middleware ejecutándose:", { pathname, hasToken: !!token });

  // Rutas públicas que no requieren autenticación
  const isPublicPath = pathname.startsWith("/login");

  // Si no hay token y está intentando acceder a rutas protegidas
  if (!token && !isPublicPath) {
    console.log("⛔ Sin token, redirigiendo a /login");
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Si hay token y está intentando acceder al login, redirigir al dashboard
  if (token && isPublicPath) {
    console.log("✅ Con token en login, redirigiendo a /");
    return NextResponse.redirect(new URL("/", request.url));
  }

  console.log("✅ Permitiendo acceso a:", pathname);
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
     * - archivos estáticos como imágenes o fuentes
     */
    "/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|gif|ico|webp|avif|ttf|otf|woff|woff2)).*)",
  ],
};
