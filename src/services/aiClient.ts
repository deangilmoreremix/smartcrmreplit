/**
 * Browser client for the server-side AI gateway (netlify/functions/ai.ts).
 *
 * Every AI feature in the app should go through this module. Provider API keys
 * live only on the server; the browser sends the user's Supabase session token.
 */
import { supabase } from '../lib/supabase';
import { getPreferredModel } from './aiModels';

export type AIProvider = 'openai';

export interface AIChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}

export interface AIChatOptions {
  system?: string;
  messages?: AIChatMessage[];
  temperature?: number;
  maxTokens?: number;
  images?: string[];
  tools?: unknown[];
  /** Let OpenAI search the web (Responses API web_search tool); sources come back in `citations`. */
  webSearch?: boolean;
  model?: string;
  signal?: AbortSignal;
}

export interface AIChatResult {
  text: string;
  provider: AIProvider;
  model: string;
  toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  citations?: Array<{ url: string; title?: string }>;
  usage?: unknown;
}

/** GPT Image 2.6 options (Images API). */
export interface ImageOptions {
  /** gpt-image-2.6-flare (fast, default for generation) or gpt-image-2.6-sunburst (detail, default for edits) */
  model?: 'gpt-image-2.6-flare' | 'gpt-image-2.6-sunburst';
  size?: 'auto' | '1024x1024' | '1536x1024' | '1024x1536' | string;
  quality?: 'auto' | 'low' | 'medium' | 'high' | 'xhigh' | 'max';
  n?: number;
  background?: 'auto' | 'opaque' | 'transparent';
  output_format?: 'png' | 'jpeg' | 'webp' | 'gif' | 'svg';
  output_compression?: number;
  moderation?: 'auto' | 'low';
  /** How much the model plans before rendering; low is fastest and recommended for most edits. */
  complexity?: 'low' | 'medium' | 'high';
  /** GIF only: 2–16 frames, and per-frame duration in ms. */
  frame_count?: number;
  frame_duration_ms?: number;
}

export interface ImageEditOptions extends ImageOptions {
  /** PNG with transparent areas marking where to edit (applies to the first image). */
  mask?: string;
  /** Transparent PNG with drawn marks over the first image (same dimensions); not with mask. */
  markup?: string;
  input_fidelity?: 'high' | 'low';
}

export interface ImageResult {
  images: string[];
  revisedPrompt?: string;
  outputFormat?: string;
  size?: string;
  model: string;
  usage?: unknown;
}

const IMAGE_MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

export interface AIStatus {
  configured: boolean;
  primary: AIProvider | null;
  providers: { openai: { configured: boolean; model: string } };
  capabilities: Record<'chat' | 'vision' | 'image' | 'imageEdit' | 'webSearch' | 'transcribe' | 'embed' | 'tools', boolean>;
  imageModels?: { generate: string; edit: string; available: string[] };
}

export class AIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'AIError';
  }
}

const BASE = '/api/ai';

async function authHeaders(): Promise<Record<string, string>> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function request<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  if (init.json && typeof init.json === 'object' && !(init.json as any).model) {
    const model = getPreferredModel();
    if (model) init = { ...init, json: { ...(init.json as object), model } };
  }
  const headers: Record<string, string> = { ...(await authHeaders()) };
  let body = init.body;
  if (init.json !== undefined) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(init.json);
  }

  let res: Response;
  try {
    res = await fetch(`${BASE}/${path}`, { ...init, headers: { ...headers, ...(init.headers as any) }, body });
  } catch (e: any) {
    if (e?.name === 'AbortError') throw e;
    throw new AIError('Could not reach the AI service. Check your connection and try again.');
  }

  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new AIError(
      res.status === 504 || res.status === 502
        ? 'The AI request took too long and the server timed out. Try a shorter request or a faster setting.'
        : 'The AI service is not available on this deployment (the /api/ai function did not respond).',
      res.status,
    );
  }
  const data = await res.json();
  if (!res.ok || data?.error) throw new AIError(data?.error || `AI request failed (${res.status})`, res.status);
  return data as T;
}

/** Remove ```json fences and parse the first JSON value found in a model reply. */
export function parseJSONResponse<T = any>(text: string): T {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const cleaned = (fenced ? fenced[1] : text).trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) return JSON.parse(match[0]);
    throw new AIError('The AI returned a response that could not be parsed.');
  }
}

export const aiClient = {
  /** Free-form text generation. */
  async chat(prompt: string, opts: AIChatOptions = {}): Promise<AIChatResult> {
    const { signal, ...rest } = opts;
    return request<AIChatResult>('chat', { method: 'POST', json: { prompt: prompt || undefined, ...rest }, signal });
  },

  /** Convenience: returns only the generated text. */
  /** Text grounded in a live web search; appends a Markdown "Sources" list from the citations. */
  async researchText(prompt: string, opts: AIChatOptions = {}): Promise<string> {
    const res = await aiClient.chat(prompt, { ...opts, webSearch: true });
    if (!res.citations?.length) return res.text;
    const sources = res.citations.map((c) => `- [${c.title || c.url}](${c.url})`).join('\n');
    return `${res.text}\n\n## Sources\n${sources}`;
  },

  async text(prompt: string, opts: AIChatOptions = {}): Promise<string> {
    return (await aiClient.chat(prompt, opts)).text;
  },

  /** Structured generation. The prompt should describe the JSON shape expected. */
  async json<T = any>(prompt: string, opts: AIChatOptions = {}): Promise<T> {
    const { signal, ...rest } = opts;
    const res = await request<AIChatResult & { json?: T }>('chat', {
      method: 'POST',
      json: { prompt, json: true, ...rest },
      signal,
    });
    return (res.json ?? parseJSONResponse<T>(res.text)) as T;
  },

  async analyzeImage(prompt: string, images: string[], opts: AIChatOptions & { json?: boolean } = {}) {
    const { signal, ...rest } = opts;
    const res = await request<AIChatResult & { json?: any }>('vision', {
      method: 'POST',
      json: { prompt, images, ...rest },
      signal,
    });
    return res;
  },

  /** Generate images with GPT Image 2.6 (Images API). */
  async generateImage(prompt: string, opts: ImageOptions = {}): Promise<ImageResult> {
    return request<ImageResult>('image', { method: 'POST', json: { prompt, ...opts } });
  },

  /** Edit up to 16 reference images with GPT Image 2.6, optionally with a mask or markup overlay. */
  async editImage(prompt: string, images: string[], opts: ImageEditOptions = {}): Promise<ImageResult> {
    return request<ImageResult>('image-edit', { method: 'POST', json: { prompt, images, ...opts } });
  },

  /**
   * Generate or edit with streamed partial previews (PNG/JPEG/WebP only).
   * `onPartial` receives progressively better previews; resolves with the final image.
   */
  async streamImage(
    kind: 'generate' | 'edit',
    prompt: string,
    opts: ImageEditOptions & { images?: string[] } = {},
    onPartial?: (dataUrl: string, index: number) => void,
  ): Promise<ImageResult> {
    const format = opts.output_format || 'png';
    if (format === 'gif' || format === 'svg') {
      return kind === 'edit' ? aiClient.editImage(prompt, opts.images || [], opts) : aiClient.generateImage(prompt, opts);
    }
    const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(await authHeaders()) };
    let res: Response;
    try {
      res = await fetch(`${BASE}/${kind === 'edit' ? 'image-edit' : 'image'}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, ...opts, stream: true, partial_images: 2 }),
      });
    } catch {
      throw new AIError('Could not reach the AI service. Check your connection and try again.');
    }
    const type = res.headers.get('content-type') || '';
    if (type.includes('application/json')) {
      const data = await res.json();
      if (!res.ok || data?.error) throw new AIError(data?.error || `Image request failed (${res.status})`, res.status);
      return data as ImageResult;
    }
    if (!res.ok || !res.body || !type.includes('text/event-stream')) {
      throw new AIError(
        res.status === 504 || res.status === 502
          ? 'Image generation took too long for the server. Try Flare, lower quality or lower complexity.'
          : `Image request failed (${res.status})`,
        res.status,
      );
    }

    const mime = IMAGE_MIME[format] || 'image/png';
    const model = res.headers.get('x-image-model') || '';
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final: ImageResult | null = null;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';
      for (const evt of events) {
        const data = evt.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).join('');
        if (!data || data === '[DONE]') continue;
        let msg: any;
        try {
          msg = JSON.parse(data);
        } catch {
          continue;
        }
        if (msg.type?.endsWith('.partial_image') && msg.b64_json) {
          onPartial?.(`data:${mime};base64,${msg.b64_json}`, msg.partial_image_index ?? 0);
        } else if (msg.type?.endsWith('.completed') && msg.b64_json) {
          final = { images: [`data:${mime};base64,${msg.b64_json}`], outputFormat: format, model, usage: msg.usage };
        } else if (msg.type === 'error' || msg.error) {
          throw new AIError(msg.error?.message || msg.message || 'Image generation failed');
        }
      }
    }
    if (!final) throw new AIError('The image stream ended before the image was finished. Please try again.');
    return final;
  },

  async transcribe(file: Blob, filename = 'audio.webm'): Promise<string> {
    const form = new FormData();
    form.append('file', file, filename);
    const res = await request<{ text: string }>('transcribe', { method: 'POST', body: form });
    return res.text;
  },

  async embed(input: string | string[]): Promise<number[][]> {
    const res = await request<{ embeddings: number[][] }>('embed', { method: 'POST', json: { input } });
    return res.embeddings;
  },

  async status(): Promise<AIStatus> {
    return request<AIStatus>('status', { method: 'GET' });
  },
};

let statusPromise: Promise<AIStatus> | null = null;
/** Cached status lookup (one network call per page load). */
export function getAIStatus(refresh = false): Promise<AIStatus> {
  if (!statusPromise || refresh) {
    statusPromise = aiClient.status().catch((e) => {
      statusPromise = null;
      throw e;
    });
  }
  return statusPromise;
}

export default aiClient;
