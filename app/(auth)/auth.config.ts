// File: app/(auth)/auth.config.ts

import Credentials from 'next-auth/providers/credentials';
import type { NextAuthConfig } from 'next-auth';
import { createGuestUser, getUser } from '@/lib/db/queries';
import { DUMMY_PASSWORD } from '@/lib/constants';
import { compare } from 'bcryptjs';

export const authConfig = {
  // Required for encryption/signing
  secret: process.env.NEXTAUTH_SECRET,

  // Optional: helpful for debugging in dev
  debug: process.env.NODE_ENV === 'development',

  // Required for JWT-based sessions
  session: {
    strategy: 'jwt',
  },

  pages: {
    signIn: '/login',
    newUser: '/',
  },

  providers: [
    // Regular user login
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {},
      async authorize({ email, password }: any) {
        const users = await getUser(email);

        if (users.length === 0) {
          await compare(password, DUMMY_PASSWORD); // Fake compare
          return null;
        }

        const [user] = users;

        if (!user.password) {
          await compare(password, DUMMY_PASSWORD);
          return null;
        }

        const passwordsMatch = await compare(password, user.password);
        if (!passwordsMatch) return null;

        return { ...user, type: 'regular' };
      },
    }),

    // Guest login
    Credentials({
      id: 'guest',
      name: 'Guest',
      credentials: {},
      async authorize() {
        const [guestUser] = await createGuestUser();
        return { ...guestUser, type: 'guest' };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.type = user.type;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.type = token.type;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
