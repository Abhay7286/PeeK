"use client";

import React, { useState, useEffect, memo, useRef } from 'react';
import { QuoraAnalysisService } from '@/app/api/quoraAnalytics';
import { 
  AlertCircle, Brain, Heart, 
  TrendingUp, Target, Users, ChevronUp 
} from 'lucide-react';
import "@/styles/QuoraAnalytics.css"

// Types
interface QuoraAnswer {
  content: string;
  author: {
    name: string;
    profile_url: string;
    credentials: string;
  };
  post_url: string;
  upvotes: number;
  timestamp: string;
}

interface PainPoint {
  title: string;
  description: string;
  frequency: number;
  impact: number;
  possibleSolutions: string[];
}

interface UserExperience {
  scenario: string;
  impact: string;
  frequencyPattern: string;
  sentiment: 'positive' | 'negative' | 'neutral';
}

interface EmotionalTrigger {
  trigger: string;
  context: string;
  intensity: number;
  responsePattern: string;
}

interface AnalysisData {
  analysis: {
    overview: string;
    painPoints: PainPoint[];
    userExperiences: UserExperience[];
    emotionalTriggers: EmotionalTrigger[];
    marketImplications: string;
  };
  sources: QuoraAnswer[];
  timestamp: string;
}

interface QuoraAnalyticsProps {
  query: string;
  className?: string;
}

// Skeleton Components
const SkeletonCard = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg animate-pulse">
    <div className="h-6 bg-gray-300/20 rounded mb-4 w-3/4"></div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-gray-300/20 rounded w-full"></div>
      <div className="h-4 bg-gray-300/20 rounded w-5/6"></div>
      <div className="h-4 bg-gray-300/20 rounded w-4/6"></div>
    </div>
    <div className="h-2 bg-gray-300/20 rounded mb-2"></div>
    <div className="h-3 bg-gray-300/20 rounded w-24"></div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonSourceCard = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg animate-pulse">
    <div className="space-y-2 mb-6">
      <div className="h-4 bg-gray-300/20 rounded w-full"></div>
      <div className="h-4 bg-gray-300/20 rounded w-5/6"></div>
      <div className="h-4 bg-gray-300/20 rounded w-4/6"></div>
      <div className="h-4 bg-gray-300/20 rounded w-3/6"></div>
    </div>
    <div className="flex items-center justify-between mb-3">
      <div className="h-4 bg-gray-300/20 rounded w-32"></div>
      <div className="h-4 bg-gray-300/20 rounded w-16"></div>
    </div>
    <div className="h-3 bg-gray-300/20 rounded w-48 mb-3"></div>
    <div className="h-4 bg-gray-300/20 rounded w-28"></div>
  </div>
));
SkeletonSourceCard.displayName = 'SkeletonSourceCard';

const SkeletonOverview = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border-l-4 border-red-600 animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-gray-300/20 rounded w-full"></div>
      <div className="h-4 bg-gray-300/20 rounded w-5/6"></div>
      <div className="h-4 bg-gray-300/20 rounded w-4/6"></div>
      <div className="h-4 bg-gray-300/20 rounded w-3/6"></div>
    </div>
  </div>
));
SkeletonOverview.displayName = 'SkeletonOverview';

// Helper Components
const AnalysisCard = memo(({ 
  title, 
  content, 
  metric,
  metricLabel,
  items 
}: { 
  title: string;
  content: string;
  metric?: number;
  metricLabel?: string;
  items?: string[];
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg">
    <h3 className="text-xl font-semibold mb-4">{title}</h3>
    <p className="mb-4">{content}</p>
    {metric !== undefined && (
      <div className="space-y-2">
        <div className="w-full bg-gray-200/20 rounded-full h-2">
          <div 
            className="bg-red-600 h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${(metric * 10)}%` }}
          ></div>
        </div>
        <span className="text-sm">
          {metricLabel}: {metric}/10
        </span>
      </div>
    )}
    {items && (
      <ul className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm">{item}</li>
        ))}
      </ul>
    )}
  </div>
));
AnalysisCard.displayName = 'AnalysisCard';

const SectionHeader = memo(({ 
  icon, 
  title 
}: { 
  icon: React.ReactNode; 
  title: string;
}) => (
  <div className="flex items-center gap-2 text-2xl font-bold mb-4">
    {icon}
    {title}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

const UpvoteButton = memo(({ count }: { count: number }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100/10 rounded-lg border border-gray-200/20 hover:border-red-600/50 transition-colors duration-200">
    <ChevronUp className="w-4 h-4 text-red-600" />
    <span className="font-medium text-sm">{count.toLocaleString()}</span>
  </div>
));
UpvoteButton.displayName = 'UpvoteButton';

// Main Component
const QuoraAnalyticsDashboard: React.FC<QuoraAnalyticsProps> = ({ query, className = '' }) => {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    data?: AnalysisData;
  }>({
    loading: true
  });

  const hasCalledAPI = useRef(false);

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!query || hasCalledAPI.current) return;

      hasCalledAPI.current = true;
      setState(prev => ({ ...prev, loading: true }));

      try {
        const result = await QuoraAnalysisService.analyzeQuoraData(query);
        
        if (result.success && result.data) {
          setState({
            loading: false,
            data: result.data
          });
        } else {
          setState({
            loading: false,
            error: result.error || 'Unknown error occurred'
          });
        }
      } catch (error) {
        setState({
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to analyze Quora data'
        });
      }
    };

    fetchAnalysis();
  }, [query]);

  if (state.loading) {
    return (
      <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
        <header className="mb-8">
          <div className="h-8 bg-gray-300/20 rounded w-80 mb-2 animate-pulse"></div>
          <div className="h-6 bg-gray-300/20 rounded w-64 animate-pulse"></div>
        </header>

        <div className="space-y-8">
          {/* Overview Skeleton */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300/20 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-300/20 rounded w-32 animate-pulse"></div>
            </div>
            <SkeletonOverview />
          </section>

          {/* Pain Points Skeleton */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300/20 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-300/20 rounded w-32 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={`pain-skeleton-${i}`} />
              ))}
            </div>
          </section>

          {/* User Experiences Skeleton */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300/20 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-300/20 rounded w-40 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={`exp-skeleton-${i}`} />
              ))}
            </div>
          </section>

          {/* Emotional Triggers Skeleton */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300/20 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-300/20 rounded w-44 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(3)].map((_, i) => (
                <SkeletonCard key={`trigger-skeleton-${i}`} />
              ))}
            </div>
          </section>

          {/* Market Implications Skeleton */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300/20 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-300/20 rounded w-48 animate-pulse"></div>
            </div>
            <SkeletonOverview />
          </section>

          {/* Source Answers Skeleton */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-6 h-6 bg-gray-300/20 rounded animate-pulse"></div>
              <div className="h-6 bg-gray-300/20 rounded w-40 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonSourceCard key={`source-skeleton-${i}`} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="text-center text-red-500 p-4">
        {state.error}
      </div>
    );
  }

  if (!state.data) {
    return null;
  }

  const { data } = state;

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2 text-red-600">Quora Discussion Analysis</h1>
        <p className="text-lg opacity-70">Analysis for: {query}</p>
      </header>

      <div className="space-y-8">
        {/* Overview Section */}
        <section>
          <SectionHeader 
            icon={<Target className="w-6 h-6 text-red-600" />} 
            title="Overview" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border-l-4 border-red-600">
            <div className="prose max-w-none">
              {data.analysis.overview}
            </div>
          </div>
        </section>

        {/* Pain Points Grid */}
        <section>
          <SectionHeader 
            icon={<AlertCircle className="w-6 h-6 text-red-600" />} 
            title="Pain Points" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.painPoints.map((point, index) => (
              <AnalysisCard
                key={`pain-${index}`}
                title={point.title}
                content={point.description}
                metric={point.impact}
                metricLabel="Impact Score"
                items={point.possibleSolutions}
              />
            ))}
          </div>
        </section>

        {/* User Experiences */}
        <section>
          <SectionHeader 
            icon={<Users className="w-6 h-6 text-red-600" />} 
            title="User Experiences" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.userExperiences.map((exp, index) => (
              <AnalysisCard
                key={`exp-${index}`}
                title={exp.scenario}
                content={exp.impact}
                items={[
                  `Pattern: ${exp.frequencyPattern}`,
                  `Sentiment: ${exp.sentiment}`
                ]}
              />
            ))}
          </div>
        </section>

        {/* Emotional Triggers */}
        <section>
          <SectionHeader 
            icon={<Heart className="w-6 h-6 text-red-600" />} 
            title="Emotional Triggers" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.emotionalTriggers.map((trigger, index) => (
              <AnalysisCard
                key={`trigger-${index}`}
                title={trigger.trigger}
                content={trigger.context}
                metric={trigger.intensity}
                metricLabel="Intensity"
                items={[`Response: ${trigger.responsePattern}`]}
              />
            ))}
          </div>
        </section>

        {/* Market Implications */}
        <section>
          <SectionHeader 
            icon={<Brain className="w-6 h-6 text-red-600" />} 
            title="Market Implications" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border-l-4 border-red-600">
            <div className="prose max-w-none">
              {data.analysis.marketImplications}
            </div>
          </div>
        </section>

        {/* Source Answers */}
        <section>
          <SectionHeader 
            icon={<TrendingUp className="w-6 h-6 text-red-600" />} 
            title="Source Answers" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.sources.map((answer, index) => (
              <div key={`answer-${index}`} className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/20 hover:border-red-600/50">
                <div className="mb-6 text-gray-800 dark:text-gray-200 leading-relaxed">
                  {answer.content.length > 200 
                    ? `${answer.content.substring(0, 200)}...` 
                    : answer.content
                  }
                </div>
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <a 
                      href={answer.author.profile_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-600 hover:text-red-700 font-medium transition-colors duration-200 flex items-center gap-2"
                    >
                      <span className="w-2 h-2 bg-red-600 rounded-full"></span>
                      {answer.author.name}
                    </a>
                    <UpvoteButton count={answer.upvotes} />
                  </div>
                  
                  {answer.author.credentials && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                      {answer.author.credentials}
                    </p>
                  )}
                  
                  <div className="pt-3 border-t border-gray-200/20">
                    <a 
                      href={answer.post_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium transition-colors duration-200"
                    >
                      <span>View on Quora</span>
                      <TrendingUp className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <div className="text-sm opacity-70 text-right mt-8">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </div>
    </div>
  );
};

QuoraAnalyticsDashboard.displayName = 'QuoraAnalyticsDashboard';

export default memo(QuoraAnalyticsDashboard);