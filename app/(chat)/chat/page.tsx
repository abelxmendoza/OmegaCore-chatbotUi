import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { auth } from '@/app/(auth)/auth';

export default async function Page() {
  const session = await auth();

  if (!session) {
    redirect('/api/auth/guest');
    return null;
  }

  const id = generateUUID();

  const cookieStore = await cookies(); // ✅ await added here
  const modelIdFromCookie = cookieStore.get('chat-model');
  const selectedModel = modelIdFromCookie?.value ?? DEFAULT_CHAT_MODEL;

  return (
    <>
      <Chat
        key={id}
        id={id}
        initialMessages={[]}
        selectedChatModel={selectedModel}
        selectedVisibilityType="private"
        isReadonly={false}
        session={session}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
