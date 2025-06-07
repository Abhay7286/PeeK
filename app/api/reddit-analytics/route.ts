// app/api/reddit-analytics/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase'; 

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

// Interfaces for Reddit API responses
interface RedditAuthResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface RedditPostData {
  id: string;
  title: string;
  subreddit: string;
  subreddit_name_prefixed: string;
  selftext: string;
  permalink: string;
  url: string; // This is the source URL we want to capture
  upvote_ratio: number;
  num_comments: number;
  total_awards_received: number;
  created_utc: number;
  score: number;
  ups: number;
  downs: number;
  is_self: boolean;
  over_18: boolean;
  spoiler: boolean;
  stickied: boolean;
  locked: boolean;
  author: string;
}

interface RedditPost {
  kind: string;
  data: RedditPostData;
}

interface RedditSearchResponse {
  kind: string;
  data: {
    children: RedditPost[];
    after: string | null;
    before: string | null;
    modhash: string;
    dist: number;
  };
}

interface RedditCommentData {
  id: string;
  body: string;
  score: number;
  author: string;
  stickied: boolean;
  created_utc: number;
  ups: number;
  downs: number;
  replies?: RedditCommentsResponse | string;
}

interface RedditComment {
  kind: string;
  data: RedditCommentData;
}

interface RedditCommentsResponse {
  kind: string;
  data: {
    children: RedditComment[];
    after: string | null;
    before: string | null;
  };
}

// Interface for the data sent to Groq API
interface GroqInputItem {
  title: string;
  subreddit: string;
  content: string;
  comments: string;
  reddit_link: string; // Added Reddit link
  source_url: string; // Added original source URL
  engagement: {
    upvote_ratio?: number;
    comment_count?: number;
    score?: number;
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
  sort?: 'relevance' | 'hot' | 'new' | 'top' | 'comments';
  t?: 'all' | 'year' | 'month' | 'week' | 'day' | 'hour';
  limit?: number;
  after?: string;
}

// Helper function to get model name from Supabase
async function getRedditAnalyticsModel(): Promise<string> {
  try {
    const { data, error } = await supabase
      .from('api_models')
      .select('model_name')
      .eq('api_name', 'RedditAnalytics')
      .single();
    
    if (error) {
      console.warn('Error fetching model name:', error);
      return 'llama-3.1-70b-versatile';
    }
    
    return data?.model_name || 'llama-3.1-70b-versatile';
  } catch (error) {
    console.error('Error fetching model name:', error);
    return 'llama-3.1-70b-versatile';
  }
}

// Enhanced helper function to calculate relevance score
const calculateRelevanceScore = (post: RedditPost, query: string): number => {
  const queryTerms = query.toLowerCase().split(/\s+/).filter(term => term.length > 2);
  const title = post.data.title.toLowerCase();
  const content = post.data.selftext.toLowerCase();
  const subreddit = post.data.subreddit.toLowerCase();
  
  let score = 0;
  
  // Title relevance (highest weight)
  queryTerms.forEach(term => {
    if (title.includes(term)) {
      score += title.indexOf(term) === 0 ? 10 : 5; // Higher score for terms at the beginning
    }
  });
  
  // Content relevance
  queryTerms.forEach(term => {
    const occurrences = (content.match(new RegExp(term, 'g')) || []).length;
    score += Math.min(occurrences * 2, 10); // Cap content score contribution
  });
  
  // Subreddit relevance
  queryTerms.forEach(term => {
    if (subreddit.includes(term)) {
      score += 3;
    }
  });
  
  // Engagement boost
  const engagementScore = Math.log10(post.data.score + 1) + Math.log10(post.data.num_comments + 1);
  score += engagementScore * 0.5;
  
  return score;
};

// Helper function to validate if a post has quality content
const hasQualityContent = (post: RedditPost): boolean => {
  // Filter out low-quality posts
  if (post.data.stickied || post.data.locked) return false;
  if (post.data.over_18) return false; // Skip NSFW content
  if (post.data.score < 1) return false; // Skip heavily downvoted posts
  
  // Must have some engagement
  if (post.data.num_comments < 2) return false;
  
  // Must have meaningful content (either selftext or be a discussion-worthy link)
  const hasContent = post.data.selftext && post.data.selftext.trim().length > 50;
  const hasEngagement = post.data.num_comments > 5 && post.data.upvote_ratio > 0.6;
  
  return hasContent || hasEngagement;
};

// Helper function to clean and extract meaningful text
const cleanText = (text: string): string => {
  if (!text) return '';
  
  // Remove markdown formatting, URLs, and other noise
  return text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove markdown links
    .replace(/https?:\/\/[^\s]+/g, '') // Remove URLs
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold formatting
    .replace(/\*([^*]+)\*/g, '$1') // Remove italic formatting
    .replace(/^#+\s+/gm, '') // Remove headers
    .replace(/\n{3,}/g, '\n\n') // Normalize line breaks
    .trim();
};

// Helper function to get Reddit access token with retry logic
async function getRedditAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const maxRetries = 3;
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const authResponse = await fetch('https://www.reddit.com/api/v1/access_token', {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'MarketingInsights/4.0',
        },
        body: 'grant_type=client_credentials',
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        throw new Error(`Reddit auth failed (${authResponse.status}): ${errorText}`);
      }

      const authData = await authResponse.json() as RedditAuthResponse;
      return authData.access_token;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
  }
  
  throw lastError;
}

// Helper function to fetch Reddit search results with proper sorting
async function fetchRedditPosts(
  query: string, 
  accessToken: string, 
  params: SearchParams = {}
): Promise<RedditPost[]> {
  const searchParams = new URLSearchParams({
    q: query,
    sort: params.sort || 'relevance',
    t: params.t || 'year', // Default to past year for relevance
    limit: (params.limit || 50).toString(),
    type: 'link', // Search only links/posts, not subreddits
    include_over_18: 'false', // Exclude NSFW content
  });

  if (params.after) {
    searchParams.append('after', params.after);
  }

  const searchUrl = `https://oauth.reddit.com/search?${searchParams.toString()}`;
  
  console.log('Fetching Reddit posts with URL:', searchUrl);
  
  const response = await fetch(searchUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'MarketingInsights/4.0',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Reddit search response error:', errorText);
    throw new Error(`Reddit search failed (${response.status}): ${errorText}`);
  }

  const rawData = await response.json();
  console.log('Raw Reddit response structure:', JSON.stringify(rawData, null, 2));
  
  // Handle different response structures
  if (!rawData || typeof rawData !== 'object') {
    throw new Error('Invalid Reddit API response: not an object');
  }

  // Check if it's the expected structure
  if (rawData.data && Array.isArray(rawData.data.children)) {
    return rawData.data.children as RedditPost[];
  }

  // Check if it's a direct array (sometimes Reddit returns this)
  if (Array.isArray(rawData)) {
    return rawData as RedditPost[];
  }

  // Check if children is at the root level
  if (Array.isArray(rawData.children)) {
    return rawData.children as RedditPost[];
  }

  console.error('Unexpected Reddit response structure:', rawData);
  throw new Error(`Unexpected Reddit API response structure. Expected data.children array but got: ${Object.keys(rawData).join(', ')}`);
}

// Helper function to fetch comments for a post
async function fetchPostComments(
  permalink: string, 
  accessToken: string, 
  limit: number = 25
): Promise<RedditComment[]> {
  try {
    const commentsUrl = `https://oauth.reddit.com${permalink}?limit=${limit}&depth=2&sort=top`;
    
    console.log('Fetching comments from:', commentsUrl);
    
    const response = await fetch(commentsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'MarketingInsights/4.0',
      },
    });
    
    if (!response.ok) {
      console.warn(`Failed to fetch comments for ${permalink}: ${response.status}`);
      return [];
    }
    
    const rawData = await response.json();
    console.log('Raw comments response structure for', permalink, ':', Array.isArray(rawData) ? `Array of ${rawData.length} items` : typeof rawData);
    
    // Reddit comments endpoint returns an array where:
    // [0] is the post data
    // [1] is the comments data
    if (!Array.isArray(rawData) || rawData.length < 2) {
      console.warn('Unexpected comments response structure:', rawData);
      return [];
    }
    
    const commentsSection = rawData[1];
    if (!commentsSection || !commentsSection.data || !Array.isArray(commentsSection.data.children)) {
      console.warn('Comments section missing or malformed:', commentsSection);
      return [];
    }
    
    const comments = commentsSection.data.children;
    
    return comments
      .filter((comment: RedditComment) => {
        if (!comment || comment.kind !== 't1' || !comment.data) {
          return false;
        }
        
        const commentData = comment.data;
        return commentData.body && 
               !commentData.stickied &&
               commentData.body.trim().length > 10 &&
               !commentData.body.includes('[deleted]') &&
               !commentData.body.includes('[removed]') &&
               commentData.score > 0;
      })
      .sort((a: RedditComment, b: RedditComment) => b.data.score - a.data.score);
  } catch (error) {
    console.error(`Error fetching comments for ${permalink}:`, error);
    return [];
  }
}

export async function POST(request: NextRequest) {
  try {
    const { query, params = {} } = await request.json();

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length < 2) {
      return NextResponse.json(
        { error: 'Query parameter is required and must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Get environment variables
    const redditClientId = process.env.NEXT_PUBLIC_REDDIT_CLIENT_ID;
    const redditClientSecret = process.env.NEXT_PUBLIC_REDDIT_CLIENT_SECRET;
    const groqApiKey = process.env.NEXT_PUBLIC_REDDIT_GROQ_API_KEY;

    if (!redditClientId || !redditClientSecret || !groqApiKey) {
      return NextResponse.json(
        { error: 'Required API keys are missing. Please check environment variables.' },
        { status: 500 }
      );
    }

    // Get the model name from database
    const modelName = await getRedditAnalyticsModel();

    // Get Reddit access token
    const accessToken = await getRedditAccessToken(redditClientId, redditClientSecret);

    // Fetch posts with proper relevance sorting
    const searchParams: SearchParams = {
      sort: 'relevance',
      t: params.timeframe || 'year',
      limit: 100,
      ...params
    };

    console.log('Starting Reddit search with params:', searchParams);
    let allPosts: RedditPost[] = [];
    
    try {
      allPosts = await fetchRedditPosts(query, accessToken, searchParams);
      console.log(`Found ${allPosts.length} posts from Reddit API`);
    } catch (fetchError) {
      console.error('Error fetching posts:', fetchError);
      return NextResponse.json(
        { error: `Failed to fetch posts from Reddit: ${fetchError instanceof Error ? fetchError.message : 'Unknown error'}` },
        { status: 500 }
      );
    }
    
    if (allPosts.length === 0) {
      return NextResponse.json(
        { error: 'No posts found for the given query. Try different search terms or check if the query is too specific.' },
        { status: 404 }
      );
    }

    // Filter and score posts for relevance
    console.log('Filtering and scoring posts for relevance...');
    const qualityPosts = allPosts
      .filter((post) => {
        if (!post || !post.data) {
          console.warn('Invalid post structure:', post);
          return false;
        }
        return hasQualityContent(post);
      })
      .map(post => ({
        post,
        relevanceScore: calculateRelevanceScore(post, query)
      }))
      .filter(item => item.relevanceScore > 2) // Minimum relevance threshold
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 15); // Take top 15 most relevant posts

    console.log(`Filtered to ${qualityPosts.length} quality posts`);

    if (qualityPosts.length === 0) {
      return NextResponse.json(
        { error: 'No relevant high-quality posts found for the given query. Try broader search terms or different keywords.' },
        { status: 404 }
      );
    }

    // Process posts and fetch comments
    const results: RedditResult[] = [];
    const allSources: string[] = []; // Collect all source URLs
    
    const processingPromises = qualityPosts.slice(0, 10).map(async ({ post }) => {
      try {
        const comments = await fetchPostComments(post.data.permalink, accessToken, 20);
        
        const topComments = comments.slice(0, 8).map(comment => ({
          body: cleanText(comment.data.body),
          score: comment.data.score,
          author: comment.data.author
        }));

        const redditLink = `https://reddit.com${post.data.permalink}`;
        const sourceUrl = post.data.url; // Original source URL from Reddit API
        
        // Add both Reddit link and source URL to our sources collection
        allSources.push(redditLink);
        if (sourceUrl && sourceUrl !== redditLink && !sourceUrl.includes('reddit.com')) {
          allSources.push(sourceUrl);
        }

        return {
          title: post.data.title,
          subreddit: post.data.subreddit,
          snippet: cleanText(post.data.selftext).slice(0, 400) + 
                   (post.data.selftext.length > 400 ? "..." : ""),
          link: redditLink,
          source_url: sourceUrl, // Include the original source URL
          engagement_metrics: {
            upvote_ratio: post.data.upvote_ratio,
            comment_count: post.data.num_comments,
            awards: post.data.total_awards_received || 0
          },
          top_comments: topComments
        };
      } catch (error) {
        console.error(`Error processing post ${post.data.id}:`, error);
        return null;
      }
    });

    const processedResults = await Promise.all(processingPromises);
    results.push(...processedResults.filter(result => result !== null) as RedditResult[]);

    if (results.length === 0) {
      return NextResponse.json(
        { error: 'Failed to process any posts successfully' },
        { status: 500 }
      );
    }

    // Prepare data for Groq analysis with source information
    const groqInputData: GroqInputItem[] = results.map(post => ({
      title: post.title,
      subreddit: post.subreddit,
      content: post.snippet,
      comments: post.top_comments?.map(c => c.body).join(" | ").slice(0, 1000) || "",
      reddit_link: post.link || "",
      source_url: post.source_url || "",
      engagement: {
        upvote_ratio: post.engagement_metrics?.upvote_ratio,
        comment_count: post.engagement_metrics?.comment_count,
        score: post.engagement_metrics?.upvote_ratio && post.engagement_metrics?.comment_count
          ? Math.round(post.engagement_metrics.upvote_ratio * post.engagement_metrics.comment_count)
          : undefined
      }
    }));

    // Enhanced Groq prompt for better analysis with source tracking
    const systemPrompt = `You are an expert market research analyst specializing in social media consumer insights. Analyze the provided Reddit discussions to extract actionable marketing intelligence.

IMPORTANT: When identifying insights, include relevant source URLs from the provided data to support your findings. Use the reddit_link and source_url fields to trace insights back to their origins.

Focus on identifying:
1. Genuine consumer pain points and frustrations
2. Emerging trends and behavioral patterns  
3. Emotional triggers and decision-making factors
4. Niche community dynamics and influencers
5. Competitive landscape insights
6. Brand perception and market positioning opportunities

Provide insights that are:
- Specific and actionable for marketing teams
- Based on actual user language and sentiment
- Focused on consumer psychology and behavior
- Relevant for product development and positioning
- Traceable to source discussions

Return your analysis in the following JSON structure:`;

    const responseFormat = `{
  "overview": "Comprehensive analysis of market dynamics, consumer behavior patterns, and key opportunities identified from Reddit discussions",
  "recurring_pain_points": [
    {
      "issue": "Specific consumer pain point or problem",
      "frequency": 85,
      "impact_score": 75,
      "verbatim_quotes": ["Direct quotes from users expressing this pain point"],
      "suggested_solutions": ["Actionable marketing or product recommendations"],
      "sources": ["Relevant Reddit links or source URLs that support this finding"]
    }
  ],
  "niche_communities": [
    {
      "segment": "Specific market segment or user group",
      "demographic_indicators": ["Observable demographic patterns or characteristics"],
      "discussion_themes": ["Common topics and concerns in this community"],
      "engagement_level": 80,
      "influence_score": 70,
      "key_influencers": ["Notable community members or thought leaders"],
      "sources": ["Relevant Reddit links or source URLs for this community segment"]
    }
  ],
  "sentiment_analysis": {
    "overall_sentiment": 45,
    "emotional_triggers": [
      {
        "trigger": "Specific emotional catalyst or concern",
        "intensity": 85,
        "context": "Situational context where this trigger appears", 
        "activation_phrases": ["Specific phrases that trigger this emotion"],
        "sources": ["Relevant Reddit links or source URLs where this trigger was observed"]
      }
    ],
    "brand_perception": {
      "positive_attributes": ["Strengths and positive associations"],
      "negative_attributes": ["Concerns, criticisms, or negative perceptions"],
      "neutral_observations": ["Objective market observations"]
    }
  },
  "psychographic_insights": {
    "motivation_factors": ["What drives purchase decisions and behavior"],
    "decision_drivers": ["Key factors influencing consumer choices"],
    "adoption_barriers": ["Obstacles preventing adoption or purchase"]
  },
  "competitive_intelligence": {
    "market_positioning": "Analysis of competitive landscape and positioning opportunities",
    "share_of_voice": 60,
    "competitive_advantages": ["Opportunities for differentiation"],
    "threat_assessment": "Assessment of competitive threats and market risks"
  },
  "sources": ["Complete list of all source URLs and Reddit links used in this analysis"]
}

Provide exactly 6 pain points, 3 niche communities, and 4 emotional triggers. Use professional marketing language while incorporating authentic user voice and specific insights from the discussions. Include source URLs where available to support your findings.`;

    // Call Groq API for analysis
    const groqResponse = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`,
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze this Reddit data for marketing insights. Pay attention to the reddit_link and source_url fields to include proper source attribution:\n\n${JSON.stringify(groqInputData, null, 2)}\n\nProvide the analysis in the specified JSON format: ${responseFormat}` },
        ],
        temperature: 0.3,
        max_tokens: 4000,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      console.error('Groq API error:', errorText);
      return NextResponse.json(
        { error: `Analysis service error: ${groqResponse.status}` },
        { status: groqResponse.status }
      );
    }

    const groqData = await groqResponse.json() as GroqResponse;
    
    let insights: MarketingInsight;
    try {
      insights = JSON.parse(groqData.choices[0].message.content);
      
      // Ensure sources are included in the insights if not provided by AI
      if (!insights.sources) {
        insights.sources = [...new Set(allSources)]; // Remove duplicates
      }
    } catch (parseError) {
      console.error('Failed to parse Groq response:', parseError);
      return NextResponse.json(
        { error: 'Failed to parse analysis results' },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      results, 
      insights,
      metadata: {
        total_posts_found: allPosts.length,
        quality_posts_processed: results.length,
        search_params: searchParams,
        total_sources: allSources.length,
        unique_sources: [...new Set(allSources)].length,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error("Error in Reddit Analytics API:", error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Internal server error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}