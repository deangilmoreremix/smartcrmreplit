/**
 * Semantic search with OpenAI embeddings via the server-side gateway (/api/ai/embed).
 */
import { aiClient } from './aiClient';

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
}

const describeContact = (c: any) =>
  [c.name, c.title || c.position, c.company, c.industry, c.email, c.notes, (c.tags || []).join(' ')]
    .filter(Boolean)
    .join(' | ');

const describeDeal = (d: any) =>
  [d.title || d.name, d.company, d.stage, d.value ? 'value ' + d.value : '', d.description, d.notes]
    .filter(Boolean)
    .join(' | ');

export const openaiEmbeddingsService = {
  createEmbedding: async (text: string) => (await aiClient.embed(text))[0],

  /** Rank items by semantic similarity to the query. */
  async semanticSearch<T>(query: string, items: T[], toText: (item: T) => string, limit = 10) {
    if (!items.length) return [] as Array<{ item: T; score: number }>;
    const texts = items.map((i) => toText(i).slice(0, 2000));
    const [queryEmbedding, ...itemEmbeddings] = await aiClient.embed([query, ...texts]);
    return items
      .map((item, i) => ({ item, score: cosineSimilarity(queryEmbedding, itemEmbeddings[i]) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);
  },

  searchContacts: (query: string, contacts: any[], limit = 10) =>
    openaiEmbeddingsService.semanticSearch(query, contacts, describeContact, limit),

  searchDeals: (query: string, deals: any[], limit = 10) =>
    openaiEmbeddingsService.semanticSearch(query, deals, describeDeal, limit),
};

export const useOpenAIEmbeddings = () => openaiEmbeddingsService;
export default openaiEmbeddingsService;
