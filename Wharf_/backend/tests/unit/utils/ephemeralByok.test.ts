import { describe, expect, it } from 'vitest';
import { readEphemeralByok } from '../../../src/utils/ephemeralByok';
import { createMockContext } from '../test-utils';

describe('readEphemeralByok', () => {
  it.each([
    ['X-BYOK-Gemini', 'GEMINI'],
    ['X-BYOK-OpenAI', 'OPENAI'],
    ['X-BYOK-Groq', 'GROQ'],
    ['X-BYOK-Anthropic', 'ANTHROPIC'],
  ])('reads %s without modifying or persisting it', (header, provider) => {
    const context = createMockContext({ headers: { [header]: '  request-secret  ' } });
    expect(readEphemeralByok(context)).toEqual({ provider, key: 'request-secret' });
  });

  it('returns null when no supported header is present', () => {
    expect(readEphemeralByok(createMockContext())).toBeNull();
  });

  it('rejects oversized values', () => {
    const context = createMockContext({ headers: { 'X-BYOK-OpenAI': 'x'.repeat(513) } });
    expect(() => readEphemeralByok(context)).toThrow(/maximum supported length/);
  });
});
