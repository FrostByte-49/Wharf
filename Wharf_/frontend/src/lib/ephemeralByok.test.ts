import { beforeEach, describe, expect, it } from 'vitest';
import {
  getEphemeralByokHeaders,
  getEphemeralByokKey,
  removeEphemeralByokKey,
  setEphemeralByokEnabled,
  setEphemeralByokKey,
} from './ephemeralByok';

describe('ephemeral BYOK session store', () => {
  beforeEach(() => sessionStorage.clear());

  it('returns headers only while ephemeral mode is enabled', () => {
    setEphemeralByokKey('openai', 'sk-session-only');
    expect(getEphemeralByokHeaders()).toEqual({});

    setEphemeralByokEnabled(true);
    expect(getEphemeralByokHeaders()).toEqual({ 'X-BYOK-OpenAI': 'sk-session-only' });
    expect(localStorage.length).toBe(0);
  });

  it('supports all four primary providers and removes keys independently', () => {
    setEphemeralByokEnabled(true);
    setEphemeralByokKey('gemini', 'gem-key');
    setEphemeralByokKey('openai', 'open-key');
    setEphemeralByokKey('groq', 'groq-key');
    setEphemeralByokKey('anthropic', 'anthropic-key');

    expect(Object.keys(getEphemeralByokHeaders())).toEqual([
      'X-BYOK-Gemini',
      'X-BYOK-OpenAI',
      'X-BYOK-Groq',
      'X-BYOK-Anthropic',
    ]);
    removeEphemeralByokKey('groq');
    expect(getEphemeralByokKey('groq')).toBe('');
    expect(getEphemeralByokKey('openai')).toBe('open-key');
  });

  it('rejects unknown providers, blank keys, and oversized headers', () => {
    expect(() => setEphemeralByokKey('deepseek', 'key')).toThrow(/Unsupported/);
    expect(() => setEphemeralByokKey('openai', '  ')).toThrow(/required/);
    expect(() => setEphemeralByokKey('openai', 'x'.repeat(513))).toThrow(/too long/);
  });
});
