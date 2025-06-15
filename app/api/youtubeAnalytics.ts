import axios from 'axios';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Zod schemas for YouTube data
const YouTubeVideoSnippetSchema = z.object({
  title: z.string(),
  description: z.string(),
  thumbnails: z.object({
    default: z.object({
      url: z.string(),
      width: z.number().optional(),
      height: z.number().optional()
    }),
    medium: z.object({
      url: z.string(),
      width: z.number().optional(),
      height: z.number().optional()
    }),
    high: z.object({
      url: z.string(),
      width: z.number().optional(),
      height: z.number().optional()
    })
  }),
  channelTitle: z.string(),
  publishedAt: z.string()
});

const VideoStatisticsSchema = z.object({
  viewCount: z.string(),
  likeCount: z.string().optional(),
  commentCount: z.string().optional()
});

// Updated ID schema to match component expectations
const YouTubeVideoIdSchema = z.union([
  z.string(), // Direct video ID string
  z.object({
    kind: z.string().optional(),
    videoId: z.string()
  })
]);

const YouTubeSearchItemSchema = z.object({
  id: YouTubeVideoIdSchema,
  snippet: YouTubeVideoSnippetSchema,
  statistics: VideoStatisticsSchema.optional()
});

const YouTubeStatisticsItemSchema = z.object({
  id: z.string(),
  statistics: VideoStatisticsSchema
});

const YouTubeSearchResponseSchema = z.object({
  items: z.array(YouTubeSearchItemSchema),
  nextPageToken: z.string().optional(),
  prevPageToken: z.string().optional()
});

const YouTubeStatisticsResponseSchema = z.object({
  items: z.array(YouTubeStatisticsItemSchema)
});

// Comment schemas
const CommentSnippetSchema = z.object({
  topLevelComment: z.object({
    id: z.string(),
    snippet: z.object({
      textDisplay: z.string(),
      textOriginal: z.string(),
      likeCount: z.number()
    })
  }),
  totalReplyCount: z.number()
});

const CommentThreadSchema = z.object({
  id: z.string(),
  snippet: CommentSnippetSchema
});

const CommentThreadResponseSchema = z.object({
  items: z.array(CommentThreadSchema),
  nextPageToken: z.string().optional()
});

// Enhanced Comment Analysis schema
export const CommentAnalysisSchema = z.object({
  success: z.boolean(),
  data: z.object({
    analysis: z.object({
      overview: z.string(),
      sentimentAnalysis: z.object({
        overall: z.enum(['positive', 'negative', 'neutral', 'mixed']),
        score: z.number(),
        distribution: z.object({
          positive: z.number(),
          negative: z.number(),
          neutral: z.number()
        }),
        trends: z.array(z.object({
          topic: z.string(),
          sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
          intensity: z.number()
        }))
      }),
      painPoints: z.array(z.object({
        title: z.string(),
        description: z.string(),
        frequency: z.number(),
        impact: z.number(),
        sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
        possibleSolutions: z.array(z.string())
      })),
      userExperiences: z.array(z.object({
        scenario: z.string(),
        impact: z.string(),
        frequencyPattern: z.string(),
        sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed'])
      })),
      emotionalTriggers: z.array(z.object({
        trigger: z.string(),
        context: z.string(),
        intensity: z.number(),
        responsePattern: z.string(),
        dominantEmotion: z.string()
      })),
      marketImplications: z.string()
    }),
    sources: z.array(z.object({
      content: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']).optional()
    })),
    timestamp: z.string()
  }).optional(),
  error: z.string().optional()
});

// Raw API response types for YouTube
interface YouTubeRawSearchItem {
  id: string | { kind?: string; videoId: string };
  snippet: {
    title: string;
    description: string;
    thumbnails: {
      default: { url: string; width?: number; height?: number };
      medium: { url: string; width?: number; height?: number };
      high: { url: string; width?: number; height?: number };
    };
    channelTitle: string;
    publishedAt: string;
  };
}

interface YouTubeRawCommentItem {
  id: string;
  snippet: {
    topLevelComment: {
      id: string;
      snippet: {
        textDisplay: string;
        textOriginal: string;
        likeCount?: number;
      };
    };
    totalReplyCount?: number;
  };
}

// Type exports
export type YouTubeVideo = z.infer<typeof YouTubeSearchItemSchema>;
export type VideoStatistics = z.infer<typeof VideoStatisticsSchema>;
export type YouTubeSearchResponse = z.infer<typeof YouTubeSearchResponseSchema>;
export type YouTubeStatisticsResponse = z.infer<typeof YouTubeStatisticsResponseSchema>;
export type CommentThread = z.infer<typeof CommentThreadSchema>;
export type CommentThreadResponse = z.infer<typeof CommentThreadResponseSchema>;
export type CommentAnalysis = z.infer<typeof CommentAnalysisSchema>;

// Constants
const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3';
const YOUTUBE_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_API_KEY;
const GROQ_API_KEY = process.env.NEXT_PUBLIC_YOUTUBE_GROQ_API_KEY;
const TIMEOUT = 30000;
const MAX_COMMENTS_TO_ANALYZE = 75;
const MAX_COMMENT_LENGTH = 300;

class ApiError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

// Function to get model name from Supabase
export async function getYouTubeVideosModel() {
  const { data } = await supabase
    .from('api_models')
    .select('model_name')
    .eq('api_name', 'YouTubeVideos')
    .single();
  return data?.model_name;
}

// Helper function for fetch with timeout
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
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

// Helper function to extract videoId safely - matches component logic
function getVideoId(item: YouTubeVideo): string | null {
  if (typeof item.id === 'string') {
    return item.id;
  }
  
  if (item.id && typeof item.id === 'object' && 'videoId' in item.id) {
    return item.id.videoId;
  }
  
  return null;
}

export async function searchYouTubeVideos(query: string, pageToken?: string): Promise<YouTubeSearchResponse> {
  if (!YOUTUBE_API_KEY) {
    throw new ApiError('YouTube API key is not configured', 'CONFIG_ERROR');
  }

  try {
    console.log('Searching YouTube videos for:', query, pageToken ? `(page: ${pageToken})` : '');
    
    // Fetch search results
    const searchResponse = await axios.get(`${YOUTUBE_API_BASE}/search`, {
      params: {
        part: 'snippet',
        type: 'video',
        maxResults: 8,
        q: query,
        pageToken,
        key: YOUTUBE_API_KEY,
        order: 'relevance'
      },
      timeout: TIMEOUT
    });

    console.log('Raw search response:', searchResponse.data);

    // Process search results to ensure consistent ID format
    const processedItems = searchResponse.data.items
      .map((item: YouTubeRawSearchItem) => {
        // Ensure we have a valid video ID
        let videoId: string | null = null;
        
        if (typeof item.id === 'string') {
          videoId = item.id;
        } else if (item.id && typeof item.id === 'object' && item.id.videoId) {
          videoId = item.id.videoId;
        }

        if (!videoId) {
          console.warn('Skipping item without valid video ID:', item);
          return null;
        }

        return {
          ...item,
          id: videoId // Normalize to string format for consistency
        };
      })
      .filter(Boolean);

    const searchData = {
      ...searchResponse.data,
      items: processedItems
    };

    console.log('Processed search data:', searchData);

    // Validate the processed data
    const validatedSearchData = YouTubeSearchResponseSchema.parse(searchData);

    // Get video IDs for statistics
    const videoIds = validatedSearchData.items
      .map(item => getVideoId(item))
      .filter((id): id is string => id !== null);

    console.log('Video IDs for statistics:', videoIds);

    if (videoIds.length === 0) {
      console.warn('No valid video IDs found');
      return validatedSearchData;
    }

    // Fetch statistics
    const statistics = await getVideoStatistics(videoIds);
    console.log('Statistics fetched:', statistics);

    // Merge statistics with search results
    const itemsWithStats = validatedSearchData.items.map(item => {
      const videoId = getVideoId(item);
      if (!videoId) return item;
      
      return {
        ...item,
        statistics: statistics[videoId] || {
          viewCount: '0',
          likeCount: '0',
          commentCount: '0'
        }
      };
    });

    // Sort by view count (descending)
    const sortedItems = itemsWithStats.sort((a, b) => {
      const aViews = parseInt(a.statistics?.viewCount || '0', 10);
      const bViews = parseInt(b.statistics?.viewCount || '0', 10);
      return bViews - aViews;
    });

    const finalResult = {
      ...validatedSearchData,
      items: sortedItems
    };

    console.log('Final search result:', finalResult);
    return finalResult;

  } catch (error) {
    console.error('YouTube search error:', error);
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new ApiError(`YouTube API error: ${message}`, 'YOUTUBE_API_ERROR');
    }
    
    throw new ApiError(
      `Failed to fetch YouTube videos: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'SEARCH_ERROR'
    );
  }
}

export async function getVideoStatistics(videoIds: string[]): Promise<Record<string, VideoStatistics>> {
  if (!YOUTUBE_API_KEY) {
    throw new ApiError('YouTube API key is not configured', 'CONFIG_ERROR');
  }

  if (videoIds.length === 0) {
    return {};
  }

  try {
    console.log('Fetching statistics for video IDs:', videoIds);
    
    const response = await axios.get(`${YOUTUBE_API_BASE}/videos`, {
      params: {
        part: 'statistics',
        id: videoIds.join(','),
        key: YOUTUBE_API_KEY
      },
      timeout: TIMEOUT
    });

    console.log('Statistics response:', response.data);

    const validatedResponse = YouTubeStatisticsResponseSchema.parse(response.data);
    
    const statisticsMap = validatedResponse.items.reduce((acc, item) => {
      acc[item.id] = item.statistics;
      return acc;
    }, {} as Record<string, VideoStatistics>);

    console.log('Statistics map:', statisticsMap);
    return statisticsMap;

  } catch (error) {
    console.error('Statistics fetch error:', error);
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      throw new ApiError(`YouTube API error: ${message}`, 'YOUTUBE_API_ERROR');
    }
    
    throw new ApiError(
      `Failed to fetch video statistics: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'STATS_ERROR'
    );
  }
}

export async function getVideoComments(videoId: string, maxResults: number = 100): Promise<CommentThreadResponse> {
  if (!YOUTUBE_API_KEY) {
    throw new ApiError('YouTube API key is not configured', 'CONFIG_ERROR');
  }

  if (!videoId || typeof videoId !== 'string') {
    throw new ApiError('Invalid video ID provided', 'INVALID_VIDEO_ID');
  }

  try {
    console.log('Fetching comments for video ID:', videoId, 'maxResults:', maxResults);
    
    const response = await axios.get(`${YOUTUBE_API_BASE}/commentThreads`, {
      params: {
        part: 'snippet',
        videoId: videoId,
        maxResults: Math.min(maxResults, 100), // YouTube API limit
        order: 'relevance',
        textFormat: 'plainText',
        key: YOUTUBE_API_KEY
      },
      timeout: TIMEOUT
    });

    console.log('Comments response:', response.data);

    // Process the response to match our schema
    const processedResponse = {
      ...response.data,
      items: response.data.items.map((item: YouTubeRawCommentItem) => ({
        id: item.id,
        snippet: {
          topLevelComment: {
            id: item.snippet.topLevelComment.id,
            snippet: {
              textDisplay: item.snippet.topLevelComment.snippet.textDisplay,
              textOriginal: item.snippet.topLevelComment.snippet.textOriginal,
              likeCount: item.snippet.topLevelComment.snippet.likeCount || 0
            }
          },
          totalReplyCount: item.snippet.totalReplyCount || 0
        }
      }))
    };

    const validatedResponse = CommentThreadResponseSchema.parse(processedResponse);
    console.log('Validated comments response:', validatedResponse);
    
    return validatedResponse;

  } catch (error) {
    console.error('Comments fetch error:', error);
    
    if (axios.isAxiosError(error)) {
      const message = error.response?.data?.error?.message || error.message;
      
      // Handle specific YouTube API errors
      if (error.response?.status === 403) {
        throw new ApiError('Comments are disabled for this video or access is restricted', 'COMMENTS_DISABLED');
      }
      if (error.response?.status === 404) {
        throw new ApiError('Video not found or comments not available', 'VIDEO_NOT_FOUND');
      }
      
      throw new ApiError(`YouTube API error: ${message}`, 'YOUTUBE_API_ERROR');
    }
    
    throw new ApiError(
      `Failed to fetch video comments: ${error instanceof Error ? error.message : 'Unknown error'}`,
      'COMMENTS_ERROR'
    );
  }
}

export async function analyzeVideoComments(videoId: string, videoTitle: string): Promise<CommentAnalysis> {
  try {
    if (!videoId?.trim()) {
      return { success: false, error: 'Video ID cannot be empty' };
    }
    
    if (!YOUTUBE_API_KEY || !GROQ_API_KEY) {
      return { success: false, error: 'API keys not configured' };
    }

    console.log('Analyzing comments for video:', videoId, videoTitle);

    const comments = await getVideoComments(videoId, MAX_COMMENTS_TO_ANALYZE);
    
    if (!comments.items || comments.items.length === 0) {
      return { success: false, error: 'No comments found for this video' };
    }

    // Process comments for analysis
    const commentTexts = comments.items
      .map(item => sanitizeText(item.snippet.topLevelComment.snippet.textOriginal, MAX_COMMENT_LENGTH))
      .filter(text => text && text.length > 10) // Filter out very short comments
      .slice(0, MAX_COMMENTS_TO_ANALYZE);

    if (commentTexts.length === 0) {
      return { success: false, error: 'No valid comments to analyze' };
    }

    const limitedComments = commentTexts.join('\n\n');
    console.log(`Analyzing ${commentTexts.length} comments (${limitedComments.length} characters)`);

    const analysis = await generateCommentAnalysis(videoTitle, limitedComments);

    // Add sentiment analysis to sources
    const sourcesWithSentiment = comments.items.slice(0, 20).map(item => ({
      content: sanitizeText(item.snippet.topLevelComment.snippet.textOriginal, MAX_COMMENT_LENGTH),
      sentiment: analyzeSentiment(item.snippet.topLevelComment.snippet.textOriginal)
    }));

    return {
      success: true,
      data: {
        analysis: JSON.parse(analysis),
        sources: sourcesWithSentiment,
        timestamp: new Date().toISOString()
      }
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Comment analysis error:', error);
    return { success: false, error: errorMessage };
  }
}

// Simple sentiment analysis function
function analyzeSentiment(text: string): 'positive' | 'negative' | 'neutral' | 'mixed' {
  const positiveWords = ['great', 'good', 'awesome', 'excellent', 'love', 'amazing', 'best', 'perfect', 'helpful', 'wonderful', 'fantastic', 'brilliant'];
  const negativeWords = ['bad', 'worst', 'terrible', 'awful', 'hate', 'disappointing', 'horrible', 'useless', 'poor', 'waste', 'boring', 'stupid'];
  
  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;
  
  positiveWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) positiveCount += matches.length;
  });
  
  negativeWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    const matches = lowerText.match(regex);
    if (matches) negativeCount += matches.length;
  });
  
  if (positiveCount > 0 && negativeCount > 0) {
    return 'mixed';
  } else if (positiveCount > 0) {
    return 'positive';
  } else if (negativeCount > 0) {
    return 'negative';
  }
  return 'neutral';
}

async function generateCommentAnalysis(videoTitle: string, commentText: string): Promise<string> {
  // Get model name from Supabase
  const modelName = await getYouTubeVideosModel();
  
  if (!modelName) {
    throw new Error('Model name not found in database');
  }

  const url = 'https://api.groq.com/openai/v1/chat/completions';
  
  const analysisPrompt = {
    role: 'system',
    content: `Analyze the provided YouTube comments for the video titled "${videoTitle}" and generate a focused analysis in the following JSON format:

{
  "overview": "Executive summary of the comment analysis using sophisticated content creator terminology",
  "sentimentAnalysis": {
    "overall": "positive/negative/neutral/mixed",
    "score": "Numerical value from -10 to 10, where -10 is extremely negative and 10 is extremely positive",
    "distribution": {
      "positive": "Percentage of positive comments (0-100)",
      "negative": "Percentage of negative comments (0-100)",
      "neutral": "Percentage of neutral comments (0-100)"
    },
    "trends": [
      {
        "topic": "Specific aspect of the content being discussed",
        "sentiment": "positive/negative/neutral/mixed",
        "intensity": "Numerical value 1-10 indicating strength of sentiment"
      }
    ] (exactly 3 items)
  },
  "painPoints": [
    {
      "title": "Clear, impactful title of the issue or concern",
      "description": "Detailed analysis of the viewer feedback using content creator psychology terms",
      "frequency": "Numerical value 1-10 indicating how often this appears",
      "impact": "Numerical value 1-10 indicating severity",
      "sentiment": "positive/negative/neutral/mixed",
      "possibleSolutions": ["Array of 2-3 potential content improvements"]
    }
  ] (exactly 6 items),
  "userExperiences": [
    {
      "scenario": "Detailed description of the viewer experience",
      "impact": "Analysis of how this experience affects viewer engagement",
      "frequencyPattern": "Pattern of occurrence and context",
      "sentiment": "positive/negative/neutral/mixed"
    }
  ] (exactly 3 items),
  "emotionalTriggers": [
    {
      "trigger": "Name of the emotional trigger",
      "context": "Detailed context where this trigger appears",
      "intensity": "Numerical value 1-10",
      "responsePattern": "Typical viewer response to this trigger",
      "dominantEmotion": "Primary emotion associated with this trigger"
    }
  ] (exactly 3 items),
  "marketImplications": "Strategic insights for content creation based on sentiment patterns"
}`
  };

  const payload = {
    model: modelName, // Using dynamic model name from Supabase
    messages: [
      analysisPrompt,
      {
        role: 'user',
        content: commentText,
      },
    ],
    temperature: 0.4,
    max_tokens: 3000,
    response_format: { type: 'json_object' },
  };

  try {
    const response = await fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      },
      TIMEOUT
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

    return analysis;
  } catch (error) {
    console.error('Groq API error:', error);
    throw new Error(
      `Analysis generation failed: ${
        error instanceof Error ? error.message : 'Unknown error'
      }`
    );
  }
}

// Utility function
function sanitizeText(text: string, maxLength: number = 300): string {
  if (!text) return '';
  
  const sanitized = text.replace(/\s+/g, ' ').trim();
  if (sanitized.length <= maxLength) return sanitized;
  
  const truncated = sanitized.substring(0, maxLength);
  const lastSpaceIndex = truncated.lastIndexOf(' ');
  return (lastSpaceIndex > 0 ? truncated.substring(0, lastSpaceIndex) : truncated) + '...';
}