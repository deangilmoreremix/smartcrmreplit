import React, { Suspense, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Search, Sparkles, AlertTriangle } from 'lucide-react';
import ErrorBoundary from '../components/ErrorBoundary';
import { AI_TOOLS, AI_TOOL_CATEGORIES, resolveAITool } from '../components/aiTools/registry';
import { useAITools } from '../components/AIToolsProvider';
import { useTheme } from '../contexts/ThemeContext';
import { getAIStatus, type AIStatus } from '../services/aiClient';

const AITools: React.FC = () => {
  const { isDark } = useTheme();
  const [params, setParams] = useSearchParams();
  const { currentTool } = useAITools();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<string>('All');
  const [status, setStatus] = useState<AIStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);

  const selected = resolveAITool(params.get('tool') || currentTool);

  useEffect(() => {
    getAIStatus()
      .then(setStatus)
      .catch((e) => setStatusError(e instanceof Error ? e.message : 'AI service unavailable'));
  }, []);

  const tools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return AI_TOOLS.filter(
      (t) =>
        (category === 'All' || t.category === category) &&
        (!q || t.title.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)),
    );
  }, [query, category]);

  const card = isDark ? 'bg-white/5 border-white/10 text-white hover:border-white/30' : 'bg-white border-gray-200 text-gray-900 hover:border-indigo-300';
  const muted = isDark ? 'text-gray-400' : 'text-gray-600';

  const notConfigured = statusError || (status && !status.configured);

  return (
    <div className={`min-h-screen p-6 ${isDark ? 'bg-gray-900' : 'bg-gray-50'}`}>
      <div className="max-w-7xl mx-auto space-y-6">
        {notConfigured && (
          <div className="flex items-start gap-3 p-4 rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-800">
            <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium">AI is not configured on this deployment.</p>
              <p>
                {statusError ||
                  'Add OPENAI_API_KEY in Netlify → Site configuration → Environment variables, then redeploy.'}
              </p>
            </div>
          </div>
        )}

        {selected ? (
          <div className="space-y-4">
            <button
              onClick={() => setParams({})}
              className={`inline-flex items-center text-sm ${isDark ? 'text-indigo-300' : 'text-indigo-600'} hover:underline`}
            >
              <ArrowLeft size={16} className="mr-1" /> All AI tools
            </button>
            <div className="flex items-center gap-3">
              <selected.icon className={isDark ? 'text-indigo-300' : 'text-indigo-600'} />
              <div>
                <h1 className={`text-2xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>{selected.title}</h1>
                <p className={`text-sm ${muted}`}>{selected.description}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-gray-900" data-testid="ai-tool-panel">
              <ErrorBoundary key={selected.id}>
                <Suspense fallback={<p className="text-gray-500">Loading tool…</p>}>
                  <selected.component />
                </Suspense>
              </ErrorBoundary>
            </div>
          </div>
        ) : (
          <>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
              <div>
                <h1 className={`text-3xl font-bold flex items-center gap-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  <Sparkles className="text-indigo-500" /> AI Tools
                </h1>
                <p className={muted}>
                  {AI_TOOLS.length} tools powered by OpenAI
                  {status?.providers.openai.configured ? ` (${status.providers.openai.model})` : ''}.
                </p>
              </div>
              <div className="relative w-full md:w-72">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search tools"
                  aria-label="Search AI tools"
                  className="w-full pl-9 pr-3 py-2 rounded-lg border border-gray-300 text-gray-900"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {['All', ...AI_TOOL_CATEGORIES].map((c) => (
                <button
                  key={c}
                  onClick={() => setCategory(c)}
                  className={`px-3 py-1 rounded-full text-sm border ${
                    category === c ? 'bg-indigo-600 text-white border-indigo-600' : isDark ? 'border-white/20 text-gray-300' : 'border-gray-300 text-gray-700'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {tools.map((t) => (
                <button
                  key={t.id}
                  data-tool-id={t.id}
                  onClick={() => setParams({ tool: t.id })}
                  className={`text-left p-4 rounded-xl border transition-colors ${card}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <t.icon size={18} className="text-indigo-500" />
                    <span className="font-medium">{t.title}</span>
                  </div>
                  <p className={`text-sm ${muted}`}>{t.description}</p>
                  <span className={`mt-3 inline-block text-xs ${muted}`}>{t.category}</span>
                </button>
              ))}
              {!tools.length && <p className={muted}>No tools match your search.</p>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AITools;
