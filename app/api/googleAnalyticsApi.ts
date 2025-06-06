import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
);

// Types
interface GoogleResult {
  title: string;
  snippet: string;
  link: string;
}

interface TrendCard {
  title: string;
  description: string;
  impact: number;
  audience: string[];
  platforms: string[];
  contentIdeas: string[];
  bestPractices: string[];
}

interface InsightCard {
  title: string;
  type: 'consumer' | 'industry';
  keyFindings: string[];
  implications: string[];
  opportunities: string[];
  recommendations: string[];
}   

interface SeasonalCard {
  topic: string;
  timing: string;
  relevance: number;
  description: string;
  marketingAngles: string[];
  contentSuggestions: string[];
}

interface TriggerCard {
  productFeature: string;
  userNeed: string;
  purchaseIntent: number;
  conversionRate: number;
  relevance: number;
  recommendedProductContent: string[];
}

interface MarketResearchAnalysis {
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

interface MarketResearchResponse {
  success: boolean;
  googleResults?: GoogleResult[];
  analysis?: MarketResearchAnalysis;
  timestamp?: string;
  error?: string;
}

// Google Search API response interfaces
interface GoogleSearchItem {
  title?: string;
  snippet?: string;
  link?: string;
}

interface GoogleSearchResponse {
  items?: GoogleSearchItem[];
}

// Groq API response interfaces
interface GroqChoice {
  message?: {
    content?: string;
  };
}

interface GroqResponse {
  choices?: GroqChoice[];
}

// Configuration
const CONFIG = {
  REQUEST_TIMEOUT: 60000,
  API_KEYS: {
    GOOGLE: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    SEARCH_ENGINE_ID: process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID,
    GROQ: process.env.NEXT_PUBLIC_GOOGLE_GROQ_API_KEY
  }
} as const;

const MARKET_RESEARCH_PROMPT = `Give me a JSON Output only. You are a highly skilled marketing analyst with expertise in digital advertising, content strategy, and emerging trends in the Indian market. Conduct a deep-dive analysis of the provided search results and generate a comprehensive advertising research report in JSON format. This report should emphasize actionable insights, data-driven recommendations, and strategic opportunities tailored for Indian audiences across urban and tier-2/3 cities.

  "executiveSummary": "HTML-formatted overview highlighting key opportunities for advertising and content creation",
  
  "marketOverview": {
    "targetAudience": ["Detailed audience segments with demographics and interests"],
    "demographics": ["Key demographic characteristics"],
    "psychographics": ["Behavioral patterns and preferences"],
    "channels": ["Most effective marketing channels"]
  },
  
  "trends": [
    {
      "title": "Trend name",
      "description": "HTML-formatted trend analysis focusing on advertising potential",
      "impact": "Impact score (0-100)",
      "audience": ["Specific audience segments this trend resonates with"],
      "platforms": ["Best platforms to leverage this trend"],
      "contentIdeas": ["Specific content ideas to capitalize on trend"],
      "bestPractices": ["Best practices for trend-based content"]
    }
  ],
  
  "consumerInsights": [
    {
      "title": "Insight title",
      "type": "consumer",
      "keyFindings": ["Critical consumer behavior patterns"],
      "implications": ["Marketing implications"],
      "opportunities": ["Specific advertising opportunities"],
      "recommendations": ["Tactical recommendations for content"]
    }
  ],
  
  "industryInsights": [
    {
      "title": "Insight title",
      "type": "industry",
      "keyFindings": ["Industry patterns and shifts"],
      "implications": ["Impact on advertising strategy"],
      "opportunities": ["Market opportunities to exploit"],
      "recommendations": ["Strategic recommendations"]
    }
  ],
  
  "seasonalTopics": [
    {
      "topic": "Seasonal theme",
      "timing": "Optimal timing window",
      "relevance": "Relevance score (0-100)",
      "description": "HTML-formatted topic analysis",
      "marketingAngles": ["Specific marketing angles"],
      "contentSuggestions": ["Content ideas with formats"]
    }
  ],
  
  "topTriggers": [
    {
      "productFeature": "Specific product feature or attribute",
      "userNeed": "Specific user need this feature addresses",
      "relevance": "Relevance score to product (0-100)",
      "recommendedProductContent": ["Product-specific content recommendations"]
    }
  ],
  
  "recommendations": {
    "contentStrategy": ["Content creation and distribution strategies"],
    "timing": ["Optimal timing for different content types"],
    "platforms": ["Platform-specific recommendations"],
    "messaging": ["Key messaging frameworks"]
  }
}
  
Give me 9 topTriggers, 3 trends, 3 consumerInsights, 3 industryInsights, 3  India Specific seasonalTopics, 3 recommendations. `;

// Function to get model name from Supabase
export async function getGoogleAnalyticsModel() {
  const { data } = await supabase
    .from('api_models')
    .select('model_name')
    .eq('api_name', 'GoogleAnalytics')
    .single();
  
  return data?.model_name;
}

export class MarketResearchService {
  private static activeRequests = new Map<string, Promise<MarketResearchResponse>>();

  private static async fetchWithTimeout(
    url: string,
    options: RequestInit
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CONFIG.REQUEST_TIMEOUT);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out');
      }
      throw error;
    }
  }

  private static validateConfiguration(): void {
    if (!CONFIG.API_KEYS.GOOGLE || !CONFIG.API_KEYS.SEARCH_ENGINE_ID || !CONFIG.API_KEYS.GROQ) {
      throw new Error('API keys not configured');
    }
  }

  private static async fetchGoogleResults(query: string): Promise<GoogleResult[]> {
    const searchUrl = new URL('https://www.googleapis.com/customsearch/v1');
    searchUrl.searchParams.append('key', CONFIG.API_KEYS.GOOGLE || '');
    searchUrl.searchParams.append('cx', CONFIG.API_KEYS.SEARCH_ENGINE_ID || '');
    searchUrl.searchParams.append('q', `${query}`);
    searchUrl.searchParams.append('num', '9');

    const response = await this.fetchWithTimeout(searchUrl.toString(), { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json() as GoogleSearchResponse;
    if (!data?.items || !Array.isArray(data.items)) {
      throw new Error('Invalid Google Search API response format');
    }

    return data.items.map((item: GoogleSearchItem) => ({
      title: item.title || 'No title available',
      snippet: item.snippet || 'No snippet available',
      link: item.link || '#',
    }));
  }

  private static async generateAnalysis(
    query: string,
    results: GoogleResult[]
  ): Promise<MarketResearchAnalysis> {
    // Fetch model name from Supabase
    const modelName = await getGoogleAnalyticsModel();
    
    if (!modelName) {
      throw new Error('Unable to fetch model name from database');
    }

    const response = await this.fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName,
          messages: [
            { role: 'system', content: MARKET_RESEARCH_PROMPT },
            { 
              role: 'user', 
              content: `Analyze these search results for ${query} and provide product-focused insights in json format only:\n${JSON.stringify(results, null, 2)}` 
            },
          ],
          temperature: 0.4,
          max_tokens: 4500,
          response_format: { type: 'json_object' },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        `Groq API error (${response.status}): ${
          errorData ? JSON.stringify(errorData) : response.statusText
        }`
      );
    }

    const data = await response.json() as GroqResponse;
    const analysis = data?.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated from Groq API');
    }

    return JSON.parse(analysis) as MarketResearchAnalysis;
  }

  public static async researchMarket(query: string): Promise<MarketResearchResponse> {
    if (!query.trim()) {
      return { success: false, error: 'Query cannot be empty' };
    }

    try {
      const activeRequest = this.activeRequests.get(query);
      if (activeRequest) {
        return activeRequest;
      }

      this.validateConfiguration();

      const newRequest = (async () => {
        try {
          const googleResults = await this.fetchGoogleResults(query);
          if (googleResults.length === 0) {
            return { success: false, error: 'No search results found' };
          }

          const analysis = await this.generateAnalysis(query, googleResults);
          return {
            success: true,
            googleResults,
            analysis,
            timestamp: new Date().toISOString(),
          };
        } finally {
          this.activeRequests.delete(query);
        }
      })();

      this.activeRequests.set(query, newRequest);
      return newRequest;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Market research error:', error);
      return { success: false, error: errorMessage };
    }
  }
}

export const useMarketResearch = () => {
  const [researchData, setResearchData] = useState<MarketResearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const research = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await MarketResearchService.researchMarket(query);
      setResearchData(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const clearResearch = () => {
    setResearchData(null);
    setError(null);
  };

  return {
    googleResults: researchData?.googleResults,
    analysis: researchData?.analysis,
    timestamp: researchData?.timestamp,
    research,
    clearResearch,
    isLoading,
    error: researchData?.error || error,
    isSuccess: researchData?.success || false
  };
};