// File: app/(chat)/actions.ts
//
// Summary:
// This server-side module handles core actions for the chatbot,
// including setting the selected model in a cookie, generating 
// dynamic chat titles based on the user's first message, deleting 
// trailing messages after a specific point in the conversation, 
// and updating the visibility status of a chat. It also includes 
// a test function for debugging the OpenAI provider integration.

'use server';

import { generateText, type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import {
  deleteMessagesByChatIdAfterTimestamp,
  getMessageById,
  updateChatVisiblityById,
} from '@/lib/db/queries';
import type { VisibilityType } from '@/components/visibility-selector';
import { myProvider } from '@/lib/ai/providers'; // ✅ using custom provider

// Save the selected chat model to cookies
export async function saveChatModelAsCookie(model: string) {
  const cookieStore = await cookies();
  cookieStore.set('chat-model', model);
}

// Generate a chat title based on the user's first message
export async function generateTitleFromUserMessage({
  message,
}: {
  message: UIMessage;
}) {
  const { text: title } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: `\n
    - you will generate a short title based on the first message a user begins a conversation with
    - ensure it is not more than 80 characters long
    - the title should be a summary of the user's message
    - do not use quotes or colons`,
    prompt: [
      {
        role: message.role,
        content: message.content,
      },
    ],
  });

  return title;
}

// Delete all messages in a chat after a specific message
export async function deleteTrailingMessages({ id }: { id: string }) {
  const [message] = await getMessageById({ id });

  await deleteMessagesByChatIdAfterTimestamp({
    chatId: message.chatId,
    timestamp: message.createdAt,
  });
}

// Update visibility of a specific chat (e.g., public, private)
export async function updateChatVisibility({
  chatId,
  visibility,
}: {
  chatId: string;
  visibility: VisibilityType;
}) {
  await updateChatVisiblityById({ chatId, visibility });
}

// ✅ Test function for debugging your OpenAI provider setup
export async function testOpenAIProvider() {
  const { text } = await generateText({
    model: myProvider.languageModel('title-model'),
    system: 'You are a helpful assistant.',
    prompt: [
      {
        role: 'user',
        content: 'How do I train a robot to clean dishes?',
      },
    ],
  });

  return text;
}

