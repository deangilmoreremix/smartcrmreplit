/**
 * Server-side AI gateway for SmartCRM (OpenAI Responses API + Images API with GPT Image 2.6).
 *
 * All AI calls from the browser go through /api/ai/* (see netlify.toml), so
 * provider API keys stay on the server and never ship in the JS bundle.
 *
 * Provider: OpenAI.
 *
 * Environment variables (set in Netlify → Site configuration → Environment variables):
 *   OPENAI_API_KEY            OpenAI API key (required)
 *   OPENAI_MODEL              default model, called via the Responses API (default: gpt-6.2-sol)
 *   OPENAI_REASONING_EFFORT   reasoning effort for reasoning models: minimal|low|medium|high|xhigh|max
 *                             (default: low — fast enough for interactive CRM tools)
 *   OPENAI_IMAGE_MODEL        image generation model        (default: gpt-image-2.6-flare — fast)
 *   OPENAI_IMAGE_EDIT_MODEL   image editing model           (default: gpt-image-2.6-sunburst — detail/consistency)
 *   OPENAI_TRANSCRIBE_MODEL   speech-to-text model          (default: whisper-1)
 *   OPENAI_EMBEDDING_MODEL    embedding model               (default: text-embedding-3-small)
 *   AI_REQUIRE_AUTH           "false" to allow calls without a Supabase session (default: required
 *                             whenever SUPABASE_URL / VITE_SUPABASE_URL is configured)
 */

import { createHash } from 'node:crypto';

type Role = 'system' | 'user' | 'assistant' | 'tool';

interface ChatMessage {
  role: Role;
  content: string | null;
  tool_calls?: unknown;
  tool_call_id?: string;
  name?: string;
}

interface ChatRequest {
  prompt?: string;
  system?: string;
  messages?: ChatMessage[];
  json?: boolean;
  temperature?: number;
  maxTokens?: number;
  images?: string[]; // data: URLs or https URLs
  tools?: unknown[];
  /** Let the model search the web (Responses API built-in web_search tool). */
  webSearch?: boolean;
  model?: string;
  /** Hashed user id, set by the router (not by the client). */
  safetyIdentifier?: string;
}

const env = (name: string): string | undefined => {
  const v = process.env[name];
  return v && v.trim() && !v.startsWith('your_') ? v.trim() : undefined;
};

const OPENAI_KEY = () => env('OPENAI_API_KEY');
const OPENAI_MODEL = () => env('OPENAI_MODEL') || 'gpt-6.2-sol';
const REASONING_EFFORT = () => env('OPENAI_REASONING_EFFORT') || 'low';

const JSON_HEADERS = { 'Content-Type': 'application/json' };

const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });

class HttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Auth: require a valid Supabase session so this isn't an open proxy.
// ---------------------------------------------------------------------------
async function checkAuth(req: Request): Promise<string | undefined> {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  if (env('AI_REQUIRE_AUTH') === 'false' || !supabaseUrl || !anonKey) return undefined;

  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in to use AI features.');

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!res.ok) throw new HttpError(401, 'Your session has expired. Please sign in again.');
  const user = await res.json().catch(() => ({}));
  return user?.id;
}

/** Stable, non-reversible per-user id for OpenAI abuse monitoring (no email or raw id sent). */
const safetyId = (userId?: string) =>
  userId ? createHash('sha256').update(`smartcrm:${userId}`).digest('hex').slice(0, 64) : undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
export function stripFences(text: string): string {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return (fenced ? fenced[1] : text).trim();
}

function tryParseJSON(text: string): unknown {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to pull the first {...} or [...] block out of the text.
    const match = cleaned.match(/[[{][\s\S]*[\]}]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        /* fall through */
      }
    }
    return undefined;
  }
}

function buildMessages(body: ChatRequest): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let system = body.system || '';
  if (body.json) {
    system = `${system}\n\nRespond ONLY with a valid JSON object. Do not wrap it in markdown.`.trim();
  }
  if (system) messages.push({ role: 'system', content: system });
  if (body.messages?.length) messages.push(...body.messages.filter((m) => m.role !== 'system' || !system));
  if (body.prompt) messages.push({ role: 'user', content: body.prompt });
  if (!messages.some((m) => m.role === 'user')) {
    throw new HttpError(400, 'Request must include a prompt or at least one user message.');
  }
  return messages;
}

// Reasoning models (o-series, GPT-5/6 families) don't take temperature and accept reasoning.effort.
const isReasoningModel = (model: string) => /^(o\d|gpt-5|gpt-6)/i.test(model);

async function providerError(res: Response, provider: string): Promise<never> {
  let detail = '';
  try {
    const data = await res.json();
    detail = data?.error?.message || JSON.stringify(data);
  } catch {
    detail = await res.text().catch(() => '');
  }
  throw new HttpError(res.status === 429 ? 429 : 502, `${provider} error (${res.status}): ${detail}`.slice(0, 500));
}

// ---------------------------------------------------------------------------
// OpenAI
// ---------------------------------------------------------------------------
/**
 * Convert the chat-style message list the app uses into Responses API input items.
 * - system messages become `instructions`
 * - assistant tool_calls become `function_call` items, tool messages `function_call_output`
 * - images/PDFs are attached to the last user message as input_image / input_file parts
 */
function toResponsesInput(messages: ChatMessage[], images: string[] = []) {
  const instructions = messages.filter((m) => m.role === 'system').map((m) => m.content).join('\n\n');
  const input: any[] = [];
  const lastUser = messages.map((m) => m.role).lastIndexOf('user');

  messages.forEach((m, i) => {
    if (m.role === 'system') return;
    if (m.role === 'tool') {
      input.push({ type: 'function_call_output', call_id: m.tool_call_id, output: m.content || '' });
      return;
    }
    if (m.role === 'assistant' && Array.isArray(m.tool_calls) && m.tool_calls.length) {
      if (m.content) input.push({ role: 'assistant', content: m.content });
      for (const call of m.tool_calls as any[]) {
        input.push({
          type: 'function_call',
          call_id: call.id,
          name: call.function?.name ?? call.name,
          arguments: call.function?.arguments ?? call.arguments ?? '{}',
        });
      }
      return;
    }
    if (m.role === 'user' && i === lastUser && images.length) {
      input.push({
        role: 'user',
        content: [
          { type: 'input_text', text: m.content || '' },
          ...images.map((url, n) =>
            url.startsWith('data:application/pdf')
              ? { type: 'input_file', filename: `document-${n + 1}.pdf`, file_data: url }
              : { type: 'input_image', image_url: url },
          ),
        ],
      });
      return;
    }
    input.push({ role: m.role, content: m.content || '' });
  });
  return { instructions, input };
}

/** Accept tools in Chat Completions shape ({type, function:{...}}) or Responses shape (flat). */
function toResponsesTools(tools: unknown[] = []) {
  return tools.map((t: any) => (t.function ? { type: 'function', ...t.function } : t));
}

function extractText(data: any): string {
  if (typeof data.output_text === 'string') return data.output_text;
  return (data.output || [])
    .filter((item: any) => item.type === 'message')
    .flatMap((item: any) => item.content || [])
    .map((part: any) => (part.type === 'output_text' ? part.text : part.type === 'refusal' ? part.refusal : ''))
    .join('');
}

async function openaiChat(body: ChatRequest) {
  const key = OPENAI_KEY();
  if (!key) {
    throw new HttpError(503, 'AI is not configured: add OPENAI_API_KEY to your Netlify environment variables.');
  }
  // Only honour client model overrides that are OpenAI models.
  const model = body.model && /^(gpt-|o\d|chatgpt)/i.test(body.model) ? body.model : OPENAI_MODEL();
  const reasoning = isReasoningModel(model);
  const { instructions, input } = toResponsesInput(buildMessages(body), body.images);

  const payload: Record<string, unknown> = { model, input, store: false };
  if (instructions) payload.instructions = instructions;
  if (reasoning) payload.reasoning = { effort: REASONING_EFFORT() };
  else if (body.temperature !== undefined) payload.temperature = body.temperature;
  // max_output_tokens includes reasoning tokens, so leave headroom on reasoning models.
  if (body.maxTokens) payload.max_output_tokens = reasoning ? body.maxTokens + 4096 : body.maxTokens;
  if (body.json) payload.text = { format: { type: 'json_object' } };
  const tools = toResponsesTools(body.tools);
  if (body.webSearch) tools.push({ type: 'web_search' });
  if (tools.length) payload.tools = tools;
  if (body.safetyIdentifier) payload.safety_identifier = body.safetyIdentifier;

  const send = (p: Record<string, unknown>) =>
    fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { ...JSON_HEADERS, Authorization: `Bearer ${key}` },
      body: JSON.stringify(p),
    });

  let res = await send(payload);
  if (!res.ok && res.status === 400 && body.json) {
    // If this model rejects json_object, fall back to prompt-only JSON (instructions already ask for it).
    const detail = await res.clone().text();
    if (/format|json_object/i.test(detail)) {
      const { text: _omit, ...withoutFormat } = payload;
      res = await send(withoutFormat);
    }
  }
  if (!res.ok) await providerError(res, 'OpenAI');
  const data = await res.json();

  if (data.status === 'incomplete' && !extractText(data)) {
    throw new HttpError(502, `OpenAI returned an incomplete response (${data.incomplete_details?.reason || 'unknown reason'}).`);
  }

  // Return tool calls in Chat Completions shape so existing callers keep working.
  const toolCalls = (data.output || [])
    .filter((item: any) => item.type === 'function_call')
    .map((item: any) => ({ id: item.call_id, type: 'function', function: { name: item.name, arguments: item.arguments } }));

  // Web search results come back as url_citation annotations on the output text.
  const citations: Array<{ url: string; title?: string }> = [];
  for (const item of data.output || []) {
    for (const part of item.content || []) {
      for (const a of part.annotations || []) {
        if (a.type === 'url_citation' && a.url && !citations.some((c) => c.url === a.url)) {
          citations.push({ url: a.url, title: a.title });
        }
      }
    }
  }

  const u = data.usage || {};
  return {
    text: extractText(data),
    citations: citations.length ? citations : undefined,
    toolCalls: toolCalls.length ? toolCalls : undefined,
    provider: 'openai',
    model: data.model || model,
    usage: {
      prompt_tokens: u.input_tokens ?? 0,
      completion_tokens: u.output_tokens ?? 0,
      total_tokens: u.total_tokens ?? (u.input_tokens ?? 0) + (u.output_tokens ?? 0),
    },
  };
}

async function chat(body: ChatRequest) {
  const result = await openaiChat(body);
  return body.json ? { ...result, json: tryParseJSON(result.text) } : result;
}

// ---------------------------------------------------------------------------
// Other endpoints
// ---------------------------------------------------------------------------
// ---------------------------------------------------------------------------
// Images API — GPT Image 2.6 (gpt-image-2.6-flare: fast, gpt-image-2.6-sunburst: detail/editing)
// ---------------------------------------------------------------------------
const IMAGE_MODELS = ['gpt-image-2.6-flare', 'gpt-image-2.6-sunburst'];
const IMAGE_MODEL = () => env('OPENAI_IMAGE_MODEL') || 'gpt-image-2.6-flare';
const IMAGE_EDIT_MODEL = () => env('OPENAI_IMAGE_EDIT_MODEL') || 'gpt-image-2.6-sunburst';
const MIME: Record<string, string> = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };

interface ImageRequest {
  prompt: string;
  model?: string;
  size?: string;
  quality?: string;
  n?: number;
  background?: 'auto' | 'opaque' | 'transparent';
  output_format?: 'png' | 'jpeg' | 'webp' | 'gif' | 'svg';
  output_compression?: number;
  moderation?: 'auto' | 'low';
  complexity?: 'low' | 'medium' | 'high';
  frame_count?: number;
  frame_duration_ms?: number;
  stream?: boolean;
  partial_images?: number;
  // edits only
  images?: string[]; // data URLs or https URLs, up to 16
  mask?: string; // PNG with alpha; cannot be combined with markup
  markup?: string; // transparent PNG overlay with marks, same size as the first image
  input_fidelity?: 'high' | 'low';
}

const oneOf = <T extends string>(v: unknown, allowed: readonly T[], field: string): T | undefined => {
  if (v === undefined || v === null || v === '') return undefined;
  if (!allowed.includes(v as T)) throw new HttpError(400, `Invalid ${field}: ${v}. Use one of: ${allowed.join(', ')}.`);
  return v as T;
};

function imagePayload(body: ImageRequest, defaultModel: string, safetyIdentifier?: string) {
  if (!body.prompt?.trim()) throw new HttpError(400, 'prompt is required');
  if (body.prompt.length > 32000) throw new HttpError(400, 'prompt is too long (max 32,000 characters)');
  const model = body.model && IMAGE_MODELS.includes(body.model) ? body.model : defaultModel;

  // Legacy DALL-E option values from older UI code.
  const legacySize: Record<string, string> = { '1792x1024': '1536x1024', '1024x1792': '1024x1536' };
  const legacyQuality: Record<string, string> = { standard: 'medium', hd: 'high' };
  const size = body.size ? legacySize[body.size] || body.size : undefined;
  if (size && size !== 'auto' && !/^\d{2,4}x\d{2,4}$/.test(size)) throw new HttpError(400, `Invalid size: ${size}`);
  const quality = oneOf(body.quality ? legacyQuality[body.quality] || body.quality : undefined,
    ['auto', 'low', 'medium', 'high', 'xhigh', 'max'] as const, 'quality');
  const background = oneOf(body.background, ['auto', 'opaque', 'transparent'] as const, 'background');
  let format = oneOf(body.output_format, ['png', 'jpeg', 'webp', 'gif', 'svg'] as const, 'output_format');
  if (background === 'transparent' && (!format || format === 'jpeg')) format = 'png';
  if (background === 'transparent' && (format === 'gif' || format === 'svg')) {
    throw new HttpError(400, 'Transparent backgrounds need PNG or WebP output.');
  }

  const payload: Record<string, unknown> = { model, prompt: body.prompt };
  if (size) payload.size = size;
  if (quality) payload.quality = quality;
  if (background) payload.background = background;
  if (format) payload.output_format = format;
  if (body.n) payload.n = Math.min(Math.max(Math.round(body.n), 1), format === 'svg' ? 1 : 4);
  const complexity = oneOf(body.complexity, ['low', 'medium', 'high'] as const, 'complexity');
  if (complexity) payload.complexity = complexity;
  const moderation = oneOf(body.moderation, ['auto', 'low'] as const, 'moderation');
  if (moderation) payload.moderation = moderation;
  if (body.output_compression !== undefined && (format === 'jpeg' || format === 'webp')) {
    payload.output_compression = Math.min(Math.max(Math.round(body.output_compression), 0), 100);
  }
  if (format === 'gif') {
    if (body.frame_count !== undefined) payload.frame_count = Math.min(Math.max(Math.round(body.frame_count), 2), 16);
    if (body.frame_duration_ms !== undefined) payload.frame_duration_ms = Math.max(Math.round(body.frame_duration_ms / 10) * 10, 20);
  }
  // Streaming partial previews keep the connection active; not available for GIF/SVG.
  if (body.stream && format !== 'gif' && format !== 'svg') {
    payload.stream = true;
    payload.partial_images = Math.min(Math.max(body.partial_images ?? 2, 0), 3);
  }
  if (safetyIdentifier) payload.safety_identifier = safetyIdentifier;
  return { payload, model, format: format || 'png' };
}

function imageResult(data: any, model: string, format: string) {
  const mime = MIME[data.output_format || format] || 'image/png';
  const images = (data.data || [])
    .map((d: any) => (d.b64_json ? `data:${mime};base64,${d.b64_json}` : d.url))
    .filter(Boolean);
  if (!images.length) throw new HttpError(502, 'OpenAI returned no image. Try rephrasing the prompt.');
  return {
    images,
    revisedPrompt: data.data?.[0]?.revised_prompt,
    size: data.size,
    quality: data.quality,
    background: data.background,
    outputFormat: data.output_format || format,
    usage: data.usage,
    provider: 'openai',
    model,
  };
}

async function callImages(endpoint: 'generations' | 'edits', payload: Record<string, unknown>, model: string, format: string) {
  const key = OPENAI_KEY();
  if (!key) throw new HttpError(503, 'Image generation requires OPENAI_API_KEY.');
  const res = await fetch(`https://api.openai.com/v1/images/${endpoint}`, {
    method: 'POST',
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await providerError(res, 'OpenAI Images');
  if (payload.stream) {
    // Pass OpenAI's server-sent events (partial_image / completed) straight through to the browser.
    return new Response(res.body, {
      status: 200,
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'X-Image-Model': model },
    });
  }
  return reply(imageResult(await res.json(), model, format));
}

function imageGenerate(body: ImageRequest, safetyIdentifier?: string) {
  const { payload, model, format } = imagePayload(body, IMAGE_MODEL(), safetyIdentifier);
  return callImages('generations', payload, model, format);
}

function imageEdit(body: ImageRequest, safetyIdentifier?: string) {
  const images = (body.images || []).filter(Boolean);
  if (!images.length) throw new HttpError(400, 'Add at least one image to edit.');
  if (images.length > 16) throw new HttpError(400, 'You can send at most 16 images.');
  if (body.mask && body.markup) throw new HttpError(400, 'Use either a mask or a markup overlay, not both.');
  const { payload, model, format } = imagePayload(body, IMAGE_EDIT_MODEL(), safetyIdentifier);
  payload.images = images.map((image_url) => ({ image_url }));
  if (body.mask) payload.mask = { image_url: body.mask };
  if (body.markup) payload.markup = { image_url: body.markup };
  const fidelity = oneOf(body.input_fidelity, ['high', 'low'] as const, 'input_fidelity');
  if (fidelity) payload.input_fidelity = fidelity;
  return callImages('edits', payload, model, format);
}

async function transcribe(req: Request) {
  const key = OPENAI_KEY();
  if (!key) throw new HttpError(503, 'Transcription requires OPENAI_API_KEY.');
  const form = await req.formData();
  const file = form.get('file');
  if (!file || typeof file === 'string') throw new HttpError(400, 'Upload an audio file in the "file" field.');
  const model = env('OPENAI_TRANSCRIBE_MODEL') || 'whisper-1';
  const out = new FormData();
  out.append('file', file as Blob, (file as File).name || 'audio.webm');
  out.append('model', model);
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}` },
    body: out,
  });
  if (!res.ok) await providerError(res, 'OpenAI Transcription');
  const data = await res.json();
  return { text: data.text || '', provider: 'openai', model };
}

async function embed(body: { input: string | string[] }) {
  const key = OPENAI_KEY();
  if (!key) throw new HttpError(503, 'Embeddings require OPENAI_API_KEY.');
  if (!body.input) throw new HttpError(400, 'input is required');
  const model = env('OPENAI_EMBEDDING_MODEL') || 'text-embedding-3-small';
  const res = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, input: body.input }),
  });
  if (!res.ok) await providerError(res, 'OpenAI Embeddings');
  const data = await res.json();
  return { embeddings: (data.data || []).map((d: any) => d.embedding), provider: 'openai', model };
}

function status() {
  const openai = !!OPENAI_KEY();
  return {
    configured: openai,
    primary: openai ? 'openai' : null,
    providers: { openai: { configured: openai, model: OPENAI_MODEL() } },
    imageModels: { generate: IMAGE_MODEL(), edit: IMAGE_EDIT_MODEL(), available: IMAGE_MODELS },
    capabilities: { chat: openai, vision: openai, image: openai, imageEdit: openai, webSearch: openai, transcribe: openai, embed: openai, tools: openai },
  };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------
export default async (req: Request): Promise<Response> => {
  const url = new URL(req.url);
  const route = url.pathname.replace(/^.*\/(?:api\/ai|\.netlify\/functions\/ai)\/?/, '').replace(/\/$/, '');

  try {
    if (route === 'status' && req.method === 'GET') return reply(status());
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');

    const sid = safetyId(await checkAuth(req));

    switch (route) {
      case 'chat':
        return reply(await chat({ ...(await req.json()), safetyIdentifier: sid }));
      case 'vision': {
        const body = await req.json();
        return reply(await chat({ ...body, images: body.images || (body.image ? [body.image] : []), safetyIdentifier: sid }));
      }
      case 'image':
        return await imageGenerate(await req.json(), sid);
      case 'image-edit':
        return await imageEdit(await req.json(), sid);
      case 'transcribe':
        return reply(await transcribe(req));
      case 'embed':
        return reply(await embed(await req.json()));
      default:
        throw new HttpError(404, `Unknown AI endpoint: ${route || '(none)'}`);
    }
  } catch (e: any) {
    const status = e instanceof HttpError ? e.status : 500;
    if (status >= 500) console.error('[ai]', e);
    return reply({ error: e.message || 'AI request failed' }, status);
  }
};

