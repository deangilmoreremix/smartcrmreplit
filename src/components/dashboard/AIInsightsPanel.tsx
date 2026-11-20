import React, { useState, useEffect } from 'react';
import { Brain, Zap, RefreshCw, TrendingUp, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAITools } from '../../components/AIToolsProvider';
import { useDealStore } from '../../store/dealStore';
import { useContactStore } from '../../store/contactStore';
import { aiContent } from '../../services/aiContentService';
import Avatar from '../ui/Avatar';
import { getInitials } from '../../utils/avatars';

import { isOpenDeal, stageName } from '../../utils/dealStage';
interface Insight {
  type: 'success' | 'warning' | 'insight';
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  relatedContacts?: Array<{ id: string; name: string; avatar?: string; }>;
}

const AIInsightsPanel = () => {
  const { isDark } = useTheme();
  const { openTool } = useAITools();
  const { deals } = useDealStore();
  const { contacts } = useContactStore();
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [apiKeysConfigured, setApiKeysConfigured] = useState(true);

  // Create initial insights with the three required categories
  const createDefaultInsights = (): Insight[] => {
    // Get contacts for the insights
    const activeDeals = Object.values(deals).filter(isOpenDeal);

    // High value deals
    const highValueDeals = activeDeals.filter(deal => deal.value > 50000);
    const highValueContacts = highValueDeals.map(deal => {
      const contact = contacts[deal.contactId];
      return contact ? {
        id: contact.id,
        name: contact.name,
        avatar: contact.avatar
      } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; avatar?: string; }>;

    // Stalled deals
    const stalledDeals = activeDeals.filter(deal => deal.daysInStage && deal.daysInStage > 10);
    const stalledContacts = stalledDeals.map(deal => {
      const contact = contacts[deal.contactId];
      return contact ? {
        id: contact.id,
        name: contact.name,
        avatar: contact.avatar
      } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; avatar?: string; }>;

    // High probability deals
    const highProbDeals = activeDeals.filter(deal => deal.probability > 70);
    const highProbContacts = highProbDeals.map(deal => {
      const contact = contacts[deal.contactId];
      return contact ? {
        id: contact.id,
        name: contact.name,
        avatar: contact.avatar
      } : null;
    }).filter(Boolean) as Array<{ id: string; name: string; avatar?: string; }>;

    return [
      {
        type: 'success',
        title: 'High-Value Deals',
        description: `${highValueDeals.length} open deals over $50k, worth $${highValueDeals.reduce((sum, d) => sum + d.value, 0).toLocaleString()} in total.`,
        icon: CheckCircle,
        color: isDark ? 'text-green-400' : 'text-green-600',
        bgColor: isDark ? 'bg-green-500/20' : 'bg-green-100',
        relatedContacts: highValueContacts
      },
      {
        type: 'warning',
        title: 'Stalled Deals',
        description: `${stalledDeals.length} open deals have been in the same stage for more than 10 days.`,
        icon: AlertTriangle,
        color: isDark ? 'text-orange-400' : 'text-orange-600',
        bgColor: isDark ? 'bg-orange-500/20' : 'bg-orange-100',
        relatedContacts: stalledContacts
      },
      {
        type: 'insight',
        title: 'Likely to Close',
        description: `${highProbDeals.length} open deals have a win probability above 70%.`,
        icon: TrendingUp,
        color: isDark ? 'text-blue-400' : 'text-blue-600',
        bgColor: isDark ? 'bg-blue-500/20' : 'bg-blue-100',
        relatedContacts: highProbContacts
      }
    ];
  };
  
  const [insights, setInsights] = useState<Insight[]>(createDefaultInsights());


  // When theme changes, regenerate default insights to update colors
  useEffect(() => {
    setInsights(createDefaultInsights());
  }, [isDark]);

  const generateInsights = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      await generateRealInsights();
    } catch (error) {
      console.error("Failed to generate insights:", error);
      setError(error instanceof Error ? error.message : "Unable to generate AI insights at this time.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Render avatar stack for related contacts
  const renderAvatarStack = (contacts: Array<{ id: string; name: string; avatar?: string }>, maxVisible: number = 3) => {
    const visibleContacts = contacts.slice(0, maxVisible);
    const remainingCount = Math.max(0, contacts.length - maxVisible);
    
    return (
      <div className="flex items-center mt-2">
        <div className="flex -space-x-2">
          {visibleContacts.map((contact, index) => (
            <div key={contact.id} className="relative" style={{ zIndex: maxVisible - index }}>
              <Avatar
                src={contact.avatar}
                alt={contact.name}
                size="sm"
                fallback={getInitials(contact.name)}
                className="border-2 border-white dark:border-gray-900"
              />
            </div>
          ))}
          {remainingCount > 0 && (
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold border-2 border-white dark:border-gray-900 ${
              isDark ? 'bg-gray-700 text-white' : 'bg-gray-200 text-gray-700'
            }`}>
              +{remainingCount}
            </div>
          )}
        </div>
      </div>
    );
  };

  const generateRealInsights = async () => {
    const dealsArray = Object.values(deals);
    const contactsArray = Object.values(contacts);
    const openDeals = dealsArray.filter(isOpenDeal);

    const health = await aiContent.analyzePipelineHealth({
      deals: openDeals.map(deal => ({
        title: deal.title,
        value: deal.value,
        stage: stageName(deal),
        probability: deal.probability,
        daysInStage: deal.daysInStage,
        priority: deal.priority,
      })),
      contacts: contactsArray.slice(0, 100).map(contact => ({
        name: contact.name,
        company: contact.company,
        status: contact.status,
        source: contact.source,
      })),
      summary: {
        activeDealCount: openDeals.length,
        totalPipelineValue: openDeals.reduce((sum, deal) => sum + deal.value, 0),
        avgDealSize: openDeals.length ? openDeals.reduce((sum, deal) => sum + deal.value, 0) / openDeals.length : 0,
        hotLeadsCount: contactsArray.filter(c => c.status === 'hot').length,
      },
    });

    setApiKeysConfigured(true);
    const base = createDefaultInsights();
    setInsights([
      {
        ...base[0],
        title: `Pipeline Health: ${health.healthScore}/100`,
        description: health.keyInsights[0] || base[0].description,
      },
      {
        ...base[1],
        title: 'Bottleneck',
        description: health.bottlenecks[0] || base[1].description,
      },
      {
        ...base[2],
        title: 'Opportunity',
        description: health.opportunities[0] || base[2].description,
      },
    ]);
  };

  return (
    <div className={`${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-gray-100'} backdrop-blur-xl border rounded-2xl p-6 mb-8`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className={`text-lg font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>AI Pipeline Intelligence</h2>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {apiKeysConfigured ? 'Real-time insights powered by AI' : 'Configure API keys to enable AI features'}
            </p>
          </div>
        </div>
        <button
          onClick={generateInsights}
          disabled={isGenerating}
          className={`flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Zap className="h-4 w-4" />
          )}
          <span className="text-sm font-medium">
            {isGenerating ? 'Analyzing...' : 'Generate Insights'}
          </span>
        </button>
      </div>

      {error && (
        <div className={`p-4 mb-4 rounded-lg ${
          isDark ? 'bg-red-500/10 border-red-500/20 border' : 'bg-red-50 border-red-200 border'
        }`}>
          <div className="flex items-start">
            <Info className={`h-5 w-5 mt-0.5 ${isDark ? 'text-red-400' : 'text-red-500'}`} />
            <div className="ml-3">
              <h3 className={`text-sm font-medium ${isDark ? 'text-red-300' : 'text-red-800'}`}>
                AI Service Unavailable
              </h3>
              <p className={`mt-1 text-sm ${isDark ? 'text-red-300' : 'text-red-700'}`}>
                {error.includes("API key") ? 
                  "Please configure your AI API keys in the .env file to enable AI insights." :
                  error
                }
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {insights.map((insight, index) => (
          <div
            key={index}
            className={`${
              isDark ? 'bg-white/5 border border-white/10' : 'bg-white border border-gray-100'
            } rounded-xl p-4 hover:${isDark ? 'bg-white/10' : 'bg-gray-50'} transition-all group cursor-pointer`}
            onClick={() => {
              // Open the corresponding AI tool based on insight type
              const toolMap: Record<string, string> = {
                'success': 'pipeline-analysis',
                'warning': 'deal-alerts',
                'insight': 'smart-insights'
              };
              
              const toolName = toolMap[insight.type] || 'ai-insights';
              openTool(toolName);
            }}
          >
            <div className="flex items-start space-x-3">
              <div className={`p-2 rounded-lg ${insight.bgColor}`}>
                <insight.icon size={16} className={insight.color} />
              </div>
              <div className="flex-1">
                <h3 className={`font-medium ${isDark ? 'text-white group-hover:text-green-400' : 'text-gray-900 group-hover:text-green-600'} transition-colors`}>
                  {insight.title}
                </h3>
                <p className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-600'} mt-1`}>{insight.description}</p>
                
                {/* Avatar stack for related contacts */}
                {insight.relatedContacts && insight.relatedContacts.length > 0 && (
                  renderAvatarStack(insight.relatedContacts)
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AIInsightsPanel;