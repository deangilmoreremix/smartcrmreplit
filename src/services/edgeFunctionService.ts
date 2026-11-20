/**
 * Named AI operations used by the AI tool components. These used to call
 * Supabase edge functions; they now run on OpenAI through the /api/ai gateway.
 */
import { aiContent } from './aiContentService';

export const generateCallScript = (contact: { name?: string; position?: string; company?: string }, purpose: string, previousInteractions: string[] = []) =>
  aiContent.generateCallScript(contact, purpose, previousInteractions);

export const analyzeCustomerEmail = (emailText: string) => aiContent.analyzeCustomerEmail(emailText);

export const analyzeCompetitor = (competitorName: string, industry: string, ourStrengths: string[] = [], extraContext = '') =>
  aiContent.analyzeCompetitor(competitorName, industry, ourStrengths, extraContext);

export const analyzeMarketTrends = (industry: string, targetMarket: string, timeframe: string, extraContext = '') =>
  aiContent.analyzeMarketTrends(industry, targetMarket, timeframe, extraContext);

export const generateMeetingSummary = (transcript: string) => aiContent.generateMeetingSummary(transcript);

export const generateEmailDraft = (recipientName: string, purpose: string, additionalContext?: string) =>
  aiContent.generateEmailDraft(recipientName, purpose, additionalContext);

export const generateCustomerPersona = (industry: string, companySize: string, painPoints: string[]) =>
  aiContent.generateCustomerPersona(industry, companySize, painPoints);

/** Generic entry point kept for older callers: callFunction('generate-meeting-summary', { transcript }) */
export async function callFunction(name: string, payload: Record<string, any>): Promise<string> {
  switch (name) {
    case 'generate-call-script':
      return generateCallScript(payload.contact || {}, payload.purpose, payload.previousInteractions);
    case 'analyze-email':
    case 'email-analyzer':
      return analyzeCustomerEmail(payload.emailText || payload.text);
    case 'analyze-competitor':
      return analyzeCompetitor(payload.competitorName, payload.industry, payload.strengths);
    case 'analyze-market-trends':
      return analyzeMarketTrends(payload.industry, payload.targetMarket, payload.timeframe);
    case 'generate-meeting-summary':
      return generateMeetingSummary(payload.transcript);
    case 'email-composer':
      return generateEmailDraft(payload.recipientName, payload.purpose, payload.context);
    default:
      throw new Error(`Unknown AI function: ${name}`);
  }
}
