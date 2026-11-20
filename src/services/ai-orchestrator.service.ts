/**
 * AI Orchestrator Service
 * Single entry point for all AI operations with intelligent routing and caching
 */

import { logger } from './logger.service';
import { aiClient } from './aiClient';
import { cacheService } from './cache.service';
import { rateLimiter } from './rate-limiter.service';
import { httpClient } from './http-client.service';
import { Contact } from '../types/contact';

export interface AIRequest {
  id: string;
  type: 'contact_scoring' | 'contact_enrichment' | 'email_generation' | 'email_analysis' | 
        'insights_generation' | 'communication_analysis' | 'automation_suggestions' | 
        'predictive_analytics' | 'relationship_mapping';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  data: any;
  context?: {
    contactId?: string;
    userId?: string;
    sessionId?: string;
    businessContext?: string;
  };
  options?: {
    useCache?: boolean;
    provider?: 'openai' | 'auto';
    model?: string;
    timeout?: number;
  };
}

export interface AIResponse {
  id: string;
  type: string;
  result: any;
  metadata: {
    provider: string;
    model: string;
    processingTime: number;
    confidence: number;
    cached: boolean;
    timestamp: string;
    cost?: number;
  };
  error?: string;
}

export interface AIProvider {
  name: 'openai';
  available: boolean;
  rateLimit: {
    remaining: number;
    resetTime: number;
  };
  performance: {
    avgResponseTime: number;
    successRate: number;
    costPer1kTokens: number;
  };
}

class AIOrchestrator {
  private requestQueue: AIRequest[] = [];
  private processing = false;
  private providers: Map<string, AIProvider> = new Map();
  private requestHistory: AIResponse[] = [];
  
  constructor() {
    this.initializeProviders();
    this.startQueueProcessor();
  }

  private initializeProviders(): void {
    // Initialize provider status
    // All AI runs on OpenAI through the server-side gateway (/api/ai); keys never reach the browser.
    this.providers.set('openai', {
      name: 'openai',
      available: true,
      rateLimit: { remaining: 50, resetTime: Date.now() + 60000 },
      performance: { avgResponseTime: 2000, successRate: 0.95, costPer1kTokens: 0.002 }
    });
  }

  private startQueueProcessor(): void {
    setInterval(() => {
      if (!this.processing && this.requestQueue.length > 0) {
        this.processNextRequest();
      }
    }, 100);
  }

  private async processNextRequest(): Promise<void> {
    if (this.requestQueue.length === 0) return;

    this.processing = true;
    const request = this.requestQueue.shift()!;

    try {
      const response = await this.executeRequest(request);
      logger.info('AI request completed successfully', { 
        requestId: request.id, 
        type: request.type,
        processingTime: response.metadata.processingTime 
      });
    } catch (error) {
      logger.error('AI request failed', error as Error, { 
        requestId: request.id, 
        type: request.type 
      });
    } finally {
      this.processing = false;
    }
  }

  private async executeRequest(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const cacheKey = this.getCacheKey(request);

    // Check cache first
    if (request.options?.useCache !== false) {
      const cached = cacheService.get<AIResponse>('ai_responses', cacheKey);
      if (cached) {
        logger.debug('AI response served from cache', { requestId: request.id });
        return {
          ...cached,
          metadata: { ...cached.metadata, cached: true }
        };
      }
    }

    // Select optimal provider
    const provider = await this.selectProvider(request);
    
    // Execute request
    let result: any;
    let metadata: AIResponse['metadata'];

    try {
      const response = await this.callProvider(provider, request);
      result = response.result;
      metadata = {
        provider: provider.name,
        model: response.model || 'default',
        processingTime: Date.now() - startTime,
        confidence: response.confidence || 85,
        cached: false,
        timestamp: new Date().toISOString(),
        cost: response.cost
      };
    } catch (error) {
      throw new Error(`AI provider ${provider.name} failed: ${error}`);
    }

    const aiResponse: AIResponse = {
      id: request.id,
      type: request.type,
      result,
      metadata
    };

    // Cache successful responses
    if (request.options?.useCache !== false) {
      const ttl = this.getCacheTTL(request.type);
      cacheService.set('ai_responses', cacheKey, aiResponse, ttl, ['ai', request.type]);
    }

    // Update provider performance
    this.updateProviderPerformance(provider.name, metadata);

    // Store in history
    this.requestHistory.push(aiResponse);
    if (this.requestHistory.length > 1000) {
      this.requestHistory = this.requestHistory.slice(-1000);
    }

    return aiResponse;
  }

  private async selectProvider(request: AIRequest): Promise<AIProvider> {
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.available && p.rateLimit.remaining > 0);

    if (availableProviders.length === 0) {
      throw new Error('No AI providers available');
    }

    // Auto-select based on request type and urgency
    if (request.options?.provider === 'auto' || !request.options?.provider) {
      return this.selectOptimalProvider(request, availableProviders);
    }

    // Use specified provider if available
    const requestedProvider = availableProviders.find(p => p.name === request.options?.provider);
    if (requestedProvider) {
      return requestedProvider;
    }

    // Fallback to optimal selection
    return this.selectOptimalProvider(request, availableProviders);
  }

  private selectOptimalProvider(request: AIRequest, providers: AIProvider[]): AIProvider {
    // Score providers based on request characteristics
    const scoredProviders = providers.map(provider => {
      let score = 0;

      // Performance factors
      score += provider.performance.successRate * 40;
      score += (3000 - provider.performance.avgResponseTime) / 100; // Prefer faster responses
      
      // Cost factors (lower cost = higher score)
      if (request.priority === 'low') {
        score += (0.01 - provider.performance.costPer1kTokens) * 1000;
      }

      // Task-specific preferences
      switch (request.type) {
        case 'contact_scoring':
        case 'insights_generation':
          // Prefer accuracy for scoring and insights
          if (provider.name === 'openai') score += 10;
          break;
        case 'email_generation':
        case 'communication_analysis':
          // Both providers are good for communication tasks
          break;
        case 'contact_enrichment':
        case 'predictive_analytics':
          // Prefer higher accuracy models
          if (provider.name === 'openai') score += 5;
          break;
        case 'automation_suggestions':
          // Gemini is good for simple automation logic
          
          break;
      }

      // Urgency factors
      if (request.priority === 'urgent') {
        score += (3000 - provider.performance.avgResponseTime) / 50; // Heavily prefer speed
      }

      return { provider, score };
    });

    // Return highest scoring provider
    return scoredProviders.sort((a, b) => b.score - a.score)[0].provider;
  }

  private async callProvider(_provider: AIProvider, request: AIRequest): Promise<any> {
    const shapes: Record<AIRequest['type'], string> = {
      contact_scoring:
        '{"score":0-100,"breakdown":{"engagement":0-100,"fit":0-100,"intent":0-100,"timing":0-100},"reasoning":["..."],"recommendations":["..."],"nextBestActions":["..."]}',
      contact_enrichment: '{"enrichedData":{},"confidence":0-100,"sources":["inferred"],"notes":"..."}',
      email_generation:
        '{"subject":"...","body":"...","tone":"...","personalization":{"score":0-100,"elements":["..."]},"optimization":{"score":0-100,"suggestions":["..."]}}',
      email_analysis:
        '{"scores":{"sentiment":-1..1,"urgency":0-100,"engagement":0-100},"summary":"...","keyPoints":["..."],"suggestedActions":["..."]}',
      insights_generation:
        '{"insights":[{"type":"opportunity|risk|recommendation|prediction","title":"...","description":"...","confidence":0-100,"impact":"low|medium|high","actionable":true,"suggestedActions":["..."]}]}',
      communication_analysis: '{"summary":"...","sentiment":"positive|neutral|negative","keyTopics":["..."],"actionItems":["..."],"scores":{}}',
      automation_suggestions: '{"suggestions":[{"title":"...","description":"...","trigger":"...","actions":["..."],"impact":"low|medium|high"}]}',
      predictive_analytics:
        '{"predictions":[{"metric":"...","value":"...","probability":0-100,"timeframe":"..."}],"trendAnalysis":{"direction":"up|down|stable","confidence":0-100,"factors":["..."]},"optimalActions":["..."]}',
      relationship_mapping:
        '{"relationships":[{"contactId":"...","type":"...","strength":0-100}],"networkInsights":["..."],"influenceMap":{}}',
    };
    const shape = shapes[request.type];
    if (!shape) throw new Error(`Unsupported AI request type: ${request.type}`);

    const result = await aiClient.json(
      `Task: ${request.type.replace(/_/g, ' ')}
${request.context?.businessContext ? `Business context: ${request.context.businessContext}\n` : ''}Input data:
${JSON.stringify(request.data, null, 2).slice(0, 12000)}

Return JSON with exactly this shape: ${shape}`,
      { system: 'You are the AI engine of a CRM. Base every answer on the input data; do not invent facts.', temperature: 0.3 }
    );
    return { result, model: 'openai', confidence: 85 };
  }

  private updateProviderPerformance(providerName: string, metadata: AIResponse['metadata']): void {
    const provider = this.providers.get(providerName);
    if (!provider) return;

    // Update running averages
    const alpha = 0.1; // Smoothing factor
    provider.performance.avgResponseTime = 
      provider.performance.avgResponseTime * (1 - alpha) + metadata.processingTime * alpha;
    
    // Update rate limit info (simplified)
    provider.rateLimit.remaining = Math.max(0, provider.rateLimit.remaining - 1);
    if (Date.now() > provider.rateLimit.resetTime) {
      provider.rateLimit.remaining = 50;
      provider.rateLimit.resetTime = Date.now() + 60000;
    }
  }

  private getCacheKey(request: AIRequest): string {
    return `${request.type}_${JSON.stringify(request.data)}_${request.options?.provider || 'auto'}`;
  }

  private getCacheTTL(requestType: string): number {
    const ttlMap: Record<string, number> = {
      'contact_scoring': 3600000, // 1 hour
      'contact_enrichment': 86400000, // 24 hours
      'email_generation': 1800000, // 30 minutes
      'email_analysis': 1800000, // 30 minutes
      'insights_generation': 3600000, // 1 hour
      'communication_analysis': 1800000, // 30 minutes
      'automation_suggestions': 7200000, // 2 hours
      'predictive_analytics': 3600000, // 1 hour
      'relationship_mapping': 86400000 // 24 hours
    };

    return ttlMap[requestType] || 1800000; // Default 30 minutes
  }

  // Public API methods
  async submitRequest(request: Omit<AIRequest, 'id'>): Promise<string> {
    const fullRequest: AIRequest = {
      ...request,
      id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        useCache: true,
        provider: 'auto',
        timeout: 30000,
        ...request.options
      }
    };

    this.requestQueue.push(fullRequest);
    
    // Sort queue by priority
    this.requestQueue.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });

    logger.info('AI request queued', { 
      requestId: fullRequest.id, 
      type: fullRequest.type, 
      priority: fullRequest.priority 
    });

    return fullRequest.id;
  }

  async executeImmediate(request: Omit<AIRequest, 'id'>): Promise<AIResponse> {
    const fullRequest: AIRequest = {
      ...request,
      id: `ai_immediate_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      options: {
        useCache: true,
        provider: 'auto',
        timeout: 30000,
        ...request.options
      }
    };

    return this.executeRequest(fullRequest);
  }

  getProviderStatus(): AIProvider[] {
    return Array.from(this.providers.values());
  }

  getRequestHistory(limit = 50): AIResponse[] {
    return this.requestHistory.slice(-limit);
  }

  getPerformanceMetrics(): any {
    const recent = this.requestHistory.slice(-100);
    
    return {
      totalRequests: this.requestHistory.length,
      successRate: recent.filter(r => !r.error).length / recent.length,
      avgResponseTime: recent.reduce((sum, r) => sum + r.metadata.processingTime, 0) / recent.length,
      cacheHitRate: recent.filter(r => r.metadata.cached).length / recent.length,
      providerBreakdown: this.getProviderBreakdown(recent)
    };
  }

  private getProviderBreakdown(responses: AIResponse[]): Record<string, number> {
    const breakdown: Record<string, number> = {};
    responses.forEach(r => {
      breakdown[r.metadata.provider] = (breakdown[r.metadata.provider] || 0) + 1;
    });
    return breakdown;
  }

  clearCache(): void {
    cacheService.deleteByTag('ai');
    logger.info('AI cache cleared');
  }
}

export const aiOrchestrator = new AIOrchestrator();