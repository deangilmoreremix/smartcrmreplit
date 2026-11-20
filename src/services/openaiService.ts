/**
 * OpenAI-backed AI helpers for components (via the server-side /api/ai gateway).
 * Keys are never used in the browser; see netlify/functions/ai.ts.
 */
import { aiContent, type ContactAnalysisResult } from './aiContentService';

export type { ContactAnalysisResult };

export const useOpenAI = () => aiContent;

export const openaiService = aiContent;
export default openaiService;
