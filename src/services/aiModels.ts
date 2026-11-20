export interface AIModel {
  id: string;
  name: string;
  provider: 'google-ai' | 'openai' | 'anthropic';
  family: 'gemma' | 'gemini' | 'gpt' | 'claude';
  version: string;
  contextWindow: number;
  maxTokens: number;
  pricing: {
    input: number; // per 1M tokens
    output: number; // per 1M tokens
  };
  capabilities: string[];
  description: string;
  apiEndpoint: string;
  isAvailable: boolean;
  recommended?: boolean;
}

export const AI_MODELS: Record<string, AIModel> = {
  // All AI features run on OpenAI through the server-side gateway (/api/ai, Responses API).
  'gpt-6.2-sol': {
    id: 'gpt-6.2-sol',
    name: 'GPT-6.2 Sol',
    provider: 'openai',
    family: 'gpt',
    version: '6.2',
    contextWindow: 1050000,
    maxTokens: 128000,
    pricing: { input: 2, output: 10 },
    capabilities: ['text-generation', 'reasoning', 'multimodal', 'function-calling', 'json-mode', 'code-generation'],
    description: "OpenAI's go-to model for everyday work. Default for all SmartCRM AI tools.",
    apiEndpoint: '/api/ai/chat',
    isAvailable: true,
    recommended: true,
  },
  'gpt-6.2-astra': {
    id: 'gpt-6.2-astra',
    name: 'GPT-6.2 Astra',
    provider: 'openai',
    family: 'gpt',
    version: '6.2',
    contextWindow: 272000,
    maxTokens: 128000,
    pricing: { input: 8, output: 40 },
    capabilities: ['text-generation', 'reasoning', 'multimodal', 'function-calling', 'json-mode', 'code-generation'],
    description: 'More capable (and costlier) model for difficult analysis and long documents.',
    apiEndpoint: '/api/ai/chat',
    isAvailable: true,
  },
  'gpt-4o-mini': {
    id: 'gpt-4o-mini',
    name: 'GPT-4o mini',
    provider: 'openai',
    family: 'gpt',
    version: '4o-mini',
    contextWindow: 128000,
    maxTokens: 16384,
    pricing: { input: 0.15, output: 0.6 },
    capabilities: ['text-generation', 'multimodal', 'function-calling', 'json-mode'],
    description: 'Lowest-cost option for simple, high-volume tasks.',
    apiEndpoint: '/api/ai/chat',
    isAvailable: true,
  },
};

// Model categories for easier filtering
export const MODEL_CATEGORIES = {
  RECOMMENDED: 'recommended',
  ALL: 'all',
} as const;

// Get models by category
export const getModelsByCategory = (category: string): AIModel[] =>
  category === MODEL_CATEGORIES.RECOMMENDED
    ? Object.values(AI_MODELS).filter((model) => model.recommended)
    : Object.values(AI_MODELS);

// Get model by ID
export const getModelById = (id: string): AIModel | undefined => {
  return AI_MODELS[id];
};

// Get models by capability
export const getModelsByCapability = (capability: string): AIModel[] => {
  return Object.values(AI_MODELS).filter(model => 
    model.capabilities.includes(capability)
  );
};

// Get cheapest model for a capability
export const getCheapestModelForCapability = (capability: string): AIModel | undefined => {
  const models = getModelsByCapability(capability);
  return models.reduce((cheapest, current) => 
    current.pricing.input < cheapest.pricing.input ? current : cheapest
  );
};

// Get fastest model (smallest context window as proxy for speed)
export const getFastestModels = (): AIModel[] => {
  return Object.values(AI_MODELS)
    .sort((a, b) => a.contextWindow - b.contextWindow)
    .slice(0, 3);
};

// Model selection helpers for different use cases
export const AI_MODEL_RECOMMENDATIONS: Record<string, string[]> = {
  EMAIL_GENERATION: ['gpt-6.2-sol'],
  BUSINESS_ANALYSIS: ['gpt-6.2-sol', 'gpt-6.2-astra'],
  CONTENT_CREATION: ['gpt-6.2-sol'],
  QUICK_RESPONSES: ['gpt-6.2-sol', 'gpt-4o-mini'],
  COMPLEX_REASONING: ['gpt-6.2-astra'],
  CODE_GENERATION: ['gpt-6.2-sol', 'gpt-6.2-astra'],
  MULTIMODAL: ['gpt-6.2-sol'],
};

const PREFERRED_MODEL_KEY = 'smartcrm.ai.preferredModel';

/** The user's preferred OpenAI model (sent to the gateway with each request). */
export const getPreferredModel = (): string | undefined => {
  try {
    const id = localStorage.getItem(PREFERRED_MODEL_KEY) || undefined;
    return id && AI_MODELS[id] ? id : undefined;
  } catch {
    return undefined;
  }
};

export const setPreferredModel = (id: string) => {
  try {
    localStorage.setItem(PREFERRED_MODEL_KEY, id);
  } catch {
    /* storage unavailable */
  }
};

export type AIModelRecommendation = 'EMAIL_GENERATION' | 'BUSINESS_ANALYSIS' | 'CONTENT_CREATION' | 'QUICK_RESPONSES' | 'COMPLEX_REASONING' | 'CODE_GENERATION' | 'MULTIMODAL';