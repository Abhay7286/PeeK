// app/api/redditAnalysis.ts
export interface RedditResult {
  title: string;
  subreddit: string;
  snippet: string;
  link?: string;
  source_url?: string; // Added source URL from Reddit API
  engagement_metrics?: {
    upvote_ratio: number;
    comment_count: number;
    awards: number;
  };
  top_comments?: {
    body: string;
    score: number;
    author: string;
  }[];
}

export interface PainPoint {
  issue: string;
  frequency: number; // 0-100
  impact_score: number; // 0-100
  verbatim_quotes: string[];
  suggested_solutions: string[];
  sources?: string[]; // Added sources for pain points
}

export interface NicheCommunity {
  segment: string;
  demographic_indicators: string[];
  discussion_themes: string[];
  engagement_level: number; // 0-100
  influence_score: number; // 0-100
  key_influencers: string[];
  sources?: string[]; // Added sources for niche communities
}

export interface SentimentAnalysis {
  overall_sentiment: number; // -100 to 100
  emotional_triggers: {
    trigger: string;
    intensity: number; // 0-100
    context: string;
    activation_phrases: string[];
    sources?: string[]; // Added sources for emotional triggers
  }[];
  brand_perception: {
    positive_attributes: string[];
    negative_attributes: string[];
    neutral_observations: string[];
  };
}

export interface MarketingInsight {
  overview: string;
  recurring_pain_points: PainPoint[];
  niche_communities: NicheCommunity[];
  sentiment_analysis: SentimentAnalysis;
  psychographic_insights: {
    motivation_factors: string[];
    decision_drivers: string[];
    adoption_barriers: string[];
  };
  competitive_intelligence: {
    market_positioning: string;
    share_of_voice: number;
    competitive_advantages: string[];
    threat_assessment: string;
  };
  sources: string[]; // Added overall sources array
}

export interface SearchParams {
  relevance?: 'relevance' | 'hot' | 'new' | 'top' | 'comments';
  timeframe?: 'all' | 'year' | 'month' | 'week' | 'day' | 'hour';
}

// Response interface including metadata
export interface RedditAnalyticsResponse {
  results: RedditResult[];
  insights: MarketingInsight;
  metadata?: {
    total_posts_found: number;
    quality_posts_processed: number;
    search_params: SearchParams;
    total_sources: number;
    unique_sources: number;
    timestamp: string;
  };
}

export const fetchMarketingInsights = async (
  query: string,
  params?: SearchParams
): Promise<RedditAnalyticsResponse | null> => {
  try {
    if (!query || !query.trim()) {
      throw new Error("Query parameter is required");
    }

    const requestBody = { 
      query: query.trim(),
      ...(params && { params })
    };

    const response = await fetch('/api/reddit-analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: RedditAnalyticsResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Error in fetchMarketingInsights:", error);
    throw error;
  }
};

// Helper function to extract all sources from insights
export const getAllSources = (insights: MarketingInsight): string[] => {
  const sources = new Set<string>();
  
  // Add main sources
  if (insights.sources) {
    insights.sources.forEach(source => sources.add(source));
  }
  
  // Add pain point sources
  insights.recurring_pain_points.forEach(painPoint => {
    if (painPoint.sources) {
      painPoint.sources.forEach(source => sources.add(source));
    }
  });
  
  // Add niche community sources
  insights.niche_communities.forEach(community => {
    if (community.sources) {
      community.sources.forEach(source => sources.add(source));
    }
  });
  
  // Add emotional trigger sources
  insights.sentiment_analysis.emotional_triggers.forEach(trigger => {
    if (trigger.sources) {
      trigger.sources.forEach(source => sources.add(source));
    }
  });
  
  return Array.from(sources);
};

// Helper function to get sources for a specific insight type
export const getSourcesByType = (insights: MarketingInsight, type: 'pain_points' | 'communities' | 'triggers'): string[] => {
  const sources = new Set<string>();
  
  switch (type) {
    case 'pain_points':
      insights.recurring_pain_points.forEach(painPoint => {
        if (painPoint.sources) {
          painPoint.sources.forEach(source => sources.add(source));
        }
      });
      break;
      
    case 'communities':
      insights.niche_communities.forEach(community => {
        if (community.sources) {
          community.sources.forEach(source => sources.add(source));
        }
      });
      break;
      
    case 'triggers':
      insights.sentiment_analysis.emotional_triggers.forEach(trigger => {
        if (trigger.sources) {
          trigger.sources.forEach(source => sources.add(source));
        }
      });
      break;
  }
  
  return Array.from(sources);
};

// Helper function to check if a URL is a Reddit link
export const isRedditLink = (url: string): boolean => {
  return url.includes('reddit.com');
};

// Helper function to format source links for display
export const formatSourceLink = (url: string): { display: string; isReddit: boolean } => {
  try {
    const urlObj = new URL(url);
    const isReddit = isRedditLink(url);
    
    if (isReddit) {
      // Extract subreddit and post info for Reddit links
      const pathParts = urlObj.pathname.split('/').filter(part => part);
      if (pathParts.length >= 4 && pathParts[0] === 'r') {
        const subreddit = pathParts[1];
        const title = pathParts[3].replace(/_/g, ' ');
        return {
          display: `r/${subreddit}: ${title.slice(0, 50)}${title.length > 50 ? '...' : ''}`,
          isReddit: true
        };
      }
      return { display: 'Reddit Discussion', isReddit: true };
    } else {
      // Format external sources
      return {
        display: `${urlObj.hostname}${urlObj.pathname.length > 1 ? urlObj.pathname.slice(0, 30) + '...' : ''}`,
        isReddit: false
      };
    }
  } catch {
    return { display: url.slice(0, 50) + '...', isReddit: isRedditLink(url) };
  }
};

// Extended search parameters with more options
export interface ExtendedSearchParams extends SearchParams {
  include_sources?: boolean; // Whether to include source URLs in analysis
  max_posts?: number; // Maximum number of posts to analyze
  min_engagement?: number; // Minimum engagement threshold
}

// Advanced fetch function with extended parameters
export const fetchMarketingInsightsAdvanced = async (
  query: string,
  params?: ExtendedSearchParams
): Promise<RedditAnalyticsResponse | null> => {
  try {
    if (!query || !query.trim()) {
      throw new Error("Query parameter is required");
    }

    const requestBody = { 
      query: query.trim(),
      ...(params && { params })
    };

    const response = await fetch('/api/reddit-analytics', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data: RedditAnalyticsResponse = await response.json();
    
    // Post-process to ensure sources are properly formatted
    if (data.insights && data.results) {
      // Ensure all results have source URLs
      data.results.forEach(result => {
        if (!result.source_url && result.link) {
          result.source_url = result.link;
        }
      });
      
      // Ensure insights have source arrays if not provided
      if (!data.insights.sources) {
        data.insights.sources = data.results
          .map(result => [result.link, result.source_url])
          .flat()
          .filter((url): url is string => !!url);
      }
    }
    
    return data;
  } catch (error) {
    console.error("Error in fetchMarketingInsightsAdvanced:", error);
    throw error;
  }
};