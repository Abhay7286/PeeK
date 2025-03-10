import { useState } from 'react';

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
  recommendations: {
    contentStrategy: string[];
    timing: string[];
    platforms: string[];
    messaging: string[];
  };
}

interface GoogleSearchData {
  success: boolean;
  data?: {
    results: GoogleResult[];
    analysis: MarketResearchAnalysis;
    timestamp: string;
  };
  error?: string;
}

// Configuration
const CONFIG = {
  REQUEST_TIMEOUT: 60000,
  API_KEYS: {
    GOOGLE: process.env.NEXT_PUBLIC_GOOGLE_API_KEY,
    SEARCH_ENGINE_ID: process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID,
    GROQ: process.env.NEXT_PUBLIC_GROQ_API_KEY
  }
} as const;

const MARKET_RESEARCH_PROMPT = `You are a highly skilled marketing analyst with expertise in digital advertising, content strategy, and emerging trends in the Indian market. Conduct a deep-dive analysis of the provided search results and generate a comprehensive advertising research report in JSON format. This report should emphasize actionable insights, data-driven recommendations, and strategic opportunities tailored for Indian audiences across urban and tier-2/3 cities.

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
  
  "recommendations": {
    "contentStrategy": ["Content creation and distribution strategies"],
    "timing": ["Optimal timing for different content types"],
    "platforms": ["Platform-specific recommendations"],
    "messaging": ["Key messaging frameworks"]
  }
}

Guidelines:
Tiktok is banned in India.
Give me Creative ideas only, not Generic Ideas.
And use Complex Marketing Language.
Ensure all insights are specific to the Indian market.
Provide six well-researched trend analyses with clear examples.
Generate three consumer insights focusing on behavioral shifts.
Create three industry insights highlighting market disruptions.
Include three seasonal content ideas with optimal timing windows.
Recommend hashtags, keywords, and engagement benchmarks.
Balance organic and paid marketing opportunities.
Address both metro and non-metro digital trends.
Consider viral potential and interactive formats (polls, quizzes, live sessions).
Suggest clear CTAs to drive conversions.`;

// Main service class
export class MarketResearchService {
  private static activeRequests = new Map<string, Promise<GoogleSearchData>>();

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
    searchUrl.searchParams.append('q', `${query} trends marketing advertising content social media`);
    searchUrl.searchParams.append('num', '10');

    const response = await this.fetchWithTimeout(searchUrl.toString(), { method: 'GET' });

    if (!response.ok) {
      throw new Error(`Google Search API error: ${response.status}`);
    }

    const data = await response.json();
    if (!data?.items || !Array.isArray(data.items)) {
      throw new Error('Invalid Google Search API response format');
    }

    return data.items.map((item: any) => ({
      title: item.title || 'No title available',
      snippet: item.snippet || 'No snippet available',
      link: item.link || '#',
    }));
  }

  private static async generateAnalysis(
    query: string,
    results: GoogleResult[]
  ): Promise<MarketResearchAnalysis> {
    const response = await this.fetchWithTimeout(
      'https://api.groq.com/openai/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${CONFIG.API_KEYS.GROQ}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'deepseek-r1-distill-qwen-32b',
          messages: [
            { role: 'system', content: MARKET_RESEARCH_PROMPT },
            { 
              role: 'user', 
              content: `Analyze these search results for ${query} and provide advertising and content marketing insights in json format:\n${JSON.stringify(results, null, 2)}` 
            },
          ],
          temperature: 0.7,
          max_tokens: 4000,
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

    const data = await response.json();
    const analysis = data?.choices?.[0]?.message?.content;

    if (!analysis) {
      throw new Error('No analysis generated from Groq API');
    }

    return JSON.parse(analysis);
  }

  public static async researchMarket(query: string): Promise<GoogleSearchData> {
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
          const results = await this.fetchGoogleResults(query);
          if (results.length === 0) {
            return { success: false, error: 'No search results found' };
          }

          const analysis = await this.generateAnalysis(query, results);
          const response: GoogleSearchData = {
            success: true,
            data: {
              results,
              analysis,
              timestamp: new Date().toISOString(),
            },
          };

          return response;
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

// React hook
export const useMarketResearch = () => {
  const [researchData, setResearchData] = useState<GoogleSearchData | null>(null);
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
    researchData,
    research,
    clearResearch,
    isLoading,
    error
  };
};