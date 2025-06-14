import init, { get_encoding } from 'tiktoken/init';

let encoder: ReturnType<typeof get_encoding> | null = null;
let initPromise: Promise<any> | null = null;

export async function getTokenizer() {
  if (!encoder) {
    if (!initPromise) {
      // Load the wasm file manually
      initPromise = init(fetch('/tiktoken/tiktoken_bg.wasm'));
    }
    await initPromise;
    encoder = get_encoding('cl100k_base');
  }
  return encoder;
}
