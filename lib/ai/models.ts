export const DEFAULT_CHAT_MODEL: string = 'chat-model';

export interface ChatModel {
  id: string;
  name: string;
  description: string;
}

export const chatModels: Array<ChatModel> = [
  {
    id: 'chat-model',
    name: 'GPT-4 (OpenAI)',
    description: 'Primary model - may have content restrictions',
  },
  {
    id: 'chat-model-reasoning',
    name: 'GPT-4 Reasoning',
    description: 'Advanced reasoning - may have content restrictions',
  },
  {
    id: 'grok-beta',
    name: 'Grok Beta (xAI)',
    description: 'More permissive for security research - Recommended for pen testing',
  },
  {
    id: 'grok-2-1212',
    name: 'Grok-2 (xAI)',
    description: 'Latest Grok model - Good for security research',
  },
  {
    id: 'claude-3-5-sonnet',
    name: 'Claude 3.5 Sonnet (Anthropic)',
    description: 'Excellent for technical security discussions',
  },
  {
    id: 'claude-3-opus',
    name: 'Claude 3 Opus (Anthropic)',
    description: 'Most capable Claude - Good for complex security analysis',
  },
  {
    id: 'claude-3-sonnet',
    name: 'Claude 3 Sonnet (Anthropic)',
    description: 'Balanced performance for security research',
  },
];
