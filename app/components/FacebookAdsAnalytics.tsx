"use client";

import React, { useState, useEffect, memo } from 'react';
import Image from 'next/image';
import { MetaAdAnalysisService } from '@/app/api/facebookAnalytics';
import { 
  MessageSquare, Eye, Target, 
  Users, Award, ArrowRight, Sparkles,
  ImageIcon, ChevronLeft, ChevronRight, Play, Video 
} from 'lucide-react';
import { Progress } from "@/app/components/ui/progress"; 

// Updated Types to match the API structure
interface MediaUrl {
  original?: string;
  resized?: string;
  watermarked?: string;
  preview?: string;
  type: 'image' | 'video_preview';
}

interface VideoUrl {
  hd?: string;
  sd?: string;
  watermarked_hd?: string;
  watermarked_sd?: string;
  preview_image?: string;
}

interface MetaAdContent {
  adId: string;
  pageId: string;
  pageName: string;
  content: string;
  title?: string;
  images: MediaUrl[];
  videos: VideoUrl[];
  linkUrl?: string;
  active: boolean;
  creationTime?: string;
}

interface MessagingStrategy {
  strategy: string;
  description: string;
  prevalence: number;
  effectiveness: number;
  examples: string[];
}

interface VisualTactic {
  tactic: string;
  implementation: string;
  impact: string;
  frequencyOfUse: number;
}

interface AudienceTargeting {
  segment: string;
  approach: string;
  intensity: number;
  engagementPotential: string;
}

interface CallToActionEffectiveness {
  cta: string;
  context: string;
  strength: number;
  conversionPotential: string;
}

interface AnalysisData {
  overview: string;
  messagingStrategies: MessagingStrategy[];
  visualTactics: VisualTactic[];
  audienceTargeting: AudienceTargeting[];
  competitiveAdvantage: string;
  callToActionEffectiveness: CallToActionEffectiveness[];
  recommendedCounterStrategies: string;
}

interface AnalysisResult {
  analysis: AnalysisData;
  sources: MetaAdContent[];
  timestamp: string;
}

interface MetaAdAnalysisProps {
  keyword: string;
  countryCode?: string;
  platform?: string;
  adType?: string;
  limit?: number;
  className?: string;
}

// Skeleton Components
const SkeletonCard = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg animate-pulse">
    <div className="h-6 bg-white/20 rounded mb-4 w-3/4"></div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-white/15 rounded w-full"></div>
      <div className="h-4 bg-white/15 rounded w-5/6"></div>
      <div className="h-4 bg-white/15 rounded w-4/5"></div>
    </div>
    <div className="h-2 bg-white/15 rounded mb-2"></div>
    <div className="h-3 bg-white/15 rounded w-1/2"></div>
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

const SkeletonParagraph = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 animate-pulse">
    <div className="space-y-3">
      <div className="h-4 bg-white/15 rounded w-full"></div>
      <div className="h-4 bg-white/15 rounded w-11/12"></div>
      <div className="h-4 bg-white/15 rounded w-10/12"></div>
      <div className="h-4 bg-white/15 rounded w-full"></div>
      <div className="h-4 bg-white/15 rounded w-9/12"></div>
    </div>
  </div>
));
SkeletonParagraph.displayName = 'SkeletonParagraph';

const SkeletonSourceAd = memo(() => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 animate-pulse">
    <div className="h-64 bg-white/15 rounded-md mb-4"></div>
    <div className="h-5 bg-white/20 rounded mb-2 w-3/4"></div>
    <div className="space-y-2 mb-4">
      <div className="h-4 bg-white/15 rounded w-full"></div>
      <div className="h-4 bg-white/15 rounded w-5/6"></div>
    </div>
    <div className="flex justify-between items-center">
      <div className="h-4 bg-white/15 rounded w-1/3"></div>
      <div className="h-4 bg-white/15 rounded w-1/4"></div>
    </div>
  </div>
));
SkeletonSourceAd.displayName = 'SkeletonSourceAd';

// Media Item Component for handling both images and videos
const MediaItem = memo(({ 
  media, 
  isVideo = false,
  adTitle,
  pageName,
  onError 
}: { 
  media: MediaUrl | VideoUrl;
  isVideo?: boolean;
  adTitle?: string;
  pageName: string;
  onError?: () => void;
}) => {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Get the best available URL for display
  const getDisplayUrl = () => {
    if (isVideo) {
      const videoMedia = media as VideoUrl;
      return (
        videoMedia.preview_image ||
        videoMedia.hd ||
        videoMedia.sd ||
        videoMedia.watermarked_hd ||
        videoMedia.watermarked_sd
      );
    } else {
      const imageMedia = media as MediaUrl;
      return (
        imageMedia.original ||
        imageMedia.resized ||
        imageMedia.watermarked ||
        imageMedia.preview
      );
    }
  };

  const displayUrl = getDisplayUrl();

  if (!displayUrl || hasError) {
    return (
      <div className="relative w-full h-64 bg-gray-800 flex items-center justify-center rounded-md">
        <div className="flex flex-col items-center gap-2 opacity-40">
          {isVideo ? <Video className="w-12 h-12" /> : <ImageIcon className="w-12 h-12" />}
          <span className="text-sm">Media unavailable</span>
        </div>
      </div>
    );
  }

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
    onError?.();
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className="relative w-full h-64 rounded-md overflow-hidden group">
      {isLoading && (
        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white opacity-50" />
        </div>
      )}
      
      {isVideo && 'hd' in media && (media.hd || media.sd) ? (
        // For actual video files, show video element
        <video
          className="w-full h-full object-cover"
          poster={(media as VideoUrl).preview_image}
          controls
          preload="metadata"
          onError={handleError}
          onLoadedData={handleLoad}
        >
          {(media as VideoUrl).hd && (
            <source src={(media as VideoUrl).hd} type="video/mp4" />
          )}
          {(media as VideoUrl).sd && (
            <source src={(media as VideoUrl).sd} type="video/mp4" />
          )}
          Your browser does not support the video tag.
        </video>
      ) : (
        <>
          <Image 
            src={displayUrl} 
            alt={adTitle || `${isVideo ? 'Video' : 'Image'} from ${pageName}`} 
            fill
            style={{ objectFit: 'cover' }}
            className="rounded-md"
            onError={handleError}
            onLoad={handleLoad}
            unoptimized
          />
          
          {isVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <div className="bg-black/60 rounded-full p-3">
                <Play className="w-8 h-8 text-white fill-white" />
              </div>
            </div>
          )}
        </>
      )}
      
      <div className="absolute top-2 left-2 bg-black/60 px-2 py-1 rounded text-xs">
        {isVideo ? 'Video' : 'Image'}
      </div>
    </div>
  );
});
MediaItem.displayName = 'MediaItem';

// Enhanced Media Carousel Component
const MediaCarousel = memo(({ 
  images,
  videos,
  adTitle,
  pageName 
}: { 
  images: MediaUrl[];
  videos: VideoUrl[];
  adTitle?: string;
  pageName: string;
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [failedIndices, setFailedIndices] = useState<Set<number>>(new Set());

  const allMedia: Array<{item: MediaUrl | VideoUrl, isVideo: boolean}> = [
    ...images.map(img => ({ item: img, isVideo: false })),
    ...videos.map(vid => ({ item: vid, isVideo: true }))
  ];

  const availableMedia = allMedia.filter((_, index) => !failedIndices.has(index));

  if (availableMedia.length === 0) {
    return (
      <div className="relative w-full h-64 bg-gray-800 flex items-center justify-center rounded-md">
        <div className="flex flex-col items-center gap-2 opacity-40">
          <ImageIcon className="w-12 h-12" />
          <span className="text-sm">No media available</span>
        </div>
      </div>
    );
  }

  const nextMedia = () => {
    setCurrentIndex((prev) => (prev + 1) % availableMedia.length);
  };

  const prevMedia = () => {
    setCurrentIndex((prev) => (prev - 1 + availableMedia.length) % availableMedia.length);
  };

  const handleMediaError = (originalIndex: number) => {
    setFailedIndices(prev => new Set([...prev, originalIndex]));
    if (originalIndex === currentIndex && availableMedia.length > 1) {
      nextMedia();
    }
  };

  const safeCurrentIndex = Math.min(currentIndex, availableMedia.length - 1);
  const currentMedia = availableMedia[safeCurrentIndex];

  return (
    <div className="relative">
      <MediaItem
        media={currentMedia.item}
        isVideo={currentMedia.isVideo}
        adTitle={adTitle}
        pageName={pageName}
        onError={() => handleMediaError(allMedia.findIndex(m => m === currentMedia))}
      />
      
      {availableMedia.length > 1 && (
        <>
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {availableMedia.map((_, idx) => (
              <button 
                key={idx} 
                className={`w-2 h-2 rounded-full ${idx === safeCurrentIndex ? 'bg-white' : 'bg-white/50'}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`Go to media ${idx + 1}`}
              />
            ))}
          </div>
          
          <button
            onClick={prevMedia}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Previous media"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          
          <button
            onClick={nextMedia}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Next media"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}
      
      <div className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded text-xs">
        {safeCurrentIndex + 1}/{availableMedia.length}
      </div>
    </div>
  );
});
MediaCarousel.displayName = 'MediaCarousel';

// Enhanced Analysis Card Component
const AnalysisCard = memo(({ 
  title, 
  content, 
  metric,
  metricLabel,
  secondMetric,
  secondMetricLabel,
  items 
}: { 
  title: string;
  content: string;
  metric?: number;
  metricLabel?: string;
  secondMetric?: number;
  secondMetricLabel?: string;
  items?: string[];
}) => (
  <div className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg hover:bg-white/15 transition-colors duration-200 h-full flex flex-col">
    <h3 className="text-xl font-semibold mb-4 text-white">{title}</h3>
    <p className="mb-4 text-gray-200 flex-grow leading-relaxed">{content}</p>
    
    <div className="mt-auto space-y-3">
      {metric !== undefined && (
        <div className="space-y-2">
          <Progress value={metric * 10} className="h-2" />
          <span className="text-sm text-gray-300">
            {metricLabel}: {metric}/10
          </span>
        </div>
      )}
      
      {secondMetric !== undefined && (
        <div className="space-y-2">
          <Progress value={secondMetric * 10} className="h-2" />
          <span className="text-sm text-gray-300">
            {secondMetricLabel}: {secondMetric}/10
          </span>
        </div>
      )}
      
      {items && items.length > 0 && (
        <ul className="space-y-1 text-sm text-gray-300">
          {items.map((item, index) => (
            <li key={index} className="flex items-start gap-2">
              <span className="text-blue-400 mt-1">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
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
  <div className="flex items-center gap-3 text-2xl font-bold mb-6 text-white">
    <div className="text-blue-400">{icon}</div>
    {title}
  </div>
));
SectionHeader.displayName = 'SectionHeader';

// Main Component
const MetaAdAnalysisDashboard: React.FC<MetaAdAnalysisProps> = ({ 
  keyword,
  countryCode = 'US',
  platform = 'facebook,instagram',
  adType = 'all',
  limit = 10,
  className = '' 
}) => {
  const [state, setState] = useState<{
    loading: boolean;
    error?: string;
    data?: AnalysisResult;
  }>({
    loading: true
  });

  useEffect(() => {
    const fetchAnalysis = async () => {
      if (!keyword) return;

      setState(prev => ({ ...prev, loading: true }));

      try {
        const result = await MetaAdAnalysisService.analyzeCompetitorAds(
          keyword,
          countryCode,
          platform,
          adType,
          limit
        );
        
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
          error: error instanceof Error ? error.message : 'Failed to analyze Meta ads'
        });
      }
    };

    fetchAnalysis();
  }, [keyword, countryCode, platform, adType, limit]);

  if (state.loading) {
    return (
      <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
        <header className="mb-8">
          <div className="h-8 bg-white/20 rounded mb-4 w-1/2 animate-pulse"></div>
          <div className="h-6 bg-white/15 rounded w-1/3 animate-pulse"></div>
        </header>

        <div className="space-y-8">
          {/* Overview Skeleton */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-white/20 rounded animate-pulse"></div>
              <div className="h-6 bg-white/20 rounded w-32 animate-pulse"></div>
            </div>
            <SkeletonParagraph />
          </section>

          {/* Cards Skeletons */}
          {['Messaging Strategies', 'Visual Tactics', 'Audience Targeting', 'Call to Action Effectiveness'].map((section) => (
            <section key={section}>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-6 h-6 bg-white/20 rounded animate-pulse"></div>
                <div className="h-6 bg-white/20 rounded w-48 animate-pulse"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(3)].map((_, i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            </section>
          ))}

          {/* Competitive Advantage Skeleton */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-white/20 rounded animate-pulse"></div>
              <div className="h-6 bg-white/20 rounded w-56 animate-pulse"></div>
            </div>
            <SkeletonParagraph />
          </section>

          {/* Source Ads Skeleton */}
          <section>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-6 h-6 bg-white/20 rounded animate-pulse"></div>
              <div className="h-6 bg-white/20 rounded w-32 animate-pulse"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <SkeletonSourceAd key={i} />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center">
          <div className="bg-red-500/20 backdrop-blur-lg rounded-lg p-6 border border-red-500/30">
            <h2 className="text-xl font-semibold text-red-400 mb-2">Analysis Failed</h2>
            <p className="text-red-300">{state.error}</p>
          </div>
        </div>
      </div>
    );
  }

  if (!state.data) {
    return null;
  }

  const { data } = state;

  return (
    <div className={`max-w-7xl mx-auto px-4 py-8 ${className}`}>
      <header className="mb-8 text-left">
        <h1 className="text-4xl font-bold mb-4 text-white">Meta Ad Competitor Analysis</h1>
        <p className="text-xl text-gray-300">Analysis for: <span className="text-blue-400 font-semibold">{keyword}</span></p>
      </header>

      <div className="space-y-12">
        {/* Overview Section */}
        <section>
          <SectionHeader 
            icon={<Target className="w-7 h-7" />} 
            title="Overview" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 shadow-lg">
            <div className="prose prose-lg max-w-none text-gray-200 leading-relaxed">
              {data.analysis.overview}
            </div>
          </div>
        </section>

        {/* Messaging Strategies */}
        <section>
          <SectionHeader 
            icon={<MessageSquare className="w-7 h-7" />} 
            title="Messaging Strategies" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.messagingStrategies.map((strategy, index) => (
              <AnalysisCard
                key={`strategy-${index}`}
                title={strategy.strategy}
                content={strategy.description}
                metric={strategy.prevalence}
                metricLabel="Prevalence"
                secondMetric={strategy.effectiveness}
                secondMetricLabel="Effectiveness"
                items={strategy.examples}
              />
            ))}
          </div>
        </section>

        {/* Visual Tactics */}
        <section>
          <SectionHeader 
            icon={<Eye className="w-7 h-7" />} 
            title="Visual Tactics" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.visualTactics.map((tactic, index) => (
              <AnalysisCard
                key={`tactic-${index}`}
                title={tactic.tactic}
                content={tactic.implementation}
                metric={tactic.frequencyOfUse}
                metricLabel="Frequency of Use"
                items={[`Impact: ${tactic.impact}`]}
              />
            ))}
          </div>
        </section>

        {/* Audience Targeting */}
        <section>
          <SectionHeader 
            icon={<Users className="w-7 h-7" />} 
            title="Audience Targeting" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.audienceTargeting.map((audience, index) => (
              <AnalysisCard
                key={`audience-${index}`}
                title={audience.segment}
                content={audience.approach}
                metric={audience.intensity}
                metricLabel="Targeting Intensity"
                items={[`Engagement Potential: ${audience.engagementPotential}`]}
              />
            ))}
          </div>
        </section>

        {/* Competitive Advantage */}
        <section>
          <SectionHeader 
            icon={<Award className="w-7 h-7" />} 
            title="Competitive Advantage" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 shadow-lg">
            <div className="prose prose-lg max-w-none text-gray-200 leading-relaxed">
              {data.analysis.competitiveAdvantage}
            </div>
          </div>
        </section>

        {/* Call to Action Effectiveness */}
        <section>
          <SectionHeader 
            icon={<ArrowRight className="w-7 h-7" />} 
            title="Call to Action Effectiveness" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.analysis.callToActionEffectiveness.map((cta, index) => (
              <AnalysisCard
                key={`cta-${index}`}
                title={cta.cta}
                content={cta.context}
                metric={cta.strength}
                metricLabel="Strength"
                items={[`Conversion Potential: ${cta.conversionPotential}`]}
              />
            ))}
          </div>
        </section>

        {/* Recommended Counter Strategies */}
        <section>
          <SectionHeader 
            icon={<Sparkles className="w-7 h-7" />} 
            title="Recommended Counter Strategies" 
          />
          <div className="bg-white/10 backdrop-blur-lg rounded-lg p-8 shadow-lg">
            <div className="prose prose-lg max-w-none text-gray-200 leading-relaxed">
              {data.analysis.recommendedCounterStrategies}
            </div>
          </div>
        </section>

        {/* Source Ads */}
        <section>
          <SectionHeader 
            icon={<Target className="w-7 h-7" />} 
            title="Source Ads" 
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.sources.map((ad, index) => (
              <div key={`ad-${index}`} className="bg-white/10 backdrop-blur-lg rounded-lg p-6 shadow-lg hover:bg-white/15 transition-colors duration-200 flex flex-col">
                {((ad.images && ad.images.length > 0) || (ad.videos && ad.videos.length > 0)) && (
                  <div className="mb-4">
                    <MediaCarousel 
                      images={ad.images || []} 
                      videos={ad.videos || []}
                      adTitle={ad.title} 
                      pageName={ad.pageName} 
                    />
                  </div>
                )}
                
                <div className="flex-grow">
                  {ad.title && (
                    <h4 className="font-semibold mb-3 text-white text-lg">{ad.title}</h4>
                  )}
                  <p className="mb-4 text-gray-200 leading-relaxed">{ad.content}</p>
                  
                  {((ad.images?.length || 0) + (ad.videos?.length || 0)) > 0 && (
                    <div className="text-xs text-gray-400 mb-3 flex items-center gap-4">
                      <span className="flex items-center gap-1">
                        <ImageIcon className="w-3 h-3" />
                        {ad.images?.length || 0} image(s)
                      </span>
                      <span className="flex items-center gap-1">
                        <Video className="w-3 h-3" />
                        {ad.videos?.length || 0} video(s)
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-auto pt-4 border-t border-white/10">
                  <div className="flex justify-between items-center text-sm mb-2">
                    <span className="text-blue-400 font-medium">
                      {ad.pageName}
                    </span>
                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-1 rounded text-xs ${ad.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                        {ad.active ? "Active" : "Inactive"}
                      </span>
                      {ad.linkUrl && (
                        <a 
                          href={ad.linkUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 transition-colors flex items-center gap-1"
                        >
                          <span>View</span>
                          <ArrowRight className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                  {ad.creationTime && (
                    <div className="text-xs text-gray-400">
                      Created: {new Date(ad.creationTime).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <footer className="text-sm text-gray-400 text-right mt-12 pt-8 border-t border-white/10">
        Last updated: {new Date(data.timestamp).toLocaleString()}
      </footer>
    </div>
  );
};

MetaAdAnalysisDashboard.displayName = 'MetaAdAnalysisDashboard';

export default memo(MetaAdAnalysisDashboard);