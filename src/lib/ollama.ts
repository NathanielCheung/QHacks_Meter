/**
 * Ollama client for optional LLM-backed chatbot responses.
 * Disabled by default; set VITE_USE_OLLAMA=true and run Ollama locally to enable.
 */

const OLLAMA_URL = (import.meta.env.VITE_OLLAMA_URL as string) || 'http://localhost:11434';
const OLLAMA_MODEL = (import.meta.env.VITE_OLLAMA_MODEL as string) || 'llama3.2';

export interface OllamaGenerateOptions {
  model?: string;
  system?: string;
  stream?: boolean;
}

/**
 * Send a prompt to Ollama and return the generated text.
 * Throws on network error or non-OK response so caller can fall back to rule-based logic.
 */
export async function askOllama(
  prompt: string,
  systemPrompt?: string,
  options: OllamaGenerateOptions = {}
): Promise<string> {
  const url = `${OLLAMA_URL.replace(/\/$/, '')}/api/generate`;
  const body = {
    model: options.model ?? OLLAMA_MODEL,
    prompt,
    system: systemPrompt ?? undefined,
    stream: options.stream ?? false,
  };

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.status} ${res.statusText}`);
  }

  const data = (await res.json()) as { response?: string };
  const text = data.response?.trim();
  if (typeof text !== 'string') {
    throw new Error('Ollama returned no response text');
  }
  return text;
}
