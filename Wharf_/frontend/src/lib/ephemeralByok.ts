export const EPHEMERAL_BYOK_PROVIDERS = ['gemini', 'openai', 'groq', 'anthropic'] as const;
export type EphemeralByokProvider = typeof EPHEMERAL_BYOK_PROVIDERS[number];

const MODE_KEY = 'wharf_ephemeral_byok_enabled';
const KEY_PREFIX = 'wharf_ephemeral_byok_';
const PROVIDER_HEADERS: Record<EphemeralByokProvider, string> = {
  gemini: 'X-BYOK-Gemini',
  openai: 'X-BYOK-OpenAI',
  groq: 'X-BYOK-Groq',
  anthropic: 'X-BYOK-Anthropic',
};

export function isEphemeralByokEnabled(): boolean {
  try {
    return sessionStorage.getItem(MODE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setEphemeralByokEnabled(enabled: boolean): void {
  try {
    if (enabled) sessionStorage.setItem(MODE_KEY, 'true');
    else sessionStorage.removeItem(MODE_KEY);
  } catch {
    // A blocked session store means ephemeral BYOK remains unavailable.
  }
}

export function getEphemeralByokKey(provider: string): string {
  if (!EPHEMERAL_BYOK_PROVIDERS.includes(provider.toLowerCase() as EphemeralByokProvider)) return '';
  try {
    return sessionStorage.getItem(`${KEY_PREFIX}${provider.toLowerCase()}`) || '';
  } catch {
    return '';
  }
}

export function setEphemeralByokKey(provider: string, key: string): void {
  const normalized = provider.toLowerCase() as EphemeralByokProvider;
  if (!EPHEMERAL_BYOK_PROVIDERS.includes(normalized)) {
    throw new Error(`Unsupported ephemeral BYOK provider: ${provider}`);
  }
  const trimmed = key.trim();
  if (!trimmed) throw new Error('API key is required');
  if (trimmed.length > 512) throw new Error('API key is too long');
  sessionStorage.setItem(`${KEY_PREFIX}${normalized}`, trimmed);
}

export function removeEphemeralByokKey(provider: string): void {
  try {
    sessionStorage.removeItem(`${KEY_PREFIX}${provider.toLowerCase()}`);
  } catch {
    // Already unavailable/cleared.
  }
}

export function getEphemeralByokHeaders(): Record<string, string> {
  if (!isEphemeralByokEnabled()) return {};
  const headers: Record<string, string> = {};
  EPHEMERAL_BYOK_PROVIDERS.forEach((provider) => {
    const key = getEphemeralByokKey(provider);
    if (key) headers[PROVIDER_HEADERS[provider]] = key;
  });
  return headers;
}
