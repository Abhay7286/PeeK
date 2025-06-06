import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Twitter API Response Types
interface TwitterAPITweet {
  tweet_id?: string;
  text?: string;
  created_at?: string;
  screen_name?: string;
  followers_count?: number;
  profile_url?: string;
  retweets?: number;
  favorites?: number;
  replies?: number;
  hashtags?: string[];
  user_mentions?: string[];
}

interface TwitterAPIResponse {
  timeline?: TwitterAPITweet[];
  status?: string;
}

// Enhanced Tweet Types
interface EnhancedTweet {
  content: string;
  engagement: number;
  created_at: string;
  author: string;
  hashtags: string[];
  mentions: string[];
}

// Trend Analysis Types
interface Trigger {
  name: string;
  description: string;
  impact_score: number; // 1-10 scale
  frequency: number;
  examples: string[];
}

interface Trend {
  name: string;
  description: string;
  popularity_score: number; // 1-10 scale
  growth_rate: number; // Percentage
  examples: string[];
}

interface UpcomingTrend {
  name: string;
  description: string;
  prediction_confidence: number; // 1-10 scale
  potential_impact: number; // 1-10 scale
  early_indicators: string[];
}

// Analysis Result Types
interface SentimentAnalysis {
  score: number; // -1 to 1
  label: 'positive' | 'negative' | 'neutral';
  confidence: number; // 0-1
}

interface Analysis {
  overview: string;
  sentimentAnalysis: SentimentAnalysis;
  triggers: Trigger[]; // Exactly 3
  currentTrends: Trend[]; // Exactly 3
  upcomingTrends: UpcomingTrend[]; // Exactly 3
  relevantHashtags: { tag: string; count: number; relevance: number }[]; // Top 5
  trendInsights: {
    comparisons: string[];
    actionableInsights: string[];
    demographicPatterns: string[];
  };
}

interface AnalysisResult {
  success: boolean;
  data?: {
    analysis: Analysis;
    tweets: EnhancedTweet[]; // Raw tweets for frontend display
    timestamp: string;
  };
  error?: string;
}

export async function getXAnalyticsModel() {
  const { data } = await supabase
    .from('api_models')
    .select('model_name')
    .eq('api_name', 'XAnalytics')
    .single();
  
  return data?.model_name;
}

export class TwitterAnalysisService {
  private static readonly CONFIG = {
    TWITTER_API_URL: 'https://twitter-api45.p.rapidapi.com/search.php',
    TIMEOUT: 30000,
    MAX_TWEETS: 50,
    MAX_TWEETS_FOR_ANALYSIS: 30,
    MAX_CONTENT_LENGTH: 100,
    API_KEYS: {
      RAPID_API: process.env.NEXT_PUBLIC_X_RAPID_API_KEY,
      GROQ: process.env.NEXT_PUBLIC_X_GROQ_API_KEY
    },
    RETRY: {
      MAX_ATTEMPTS: 3,
      INITIAL_BACKOFF: 2000,
      MAX_BACKOFF: 15000,
    }
  };

  private static async fetchWithTimeout(
    url: string, 
    options: RequestInit, 
    timeout: number = this.CONFIG.TIMEOUT
  ): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });
      clearTimeout(id);
      return response;
    } catch (error) {
      clearTimeout(id);
      throw error;
    }
  }

  private static async makeRequest(
    url: string,
    options: RequestInit,
    attempt: number = 1
  ): Promise<Response> {
    try {
      const response = await this.fetchWithTimeout(url, options);
      
      if (response.status === 429 && attempt < this.CONFIG.RETRY.MAX_ATTEMPTS) {
        const retryAfter = parseInt(response.headers.get('Retry-After') || '5');
        const backoff = Math.max(
          retryAfter * 1000,
          Math.min(
            this.CONFIG.RETRY.INITIAL_BACKOFF * Math.pow(2, attempt - 1),
            this.CONFIG.RETRY.MAX_BACKOFF
          )
        );
        await new Promise(resolve => setTimeout(resolve, backoff));
        return this.makeRequest(url, options, attempt + 1);
      }
      
      return response;
    } catch (error) {
      if (error instanceof Error && 
          error.name === 'AbortError' && 
          attempt < this.CONFIG.RETRY.MAX_ATTEMPTS) {
        await new Promise(resolve => 
          setTimeout(resolve, this.CONFIG.RETRY.INITIAL_BACKOFF * Math.pow(2, attempt - 1))
        );
        return this.makeRequest(url, options, attempt + 1);
      }
      throw error;
    }
  }

  private static extractHashtags(text: string): string[] {
    const hashtags: string[] = [];
    const regex = /#[\w\u0590-\u05ff]+/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      hashtags.push(match[0].toLowerCase());
    }
    
    return hashtags;
  }
  
  private static extractMentions(text: string): string[] {
    const mentions: string[] = [];
    const regex = /@[\w]+/g;
    let match;
    
    while ((match = regex.exec(text)) !== null) {
      mentions.push(match[0].toLowerCase());
    }
    
    return mentions;
  }

  public static async analyzeTweets(query: string, options?: {
    industry?: string
  }): Promise<AnalysisResult> {
    try {
      if (!query?.trim()) {
        return { success: false, error: 'Query cannot be empty' };
      }

      if (!this.CONFIG.API_KEYS.RAPID_API || !this.CONFIG.API_KEYS.GROQ) {
        return { success: false, error: 'API keys not configured' };
      }

      // Fetch model name from Supabase
      const modelName = await getXAnalyticsModel();
      if (!modelName) {
        return { success: false, error: 'Failed to fetch model configuration' };
      }

      const searchUrl = new URL(this.CONFIG.TWITTER_API_URL);
      searchUrl.searchParams.append('query', query);
      searchUrl.searchParams.append('count', this.CONFIG.MAX_TWEETS.toString());

      const twitterResponse = await this.makeRequest(searchUrl.toString(), {
        method: 'GET',
        headers: {
          'x-rapidapi-key': this.CONFIG.API_KEYS.RAPID_API,
          'x-rapidapi-host': new URL(this.CONFIG.TWITTER_API_URL).hostname
        }
      });

      if (!twitterResponse.ok) {
        throw new Error(`Twitter API error: ${twitterResponse.status}`);
      }

      const data: TwitterAPIResponse = await twitterResponse.json();
      
      if (!data?.timeline || !Array.isArray(data.timeline)) {
        throw new Error('Invalid Twitter API response format');
      }

      const tweets = data.timeline
        .filter((tweet: TwitterAPITweet): tweet is Required<Pick<TwitterAPITweet, 'text'>> => 
          Boolean(tweet?.text))
        .map((tweet: TwitterAPITweet): EnhancedTweet => {
          const content = this.sanitizeText(tweet.text || '', this.CONFIG.MAX_CONTENT_LENGTH);
          const engagement = (tweet.retweets || 0) + (tweet.favorites || 0) + (tweet.replies || 0);
          const hashtags = tweet.hashtags || this.extractHashtags(content);
          const mentions = tweet.user_mentions || this.extractMentions(content);
          
          return {
            content,
            engagement,
            created_at: tweet.created_at || new Date().toISOString(),
            author: tweet.screen_name || 'anonymous',
            hashtags,
            mentions
          };
        })
        .sort((a: EnhancedTweet, b: EnhancedTweet) => b.engagement - a.engagement)
        .slice(0, this.CONFIG.MAX_TWEETS_FOR_ANALYSIS);

      if (tweets.length === 0) {
        return { success: false, error: 'No valid tweets found' };
      }

      const analysisContext = {
        query,
        sampleSize: tweets.length,
        industry: options?.industry || 'general',
        tweets: tweets.map(t => ({
          content: t.content,
          engagement: t.engagement,
          created_at: t.created_at,
          author: t.author,
          hashtags: t.hashtags,
          mentions: t.mentions
        }))
      };

      const groqResponse = await this.makeRequest(
        'https://api.groq.com/openai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.CONFIG.API_KEYS.GROQ}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelName, // Use dynamic model name from Supabase
            messages: [
              {
                role: 'system',
                content: this.getTrendsAnalysisPrompt(query, options)
              },
              {
                role: 'user',
                content: JSON.stringify(analysisContext)
              }
            ],
            temperature: 0.4,
            max_tokens: 3000,
            response_format: { type: 'json_object' }
          })
        }
      );

      if (!groqResponse.ok) {
        throw new Error(`Groq API error: ${groqResponse.status}`);
      }

      const result = await groqResponse.json();
      const analysis = result.choices[0].message.content;

      return {
        success: true,
        data: {
          analysis: JSON.parse(analysis),
          tweets, // Pass raw tweets for frontend display
          timestamp: new Date().toISOString()
        }
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Analysis error:', error);
      return { success: false, error: errorMessage };
    }
  }

  private static getTrendsAnalysisPrompt(query: string, options?: {
    industry?: string
  }): string {
    const industry = options?.industry || 'general';
    
    return `You are an expert social media trend analyst with deep expertise in identifying patterns, sentiment shifts, and emerging movements in social media data.
    
Your task is to analyze tweets about "${query}" in the ${industry} industry and provide actionable trend insights.

Analyze the provided tweets with specific focus on:
1. Identifying exactly 3 key triggers (events or themes that provoke responses)
2. Identifying exactly 3 current trends (popular topics or patterns)
3. Predicting exactly 3 upcoming trends (emerging patterns with potential growth)
4. Providing detailed trend insights that go beyond basic statistics

Provide an analysis in the following JSON format:

{
  "overview": "Concise summary of key findings limited to 2-3 sentences",
  
  "sentimentAnalysis": {
    "score": "Number from -1 to 1",
    "label": "positive/negative/neutral",
    "confidence": "0-1 confidence score"
  },
  
  "triggers": [
    {
      "name": "Clear name of the trigger",
      "description": "Concise explanation of this trigger",
      "impact_score": "Impact score (1-10)",
      "frequency": "Frequency count or estimate",
      "examples": ["1-2 representative tweet examples"]
    }
  ] (exactly 3 items),
  
  "currentTrends": [
    {
      "name": "Clear name of the trend",
      "description": "Concise explanation of this trend",
      "popularity_score": "Popularity score (1-10)",
      "growth_rate": "Estimated percentage growth",
      "examples": ["1-2 representative tweet examples"]
    }
  ] (exactly 3 items),
  
  "upcomingTrends": [
    {
      "name": "Clear name of the emerging trend",
      "description": "Concise explanation of this potential trend",
      "prediction_confidence": "Confidence score (1-10)",
      "potential_impact": "Potential impact score (1-10)",
      "early_indicators": ["1-2 early signs of this trend"]
    }
  ] (exactly 3 items),
  
  "relevantHashtags": [
    {
      "tag": "Hashtag",
      "count": "Frequency",
      "relevance": "Relevance score (1-10)"
    }
  ] (top 5 only),
  
  "trendInsights": {
    "comparisons": [
      "How current trends compare to previous industry patterns",
      "Cross-industry trend comparisons when relevant",
      "Audience reception differences between competing trends"
    ],
    "actionableInsights": [
      "Specific ways businesses can capitalize on these trends",
      "Recommended content strategies based on trend analysis",
      "Optimal engagement approaches for identified trends"
    ],
    "demographicPatterns": [
      "Notable demographic patterns in trend engagement",
      "Audience segments most responsive to each trend",
      "Geographic or cultural variations in trend adoption"
    ]
  }
}

Your analysis should be highly specific to the ${industry} industry and provide genuinely valuable trend intelligence. Focus on revealing hidden patterns, unexpected connections, and actionable strategic insights rather than surface-level observations. Identify what makes each trend uniquely relevant to this topic and why it matters.`;
  }

  private static sanitizeText(text: string, maxLength: number = 280): string {
    if (!text) return '';
    const sanitized = text.replace(/\s+/g, ' ').trim();
    return sanitized.length <= maxLength ? sanitized : 
           sanitized.substring(0, maxLength - 3) + '...';
  }
}

export const useTwitterAnalysis = () => {
  const [data, setData] = useState<AnalysisResult['data'] | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (
    query: string, 
    options?: {
      industry?: string
    }
  ): Promise<AnalysisResult> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await TwitterAnalysisService.analyzeTweets(query, options);
      if (result.success && result.data) {
        setData(result.data);
      } else {
        setError(result.error || 'Analysis failed');
      }
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Analysis failed';
      setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setIsLoading(false);
    }
  };

  return { data, isLoading, error, analyze };
};