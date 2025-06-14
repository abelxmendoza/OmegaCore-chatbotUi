// File: lib/ai/providers.ts

import {
  customProvider,
  wrapLanguageModel,
  extractReasoningMiddleware,
} from 'ai';
import type { LanguageModel } from 'ai';

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
function createTokenizer(modelName: string) {
  const enc = encoding_for_model(modelName);
  return {
    tokenizer: {
      encode: (text: string) => enc.encode(text),
      decode: (tokens: number[]) => enc.decode(Uint8Array.from(tokens)),
    },
    getTokenCount: (text: string) => enc.encode(text).length,
    free: () => enc.free(),
  };
}

// 🔧 Tokenizers for each model usage
const titleTokenizer = createTokenizer('gpt-4');
const artifactTokenizer = createTokenizer('gpt-4');

// 🔌 Provider setup using ai SDK
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
        tokenizer: titleTokenizer.tokenizer,
        getTokenCount: titleTokenizer.getTokenCount,
      },
    }),

    'artifact-model': wrapLanguageModel({
      model: {
        doGenerate: callOpenAIOnce('gpt-4'),
        tokenizer: artifactTokenizer.tokenizer,
        getTokenCount: artifactTokenizer.getTokenCount,
      },
    }),
  },
});

/** 🔄 One-shot completion for non-streaming model use */
function callOpenAIOnce(modelName: string): LanguageModel['doGenerate'] {
  return async ({ messages }) => {
    const { default: OpenAI } = await import('openai');
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const response = await openai.chat.completions.create({
      model: modelName,
      messages: messages?.length
        ? messages
        : [{ role: 'user', content: 'Hello' }],
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

/** 🧵 Streaming chat completion */
function streamOpenAIModel(modelName: string): LanguageModel {
  return {
    doStream: async ({ messages, emit }) => {
      const { default: OpenAI } = await import('openai');
      const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

      const stream = await openai.chat.completions.create({
        model: modelName,
        stream: true,
        messages,
      });

      let full = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          full += delta;
          emit({ role: 'assistant', content: delta });
        }
      }

      return { messages: [{ role: 'assistant', content: full }] };
    },
  };
}

// 🧹 Clean up to free WASM memory
process.on('exit', () => {
  titleTokenizer.free();
  artifactTokenizer.free();
});
