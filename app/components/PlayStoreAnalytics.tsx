"use client";

import React, { useEffect, useState, useRef, memo } from 'react';
import Image from 'next/image';
import { 
  Star, 
  Download, 
  MessageSquare, 
  Loader2, 
  ChevronRight,
  AlertTriangle,
  Info
} from 'lucide-react';
import { searchApps, getAppReviews, analyzeAppReviews } from '@/app/api/playstoreAnalyticsApi';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Skeleton } from "@/app/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import { Progress } from "@/app/components/ui/progress";
import { Badge } from "@/app/components/ui/badge";
import type { AppBasic, App, Review, ReviewAnalysis } from '@/app/api/playstoreAnalyticsApi';

// Error state interface
interface ErrorState {
  message: string;
  code: string;
}

// Props interface for the component
interface AppAnalyticsProps {
  query: string;
}

// Helper functions
// Format large numbers in a readable way
const formatNumber = (num: string | number) => {
  const n = typeof num === 'string' ? parseInt(num) : num;
  if (isNaN(n)) return 'N/A';
  if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
  return n.toString();
};

// Format rating to display stars
const RatingStars = ({ rating }: { rating: number }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <Star
          key={i}
          className={`h-4 w-4 ${
            i < fullStars 
              ? 'text-yellow-400 fill-yellow-400' 
              : i === fullStars && hasHalfStar
                ? 'text-yellow-400 fill-yellow-400 opacity-50'
                : 'text-gray-300'
          }`}
        />
      ))}
      <span className="ml-1 text-sm font-medium">{rating.toFixed(1)}</span>
    </div>
  );
};

// AppCard component
const AppCard = memo(({ 
  app, 
  isSelected, 
  onClick 
}: { 
  app: AppBasic, 
  isSelected: boolean,
  onClick: () => void
}) => (
  <Card
    className={`app-card flex-shrink-0 w-64 cursor-pointer snap-start transition-all hover:shadow-lg
      ${isSelected ? 'ring-2 ring-primary shadow-md' : ''}`}
    onClick={onClick}
  >
    <CardContent className="p-4">
      <div className="flex items-center gap-3">
        <div className="relative w-16 h-16 flex-shrink-0">
          <Image
            src={app.app_icon}
            alt={app.app_name}
            fill
            sizes="(max-width: 768px) 64px, 64px"
            className="object-cover rounded-lg"
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold line-clamp-2">{app.app_name}</h3>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{app.app_id}</p>
        </div>
      </div>
    </CardContent>
  </Card>
));
AppCard.displayName = 'AppCard';

// PainPoint card component
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
}) => {
  const sentimentColors = {
    positive: 'bg-green-500/20 text-green-600',
    negative: 'bg-red-500/20 text-red-600',
    neutral: 'bg-blue-500/20 text-blue-600',
    mixed: 'bg-purple-500/20 text-purple-600'
  };

  return (
    <Card className="pain-point-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold">{painPoint.title}</h3>
          <Badge className={sentimentColors[painPoint.sentiment]}>
            {painPoint.sentiment}
          </Badge>
        </div>
        
        <p className="text-sm text-muted-foreground mb-3">{painPoint.description}</p>
        
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Frequency</p>
            <Progress value={painPoint.frequency * 10} className="h-2" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Impact</p>
            <Progress value={painPoint.impact * 10} className="h-2" />
          </div>
        </div>
        
        <div>
          <p className="text-xs font-medium mb-1">Possible Solutions:</p>
          <ul className="text-xs text-muted-foreground space-y-1 pl-4 list-disc">
            {painPoint.possibleSolutions.map((solution, index) => (
              <li key={index}>{solution}</li>
            ))}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
});
PainPointCard.displayName = 'PainPointCard';

// Review card component
const ReviewCard = memo(({
  review
}: {
  review: Review & { sentiment?: 'positive' | 'negative' | 'neutral' | 'mixed' }
}) => {
  const sentimentColors = {
    positive: 'bg-green-500/20 text-green-600',
    negative: 'bg-red-500/20 text-red-600',
    neutral: 'bg-blue-500/20 text-blue-600',
    mixed: 'bg-purple-500/20 text-purple-600'
  };

  return (
    <Card className="review-card">
      <CardContent className="p-4">
        <div className="flex justify-between items-start mb-2">
          <div className="flex items-center gap-2">
            <RatingStars rating={review.review_rating} />
            <p className="text-sm font-medium">{review.author_name}</p>
          </div>
          {review.sentiment && (
            <Badge className={sentimentColors[review.sentiment]}>
              {review.sentiment}
            </Badge>
          )}
        </div>
        
        <p className="text-sm mb-2">{review.review_text}</p>
        
        <div className="flex justify-between items-center text-xs text-muted-foreground">
          <p>Version: {review.author_app_version}</p>
          <p>{new Date(review.review_timestamp * 1000).toLocaleDateString()}</p>
        </div>
        
        {review.app_developer_reply && (
          <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs font-medium mb-1">Developer Response:</p>
            <p className="text-xs">{review.app_developer_reply}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
});
ReviewCard.displayName = 'ReviewCard';

// Main App Analytics component
const AppAnalytics: React.FC<AppAnalyticsProps> = ({ query }) => {
  const [apps, setApps] = useState<AppBasic[]>([]);
  const [appDetails, setAppDetails] = useState<App | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [analysis, setAnalysis] = useState<ReviewAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  
  // Scrolling state
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  
  // Refs for scrolling
  const appsSliderRef = useRef<HTMLDivElement>(null);
  
  // Scrolling handlers
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!appsSliderRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - appsSliderRef.current.offsetLeft);
    setScrollLeft(appsSliderRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!appsSliderRef.current) return;
    if (isDragging) {
      e.preventDefault();
      const x = e.pageX - appsSliderRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      appsSliderRef.current.scrollLeft = scrollLeft - walk;
    }
  };

  // Handle app selection
  const handleAppSelect = async (appId: string) => {
    if (appId === selectedApp) return;
    
    setSelectedApp(appId);
    setReviewsLoading(true);
    setAnalysisLoading(true);
    
    try {
      const appReviews = await getAppReviews(appId);
      setReviews(appReviews);
      
      const selectedAppInfo = apps.find(app => app.app_id === appId);
      if (selectedAppInfo) {
        const appAnalysis = await analyzeAppReviews(appId, selectedAppInfo.app_name);
        setAnalysis(appAnalysis);
      }
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to load app data',
        code: 'APP_DATA_ERROR'
      });
    } finally {
      setReviewsLoading(false);
      setAnalysisLoading(false);
    }
  };

  // Initial data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedApp(null);
        setReviews([]);
        setAnalysis(null);
        
        const appData = await searchApps(query);
        setApps(appData);
        
        if (appData.length > 0) {
          handleAppSelect(appData[0].app_id);
        }
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Failed to fetch data',
          code: 'FETCH_ERROR'
        });
      } finally {
        setLoading(false);
      }
    };

    if (query) {
      fetchData();
    }
  }, [query]);

  // Render loading state
  if (loading && !apps.length) {
    return (
      <div className="app-analytics-container space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">App Analytics</h2>
          <p className="text-sm text-muted-foreground">Searching for &quot;{query}&quot;...</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/5 rounded-lg overflow-hidden">
              <div className="p-4 flex items-center gap-3">
                <Skeleton className="w-16 h-16 rounded-lg" />
                <div className="space-y-2 flex-1">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="app-analytics-container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">App Analytics</h2>
        <p className="text-sm text-muted-foreground">Results for &quot;{query}&quot;</p>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 text-red-400 rounded-lg flex items-center gap-2">
          <AlertTriangle className="h-4 w-4" />
          <p>{error.message}</p>
        </div>
      )}

      {/* Apps carousel */}
      <div 
        className="apps-slider relative overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent"
        ref={appsSliderRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <div className="flex gap-4 py-2 px-2">
          {apps.map((app) => (
            <AppCard
              key={`app-${app.app_id}`}
              app={app}
              isSelected={selectedApp === app.app_id}
              onClick={() => handleAppSelect(app.app_id)}
            />
          ))}
        </div>
      </div>

      {/* App Analysis Section */}
      {selectedApp && (
        <div className="app-analysis-section mt-8">
          {analysisLoading ? (
            <div className="flex items-center justify-center p-12">
              <div className="flex flex-col items-center gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Analyzing app reviews...</p>
              </div>
            </div>
          ) : analysis?.success ? (
            <div className="space-y-6">
              {/* Sentiment Overview */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Sentiment Analysis</h3>
                  <p className="text-muted-foreground mb-6">{analysis.data?.analysis.overview}</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Overall sentiment */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Overall Sentiment</h4>
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center bg-gradient-to-br from-blue-400 to-blue-600 text-white font-bold text-lg">
                          {analysis.data?.analysis.sentimentAnalysis.score.toFixed(1)}
                        </div>
                        <div>
                          <Badge className={`
                            ${analysis.data?.analysis.sentimentAnalysis.overall === 'positive' ? 'bg-green-500/20 text-green-600' : ''}
                            ${analysis.data?.analysis.sentimentAnalysis.overall === 'negative' ? 'bg-red-500/20 text-red-600' : ''}
                            ${analysis.data?.analysis.sentimentAnalysis.overall === 'neutral' ? 'bg-blue-500/20 text-blue-600' : ''}
                            ${analysis.data?.analysis.sentimentAnalysis.overall === 'mixed' ? 'bg-purple-500/20 text-purple-600' : ''}
                          `}>
                            {analysis.data?.analysis.sentimentAnalysis.overall}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    
                    {/* Sentiment distribution */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Sentiment Distribution</h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Positive</span>
                            <span>{analysis.data?.analysis.sentimentAnalysis.distribution.positive}%</span>
                          </div>
                          <Progress value={analysis.data?.analysis.sentimentAnalysis.distribution.positive} className="h-2 bg-gray-200 dark:bg-gray-700">
                            <div className="h-full bg-green-500 rounded-full" />
                          </Progress>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Neutral</span>
                            <span>{analysis.data?.analysis.sentimentAnalysis.distribution.neutral}%</span>
                          </div>
                          <Progress value={analysis.data?.analysis.sentimentAnalysis.distribution.neutral} className="h-2 bg-gray-200 dark:bg-gray-700">
                            <div className="h-full bg-blue-500 rounded-full" />
                          </Progress>
                        </div>
                        <div>
                          <div className="flex justify-between text-xs mb-1">
                            <span>Negative</span>
                            <span>{analysis.data?.analysis.sentimentAnalysis.distribution.negative}%</span>
                          </div>
                          <Progress value={analysis.data?.analysis.sentimentAnalysis.distribution.negative} className="h-2 bg-gray-200 dark:bg-gray-700">
                            <div className="h-full bg-red-500 rounded-full" />
                          </Progress>
                        </div>
                      </div>
                    </div>
                    
                    {/* Key trends */}
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm">Key Trends</h4>
                      <div className="space-y-3">
                        {analysis.data?.analysis.sentimentAnalysis.trends.map((trend, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`
                                ${trend.sentiment === 'positive' ? 'bg-green-500/20 text-green-600' : ''}
                                ${trend.sentiment === 'negative' ? 'bg-red-500/20 text-red-600' : ''}
                                ${trend.sentiment === 'neutral' ? 'bg-blue-500/20 text-blue-600' : ''}
                                ${trend.sentiment === 'mixed' ? 'bg-purple-500/20 text-purple-600' : ''}
                              `}>
                                {trend.sentiment}
                              </Badge>
                              <span className="text-sm">{trend.topic}</span>
                            </div>
                            <span className="text-xs font-medium">
                              Intensity: {trend.intensity}/10
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Pain Points */}
              <div>
                <h3 className="text-xl font-bold mb-4">Key Pain Points</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {analysis.data?.analysis.painPoints.map((painPoint, index) => (
                    <PainPointCard key={index} painPoint={painPoint} />
                  ))}
                </div>
              </div>
              
              {/* User Experiences */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">User Experiences</h3>
                  <div className="space-y-4">
                    {analysis.data?.analysis.userExperiences.map((experience, index) => (
                      <div key={index} className="border-b border-gray-200 dark:border-gray-700 pb-4 last:border-0 last:pb-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-medium">{experience.scenario}</h4>
                          <Badge className={`
                            ${experience.sentiment === 'positive' ? 'bg-green-500/20 text-green-600' : ''}
                            ${experience.sentiment === 'negative' ? 'bg-red-500/20 text-red-600' : ''}
                            ${experience.sentiment === 'neutral' ? 'bg-blue-500/20 text-blue-600' : ''}
                            ${experience.sentiment === 'mixed' ? 'bg-purple-500/20 text-purple-600' : ''}
                          `}>
                            {experience.sentiment}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">{experience.impact}</p>
                        <p className="text-xs text-muted-foreground">Pattern: {experience.frequencyPattern}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              
              {/* Market Implications */}
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-xl font-bold mb-4">Market Implications</h3>
                  <div className="flex items-start gap-4">
                    <Info className="h-6 w-6 text-blue-500 flex-shrink-0 mt-1" />
                    <p className="text-muted-foreground">{analysis.data?.analysis.marketImplications}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="p-8 flex items-center justify-center">
              <p className="text-muted-foreground">
                {analysis?.error || "Couldn't load analysis. Please try again."}
              </p>
            </div>
          )}
          
          {/* Reviews Section */}
          <div className="mt-8">
            <h3 className="text-xl font-bold mb-4">Recent Reviews</h3>
            {reviewsLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[...Array(4)].map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-20" />
                      </div>
                      <Skeleton className="h-16 w-full" />
                      <div className="flex justify-between">
                        <Skeleton className="h-3 w-24" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : reviews.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.slice(0, 4).map((review) => (
                  <ReviewCard 
                    key={review.review_id} 
                    review={{
                      ...review,
                      sentiment: analysis?.data?.sources.find(source => 
                        source.content === review.review_text
                      )?.sentiment
                    }} 
                  />
                ))}
              </div>
            ) : (
              <div className="p-8 flex items-center justify-center">
                <p className="text-muted-foreground">No reviews available.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

AppAnalytics.displayName = 'AppAnalytics';

export default memo(AppAnalytics);