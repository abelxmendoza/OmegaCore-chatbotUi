import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

declare module 'next-auth' {
  interface User extends DefaultUser {
    id: string;
    type: 'regular' | 'guest';
  }

  interface Session {
    user: {
      id: string;
      type: 'regular' | 'guest';
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: string;
    type: 'regular' | 'guest';
  }
}

