// Core data interfaces
export interface GoogleResult {
  title: string;
  snippet: string;
  link: string;
}

export interface TrendCard {
  title: string;
  description: string;
  impact: number;
  audience: string[];
  platforms: string[];
  contentIdeas: string[];
  bestPractices: string[];
}
 
export interface InsightCard {
  title: string;
  type: 'consumer' | 'industry';
  keyFindings: string[];
  implications: string[];
  opportunities: string[];
  recommendations: string[];
}   

export interface SeasonalCard {
  topic: string;
  timing: string;
  relevance: number;
  description: string;
  marketingAngles: string[];
  contentSuggestions: string[];
}

export interface TriggerCard {
  productFeature: string;
  userNeed: string;
  purchaseIntent: number;
  conversionRate: number;
  relevance: number;
  recommendedProductContent: string[];
}

export interface MarketResearchAnalysis {
  executiveSummary: string;
  marketOverview: {
    targetAudience: string[];
    demographics: string[];
    psychographics: string[];
    channels: string[];
  };
  trends: TrendCard[];
  consumerInsights: InsightCard[];
  industryInsights: InsightCard[];
  seasonalTopics: SeasonalCard[];
  topTriggers: TriggerCard[];
  recommendations: {
    contentStrategy: string[];
    timing: string[];
    platforms: string[];
    messaging: string[];
  };
}

// API response interfaces
export interface GoogleSearchItem {
  title?: string;
  snippet?: string;
  link?: string;
}

export interface GroqChoice {
  message?: {
    content?: string;
  };
}