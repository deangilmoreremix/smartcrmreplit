import React, { useState } from 'react';
import { Brain, RefreshCw, Sparkles } from 'lucide-react';
import AIToolContent from '../shared/AIToolContent';
import { aiClient } from '../../services/aiClient';

export type ReasoningContentType = 'email' | 'proposal' | 'script' | 'objection' | 'social';

interface Field {
  name: string;
  label: string;
  placeholder: string;
  multiline?: boolean;
  required?: boolean;
}

const CONFIG: Record<
  ReasoningContentType,
  { title: string; description: string; fields: Field[]; task: string; resultTitle: string }
> = {
  email: {
    title: 'Reasoning Email Generator',
    description: 'Think through the recipient, goal and angle step by step, then write the email.',
    resultTitle: 'Email (with reasoning)',
    task: 'a sales email (start the email with "Subject: ...")',
    fields: [
      { name: 'recipient', label: 'Recipient (name, role, company)', placeholder: 'Jane Doe, VP Sales at Acme', required: true },
      { name: 'goal', label: 'Goal of the email', placeholder: 'Book a 20-minute discovery call', required: true },
      { name: 'context', label: 'Context', placeholder: 'Met at SaaStr; they use a legacy CRM', multiline: true },
    ],
  },
  proposal: {
    title: 'Reasoning Proposal Generator',
    description: 'Reason about the client’s needs and risks before drafting a structured proposal.',
    resultTitle: 'Proposal (with reasoning)',
    task: 'a business proposal with executive summary, scope, deliverables, timeline, pricing approach and next steps',
    fields: [
      { name: 'client', label: 'Client', placeholder: 'Acme Corp (500 employees, logistics)', required: true },
      { name: 'need', label: 'What they need', placeholder: 'Replace spreadsheets with a CRM and automate follow-ups', multiline: true, required: true },
      { name: 'constraints', label: 'Budget / timeline / constraints', placeholder: '$40k, live by Q3, SSO required' },
    ],
  },
  script: {
    title: 'Reasoning Call Script Generator',
    description: 'Plan the call strategy step by step, then produce the script.',
    resultTitle: 'Call Script (with reasoning)',
    task: 'a sales call script with opening, discovery questions, value proposition, objection handling and close',
    fields: [
      { name: 'prospect', label: 'Prospect', placeholder: 'Head of Ops at a 200-person SaaS company', required: true },
      { name: 'purpose', label: 'Call purpose', placeholder: 'Follow up on demo and qualify budget', required: true },
      { name: 'notes', label: 'What you know so far', placeholder: 'Concerned about migration effort', multiline: true },
    ],
  },
  objection: {
    title: 'Reasoning Objection Handler',
    description: 'Diagnose the real concern behind an objection, then respond.',
    resultTitle: 'Objection Response (with reasoning)',
    task: 'an objection-handling response: acknowledge, clarify, reframe, evidence, and a closing question',
    fields: [
      { name: 'objection', label: 'Objection', placeholder: '"It\'s too expensive"', required: true },
      { name: 'product', label: 'Your product / value', placeholder: 'AI CRM that saves reps 6 hours/week', multiline: true, required: true },
      { name: 'stage', label: 'Deal stage', placeholder: 'Negotiation' },
    ],
  },
  social: {
    title: 'Reasoning Social Content',
    description: 'Reason about audience and platform, then write the post.',
    resultTitle: 'Social Post (with reasoning)',
    task: 'a social media post with a hook, body, call to action and hashtags',
    fields: [
      { name: 'platform', label: 'Platform', placeholder: 'LinkedIn', required: true },
      { name: 'topic', label: 'Topic', placeholder: 'How AI follow-ups lifted our win rate', required: true },
      { name: 'audience', label: 'Audience & tone', placeholder: 'Sales leaders; confident, practical' },
    ],
  },
};

interface Props {
  contentType: ReasoningContentType;
}

const ReasoningContentGenerator: React.FC<Props> = ({ contentType }) => {
  const config = CONFIG[contentType];
  const [values, setValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const canSubmit = config.fields.every((f) => !f.required || (values[f.name] || '').trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const inputs = config.fields.map((f) => `${f.label}: ${values[f.name] || 'not provided'}`).join('\n');
      const text = await aiClient.text(
        `Write ${config.task}.

${inputs}

Format your answer in Markdown with two sections:
## Reasoning
4-6 bullets explaining the strategy you chose and why.
## Result
The finished content, ready to use.`,
        {
          system: 'You are an expert B2B sales strategist. Think carefully, then write clear, specific content.',
          temperature: 0.6,
        },
      );
      setResult(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
        <div className="flex items-start">
          <Brain className="text-indigo-600 mt-1 mr-3 h-5 w-5" />
          <div>
            <h3 className="font-medium text-indigo-800">{config.title}</h3>
            <p className="text-sm text-indigo-700 mt-1">{config.description}</p>
          </div>
        </div>
      </div>

      <AIToolContent
        isLoading={isLoading}
        error={error}
        result={result}
        loadingMessage="Reasoning through your request..."
        resultTitle={config.resultTitle}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {config.fields.map((f) => (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`rcg-${f.name}`}>
                {f.label}
                {f.required && <span className="text-red-500"> *</span>}
              </label>
              {f.multiline ? (
                <textarea
                  id={`rcg-${f.name}`}
                  rows={3}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={f.placeholder}
                  value={values[f.name] || ''}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                />
              ) : (
                <input
                  id={`rcg-${f.name}`}
                  type="text"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder={f.placeholder}
                  value={values[f.name] || ''}
                  onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !canSubmit}
              className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? (
                <>
                  <RefreshCw size={18} className="animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={18} className="mr-2" />
                  Generate
                </>
              )}
            </button>
          </div>
        </form>
      </AIToolContent>
    </div>
  );
};

export default ReasoningContentGenerator;
