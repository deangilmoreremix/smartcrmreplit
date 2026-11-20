/**
 * Shared AI content-generation functions used by the AI tools.
 *
 * Every function calls the server-side AI gateway through aiClient. Errors are
 * thrown (never replaced by canned text) so the UI can show what went wrong.
 */
import { aiClient } from './aiClient';
import type { ContactEnrichmentData } from './aiEnrichmentService';

const SALES_SYSTEM =
  'You are an expert B2B sales and CRM assistant. Write clear, specific, professional content. ' +
  'Use Markdown headings and bullet points where they help readability.';

const list = (items?: string[]) => (items && items.length ? items.map((i) => `- ${i}`).join('\n') : 'None provided');

type ContactLike = { name?: string; position?: string; title?: string; company?: string; [k: string]: any };

const describeContact = (c?: ContactLike) =>
  c
    ? [c.name && `Name: ${c.name}`, (c.position || c.title) && `Position: ${c.position || c.title}`, c.company && `Company: ${c.company}`]
        .filter(Boolean)
        .join('\n')
    : 'Not provided';

// ---------------------------------------------------------------------------
// Text generators (return Markdown strings)
// ---------------------------------------------------------------------------

export async function generateEmailDraft(recipientName: string, purpose: string, additionalContext?: string) {
  return aiClient.text(
    `Write a sales email.

Recipient: ${recipientName || 'the prospect'}
Purpose: ${purpose}
Additional context: ${additionalContext || 'None'}

Start with a line "Subject: ..." followed by a blank line and the email body. Keep it concise (under 200 words) with a clear call to action.`,
    { system: SALES_SYSTEM, temperature: 0.7 },
  );
}

export async function generateReasoning(prompt: string) {
  return aiClient.text(prompt, {
    system: `${SALES_SYSTEM} Explain your reasoning briefly in 3-6 bullet points.`,
    temperature: 0.5,
    maxTokens: 600,
  });
}

export async function generateEmailResponse(originalEmail: string, contact: ContactLike, dealContext?: string) {
  return aiClient.text(
    `Write a reply to the email below.

Original email:
"""
${originalEmail}
"""

Sender:
${describeContact(contact)}

Deal context: ${dealContext || 'None provided'}

Address every question or concern raised, keep a warm professional tone, and end with a clear next step. Start with "Subject: Re: ..." then the body.`,
    { system: SALES_SYSTEM, temperature: 0.6 },
  );
}

export async function generateCustomerPersona(industry: string, companySize: string, painPoints: string[]) {
  return aiClient.text(
    `Create a detailed ideal customer persona.

Industry: ${industry}
Company size: ${companySize}
Known pain points:
${list(painPoints)}

Include: persona name and role, demographics, goals, challenges, buying triggers, objections, preferred channels, decision process, and messaging recommendations.`,
    { system: SALES_SYSTEM, temperature: 0.7 },
  );
}

export async function generateObjectionHandler(objection: string, productInfo: string) {
  return aiClient.text(
    `A prospect raised this objection: "${objection}"

${productInfo}

Provide: 1) what's really behind the objection, 2) an acknowledge-and-reframe response (word-for-word), 3) two alternative responses, 4) follow-up questions to ask, 5) evidence/proof points to share.`,
    { system: SALES_SYSTEM, temperature: 0.6 },
  );
}

export async function generateMeetingAgenda(purpose: string, attendees: string[], previousNotes?: string) {
  return aiClient.text(
    `Create a meeting agenda.

Purpose: ${purpose}
Attendees:
${list(attendees)}
Previous meeting notes: ${previousNotes || 'None'}

Include timed agenda items, owner for each item, desired outcomes, pre-reading, and follow-up actions.`,
    { system: SALES_SYSTEM, temperature: 0.5 },
  );
}

export async function generateCallScript(contact: ContactLike, purpose: string, previousInteractions: string[] = []) {
  return aiClient.text(
    `Write a sales call script.

Contact:
${describeContact(contact)}
Call purpose: ${purpose}
Previous interactions:
${list(previousInteractions)}

Include: opening, rapport builder, agenda statement, discovery questions, value proposition, likely objections with responses, and a close with a specific next step.`,
    { system: SALES_SYSTEM, temperature: 0.7 },
  );
}

export async function analyzeCustomerEmail(emailText: string) {
  return aiClient.text(
    `Analyze this customer email:
"""
${emailText}
"""

Provide: overall sentiment and urgency, the customer's key requests/questions, concerns or risks, buying signals, recommended response strategy, and a short suggested reply.`,
    { system: SALES_SYSTEM, temperature: 0.3 },
  );
}

export async function analyzeCompetitor(competitorName: string, industry: string, ourStrengths: string[] = [], extraContext = '') {
  return aiClient.text(
    `Produce a competitive analysis of "${competitorName}" in the ${industry} industry.

Our strengths:
${list(ourStrengths)}
${extraContext ? `\nAdditional material provided by the user:\n"""\n${extraContext.slice(0, 20000)}\n"""` : ''}

Cover: market position, likely strengths and weaknesses, pricing approach, how we differentiate, battlecard talking points, and landmines to set in deals. Note clearly where you are making assumptions.`,
    { system: SALES_SYSTEM, temperature: 0.5 },
  );
}

export async function analyzeMarketTrends(industry: string, targetMarket: string, timeframe: string, extraContext = '') {
  return aiClient.text(
    `Analyze market trends.

Industry: ${industry}
Target market: ${targetMarket}
Timeframe: ${timeframe}
${extraContext ? `\nAdditional material provided by the user:\n"""\n${extraContext.slice(0, 20000)}\n"""` : ''}

Cover: key trends, growth drivers, emerging technologies, buyer behavior changes, competitive shifts, risks, and concrete recommendations for a sales team. Note clearly where you are making assumptions.`,
    { system: SALES_SYSTEM, temperature: 0.6 },
  );
}

export async function generateMeetingSummary(transcript: string) {
  return aiClient.text(
    `Summarize this meeting transcript:
"""
${transcript.slice(0, 60000)}
"""

Provide: a 3-sentence executive summary, key discussion points, decisions made, action items (owner + due date if mentioned), open questions, and recommended follow-up email.`,
    { system: SALES_SYSTEM, temperature: 0.3 },
  );
}

export async function generateVisualContentIdea(contentType: string, industry: string, keyPoints: string[]) {
  return aiClient.text(
    `Design a visual content concept.

Content type: ${contentType}
Industry: ${industry}
Key points to communicate:
${list(keyPoints)}

Provide: concept title, layout description (sections top to bottom), headline and copy for each section, imagery/iconography suggestions, color usage, and a ready-to-use prompt for an AI image generator.`,
    { system: SALES_SYSTEM, temperature: 0.8 },
  );
}

export async function generateQuickContent(type: string, prompt: string, length: 'short' | 'medium' | 'long' = 'short') {
  const words = length === 'short' ? 80 : length === 'medium' ? 200 : 400;
  return aiClient.text(prompt, {
    system: `${SALES_SYSTEM} You are writing a ${type}. Keep it under about ${words} words. Return only the content itself.`,
    temperature: 0.7,
  });
}

export async function optimizeVoiceTone(text: string, targetTone: string) {
  return aiClient.text(`Rewrite the following in a ${targetTone} tone, keeping the meaning:\n\n${text}`, {
    system: 'You are a copy editor. Return only the rewritten text.',
    temperature: 0.6,
  });
}

export async function suggestPersonalization(contact: any, previousInteractions: any[] = []) {
  return aiClient.text(
    `Suggest personalization ideas for outreach to this contact.

Contact: ${JSON.stringify(contact, null, 2).slice(0, 4000)}
Previous interactions: ${JSON.stringify(previousInteractions, null, 2).slice(0, 4000)}

Give 5 specific personalization hooks, recommended channel and timing, and a sample opening line.`,
    { system: SALES_SYSTEM, temperature: 0.7 },
  );
}

export async function generatePersonalizedMessage(contact: any, messageType: 'email' | 'linkedin' | 'cold-outreach' = 'email') {
  return aiClient.text(
    `Write a personalized ${messageType} message for this contact:
${JSON.stringify(contact, null, 2).slice(0, 4000)}

Make it specific to their role, company and situation, under 150 words, with a clear call to action.`,
    { system: SALES_SYSTEM, temperature: 0.7 },
  );
}

// ---------------------------------------------------------------------------
// Structured generators (return objects)
// ---------------------------------------------------------------------------

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number; // -1..1
  confidence: number; // 0..1
  emotions: string[];
  suggestions: string[];
}

export async function analyzeSentimentRealTime(text: string): Promise<SentimentResult> {
  const r = await aiClient.json<Partial<SentimentResult>>(
    `Analyze the sentiment and tone of this draft:
"""
${text}
"""
Return JSON: {"sentiment":"positive|negative|neutral","score":-1..1,"confidence":0..1,"emotions":["..."],"suggestions":["short suggestion to improve tone", "..."]}`,
    { temperature: 0.2, maxTokens: 500 },
  );
  const sentiment = (['positive', 'negative', 'neutral'] as const).includes(r.sentiment as any)
    ? (r.sentiment as SentimentResult['sentiment'])
    : 'neutral';
  return {
    sentiment,
    score: Math.max(-1, Math.min(1, Number(r.score) || 0)),
    confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)),
    emotions: r.emotions || [],
    suggestions: r.suggestions || [],
  };
}

export interface ContactAnalysisResult {
  score: number;
  insights: string[];
  recommendations: string[];
  riskFactors: string[];
  opportunities: string[];
}

export async function analyzeContact(contact: any): Promise<ContactAnalysisResult> {
  const r = await aiClient.json<Partial<ContactAnalysisResult>>(
    `Analyze this CRM contact as a sales opportunity:
${JSON.stringify(contact, null, 2).slice(0, 6000)}

Return JSON: {"score": 0-100 lead score, "insights": ["..."], "recommendations": ["..."], "riskFactors": ["..."], "opportunities": ["..."]}`,
    { system: SALES_SYSTEM, temperature: 0.3 },
  );
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
    insights: r.insights || [],
    recommendations: r.recommendations || [],
    riskFactors: r.riskFactors || [],
    opportunities: r.opportunities || [],
  };
}

export async function predictLeadScore(contact: any) {
  const r = await aiClient.json<{ score: number; confidence: number; reasoning: string; factors: string[] }>(
    `Predict a lead score (0-100) for this contact:
${JSON.stringify(contact, null, 2).slice(0, 6000)}

Return JSON: {"score": number, "confidence": 0-1, "reasoning": "one paragraph", "factors": ["key factor", "..."]}`,
    { system: SALES_SYSTEM, temperature: 0.2 },
  );
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(r.score) || 0))),
    confidence: Number(r.confidence) || 0,
    reasoning: r.reasoning || '',
    factors: r.factors || [],
  };
}

export async function generateEmailTemplate(purpose: string, context?: any): Promise<{ subject: string; body: string }> {
  const r = await aiClient.json<{ subject: string; body: string }>(
    `Write an email template.
Purpose: ${purpose}
Context: ${context ? JSON.stringify(context).slice(0, 4000) : 'None'}
Return JSON: {"subject": "...", "body": "..."}`,
    { system: SALES_SYSTEM, temperature: 0.7 },
  );
  return { subject: r.subject || '', body: r.body || '' };
}

const ENRICHMENT_SHAPE = `{"firstName":"","lastName":"","name":"","email":"","phone":"","title":"","company":"","industry":"","location":{"city":"","state":"","country":""},"socialProfiles":{"linkedin":"","twitter":"","website":""},"bio":"","confidence": 0-100, "notes":"what is inferred vs known"}`;

async function enrich(description: string, seed: Partial<ContactEnrichmentData>): Promise<ContactEnrichmentData> {
  const r = await aiClient.json<ContactEnrichmentData>(
    `${description}

You do not have web access: only infer what is reasonable from the information given, leave unknown fields empty, and set a realistic confidence.
Return JSON: ${ENRICHMENT_SHAPE}`,
    { temperature: 0.2 },
  );
  const merged = { ...r, ...Object.fromEntries(Object.entries(seed).filter(([, v]) => v)) } as ContactEnrichmentData;
  merged.name = merged.name || [merged.firstName, merged.lastName].filter(Boolean).join(' ');
  merged.confidence = Number(merged.confidence) || 30;
  return merged;
}

export function researchContactByName(firstName: string, lastName: string, company?: string) {
  return enrich(`Build a contact profile for ${firstName} ${lastName}${company ? ` at ${company}` : ''}.`, {
    firstName,
    lastName,
    company,
  });
}

export function researchContactByEmail(email: string) {
  return enrich(`Build a contact profile for the owner of the email address ${email}.`, { email } as any);
}

export function researchContactByLinkedIn(linkedinUrl: string) {
  return enrich(`Build a contact profile for the LinkedIn profile ${linkedinUrl}.`, {
    socialProfiles: { linkedin: linkedinUrl },
  } as any);
}

export interface DealAnalysis {
  riskLevel: 'low' | 'medium' | 'high';
  winProbability: number;
  keyInsights: string[];
  recommendedActions: string[];
  potentialBlockers: string[];
}

export async function analyzeDeal(deal: any): Promise<DealAnalysis> {
  const r = await aiClient.json<Partial<DealAnalysis>>(
    `Analyze this sales deal:
${JSON.stringify(deal, null, 2).slice(0, 8000)}

Return JSON: {"riskLevel":"low|medium|high","winProbability":0-100,"keyInsights":["..."],"recommendedActions":["..."],"potentialBlockers":["..."]}`,
    { system: SALES_SYSTEM, temperature: 0.3 },
  );
  return {
    riskLevel: (['low', 'medium', 'high'] as const).includes(r.riskLevel as any) ? (r.riskLevel as any) : 'medium',
    winProbability: Math.max(0, Math.min(100, Math.round(Number(r.winProbability) || 0))),
    keyInsights: r.keyInsights || [],
    recommendedActions: r.recommendedActions || [],
    potentialBlockers: r.potentialBlockers || [],
  };
}

export interface PipelineHealth {
  healthScore: number;
  keyInsights: string[];
  bottlenecks: string[];
  opportunities: string[];
  forecastAccuracy: number;
}

export async function analyzePipelineHealth(pipeline: any): Promise<PipelineHealth> {
  const r = await aiClient.json<Partial<PipelineHealth>>(
    `Analyze the health of this sales pipeline:
${JSON.stringify(pipeline, null, 2).slice(0, 12000)}

Return JSON: {"healthScore":0-100,"keyInsights":["..."],"bottlenecks":["..."],"opportunities":["..."],"forecastAccuracy":0-100}`,
    { system: SALES_SYSTEM, temperature: 0.3 },
  );
  return {
    healthScore: Math.max(0, Math.min(100, Math.round(Number(r.healthScore) || 0))),
    keyInsights: r.keyInsights || [],
    bottlenecks: r.bottlenecks || [],
    opportunities: r.opportunities || [],
    forecastAccuracy: Math.max(0, Math.min(100, Math.round(Number(r.forecastAccuracy) || 0))),
  };
}

export const aiContent = {
  generateEmailDraft,
  generateReasoning,
  generateEmailResponse,
  generateCustomerPersona,
  generateObjectionHandler,
  generateMeetingAgenda,
  generateCallScript,
  analyzeCustomerEmail,
  analyzeCompetitor,
  analyzeMarketTrends,
  generateMeetingSummary,
  generateVisualContentIdea,
  generateQuickContent,
  optimizeVoiceTone,
  suggestPersonalization,
  generatePersonalizedMessage,
  analyzeSentimentRealTime,
  analyzeContact,
  predictLeadScore,
  generateEmailTemplate,
  researchContactByName,
  researchContactByEmail,
  researchContactByLinkedIn,
  analyzeDeal,
  analyzePipelineHealth,
};

export default aiContent;
