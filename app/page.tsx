// File: app/page.tsx

import { auth } from './(auth)/auth';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const session = await auth();

  if (!session) {
    // If there's no session, trigger guest login flow
    redirect('/api/auth/guest');
  }

  // If there's a valid session, redirect to /chat
  redirect('/chat');
}
