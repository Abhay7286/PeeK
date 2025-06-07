"use client";

import React, { useEffect, useState, Suspense, lazy, memo } from "react";
import { fetchMarketingInsights } from "@/app/api/redditAnalysis";
import { Activity, Brain, Target, TrendingUp, ExternalLink } from "lucide-react";
import "@/styles/reddit-analysis.css";

// Define interfaces for the missing types
interface PainPoint {
  issue: string;
  impact_score: number;
  frequency: number;
  verbatim_quotes: string[];
  suggested_solutions: string[];
  sources?: string[];
}

interface NicheCommunity {
  segment: string;
  engagement_level: number;
  influence_score: number;
  demographic_indicators: string[];
  discussion_themes: string[];
  sources?: string[];
}

interface EmotionalTrigger {
  trigger: string;
  intensity: number;
  context: string;
  activation_phrases: string[];
  sources?: string[];
}

interface SentimentAnalysis {
  overall_sentiment: number;
  emotional_triggers: EmotionalTrigger[];
  brand_perception: {
    positive_attributes: string[];
    negative_attributes: string[];
    neutral_observations: string[];
  };
}

interface EngagementMetrics {
  upvote_ratio: number;
  comment_count: number;
  awards: number;
}

interface RedditResult {
  title: string;
  subreddit: string;
  snippet: string;
  link?: string;
  source_url?: string;
  engagement_metrics?: EngagementMetrics;
}

interface MarketingInsight {
  overview: string;
  recurring_pain_points: PainPoint[];
  niche_communities: NicheCommunity[];
  sentiment_analysis: SentimentAnalysis;
  sources: string[];
}

interface RedditAnalyticsProps {
  query: string;
}

// Helper function to format source links
const formatSourceLink = (url: string): { display: string; isReddit: boolean } => {
  try {
    const urlObj = new URL(url);
    const isReddit = url.includes('reddit.com');
    
    if (isReddit) {
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
      return {
        display: `${urlObj.hostname}${urlObj.pathname.length > 1 ? urlObj.pathname.slice(0, 30) + '...' : ''}`,
        isReddit: false
      };
    }
  } catch {
    return { display: url.slice(0, 50) + '...', isReddit: url.includes('reddit.com') };
  }
};

// Sources component
const SourcesList = ({ sources }: { sources?: string[] }) => {
  if (!sources || sources.length === 0) return null;
  
  return (
    <div className="mt-4 pt-4 border-t border-gray-700">
      <h5 className="text-xs font-medium text-gray-400 mb-2">Sources</h5>
      <div className="space-y-1">
        {sources.slice(0, 3).map((source, index) => {
          const formatted = formatSourceLink(source);
          return (
            <a
              key={index}
              href={source}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              <span className="truncate">{formatted.display}</span>
            </a>
          );
        })}
        {sources.length > 3 && (
          <p className="text-xs text-gray-500">+{sources.length - 3} more sources</p>
        )}
      </div>
    </div>
  );
};

// Skeleton components
const SkeletonCard = () => (
  <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-6 bg-white/10 rounded w-3/4"></div>
      <div className="h-4 bg-white/10 rounded w-1/5"></div>
    </div>
    <div className="space-y-4 flex-grow">
      <div className="h-4 bg-white/10 rounded w-full"></div>
      <div className="h-4 bg-white/10 rounded w-5/6"></div>
      <div className="h-4 bg-white/10 rounded w-4/6"></div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-white/10 rounded w-full"></div>
        <div className="h-3 bg-white/10 rounded w-full"></div>
        <div className="h-3 bg-white/10 rounded w-5/6"></div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-2 bg-white/10 rounded w-full"></div>
      <div className="h-2 bg-white/10 rounded w-1/3"></div>
    </div>
  </div>
);
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonOverview = () => (
  <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg animate-pulse">
    <div className="flex items-center gap-2 mb-6">
      <div className="h-6 w-6 bg-white/10 rounded-full"></div>
      <div className="h-6 bg-white/10 rounded w-1/3"></div>
    </div>
    <div className="space-y-3">
      <div className="h-4 bg-white/10 rounded w-full"></div>
      <div className="h-4 bg-white/10 rounded w-5/6"></div>
      <div className="h-4 bg-white/10 rounded w-full"></div>
      <div className="h-4 bg-white/10 rounded w-4/5"></div>
      <div className="h-4 bg-white/10 rounded w-5/6"></div>
    </div>
  </div>
);
SkeletonOverview.displayName = 'SkeletonOverview';

const SkeletonSection = ({ count = 3 }) => (
  <section className="mt-8">
    <div className="flex items-center gap-2 mb-6">
      <div className="h-6 w-6 bg-white/10 rounded-full"></div>
      <div className="h-6 bg-white/10 rounded w-1/4"></div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  </section>
);
SkeletonSection.displayName = 'SkeletonSection';

// Loading state component
const LoadingState = () => (
  <div className="space-y-8">
    <SkeletonOverview />
    <SkeletonSection count={3} />
    <SkeletonSection count={3} />
    <SkeletonSection count={3} />
  </div>
);
LoadingState.displayName = 'LoadingState';

// Define the Analytics Content component separately first
const AnalyticsContentComponent = ({
  insights,
  results
}: {
  insights: MarketingInsight;
  results: RedditResult[];
}) => {
  const renderPainPointsSection = () => (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold">
        <Target className="h-6 w-6 text-[#FF4500]" />
        <span>Recurring Pain Points</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.recurring_pain_points.map((point: PainPoint, index: number) => (
          <div key={index} className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col hover:bg-white/10 transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">{point.issue}</h3>
              <p className="text-sm text-gray-400">Impact Score: {point.impact_score}/100</p>
            </div>
            <div className="space-y-4 flex-grow">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Frequency</span>
                  <span>{point.frequency}%</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#FF4500] rounded-full"
                    style={{ width: `${point.frequency}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Key Quotes</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-400">
                  {point.verbatim_quotes.map((quote: string, i: number) => (
                    <li key={i}>{quote}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Solutions</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-400">
                  {point.suggested_solutions.map((solution: string, i: number) => (
                    <li key={i}>{solution}</li>
                  ))}
                </ul>
              </div>
            </div>
            <SourcesList sources={point.sources} />
          </div>
        ))}
      </div>
    </section>
  );

  const renderNicheCommunitiesSection = () => (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-[#FF4500]">
        <Brain className="h-6 w-6 text-[#FF4500]" />
        <span>Niche Communities</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.niche_communities.map((community: NicheCommunity, index: number) => (
          <div key={index} className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col hover:bg-white/10 transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">{community.segment}</h3>
              <p className="text-sm text-gray-400">Engagement Level: {community.engagement_level}/100</p>
            </div>
            <div className="space-y-4 flex-grow">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Influence</span>
                  <span>{community.influence_score}%</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#FF4500] rounded-full"
                    style={{ width: `${community.influence_score}%` }}
                  ></div>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Demographics</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-400">
                  {community.demographic_indicators.map((indicator: string, i: number) => (
                    <li key={i}>{indicator}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Discussion Themes</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-400">
                  {community.discussion_themes.map((theme: string, i: number) => (
                    <li key={i}>{theme}</li>
                  ))}
                </ul>
              </div>
            </div>
            <SourcesList sources={community.sources} />
          </div>
        ))}
      </div>
    </section>
  );

  const renderEmotionalTriggersSection = () => (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-[#FF4500]">
        <Activity className="h-6 w-6 text-[#FF4500]" />
        <span>Emotional Triggers</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {insights.sentiment_analysis.emotional_triggers.map((trigger: EmotionalTrigger, index: number) => (
          <div key={index} className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col hover:bg-white/10 transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-xl font-semibold">{trigger.trigger}</h3>
              <p className="text-sm text-gray-400">Intensity: {trigger.intensity}/100</p>
            </div>
            <div className="space-y-4 flex-grow">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Emotional Impact</span>
                  <span>{trigger.intensity}%</span>
                </div>
                <div className="relative w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-[#FF4500] rounded-full"
                    style={{ width: `${trigger.intensity}%` }}
                  ></div>
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Context</h4>
                <p className="text-sm text-gray-400">{trigger.context}</p>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-medium">Activation Phrases</h4>
                <ul className="list-disc pl-4 space-y-1 text-sm text-gray-400">
                  {trigger.activation_phrases.map((phrase: string, i: number) => (
                    <li key={i}>&ldquo;{phrase}&rdquo;</li>
                  ))}
                </ul>
              </div>
            </div>
            <SourcesList sources={trigger.sources} />
          </div>
        ))}
      </div>
    </section>
  );

  const renderSourceDataSection = () => (
    <section className="mt-12">
      <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-[#FF4500]">
        <TrendingUp className="h-6 w-6 text-[#FF4500]" />
        <span>Reddit Discussions</span>
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {results.map((result: RedditResult, index: number) => (
          <div key={index} className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col hover:bg-white/10 transition-all duration-300">
            <div className="mb-4">
              <h3 className="text-lg font-semibold line-clamp-2">{result.title}</h3>
              <div className="flex items-center justify-between mt-1">
                <span className="text-sm text-[#FF4500]">r/{result.subreddit}</span>
                {result.engagement_metrics && (
                  <span className="text-xs flex items-center gap-1 text-gray-400">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m19 9-7 7-7-7"/>
                    </svg>
                    {(result.engagement_metrics.upvote_ratio * 100).toFixed()}%
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-4 flex-grow">
              <p className="text-sm text-gray-400 line-clamp-3">{result.snippet}</p>
              
              {result.engagement_metrics && (
                <div className="flex gap-4 mt-2 text-sm text-gray-400">
                  <div>
                    <span className="font-medium text-gray-300">{result.engagement_metrics.comment_count}</span> comments
                  </div>
                  <div>
                    <span className="font-medium text-gray-300">{result.engagement_metrics.awards}</span> awards
                  </div>
                </div>
              )}
            </div>
            
            {/* Reddit post sources */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="space-y-2">
                {result.link && (
                  <a
                    href={result.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Reddit Discussion</span>
                  </a>
                )}
                {result.source_url && result.source_url !== result.link && !result.source_url.includes('reddit.com') && (
                  <a
                    href={result.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-green-400 hover:text-green-300 transition-colors"
                  >
                    <ExternalLink className="h-3 w-3" />
                    <span>Original Source</span>
                  </a>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );

  const renderOverallSourcesSection = () => {
    if (!insights.sources || insights.sources.length === 0) return null;
    
    return (
      <section className="mt-12">
        <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-[#FF4500]">
          <ExternalLink className="h-6 w-6 text-[#FF4500]" />
          <span>All Sources</span>
        </h2>
        <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {insights.sources.map((source, index) => {
              const formatted = formatSourceLink(source);
              return (
                <a
                  key={index}
                  href={source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-3 rounded-lg border transition-all duration-200 hover:scale-105 ${
                    formatted.isReddit 
                      ? 'border-orange-500/30 bg-orange-500/10 hover:bg-orange-500/20' 
                      : 'border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20'
                  }`}
                >
                  <ExternalLink className="h-4 w-4 flex-shrink-0" />
                  <span className="text-sm truncate">{formatted.display}</span>
                </a>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg">
        <h2 className="flex items-center gap-2 mb-6 text-2xl font-bold text-[#FF4500]">
          <Activity className="h-6 w-6 text-[#FF4500]" />
          <span>Market Analysis Overview</span>
        </h2>
        <div 
          className="prose prose-invert max-w-none"
          dangerouslySetInnerHTML={{ __html: insights.overview }} 
        />
      </div>
      {renderPainPointsSection()}
      {renderNicheCommunitiesSection()}
      {renderEmotionalTriggersSection()}
      {renderSourceDataSection()}
      {renderOverallSourcesSection()}
    </div>
  );
};
AnalyticsContentComponent.displayName = 'AnalyticsContent';

// Then memoize it
const MemoizedAnalyticsContent = memo(AnalyticsContentComponent);

// Lazy loaded content wrapper
const AnalyticsContent = lazy(() => Promise.resolve({
  default: MemoizedAnalyticsContent
}));

const RedditAnalytics: React.FC<RedditAnalyticsProps> = ({ query }) => {
  const [data, setData] = useState<{ results: RedditResult[]; insights: MarketingInsight } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      if (!query.trim()) {
        setError("Please provide a search query");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const response = await fetchMarketingInsights(query);
        if (response) {
          setData(response);
          setError(null);
        } else {
          setError("No insights found");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [query]);

  return (
    <div className="container mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-4xl font-bold mb-2 flex items-center gap-2 text-[#FF4500]">
          <span>Reddit Marketing <span className="text-[#FF4500]">Insights</span></span>
        </h1>
        <p className="text-xl text-gray-400">Analysis for: <span className="text-white font-medium">{query}</span></p>
      </header>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <div className="bg-white/5 backdrop-blur-lg rounded-lg p-6 shadow-lg">
          <div className="flex items-center gap-2 text-[#FF4500] mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <h2 className="text-xl font-semibold">Error</h2>
          </div>
          <p className="text-gray-400">{error}</p>
        </div>
      ) : data ? (
        <Suspense fallback={<LoadingState />}>
          <AnalyticsContent insights={data.insights} results={data.results} />
        </Suspense>
      ) : null}
    </div>
  );
};

RedditAnalytics.displayName = 'RedditAnalytics';

export default memo(RedditAnalytics);