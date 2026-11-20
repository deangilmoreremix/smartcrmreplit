/**
 * Single source of truth for the AI tools: the /ai-tools hub, the sidebar/navbar
 * menus and every openTool(id) call resolve tools from this list.
 */
import React, { lazy } from 'react';
import {
  Mail,
  Brain,
  BarChart3,
  Zap,
  Phone,
  Shield,
  Users,
  FileText,
  Code,
  Image,
  TrendingUp,
  Calendar,
  AlertTriangle,
  CheckSquare,
  Megaphone,
  Search,
  Volume2,
  PieChart,
  LineChart,
  Eye,
  type LucideIcon,
} from 'lucide-react';

export interface AIToolDefinition {
  id: string;
  title: string;
  description: string;
  category: 'Email' | 'Sales' | 'Research' | 'Meetings' | 'Content' | 'Assistant' | 'Analytics' | 'Forms' | 'Docs';
  icon: LucideIcon;
  component: React.LazyExoticComponent<React.ComponentType<any>>;
}


export const AI_TOOLS: AIToolDefinition[] = [
  // Email
  { id: 'email-composer-content', title: 'Smart Email Composer', description: 'Draft a personalized sales email with the reasoning behind it.', category: 'Email', icon: Mail, component: lazy(() => import('./EmailComposerContent')) },
  { id: 'realtime-email-composer', title: 'Realtime Email Composer', description: 'Live suggestions and tone feedback while you type.', category: 'Email', icon: Mail, component: lazy(() => import('./RealTimeEmailComposer')) },
  { id: 'email-response', title: 'Email Response', description: 'Write a reply that addresses every point in an incoming email.', category: 'Email', icon: Mail, component: lazy(() => import('./EmailResponseContent')) },
  { id: 'email-analysis', title: 'Email Analysis', description: 'Sentiment, intent, buying signals and suggested reply for a customer email.', category: 'Email', icon: Mail, component: lazy(() => import('./EmailAnalysisContent')) },

  // Sales
  { id: 'live-deal-analysis', title: 'Live Deal Analysis', description: 'AI risk, win probability and next actions for your pipeline deals.', category: 'Sales', icon: BarChart3, component: lazy(() => import('./LiveDealAnalysis')) },
  { id: 'call-script', title: 'Call Script', description: 'A call script tailored to the contact, purpose and history, with the reasoning behind it.', category: 'Sales', icon: Phone, component: lazy(() => import('./CallScriptContent')) },
  { id: 'objection-handler', title: 'Objection Handler', description: 'Turn common objections into structured responses.', category: 'Sales', icon: AlertTriangle, component: lazy(() => import('./ObjectionHandlerContent')) },
  { id: 'proposal-generator', title: 'Proposal Generator', description: 'Generate a structured business proposal.', category: 'Sales', icon: FileText, component: lazy(() => import('./ProposalGenerator')) },

  // Research
  { id: 'competitor-analysis', title: 'Competitor Analysis', description: 'Battlecard-style analysis, optionally from uploaded material.', category: 'Research', icon: Shield, component: lazy(() => import('./CompetitorAnalysisContent')) },
  { id: 'customer-persona', title: 'Customer Persona', description: 'Build an ideal customer persona from industry and pain points.', category: 'Research', icon: Users, component: lazy(() => import('./CustomerPersonaContent')) },
  { id: 'market-trends', title: 'Market Trends', description: 'Trends, drivers and recommendations for a market, optionally from uploaded reports.', category: 'Research', icon: TrendingUp, component: lazy(() => import('./MarketTrendContent')) },

  // Meetings
  { id: 'meeting-agenda', title: 'Meeting Agenda', description: 'A timed agenda with owners and outcomes.', category: 'Meetings', icon: Calendar, component: lazy(() => import('./MeetingAgendaContent')) },
  { id: 'meeting-summary', title: 'Meeting Summary', description: 'Summarize a transcript or recording into decisions and action items.', category: 'Meetings', icon: Calendar, component: lazy(() => import('./MeetingSummaryContent')) },

  // Content
  { id: 'social-media-generator', title: 'Social Media Generator', description: 'Platform-specific posts with hashtags and CTA.', category: 'Content', icon: Megaphone, component: lazy(() => import('./SocialMediaGenerator')) },
  { id: 'visual-content-generator', title: 'Visual Content Generator', description: 'Concepts and copy for visual sales content.', category: 'Content', icon: Image, component: lazy(() => import('./VisualContentGeneratorContent')) },
  { id: 'image-generator', title: 'Image Studio', description: 'Generate and edit images with GPT Image 2.6: transparent PNGs, GIFs, SVGs and markup edits.', category: 'Content', icon: Image, component: lazy(() => import('./ImageGeneratorContent')) },

  // Assistant
  { id: 'ai-assistant-chat', title: 'AI Assistant Chat', description: 'Chat with a configurable sales assistant.', category: 'Assistant', icon: Brain, component: lazy(() => import('./AIAssistantChat')) },
  { id: 'function-assistant', title: 'CRM Function Assistant', description: 'An assistant that can search and update your CRM data.', category: 'Assistant', icon: Code, component: lazy(() => import('./FunctionAssistantContent')) },
  { id: 'instant-response', title: 'Instant AI Response', description: 'Quick replies for common sales situations.', category: 'Assistant', icon: Zap, component: lazy(() => import('./InstantAIResponseGenerator')) },
  { id: 'smart-search-realtime', title: 'Semantic Search', description: 'Natural-language search across contacts and deals.', category: 'Assistant', icon: Search, component: lazy(() => import('./SmartSearchRealtime')) },

  // Analytics
  { id: 'sentiment-analysis', title: 'Sentiment Analysis', description: 'Sentiment, emotions and concerns in any text.', category: 'Analytics', icon: LineChart, component: lazy(() => import('./SentimentAnalysis')) },
  { id: 'churn-prediction', title: 'Churn Prediction', description: 'Churn risk and retention actions for a customer.', category: 'Analytics', icon: PieChart, component: lazy(() => import('./ChurnPrediction')) },
  { id: 'ai-usage-stats-panel', title: 'AI Usage Stats', description: 'Which AI tools your team uses most.', category: 'Analytics', icon: Eye, component: lazy(() => import('./AIUsageStatsPanel')) },


  // Forms & docs
  { id: 'auto-form-completer', title: 'Auto Form Completer', description: 'Paste free text and AI fills in the lead form.', category: 'Forms', icon: Zap, component: lazy(() => import('./AutoFormCompleter')) },
  { id: 'form-validation', title: 'Smart Form Validation', description: 'AI checks a lead form for typos and inconsistencies.', category: 'Forms', icon: CheckSquare, component: lazy(() => import('./RealTimeFormValidation')) },
  { id: 'document-analyzer-realtime', title: 'Document Analyzer', description: 'Analyze an image or PDF: documents, competitor material or contracts.', category: 'Docs', icon: FileText, component: lazy(() => import('./DocumentAnalyzerRealtime')) },
  { id: 'voice-analysis-realtime', title: 'Voice Analysis', description: 'Transcribe a call clip and get tone and coaching feedback.', category: 'Docs', icon: Volume2, component: lazy(() => import('./VoiceAnalysisRealtime')) },
];

/** Older or alternate ids used around the app, mapped to registry ids. */
export const AI_TOOL_ALIASES: Record<string, string> = {
  'email-composer': 'email-composer-content',
  'semantic-search': 'smart-search-realtime',
  'pipeline-analysis': 'live-deal-analysis',
  'deal-alerts': 'live-deal-analysis',
  'smart-insights': 'live-deal-analysis',
  'sales-insights': 'live-deal-analysis',
  'sales-forecast': 'live-deal-analysis',
  'meeting-scheduler': 'meeting-agenda',
  'ai-assistant': 'ai-assistant-chat',
  'streaming-chat': 'ai-assistant-chat',
  'vision-analyzer': 'document-analyzer-realtime',
  'voice-tone-optimizer': 'voice-analysis-realtime',
  'subject-optimizer': 'email-composer-content',
  // Duplicates merged into a single tool per job:
  'call-script-generator': 'call-script',
  'reasoning-script-generator': 'call-script',
  'competitor-analysis-main': 'competitor-analysis',
  'market-trends-analysis': 'market-trends',
  'reasoning-email': 'email-composer-content',
  'reasoning-proposal-generator': 'proposal-generator',
  'reasoning-objection-handler': 'objection-handler',
  'reasoning-social-content': 'social-media-generator',
};

export const AI_TOOL_CATEGORIES = Array.from(new Set(AI_TOOLS.map((t) => t.category)));

export function resolveAITool(id: string | null | undefined): AIToolDefinition | undefined {
  if (!id) return undefined;
  const key = AI_TOOL_ALIASES[id] || id;
  return AI_TOOLS.find((t) => t.id === key);
}
