import { SpecializedQueries } from "@/types";
import { supabase } from "@/lib/supabase"; // Adjust import path as needed

const groqApiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;

export async function getSmartQueryModel() {
  const { data } = await supabase
    .from('api_models')
    .select('model_name')
    .eq('api_name', 'SmartQuery')
    .single();
  return data?.model_name;
}

export const generateSpecializedQueries = async (userQuery: string): Promise<SpecializedQueries> => {
  try {
    const modelName = await getSmartQueryModel();
    
    const prompt = `
You are a query optimization expert. Given the user's search query: "${userQuery}", 
generate specialized, optimized search queries for different platforms and search engines. 
Don't add Random Words, Only add same or relatable words or only just structure the query properly.
Return ONLY a JSON object with the following structure, with NO additional explanation:

{
  "ImageResult": "optimized query for Google Images",
  "GoogleAnalytics": "optimized query for Google Search",
  "PlayStoreAnalytics": "relevant app names only",
  "RedditAnalytics": "optimized query for direct search on Reddit",
  "YouTubeVideos": "optimized query for YouTube API",
  "QuoraAnalysis": "optimized query for Quora API",
  "XAnalytics": "optimized query for Twitter/X API",
  "FacebookAdsAnalysis": "optimized keyword for Facebook Ads Library",
  "StrategyAnalysis": "optimized query for Google Search"
}

Guidelines:
- For ImageResult: Add terms like "aesthetic","image", "visual", "picture" if appropriate
- For GoogleAnalytics: Create a comprehensive search query add words like "study" or "research" or "benifits" if appropriate
- For PlayStoreAnalytics: Only include app name or app categories, no other terms
- For RedditAnalytics: Format for Reddit-specific search, dont use site:, dont mention subreddits add words like "effects/issues" or "experience" or "problems" if appropriate
- For YouTubeVideos: Format for video search, include terms like "study", "research" if appropriate
- For QuoraAnalysis: Format as questions when possible but use words like "issues" or "problems" or "experiences"
- For XAnalytics: Include relevant hashtags with # symbol if appropriate, trends
- For FacebookAdsAnalysis: Focus on advertiser name or product type or product name or Industry
- For StrategyAnalysis: Create a comprehensive search query for strategic analysis

Remember to return ONLY the JSON object with no additional text.
`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${groqApiKey}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;
    
    try {
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/) || 
                     content.match(/```\s*([\s\S]*?)\s*```/) ||
                     [null, content];
      
      const jsonString = jsonMatch[1] || content;
      const parsed = JSON.parse(jsonString.trim());
      return parsed;
    } catch (parseError) {
      console.error("Failed to parse Groq response:", parseError);
      console.log("Raw response:", content);
      return {};
    }
  } catch (error) {
    console.error("Error generating specialized queries:", error);
    return {};
  }
};