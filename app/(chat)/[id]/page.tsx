import { cookies } from 'next/headers';
import { notFound, redirect } from 'next/navigation';

import { auth } from '@/app/(auth)/auth';
import { Chat } from '@/components/chat';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import type { DBMessage } from '@/lib/db/schema';
import type { Attachment, UIMessage } from 'ai';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;

  console.log('Loading chat with ID:', id);

  const chat = await getChatById({ id });

  if (!chat) {
    console.error('Chat not found for ID:', id);
    notFound(); // This throws, but we add `return` to ensure safety in dev mode
    return;
  }

  const session = await auth();

  if (!session) {
    console.warn('No session found. Redirecting to guest auth...');
    redirect('/api/auth/guest');
    return;
  }

  if (chat.visibility === 'private') {
    if (!session.user || session.user.id !== chat.userId) {
      console.warn('Unauthorized access to private chat.');
      notFound();
      return;
    }
  }

  const messagesFromDb = (await getMessagesByChatId({ id })) ?? [];

  function convertToUIMessages(messages: Array<DBMessage>): Array<UIMessage> {
    return messages.map((message) => ({
      id: message.id,
      parts: message.parts as UIMessage['parts'],
      role: message.role as UIMessage['role'],
      content: '',
      createdAt: message.createdAt,
      experimental_attachments: (message.attachments as Array<Attachment>) ?? [],
    }));
  }

  const cookieStore = await cookies();
  const chatModelFromCookie = cookieStore.get('chat-model');

  const selectedChatModel = chatModelFromCookie?.value ?? DEFAULT_CHAT_MODEL;
  const isReadonly = session?.user?.id !== chat.userId;

  return (
    <>
      <Chat
        id={chat.id}
        initialMessages={convertToUIMessages(messagesFromDb)}
        selectedChatModel={selectedChatModel}
        selectedVisibilityType={chat.visibility}
        isReadonly={isReadonly}
        session={session}
      />
      <DataStreamHandler id={id} />
    </>
  );
}
