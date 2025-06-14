import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';
import type { LanguageModel } from 'ai';

export const myProvider = customProvider({
  languageModels: {
    'chat-model': streamOpenAIModel('gpt-4'),
    'chat-model-reasoning': wrapLanguageModel({
      model: streamOpenAIModel('gpt-4'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': wrapLanguageModel({
      model: {
        doGenerate: callOpenAIOnce('gpt-4'),
      },
    }),
    'artifact-model': wrapLanguageModel({
      model: {
        doGenerate: callOpenAIOnce('gpt-4'),
      },
    }),
  },
});

/**
 * Handles non-streaming responses (used for title/artifact generation).
 */
function callOpenAIOnce(modelName: string): LanguageModel['doGenerate'] {
  return async ({ messages }) => {
    const { default: OpenAI } = await import('openai');

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: messages?.length ? messages : [{ role: 'user', content: 'Hello' }],
    });

    return {
      messages: [
        {
          role: 'assistant',
          content: response.choices[0].message.content ?? '',
        },
      ],
    };
  };
}

/**
 * Handles streaming responses (used for chat).
 */
function streamOpenAIModel(modelName: string): LanguageModel {
  return {
    doStream: async ({ messages, emit }) => {
      const { default: OpenAI } = await import('openai');

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY!,
      });

      const stream = await openai.chat.completions.create({
        model: modelName,
        stream: true,
        messages,
      });

      let fullContent = '';

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          fullContent += content;
          emit({ role: 'assistant', content });
        }
      }

      return {
        messages: [
          {
            role: 'assistant',
            content: fullContent,
          },
        ],
      };
    },
  };
}
