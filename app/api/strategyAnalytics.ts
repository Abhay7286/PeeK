import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase client setup
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Types
interface Competitor {
  name: string;
  strengths: string[];
  weaknesses: string[];
  marketShare: number;
  uniqueSellingPoints: string[];
  targetAudience: string[];
  marketingChannels: string[];
  recentCampaigns: string[];
}

interface CaseStudy {
  companyName: string;
  industry: string;
  challenge: string;
  solution: string;
  outcome: string;
  keyLearnings: string[];
  applicability: string;
}

interface MarketingTactic {
  name: string;
  description: string;
  expectedROI: number;
  timeToImplement: string;
  resourceRequirements: string[];
  bestPractices: string[];
  successMetrics: string[];
}

interface ContentPillar {
  theme: string;
  description: string;
  audienceResonance: number;
  channels: string[];
  contentFormats: string[];
  keyMessages: string[];
  frequencyRecommendation: string;
}

interface StorytellingStrategy {
  narrativeArc: string;
  characterJourney: string;
  emotionalHooks: string[];
  brandAlignment: string;
  distributionChannels: string[];
  engagementTriggers: string[];
}

interface MarketingStrategy {
  executiveSummary: string;
  marketAnalysis: {
    industrySize: string;
    growthRate: number;
    keyDrivers: string[];
    barriers: string[];
    emergingOpportunities: string[];
  };
  competitorAnalysis: Competitor[];
  targetAudience: {
    primaryPersonas: string[];
    secondaryPersonas: string[];
    audienceInsights: string[];
    painPoints: string[];
    desiredOutcomes: string[];
    decisionJourney: string[];
  };
  positioningStrategy: {
    uniqueValueProposition: string;
    brandVoice: string;
    keyDifferentiators: string[];
    messagingFramework: string[];
    perceptionMapping: string;
  };
  caseStudies: CaseStudy[];
  marketingTactics: MarketingTactic[];
  contentPillars: ContentPillar[];
  storytellingStrategies: StorytellingStrategy[];
}

interface StrategyAnalysisResponse {
  success: boolean;
  data?: {
    strategy: MarketingStrategy;
    timestamp: string;
  };
  error?: string;
}

// Configuration
const CONFIG = {
  REQUEST_TIMEOUT: 90000, // Extended timeout for more comprehensive analysis
  API_KEYS: {
    GROQ: process.env.NEXT_PUBLIC_STRATEGY_GROQ_API_KEY
  }
} as const;

const MARKETING_STRATEGY_PROMPT = `Give only JSON as Output. You are a world-class marketing strategist with 25+ years of experience advising Fortune 500 companies and disruptive startups. Your expertise spans brand strategy, competitive intelligence, audience insights, and innovative campaign execution.
Generate a comprehensive marketing strategy analysis in JSON format that provides actionable, data-backed recommendations based on industry best practices and emerging trends. Do not merely describe what marketing is - provide specific, implementable strategies tailored to the query. 
Your analysis should follow this structure:

{
  "executiveSummary": "HTML-formatted strategic overview highlighting key competitive advantages and go-to-market approach",
  
  "marketAnalysis": {
    "industrySize": "Market size with projected growth",
    "growthRate": "Annual growth percentage",
    "keyDrivers": ["Primary factors driving industry growth"],
    "barriers": ["Market entry and scaling challenges"],
    "emergingOpportunities": ["Untapped opportunities and whitespace"]
  },
  
  "competitorAnalysis": [
    {
      "name": "Competitor name",
      "strengths": ["Key competitive advantages"],
      "weaknesses": ["Strategic vulnerabilities"],
      "marketShare": "Estimated market share percentage",
      "uniqueSellingPoints": ["Differentiating features or benefits"],
      "targetAudience": ["Primary audience segments"],
      "marketingChannels": ["Primary channels used"],
      "recentCampaigns": ["Notable recent marketing initiatives"]
    }
  ],
  
  "targetAudience": {
    "primaryPersonas": ["Detailed persona descriptions"],
    "secondaryPersonas": ["Secondary market segments"],
    "audienceInsights": ["Deep behavioral and psychographic insights"],
    "painPoints": ["Unmet needs and friction points"],
    "desiredOutcomes": ["Customer goals and success metrics"],
    "decisionJourney": ["Stages of the buyer's journey with touchpoints"]
  },
  
  "positioningStrategy": {
    "uniqueValueProposition": "Compelling UVP statement",
    "brandVoice": "Tone and communication style",
    "keyDifferentiators": ["Unique market positioning elements"],
    "messagingFramework": ["Key messages by audience segment"],
    "perceptionMapping": "How to shift market perception"
  },
  
  "caseStudies": [
    {
      "companyName": "Similar company name",
      "industry": "Industry vertical",
      "challenge": "Business challenge faced",
      "solution": "Strategic approach implemented",
      "outcome": "Measurable results achieved",
      "keyLearnings": ["Transferable insights"],
      "applicability": "How to apply to current situation"
    }
  ],
  
  "marketingTactics": [
    {
      "name": "Tactical approach name",
      "description": "Detailed explanation of the tactic",
      "expectedROI": "Projected return on investment percentage",
      "timeToImplement": "Implementation timeframe",
      "resourceRequirements": ["Required team, tools, and budget"],
      "bestPractices": ["Implementation recommendations"],
      "successMetrics": ["KPIs to measure effectiveness"]
    }
  ],
  
  "contentPillars": [
    {
      "theme": "Content theme name",
      "description": "Theme explanation and rationale",
      "audienceResonance": "Resonance score (0-100)",
      "channels": ["Optimal distribution channels"],
      "contentFormats": ["Recommended content types"],
      "keyMessages": ["Core messages to communicate"],
      "frequencyRecommendation": "Publishing cadence"
    }
  ],
  
  "storytellingStrategies": [
    {
      "narrativeArc": "Story structure recommendation",
      "characterJourney": "Customer/hero journey narrative",
      "emotionalHooks": ["Key emotional triggers to leverage"],
      "brandAlignment": "How the story reinforces brand values",
      "distributionChannels": ["Best platforms for storytelling"],
      "engagementTriggers": ["Elements that drive audience interaction"]
    }
  ]
}

Guidelines:
- Show the money in Rs
- Return ONLY JSON with no explanatory text
- Include 5 major competitors with detailed analysis of their strategies
- Provide 3 relevant case studies with actionable learnings
- Recommend 6 high-impact marketing tactics with clear implementation paths
- Develop 4 content pillars that create market differentiation
- Create 3 storytelling strategies that build emotional connection
- Include specifics about Indian market when relevant
- For India-specific queries, note that TikTok is banned in India
- Avoid generic advice - provide industry-specific strategies
- Use sophisticated marketing terminology appropriate for professionals
- Focus on both immediate wins and long-term strategic advantages
- Address both B2B and B2C approaches when applicable
- Consider the impact of current economic conditions
- Incorporate both traditional and digital marketing approaches
- Include specific examples, names, and metrics based on industry benchmarks
- Prioritize recommendations based on impact and implementation difficulty`;

// Function to get model name from Supabase
export async function getStrategyAnalysisModel() {
  const { data } = await supabase
    .from('api_models')
    .select('model_name')
    .eq('api_name', 'StrategyAnalysis')
    .single();
  
  return data?.model_name;
}

// Main service class
export class MarketingStrategyService {
  private static activeRequests = new Map<string, Promise<StrategyAnalysisResponse>>();

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
    if (!CONFIG.API_KEYS.GROQ) {
      throw new Error('API key not configured');
    }
  }

  private static async generateStrategyAnalysis(query: string): Promise<MarketingStrategy> {
    // Fetch model name from Supabase
    const modelName = await getStrategyAnalysisModel();
    
    if (!modelName) {
      throw new Error('Model name not found in database');
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
            { role: 'system', content: MARKETING_STRATEGY_PROMPT },
            { 
              role: 'user', 
              content: `Develop a comprehensive marketing strategy for: ${query}. Return ONLY JSON format with no additional text or explanation.` 
            },
          ],
          temperature: 0.4,
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
    const strategyContent = data?.choices?.[0]?.message?.content;

    if (!strategyContent) {
      throw new Error('No strategy generated from Groq API');
    }

    return JSON.parse(strategyContent);
  }

  public static async analyzeMarketingStrategy(query: string): Promise<StrategyAnalysisResponse> {
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
          const strategy = await this.generateStrategyAnalysis(query);
          const response: StrategyAnalysisResponse = {
            success: true,
            data: {
              strategy,
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
      console.error('Marketing strategy error:', error);
      return { success: false, error: errorMessage };
    }
  }
}

// React hook
export const useMarketingStrategy = () => {
  const [strategyData, setStrategyData] = useState<StrategyAnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const analyzeStrategy = async (query: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await MarketingStrategyService.analyzeMarketingStrategy(query);
      setStrategyData(result);
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  const clearStrategy = () => {
    setStrategyData(null);
    setError(null);
  };

  return {
    strategyData,
    analyzeStrategy,
    clearStrategy,
    isLoading,
    error
  };
};