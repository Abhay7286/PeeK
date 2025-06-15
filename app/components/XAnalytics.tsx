"use client";

import React, { useEffect, useState, memo, useCallback } from "react";
import { 
  BarChart, MessageCircle, 
  Lightbulb, TrendingUp, 
  Target,
  AlertTriangle
} from "lucide-react";
import Image from "next/image";
import { Progress } from "@/app/components/ui/progress";
import { useTwitterAnalysis } from "@/app/api/xAnalytics";

const validateArray = <T,>(data: T[] | undefined | null): T[] => {
  return Array.isArray(data) ? data : [];
};

// Helper function to check if a URL is a valid image URL
const isValidImageUrl = (url: string): boolean => {
  if (!url) return false;
  
  // Check if it's a t.co link (Twitter's URL shortener - can't be used directly)
  if (url.includes('t.co/')) return false;
  
  // Check for common image extensions
  const imageExtensions = /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?.*)?$/i;
  if (imageExtensions.test(url)) return true;
  
  // Check for known image hosting domains
  const imageHosts = [
    'pbs.twimg.com',
    'media.githubusercontent.com',
    'i.imgur.com',
    'cdn.discordapp.com',
    'images.unsplash.com',
    'via.placeholder.com'
  ];
  
  return imageHosts.some(host => url.includes(host));
};

// Helper function to extract potential image URLs from tweet content
const extractImageUrls = (content: string): string[] => {
  const urlRegex = /https?:\/\/[^\s]+/g;
  const urls = content.match(urlRegex) || [];
  return urls.filter(isValidImageUrl);
};

// Skeleton components
const CardSkeleton = () => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg animate-pulse h-full">
    <div className="flex justify-between items-center mb-4">
      <div className="h-7 bg-white/20 rounded w-1/3"></div>
      <div className="h-4 bg-white/20 rounded w-16"></div>
    </div>
    <div className="space-y-4 flex-1">
      <div className="h-4 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
      <div className="h-4 bg-white/20 rounded w-4/6"></div>
    </div>
    <div className="mt-auto pt-4 space-y-2">
      <div className="h-2 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-1/4"></div>
    </div>
  </div>
);

interface SkeletonSectionProps {
  count?: number;
  title?: string;
}

const SkeletonSection = ({ count = 3}: SkeletonSectionProps) => (
  <section className="mt-8">
    <div className="flex items-center gap-2 h-8 bg-white/20 rounded w-48 mb-6"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array(count).fill(0).map((_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  </section>
);

// Base card component
interface AnalysisCardProps {
  title: string;
  description: string | React.ReactNode;
  items?: string[];
  score?: number;
  scoreLabel?: string;
  timing?: string;
  icon?: React.ReactNode;
}

const AnalysisCard = memo(({ title, description, items, score, scoreLabel, timing, icon }: AnalysisCardProps) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-xl font-semibold flex items-center gap-2 flex-1">
        {icon}
        <span className="break-words">{title}</span>
      </h3>
      {timing && <span className="text-sm opacity-70 ml-2 flex-shrink-0">{timing}</span>}
    </div>
    
    <div className="flex-1 space-y-4">
      {typeof description === 'string' ? (
        <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: description }} />
      ) : (
        <div className="text-sm leading-relaxed">{description}</div>
      )}
      
      {items && items.length > 0 && (
        <ul className="space-y-2">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      )}
    </div>
    
    {score !== undefined && (
      <div className="mt-4 pt-4 border-t border-white/20 flex-shrink-0">
        <div className="space-y-2">
          <Progress value={score * 10} className="h-2" />
          <span className="text-sm font-medium">
            {scoreLabel}: {score}/10
          </span>
        </div>
      </div>
    )}
  </div>
));

AnalysisCard.displayName = 'AnalysisCard';

interface SentimentData {
  score: number;
  label: 'positive' | 'negative' | 'neutral';
  confidence: number;
}

interface OverviewCardProps {
  overview: string;
  sentiment: SentimentData;
}

// Overview & Sentiment Analysis Card
const OverviewCard = memo(({ overview, sentiment }: OverviewCardProps) => {
  // Determine color based on sentiment
  const getSentimentColor = () => {
    if (sentiment.label === 'positive') return 'text-green-400';
    if (sentiment.label === 'negative') return 'text-red-400';
    return 'text-blue-400';
  };

  // Convert -1 to 1 score to percentage
  const sentimentPercentage = Math.round(((sentiment.score + 1) / 2) * 100);

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-semibold flex items-center gap-2">
          <BarChart className="w-5 h-5" />
          Overview & Sentiment
        </h3>
      </div>
      
      <div className="space-y-6">
        <p className="text-sm leading-relaxed">{overview}</p>
        
        <div className="pt-4 border-t border-white/20">
          <div className="flex items-center justify-between mb-4">
            <p className={`text-lg font-medium ${getSentimentColor()}`}>
              {sentiment.label.toUpperCase()} SENTIMENT
            </p>
            <span className="text-sm opacity-70">
              Confidence: {(sentiment.confidence * 100).toFixed(1)}%
            </span>
          </div>
          
          <div className="space-y-2">
            <Progress value={sentimentPercentage} className="h-2" />
            <span className="text-sm">
              Sentiment Score: {sentiment.score.toFixed(2)} ({sentimentPercentage}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
});

OverviewCard.displayName = 'OverviewCard';

interface TriggerData {
  name: string;
  description: string;
  impact_score: number;
  frequency: number;
  examples: string[];
}

interface TriggerCardProps {
  trigger: TriggerData;
}

// Trigger Card
const TriggerCard = memo(({ trigger }: TriggerCardProps) => (
  <AnalysisCard
    icon={<AlertTriangle className="w-4 h-4 flex-shrink-0" />}
    title={trigger.name}
    description={trigger.description}
    items={[
      `<strong>Frequency:</strong> ${trigger.frequency} occurrences`,
      ...(trigger.examples && trigger.examples.length > 0 ? 
        [`<strong>Example:</strong> "${trigger.examples[0]}"`] : [])
    ]}
    score={trigger.impact_score}
    scoreLabel="Impact"
  />
));

TriggerCard.displayName = 'TriggerCard';

interface TrendData {
  name: string;
  description: string;
  popularity_score: number;
  growth_rate: number;
  examples: string[];
}

interface TrendCardProps {
  trend: TrendData;
}

// Current Trend Card
const TrendCard = memo(({ trend }: TrendCardProps) => (
  <AnalysisCard
    icon={<TrendingUp className="w-4 h-4 flex-shrink-0" />}
    title={trend.name}
    description={trend.description}
    items={[
      `<strong>Growth Rate:</strong> ${trend.growth_rate}%`,
      ...(trend.examples && trend.examples.length > 0 ? 
        [`<strong>Example:</strong> "${trend.examples[0]}"`] : [])
    ]}
    score={trend.popularity_score}
    scoreLabel="Popularity"
  />
));

TrendCard.displayName = 'TrendCard';

interface UpcomingTrendData {
  name: string;
  description: string;
  prediction_confidence: number;
  potential_impact: number;
  early_indicators: string[];
}

interface UpcomingTrendCardProps {
  trend: UpcomingTrendData;
}

// Upcoming Trend Card
const UpcomingTrendCard = memo(({ trend }: UpcomingTrendCardProps) => (
  <AnalysisCard
    icon={<Lightbulb className="w-4 h-4 flex-shrink-0" />}
    title={trend.name}
    description={trend.description}
    items={[
      "<strong>Early Indicators:</strong>",
      ...(trend.early_indicators && trend.early_indicators.length > 0 ? 
        trend.early_indicators.map(indicator => `• ${indicator}`) : []),
      `<strong>Potential Impact:</strong> ${trend.potential_impact}/10`
    ]}
    score={trend.prediction_confidence}
    scoreLabel="Confidence"
  />
));

UpcomingTrendCard.displayName = 'UpcomingTrendCard';

interface TweetData {
  content: string;
  engagement: number;
  created_at: string;
  author: string;
  hashtags: string[];
  media_url?: string;
}

interface TweetCardProps {
  tweet: TweetData;
}

// Image component with error handling
const TweetImage = memo(({ src, alt }: { src: string; alt: string }) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  if (imageError || !isValidImageUrl(src)) {
    return null; // Don't render anything if image fails to load or URL is invalid
  }

  return (
    <div className="mb-3 relative h-32 flex-shrink-0">
      {imageLoading && (
        <div className="absolute inset-0 bg-white/10 animate-pulse rounded-lg flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white/60 rounded-full animate-spin"></div>
        </div>
      )}
      <Image 
        src={src} 
        alt={alt} 
        fill
        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        className={`rounded-lg object-cover transition-opacity duration-300 ${
          imageLoading ? 'opacity-0' : 'opacity-100'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
      />
    </div>
  );
});

TweetImage.displayName = 'TweetImage';

// Tweet Card with improved image handling
const TweetCard = memo(({ tweet }: TweetCardProps) => {
  const date = new Date(tweet.created_at);
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });

  // Get the best available image URL
  const getImageUrl = (): string | null => {
    // First priority: explicit media_url if it's valid
    if (tweet.media_url && isValidImageUrl(tweet.media_url)) {
      return tweet.media_url;
    }

    // Second priority: extract valid image URLs from content
    const extractedUrls = extractImageUrls(tweet.content);
    if (extractedUrls.length > 0) {
      return extractedUrls[0]; // Use the first valid image URL found
    }

    return null; // No valid image URL found
  };

  const imageUrl = getImageUrl();

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col">
      <div className="flex items-center gap-2 mb-3">
        <span className="font-medium text-sm">@{tweet.author}</span>
      </div>
      
      <div className="text-sm leading-relaxed mb-3 flex-1">{tweet.content}</div>
      
      {imageUrl && (
        <TweetImage src={imageUrl} alt="Tweet media" />
      )}
      
      {tweet.hashtags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {tweet.hashtags.slice(0, 3).map((tag, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-blue-500/40 rounded-full">
              {tag}
            </span>
          ))}
          {tweet.hashtags.length > 3 && (
            <span className="text-xs px-2 py-1 bg-gray-500/40 rounded-full">
              +{tweet.hashtags.length - 3}
            </span>
          )}
        </div>
      )}
      
      <div className="flex justify-between text-xs pt-2 border-t border-white/20 flex-shrink-0">
        <span>Engagement: {tweet.engagement.toLocaleString()}</span>
        <span>{formattedDate}</span>
      </div>
    </div>
  );
});

TweetCard.displayName = 'TweetCard';

interface HashtagData {
  tag: string;
  count: number;
  relevance: number;
}

interface HashtagCardProps {
  hashtags: HashtagData[];
}

// Hashtag Card
const HashtagCard = memo(({ hashtags }: HashtagCardProps) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col">
    <h3 className="text-xl font-semibold flex items-center gap-2 mb-4">
      <Target className="w-5 h-5" />
      Top Hashtags
    </h3>
    <div className="space-y-3 flex-1">
      {hashtags.slice(0, 8).map((hashtag, index) => (
        <div key={index} className="flex items-center justify-between">
          <span className="text-blue-400 text-sm font-medium truncate flex-1 mr-2">{hashtag.tag}</span>
          <div className="flex items-center gap-3 flex-shrink-0">
            <span className="text-xs text-white/70 min-w-[60px] text-right">
              {hashtag.count.toLocaleString()}
            </span>
            <div className="w-16">
              <Progress value={hashtag.relevance * 10} className="h-1.5" />
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
));

HashtagCard.displayName = 'HashtagCard';

interface DataSummaryCardProps {
  tweets: TweetData[];
}

// Data Summary Card
const DataSummaryCard = memo(({ tweets }: DataSummaryCardProps) => {
  const avgEngagement = tweets.length > 0 
    ? Math.round(tweets.reduce((sum, tweet) => sum + tweet.engagement, 0) / tweets.length)
    : 0;
  
  const totalHashtags = tweets.reduce((sum, tweet) => sum + tweet.hashtags.length, 0);
  const uniqueAuthors = new Set(tweets.map(tweet => tweet.author)).size;

  return (
    <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col">
      <h3 className="text-xl font-semibold mb-4">Data Summary</h3>
      <div className="space-y-3 flex-1">
        <div className="flex justify-between items-center">
          <span className="text-sm">Total tweets analyzed:</span>
          <span className="font-medium text-sm">{tweets.length.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Average engagement:</span>
          <span className="font-medium text-sm">{avgEngagement.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Total hashtags:</span>
          <span className="font-medium text-sm">{totalHashtags.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm">Unique authors:</span>
          <span className="font-medium text-sm">{uniqueAuthors.toLocaleString()}</span>
        </div>
        <div className="flex justify-between items-center pt-2 border-t border-white/20">
          <span className="text-sm">Analysis timestamp:</span>
          <span className="font-medium text-xs">
            {new Date().toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
});

DataSummaryCard.displayName = 'DataSummaryCard';

interface InsightsData {
  comparisons: string[];
  actionableInsights: string[];
  demographicPatterns: string[];
}

interface InsightsCardProps {
  insights: InsightsData;
}

// Insights Card
const InsightsCard = memo(({ insights }: InsightsCardProps) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg">
    <h3 className="text-xl font-semibold mb-6">Trend Insights</h3>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div className="space-y-3">
        <h4 className="font-medium text-lg">Industry Comparisons</h4>
        <ul className="space-y-2">
          {insights.comparisons.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              • {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <h4 className="font-medium text-lg">Actionable Insights</h4>
        <ul className="space-y-2">
          {insights.actionableInsights.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              • {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="space-y-3">
        <h4 className="font-medium text-lg">Demographic Patterns</h4>
        <ul className="space-y-2">
          {insights.demographicPatterns.map((item, idx) => (
            <li key={idx} className="text-sm leading-relaxed">
              • {item}
            </li>
          ))}
        </ul>
      </div>
    </div>
  </div>
));

InsightsCard.displayName = 'InsightsCard';

interface TwitterAnalysisDashboardProps {
  query: string;
  options?: {
    industry?: string;
    timeframe?: string;
  };
}

// Main Twitter Analysis Dashboard Component
const TwitterAnalysisDashboard = memo(({ 
  query,
  options
}: TwitterAnalysisDashboardProps) => {
  const { data, isLoading, error, analyze } = useTwitterAnalysis();
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  // Memoize the analyze function to prevent unnecessary re-calls
  const handleAnalyze = useCallback(async () => {
    if (!query.trim() || hasAnalyzed || isLoading) return;
    
    try {
      await analyze(query, options);
      setHasAnalyzed(true);
    } catch (err) {
      console.error('Analysis failed:', err);
    }
  }, [query, options, analyze, hasAnalyzed, isLoading]);

  useEffect(() => {
    handleAnalyze();
  }, [handleAnalyze]);

  const renderSkeleton = () => (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <div className="h-10 bg-white/20 rounded w-1/2 mb-2 animate-pulse"></div>
        <div className="h-6 bg-white/20 rounded w-1/3 animate-pulse"></div>
      </header>

      <div className="space-y-8">
        {/* Overview & Sentiment Skeleton */}
        <section>
          <div className="grid grid-cols-1 gap-6">
            <CardSkeleton />
          </div>
        </section>

        {/* Multiple sections with 3-column layout */}
        <SkeletonSection count={3} title="Key Engagement Triggers" />
        <SkeletonSection count={3} title="Current Trends" />
        <SkeletonSection count={3} title="Upcoming Trends" />

        {/* Hashtags & Data Summary Skeleton */}
        <section className="mt-8">
          <div className="h-8 bg-white/20 rounded w-48 mb-6 animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <CardSkeleton />
            <CardSkeleton />
            <div className="hidden lg:block">
              <CardSkeleton />
            </div>
          </div>
        </section>

        {/* Top Tweets Skeleton */}
        <SkeletonSection count={3} title="Top Tweets" />
      </div>
    </div>
  );

  if (isLoading) {
    return renderSkeleton();
  }

  if (error || !data?.analysis) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="text-center p-8 bg-white/10 backdrop-blur-sm rounded-lg border border-red-500/20">
          <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-2 text-red-400">Analysis Error</h3>
          <p className="text-sm text-white/70 mb-4">
            {error || "Failed to fetch Twitter analysis data"}
          </p>
          <button 
            onClick={() => {
              setHasAnalyzed(false);
              handleAnalyze();
            }}
            className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const { analysis, tweets } = data;
  const topTweets = tweets.slice(0, 6); // Get top 6 tweets for better 3-column layout

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Twitter Analysis Dashboard</h1>
        <p className="text-lg opacity-70">
          Analysis for: <span className="font-medium">{query}</span>
          {options?.industry && ` in ${options.industry} industry`}
          {options?.timeframe && ` over ${options.timeframe}`}
        </p>
      </header>

      <div className="space-y-12">
        {/* Overview & Sentiment */}
        <section>
          <OverviewCard 
            overview={analysis.overview} 
            sentiment={analysis.sentimentAnalysis} 
          />
        </section>

        {/* Triggers */}
        <section>
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <AlertTriangle className="w-6 h-6" />
            Key Engagement Triggers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {validateArray(analysis.triggers).map((trigger, index) => (
              <TriggerCard key={index} trigger={trigger} />
            ))}
          </div>
        </section>

        {/* Current Trends */}
        <section>
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <TrendingUp className="w-6 h-6" />
            Current Trends
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {validateArray(analysis.currentTrends).map((trend, index) => (
              <TrendCard key={index} trend={trend} />
            ))}
          </div>
        </section>

        {/* Upcoming Trends */}
        <section>
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <Lightbulb className="w-6 h-6" />
            Upcoming Trends
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {validateArray(analysis.upcomingTrends).map((trend, index) => (
              <UpcomingTrendCard key={index} trend={trend} />
            ))}
          </div>
        </section>

        {/* Insights */}
        <section>
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <MessageCircle className="w-6 h-6" />
            Trend Insights
          </h2>
          <InsightsCard insights={analysis.trendInsights} />
        </section>

        {/* Hashtags & Data Summary */}
        <section>
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <Target className="w-6 h-6" />
            Analysis Data
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <HashtagCard hashtags={analysis.relevantHashtags} />
            <DataSummaryCard tweets={tweets} />
            {/* Third column placeholder for future content or spacing */}
            <div className="hidden lg:block"></div>
          </div>
        </section>

        {/* Top Tweets */}
        <section>
          <h2 className="flex items-center gap-2 text-2xl font-bold mb-6">
            <MessageCircle className="w-6 h-6" />
            Top Tweets
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {topTweets.map((tweet, index) => (
              <TweetCard key={index} tweet={tweet} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
});

TwitterAnalysisDashboard.displayName = 'TwitterAnalysisDashboard';

export default TwitterAnalysisDashboard;