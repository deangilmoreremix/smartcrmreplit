/**
 * Image generation via the server-side OpenAI gateway (/api/ai/image).
 */
import { aiClient } from './aiClient';

export type ImageSize = '1024x1024' | '1792x1024' | '1024x1792';
export type ImageQuality = 'standard' | 'hd';
export type ImageStyle = 'natural' | 'vivid';

export const openaiImageService = {
  async generateImage(prompt: string, size: ImageSize = '1024x1024', quality: ImageQuality = 'standard', style: ImageStyle = 'natural') {
    const res = await aiClient.generateImage(prompt, { size, quality, style });
    const url = res.images?.[0];
    if (!url) throw new Error('No image was returned. Try rephrasing the prompt.');
    return { url, revisedPrompt: res.revisedPrompt || prompt, model: res.model };
  },
};

export const useOpenAIImage = () => openaiImageService;
export default openaiImageService;
