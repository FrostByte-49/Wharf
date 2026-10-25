import type { Context } from 'hono';

export type EphemeralProvider = 'GEMINI' | 'OPENAI' | 'GROQ' | 'ANTHROPIC';
export type EphemeralByokKey = { provider: EphemeralProvider; key: string };

const PROVIDER_HEADERS: Array<[EphemeralProvider, string]> = [
  ['GEMINI', 'X-BYOK-Gemini'],
  ['OPENAI', 'X-BYOK-OpenAI'],
  ['GROQ', 'X-BYOK-Groq'],
  ['ANTHROPIC', 'X-BYOK-Anthropic'],
];

const MAX_EPHEMERAL_KEY_LENGTH = 512;

/** Read a single request-scoped override without logging or persisting it. */
export function readEphemeralByok(c: Context): EphemeralByokKey | null {
  for (const [provider, header] of PROVIDER_HEADERS) {
    const key = c.req.header(header)?.trim();
    if (!key) continue;
    if (key.length > MAX_EPHEMERAL_KEY_LENGTH) {
      throw new Error(`${header} exceeds the maximum supported length`);
    }
    return { provider, key };
  }
  return null;
}
