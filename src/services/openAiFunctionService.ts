/**
 * OpenAI function-calling assistant over the app's CRM data (contacts, deals, tasks).
 * Calls go through the server-side gateway; the functions run here in the browser
 * against the zustand stores the CRM pages use.
 */
import { aiClient, type AIChatMessage } from './aiClient';
import { useContactStore } from '../hooks/useContactStore';
import { useDealStore } from '../store/dealStore';
import { useTaskStore } from '../store/taskStore';

import { stageId, stageName } from '../utils/dealStage';
export interface FunctionSchema {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export const functionSchemas: FunctionSchema[] = [
  {
    name: 'searchContacts',
    description: 'Search CRM contacts by name, company, title, email or industry.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string', description: 'Search text' }, limit: { type: 'number' } },
      required: ['query'],
    },
  },
  {
    name: 'getContactInfo',
    description: 'Get full details for a contact by id or exact name.',
    parameters: {
      type: 'object',
      properties: { contactId: { type: 'string' }, name: { type: 'string' } },
    },
  },
  {
    name: 'searchDeals',
    description: 'Search deals by title, company or stage, optionally filtering by minimum value.',
    parameters: {
      type: 'object',
      properties: { query: { type: 'string' }, stage: { type: 'string' }, minValue: { type: 'number' } },
    },
  },
  {
    name: 'getDealInfo',
    description: 'Get full details for a deal by id or title.',
    parameters: {
      type: 'object',
      properties: { dealId: { type: 'string' }, title: { type: 'string' } },
    },
  },
  {
    name: 'createTask',
    description: 'Create a task in the CRM.',
    parameters: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        description: { type: 'string' },
        dueDate: { type: 'string', description: 'ISO date' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
        contactId: { type: 'string' },
        dealId: { type: 'string' },
      },
      required: ['title'],
    },
  },
  {
    name: 'scheduleFollowUp',
    description: 'Schedule a follow-up (call, email or meeting) with a contact as a CRM task.',
    parameters: {
      type: 'object',
      properties: {
        contactId: { type: 'string' },
        type: { type: 'string', enum: ['call', 'email', 'meeting'] },
        date: { type: 'string', description: 'ISO date' },
        notes: { type: 'string' },
      },
      required: ['type', 'date'],
    },
  },
];

const text = (v: unknown) => String(v ?? '').toLowerCase();

const contacts = () => Object.values(useContactStore.getState().contacts || {});
const deals = () => (useDealStore.getState() as any).deals as any[];

function pickContact(c: any) {
  return { id: c.id, name: c.name, title: c.title || c.position, company: c.company, email: c.email, phone: c.phone, status: c.status, industry: c.industry };
}
function pickDeal(d: any) {
  return { id: d.id, title: d.title || d.name, company: d.company, value: d.value, stage: stageName(d), probability: d.probability, contact: d.contact || d.contactName, expectedCloseDate: d.expectedCloseDate || d.dueDate };
}

function addTask(task: { title: string; description?: string; type: string; priority?: string; dueDate?: string; contactId?: string; dealId?: string }) {
  const store: any = useTaskStore.getState();
  store.addTask({
    title: task.title,
    description: task.description || '',
    type: task.type,
    status: 'pending',
    priority: task.priority || 'medium',
    contactId: task.contactId,
    dealId: task.dealId,
    dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
    tags: ['ai-assistant'],
    attachments: [],
    subtasks: [],
    dependencies: [],
    reminders: [],
    customFields: {},
  });
  return { created: true, title: task.title, dueDate: task.dueDate };
}

export function executeFunction(name: string, args: any): unknown {
  switch (name) {
    case 'searchContacts': {
      const q = text(args.query);
      return contacts()
        .filter((c: any) => [c.name, c.company, c.title, c.position, c.email, c.industry].some((f) => text(f).includes(q)))
        .slice(0, args.limit || 10)
        .map(pickContact);
    }
    case 'getContactInfo': {
      const c = contacts().find((c: any) => c.id === args.contactId || text(c.name) === text(args.name));
      return c || { error: 'Contact not found' };
    }
    case 'searchDeals': {
      const q = text(args.query);
      return deals()
        .filter((d) => !q || [d.title, d.name, d.company, stageName(d)].some((f) => text(f).includes(q)))
        .filter((d) => !args.stage || text(stageName(d)).includes(text(args.stage)) || text(stageId(d)).includes(text(args.stage)))
        .filter((d) => !args.minValue || Number(d.value) >= args.minValue)
        .slice(0, 10)
        .map(pickDeal);
    }
    case 'getDealInfo': {
      const d = deals().find((d) => d.id === args.dealId || text(d.title || d.name) === text(args.title));
      return d || { error: 'Deal not found' };
    }
    case 'createTask':
      return addTask({ ...args, type: 'other' });
    case 'scheduleFollowUp': {
      const c = contacts().find((c: any) => c.id === args.contactId);
      return addTask({
        title: `Follow-up ${args.type}${c ? ` with ${(c as any).name}` : ''}`,
        description: args.notes,
        type: args.type === 'meeting' ? 'meeting' : args.type === 'email' ? 'email' : 'call',
        dueDate: args.date,
        contactId: args.contactId,
      });
    }
    default:
      return { error: `Unknown function ${name}` };
  }
}

export interface FunctionCallLog {
  name: string;
  arguments: string;
  result: unknown;
}

/**
 * Run the assistant with tool calling. Executes requested functions locally and
 * loops until the model answers in text (max 5 rounds).
 */
async function salesAssistantWithFunctions(
  userMessage: string,
  systemContext = '',
  previousMessages: Array<{ role: string; content: string; name?: string }> = [],
  enabledFunctions: string[] = functionSchemas.map((f) => f.name),
) {
  const tools = functionSchemas
    .filter((f) => enabledFunctions.includes(f.name))
    .map((f) => ({ type: 'function', function: f }));

  const messages: AIChatMessage[] = [
    ...previousMessages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .slice(-20)
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: userMessage },
  ];
  const calls: FunctionCallLog[] = [];

  for (let round = 0; round < 5; round++) {
    const res = await aiClient.chat('', {
      system: `You are a sales assistant inside a CRM. ${systemContext} Today is ${new Date().toDateString()}. Use the functions to look up or change CRM data; never invent records.`,
      messages,
      tools,
      temperature: 0.3,
    });

    if (!res.toolCalls?.length) {
      const last = calls[calls.length - 1];
      return {
        content: res.text,
        function_call: last ? { name: last.name, arguments: last.arguments } : undefined,
        functionCalls: calls,
      };
    }

    messages.push({ role: 'assistant', content: res.text || null, tool_calls: res.toolCalls });
    for (const call of res.toolCalls) {
      let args: any = {};
      try {
        args = JSON.parse(call.function.arguments || '{}');
      } catch {
        /* keep empty */
      }
      const result = executeFunction(call.function.name, args);
      calls.push({ name: call.function.name, arguments: call.function.arguments, result });
      messages.push({ role: 'tool', tool_call_id: call.id, content: JSON.stringify(result).slice(0, 8000) });
    }
  }
  throw new Error('The assistant did not finish after several function calls. Try a more specific request.');
}

export const openAiFunctionService = { functionSchemas, executeFunction, salesAssistantWithFunctions };
export const useOpenAIFunctions = () => openAiFunctionService;
export default openAiFunctionService;
