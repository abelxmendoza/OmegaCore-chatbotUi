// File: app/(auth)/api/auth/guest/route.ts
// Summary: Handles guest auth flow, safely signs in guest or returns 401 if unsupported.

import { isDevelopmentEnvironment } from '@/lib/constants';
import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import { signIn } from '@/app/(auth)/auth';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectUrl = url.searchParams.get('redirectUrl') || '/';

  // Check if user already has a token/session
  const token = await getToken({
    req: request,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    secureCookie: !isDevelopmentEnvironment,
  });

  if (token) {
    // Already signed in — redirect to homepage or dashboard
    return NextResponse.redirect(new URL('/', request.url));
  }

  try {
    // Initiate guest sign-in via next-auth (this throws NEXT_REDIRECT internally)
    return await signIn('guest', {
      redirectTo: redirectUrl,
      // Note: `redirect: true` is default on server, so not needed
    });
  } catch (err: any) {
    console.error('[Guest Auth Error]', err);
    return new Response('Guest login not supported.', { status: 401 });
  }
}
