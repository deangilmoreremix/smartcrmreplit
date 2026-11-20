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
  model?: string;
  signal?: AbortSignal;
}

export interface AIChatResult {
  text: string;
  provider: AIProvider;
  model: string;
  toolCalls?: Array<{ id: string; type: 'function'; function: { name: string; arguments: string } }>;
  usage?: unknown;
}

export interface AIStatus {
  configured: boolean;
  primary: AIProvider | null;
  providers: { openai: { configured: boolean; model: string } };
  capabilities: Record<'chat' | 'vision' | 'image' | 'transcribe' | 'embed' | 'tools', boolean>;
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
      'The AI service is not available on this deployment (the /api/ai function did not respond).',
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

  async generateImage(prompt: string, opts: { size?: string; n?: number; quality?: string; style?: string } = {}) {
    return request<{ images: string[]; revisedPrompt?: string; model: string }>('image', {
      method: 'POST',
      json: { prompt, ...opts },
    });
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
