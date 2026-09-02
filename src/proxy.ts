import { getSessionCookie } from "better-auth/cookies";
import { NextRequest, NextResponse } from "next/server";

const rotasPublicas = ["/login", "/api/auth"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isPublic = rotasPublicas.some(
    (r) => pathname === r || pathname.startsWith(`${r}/`),
  );

  const sessionCookie = getSessionCookie(request);

  // Página pública acessível
  if (isPublic) {
    // Se já logado e for /login, redireciona para /
    if (pathname.startsWith("/login") && sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  // Rota protegida sem sessão → login
  if (!sessionCookie) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
