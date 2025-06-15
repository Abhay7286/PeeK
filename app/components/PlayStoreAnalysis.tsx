"use client";
import React, { useEffect, useState, memo, useCallback } from 'react';
import { 
  Loader2, 
  ChevronRight,
  AlertTriangle,
  Info,
  Star,
  TrendingUp,
  Lightbulb,
  Users,
  Zap,
  Target,
  MessageSquare
} from 'lucide-react';
import { getAppReviews, analyzeAppReviews } from '@/app/api/playstoreAnalyticsApi';
import { Button } from '@/app/components/ui/button';
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import type { Review, ReviewAnalysis } from '@/app/api/playstoreAnalyticsApi';

interface AppAnalysisProps {
  appId: string;
  appName: string;
  onBackToSelection: () => void;
}

// Skeleton components
const SkeletonCard = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg h-full flex flex-col animate-pulse border border-white/5">
    <div className="flex justify-between items-center mb-4">
      <div className="h-6 bg-white/20 rounded-md w-3/4"></div>
      <div className="h-5 bg-white/20 rounded-full w-1/5"></div>
    </div>
    <div className="space-y-3 flex-grow">
      <div className="h-4 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
      <div className="h-4 bg-white/20 rounded w-4/6"></div>
      <div className="mt-4 space-y-2">
        <div className="h-3 bg-white/20 rounded w-full"></div>
        <div className="h-3 bg-white/20 rounded w-full"></div>
        <div className="h-3 bg-white/20 rounded w-3/4"></div>
      </div>
    </div>
    <div className="mt-4 space-y-2">
      <div className="h-3 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-1/4"></div>
    </div>
  </div>
));

SkeletonCard.displayName = 'SkeletonCard';

const SkeletonTextBlock = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg animate-pulse border border-white/5">
    <div className="space-y-3">
      <div className="h-4 bg-white/20 rounded w-3/4"></div>
      <div className="h-4 bg-white/20 rounded w-5/6"></div>
      <div className="h-4 bg-white/20 rounded w-full"></div>
      <div className="h-4 bg-white/20 rounded w-4/5"></div>
    </div>
  </div>
));

SkeletonTextBlock.displayName = 'SkeletonTextBlock';

// Utility components
const RatingStars = memo(({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${
              i < fullStars 
                ? 'text-amber-400 fill-amber-400' 
                : i === fullStars && hasHalfStar
                  ? 'text-amber-400 fill-amber-400 opacity-60'
                  : 'text-gray-400 fill-gray-400 opacity-30'
            }`}
          />
        ))}
      </div>
      <span className="ml-1 text-sm font-semibold text-amber-400">{rating.toFixed(1)}</span>
    </div>
  );
});

RatingStars.displayName = 'RatingStars';

// Utility functions
const truncateText = (text: string, maxLength: number = 100): string => {
  if (!text) return '';
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
};

const sanitizeHtml = (html: string): string => {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '');
};

const getSentimentColors = (sentiment: string) => {
  const colors = {
    positive: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    negative: 'bg-rose-500/15 text-rose-400 border-rose-500/20',
    neutral: 'bg-blue-500/15 text-blue-400 border-blue-500/20',
    mixed: 'bg-purple-500/15 text-purple-400 border-purple-500/20'
  };
  return colors[sentiment as keyof typeof colors] || colors.neutral;
};

const getComplexityColors = (complexity: string) => {
  const colors = {
    low: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20',
    medium: 'bg-amber-500/15 text-amber-400 border-amber-500/20',
    high: 'bg-rose-500/15 text-rose-400 border-rose-500/20'
  };
  return colors[complexity as keyof typeof colors] || colors.medium;
};

// Card components
const PainPointCard = memo(({
  painPoint
}: {
  painPoint: {
    title: string;
    description: string;
    frequency: number;
    impact: number;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    possibleSolutions: string[];
  }
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 shadow-lg h-full flex flex-col transition-all duration-200 hover:scale-[1.01] hover:bg-white/15 border border-white/5">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-lg font-semibold leading-tight pr-2">{painPoint.title}</h3>
      <Badge className={`${getSentimentColors(painPoint.sentiment)} text-sm px-2 py-1 border flex-shrink-0`}>
        {painPoint.sentiment}
      </Badge>
    </div>
    
    <p className="text-sm text-gray-300 mb-4 flex-grow leading-relaxed">
      {truncateText(sanitizeHtml(painPoint.description))}
    </p>
    
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Frequency</span>
          <span className="text-sm font-medium">{painPoint.frequency}/10</span>
        </div>
        <Progress value={painPoint.frequency * 10} className="h-2 bg-white/10" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Impact</span>
          <span className="text-sm font-medium">{painPoint.impact}/10</span>
        </div>
        <Progress value={painPoint.impact * 10} className="h-2 bg-white/10" />
      </div>
    </div>
    
    <div className="mt-auto">
      <p className="text-sm font-medium mb-2 text-gray-200">Solutions:</p>
      <div className="space-y-2 max-h-20 overflow-y-auto">
        {painPoint.possibleSolutions?.slice(0, 2).map((solution, index) => (
          <p key={index} className="text-sm text-gray-300 leading-relaxed">
            • {truncateText(sanitizeHtml(solution), 50)}
          </p>
        ))}
      </div>
    </div>
  </div>
));

PainPointCard.displayName = 'PainPointCard';

const FeatureRequestCard = memo(({
  feature
}: {
  feature: {
    feature: string;
    description: string;
    demand: number;
    businessValue: number;
    implementationComplexity: 'low' | 'medium' | 'high';
  }
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 shadow-lg h-full flex flex-col transition-all duration-200 hover:scale-[1.01] hover:bg-white/15 border border-white/5">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-lg font-semibold leading-tight pr-2">{feature.feature}</h3>
      <Badge className={`${getComplexityColors(feature.implementationComplexity)} text-sm px-2 py-1 border flex-shrink-0`}>
        {feature.implementationComplexity}
      </Badge>
    </div>
    
    <p className="text-sm text-gray-300 mb-5 flex-grow leading-relaxed">
      {truncateText(sanitizeHtml(feature.description), 80)}
    </p>
    
    <div className="grid grid-cols-2 gap-4 mt-auto">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Demand</span>
          <span className="text-sm font-medium">{feature.demand}/10</span>
        </div>
        <Progress value={feature.demand * 10} className="h-2 bg-white/10" />
      </div>
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">Value</span>
          <span className="text-sm font-medium">{feature.businessValue}/10</span>
        </div>
        <Progress value={feature.businessValue * 10} className="h-2 bg-white/10" />
      </div>
    </div>
  </div>
));

FeatureRequestCard.displayName = 'FeatureRequestCard';

const ReviewCard = memo(({
  review
}: {
  review: Review & { sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed' }
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 shadow-lg h-full flex flex-col transition-all duration-200 hover:scale-[1.01] hover:bg-white/15 border border-white/5">
    <div className="flex justify-between items-start mb-4">
      <div className="flex items-center gap-3">
        <RatingStars rating={review.review_rating} />
        <p className="font-medium text-base text-gray-200 truncate">{review.author_name}</p>
      </div>
      {review.sentiment && (
        <Badge className={`${getSentimentColors(review.sentiment)} text-sm px-2 py-1 border flex-shrink-0`}>
          {review.sentiment}
        </Badge>
      )}
    </div>
    
    <p className="text-sm text-gray-300 mb-4 flex-grow leading-relaxed">
      {truncateText(review.review_text, 150)}
    </p>
    
    <div className="flex justify-between items-center text-sm text-gray-400 mb-4">
      <span>v{review.author_app_version}</span>
      <span>{new Date(review.review_timestamp * 1000).toLocaleDateString()}</span>
    </div>
    
    {review.app_developer_reply && (
      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="text-sm font-medium mb-2 text-blue-400">Developer:</p>
        <p className="text-sm text-gray-300 leading-relaxed">
          {truncateText(review.app_developer_reply, 100)}
        </p>
      </div>
    )}
  </div>
));

ReviewCard.displayName = 'ReviewCard';

const UserExperienceCard = memo(({
  experience
}: {
  experience: {
    scenario: string;
    impact: string;
    sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
    frequencyPattern: string;
    userQuotes?: string[];
  }
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-5 shadow-lg h-full flex flex-col transition-all duration-200 hover:scale-[1.01] hover:bg-white/15 border border-white/5">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-lg font-semibold leading-tight pr-2">{experience.scenario}</h3>
      <Badge className={`${getSentimentColors(experience.sentiment)} text-sm px-2 py-1 border flex-shrink-0`}>
        {experience.sentiment}
      </Badge>
    </div>
    
    <p className="text-sm text-gray-300 mb-3 flex-grow leading-relaxed">
      {truncateText(sanitizeHtml(experience.impact))}
    </p>
    <p className="text-sm text-gray-400 mb-4">
      <span className="font-medium">Pattern:</span> {experience.frequencyPattern}
    </p>
    
    {experience.userQuotes && experience.userQuotes.length > 0 && (
      <div className="mt-auto pt-4 border-t border-white/10">
        <p className="text-sm font-medium mb-3 text-blue-400">Quotes:</p>
        <div className="max-h-16 overflow-y-auto space-y-2">
          {experience.userQuotes.slice(0, 2).map((quote, i) => (
            <p key={i} className="text-sm italic text-gray-300 leading-relaxed">
              &ldquo;{truncateText(quote, 60)}&rdquo;
            </p>
          ))}
        </div>
      </div>
    )}
  </div>
));

UserExperienceCard.displayName = 'UserExperienceCard';

// Sentiment distribution component
const SentimentDistribution = memo(({ distribution }: { 
  distribution: { positive: number; neutral: number; negative: number } 
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white/5">
    <h3 className="font-semibold mb-5 text-gray-200 text-lg">Distribution</h3>
    <div className="space-y-4">
      {[
        { key: 'positive', label: 'Positive', color: 'from-emerald-400 to-emerald-500', textColor: 'text-emerald-400' },
        { key: 'neutral', label: 'Neutral', color: 'from-blue-400 to-blue-500', textColor: 'text-blue-400' },
        { key: 'negative', label: 'Negative', color: 'from-rose-400 to-rose-500', textColor: 'text-rose-400' }
      ].map(({ key, label, color, textColor }) => (
        <div key={key}>
          <div className="flex justify-between text-sm mb-2">
            <span className={`${textColor} font-medium`}>{label}</span>
            <span className="font-semibold">{distribution[key as keyof typeof distribution]}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2.5">
            <div 
              className={`bg-gradient-to-r ${color} h-2.5 rounded-full transition-all duration-300`}
              style={{ width: `${distribution[key as keyof typeof distribution]}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </div>
));

SentimentDistribution.displayName = 'SentimentDistribution';

// Main component
const AppAnalysis: React.FC<AppAnalysisProps> = ({ appId, appName, onBackToSelection }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [analysisLoading, setAnalysisLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setReviewsLoading(true);
      setAnalysisLoading(true);
      setError(null);
      
      const [appReviews, appAnalysis] = await Promise.all([
        getAppReviews(appId),
        analyzeAppReviews(appId, appName)
      ]);
      
      setReviews(appReviews);
      setAnalysis(appAnalysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load app data';
      setError(errorMessage);
      console.error('Error fetching app data:', err);
    } finally {
      setReviewsLoading(false);
      setAnalysisLoading(false);
    }
  }, [appId, appName]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRetryAnalysis = useCallback(async () => {
    try {
      setAnalysisLoading(true);
      setError(null);
      
      const appAnalysis = await analyzeAppReviews(appId, appName);
      setAnalysis(appAnalysis);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load analysis';
      setError(errorMessage);
      console.error('Error retrying analysis:', err);
    } finally {
      setAnalysisLoading(false);
    }
  }, [appId, appName]);

  // Loading state
  if (reviewsLoading || analysisLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-center p-16">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-12 w-12 animate-spin text-primary" />
            <p className="opacity-70 text-base">Analyzing reviews...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !analysis?.success) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={onBackToSelection}
            className="flex items-center gap-2 hover:bg-white/10 text-base px-4 py-2"
          >
            <ChevronRight className="h-5 w-5 rotate-180" />
            Back
          </Button>
          <h3 className="text-2xl font-semibold text-gray-400">
            {appName} Stats
          </h3>
        </div>
        
        <div className="p-8 flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
            <p className="text-xl mb-4">
              {analysis?.error || error || "Analysis failed. Please retry."}
            </p>
            <Button 
              onClick={handleRetryAnalysis} 
              variant="outline"
              className="hover:bg-white/10 text-base px-6 py-2"
            >
              Retry Analysis
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const analysisData = analysis.data?.analysis;
  if (!analysisData) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-10">
        <Button 
          variant="outline" 
          onClick={onBackToSelection}
          className="flex items-center gap-2 hover:bg-white/10 transition-colors text-base px-4 py-2"
        >
          <ChevronRight className="h-5 w-5 rotate-180" />
          Back
        </Button>
        <h3 className="text-2xl font-semibold text-gray-400">
          {appName} Stats
        </h3>
      </div>

      <div className="space-y-12">
        {/* Overview Section */}
        <section>
          <h2 className="text-3xl font-bold mb-6 text-gray-100">Overview</h2>
          {analysisData.overview ? (
            <div 
              className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg prose prose-invert prose-base max-w-none border border-white/5"
              dangerouslySetInnerHTML={{ __html: analysisData.overview }} 
            />
          ) : (
            <SkeletonTextBlock />
          )}
        </section>

        {/* Sentiment Analysis Section */}
        <section>
          <h2 className="flex items-center gap-3 text-3xl font-bold mb-8 text-gray-100">
            <TrendingUp className="w-8 h-8 text-blue-400" />
            Sentiment Analysis
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Overall Sentiment */}
            <div className="bg-white/20 backdrop-blur-xl rounded-2xl p-6 shadow-2xl border border-white/30 backdrop-saturate-150">
              <h3 className="font-semibold mb-5 text-white/90 text-lg drop-shadow-sm">Overall Sentiment</h3>
              <div className="flex items-center gap-4 mb-5">
                <div className="relative w-20 h-20 rounded-full flex items-center justify-center bg-white/25 backdrop-blur-md text-white font-bold text-xl shadow-2xl border border-white/40">
                  <div className="absolute inset-1 rounded-full bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20">
                    <span className="text-2xl font-bold text-white drop-shadow-md">
                      {analysisData.sentimentAnalysis.score.toFixed(1)}
                    </span>
                  </div>
                </div>
                <Badge className="bg-white/20 text-white border-white/30 px-4 py-2 text-base font-medium border backdrop-blur-sm">
                  {analysisData.sentimentAnalysis.overall}
                </Badge>
              </div>
            </div>
            
            {/* Distribution */}
            <SentimentDistribution distribution={analysisData.sentimentAnalysis.distribution} />
            
            {/* Key Trends */}
            <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white/5">
              <h3 className="font-semibold mb-5 text-gray-200 text-lg">Key Trends</h3>
              <div className="space-y-4">
                {analysisData.sentimentAnalysis.trends.map((trend, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge className={`text-sm px-3 py-1 border ${getSentimentColors(trend.sentiment)}`}>
                        {trend.sentiment}
                      </Badge>
                      <span className="text-sm text-gray-300">{trend.topic}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Pain Points Section */}
        {analysisData.painPoints && analysisData.painPoints.length > 0 && (
          <section>
            <h2 className="flex items-center gap-3 text-3xl font-bold mb-8 text-gray-100">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              Pain Points
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysisData.painPoints.map((painPoint, index) => (
                <PainPointCard key={index} painPoint={painPoint} />
              ))}
            </div>
          </section>
        )}

        {/* Feature Requests Section */}
        {analysisData.featureRequests && analysisData.featureRequests.length > 0 && (
          <section>
            <h2 className="flex items-center gap-3 text-3xl font-bold mb-8 text-gray-100">
              <Lightbulb className="w-8 h-8 text-amber-400" />
              Feature Requests
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysisData.featureRequests.map((feature, index) => (
                <FeatureRequestCard key={index} feature={feature} />
              ))}
            </div>
          </section>
        )}

        {/* User Experiences Section */}
        {analysisData.userExperiences && analysisData.userExperiences.length > 0 && (
          <section>
            <h2 className="flex items-center gap-3 text-3xl font-bold mb-8 text-gray-100">
              <Users className="w-8 h-8 text-blue-400" />
              User Experiences
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {analysisData.userExperiences.map((experience, index) => (
                <UserExperienceCard key={index} experience={experience} />
              ))}
            </div>
          </section>
        )}

        {/* Strategic Insights Section */}
        <section>
          <h2 className="flex items-center gap-3 text-3xl font-bold mb-8 text-gray-100">
            <Target className="w-8 h-8 text-emerald-400" />
            Strategic Insights
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysisData.marketImplications && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white/5">
                <h3 className="text-xl font-semibold mb-5 flex items-center gap-3 text-gray-200">
                  <Info className="w-6 h-6 text-blue-400" />
                  Market Implications
                </h3>
                <div 
                  className="text-base text-gray-300 leading-relaxed" 
                  dangerouslySetInnerHTML={{ __html: analysisData.marketImplications }} 
                />
              </div>
            )}
            
            {analysisData.actionableRecommendations && analysisData.actionableRecommendations.length > 0 && (
              <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 shadow-lg border border-white/5">
                <h3 className="text-xl font-semibold mb-5 flex items-center gap-3 text-gray-200">
                  <Zap className="w-6 h-6 text-amber-400" />
                  Recommendations
                </h3>
                <div className="space-y-3">
                  {analysisData.actionableRecommendations.map((recommendation, index) => (
                    <div 
                      key={index} 
                      className="text-base text-gray-300 leading-relaxed" 
                      dangerouslySetInnerHTML={{ __html: `• ${recommendation}` }} 
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Recent Reviews Section */}
        {reviews.length > 0 && (
          <section>
            <h2 className="flex items-center gap-3 text-3xl font-bold mb-8 text-gray-100">
              <MessageSquare className="w-8 h-8 text-purple-400" />
              Recent Reviews
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {reviews.slice(0, 9).map((review) => (
                <ReviewCard 
                  key={review.review_id} 
                  review={{
                    ...review,
                    sentiment: analysis?.data?.sources?.find(source => 
                      source.content === review.review_text
                    )?.sentiment
                  }} 
                />
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default memo(AppAnalysis);