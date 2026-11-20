/**
 * GPT Image 2.6 generation and editing via the server-side gateway
 * (/api/ai/image and /api/ai/image-edit → OpenAI Images API).
 */
import { aiClient, type ImageOptions, type ImageEditOptions, type ImageResult } from './aiClient';

export type { ImageOptions, ImageEditOptions, ImageResult };

export const IMAGE_MODELS = [
  { id: 'gpt-image-2.6-flare', name: 'Flare', description: 'Fast iteration — best for quick drafts and interactive use' },
  { id: 'gpt-image-2.6-sunburst', name: 'Sunburst', description: 'Detailed compositions and consistent edits' },
] as const;

export const openaiImageService = {
  generate: (prompt: string, opts: ImageOptions = {}, onPartial?: (url: string, i: number) => void) =>
    aiClient.streamImage('generate', prompt, opts, onPartial),

  edit: (prompt: string, images: string[], opts: ImageEditOptions = {}, onPartial?: (url: string, i: number) => void) =>
    aiClient.streamImage('edit', prompt, { ...opts, images }, onPartial),

  /** Backwards-compatible single-image helper. */
  async generateImage(prompt: string, size = '1024x1024', quality = 'auto') {
    const res = await aiClient.generateImage(prompt, { size, quality: quality as ImageOptions['quality'] });
    return { url: res.images[0], revisedPrompt: res.revisedPrompt || prompt, model: res.model };
  },
};

export const useOpenAIImage = () => openaiImageService;
export default openaiImageService;
