/**
 * Deals store `stage` as a DealStage object ({ id, name, ... }), but some older
 * data and components use a plain string id. These helpers handle both.
 */
export const stageId = (deal: { stage?: any }): string =>
  typeof deal?.stage === 'string' ? deal.stage : deal?.stage?.id || '';

export const stageName = (deal: { stage?: any }): string =>
  typeof deal?.stage === 'string' ? deal.stage : deal?.stage?.name || deal?.stage?.id || '';

export const isClosedDeal = (deal: { stage?: any }): boolean => stageId(deal).startsWith('closed');

export const isOpenDeal = (deal: { stage?: any }): boolean => !isClosedDeal(deal);
