// File: lib/ai/providers.ts

import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';
import type { LanguageModel, LanguageModelV1 } from 'ai';
import { createXai } from '@ai-sdk/xai';

// Anthropic provider - optional, handle import gracefully for deployment
// Use dynamic require with string to avoid webpack static analysis
let anthropicModels: Record<string, any> = {};

// Only try to load Anthropic if API key is set
if (process.env.ANTHROPIC_API_KEY) {
  try {
    // Use Function constructor to create a dynamic require that webpack can't analyze
    const requireAnthropic = new Function('moduleName', 'return require(moduleName)');
    // @ts-ignore - dynamic require that may not exist
    const anthropicModule = requireAnthropic('@ai-sdk/anthropic');
    if (anthropicModule?.createAnthropic) {
      const anthropic = anthropicModule.createAnthropic({
        apiKey: process.env.ANTHROPIC_API_KEY,
      });
      anthropicModels = {
        'claude-3-5-sonnet': anthropic('claude-3-5-sonnet-20241022') as any,
        'claude-3-opus': anthropic('claude-3-opus-20240229') as any,
        'claude-3-sonnet': anthropic('claude-3-sonnet-20240229') as any,
        'claude-3-haiku': anthropic('claude-3-haiku-20240307') as any,
      };
    }
  } catch {
    // Anthropic not available - this is fine, it's optional
    anthropicModels = {};
  }
}

// 🧠 For loading WASM from server
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// ✅ Proper tiktoken WASM loading in a Server Component
import { init, encoding_for_model } from 'tiktoken/init';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// 💡 Initialize tiktoken with local WASM file
await init((imports) =>
  fs.readFile(path.join(__dirname, '../../public/tiktoken/tiktoken_bg.wasm'))
    .then((wasmBuffer) => WebAssembly.instantiate(wasmBuffer, imports))
);

// 🧠 Create a tokenizer factory for any GPT model
function createTokenizer(modelName: 'gpt-4' | 'gpt-3.5-turbo') {
  const enc = encoding_for_model(modelName as 'gpt-4');
  return {
    tokenizer: {
      encode: (text: string) => {
        const encoded = enc.encode(text);
        return Array.from(encoded);
      },
      decode: (tokens: number[]) => {
        const uint32Array = new Uint32Array(tokens);
        return enc.decode(uint32Array);
      },
    },
    getTokenCount: (text: string) => enc.encode(text).length,
    free: () => enc.free(),
  };
}

// 🔧 Tokenizers for each model usage
const titleTokenizer = createTokenizer('gpt-4');
const artifactTokenizer = createTokenizer('gpt-4');

// Initialize providers
const xai = createXai({
  apiKey: process.env.XAI_API_KEY,
});

// 🔌 Provider setup using ai SDK
export const myProvider = customProvider({
  languageModels: {
    // OpenAI models
    'chat-model': streamOpenAIModel('gpt-4'),
    'chat-model-reasoning': wrapLanguageModel({
      model: streamOpenAIModel('gpt-4'),
      middleware: extractReasoningMiddleware({ tagName: 'think' }),
    }),
    'title-model': callOpenAIOnce('gpt-4', titleTokenizer),
    'artifact-model': callOpenAIOnce('gpt-4', artifactTokenizer),

    // xAI Grok models (more permissive for security research)
    'grok-beta': xai('grok-beta'),
    'grok-2-1212': xai('grok-2-1212'),
    'grok-2-vision-1212': xai('grok-2-vision-1212'),

    // Anthropic Claude models (good for security research) - only if available
    ...anthropicModels,
  },
});

/** 🔄 One-shot completion for non-streaming model use */
function callOpenAIOnce(
  modelName: string,
  tokenizer: ReturnType<typeof createTokenizer>,
): LanguageModelV1 {
  return {
    specificationVersion: 'v1',
    provider: 'custom',
    modelId: modelName,
    defaultObjectGenerationMode: 'json',
    doGenerate: async (options) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      // Convert prompt to messages format
      let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      
      if (options.prompt) {
        // If prompt is provided, convert it to messages
        if (typeof options.prompt === 'string') {
          messages = [{ role: 'user', content: options.prompt }];
        } else {
          // If it's an array of messages, convert them
          messages = options.prompt.map((msg) => {
            if (msg.role === 'user' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'user' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'assistant' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'system') {
              return { role: 'system' as const, content: msg.content };
            }
            return { role: 'user' as const, content: '' };
          });
        }
      }

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages.length ? messages : [{ role: 'user', content: 'Hello' }],
      });

      const text = response.choices[0]?.message?.content ?? '';
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;

      return {
        text,
        finishReason: response.choices[0]?.finish_reason === 'stop' ? 'stop' : 'other',
        usage: {
          promptTokens,
          completionTokens,
        },
        rawCall: {
          rawPrompt: messages,
          rawSettings: {},
        },
      };
    },
    doStream: async (options) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      
      if (options.prompt) {
        if (typeof options.prompt === 'string') {
          messages = [{ role: 'user', content: options.prompt }];
        } else {
          messages = options.prompt.map((msg) => {
            if (msg.role === 'user' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'user' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'assistant' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'system') {
              return { role: 'system' as const, content: msg.content };
            }
            return { role: 'user' as const, content: '' };
          });
        }
      }

      const stream = await openai.chat.completions.create({
        model: modelName,
        stream: true,
        messages: messages.length ? messages : [{ role: 'user', content: 'Hello' }],
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                controller.enqueue({
                  type: 'text-delta' as const,
                  textDelta: delta,
                });
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return {
        stream: readableStream,
        rawCall: {
          rawPrompt: messages,
          rawSettings: {},
        },
      };
    },
  };
}

/** 🧵 Streaming chat completion */
function streamOpenAIModel(modelName: string): LanguageModelV1 {
  return {
    specificationVersion: 'v1',
    provider: 'custom',
    modelId: modelName,
    defaultObjectGenerationMode: 'json',
    doStream: async (options) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      // Convert prompt to messages format
      let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      
      if (options.prompt) {
        if (typeof options.prompt === 'string') {
          messages = [{ role: 'user', content: options.prompt }];
        } else {
          messages = options.prompt.map((msg) => {
            if (msg.role === 'user' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'user' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'assistant' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'system') {
              return { role: 'system' as const, content: msg.content };
            }
            return { role: 'user' as const, content: '' };
          });
        }
      }

      const stream = await openai.chat.completions.create({
        model: modelName,
        stream: true,
        messages: messages.length ? messages : [{ role: 'user', content: 'Hello' }],
      });

      const readableStream = new ReadableStream({
        async start(controller) {
          try {
            for await (const chunk of stream) {
              const delta = chunk.choices[0]?.delta?.content;
              if (delta) {
                controller.enqueue({
                  type: 'text-delta' as const,
                  textDelta: delta,
                });
              }
            }
            controller.close();
          } catch (error) {
            controller.error(error);
          }
        },
      });

      return {
        stream: readableStream,
        rawCall: {
          rawPrompt: messages,
          rawSettings: {},
        },
      };
    },
    doGenerate: async (options) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      let messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [];
      
      if (options.prompt) {
        if (typeof options.prompt === 'string') {
          messages = [{ role: 'user', content: options.prompt }];
        } else {
          messages = options.prompt.map((msg) => {
            if (msg.role === 'user' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'user' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'assistant' && Array.isArray(msg.content)) {
              const textParts = msg.content.filter((part): part is { type: 'text'; text: string } => part.type === 'text');
              return { role: 'assistant' as const, content: textParts.map(p => p.text).join('') };
            }
            if (msg.role === 'system') {
              return { role: 'system' as const, content: msg.content };
            }
            return { role: 'user' as const, content: '' };
          });
        }
      }

      const response = await openai.chat.completions.create({
        model: modelName,
        messages: messages.length ? messages : [{ role: 'user', content: 'Hello' }],
      });

      const text = response.choices[0]?.message?.content ?? '';
      const promptTokens = response.usage?.prompt_tokens ?? 0;
      const completionTokens = response.usage?.completion_tokens ?? 0;

      return {
        text,
        finishReason: response.choices[0]?.finish_reason === 'stop' ? 'stop' : 'other',
        usage: {
          promptTokens,
          completionTokens,
        },
        rawCall: {
          rawPrompt: messages,
          rawSettings: {},
        },
      };
    },
  };
}

// 🧹 Clean up to free WASM memory
process.on('exit', () => {
  titleTokenizer.free();
  artifactTokenizer.free();
});
