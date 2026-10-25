import { KeyRouterService } from './keyRouter.service';
import { loggerService } from '../utils/logger';
import { GoogleGenAI } from '@google/genai';
import Groq from 'groq-sdk';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { buildReadmePrompt } from '../utils/promptBuilder';
import { buildProfilePrompt, ProfileData, ProfileOptions } from '../utils/profilePromptBuilder';
import { RepoContext } from './repo.service';
import type { EphemeralByokKey } from '../utils/ephemeralByok';

const SYSTEM_PROMPT = 'You are an expert technical writer and developer. You MUST follow every single instruction in the prompt strictly. Do not skip any requested sections, steps, or details. Provide extremely detailed, exhaustive, and rich content. Expand fully on all points without abbreviating or summarizing excessively. Your output must be highly verbose and comprehensive, guaranteeing high-quality content.';

// Groq Free Tier: 12k TPM Limit. ~8k Tokens For Input (~32k Chars), 4k For Output.
const GROQ_MAX_PROMPT_CHARS = 32000;
function truncateForGroq(prompt: string): string {
  if (prompt.length <= GROQ_MAX_PROMPT_CHARS) return prompt;
  return prompt.slice(0, GROQ_MAX_PROMPT_CHARS) + '\n\n[Note: context was trimmed to fit model limits — generate the best possible output from the above]';
}

export class AiService {
  private keyRouter: KeyRouterService;

  constructor(dbUrl: string) {
    this.keyRouter = new KeyRouterService(dbUrl);
  }

  // 1. README Generation
  async generateReadmeStream(
    context: RepoContext,
    tone: 'technical' | 'recruiter' | 'beginner',
    sections: string[],
    userId?: string,
    onChunk?: (text: string) => void,
    ephemeralKey?: EphemeralByokKey
  ): Promise<{ text: string; provider: string }> {

    const keyInfo = ephemeralKey
      ? { id: 'request-ephemeral', key: ephemeralKey.key, provider: ephemeralKey.provider, isSystem: false }
      : await this.keyRouter.getBestAvailableKey(userId, ['GEMINI', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'GROK']);

    if (!keyInfo) {
      throw new Error(
        'No API Keys Available. Please Add Your Own API Key In Settings To Continue.'
      );
    }

    loggerService.providerSelected(keyInfo.provider.toUpperCase(), { keyType: keyInfo.isSystem ? 'system' : 'user', feature: 'README' });
    
    const promptStart = loggerService.stepStart();
    const prompt = buildReadmePrompt(context, tone, sections);
    loggerService.stepEnd('prompt.construction.completed', 'Prompt Construction', promptStart, { feature: 'README' });
    
    let fullText = '';
    const aiStart = loggerService.stepStart();

    try {
      loggerService.providerStarted(keyInfo.provider.toUpperCase(), { feature: 'README' });
      switch (keyInfo.provider.toUpperCase()) {
        case 'GEMINI': {
          const genAI = new GoogleGenAI({ apiKey: keyInfo.key });
          const result = await genAI.models.generateContentStream({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              systemInstruction: SYSTEM_PROMPT
            }
          });
          for await (const chunk of result) {
            const text = chunk.text || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'OPENAI': {
          const openai = new OpenAI({ apiKey: keyInfo.key });
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'GROQ': {
          const groq = new Groq({ apiKey: keyInfo.key });
          const stream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: truncateForGroq(prompt) }],
            stream: true,
            max_tokens: 4000,
            temperature: 0.7,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'ANTHROPIC': {
          const anthropic = new Anthropic({ apiKey: keyInfo.key });
          const stream = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          });
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullText += text;
              if (onChunk) onChunk(text);
            }
          }
          break;
        }

        case 'DEEPSEEK': {
          const deepseek = new OpenAI({
            apiKey: keyInfo.key,
            baseURL: 'https://api.deepseek.com/v1',
          });
          const stream = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'GROK': {
          const grok = new OpenAI({ apiKey: keyInfo.key, baseURL: 'https://api.x.ai/v1' });
          const stream = await grok.chat.completions.create({
            model: 'grok-beta',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        default:
          throw new Error(`Unsupported provider: ${keyInfo.provider}`);
      }
      loggerService.providerCompleted(keyInfo.provider.toUpperCase(), Date.now() - aiStart, { feature: 'README' });
      return { text: fullText, provider: keyInfo.provider.toUpperCase() };
    } catch (error: any) {
      if (
        error.status === 429 ||
        error.status === 503 ||
        error.status === 403 ||
        error.status === 413 ||
        error.status === 400 ||
        error.status === 402 ||
        error.message?.includes('429') ||
        error.message?.includes('503') ||
        error.message?.includes('403') ||
        error.message?.includes('413') ||
        error.message?.includes('400') ||
        error.message?.includes('Request too large') ||
        error.message?.includes('Failed to parse stream') ||
        error.message?.includes('Service Unavailable') ||
        error.message?.includes('Overloaded') ||
        error.message?.includes('Access denied')
      ) {
        if (ephemeralKey) {
          loggerService.providerFailed(keyInfo.provider.toUpperCase(), error);
          throw error;
        }
        loggerService.providerFallback(keyInfo.provider.toUpperCase(), 'NEXT_AVAILABLE', error);
        await this.keyRouter.markAsExhausted(keyInfo.id, keyInfo.isSystem);
        return this.generateReadmeStream(context, tone, sections, userId, onChunk);
      }
      loggerService.providerFailed(keyInfo.provider.toUpperCase(), error);
      throw error;
    }
  }

  // 2. Profile Generation
  async generateProfileStream(
    profileData: ProfileData,
    options: ProfileOptions,
    userId?: string,
    onChunk?: (text: string) => void
  ): Promise<{ text: string; provider: string }> {
    
    // Fetch key AND build prompt in parallel — both are independent
    const [keyInfo, prompt] = await Promise.all([
      this.keyRouter.getBestAvailableKey(userId, ['GROQ', 'PROXY_OPENAI', 'GEMINI', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'GROK']),
      Promise.resolve(buildProfilePrompt(profileData, options)),
    ]);

    if (!keyInfo) {
      throw new Error(
        'No API Keys Available. Please Add Your Own API Key In Settings To Continue.'
      );
    }

    loggerService.providerSelected(keyInfo.provider.toUpperCase(), { keyType: keyInfo.isSystem ? 'system' : 'user', feature: 'PROFILE' });
    let fullText = '';
    const aiStart = loggerService.stepStart();

    try {
      loggerService.providerStarted(keyInfo.provider.toUpperCase(), { feature: 'PROFILE' });
      switch (keyInfo.provider.toUpperCase()) {
        case 'GEMINI': {
          const genAI = new GoogleGenAI({ apiKey: keyInfo.key });
          const result = await genAI.models.generateContentStream({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              systemInstruction: SYSTEM_PROMPT
            }
          });
          for await (const chunk of result) {
            const text = chunk.text || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'GROQ': {
          const groq = new Groq({ apiKey: keyInfo.key });
          const stream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: truncateForGroq(prompt) }],
            stream: true,
            max_tokens: 4000,
            temperature: 0.7,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'OPENAI': {
          const openai = new OpenAI({ apiKey: keyInfo.key });
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'ANTHROPIC': {
          const anthropic = new Anthropic({ apiKey: keyInfo.key });
          const stream = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          });
          for await (const event of stream) {
            if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
              const text = event.delta.text;
              fullText += text;
              if (onChunk) onChunk(text);
            }
          }
          break;
        }

        case 'DEEPSEEK': {
          const deepseek = new OpenAI({
            apiKey: keyInfo.key,
            baseURL: 'https://api.deepseek.com/v1',
          });
          const stream = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'GROK': {
          const grok = new OpenAI({ apiKey: keyInfo.key, baseURL: 'https://api.x.ai/v1' });
          const stream = await grok.chat.completions.create({
            model: 'grok-beta',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        case 'PROXY_OPENAI': {
          const proxyOpenai = new OpenAI({ apiKey: keyInfo.key, baseURL: 'https://api.chatanywhere.tech' });
          const stream = await proxyOpenai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT + ' You MUST provide extremely verbose, comprehensive, and detailed output. Follow the exact prompt strictly and deliver high-quality rich content.' },
              { role: 'user', content: prompt }
            ],
            stream: true,
          });
          for await (const chunk of stream) {
            const text = chunk.choices[0]?.delta?.content || '';
            fullText += text;
            if (onChunk) onChunk(text);
          }
          break;
        }

        default:
          throw new Error(`Unsupported provider: ${keyInfo.provider}`);
      }
      loggerService.providerCompleted(keyInfo.provider.toUpperCase(), Date.now() - aiStart, { feature: 'PROFILE' });
      return { text: fullText, provider: keyInfo.provider.toUpperCase() };
    } catch (error: any) {
      if (
        error.status === 429 ||
        error.status === 503 ||
        error.status === 403 ||
        error.status === 413 ||
        error.status === 402 ||
        error.message?.includes('429') ||
        error.message?.includes('503') ||
        error.message?.includes('403') ||
        error.message?.includes('413') ||
        error.message?.includes('Request too large') ||
        error.message?.includes('Failed to parse stream') ||
        error.message?.includes('Service Unavailable') ||
        error.message?.includes('Overloaded') ||
        error.message?.includes('Access denied')
      ) {
        loggerService.providerFallback(keyInfo.provider.toUpperCase(), 'NEXT_AVAILABLE', error);
        await this.keyRouter.markAsExhausted(keyInfo.id, keyInfo.isSystem);
        return this.generateProfileStream(profileData, options, userId, onChunk);
      }
      loggerService.providerFailed(keyInfo.provider.toUpperCase(), error);
      throw error;
    }
  }

  // 3. Changelog Generation
  async generateChangelogStream(prompt: string, userId?: string): Promise<{ stream: AsyncGenerator<string>; provider: string }> {
    
    const keyInfo = await this.keyRouter.getBestAvailableKey(userId, ['GEMINI', 'PROXY_OPENAI', 'OPENAI', 'ANTHROPIC', 'DEEPSEEK', 'GROK']);

    if (!keyInfo) {
      throw new Error('No API Keys Available. Please Add Your Own API Key In Settings To Continue.');
    }

    let generator: AsyncGenerator<string>;

    try {
      loggerService.providerStarted(keyInfo.provider.toUpperCase(), { feature: 'CHANGELOG' });
      switch (keyInfo.provider.toUpperCase()) {
        case 'GEMINI': {
          const genAI = new GoogleGenAI({ apiKey: keyInfo.key });
          const result = await genAI.models.generateContentStream({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
              systemInstruction: SYSTEM_PROMPT
            }
          });
          generator = (async function* () {
            for await (const chunk of result) {
              yield chunk.text || '';
            }
          })();
          break;
        }

        case 'GROQ': {
          const groq = new Groq({ apiKey: keyInfo.key });
          const stream = await groq.chat.completions.create({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: truncateForGroq(prompt) }],
            stream: true,
            max_tokens: 4000,
            temperature: 0.7,
          });
          generator = (async function* () {
            for await (const chunk of stream) {
              yield chunk.choices[0]?.delta?.content || '';
            }
          })();
          break;
        }

        case 'OPENAI': {
          const openai = new OpenAI({ apiKey: keyInfo.key });
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          generator = (async function* () {
            for await (const chunk of stream) {
              yield chunk.choices[0]?.delta?.content || '';
            }
          })();
          break;
        }

        case 'ANTHROPIC': {
          const anthropic = new Anthropic({ apiKey: keyInfo.key });
          const stream = await anthropic.messages.create({
            model: 'claude-3-haiku-20240307',
            max_tokens: 4096,
            system: SYSTEM_PROMPT,
            messages: [{ role: 'user', content: prompt }],
            stream: true,
          });
          generator = (async function* () {
            for await (const event of stream) {
              if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
                yield event.delta.text;
              }
            }
          })();
          break;
        }

        case 'DEEPSEEK': {
          const deepseek = new OpenAI({
            apiKey: keyInfo.key,
            baseURL: 'https://api.deepseek.com/v1',
          });
          const stream = await deepseek.chat.completions.create({
            model: 'deepseek-chat',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          generator = (async function* () {
            for await (const chunk of stream) {
              yield chunk.choices[0]?.delta?.content || '';
            }
          })();
          break;
        }

        case 'GROK': {
          const grok = new OpenAI({ apiKey: keyInfo.key, baseURL: 'https://api.x.ai/v1' });
          const stream = await grok.chat.completions.create({
            model: 'grok-beta',
            messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: prompt }],
            stream: true,
          });
          generator = (async function* () {
            for await (const chunk of stream) {
              yield chunk.choices[0]?.delta?.content || '';
            }
          })();
          break;
        }

        case 'PROXY_OPENAI': {
          const proxyOpenai = new OpenAI({ apiKey: keyInfo.key, baseURL: 'https://api.chatanywhere.tech' });
          const stream = await proxyOpenai.chat.completions.create({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: SYSTEM_PROMPT + ' You MUST provide extremely verbose, comprehensive, and detailed output. Follow the exact prompt strictly and deliver high-quality rich content.' },
              { role: 'user', content: prompt }
            ],
            stream: true,
          });
          generator = (async function* () {
            for await (const chunk of stream) {
              yield chunk.choices[0]?.delta?.content || '';
            }
          })();
          break;
        }

        default:
          throw new Error(`Unsupported provider: ${keyInfo.provider}`);
      }
      return { stream: generator, provider: keyInfo.provider.toUpperCase() };
    } catch (error: any) {
      if (
        error.status === 429 ||
        error.status === 503 ||
        error.status === 403 ||
        error.message?.includes('429')
      ) {
        loggerService.providerFallback(keyInfo.provider.toUpperCase(), 'NEXT_AVAILABLE', error);
        await this.keyRouter.markAsExhausted(keyInfo.id, keyInfo.isSystem);
        return this.generateChangelogStream(prompt, userId);
      }
      loggerService.providerFailed(keyInfo.provider.toUpperCase(), error);
      throw error;
    }
  }
}
