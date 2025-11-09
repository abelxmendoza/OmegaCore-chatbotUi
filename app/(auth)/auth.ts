// File: app/(auth)/auth.ts
import NextAuth from 'next-auth';
import { authConfig } from './auth.config';

export const {
  handlers: { GET, POST },
  auth,
  signIn,
  signOut,
} = NextAuth(authConfig);

export type UserType = 'regular' | 'guest';
