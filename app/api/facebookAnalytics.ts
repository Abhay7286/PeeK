import { supabase } from '@/lib/supabase'; // Adjust this import path to your supabase client

interface MetaAdItem {
  adid: string;
  adArchiveID: string;
  pageID: string;
  pageName: string;
  snapshot: {
    cards?: Array<{
      body?: string;
      title?: string;
      link_url?: string;
      video_preview_image_url?: string;
      image_url?: string;
    }>;
    body?: {
      markup?: {
        __html?: string;
      };
    };
    title?: string;
    link_description?: string;
    creation_time?: number;
    // Enhanced image and video structure based on API response
    images?: Array<{
      original_image_url?: string;
      resized_image_url?: string;
      watermarked_resized_image_url?: string;
    }>;
    videos?: Array<{
      video_hd_url?: string;
      video_sd_url?: string;
      watermarked_video_sd_url?: string;
      watermarked_video_hd_url?: string;
      video_preview_image_url?: string;
    }>;
  };
  isActive: boolean;
  startDate?: number;
  endDate?: number;
}

interface MetaAdAPIResponse {
  query: string;
  country_code: string;
  number_of_ads: number;
  results: Array<Array<MetaAdItem>>;
  continuation_token?: string;
  is_result_complete: boolean;
}

// Enhanced interface for structured ad analysis
interface AnalysisResult {
  success: boolean;
  data?: {
    analysis: AnalysisData;
    sources: MetaAdContent[];
    timestamp: string;
    filteringStats: {
      totalFetched: number;
      afterDeduplication: number;
      afterKeywordFilter: number;
      finalAnalyzed: number;
    };
  };
  error?: string;
  rawResponse?: unknown;
}

// Enhanced content structure with proper media URLs
interface MetaAdContent {
  adId: string;
  pageId: string;
  pageName: string;
  content: string;
  title?: string;
  images: MediaUrl[]; // Enhanced image structure
  videos: VideoUrl[]; // Enhanced video structure
  linkUrl?: string;
  active: boolean;
  creationTime?: string;
  relevanceScore?: number; // New field for keyword matching score
}

// Structure for image URLs with different quality options
interface MediaUrl {
  original?: string;
  resized?: string;
  watermarked?: string;
  preview?: string; // For video preview images
  type: 'image' | 'video_preview';
}

// Structure for video URLs with different quality options
interface VideoUrl {
  hd?: string;
  sd?: string;
  watermarked_hd?: string;
  watermarked_sd?: string;
  preview_image?: string;
}

// Structure for analysis data
interface AnalysisData {
  overview: string;
  messagingStrategies: Array<{
    strategy: string;
    description: string;
    prevalence: number;
    effectiveness: number;
    examples: string[];
  }>;
  visualTactics: Array<{
    tactic: string;
    implementation: string;
    impact: string;
    frequencyOfUse: number;
  }>;
  audienceTargeting: Array<{
    segment: string;
    approach: string;
    intensity: number;
    engagementPotential: string;
  }>;
  competitiveAdvantage: string;
  callToActionEffectiveness: Array<{
    cta: string;
    context: string;
    strength: number;
    conversionPotential: string;
  }>;
  recommendedCounterStrategies: string;
}


  export class MetaAdAnalysisService {
  private static readonly TIMEOUT = 60000;
  private static readonly RAPIDAPI_KEY = process.env.NEXT_PUBLIC_FACEBOOK_RAPIDAPI_KEY;
  private static readonly GROQ_API_KEY = process.env.NEXT_PUBLIC_FACEBOOK_GROQ_API_KEY;
  
  // Enhanced configuration for better filtering
  private static readonly FETCH_MULTIPLIER = 3; // Fetch 3x more ads than needed
  private static readonly MIN_RELEVANCE_SCORE = 0.4; // Minimum keyword match score
  private static readonly MAX_INITIAL_FETCH = 200; // Maximum ads to fetch initially

  // Get model name from Supabase
  private static async getFacebookAdsAnalysisModel() {
    const { data } = await supabase
      .from('api_models')
      .select('model_name')
      .eq('api_name', 'FacebookAdsAnalysis')
      .single()
    
    return data?.model_name
  }

  // Fetch with timeout to prevent hanging requests
  private static async fetchWithTimeout(
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
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new Error('Request timed out');
        }
      }
      throw error;
    }
  }

  // Main analysis method - enhanced with keyword filtering
  public static async analyzeCompetitorAds(
    query: string,
    countryCode: string = 'IN',
    platform: string = 'facebook,instagram',
    adType: string = 'all',
    limit: number = 50
  ): Promise<AnalysisResult> {
    try {
      if (!query || !query.trim()) {
        return { success: false, error: 'Query cannot be empty' };
      }
      
      if (!this.RAPIDAPI_KEY) {
        return { success: false, error: 'RapidAPI key not configured' };
      }
      if (!this.GROQ_API_KEY) {
        return { success: false, error: 'Groq API key not configured' };
      }

      // Calculate how many ads to fetch initially (more than needed for filtering)
      const initialFetchLimit = Math.min(
        limit * this.FETCH_MULTIPLIER,
        this.MAX_INITIAL_FETCH
      );

      console.log(`Fetching ${initialFetchLimit} ads for keyword filtering (target: ${limit})`);

      // Search for ads based on query (fetch more than needed)
      const allAds = await this.searchMetaAds(query, countryCode, platform, adType, initialFetchLimit);
      
      if (!allAds || allAds.length === 0) {
        return { success: false, error: 'No relevant ads found for the query' };
      }

      // Extract content from all fetched ads
      const allAdContent = this.extractContentFromAds(allAds);
      
      if (allAdContent.length === 0) {
        return { success: false, error: 'Failed to extract content from ads' };
      }

      // Filter ads based on keyword relevance
      const relevantAds = this.filterAdsByKeywordRelevance(query, allAdContent);
      
      if (relevantAds.length === 0) {
        return { 
          success: false, 
          error: `No ads contain the query keywords "${query}". Found ${allAdContent.length} ads but none were relevant.` 
        };
      }

      // Take only the requested number of most relevant ads
      const finalAds = relevantAds
        .sort((a, b) => (b.relevanceScore || 0) - (a.relevanceScore || 0))
        .slice(0, limit);

      console.log(`Filtered from ${allAds.length} → ${allAdContent.length} → ${relevantAds.length} → ${finalAds.length} ads`);

      // Generate the analysis using AI with filtered, relevant ads
      try {
        const analysis = await this.generateAdAnalysis(query, finalAds);
        let parsedAnalysis: AnalysisData;
        
        try {
          parsedAnalysis = JSON.parse(analysis) as AnalysisData;
        } catch {
          return { 
            success: false, 
            error: 'Failed to parse analysis result', 
            rawResponse: analysis 
          };
        }

        return {
          success: true,
          data: {
            analysis: parsedAnalysis,
            sources: finalAds,
            timestamp: new Date().toISOString(),
            filteringStats: {
              totalFetched: allAds.length,
              afterDeduplication: allAdContent.length,
              afterKeywordFilter: relevantAds.length,
              finalAnalyzed: finalAds.length
            }
          },
        };
      } catch (analysisError) {
        return { 
          success: false, 
          error: `Analysis generation failed: ${analysisError instanceof Error ? analysisError.message : 'Unknown error'}`,
          rawResponse: { adContent: finalAds }
        };
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Analysis error:', error);
      return { success: false, error: errorMessage };
    }
  }

  // New method to filter ads based on keyword relevance
  private static filterAdsByKeywordRelevance(
    query: string,
    adContent: MetaAdContent[]
  ): MetaAdContent[] {
    if (!query || !adContent || adContent.length === 0) {
      return [];
    }

    // Prepare query keywords for matching
    const queryKeywords = this.prepareKeywordsForMatching(query);
    
    if (queryKeywords.length === 0) {
      console.warn('No valid keywords extracted from query');
      return adContent; // Return all if no keywords could be extracted
    }

    const relevantAds: MetaAdContent[] = [];

    for (const ad of adContent) {
      const relevanceScore = this.calculateRelevanceScore(ad, queryKeywords);
      
      if (relevanceScore >= this.MIN_RELEVANCE_SCORE) {
        ad.relevanceScore = relevanceScore;
        relevantAds.push(ad);
      }
    }

    console.log(`Keyword filter: ${queryKeywords.join(', ')} found ${relevantAds.length}/${adContent.length} relevant ads`);
    
    return relevantAds;
  }

  // Extract and prepare keywords from query for matching
  private static prepareKeywordsForMatching(query: string): string[] {
    if (!query) return [];

    // Remove common stop words and prepare keywords
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 
      'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
      'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'can', 'shall', 'about', 'into', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'among'
    ]);

    const keywords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.trim())
      .filter(Boolean);

    // Also include the original query as a phrase
    const cleanQuery = query.toLowerCase().replace(/[^\w\s]/g, ' ').trim();
    if (cleanQuery.length > 3) {
      keywords.push(cleanQuery);
    }

    return [...new Set(keywords)]; // Remove duplicates
  }

  // Calculate relevance score based on keyword matching
  private static calculateRelevanceScore(
    ad: MetaAdContent,
    queryKeywords: string[]
  ): number {
    if (!ad || queryKeywords.length === 0) return 0;

    // Prepare ad content for matching
    const searchableContent = [
      ad.content || '',
      ad.title || '',
      ad.pageName || ''
    ].join(' ').toLowerCase();

    if (!searchableContent.trim()) return 0;

    let totalScore = 0;
    let maxPossibleScore = 0;

    for (const keyword of queryKeywords) {
      maxPossibleScore += 1;

      if (searchableContent.includes(keyword)) {
        // Base score for keyword presence
        let keywordScore = 0.5;

        // Bonus for exact word matches (not just substring)
        const wordRegex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (wordRegex.test(searchableContent)) {
          keywordScore += 0.3;
        }

        // Bonus for title matches (more important)
        if ((ad.title || '').toLowerCase().includes(keyword)) {
          keywordScore += 0.2;
        }

        // Count frequency (diminishing returns)
        const frequency = (searchableContent.match(new RegExp(keyword, 'gi')) || []).length;
        keywordScore += Math.min(frequency * 0.1, 0.5);

        totalScore += Math.min(keywordScore, 1); // Cap individual keyword score at 1
      }
    }

    // Normalize score to 0-1 range
    const normalizedScore = maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
    
    return Math.min(normalizedScore, 1);
  }

  // Search Meta Ad Library for ads and remove duplicates - enhanced to fetch more
  private static async searchMetaAds(
    query: string,
    countryCode: string,
    platform: string,
    adType: string,
    limit: number
  ): Promise<MetaAdItem[]> {
    const url = new URL('https://meta-ad-library.p.rapidapi.com/search/ads');
    url.searchParams.append('query', query);
    url.searchParams.append('country_code', countryCode);
    url.searchParams.append('active_status', 'all');
    url.searchParams.append('media_types', 'all');
    url.searchParams.append('platform', platform);
    url.searchParams.append('ad_type', adType);
    url.searchParams.append('search_type', 'keyword_unordered'); // Changed to get more diverse results

    try {
      console.log(`Fetching Meta ads for query: ${query} (limit: ${limit})`);
      
      const response = await this.fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': this.RAPIDAPI_KEY || '',
            'x-rapidapi-host': 'meta-ad-library.p.rapidapi.com',
          },
        },
        this.TIMEOUT
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => null);
        throw new Error(`Meta Ad API error: ${response.status} - ${errorText || response.statusText}`);
      }

      const data: MetaAdAPIResponse = await response.json();
      
      if (!data) {
        throw new Error('Empty response from Meta Ad API');
      }
      
      if (!data.results || !Array.isArray(data.results)) {
        throw new Error('Invalid Meta Ad API response format');
      }

      // Flatten the nested arrays
      const allAds: MetaAdItem[] = [];
      for (const adGroup of data.results) {
        if (Array.isArray(adGroup)) {
          allAds.push(...adGroup);
        }
      }

      // Remove duplicate ads by adArchiveID and content similarity
      const uniqueAds = this.removeDuplicateAds(allAds);
      
      console.log(`API returned ${allAds.length} ads, filtered to ${uniqueAds.length} unique ads`);
      
      // Return more ads than requested since we'll filter by keywords later
      return uniqueAds.slice(0, limit);
    } catch (error) {
      console.error('Meta Ad search error:', error);
      throw new Error(
        `Failed to fetch Meta ads: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Remove duplicate ads based on content similarity - enhanced
  private static removeDuplicateAds(ads: MetaAdItem[]): MetaAdItem[] {
    if (!ads || !Array.isArray(ads) || ads.length === 0) {
      return [];
    }

    // First, deduplicate by adArchiveID
    const uniqueByIdMap = new Map<string, MetaAdItem>();
    
    for (const ad of ads) {
      if (ad && ad.adArchiveID && !uniqueByIdMap.has(ad.adArchiveID)) {
        uniqueByIdMap.set(ad.adArchiveID, ad);
      }
    }
    
    const uniqueByIdAds = Array.from(uniqueByIdMap.values());
    
    // Next, check for content similarity to catch ads that have the same content but different IDs
    const uniqueAds: MetaAdItem[] = [];
    const contentSignatures = new Set<string>();
    
    for (const ad of uniqueByIdAds) {
      // Create a content signature using available text fields
      const contentParts: string[] = [];
      
      if (ad.snapshot?.title) contentParts.push(ad.snapshot.title);
      
      if (ad.snapshot?.body?.markup?.__html) {
        // Extract text and remove HTML tags for comparison
        const htmlText = ad.snapshot.body.markup.__html.replace(/<[^>]*>/g, '').trim();
        if (htmlText) contentParts.push(htmlText);
      }
      
      if (ad.snapshot?.link_description) contentParts.push(ad.snapshot.link_description);
      
      // Process cards content
      if (ad.snapshot?.cards && Array.isArray(ad.snapshot.cards)) {
        for (const card of ad.snapshot.cards) {
          if (card.title) contentParts.push(card.title);
          if (card.body) contentParts.push(card.body);
        }
      }
      
      // Create a simplified signature for content comparison
      const contentSignature = contentParts
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase()
        .slice(0, 150); // Increased for better uniqueness detection
      
      // Only add the ad if we haven't seen very similar content before
      if (contentSignature && contentSignature.length > 20) {
        // Use fuzzy matching for similar content detection
        let isDuplicate = false;
        for (const existingSignature of contentSignatures) {
          if (this.calculateStringSimilarity(contentSignature, existingSignature) > 0.85) {
            isDuplicate = true;
            break;
          }
        }
        
        if (!isDuplicate) {
          contentSignatures.add(contentSignature);
          uniqueAds.push(ad);
        }
      } else {
        // If we can't create a good content signature, include the ad anyway
        uniqueAds.push(ad);
      }
    }
    
    return uniqueAds;
  }

  // Calculate string similarity for better duplicate detection
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;

    // Simple Jaccard similarity using word sets
    const words1 = new Set(str1.split(/\s+/));
    const words2 = new Set(str2.split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  // Enhanced method to extract all media URLs from ads
  private static extractContentFromAds(ads: MetaAdItem[]): MetaAdContent[] {
    if (!ads || !Array.isArray(ads)) {
      console.error('Invalid ads data provided to extractContentFromAds');
      return [];
    }

    return ads.map(ad => {
      if (!ad) return null;
      
      // Initialize content with any available text fields
      let content = '';
      
      // Extract text from cards if available
      if (ad.snapshot?.cards && Array.isArray(ad.snapshot.cards)) {
        ad.snapshot.cards.forEach(card => {
          if (card.body) content += card.body + ' ';
          if (card.title) content += card.title + ' ';
        });
      }
      
      // Extract from main body if available
      if (ad.snapshot?.body?.markup?.__html) {
        // Remove HTML tags
        const htmlContent = ad.snapshot.body.markup.__html;
        content += htmlContent.replace(/<[^>]*>/g, ' ') + ' ';
      }
      
      // Add title and description if available
      if (ad.snapshot?.title) content += ad.snapshot.title + ' ';
      if (ad.snapshot?.link_description) content += ad.snapshot.link_description + ' ';
      
      // Create timestamp from creation_time if available
      let creationTime: string | undefined;
      if (ad.snapshot?.creation_time) {
        creationTime = new Date(ad.snapshot.creation_time * 1000).toISOString();
      }
      
      // Extract all image URLs - Enhanced to handle the proper API structure
      const images: MediaUrl[] = [];
      
      // Extract from snapshot.images array (main images)
      if (ad.snapshot?.images && Array.isArray(ad.snapshot.images)) {
        for (const imageObj of ad.snapshot.images) {
          if (typeof imageObj === 'object' && imageObj !== null) {
            const mediaUrl: MediaUrl = { type: 'image' };
            
            if (imageObj.original_image_url) {
              mediaUrl.original = imageObj.original_image_url;
            }
            if (imageObj.resized_image_url) {
              mediaUrl.resized = imageObj.resized_image_url;
            }
            if (imageObj.watermarked_resized_image_url) {
              mediaUrl.watermarked = imageObj.watermarked_resized_image_url;
            }
            
            // Only add if we have at least one URL
            if (mediaUrl.original || mediaUrl.resized || mediaUrl.watermarked) {
              images.push(mediaUrl);
            }
          } else if (typeof imageObj === 'string') {
            // Handle case where images might be direct URL strings
            images.push({ original: imageObj, type: 'image' });
          }
        }
      }
      
      // Extract image URLs from cards
      if (ad.snapshot?.cards && Array.isArray(ad.snapshot.cards)) {
        for (const card of ad.snapshot.cards) {
          if (card.video_preview_image_url) {
            images.push({ 
              preview: card.video_preview_image_url, 
              type: 'video_preview' 
            });
          }
          if (card.image_url) {
            images.push({ 
              original: card.image_url, 
              type: 'image' 
            });
          }
        }
      }
      
      // Extract all video URLs - Enhanced to handle the proper API structure
      const videos: VideoUrl[] = [];
      
      // Extract from snapshot.videos array
      if (ad.snapshot?.videos && Array.isArray(ad.snapshot.videos)) {
        for (const videoObj of ad.snapshot.videos) {
          if (typeof videoObj === 'object' && videoObj !== null) {
            const videoUrl: VideoUrl = {};
            
            if (videoObj.video_hd_url) {
              videoUrl.hd = videoObj.video_hd_url;
            }
            if (videoObj.video_sd_url) {
              videoUrl.sd = videoObj.video_sd_url;
            }
            if (videoObj.watermarked_video_hd_url) {
              videoUrl.watermarked_hd = videoObj.watermarked_video_hd_url;
            }
            if (videoObj.watermarked_video_sd_url) {
              videoUrl.watermarked_sd = videoObj.watermarked_video_sd_url;
            }
            if (videoObj.video_preview_image_url) {
              videoUrl.preview_image = videoObj.video_preview_image_url;
              // Also add preview image to images array
              images.push({
                preview: videoObj.video_preview_image_url,
                type: 'video_preview'
              });
            }
            
            // Only add if we have at least one video URL
            if (videoUrl.hd || videoUrl.sd || videoUrl.watermarked_hd || videoUrl.watermarked_sd) {
              videos.push(videoUrl);
            }
          }
        }
      }
      
      // Extract additional image URLs from HTML content if present
      if (ad.snapshot?.body?.markup?.__html) {
        const htmlContent = ad.snapshot.body.markup.__html;
        const imgRegex = /<img[^>]+src="([^">]+)"/g;
        let match;
        while ((match = imgRegex.exec(htmlContent)) !== null) {
          if (match[1]) {
            images.push({ original: match[1], type: 'image' });
          }
        }
      }
      
      // Find first available link URL
      let linkUrl: string | undefined;
      if (ad.snapshot?.cards && Array.isArray(ad.snapshot.cards)) {
        for (const card of ad.snapshot.cards) {
          if (card.link_url) {
            linkUrl = card.link_url;
            break;
          }
        }
      }
      
      // Remove duplicate URLs from images and videos
      const uniqueImages = this.removeDuplicateMediaUrls(images);
      
      return {
        adId: ad.adArchiveID,
        pageId: ad.pageID,
        pageName: ad.pageName,
        content: this.sanitizeText(content),
        title: ad.snapshot?.title,
        images: uniqueImages,
        videos: videos,
        linkUrl,
        active: ad.isActive,
        creationTime
      };
    }).filter(Boolean) as MetaAdContent[];
  }

  // Helper method to remove duplicate media URLs
  private static removeDuplicateMediaUrls(mediaUrls: MediaUrl[]): MediaUrl[] {
    const seen = new Set<string>();
    const unique: MediaUrl[] = [];
    
    for (const media of mediaUrls) {
      // Create a signature from all available URLs
      const urls = [media.original, media.resized, media.watermarked, media.preview]
        .filter(Boolean)
        .join('|');
      
      if (urls && !seen.has(urls)) {
        seen.add(urls);
        unique.push(media);
      }
    }
    
    return unique;
  }

  // Generate analysis using Groq API - Enhanced with filtering context
  private static async generateAdAnalysis(query: string, adContent: MetaAdContent[]): Promise<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    if (!adContent || adContent.length === 0) {
      throw new Error('No ad content available for analysis');
    }
    
    // Get model name from Supabase
    const modelName = await this.getFacebookAdsAnalysisModel();
    if (!modelName) {
      throw new Error('Failed to fetch model name from database');
    }
    
    // Enhanced content preparation with media URLs and relevance scores
    const combinedContent = adContent
      .map(ad => {
        let mediaInfo = '';
        
        // Add image information
        if (ad.images.length > 0) {
          const imageUrls = ad.images.map(img => {
            const urls = [];
            if (img.original) urls.push(`Original: ${img.original}`);
            if (img.resized) urls.push(`Resized: ${img.resized}`);
            if (img.preview) urls.push(`Preview: ${img.preview}`);
            return urls.join(', ');
          }).join('; ');
          mediaInfo += `\nImages: ${imageUrls}`;
        }
        
        // Add video information
        if (ad.videos.length > 0) {
          const videoUrls = ad.videos.map(video => {
            const urls = [];
            if (video.hd) urls.push(`HD: ${video.hd}`);
            if (video.sd) urls.push(`SD: ${video.sd}`);
            if (video.preview_image) urls.push(`Preview: ${video.preview_image}`);
            return urls.join(', ');
          }).join('; ');
          mediaInfo += `\nVideos: ${videoUrls}`;
        }
        
        if (!mediaInfo) {
          mediaInfo = '\nNo media content';
        }
        
        const relevanceInfo = ad.relevanceScore ? ` (Relevance: ${(ad.relevanceScore * 100).toFixed(0)}%)` : '';
        
        return `AD #${ad.adId} from ${ad.pageName}${relevanceInfo}: "${ad.content}"${mediaInfo}`;
      })
      .join('\n\n')
      .slice(0, 12000); // Increased limit to accommodate media URLs
    
    if (!combinedContent.trim()) {
      throw new Error('Empty content after processing ad data');
    }
    
    console.log(`Generating analysis for query: ${query} with ${adContent.length} filtered/relevant ads using model: ${modelName}`);
    
    const analysisPrompt = {
      role: 'system',
      content: `You are an expert in competitive ad analysis specializing in digital marketing strategy. Analyze the provided Meta (Facebook/Instagram) ads about "${query}" and generate a comprehensive analysis in the following JSON format:

{
  "overview": "Executive summary of the competitor ad strategies using professional marketing terminology",
  "messagingStrategies": [
    {
      "strategy": "Clear, descriptive name of the messaging strategy",
      "description": "Detailed analysis of how this strategy is implemented",
      "prevalence": "Numerical value 1-10 indicating how common this approach is",
      "effectiveness": "Numerical value 1-10 indicating estimated effectiveness",
      "examples": ["Array of 2-3 brief example phrases from the ads"]
    }
  ] (exactly 6 items),
  "visualTactics": [
    {
      "tactic": "Name of the visual or design approach",
      "implementation": "How the tactic is executed in the ads",
      "impact": "Analysis of the intended emotional/psychological effect",
      "frequencyOfUse": "Numerical value 1-10 indicating prevalence"
    }
  ] (exactly 3 items),
  "audienceTargeting": [
    {
      "segment": "Identified target audience segment",
      "approach": "How the ads speak to this audience",
      "intensity": "Numerical value 1-10 indicating targeting focus",
      "engagementPotential": "Assessment of likely engagement from this segment"
    }
  ] (exactly 3 items),
  "competitiveAdvantage": "Analysis of the unique selling propositions and competitive positioning",
  "callToActionEffectiveness": [
    {
      "cta": "The specific call to action text or approach",
      "context": "How it's presented in the ad",
      "strength": "Numerical value 1-10 indicating potential effectiveness",
      "conversionPotential": "Assessment of conversion likelihood"
    }
  ] (exactly 3 items),
  "recommendedCounterStrategies": "Strategic insights for countering these competitor approaches"
}

NOTE: These ads have been pre-filtered to contain keywords related to "${query}", so they are highly relevant to your analysis. Focus on the most impactful patterns and strategies.

Analyze both the textual content and the visual elements based on the image and video URLs provided. Pay special attention to:
- Visual consistency across campaigns
- Use of video vs. image content
- Quality of media (HD vs SD options available)
- Preview image strategies for videos
- Keyword integration and messaging alignment

Ensure the analysis is data-driven, uses professional marketing terminology, and provides actionable intelligence for developing competitive ad strategies. Do not repeat the same point across different sections - each insight should be unique and specific.

IMPORTANT: Return VALID JSON only with no additional text before or after the JSON object.`
    };

    const payload = {
      model: modelName,      
      messages: [
        analysisPrompt,
        {
          role: 'user',
          content: combinedContent,
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    };

    try {
      console.log('Sending request to Groq API');
      
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.GROQ_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        },
        this.TIMEOUT
      );

      if (!response.ok) {
        let errorMessage = `Groq API error (${response.status}): ${response.statusText}`;
        try {
          const errorData = await response.json();
          errorMessage += ` - ${JSON.stringify(errorData)}`;
        } catch {
          // Unable to parse error JSON
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      
      if (!data || !data.choices || !data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response structure from Groq API');
      }
      
      const analysis = data.choices[0].message.content;
      if (!analysis) {
        throw new Error('No analysis content in Groq API response');
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

  // Utility function to sanitize and limit text length
  private static sanitizeText(text: string, maxLength: number = 500): string {
    if (!text) return '';
    
    // Remove excessive whitespace and special characters
    const sanitized = text
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s.,!?;:()"']/g, '')
      .trim();
    
    // Truncate if necessary
    if (sanitized.length <= maxLength) return sanitized;
    
    const truncated = sanitized.substring(0, maxLength);
    return truncated.substring(0, truncated.lastIndexOf(' ')) + '...';
  }

  // Utility function to parse numeric values
  private static parseNumber(value: string | number | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/[^0-9-]/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}