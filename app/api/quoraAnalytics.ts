import { supabase } from '@/lib/supabase'; 


interface QuoraAnswer {
  content: string;
  author: {
    name: string;
    surname?: string;
    profile_url: string;
    credentials: string;
    followers?: number;
    profileImage?: string;
  };
  post_url: string;
  upvotes: number;
  comments?: number;
  timestamp: string;
}

interface QuoraAPIResponse {
  data: Array<QuoraAnswerRaw>;
  pageInfo?: {
    hasNextPage?: boolean;
    endCursor?: string;
  };
}

// Define interface for raw Quora answer data from API
interface QuoraAnswerRaw {
  content?: string;
  author?: {
    name?: string;
    surname?: string;
    url?: string;
    credentials?: string | null;
    followers?: string | number;
    profileImage?: string;
  };
  url?: string;
  upvotes?: string | number;
  comments?: string | number;
}

// Enhanced interface to include structured marketing analysis
interface AnalysisResult {
  success: boolean;
  data?: {
    analysis: AnalysisData;
    sources: QuoraAnswer[];
    timestamp: string;
    filteredCount: number;
    totalCount: number;
  };
  error?: string;
}

// Define the structure for analysis data
interface AnalysisData {
  overview: string;
  painPoints: Array<{
    title: string;
    description: string;
    frequency: number;
    impact: number;
    possibleSolutions: string[];
  }>;
  userExperiences: Array<{
    scenario: string;
    impact: string;
    frequencyPattern: string;
    sentiment: 'positive' | 'negative' | 'neutral';
  }>;
  emotionalTriggers: Array<{
    trigger: string;
    context: string;
    intensity: number;
    responsePattern: string;
  }>;
  marketImplications: string;
}

// Function to get QuoraAnalysis model from Supabase
export async function getQuoraAnalysisModel() { 
  const { data } = await supabase.from('api_models').select('model_name').eq('api_name', 'QuoraAnalysis').single() 
  return data?.model_name
}

export class QuoraAnalysisService {
  private static readonly TIMEOUT = 30000;
  private static readonly RAPIDAPI_KEY = process.env.NEXT_PUBLIC_QUORA_RAPID_API_KEY;
  private static readonly GROQ_API_KEY = process.env.NEXT_PUBLIC_QUORA_GROQ_API_KEY;

  // Existing fetchWithTimeout method remains the same
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

  // Enhanced analysis method with filtering
  public static async analyzeQuoraData(query: string): Promise<AnalysisResult> {
    try {
      if (!query.trim()) {
        return { success: false, error: 'Query cannot be empty' };
      }
      
      if (!this.RAPIDAPI_KEY || !this.GROQ_API_KEY) {
        return { success: false, error: 'API keys not configured' };
      }

      // Step 1: Fetch data from Quora API
      const allAnswers = await this.searchQuoraAnswers(query);
      const totalCount = allAnswers.length;

      if (totalCount === 0) {
        return { success: false, error: 'No relevant Quora answers found' };
      }

      // Step 2: Filter answers based on query relevance
      const filteredAnswers = this.filterRelevantAnswers(allAnswers, query);
      const filteredCount = filteredAnswers.length;

      if (filteredCount === 0) {
        return { 
          success: false, 
          error: `Found ${totalCount} answers but none contained relevant keywords from your query: "${query}"` 
        };
      }

      // Step 3: Prepare content for analysis
      const relevantContent = filteredAnswers
        .map((answer) => answer.content.trim())
        .filter(Boolean)
        .join('\n\n');

      if (!relevantContent) {
        return { success: false, error: 'No valid content to analyze after filtering' };
      }

      // Step 4: Generate analysis using Groq
      const analysis = await this.generateAnalysis(query, relevantContent);

      return {
        success: true,
        data: {
          analysis: JSON.parse(analysis) as AnalysisData,
          sources: filteredAnswers,
          timestamp: new Date().toISOString(),
          filteredCount,
          totalCount,
        },
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Analysis error:', error);
      return { success: false, error: errorMessage };
    }
  }

  // New method: Filter answers based on query relevance
  private static filterRelevantAnswers(answers: QuoraAnswer[], query: string): QuoraAnswer[] {
    // Extract meaningful words from query (remove common stop words)
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 
      'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 
      'will', 'with', 'how', 'what', 'when', 'where', 'why', 'who', 'which'
    ]);

    const queryWords = query
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ') // Remove punctuation
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word))
      .map(word => word.trim());

    if (queryWords.length === 0) {
      // If no meaningful words found, return all answers
      return answers;
    }

    return answers.filter(answer => {
      const contentLower = answer.content.toLowerCase();
      
      // Check if content contains at least one query word
      return queryWords.some(queryWord => {
        // Use word boundaries to match whole words
        const regex = new RegExp(`\\b${queryWord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(contentLower);
      });
    });
  }

  // Existing searchQuoraAnswers method remains the same
  private static async searchQuoraAnswers(query: string): Promise<QuoraAnswer[]> {
    const url = new URL('https://quora-scraper1.p.rapidapi.com/search_answers');
    url.searchParams.append('query', query);
    url.searchParams.append('language', 'en');
    url.searchParams.append('time', 'all_times');

    try {
      const response = await this.fetchWithTimeout(
        url.toString(),
        {
          method: 'GET',
          headers: {
            'x-rapidapi-key': this.RAPIDAPI_KEY || '',
            'x-rapidapi-host': 'quora-scraper.p.rapidapi.com',
          },
        },
        this.TIMEOUT
      );

      if (!response.ok) {
        throw new Error(`Quora API error: ${response.status}`);
      }

      const data: QuoraAPIResponse = await response.json();
      
      if (!data?.data || !Array.isArray(data.data)) {
        throw new Error('Invalid Quora API response format');
      }

      return data.data.map(this.parseQuoraAnswer);

    } catch (error) {
      console.error('Quora search error:', error);
      throw new Error(
        `Failed to fetch Quora answers: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    }
  }

  // Existing parseQuoraAnswer method remains the same
  private static parseQuoraAnswer(item: QuoraAnswerRaw): QuoraAnswer {
    return {
      content: QuoraAnalysisService.sanitizeText(item.content || ''),
      author: {
        name: item.author?.name || 'Anonymous',
        surname: item.author?.surname,
        profile_url: item.author?.url || '',
        credentials: String(item.author?.credentials || ''),
        followers: QuoraAnalysisService.parseNumber(item.author?.followers),
        profileImage: item.author?.profileImage,
      },
      post_url: item.url || '',
      upvotes: QuoraAnalysisService.parseNumber(item.upvotes),
      comments: QuoraAnalysisService.parseNumber(item.comments),
      timestamp: new Date().toISOString(),
    };
  }

  // Enhanced generateAnalysis method with dynamic model fetching
  private static async generateAnalysis(query: string, content: string): Promise<string> {
    const url = 'https://api.groq.com/openai/v1/chat/completions';
    
    // Fetch model name from Supabase
    let modelName: string;
    try {
      modelName = await getQuoraAnalysisModel();
      if (!modelName) {
        throw new Error('No model name found for QuoraAnalysis');
      }
    } catch (error) {
      console.error('Failed to fetch model name from Supabase:', error);
      // Fallback to default model if Supabase fetch fails
      modelName = 'meta-llama/llama-4-maverick-17b-128e-instruct';
    }
    
    const analysisPrompt = {
      role: 'system',
      content: `You are an expert market research analyst specializing in consumer behavior and sentiment analysis. Analyze the provided Quora discussions about "${query}" and generate a comprehensive analysis in the following JSON format:

{
  "overview": "Executive summary of the analysis using sophisticated marketing terminology",
  "painPoints": [
    {
      "title": "Clear, impactful title of the pain point",
      "description": "Detailed analysis of the issue using marketing psychology terms",
      "frequency": "Numerical value 1-10 indicating how often this appears",
      "impact": "Numerical value 1-10 indicating severity",
      "possibleSolutions": ["Array of 2-3 potential solutions"]
    }
  ] (exactly 6 items),
  "userExperiences": [
    {
      "scenario": "Detailed description of the user experience",
      "impact": "Analysis of how this experience affects user behavior",
      "frequencyPattern": "Pattern of occurrence and context",
      "sentiment": "positive/negative/neutral"
    }
  ] (exactly 3 items),
  "emotionalTriggers": [
    {
      "trigger": "Name of the emotional trigger",
      "context": "Detailed context where this trigger appears",
      "intensity": "Numerical value 1-10",
      "responsePattern": "Typical user response to this trigger"
    }
  ] (exactly 3 items),
  "marketImplications": "Strategic insights for market positioning and product development"
}

Ensure the analysis is data-driven, uses professional marketing terminology, and provides actionable insights. Focus only on the filtered, relevant content provided.`
    };

    const payload = {
      model: modelName,      
      messages: [
        analysisPrompt,
        {
          role: 'user',
          content: content,
        },
      ],
      temperature: 0.5,
      max_tokens: 5000,
      response_format: { type: 'json_object' },
    };

    try {
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

  // Utility methods remain the same
  private static parseNumber(value: string | number | undefined): number {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseInt(value.replace(/[^0-9-]/g, ''), 10);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }

  private static sanitizeText(text: string, maxLength: number = 1000): string {
    if (!text) return '';
    
    const sanitized = text
      .replace(/\s+/g, ' ')
      .trim();
    
    if (sanitized.length <= maxLength) return sanitized;
    
    const truncated = sanitized.substring(0, maxLength);
    return truncated.substring(0, truncated.lastIndexOf(' ')) + '...';
  }
}
