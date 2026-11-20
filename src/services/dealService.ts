/**
 * Thin data-access helpers over the deal store, plus AI deal analysis.
 */
import { useDealStore } from '../store/dealStore';
import { aiContent } from './aiContentService';

const allDeals = () => (useDealStore.getState() as any).deals as any[];

export const dealService = {
  getDeals: () => allDeals(),
  getDealById: (id: string) => allDeals().find((d) => d.id === id),
  analyzeDeal: (deal: any) => aiContent.analyzeDeal(deal),
};

export default dealService;
