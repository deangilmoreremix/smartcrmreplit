/**
 * Assistant-style chat (assistants, threads and runs) built on the server-side
 * OpenAI gateway. Threads live in memory for the browser session; each "run"
 * sends the thread history to /api/ai/chat with the assistant's instructions.
 */
import { aiClient, type AIChatMessage } from './aiClient';

interface Assistant {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
}

interface ThreadMessage {
  id: string;
  role: 'user' | 'assistant';
  content: Array<{ type: 'text'; text: { value: string } }>;
  created_at: number; // unix seconds
}

interface Run {
  id: string;
  status: 'queued' | 'in_progress' | 'completed' | 'failed';
  error?: string;
}

const assistants = new Map<string, Assistant>();
const threads = new Map<string, ThreadMessage[]>();
const runs = new Map<string, Run>();

const uid = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const DEFAULT_ASSISTANT: Assistant = {
  id: 'asst_default',
  name: 'Sales Assistant',
  instructions: 'You are a helpful sales assistant that helps with CRM tasks, deal analysis, and sales strategy.',
  tools: [],
};
assistants.set(DEFAULT_ASSISTANT.id, DEFAULT_ASSISTANT);

export const openaiAssistantsService = {
  async createAssistant(name: string, instructions: string, tools: string[] = []) {
    const assistant = { id: uid('asst'), name, instructions, tools };
    assistants.set(assistant.id, assistant);
    return assistant;
  },

  async createThread() {
    const id = uid('thread');
    threads.set(id, []);
    return { id };
  },

  async addMessageToThread(threadId: string, content: string) {
    const thread = threads.get(threadId);
    if (!thread) throw new Error('Chat thread not found. Refresh and try again.');
    const message: ThreadMessage = {
      id: uid('msg'),
      role: 'user',
      content: [{ type: 'text', text: { value: content } }],
      created_at: Math.floor(Date.now() / 1000),
    };
    thread.push(message);
    return message;
  },

  async runAssistant(threadId: string, assistantId: string) {
    const thread = threads.get(threadId);
    if (!thread) throw new Error('Chat thread not found. Refresh and try again.');
    const assistant = assistants.get(assistantId) || DEFAULT_ASSISTANT;
    const run: Run = { id: uid('run'), status: 'in_progress' };
    runs.set(run.id, run);

    const history: AIChatMessage[] = thread.slice(-30).map((m) => ({ role: m.role, content: m.content[0].text.value }));
    aiClient
      .chat('', {
        system: `${assistant.instructions}\nYour name is ${assistant.name}. Use Markdown for structure when helpful.`,
        messages: history,
        temperature: 0.7,
      })
      .then((res) => {
        thread.push({
          id: uid('msg'),
          role: 'assistant',
          content: [{ type: 'text', text: { value: res.text } }],
          created_at: Math.floor(Date.now() / 1000),
        });
        run.status = 'completed';
      })
      .catch((e) => {
        run.status = 'failed';
        run.error = e instanceof Error ? e.message : String(e);
      });

    return run;
  },

  async getRunStatus(_threadId: string, runId: string) {
    const run = runs.get(runId);
    if (!run) throw new Error('Run not found');
    return run;
  },

  /** Newest first, like the OpenAI Assistants API. */
  async getThreadMessages(threadId: string) {
    return { data: [...(threads.get(threadId) || [])].reverse() };
  },
};

export const useOpenAIAssistants = () => openaiAssistantsService;
export default openaiAssistantsService;
