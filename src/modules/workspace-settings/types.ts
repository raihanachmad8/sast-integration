/**
 * PR Review settings shared between client API and server service.
 * Canonical source — both import from here.
 */

export interface PrReviewSettings {
  postPrSummaryComment: boolean;
  inlineCodeAnnotations: boolean;
  publishQualityGateStatus: boolean;
  statusContext: string;
  reviewSummaryFormat: 'compact' | 'detailed';
}
