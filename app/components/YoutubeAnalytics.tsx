"use client";

import React, {memo } from 'react';
import { 
  ArrowLeft,
  Users,
  Heart,
  AlertCircle,
  Target,
  Brain
} from 'lucide-react';

interface PainPoint {
  title: string;
  description: string;
  possibleSolutions: string[];
  frequency: number;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
}

interface UserExperience {
  scenario: string;
  impact: string;
  frequencyPattern: string;
  sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed';
}

interface EmotionalTrigger {
  trigger: string;
  context: string;
  responsePattern: string;
  dominantEmotion: string;
  intensity: number;
}

interface CommentAnalysisData {
  success: boolean;
  data?: {
    analysis: {
      overview: string;
      painPoints: PainPoint[];
      userExperiences: UserExperience[];
      emotionalTriggers: EmotionalTrigger[];
      marketImplications: string;
    };
  };
  error?: string;
}

interface CommentAnalysisProps {
  commentAnalysis: CommentAnalysisData | null;
  isAnalyzing: boolean;
  onBackToComments: () => void;
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
  items,
  sentiment 
}: { 
  title: string;
  content: string;
  metric?: number;
  metricLabel?: string;
  items?: string[];
  sentiment?: string;
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-200/20 hover:border-red-600/50">
    <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">{title}</h3>
    <p className="mb-4 text-gray-800 dark:text-gray-200 leading-relaxed">{content}</p>
    
    {sentiment && (
      <div className="mb-3">
        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
          sentiment === 'positive' ? 'bg-emerald-100 text-emerald-800' :
          sentiment === 'negative' ? 'bg-red-100 text-red-800' :
          sentiment === 'mixed' ? 'bg-amber-100 text-amber-800' :
          'bg-gray-100 text-gray-600'
        }`}>
          {sentiment}
        </span>
      </div>
    )}
    
    {metric !== undefined && (
      <div className="space-y-2 mb-4">
        <div className="w-full bg-gray-200/20 rounded-full h-2">
          <div 
            className="bg-red-600 h-2 rounded-full transition-all duration-500 ease-out" 
            style={{ width: `${Math.min(metric * 10, 100)}%` }}
          ></div>
        </div>
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {metricLabel}: {metric}/10
        </span>
      </div>
    )}
    
    {items && (
      <ul className="mt-4 space-y-2">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full mt-2 mr-2 flex-shrink-0"></span>
            {item}
          </li>
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
  <div className="flex items-center gap-2 text-2xl font-bold mb-4 text-gray-800 dark:text-gray-200">
    {icon}
    {title}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

const Button = memo(({ 
  onClick, 
  children, 
  className = "" 
}: { 
  onClick: () => void; 
  children: React.ReactNode; 
  className?: string;
}) => (
  <button 
    onClick={onClick}
    className={`px-6 py-2 rounded-lg font-medium transition-colors duration-200 ${className}`}
  >
    {children}
  </button>
));
Button.displayName = 'Button';

const CommentAnalysis: React.FC<CommentAnalysisProps> = ({ 
  commentAnalysis, 
  isAnalyzing, 
  onBackToComments 
}) => {
  const validateArray = <T,>(data: T[] | undefined | null): T[] => {
    return Array.isArray(data) ? data : [];
  };

  if (isAnalyzing) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
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
        </div>
      </div>
    );
  }

  if (!commentAnalysis?.success || !commentAnalysis.data) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex justify-center items-center min-h-[60vh]">
          <div className="text-center space-y-6">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto" />
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">Analysis Failed</h2>
              <p className="text-gray-600 dark:text-gray-400">{commentAnalysis?.error || "Unable to generate analysis. Please try again."}</p>
            </div>
            <Button 
              onClick={onBackToComments}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Video
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const { analysis } = commentAnalysis.data;
  const painPoints = validateArray(analysis.painPoints);
  const userExperiences = validateArray(analysis.userExperiences);
  const emotionalTriggers = validateArray(analysis.emotionalTriggers);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold mb-2 text-red-600">Comments Analysis Dashboard</h1>
            <p className="text-lg opacity-70 text-gray-800 dark:text-gray-200">Comprehensive insights from video engagement</p>
          </div>
          <Button 
            onClick={onBackToComments}
            className="border border-red-600 text-red-600 hover:bg-red-50 bg-white/10 backdrop-blur-lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Video
          </Button>
        </div>
      </header>

      <div className="space-y-8">
        {/* Overview Section */}
        <section>
          <SectionHeader 
            icon={<Target className="w-6 h-6 text-red-600" />} 
            title="Executive Summary" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border-l-4 border-red-600">
            <div className="prose max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
              {analysis.overview}
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
            {painPoints.map((point, index) => (
              <AnalysisCard
                key={`pain-${index}`}
                title={point.title}
                content={point.description}
                metric={point.frequency}
                metricLabel="Frequency Score"
                items={point.possibleSolutions}
                sentiment={point.sentiment}
              />
            ))}
          </div>
          {painPoints.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No pain points identified in the comments.</p>
            </div>
          )}
        </section>

        {/* User Experiences */}
        <section>
          <SectionHeader 
            icon={<Users className="w-6 h-6 text-red-600" />} 
            title="User Experiences" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userExperiences.map((exp, index) => (
              <AnalysisCard
                key={`exp-${index}`}
                title={exp.scenario.length > 50 ? `${exp.scenario.substring(0, 50)}...` : exp.scenario}
                content={exp.impact}
                items={[
                  `Pattern: ${exp.frequencyPattern}`,
                  `Sentiment: ${exp.sentiment}`
                ]}
                sentiment={exp.sentiment}
              />
            ))}
          </div>
          {userExperiences.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No user experiences identified in the comments.</p>
            </div>
          )}
        </section>

        {/* Emotional Triggers */}
        <section>
          <SectionHeader 
            icon={<Heart className="w-6 h-6 text-red-600" />} 
            title="Emotional Triggers" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {emotionalTriggers.map((trigger, index) => (
              <AnalysisCard
                key={`trigger-${index}`}
                title={trigger.trigger}
                content={trigger.context}
                metric={trigger.intensity}
                metricLabel="Intensity"
                items={[
                  `Response: ${trigger.responsePattern}`,
                  `Emotion: ${trigger.dominantEmotion}`
                ]}
              />
            ))}
          </div>
          {emotionalTriggers.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">No emotional triggers identified in the comments.</p>
            </div>
          )}
        </section>

        {/* Market Implications */}
        <section>
          <SectionHeader 
            icon={<Brain className="w-6 h-6 text-red-600" />} 
            title="Market Implications" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 border-l-4 border-red-600">
            <div className="prose max-w-none text-gray-800 dark:text-gray-200 leading-relaxed">
              {analysis.marketImplications}
            </div>
          </div>
        </section>
      </div>

      <div className="text-sm opacity-70 text-right mt-8 text-gray-600 dark:text-gray-400">
        Last updated: {new Date().toLocaleString()}
      </div>
    </div>
  );
};

export default memo(CommentAnalysis);