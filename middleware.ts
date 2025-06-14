// File: middleware.ts
// Summary: Auth middleware with guest fallback and redirect loop prevention

import { NextResponse, type NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';
import { guestRegex, isDevelopmentEnvironment } from './lib/constants';

export async function middleware(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;

  // ✅ Allow health checks
  if (pathname.startsWith('/ping')) {
    return new Response('pong', { status: 200 });
  }

  // ✅ Skip middleware on public/auth routes
  if (
    pathname === '/' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // ✅ Check for auth token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  // 🔁 Redirect to guest auth if not authenticated
  if (!token) {
    const redirectUrl = new URL('/api/auth/guest', origin);
    redirectUrl.searchParams.set('redirectUrl', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // ✅ Prevent logged-in non-guests from visiting login/register
  const isGuest = guestRegex.test(token?.email ?? '');

  if (!isGuest && ['/login', '/register'].includes(pathname)) {
    return NextResponse.redirect(new URL('/', origin));
  }

  return NextResponse.next();
}

// ✅ Matcher config — apply middleware to important pages
export const config = {
  matcher: [
    '/chat/:id',
    '/api/:path*',
    '/login',
    '/register',
    '/((?!^api/auth/guest|^api/auth|^_next/static|^_next/image|^favicon.ico|^sitemap.xml|^robots.txt|^$).*)',
  ],
};
