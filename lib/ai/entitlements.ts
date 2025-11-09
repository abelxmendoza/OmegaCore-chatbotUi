import type { ChatModel } from './models';

// Export UserType here for easier imports across the app
export type UserType = 'regular' | 'guest';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For users without an account
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: [
      'chat-model',
      'chat-model-reasoning',
      'grok-beta', // More permissive for security research
      'claude-3-haiku', // Fast and affordable
    ],
  },

  /*
   * For users with an account
   */
  regular: {
    maxMessagesPerDay: 100,
    availableChatModelIds: [
      'chat-model',
      'chat-model-reasoning',
      'grok-beta', // Recommended for pen testing
      'grok-2-1212',
      'claude-3-5-sonnet', // Excellent for security research
      'claude-3-opus',
      'claude-3-sonnet',
      'claude-3-haiku',
    ],
  },

  /*
   * TODO: For users with an account and a paid membership
   */
};
