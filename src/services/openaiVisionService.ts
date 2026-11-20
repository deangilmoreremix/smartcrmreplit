/**
 * Document and image analysis with OpenAI vision via the server-side gateway.
 * Images are sent as image inputs; PDFs as file inputs.
 */
import { aiClient, parseJSONResponse } from './aiClient';

export type DocumentAnalysisType = 'document' | 'competitor' | 'contract';

export interface DocumentAnalysis {
  summary: string;
  keyPoints: string[];
  recommendations?: string[];
  contractTerms?: string[];
  competitorStrengths?: string[];
  riskLevel?: 'low' | 'medium' | 'high';
}

const MAX_BYTES = 4 * 1024 * 1024; // keep well under the serverless request limit

export function fileToDataURL(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

const PROMPTS: Record<DocumentAnalysisType, string> = {
  document:
    'Analyze this business document. Return JSON: {"summary":"...","keyPoints":["..."],"recommendations":["next steps for a sales rep"]}',
  competitor:
    'Analyze this competitor material. Return JSON: {"summary":"...","keyPoints":["pricing, features, positioning"],"competitorStrengths":["..."],"recommendations":["how we should position against them"]}',
  contract:
    'Review this contract. Return JSON: {"summary":"...","keyPoints":["..."],"contractTerms":["key term or obligation"],"riskLevel":"low|medium|high","recommendations":["what to negotiate or clarify"]}',
};

export const openaiVisionService = {
  async analyzeDocument(file: File, type: DocumentAnalysisType = 'document'): Promise<DocumentAnalysis> {
    if (file.size > MAX_BYTES) throw new Error('File is too large (max 4 MB). Try a smaller image or PDF.');
    const dataUrl = await fileToDataURL(file);
    const res = await aiClient.analyzeImage(
      `${PROMPTS[type]}\nOnly report what is visible in the file; if text is unreadable, say so in the summary.`,
      [dataUrl],
      { json: true, temperature: 0.2 },
    );
    const parsed = (res.json ?? parseJSONResponse(res.text)) as Partial<DocumentAnalysis>;
    return {
      summary: parsed.summary || '',
      keyPoints: parsed.keyPoints || [],
      recommendations: parsed.recommendations,
      contractTerms: parsed.contractTerms,
      competitorStrengths: parsed.competitorStrengths,
      riskLevel: parsed.riskLevel,
    };
  },

  async analyzeImage(imageDataUrl: string, prompt: string): Promise<string> {
    const res = await aiClient.analyzeImage(prompt, [imageDataUrl]);
    return res.text;
  },
};

export const useOpenAIVision = () => openaiVisionService;
export default openaiVisionService;
