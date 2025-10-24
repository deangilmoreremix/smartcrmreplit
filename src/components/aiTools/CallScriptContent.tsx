import React, { useState } from 'react';
import * as edgeFunctionService from '../../services/edgeFunctionService';
import AIToolContent from '../shared/AIToolContent';
import { Phone, Tag, User, Building } from 'lucide-react';
import { useOpenAI } from '../../services/openaiService';
import ReasoningToggle from '../shared/ReasoningToggle';

const CallScriptContent: React.FC = () => {
  const [formData, setFormData] = useState({
    contactName: '',
    contactPosition: '',
    companyName: '',
    callPurpose: '',
    previousInteractions: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reasoning, setReasoning] = useState<string | null>(null);

  const openai = useOpenAI();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.callPurpose) return;

    setIsLoading(true);
    setError(null);
    setReasoning(null);
    
    try {
      const contactInfo = {
        name: formData.contactName,
        position: formData.contactPosition,
        company: formData.companyName
      };
      
      // Split the previous interactions by line breaks
      const interactions = formData.previousInteractions
        .split('\n')
        .filter(line => line.trim() !== '');
      
      const scriptResult = await edgeFunctionService.generateCallScript(
        contactInfo,
        formData.callPurpose,
        interactions
      );
      const reasoningPrompt = `Explain the approach and objectives behind this call script for ${formData.callPurpose}.`;
      const reasonText = await openai.generateReasoning(reasoningPrompt);
      setResult(scriptResult);
      setReasoning(reasonText);
    } catch (err) {
      console.error('Error generating call script:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating the call script');
    } finally {
      setIsLoading(false);
    }
  };

  // Common call purposes for quick selection
  const callPurposes = [
    'Introduction Call',
    'Product Demo Follow-up',
    'Proposal Discussion',
    'Qualification Call',
    'Renewal Discussion',
    'Upsell Opportunity',
    'Addressing Concerns',
    'Product Update',
    'Custom...'
  ];

  return (
    <div className="space-y-6">
      <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
        <div className="flex items-start">
          <Phone className="text-indigo-600 mt-1 mr-3 h-5 w-5" />
          <div>
            <h3 className="font-medium text-indigo-800">Call Script Generator</h3>
            <p className="text-sm text-indigo-700 mt-1">
              Create personalized sales call scripts for more effective conversations with prospects and customers. After generation, open the reasoning section to see the AI's strategy.
            </p>
          </div>
        </div>
      </div>

      <AIToolContent
        isLoading={isLoading}
        error={error}
        result={result}
        loadingMessage="Generating your call script..."
        resultTitle="Your Call Script"
      >
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <User className="h-4 w-4 mr-1 text-gray-500" />
                Contact Name
              </label>
              <input
                name="contactName"
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. John Smith"
                value={formData.contactName}
                onChange={handleChange}
              />
            </div>
            
            <div>
              <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                <Tag className="h-4 w-4 mr-1 text-gray-500" />
                Contact Position
              </label>
              <input
                name="contactPosition"
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. CTO"
                value={formData.contactPosition}
                onChange={handleChange}
              />
            </div>
          </div>
          
          <div>
            <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
              <Building className="h-4 w-4 mr-1 text-gray-500" />
              Company Name
            </label>
            <input
              name="companyName"
              type="text"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g. Acme Inc."
              value={formData.companyName}
              onChange={handleChange}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Call Purpose
            </label>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {callPurposes.map((purpose, index) => (
                <button
                  key={index}
                  type="button"
                  className={`text-xs p-2 border rounded-md transition-colors ${
                    formData.callPurpose === purpose && purpose !== 'Custom...'
                      ? 'bg-indigo-100 border-indigo-300 text-indigo-800'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                  onClick={() => {
                    if (purpose !== 'Custom...') {
                      setFormData({...formData, callPurpose: purpose});
                    }
                  }}
                >
                  {purpose}
                </button>
              ))}
            </div>
            
            <textarea
              name="callPurpose"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Describe the purpose of your call (e.g., follow up on recent demo, discuss renewal options, introduce new features)"
              value={formData.callPurpose}
              onChange={handleChange}
              required
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Previous Interactions (Optional)
            </label>
            <textarea
              name="previousInteractions"
              rows={3}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
              placeholder="Enter previous interactions with this contact (one per line)"
              value={formData.previousInteractions}
              onChange={handleChange}
            ></textarea>
            <p className="text-xs text-gray-500 mt-1">
              Example: "Initial call: Discussed pain points around legacy software integration."
            </p>
          </div>
            
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isLoading || !formData.callPurpose.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition-colors"
            >
              Generate Call Script
            </button>
          </div>
        </form>
      </AIToolContent>
      {result && !isLoading && !error && <ReasoningToggle reasoning={reasoning} />}
    </div>
  );
};

export default CallScriptContent;