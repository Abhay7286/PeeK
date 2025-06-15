"use client";

import React, { useEffect, useState, memo } from "react";
import { 
  TrendingUp, Calendar,
  Lightbulb, Eye, 
  KeyRound, Search
} from "lucide-react";
import { Progress } from "@/app/components/ui/progress";
import { useMarketResearch } from "@/app/api/googleAnalyticsApi";
import "@/styles/GoogleAnalytics.css"

// Types
interface MarketResearchProps {
  query: string;
}

interface CardProps {
  title: string;
  description: string;
  items?: string[];
  score?: number;
  scoreLabel?: string;
  timing?: string;
}

interface SectionProps {
  icon: React.ReactNode;
  title: string;
  items: unknown[];
  renderItem: (item: unknown, index: number) => React.ReactNode;
  emptyMessage: string;
  className?: string;
  isLoading?: boolean;
  skeletonCount?: number;
}

interface Trend {
  title: string;
  description: string;
  audience: string[];
  platforms: string[];
  contentIdeas: string[];
  bestPractices: string[];
  impact: number;
}

interface Insight {
  title: string;
  keyFindings: string[];
  implications: string[];
  opportunities: string[];
  recommendations: string[];
}

interface SeasonalTopic {
  topic: string;
  description: string;
  marketingAngles: string[];
  contentSuggestions: string[];
  relevance: number;
  timing: string;
}

interface Trigger {
  productFeature: string;
  userNeed: string;
  recommendedProductContent: string[];
  relevance: number;
}

interface ResearchData {
  executiveSummary: string;
  topTriggers?: Trigger[];
  trends?: Trend[];
  consumerInsights?: Insight[];
  industryInsights?: Insight[];
  seasonalTopics?: SeasonalTopic[];
}

interface GoogleResult {
  title: string;
  snippet: string;
  link: string;
}

// Helper functions
const validateArray = <T,>(data: T[] | undefined | null): T[] => {
  return Array.isArray(data) ? data : [];
};

// Skeleton components
const SkeletonCard = () => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col animate-pulse">
    <div className="flex justify-between items-center mb-4">
      <div className="h-6 bg-white/20 rounded w-3/4"></div>
      <div className="h-4 bg-white/20 rounded w-1/5"></div>
    </div>
    <div className="space-y-4 flex-grow">
      <div className="h-4 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
      <div className="h-4 bg-white/20 rounded w-4/6"></div>
      <div className="mt-6 space-y-3">
        <div className="h-3 bg-white/20 rounded w-full"></div>
        <div className="h-3 bg-white/20 rounded w-full"></div>
        <div className="h-3 bg-white/20 rounded w-5/6"></div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-2 bg-white/20 rounded w-full"></div>
      <div className="h-3 bg-white/20 rounded w-1/4"></div>
    </div>
  </div>
);

const SkeletonTextBlock = () => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-white/20 rounded w-3/4"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
      <div className="h-4 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-4/5"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
      <div className="h-4 bg-white/20 rounded w-3/4"></div>
    </div>
  </div>
);

// Base card component
const ResearchCard = memo(({ title, description, items, score, scoreLabel, timing }: CardProps) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-xl font-semibold">{title}</h3>
      {timing && <span className="text-sm opacity-70">{timing}</span>}
    </div>
    <div className="space-y-4 flex-grow">
      <p dangerouslySetInnerHTML={{ __html: description }} />
      {items && items.length > 0 && (
        <ul className="space-y-2 mt-4">
          {items.map((item, idx) => (
            <li key={idx} className="text-sm" dangerouslySetInnerHTML={{ __html: item }} />
          ))}
        </ul>
      )}
    </div>
    {score !== undefined && (
      <div className="mt-4 space-y-2">
        <Progress value={score} className="h-2" />
        <span className="text-sm">
          {scoreLabel}: {score}%
        </span>
      </div>
    )}
  </div>
));

ResearchCard.displayName = 'ResearchCard';

// Google Source Card component
const GoogleSourceCard = memo(({ result }: { result: GoogleResult }) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg h-full flex flex-col transition-transform hover:scale-[1.02]">
    <h3 className="text-xl font-semibold mb-2 line-clamp-2">{result.title}</h3>
    <p className="text-sm mb-4 flex-grow line-clamp-3">{result.snippet}</p>
    <a 
      href={result.link} 
      target="_blank" 
      rel="noopener noreferrer"
      className="text-blue-400 hover:text-blue-300 text-sm mt-auto flex items-center gap-1"
    >
      <span>Visit Source</span>
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
        <polyline points="15 3 21 3 21 9"></polyline>
        <line x1="10" y1="14" x2="21" y2="3"></line>
      </svg>
    </a>
  </div>
));

GoogleSourceCard.displayName = 'GoogleSourceCard';

// Specialized card components
const TrendCard = memo(({ trend }: { trend: Trend }) => (
  <ResearchCard
    title={trend.title}
    description={trend.description}
    items={[
      `<strong>Audience:</strong> ${trend.audience.join(", ")}`,
      `<strong>Platforms:</strong> ${trend.platforms.join(", ")}`,
      ...trend.contentIdeas.map((idea) => `<strong>Content Idea:</strong> ${idea}`),
      ...trend.bestPractices.map((practice) => `<strong>Best Practice:</strong> ${practice}`)
    ]}
    score={trend.impact}
    scoreLabel="Impact Score"
  />
));

TrendCard.displayName = 'TrendCard';

const InsightCard = memo(({ insight }: { insight: Insight }) => (
  <ResearchCard
    title={insight.title}
    description={insight.keyFindings.join("<br/>")}
    items={[
      ...insight.implications.map((imp) => `<strong>Implication:</strong> ${imp}`),
      ...insight.opportunities.map((opp) => `<strong>Opportunity:</strong> ${opp}`),
      ...insight.recommendations.map((rec) => `<strong>Recommendation:</strong> ${rec}`)
    ]}
  />
));

InsightCard.displayName = 'InsightCard';

const SeasonalCard = memo(({ topic }: { topic: SeasonalTopic }) => (
  <ResearchCard
    title={topic.topic}
    description={topic.description}
    items={[
      ...topic.marketingAngles.map((angle) => `<strong>Marketing Angle:</strong> ${angle}`),
      ...topic.contentSuggestions.map((sugg) => `<strong>Content Suggestion:</strong> ${sugg}`)
    ]}
    score={topic.relevance}
    scoreLabel="Relevance Score"
    timing={topic.timing}
  />
));

SeasonalCard.displayName = 'SeasonalCard';

const TriggerCard = memo(({ trigger }: { trigger: Trigger }) => (
  <ResearchCard
    title={trigger.productFeature}
    description={`<strong>User Need:</strong> ${trigger.userNeed}`}
    items={[
      ...trigger.recommendedProductContent.map((content) => `<strong>Product Content:</strong> ${content}`)
    ]}
    score={trigger.relevance}
    scoreLabel="Relevance Score"
  />
));

TriggerCard.displayName = 'TriggerCard';

// Generic section component with updated type definition and skeleton loading
const ResearchSection: React.FC<SectionProps> = ({
  icon,
  title,
  items,
  renderItem,
  emptyMessage,
  className = "",
  isLoading = false,
  skeletonCount = 3
}) => (
  <section className={`mt-8 ${className}`}>
    <h2 className="flex items-center gap-2 text-2xl font-bold mb-4">
      {icon}
      {title}
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {isLoading ? (
        Array.from({ length: skeletonCount }).map((_, index) => (
          <SkeletonCard key={`skeleton-${index}`} />
        ))
      ) : items.length > 0 ? (
        items.map((item, index) => renderItem(item, index))
      ) : (
        <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 col-span-full">
          <p>{emptyMessage}</p>
        </div>
      )}
    </div>
  </section>
);

const MarketResearchDashboard: React.FC<MarketResearchProps> = ({ query }) => {
  const { 
    googleResults, 
    analysis, 
    isLoading, 
    error, 
    isSuccess, 
    research 
  } = useMarketResearch();
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!query.trim() || hasSearched) return;
      await research(query);
      setHasSearched(true);
    };

    fetchData();
  }, [query, research, hasSearched]);

  // Adding an explicit type assertion for the analysis
  const analysisData = analysis as ResearchData;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Product Research Analysis</h1>
        <p className="text-lg opacity-70">Research for: <span className="font-medium text-white">{query}</span></p>
      </header>

      <div className="space-y-12">
        <section>
          <h2 className="text-2xl font-bold mb-4">Market Overview</h2>
          {isLoading ? (
            <SkeletonTextBlock />
          ) : error || !isSuccess ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center text-red-500">
              {error || "Failed to fetch research data"}
            </div>
          ) : !analysisData ? (
            <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 text-center">
              No analysis data available
            </div>
          ) : (
            <div 
              className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg prose prose-invert max-w-none"
              dangerouslySetInnerHTML={{ __html: analysisData.executiveSummary }} 
            />
          )}
        </section>

        <ResearchSection
          icon={<KeyRound className="w-6 h-6" />}
          title="Top Product Triggers"
          items={!isLoading && analysisData ? validateArray(analysisData.topTriggers) : []}
          renderItem={(trigger, index) => (
            <TriggerCard key={index} trigger={trigger as Trigger} />
          )}
          emptyMessage="No product triggers available"
          isLoading={isLoading}
          skeletonCount={3}
        />

        <ResearchSection
          icon={<TrendingUp className="w-6 h-6" />}
          title="Current Trends"
          items={!isLoading && analysisData ? validateArray(analysisData.trends) : []}
          renderItem={(trend, index) => (
            <TrendCard key={index} trend={trend as Trend} />
          )}
          emptyMessage="No trends available"
          isLoading={isLoading}
          skeletonCount={3}
        />

        <ResearchSection
          icon={<Eye className="w-6 h-6" />}
          title="Consumer Insights"
          items={!isLoading && analysisData ? validateArray(analysisData.consumerInsights) : []}
          renderItem={(insight, index) => (
            <InsightCard key={index} insight={insight as Insight} />
          )}
          emptyMessage="No consumer insights available"
          isLoading={isLoading}
          skeletonCount={3}
        />

        <ResearchSection
          icon={<Lightbulb className="w-6 h-6" />}
          title="Industry Insights"
          items={!isLoading && analysisData ? validateArray(analysisData.industryInsights) : []}
          renderItem={(insight, index) => (
            <InsightCard key={index} insight={insight as Insight} />
          )}
          emptyMessage="No industry insights available"
          isLoading={isLoading}
          skeletonCount={3}
        />

        <ResearchSection
          icon={<Calendar className="w-6 h-6" />}
          title="Seasonal & Emerging Topics"
          items={!isLoading && analysisData ? validateArray(analysisData.seasonalTopics) : []}
          renderItem={(topic, index) => (
            <SeasonalCard key={index} topic={topic as SeasonalTopic} />
          )}
          emptyMessage="No seasonal topics available"
          isLoading={isLoading}
          skeletonCount={3}
        />
      </div>

      {!isLoading && googleResults && googleResults.length > 0 && (
        <div className="mt-12 pt-12 border-t border-white/20">
          <ResearchSection
            icon={<Search className="w-6 h-6" />}
            title="Research Sources"
            items={googleResults}
            renderItem={(result, index) => (
              <GoogleSourceCard key={`source-${index}`} result={result as GoogleResult} />
            )}
            emptyMessage="No sources available"
            isLoading={isLoading}
            skeletonCount={3}
          />
        </div>
      )}
      
      {isLoading && (
        <div className="mt-12 pt-12 border-t border-white/20">
          <ResearchSection
            icon={<Search className="w-6 h-6" />}
            title="Research Sources"
            items={[]}
            renderItem={() => null}
            emptyMessage="No sources available"
            isLoading={true}
            skeletonCount={3}
          />
        </div>
      )}
    </div>
  );
};

MarketResearchDashboard.displayName = 'MarketResearchDashboard';

export default memo(MarketResearchDashboard);