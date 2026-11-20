/**
 * Server-side AI gateway for SmartCRM.
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
 *   OPENAI_IMAGE_MODEL        image model                   (default: gpt-image-1)
 *   OPENAI_TRANSCRIBE_MODEL   speech-to-text model          (default: whisper-1)
 *   OPENAI_EMBEDDING_MODEL    embedding model               (default: text-embedding-3-small)
 *   AI_REQUIRE_AUTH           "false" to allow calls without a Supabase session (default: required
 *                             whenever SUPABASE_URL / VITE_SUPABASE_URL is configured)
 */

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
  model?: string;
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
async function checkAuth(req: Request): Promise<void> {
  const supabaseUrl = env('SUPABASE_URL') || env('VITE_SUPABASE_URL');
  const anonKey = env('SUPABASE_ANON_KEY') || env('VITE_SUPABASE_ANON_KEY');
  if (env('AI_REQUIRE_AUTH') === 'false' || !supabaseUrl || !anonKey) return;

  const auth = req.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '');
  if (!token) throw new HttpError(401, 'Sign in to use AI features.');

  const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
    headers: { Authorization: `Bearer ${token}`, apikey: anonKey },
  });
  if (!res.ok) throw new HttpError(401, 'Your session has expired. Please sign in again.');
}

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
  if (body.tools?.length) payload.tools = toResponsesTools(body.tools);

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

  const u = data.usage || {};
  return {
    text: extractText(data),
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
async function image(body: { prompt: string; size?: string; n?: number; quality?: string; style?: string }) {
  const key = OPENAI_KEY();
  if (!key) throw new HttpError(503, 'Image generation requires OPENAI_API_KEY.');
  if (!body.prompt) throw new HttpError(400, 'prompt is required');
  const model = env('OPENAI_IMAGE_MODEL') || 'gpt-image-1';
  const isGptImage = model.startsWith('gpt-image');
  // gpt-image models use different size/quality values than DALL-E 3; map the UI's options.
  const sizeMap: Record<string, string> = { '1792x1024': '1536x1024', '1024x1792': '1024x1536' };
  const qualityMap: Record<string, string> = { standard: 'medium', hd: 'high' };
  const size = body.size || '1024x1024';
  const payload: Record<string, unknown> = {
    model,
    prompt: body.prompt,
    n: Math.min(Math.max(body.n || 1, 1), 4),
    size: isGptImage ? sizeMap[size] || size : size,
  };
  if (body.quality) payload.quality = isGptImage ? qualityMap[body.quality] || body.quality : body.quality;
  if (!isGptImage) {
    payload.response_format = 'b64_json';
    if (body.style && model === 'dall-e-3') payload.style = body.style;
  }

  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { ...JSON_HEADERS, Authorization: `Bearer ${key}` },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await providerError(res, 'OpenAI Images');
  const data = await res.json();
  const images = (data.data || []).map((d: any) =>
    d.b64_json ? `data:image/png;base64,${d.b64_json}` : d.url,
  );
  const revisedPrompt = data.data?.[0]?.revised_prompt;
  return { images, revisedPrompt, provider: 'openai', model };
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
    capabilities: { chat: openai, vision: openai, image: openai, transcribe: openai, embed: openai, tools: openai },
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

    await checkAuth(req);

    switch (route) {
      case 'chat':
        return reply(await chat(await req.json()));
      case 'vision': {
        const body = await req.json();
        return reply(await chat({ ...body, images: body.images || (body.image ? [body.image] : []) }));
      }
      case 'image':
        return reply(await image(await req.json()));
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

