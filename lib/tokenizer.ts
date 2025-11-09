import { init, get_encoding } from 'tiktoken/init';

let encoder: ReturnType<typeof get_encoding> | null = null;
let initPromise: Promise<void> | null = null;

export async function getTokenizer() {
  if (!encoder) {
    if (!initPromise) {
      // Load the wasm file manually
      const wasmResponse = await fetch('/tiktoken/tiktoken_bg.wasm');
      const wasmBuffer = await wasmResponse.arrayBuffer();
      initPromise = init((imports) =>
        WebAssembly.instantiate(wasmBuffer, imports)
      ) as Promise<void>;
    }
    await initPromise;
    encoder = get_encoding('cl100k_base');
  }
  return encoder;
}
