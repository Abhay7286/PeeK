import { supabase } from '@/lib/supabase'

export interface AppBasic {
  app_id: string;
  app_name: string;
  app_icon: string;
  app_category?: string;
  rating?: number;
}

export interface App extends AppBasic {
  app_category: string;
  app_category_id: string;
  app_developer: string;
  num_downloads: string;
  app_description: string;
  app_page_link: string;
  price: number;
  price_currency: string | null;
  is_paid: boolean;
  rating: number;
  photos: {
    app_icon: string;
    trailer: string | null;
  };
  num_downloads_exact: number;
  app_content_rating: string;
  chart_label: string | null;
  chart_rank: string | null;
  app_updated_at_timestamp: number;
  app_updated_at_datetime_utc: string;
  num_ratings: number;
  num_reviews: number;
  app_first_released_at_datetime_utc: string;
  app_first_released_at_timestamp: number;
  current_version: string | null;
  current_version_released_at_timestamp: number | null;
  current_version_released_at_datetime_utc: string | null;
  current_version_whatsnew: string | null;
  contains_ads: boolean;
  privacy_policy_link: string | null;
  app_developer_website: string | null;
  app_developer_email: string | null;
}

export interface Review {
  review_id: string;
  review_text: string;
  review_rating: number;
  author_id: string;
  author_name: string;
  author_photo: string;
  author_app_version: string;
  review_timestamp: number;
  review_datetime_utc: string;
  review_likes: number;
  app_developer_reply: string | null;
  app_developer_reply_timestamp: number | null;
  app_developer_reply_datetime_utc: string | null;
}

export interface ReviewAnalysis {
  success: boolean;
  error?: string;
  debug?: DebugInfo;
  data?: {
    appId: string;
    appName: string;
    analysis: {
      overview: string;
      sentimentAnalysis: {
        overall: 'positive' | 'negative' | 'neutral' | 'mixed';
        score: number;
        distribution: {
          positive: number;
          neutral: number;
          negative: number;
        };
        trends: Array<{
          topic: string;
          sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
          intensity: number;
          examples: string[];
        }>;
      };
      painPoints: Array<{
        title: string;
        description: string;
        frequency: number;
        impact: number;
        sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
        possibleSolutions: string[];
        reviewExamples: string[];
      }>;
      userExperiences: Array<{
        scenario: string;
        sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
        impact: string;
        frequencyPattern: string;
        userQuotes: string[];
      }>;
      featureRequests: Array<{
        feature: string;
        description: string;
        demand: number;
        businessValue: number;
        implementationComplexity: 'low' | 'medium' | 'high';
      }>;
      competitiveAnalysis: {
        comparisonMentions: Array<{
          competitor: string;
          sentiment: 'positive' | 'negative' | 'neutral';
          context: string;
        }>;
        advantageGaps: string[];
      };
      versionTrends: {
        improvementAreas: string[];
        regressedFeatures: string[];
      };
      marketImplications: string;
      actionableRecommendations: string[];
    };
    sources: Array<{
      id: string;
      content: string;
      sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
      version: string;
      rating: number;
    }>;
  };
}

interface DebugInfo {
  reviewCounts: Record<string, number>;
  apiCalls: Array<{
    timestamp: string;
    endpoint: string;
    params: Record<string, unknown>;
  }>;
  errors: Array<{
    timestamp: string;
    endpoint: string;
    params?: Record<string, unknown>;
    error: string;
  }>;
  totalReviews?: number;
  uniqueReviews?: number;
  appDetailsSuccess?: boolean;
  groqApiKeyAvailable?: boolean;
  reviewsSampled?: boolean;
  sampledReviewCount?: number;
  groqResponse?: {
    status: number;
    statusText: string;
    headers: Record<string, string>;
  };
  groqResponseParsed?: boolean;
  groqResponseText?: string;
  groqResponseStructure?: unknown;
  groqContent?: string;
  error?: {
    message: string;
    stack?: string;
  };
}

interface SearchApiResponse {
  status: string;
  data: {
    apps: Array<{
      app_id: string;
      app_name: string;
      app_icon: string;
      app_category?: string;
      rating?: number;
    }>;
  };
}

interface ReviewsApiResponse {
  status: string;
  data: {
    reviews: Review[];
  };
}

interface ApiResponse<T> {
  status: string;
  data: T;
}

interface ReviewForAnalysis {
  id: string;
  rating: number;
  text: string;
  timestamp: number;
  date: string;
  version: string;
}

interface GroqResponse {
  choices?: Array<{
    message?: {
      content: string;
    };
  }>;
}

type RatingFilter = 'ANY' | 'ONE_STAR' | 'TWO_STARS' | 'THREE_STARS' | 'FOUR_STARS' | 'FIVE_STARS';

const API_HOST = 'store-apps.p.rapidapi.com';
const API_KEY = process.env.NEXT_PUBLIC_PLAYSTORE_RAPID_API_KEY;
const GROQ_API_KEY = process.env.NEXT_PUBLIC_PLAYSTORE_GROQ_API_KEY;

export async function getPlayStoreAnalyticsModel() {
  const { data } = await supabase.from('api_models').select('model_name').eq('api_name', 'PlayStoreAnalytics').single()
  return data?.model_name
}

const debugApiResponse = async (response: Response, context: string): Promise<unknown> => {
  const contentType = response.headers.get('content-type');
  let data: unknown;
  
  try {
    if (contentType && contentType.includes('application/json')) {
      data = await response.clone().json();
    } else {
      data = await response.clone().text();
    }
    console.log(`[DEBUG] ${context} response:`, {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      data
    });
    return data;
  } catch (error) {
    console.error(`[DEBUG] Failed to parse ${context} response:`, error);
    return null;
  }
};

export const searchApps = async (query: string): Promise<AppBasic[]> => {
  try {
    const url = `https://${API_HOST}/search?q=${encodeURIComponent(query)}&limit=10`;
    
    console.log(`[DEBUG] Searching apps with URL: ${url}`);
    
    const headers: Record<string, string> = {
      'x-rapidapi-key': API_KEY || '',
      'x-rapidapi-host': API_HOST
    };
    
    console.log(`[DEBUG] API Key available: ${!!API_KEY}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    await debugApiResponse(response, 'searchApps');
    
    if (!response.ok) {
      throw new Error(`Failed to search apps: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json() as SearchApiResponse;
    
    if (result.status !== "OK" || !result.data || !result.data.apps) {
      console.error('[DEBUG] Invalid API response:', result);
      throw new Error('Invalid response format from API');
    }
    
    return result.data.apps.map((app) => ({
      app_id: app.app_id,
      app_name: app.app_name,
      app_icon: app.app_icon || '',
      app_category: app.app_category,
      rating: app.rating
    }));
    
  } catch (error) {
    console.error('[DEBUG] Error searching apps:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to search apps');
  }
};

export const getAppDetails = async (appId: string): Promise<App> => {
  try {
    const url = `https://${API_HOST}/app-details?app_id=${encodeURIComponent(appId)}`;
    
    console.log(`[DEBUG] Getting app details with URL: ${url}`);
    
    const headers: Record<string, string> = {
      'x-rapidapi-key': API_KEY || '',
      'x-rapidapi-host': API_HOST
    };
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    await debugApiResponse(response, 'getAppDetails');
    
    if (!response.ok) {
      throw new Error(`Failed to get app details: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json() as ApiResponse<App>;
    
    if (result.status !== "OK" || !result.data) {
      console.error('[DEBUG] Invalid API response:', result);
      throw new Error('Invalid response format from API');
    }
    
    return result.data;
    
  } catch (error) {
    console.error('[DEBUG] Error getting app details:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get app details');
  }
};

const mapNumericRatingToString = (rating: 'ANY' | '1' | '2' | '3' | '4' | '5'): RatingFilter => {
  const ratingMap: Record<string, RatingFilter> = {
    'ANY': 'ANY',
    '1': 'ONE_STAR',
    '2': 'TWO_STARS',
    '3': 'THREE_STARS',
    '4': 'FOUR_STARS',
    '5': 'FIVE_STARS'
  };
  
  return ratingMap[rating] || 'ANY';
};

export const getAppReviews = async (
  appId: string, 
  limit: number = 20, 
  sortBy: 'MOST_RELEVANT' | 'NEWEST' = 'MOST_RELEVANT',
  rating: 'ANY' | '1' | '2' | '3' | '4' | '5' = 'ANY'
): Promise<Review[]> => {
  try {
    const ratingParam = mapNumericRatingToString(rating);
    const url = `https://${API_HOST}/app-reviews?app_id=${encodeURIComponent(appId)}&limit=${limit}&sort_by=${sortBy}&device=PHONE&rating=${ratingParam}&region=us&language=en`;
    
    console.log(`[DEBUG] Getting app reviews with URL: ${url}`);
    
    const headers: Record<string, string> = {
      'x-rapidapi-key': API_KEY || '',
      'x-rapidapi-host': API_HOST
    };
    
    console.log(`[DEBUG] Request headers:`, headers);
    
    const response = await fetch(url, {
      method: 'GET',
      headers
    });
    
    const debugData = await debugApiResponse(response, 'getAppReviews');
    
    if (!response.ok) {
      console.error(`[DEBUG] Failed API request. Status: ${response.status}, Status Text: ${response.statusText}`);
      console.error(`[DEBUG] Response data:`, debugData);
      throw new Error(`Failed to get app reviews: ${response.status} ${response.statusText}`);
    }
    
    const result = await response.json() as ReviewsApiResponse;
    
    if (result.status !== "OK" || !result.data || !result.data.reviews) {
      console.error('[DEBUG] Invalid API response format:', result);
      throw new Error(`Invalid response format from API: ${JSON.stringify(result)}`);
    }
    
    console.log(`[DEBUG] Successfully retrieved ${result.data.reviews.length} reviews`);
    
    return result.data.reviews;
    
  } catch (error) {
    console.error('[DEBUG] Error getting app reviews:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to get app reviews');
  }
};

export const analyzeAppReviews = async (
  appId: string, 
  appName: string,
  numberOfReviews: number = 50
): Promise<ReviewAnalysis> => {
  try {
    console.log(`[DEBUG] Starting review analysis for app: ${appId}, requesting ${numberOfReviews} reviews`);
    
    const debugInfo: DebugInfo = {
      reviewCounts: {},
      apiCalls: [],
      errors: []
    };
    
    const fetchReviews = async (
      id: string, 
      limit: number, 
      sort: 'MOST_RELEVANT' | 'NEWEST',
      ratingFilter: 'ANY' | '1' | '2' | '3' | '4' | '5' = 'ANY'
    ): Promise<Review[]> => {
      try {
        debugInfo.apiCalls.push({
          timestamp: new Date().toISOString(),
          endpoint: 'getAppReviews',
          params: { id, limit, sort, ratingFilter }
        });
        
        const reviews = await getAppReviews(id, limit, sort, ratingFilter);
        debugInfo.reviewCounts[`${sort}_${ratingFilter}`] = reviews.length;
        return reviews;
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        debugInfo.errors.push({
          timestamp: new Date().toISOString(),
          endpoint: 'getAppReviews',
          params: { id, limit, sort, ratingFilter },
          error: errorMsg
        });
        console.error(`[DEBUG] Error fetching ${sort} reviews with rating ${ratingFilter}:`, errorMsg);
        return [];
      }
    };
    
    let mostRelevantReviews: Review[] = [];
    let newestReviews: Review[] = [];
    let negativeReviews1: Review[] = [];
    let negativeReviews2: Review[] = [];
    let negativeReviews3: Review[] = [];
    
    const batchSize = Math.min(20, Math.floor(numberOfReviews / 5));
    
    try {
      mostRelevantReviews = await fetchReviews(appId, batchSize, 'MOST_RELEVANT');
    } catch (error) {
      console.error('[DEBUG] Failed to fetch most relevant reviews:', error);
    }
    
    try {
      newestReviews = await fetchReviews(appId, batchSize, 'NEWEST');
    } catch (error) {
      console.error('[DEBUG] Failed to fetch newest reviews:', error);
    }
    
    try {
      negativeReviews1 = await fetchReviews(appId, Math.floor(batchSize/3), 'MOST_RELEVANT', '1');
    } catch (error) {
      console.error('[DEBUG] Failed to fetch negative reviews (1 star):', error);
    }
    
    try {
      negativeReviews2 = await fetchReviews(appId, Math.floor(batchSize/3), 'MOST_RELEVANT', '2');
    } catch (error) {
      console.error('[DEBUG] Failed to fetch negative reviews (2 star):', error);
    }
    
    try {
      negativeReviews3 = await fetchReviews(appId, Math.floor(batchSize/3), 'MOST_RELEVANT', '3');
    } catch (error) {
      console.error('[DEBUG] Failed to fetch negative reviews (3 star):', error);
    }
    
    const allReviews = [
      ...mostRelevantReviews, 
      ...newestReviews, 
      ...negativeReviews1, 
      ...negativeReviews2, 
      ...negativeReviews3
    ];
    
    const uniqueReviews = Array.from(
      new Map(allReviews.map(review => [review.review_id, review])).values()
    );
    
    console.log(`[DEBUG] Total reviews collected: ${allReviews.length}, Unique reviews: ${uniqueReviews.length}`);
    debugInfo.totalReviews = allReviews.length;
    debugInfo.uniqueReviews = uniqueReviews.length;
    
    if (uniqueReviews.length === 0) {
      console.error('[DEBUG] No reviews available for analysis');
      return {
        success: false,
        error: 'No reviews available for analysis',
        debug: debugInfo
      };
    }
    
    let appDetails: App | null = null;
    try {
      debugInfo.apiCalls.push({
        timestamp: new Date().toISOString(),
        endpoint: 'getAppDetails',
        params: { appId }
      });
      
      appDetails = await getAppDetails(appId);
      debugInfo.appDetailsSuccess = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      debugInfo.errors.push({
        timestamp: new Date().toISOString(),
        endpoint: 'getAppDetails',
        params: { appId },
        error: errorMsg
      });
      console.warn('[DEBUG] Could not fetch app details:', errorMsg);
      debugInfo.appDetailsSuccess = false;
    }
    
    const reviewsForAnalysis: ReviewForAnalysis[] = uniqueReviews.map(review => ({
      id: review.review_id,
      rating: review.review_rating,
      text: review.review_text,
      timestamp: review.review_timestamp,
      date: review.review_datetime_utc,
      version: review.author_app_version
    }));
    
    console.log(`[DEBUG] Preparing to send ${reviewsForAnalysis.length} reviews to Groq API`);
    
    const groqUrl = 'https://api.groq.com/openai/v1/chat/completions';
    
    const groqHeaders: Record<string, string> = {
      'Authorization': `Bearer ${GROQ_API_KEY || ''}`,
      'Content-Type': 'application/json'
    };
    
    console.log(`[DEBUG] Groq API Key available: ${!!GROQ_API_KEY}`);
    debugInfo.groqApiKeyAvailable = !!GROQ_API_KEY;
    
    const systemPrompt = `You are an expert product analyst specializing in mobile app reviews. 
Your task is to provide deep, actionable insights from user reviews that can guide product decisions.

Guidelines:
1. Analyze reviews for patterns, themes, and sentiment trends
2. Prioritize issues by frequency and impact on user experience
3. Identify specific feature requests and improvement opportunities
4. Extract user quotes that exemplify key points
5. Note version-specific issues or improvements
6. Identify competitive advantages or disadvantages mentioned
7. Provide actionable recommendations based on the data

Be precise and data-driven in your analysis. Respond only with JSON in the exact format requested.`;

    const createUserPrompt = (reviews: ReviewForAnalysis[], isSampled = false) => {
      return `Analyze these ${reviews.length} reviews for the app "${appName}" (ID: ${appId}).
${appDetails ? `
App Category: ${appDetails.app_category}
Downloads: ${appDetails.num_downloads}
Current Version: ${appDetails.current_version || 'Unknown'}
Release Date: ${appDetails.app_first_released_at_datetime_utc}
Last Updated: ${appDetails.app_updated_at_datetime_utc}
` : ''}

I need comprehensive insights that can directly inform product decisions. Focus on:
- Clear patterns in user feedback (positive and negative)
- Specific pain points with concrete examples
- Feature requests with assessment of potential business value
- Version-specific issues or improvements
- Competitive mentions and comparative feedback
- Precise, actionable recommendations

Analyze version trends if version information is available in reviews.

Format your response exactly according to this JSON schema:
{
  "appId": "string",
  "appName": "string",
  "analysis": {
    "overview": "string - A concise executive summary of the key insights",
    "sentimentAnalysis": {
      "overall": "positive|negative|neutral|mixed",
      "score": "number - normalized sentiment score from 0 to 10",
      "distribution": {
        "positive": "number - percentage of positive reviews",
        "neutral": "number - percentage of neutral reviews",
        "negative": "number - percentage of negative reviews"
      },
      "trends": [
        {
          "topic": "string - specific aspect or feature mentioned",
          "sentiment": "positive|negative|neutral|mixed",
          "intensity": "number from 0-10 indicating strength of sentiment",
          "examples": ["string - direct user quotes illustrating this trend"]
        }
      ]
    },
    "painPoints": [
      {
        "title": "string - concise name of the issue",
        "description": "string - detailed explanation of the problem",
        "frequency": "number from 0-10 indicating how often this appears",
        "impact": "number from 0-10 indicating severity for users",
        "sentiment": "positive|negative|neutral|mixed",
        "possibleSolutions": ["string - concrete actionable solutions"],
        "reviewExamples": ["string - direct quotes from reviews mentioning this issue"]
      }
    ],
    "userExperiences": [
      {
        "scenario": "string - specific use case or user journey described",
        "sentiment": "positive|negative|neutral|mixed",
        "impact": "string - how this affects the overall user experience",
        "frequencyPattern": "string - when/how often this occurs",
        "userQuotes": ["string - direct quotes describing this experience"]
      }
    ],
    "featureRequests": [
      {
        "feature": "string - name of requested feature",
        "description": "string - detailed explanation of what users want",
        "demand": "number from 0-10 indicating frequency of requests",
        "businessValue": "number from 0-10 indicating potential value",
        "implementationComplexity": "low|medium|high"
      }
    ],
    "competitiveAnalysis": {
      "comparisonMentions": [
        {
          "competitor": "string - name of competing app mentioned",
          "sentiment": "positive|negative|neutral",
          "context": "string - context of the comparison"
        }
      ],
      "advantageGaps": ["string - areas where competitors are mentioned as better"]
    },
    "versionTrends": {
      "improvementAreas": ["string - features that have improved over versions"],
      "regressedFeatures": ["string - features that have gotten worse"]
    },
    "marketImplications": "string - broader market context and opportunity",
    "actionableRecommendations": ["string - specific, prioritized action items"]
  },
  "sources": [
    {
      "id": "string - review ID",
      "content": "string - review text",
      "sentiment": "positive|negative|neutral|mixed",
      "version": "string - app version",
      "rating": "number - star rating"
    }
  ]
}

Here are the reviews to analyze${isSampled ? ` (sampled from ${reviewsForAnalysis.length} total reviews)` : ''}: ${JSON.stringify(reviews)}`;
    };

    let reviewsToSend = reviewsForAnalysis;
    let isSampled = false;
    
    if (reviewsForAnalysis.length > 100) {
      console.log('[DEBUG] Too many reviews, sampling 100 for analysis');
      reviewsToSend = reviewsForAnalysis
        .sort((a, b) => b.timestamp - a.timestamp)
        .slice(0, 100);
      
      debugInfo.reviewsSampled = true;
      debugInfo.sampledReviewCount = reviewsToSend.length;
      isSampled = true;
    }
    
    const userPrompt = createUserPrompt(reviewsToSend, isSampled);
    
    console.log('[DEBUG] Sending request to Groq API');
    debugInfo.apiCalls.push({
      timestamp: new Date().toISOString(),
      endpoint: 'groqApi',
      params: { reviewsCount: reviewsToSend.length }
    });
    
    try {
      // Fetch the model name from Supabase
      const modelName = await getPlayStoreAnalyticsModel();
      
      const groqResponse = await fetch(groqUrl, {
        method: 'POST',
        headers: groqHeaders,
        body: JSON.stringify({
          model: modelName || "meta-llama/llama-4-maverick-17b-128e-instruct", // Fallback to original model if not found
          messages: [
            {
              role: "system",
              content: systemPrompt
            },
            {
              role: "user",
              content: userPrompt
            }
          ],
          temperature: 0.4,
          max_tokens: 4500,
          response_format: { type: 'json_object' },
        })
      });
      
      const groqResponseText = await groqResponse.text();
      console.log(`[DEBUG] Groq API response status: ${groqResponse.status}`);
      debugInfo.groqResponse = {
        status: groqResponse.status,
        statusText: groqResponse.statusText,
        headers: Object.fromEntries(groqResponse.headers.entries())
      };
      
      if (!groqResponse.ok) {
        console.error('[DEBUG] Groq analysis failed:', groqResponseText);
        debugInfo.errors.push({
          timestamp: new Date().toISOString(),
          endpoint: 'groqApi',
          error: groqResponseText
        });
        
        return {
          success: false,
          error: `Failed to analyze reviews: ${groqResponse.status} ${groqResponse.statusText}`,
          debug: debugInfo
        };
      }
      
      let analysisResult;
      try {
        analysisResult = JSON.parse(groqResponseText) as GroqResponse;
        debugInfo.groqResponseParsed = true;
      } catch (parseError) {
        console.error('[DEBUG] Error parsing Groq response as JSON:', parseError);
        debugInfo.errors.push({
          timestamp: new Date().toISOString(),
          endpoint: 'groqApiParsing',
          error: parseError instanceof Error ? parseError.message : 'Unknown error'
        });
        
        return {
          success: false,
          error: 'Failed to parse Groq API response as JSON',
          debug: {
            ...debugInfo,
            groqResponseText: groqResponseText.substring(0, 1000) + '...'
          }
        };
      }
      
      if (!analysisResult.choices || !analysisResult.choices[0]?.message?.content) {
        console.error('[DEBUG] Invalid structure in Groq response:', analysisResult);
        return {
          success: false,
          error: 'Invalid response structure from Groq',
          debug: {
            ...debugInfo,
            groqResponseStructure: analysisResult
          }
        };
      }
      
      try {
        const analysisData = JSON.parse(analysisResult.choices[0].message.content);
        console.log('[DEBUG] Successfully parsed analysis data');
        
        return {
          success: true,
          data: analysisData,
          debug: debugInfo
        };
        
      } catch (parseError) {
        console.error('[DEBUG] Error parsing analysis JSON from Groq content:', parseError);
        return {
          success: false,
          error: 'Failed to parse analysis results from Groq content',
          debug: {
            ...debugInfo,
            groqContent: analysisResult.choices[0].message.content.substring(0, 1000) + '...'
          }
        };
      }
    } catch (groqError) {
      console.error('[DEBUG] Error during Groq API call:', groqError);
      return {
        success: false,
        error: groqError instanceof Error ? groqError.message : 'Failed to call Groq API',
        debug: debugInfo
      };
    }
    
  } catch (error) {
    console.error('[DEBUG] Top-level error in analyzeAppReviews:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to analyze app reviews',
      debug: {
        reviewCounts: {},
        apiCalls: [],
        errors: [],
        error: error instanceof Error ? {
          message: error.message,
          stack: error.stack
        } : undefined
      }
    };
  }
};