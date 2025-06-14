// File: app/(auth)/api/auth/guest/route.ts
// Summary: Handles guest auth flow, safely signs in guest or returns 401 if unsupported.

import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { signIn } from '@/app/(auth)/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get('redirectUrl') || '/';

  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // ✅ Important: RETURN the result of signIn to handle redirect properly
    return await signIn('guest', { redirectTo: redirectUrl });
  } catch (err) {
    console.error('[Guest Auth Error]', err);
    return new Response('Guest login not supported.', { status: 401 });
  }
}
