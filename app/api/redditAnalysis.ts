export interface RedditResult {
  title: string;
  subreddit: string;
  snippet: string;
  link?: string;
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
}

export interface NicheCommunity {
  segment: string;
  demographic_indicators: string[];
  discussion_themes: string[];
  engagement_level: number; // 0-100
  influence_score: number; // 0-100
  key_influencers: string[];
}

export interface SentimentAnalysis {
  overall_sentiment: number; // -100 to 100
  emotional_triggers: {
    trigger: string;
    intensity: number; // 0-100
    context: string;
    activation_phrases: string[];
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
}

// Interfaces for Reddit API responses
interface RedditAuthResponse {
  access_token: string;
}

interface RedditPostData {
  title: string;
  subreddit: string;
  selftext: string;
  permalink: string;
  url: string;
  upvote_ratio: number;
  num_comments: number;
  total_awards_received: number;
  created_utc: number;
}

interface RedditPost {
  kind: string;
  data: RedditPostData;
}

interface RedditSearchResponse {
  data: {
    children: RedditPost[];
    after: string | null;
  };
}

interface RedditCommentData {
  body: string;
  score: number;
  author: string;
  stickied: boolean;
}

interface RedditComment {
  kind: string;
  data: RedditCommentData;
}

interface RedditCommentsResponse {
  [index: number]: {
    data: {
      children: RedditComment[];
    };
  };
}

// Interface for the data sent to Groq API
interface GroqInputItem {
  title: string;
  subreddit: string;
  content: string;
  comments: string;
  engagement: {
    upvote_ratio?: number;
    comment_count?: number;
  };
}

// Interface for Groq API response
interface GroqResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}

// Search params interface
export interface SearchParams {
  relevance?: 'relevance' | 'hot' | 'new' | 'top' | 'comments';
  timeframe?: 'all' | 'year' | 'month' | 'week' | 'day' | 'hour';
}

import { supabase } from '@/lib/supabase'; // Adjust this import path to your supabase client

export async function getRedditAnalyticsModel() {
  const { data } = await supabase
    .from('api_models')
    .select('model_name')
    .eq('api_name', 'RedditAnalytics')
    .single();
  
  return data?.model_name;
}

// Helper function to check if query terms appear in the title
const containsQueryTerms = (title: string, query: string): boolean => {
  const queryTerms = query.toLowerCase().split(' ');
  const titleLower = title.toLowerCase();
  
  return queryTerms.some(term => titleLower.includes(term));
};

export const fetchMarketingInsights = async (
  query: string
): Promise<{ results: RedditResult[]; insights: MarketingInsight } | null> => {
  try {
    const redditClientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.NEXT_PUBLIC_REDDIT_CLIENT_SECRET;
    const groqApiKey = process.env.NEXT_PUBLIC_REDDIT_GROQ_API_KEY;

    if (!redditClientId || !redditClientSecret || !groqApiKey) {
      throw new Error("API keys are missing. Check environment variables.");
    }

    // Get the model name from Supabase
    const modelName = await getRedditAnalyticsModel();
    if (!modelName) {
      throw new Error("Model name not found in database");
    }

    // Reddit Authentication
    const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${redditClientId}:${redditClientSecret}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    if (!authResponse.ok) {
      throw new Error(`Reddit Authentication error: ${authResponse.status}`);
    }

    const authData = await authResponse.json() as RedditAuthResponse;
    const accessToken = authData.access_token;
    
    const results: RedditResult[] = [];
    
    // Search across Reddit with fixed 'all' timeframe and increased limit
    const searchUrl = `https://oauth.reddit.com/search?q=${encodeURIComponent(query)}&limit=100&t=all`;
    
    const searchResponse = await fetch(searchUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'MarketingInsights/3.1',
      },
    });

    if (!searchResponse.ok) {
      throw new Error(`Reddit Search error: ${searchResponse.status}`);
    }

    const searchData = await searchResponse.json() as RedditSearchResponse;
    
    // Filter posts with actual content AND titles that include at least one query term
    const relevantPosts = searchData.data.children
      .filter((post: RedditPost) => 
        post.data.selftext && 
        post.data.selftext.length > 50 &&
        post.data.num_comments > 0 &&
        containsQueryTerms(post.data.title, query)
      );
    
    // Process up to 10 posts (increased from 5)
    for (const post of relevantPosts.slice(0, 10)) {
      // Get comments for this post
      const commentsResponse = await fetch(
        `https://oauth.reddit.com${post.data.permalink}?limit=15&depth=1`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'User-Agent': 'MarketingInsights/3.1',
          },
        }
      );
      
      if (!commentsResponse.ok) continue;
      
      const commentsData = await commentsResponse.json() as RedditCommentsResponse;
      
      // Extract top 8 comments (increased from 5)
      const topComments = commentsData[1]?.data?.children
        .filter((comment: RedditComment) => 
          comment.kind === 't1' && 
          comment.data?.body && 
          !comment.data.stickied &&
          comment.data.body.length > 5 // Ensure comment has meaningful content
        )
        .sort((a: RedditComment, b: RedditComment) => b.data.score - a.data.score)
        .slice(0, 8)
        .map((comment: RedditComment) => ({
          body: comment.data.body,
          score: comment.data.score,
          author: comment.data.author
        })) || [];
      
      results.push({
        title: post.data.title,
        subreddit: post.data.subreddit,
        snippet: post.data.selftext.slice(0, 300) + (post.data.selftext.length > 300 ? "..." : ""),
        link: post.data.permalink ? `https://reddit.com${post.data.permalink}` : post.data.url,
        engagement_metrics: {
          upvote_ratio: post.data.upvote_ratio,
          comment_count: post.data.num_comments,
          awards: post.data.total_awards_received || 0
        },
        top_comments: topComments
      });
    }

    if (results.length === 0) {
      throw new Error("Insufficient data from Reddit Search API or no titles matched query terms.");
    }

    // Prepare a more focused dataset for Groq to reduce token usage
    const groqInputData: GroqInputItem[] = results.map(post => ({
      title: post.title,
      subreddit: post.subreddit,
      content: post.snippet,
      comments: post.top_comments?.map(c => c.body).join(" | ").slice(0, 800) || "", // Increased comment text
      engagement: {
        upvote_ratio: post.engagement_metrics?.upvote_ratio,
        comment_count: post.engagement_metrics?.comment_count
      }
    }));

    // Keep the original Groq API prompt as specified
    const context = `As a specialized market research analyst, analyze these Reddit discussions to provide marketing insights. Focus on key trends, consumer sentiment, and actionable recommendations. Return findings in JSON format:
    {
      "overview": "Brief analysis of market dynamics and consumer behavior patterns",
      "recurring_pain_points": [
        {
          "issue": "Specific pain point",
          "frequency": 80,
          "impact_score": 75,
          "verbatim_quotes": ["Selected user quotes"],
          "suggested_solutions": ["Actionable recommendations"]
        }
      ],
      "niche_communities": [
        {
          "segment": "Market segment",
          "demographic_indicators": ["Observable patterns"],
          "discussion_themes": ["Conversation topics"],
          "engagement_level": 85,
          "influence_score": 70,
          "key_influencers": ["Notable community members"]
        }
      ],
      "sentiment_analysis": {
        "overall_sentiment": 65,
        "emotional_triggers": [
          {
            "trigger": "Emotional catalyst",
            "intensity": 80,
            "context": "Situation analysis",
            "activation_phrases": ["Trigger phrases"]
          }
        ],
        "brand_perception": {
          "positive_attributes": ["Brand strengths"],
          "negative_attributes": ["Areas of concern"],
          "neutral_observations": ["Market observations"]
        }
      },
      "psychographic_insights": {
        "motivation_factors": ["Purchase drivers"],
        "decision_drivers": ["Decision factors"],
        "adoption_barriers": ["Adoption obstacles"]
      },
      "competitive_intelligence": {
        "market_positioning": "Competitive landscape analysis",
        "share_of_voice": 65,
        "competitive_advantages": ["Market advantages"],
        "threat_assessment": "Competitive risk assessment"
      }
    }

    Give creative, not generic ideas. Use professional marketing terminology.
    Provide 6 pain points, 3 niche communities, and 3 emotional triggers.`;

    const insightResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: modelName, // Use dynamic model name from database
        messages: [
          { role: "system", content: context },
          { role: "user", content: JSON.stringify(groqInputData) },
        ],
        temperature: 0.4,
        max_tokens: 3500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!insightResponse.ok) {
      throw new Error(`Groq API error: ${insightResponse.status}`);
    }

    const insightData = await insightResponse.json() as GroqResponse;
    const insights: MarketingInsight = JSON.parse(insightData.choices[0].message.content);
    return { results, insights };
  } catch (error) {
    console.error("Error in fetchMarketingInsights:", error);
    return null;
  }
};