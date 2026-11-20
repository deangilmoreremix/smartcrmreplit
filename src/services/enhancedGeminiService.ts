import { supabaseAIService, type AIModelConfig } from './supabaseAIService';
import { aiClient, parseJSONResponse } from './aiClient';

interface GenerateContentRequest {
  prompt: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  systemInstruction?: string;
  customerId?: string;
  featureUsed?: string;
}

interface GenerateContentResponse {
  content: string;
  model: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: string;
  responseTime: number;
}

class EnhancedGeminiService {
  private availableModels: AIModelConfig[] = [];

  constructor() {
    this.loadAvailableModels();
  }

  /**
   * Strip markdown code blocks from AI response
   */
  private stripMarkdownCodeBlocks(content: string): string {
    // Remove markdown code blocks (```json...``` or ```...```)
    let cleaned = content.trim();
    
    // Remove opening code block markers
    cleaned = cleaned.replace(/^```(?:json|javascript|js)?\s*/i, '');
    
    // Remove closing code block markers
    cleaned = cleaned.replace(/\s*```\s*$/i, '');
    
    // Remove any remaining leading/trailing whitespace
    return cleaned.trim();
  }

  /**
   * Validate and clean customer ID for UUID compatibility
   */
  private validateCustomerId(customerId?: string): string | undefined {
    if (!customerId || customerId === 'demo-customer-id' || customerId.includes('demo') || customerId.includes('placeholder')) {
      return undefined;
    }
    return customerId;
  }

  /**
   * Load available models from Supabase or fallback
   */
  private async loadAvailableModels(): Promise<void> {
    try {
      // Get Google AI models (Gemini and Gemma)
      const geminiModels = await supabaseAIService.getModelsByProvider('gemini');
      this.availableModels = geminiModels;
    } catch (error) {
      console.warn('Error loading available models, using fallback configurations:', error);
      // Get fallback models for Google AI
      this.availableModels = supabaseAIService.getAllFallbackModels().filter(model => 
        model.provider === 'gemini'
      );
    }
  }

  /**
   * Get available models for Google AI
   */
  async getAvailableModels(): Promise<AIModelConfig[]> {
    if (this.availableModels.length === 0) {
      await this.loadAvailableModels();
    }
    return this.availableModels;
  }

  /**
   * Generate content using Supabase-configured models
   */
  async generateContent(request: GenerateContentRequest): Promise<GenerateContentResponse> {
    const startTime = Date.now();
    // Requests go through the server-side AI gateway (/api/ai). The server picks the
    // provider/model (OpenAI primary, Gemini fallback); provider keys never reach the browser.
    try {
      const result = await aiClient.chat(request.prompt, {
        system: request.systemInstruction,
        temperature: request.temperature ?? 0.7,
        maxTokens: request.maxTokens,
      });
      const usage: any = result.usage || {};
      const response: GenerateContentResponse = {
        content: this.stripMarkdownCodeBlocks(result.text),
        model: result.model,
        usage: {
          promptTokens: usage.prompt_tokens ?? usage.promptTokenCount ?? 0,
          completionTokens: usage.completion_tokens ?? usage.candidatesTokenCount ?? 0,
          totalTokens: usage.total_tokens ?? usage.totalTokenCount ?? 0,
        },
        finishReason: 'completed',
        responseTime: Date.now() - startTime,
      };
      void this.logUsage(request, response.model, response.usage.totalTokens, Date.now() - startTime, true);
      return response;
    } catch (error) {
      void this.logUsage(request, request.model || 'unknown', 0, Date.now() - startTime, false, error);
      console.error('AI generation error:', error);
      throw error;
    }
  }

  private async logUsage(
    request: GenerateContentRequest,
    modelId: string,
    tokens: number,
    responseTime: number,
    success: boolean,
    error?: unknown,
  ) {
    const validCustomerId = this.validateCustomerId(request.customerId);
    if (!validCustomerId) return;
    try {
      await supabaseAIService.logUsage({
        customer_id: validCustomerId,
        model_id: modelId,
        feature_used: request.featureUsed || 'text-generation',
        tokens_used: tokens,
        cost: 0,
        response_time_ms: responseTime,
        success,
        ...(error ? { error_message: error instanceof Error ? error.message : String(error) } : {}),
      });
    } catch (logError) {
      console.warn('Failed to log AI usage (non-critical):', logError);
    }
  }

  /** Parse a JSON reply from the model. */
  private parseJSON(content: string): any {
    return parseJSONResponse(content);
  }

  /**
   * Calculate cost based on model pricing
   */
  private calculateCost(model: AIModelConfig, totalTokens: number): number {
    if (!model.pricing) return 0;
    
    // Estimate input/output split (typically 70/30)
    const inputTokens = Math.floor(totalTokens * 0.7);
    const outputTokens = totalTokens - inputTokens;
    
    const inputCost = (inputTokens / 1_000_000) * model.pricing.input_per_1m_tokens;
    const outputCost = (outputTokens / 1_000_000) * model.pricing.output_per_1m_tokens;
    
    return inputCost + outputCost;
  }

  /**
   * Generate insights for CRM data
   */
  async generateInsights(data: any, customerId?: string, model?: string): Promise<any> {
    const prompt = `
    Analyze the following CRM data and provide actionable insights:
    
    ${JSON.stringify(data, null, 2)}
    
    Please provide:
    1. Key insights about the sales pipeline
    2. Recommendations for improving conversion rates
    3. Identification of high-priority opportunities
    4. Potential risks or concerns
    
    Format your response as JSON with the following structure:
    {
      "healthScore": 75,
      "keyInsights": ["Pipeline shows strong growth", "Deal velocity increasing"],
      "bottlenecks": ["3 deals stalled in negotiation stage"],
      "opportunities": ["Focus on high-value Microsoft opportunity"],
      "forecastAccuracy": 85
    }
    `;


    try {
      const response = await this.generateContent({
        prompt,
        model,
        customerId,
        featureUsed: 'business_analysis',
        systemInstruction: "You are a CRM analytics expert. Provide concise, actionable insights in valid JSON format only. Do not wrap the JSON in markdown code blocks."
      });

      return this.parseJSON(response.content);
    } catch (error) {
      console.warn('Error generating insights:', error);
      throw error;
    }
  }

  /**
   * Generate email content
   */
  async generateEmail(context: {
    recipient: string;
    purpose: string;
    tone?: 'formal' | 'casual' | 'friendly';
    context?: string;
  }, customerId?: string, model?: string): Promise<{ subject: string; body: string }> {
    

    const tone = context.tone || 'professional';
    const prompt = `
    Generate a ${tone} email for the following context:
    
    Recipient: ${context.recipient}
    Purpose: ${context.purpose}
    Additional Context: ${context.context || 'None'}
    
    Format as JSON:
    {
      "subject": "string",
      "body": "string"
    }
    `;

    try {
      const response = await this.generateContent({
        prompt,
        model,
        customerId,
        featureUsed: 'email-generation',
        systemInstruction: "You are a professional email writing assistant. Write clear, engaging emails that drive action. Return only valid JSON without markdown formatting."
      });

      return this.parseJSON(response.content);
    } catch (error) {
      console.warn('Error generating email:', error);
      throw error;
    }
  }

  /**
   * Generate business proposal
   */
  async generateProposal(context: {
    clientName: string;
    companyName: string;
    projectDescription: string;
    requirements?: string[];
    budget?: number;
    timeline?: string;
    deliverables?: string[];
  }, customerId?: string, model?: string): Promise<string> {
    try {

      const prompt = `Create a comprehensive business proposal with the following details:
Client: ${context.clientName}
Company: ${context.companyName}
Project: ${context.projectDescription}
Requirements: ${context.requirements?.join(', ') || 'To be discussed'}
Budget Range: ${context.budget ? `$${context.budget.toLocaleString()}` : 'Flexible'}
Timeline: ${context.timeline || 'To be determined'}
Deliverables: ${context.deliverables?.join(', ') || 'Comprehensive solution'}

Generate a professional proposal with sections for Executive Summary, Project Overview, Approach, Deliverables, Timeline, and Investment.`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.6,
        maxTokens: 2000,
        customerId,
        featureUsed: 'proposal_generation'
      });

      return this.stripMarkdownCodeBlocks(response.content);
    } catch (error) {
      console.error('Error generating proposal:', error);
      throw error;
    }
  }

  /**
   * Generate call script
   */
  async generateCallScript(context: {
    purpose: 'cold_call' | 'follow_up' | 'discovery' | 'closing' | 'objection_handling';
    contactName?: string;
    companyName?: string;
    industry?: string;
    painPoints?: string[];
    objectives?: string[];
  }, customerId?: string, model?: string): Promise<string> {
    try {
      const prompt = `Generate a professional sales call script for the following scenario:
Purpose: ${context.purpose}
Contact: ${context.contactName || 'Prospect'}
Company: ${context.companyName || 'Target Company'}
Industry: ${context.industry || 'General'}
Pain Points: ${context.painPoints?.join(', ') || 'To be discovered'}
Objectives: ${context.objectives?.join(', ') || 'Build relationship and qualify'}

Create a structured script with opening, discovery questions, value proposition, and closing.`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.7,
        maxTokens: 1500,
        customerId,
        featureUsed: 'call_script_generation'
      });

      return this.stripMarkdownCodeBlocks(response.content);
    } catch (error) {
      console.error('Error generating call script:', error);
      throw error;
    }
  }

  /**
   * Analyze competitor information
   */
  async analyzeCompetitor(context: {
    competitorName: string;
    industry: string;
    ourCompany: string;
    analysisType: 'strengths_weaknesses' | 'pricing' | 'market_position' | 'full_analysis';
  }, customerId?: string, model?: string): Promise<any> {
    try {
      const prompt = `Analyze the competitor "${context.competitorName}" in the ${context.industry} industry compared to "${context.ourCompany}".
Analysis Type: ${context.analysisType}

Provide insights on:
1. Market positioning
2. Strengths and weaknesses
3. Pricing strategy (if applicable)
4. Competitive advantages
5. Opportunities for differentiation

Format the response as structured data.`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.5,
        maxTokens: 2000,
        customerId,
        featureUsed: 'competitor_analysis'
      });

      return {
        competitor: context.competitorName,
        analysis: this.stripMarkdownCodeBlocks(response.content),
        timestamp: new Date().toISOString(),
        analysisType: context.analysisType
      };
    } catch (error) {
      console.error('Error analyzing competitor:', error);
      throw error;
    }
  }

  /**
   * Analyze market trends
   */
  async analyzeMarketTrends(context: {
    industry: string;
    timeframe: '3months' | '6months' | '1year' | '2years';
    focusAreas?: string[];
  }, customerId?: string, model?: string): Promise<any> {
    try {
      const prompt = `Analyze market trends for the ${context.industry} industry over the ${context.timeframe} timeframe.
Focus Areas: ${context.focusAreas?.join(', ') || 'General market trends'}

Provide analysis on:
1. Key market trends and patterns
2. Growth opportunities
3. Emerging technologies or disruptions
4. Customer behavior changes
5. Competitive landscape shifts
6. Recommendations for strategy`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.6,
        maxTokens: 2000,
        customerId,
        featureUsed: 'market_analysis'
      });

      return {
        industry: context.industry,
        timeframe: context.timeframe,
        analysis: this.stripMarkdownCodeBlocks(response.content),
        timestamp: new Date().toISOString(),
        focusAreas: context.focusAreas
      };
    } catch (error) {
      console.error('Error analyzing market trends:', error);
      throw error;
    }
  }

  /**
   * Predict customer churn risk
   */
  async predictChurnRisk(context: {
    customerId: string;
    engagementData: {
      lastContact: Date;
      emailOpens: number;
      websiteVisits: number;
      supportTickets: number;
      purchaseHistory: any[];
    };
    customerProfile: any;
  }, customerId?: string, model?: string): Promise<any> {
    try {
      const daysSinceContact = Math.floor(
        (Date.now() - new Date(context.engagementData.lastContact).getTime()) / (1000 * 60 * 60 * 24)
      );

      const prompt = `Analyze customer churn risk based on the following data:
Customer ID: ${context.customerId}
Days since last contact: ${daysSinceContact}
Email opens (last 30 days): ${context.engagementData.emailOpens}
Website visits (last 30 days): ${context.engagementData.websiteVisits}
Support tickets (last 30 days): ${context.engagementData.supportTickets}
Purchase history: ${JSON.stringify(context.engagementData.purchaseHistory)}
Customer profile: ${JSON.stringify(context.customerProfile)}

Respond as JSON: {"riskScore": number 0-100, "riskLevel": "low"|"medium"|"high", "analysis": "markdown explanation of the main risk drivers", "recommendations": ["specific retention action", ...]}`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.3,
        maxTokens: 1200,
        customerId,
        featureUsed: 'churn_prediction',
        systemInstruction: 'You are a customer success analyst. Return only valid JSON.'
      });

      const parsed = this.parseJSON(response.content);
      const riskScore = Math.min(Math.max(Number(parsed.riskScore) || 0, 0), 100);
      const recommendations: string[] = Array.isArray(parsed.recommendations) ? parsed.recommendations : [];

      return {
        customerId: context.customerId,
        riskScore,
        riskLevel: parsed.riskLevel || (riskScore >= 70 ? 'high' : riskScore >= 40 ? 'medium' : 'low'),
        analysis: parsed.analysis || '',
        recommendations: recommendations.join('\n'),
        recommendationList: recommendations,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error predicting churn risk:', error);
      throw error;
    }
  }

  /**
   * Analyze sentiment from text
   */
  async analyzeSentiment(text: string, customerId?: string, model?: string): Promise<any> {
    try {
      const prompt = `Analyze the sentiment of the following text.

Text: """${text}"""

Respond as JSON: {"sentiment": "positive"|"negative"|"neutral", "score": number from -1 to 1, "confidence": number 0-1, "emotions": ["key emotional indicator", ...], "concerns": ["..."], "positives": ["..."], "analysis": "short markdown summary"}`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.2,
        maxTokens: 800,
        customerId,
        featureUsed: 'sentiment_analysis',
        systemInstruction: 'You are a sentiment analysis engine. Return only valid JSON.'
      });

      const parsed = this.parseJSON(response.content);
      const sentiment = String(parsed.sentiment || 'neutral').toLowerCase();
      return {
        text,
        sentiment: ['positive', 'negative', 'neutral'].includes(sentiment) ? sentiment : 'neutral',
        score: Math.min(Math.max(Number(parsed.score) || 0, -1), 1),
        confidence: parsed.confidence,
        emotions: parsed.emotions || [],
        concerns: parsed.concerns || [],
        positives: parsed.positives || [],
        analysis: parsed.analysis || '',
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      throw error;
    }
  }

  /**
   * Generate social media post
   */
  async generateSocialMediaPost(context: {
    platform: 'linkedin' | 'twitter' | 'facebook' | 'instagram';
    topic: string;
    tone: 'professional' | 'casual' | 'engaging' | 'promotional';
    keywords?: string[];
    callToAction?: string;
  }, customerId?: string, model?: string): Promise<string> {
    try {
      const prompt = `Create a ${context.tone} social media post for ${context.platform}:
Topic: ${context.topic}
Keywords: ${context.keywords?.join(', ') || 'None specified'}
Call to Action: ${context.callToAction || 'Engage with the content'}

Platform-specific requirements:
- LinkedIn: Professional, thought leadership
- Twitter: Concise, hashtags, engaging
- Facebook: Conversational, community-focused
- Instagram: Visual-first, inspiring

Generate an engaging post that drives engagement and aligns with the platform's best practices.`;

      const response = await this.generateContent({
        prompt,
        model,
        temperature: 0.8,
        maxTokens: 300,
        customerId,
        featureUsed: 'social_media_generation'
      });

      return this.stripMarkdownCodeBlocks(response.content);
    } catch (error) {
      console.error('Error generating social media post:', error);
      throw error;
    }
  }
  async getRecommendedModel(useCase: string): Promise<AIModelConfig | null> {
    try {
      const models = await supabaseAIService.getRecommendedModels(useCase);
      return models.length > 0 ? models[0] : null;
    } catch (error) {
      console.warn('Error getting recommended model:', error);
      return null;
    }
  }
}

// Create singleton instance
export const enhancedGeminiService = new EnhancedGeminiService();

// Export the hook for React components
export const useEnhancedGemini = () => {
  return {
    generateInsights: (data: any, customerId?: string, model?: string) => 
      enhancedGeminiService.generateInsights(data, customerId, model),
    generateEmail: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.generateEmail(context, customerId, model),
    generateProposal: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.generateProposal(context, customerId, model),
    generateCallScript: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.generateCallScript(context, customerId, model),
    analyzeCompetitor: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.analyzeCompetitor(context, customerId, model),
    analyzeMarketTrends: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.analyzeMarketTrends(context, customerId, model),
    predictChurnRisk: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.predictChurnRisk(context, customerId, model),
    analyzeSentiment: (text: string, customerId?: string, model?: string) => 
      enhancedGeminiService.analyzeSentiment(text, customerId, model),
    generateSocialMediaPost: (context: any, customerId?: string, model?: string) => 
      enhancedGeminiService.generateSocialMediaPost(context, customerId, model),
    generateContent: (request: GenerateContentRequest) => 
      enhancedGeminiService.generateContent(request),
    getAvailableModels: () => enhancedGeminiService.getAvailableModels(),
    getRecommendedModel: (useCase: string) => enhancedGeminiService.getRecommendedModel(useCase)
  };
};

export default enhancedGeminiService;