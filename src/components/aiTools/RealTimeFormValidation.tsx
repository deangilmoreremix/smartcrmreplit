import React, { useState } from 'react';
import { CheckSquare, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { aiClient } from '../../services/aiClient';

interface FieldIssue {
  field: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  suggestion?: string;
}

const FIELDS = [
  { name: 'name', label: 'Full name', placeholder: 'Jane Doe' },
  { name: 'email', label: 'Email', placeholder: 'jane@acme.com' },
  { name: 'phone', label: 'Phone', placeholder: '+1 555 010 2030' },
  { name: 'company', label: 'Company', placeholder: 'Acme Inc.' },
  { name: 'title', label: 'Job title', placeholder: 'VP of Sales' },
  { name: 'website', label: 'Website', placeholder: 'https://acme.com' },
];

/** AI-assisted validation of a lead/contact form (formatting, consistency, likely typos). */
const RealTimeFormValidation: React.FC = () => {
  const [values, setValues] = useState<Record<string, string>>({});
  const [issues, setIssues] = useState<FieldIssue[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const r = await aiClient.json<{ fields: FieldIssue[] }>(
        `Validate this CRM contact form. Check formatting, plausibility, consistency between fields (e.g. email domain vs company/website) and likely typos.
Form: ${JSON.stringify(values)}
Return JSON {"fields":[{"field":"<field name>","status":"ok|warning|error","message":"short explanation","suggestion":"corrected value or empty"}]} with one entry per field: ${FIELDS.map((f) => f.name).join(', ')}.`,
        { temperature: 0 },
      );
      setIssues(r.fields || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsLoading(false);
    }
  };

  const issueFor = (name: string) => issues?.find((i) => i.field === name);

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100 flex items-start">
        <CheckSquare className="text-indigo-600 mt-1 mr-3 h-5 w-5" />
        <div>
          <h3 className="font-medium text-indigo-800">Smart Form Validation</h3>
          <p className="text-sm text-indigo-700 mt-1">Fill in a lead and let AI check formatting, consistency and likely typos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {FIELDS.map((f) => {
          const issue = issueFor(f.name);
          const border =
            issue?.status === 'error' ? 'border-red-400' : issue?.status === 'warning' ? 'border-yellow-400' : issue ? 'border-green-400' : 'border-gray-300';
          return (
            <div key={f.name}>
              <label className="block text-sm font-medium text-gray-700 mb-1" htmlFor={`fv-${f.name}`}>
                {f.label}
              </label>
              <input
                id={`fv-${f.name}`}
                className={`w-full p-2 border rounded-md ${border}`}
                placeholder={f.placeholder}
                value={values[f.name] || ''}
                onChange={(e) => setValues({ ...values, [f.name]: e.target.value })}
              />
              {issue && issue.status !== 'ok' && (
                <p className={`mt-1 text-xs flex items-center ${issue.status === 'error' ? 'text-red-600' : 'text-yellow-700'}`}>
                  <AlertTriangle size={12} className="mr-1" />
                  {issue.message}
                  {issue.suggestion && (
                    <button
                      type="button"
                      className="ml-2 underline"
                      onClick={() => setValues({ ...values, [f.name]: issue.suggestion! })}
                    >
                      Use “{issue.suggestion}”
                    </button>
                  )}
                </p>
              )}
              {issue?.status === 'ok' && (
                <p className="mt-1 text-xs text-green-600 flex items-center">
                  <CheckCircle size={12} className="mr-1" />
                  Looks good
                </p>
              )}
            </div>
          );
        })}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex justify-end">
        <button
          onClick={validate}
          disabled={isLoading || !Object.values(values).some((v) => v.trim())}
          className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300"
        >
          {isLoading ? <RefreshCw size={18} className="animate-spin mr-2" /> : <CheckSquare size={18} className="mr-2" />}
          Validate with AI
        </button>
      </div>
    </div>
  );
};

export default RealTimeFormValidation;
