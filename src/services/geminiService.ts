/**
 * Legacy name kept for compatibility: components still import `useGemini` /
 * `geminiService`, but all AI now runs on OpenAI through the server-side
 * /api/ai gateway (netlify/functions/ai.ts).
 */
import { aiContent } from './aiContentService';
import { aiClient, getAIStatus } from './aiClient';
import type { ContactEnrichmentData } from './aiEnrichmentService';

class AIService {
  private configured: boolean | null = null;

  constructor() {
    getAIStatus()
      .then((s) => (this.configured = s.configured))
      .catch(() => (this.configured = false));
  }

  /** True unless the AI gateway has reported that OPENAI_API_KEY is missing. */
  isApiKeyConfigured() {
    return this.configured !== false;
  }

  /** No-op: keys are configured server-side. */
  setApiKey(_key: string) {}

  researchContactByName(firstName: string, lastName: string, company?: string): Promise<ContactEnrichmentData> {
    return aiContent.researchContactByName(firstName, lastName, company);
  }

  researchContactByEmail(email: string): Promise<ContactEnrichmentData> {
    return aiContent.researchContactByEmail(email);
  }

  researchContactByLinkedIn(linkedinUrl: string): Promise<ContactEnrichmentData> {
    return aiContent.researchContactByLinkedIn(linkedinUrl);
  }

  generatePersonalizedMessage(contact: any, messageType: 'email' | 'linkedin' | 'cold-outreach' = 'email') {
    return aiContent.generatePersonalizedMessage(contact, messageType);
  }
}

export const geminiService = new AIService();

const MODELS = [{ id: 'openai', name: 'OpenAI (server default)', provider: 'openai', capabilities: ['text-generation'] }];

export const useGemini = () => ({
  ...aiContent,

  generateContent: async (request: { prompt: string; systemInstruction?: string; temperature?: number; maxTokens?: number }) => {
    const res = await aiClient.chat(request.prompt, {
      system: request.systemInstruction,
      temperature: request.temperature,
      maxTokens: request.maxTokens,
    });
    return { content: res.text, model: res.model, provider: res.provider };
  },

  analyzeDeal: async (dealData: any) => {
    const start = Date.now();
    const content = await aiContent.analyzeDeal(dealData);
    return { content, model: 'openai', provider: 'openai', responseTime: Date.now() - start, success: true };
  },

  analyzePipelineHealth: async (pipelineData: any) => {
    const start = Date.now();
    const content = await aiContent.analyzePipelineHealth(pipelineData);
    return { content, model: 'openai', provider: 'openai', responseTime: Date.now() - start, success: true };
  },

  generateEmail: async (context: { recipient?: string; purpose?: string; context?: string }) =>
    aiContent.generateEmailTemplate(context.purpose || 'follow up', context),

  analyzeMarketTrends: async (industry: string, targetMarket = 'general', timeframe = '12 months') =>
    aiContent.analyzeMarketTrends(industry, targetMarket, timeframe),

  getAvailableModels: async () => MODELS,
  getRecommendedModel: async (_useCase: string) => MODELS[0],
});

export default geminiService;
