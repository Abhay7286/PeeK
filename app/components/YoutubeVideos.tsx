"use client";
import React, { useEffect, useState, useRef, memo, MouseEvent } from 'react';
import Image from 'next/image';
import { 
  Eye, 
  ThumbsUp, 
  MessageSquare, 
  Loader2, 
  ChevronRight,
  AlertTriangle,
  Play,
  BarChart2
} from 'lucide-react';
import CommentAnalysis from '@/app/components/YoutubeAnalytics';

// Import API functions and types
import { 
  searchYouTubeVideos, 
  getVideoComments,
  analyzeVideoComments,
  type YouTubeVideo,
  type VideoStatistics,
  type CommentThreadResponse,
  type CommentThread
} from '@/app/api/youtubeAnalytics';

interface ErrorState {
  message: string;
  code: string;
}

interface YouTubeVideosProps {
  query: string;
}

interface VideoCardProps {
  video: YouTubeVideo;
  isSelected: boolean;
  onClick: () => void;
}

interface CommentItemProps {
  comment: CommentThread;
}

// Match the exact types from the CommentAnalysis component
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

// Define the API response structure (what we get from the API)
interface APIPainPoint {
  title: string;
  description: string;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  frequency: number;
  impact: number;
  possibleSolutions?: string[];
}

interface APIUserExperience {
  experience?: string;
  scenario?: string;
  count?: number;
  frequency?: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  impact: string | number;
  frequencyPattern: string;
}

interface APIEmotionalTrigger {
  trigger: string;
  emotion?: string;
  dominantEmotion?: string;
  impact?: 'high' | 'medium' | 'low';
  intensity?: number;
  frequency?: number;
  context?: string;
  responsePattern?: string;
}

interface APIAnalysisData {
  overview: string;
  painPoints: APIPainPoint[];
  userExperiences: APIUserExperience[];
  emotionalTriggers: APIEmotionalTrigger[];
  marketImplications: string;
}

interface APICommentAnalysisResponse {
  success: boolean;
  data?: {
    analysis: APIAnalysisData;
  };
  error?: string;
}

interface ResourceId {
  videoId?: string;
}

interface VideoId {
  videoId?: string;
  kind?: string;
}

function getVideoId(item: YouTubeVideo): string | null {
  if (typeof item.id === 'string') return item.id;
  
  if (item.id && typeof item.id === 'object') {
    const videoIdObj = item.id as VideoId;
    if ('videoId' in videoIdObj && typeof videoIdObj.videoId === 'string') {
      return videoIdObj.videoId;
    }
    if ('kind' in videoIdObj && videoIdObj.kind === 'youtube#video' && 'videoId' in videoIdObj) {
      return videoIdObj.videoId as string;
    }
  }
  
  if (item.snippet && 'resourceId' in item.snippet) {
    const resourceId = item.snippet.resourceId as ResourceId;
    if (resourceId && resourceId.videoId) {
      return resourceId.videoId;
    }
  }
  
  return null;
}

const YouTubeVideos: React.FC<YouTubeVideosProps> = ({ query }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [selectedVideoTitle, setSelectedVideoTitle] = useState<string>('');
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  
  const [comments, setComments] = useState<CommentThreadResponse | null>(null);
  const [commentsLoading, setCommentsLoading] = useState<boolean>(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  
  const [showAnalysis, setShowAnalysis] = useState<boolean>(false);
  const [commentAnalysis, setCommentAnalysis] = useState<CommentAnalysisData | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  
  const dragStartRef = useRef<{ x: number; scrollLeft: number } | null>(null);
  const isDraggingRef = useRef(false);
  
  const videosSliderRef = useRef<HTMLDivElement>(null);

  const ensureVideoStatistics = (stats: Partial<VideoStatistics> | undefined): VideoStatistics => ({
    viewCount: stats?.viewCount || '0',
    likeCount: stats?.likeCount || '0',
    commentCount: stats?.commentCount || '0'
  });

  const formatNumber = (num: string | number | undefined): string => {
    if (num === undefined || num === null) return 'N/A';
    const n = typeof num === 'string' ? parseInt(num, 10) : num;
    if (isNaN(n)) return 'N/A';
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
    return n.toString();
  };

  const handleMouseDown = (e: MouseEvent<HTMLDivElement>): void => {
    if (!videosSliderRef.current) return;
    
    dragStartRef.current = {
      x: e.clientX,
      scrollLeft: videosSliderRef.current.scrollLeft
    };
    isDraggingRef.current = false;
  };

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>): void => {
    if (!videosSliderRef.current || !dragStartRef.current) return;
    
    const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
    
    if (deltaX > 5) {
      isDraggingRef.current = true;
      e.preventDefault();
      const walk = (e.clientX - dragStartRef.current.x) * 2;
      videosSliderRef.current.scrollLeft = dragStartRef.current.scrollLeft - walk;
    }
  };

  const handleMouseUp = (): void => {
    dragStartRef.current = null;
  };

  const handleMouseLeave = (): void => {
    dragStartRef.current = null;
  };

  const loadMoreVideos = async (): Promise<void> => {
    if (!nextPageToken || loadingMore) return;
    try {
      setLoadingMore(true);
      const data = await searchYouTubeVideos(query, nextPageToken);
      setVideos(prev => [...prev, ...data.items]);
      setNextPageToken(data.nextPageToken);
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to load more videos',
        code: 'LOAD_MORE_ERROR'
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const fetchComments = async (videoId: string): Promise<void> => {
    if (!videoId) {
      setCommentsError('Invalid video ID');
      return;
    }
    
    setCommentsLoading(true);
    setComments(null);
    setCommentsError(null);
    
    try {
      const commentsData = await getVideoComments(videoId, 50);
      setComments(commentsData);
      
      if (!commentsData.items || commentsData.items.length === 0) {
        setCommentsError('No comments found for this video');
      }
    } catch (err) {
      setCommentsError(err instanceof Error ? err.message : 'Failed to fetch comments');
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleVideoSelect = async (video: YouTubeVideo): Promise<void> => {
    // Skip if we were dragging
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      return;
    }
    
    const videoId = getVideoId(video);
    if (!videoId) {
      setCommentsError('Unable to extract video ID');
      return;
    }
    
    // If same video is clicked again
    if (selectedVideo === videoId) {
      // Refresh comments if they failed to load
      if (commentsError) {
        await fetchComments(videoId);
      }
      return;
    }
    
    // Reset analysis state when selecting new video
    setShowAnalysis(false);
    setCommentAnalysis(null);
    setIsAnalyzing(false);
    
    setSelectedVideo(videoId);
    setSelectedVideoTitle(video.snippet.title);
    setCommentsError(null);
    setComments(null);
    
    await fetchComments(videoId);
  };

  const transformAPIResponseToExpectedFormat = (apiResponse: APICommentAnalysisResponse): CommentAnalysisData => {
    if (!apiResponse.success || !apiResponse.data) {
      return {
        success: false,
        error: apiResponse.error || 'Analysis failed'
      };
    }

    const apiAnalysis = apiResponse.data.analysis;

    // Transform pain points to match CommentAnalysis component expectations
    const painPoints: PainPoint[] = apiAnalysis.painPoints.map(point => ({
      title: point.title,
      description: point.description,
      frequency: point.frequency,
      sentiment: point.sentiment,
      possibleSolutions: point.possibleSolutions || []
    }));

    // Transform user experiences to match CommentAnalysis component expectations
    const userExperiences: UserExperience[] = apiAnalysis.userExperiences.map((exp: APIUserExperience) => ({
      scenario: exp.scenario || exp.experience || '',
      impact: typeof exp.impact === 'number' ? exp.impact.toString() : exp.impact.toString(),
      frequencyPattern: exp.frequencyPattern || 'regular',
      sentiment: exp.sentiment
    }));

    // Transform emotional triggers to match CommentAnalysis component expectations
    const emotionalTriggers: EmotionalTrigger[] = apiAnalysis.emotionalTriggers.map((trigger: APIEmotionalTrigger) => ({
      trigger: trigger.trigger,
      context: trigger.context || '',
      responsePattern: trigger.responsePattern || '',
      dominantEmotion: trigger.dominantEmotion || trigger.emotion || 'neutral',
      intensity: trigger.intensity || 0.5
    }));

    return {
      success: true,
      data: {
        analysis: {
          overview: apiAnalysis.overview,
          painPoints,
          userExperiences,
          emotionalTriggers,
          marketImplications: apiAnalysis.marketImplications
        }
      }
    };
  };

  const handleAnalyzeComments = async (): Promise<void> => {
    if (!selectedVideo || !comments?.items || comments.items.length === 0 || !selectedVideoTitle) {
      return;
    }
    
    setIsAnalyzing(true);
    setCommentAnalysis(null);
    
    try {
      // Get the API response
      const apiResponse = await analyzeVideoComments(selectedVideo, selectedVideoTitle) as APICommentAnalysisResponse;
      
      // Transform it to match the expected interface
      const transformedResult = transformAPIResponseToExpectedFormat(apiResponse);
      
      setCommentAnalysis(transformedResult);
      setShowAnalysis(true);
    } catch (err) {
      setCommentAnalysis({
        success: false,
        error: err instanceof Error ? err.message : 'Failed to analyze comments'
      });
      setShowAnalysis(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleBackToComments = (): void => {
    setShowAnalysis(false);
  };

  const VideoCard = memo<VideoCardProps>(function VideoCard({ video, isSelected, onClick }) {
    const statistics = ensureVideoStatistics(video.statistics);
    
    const handleClick = (e: React.MouseEvent): void => {
      e.stopPropagation();
      onClick();
    };
    
    return (
      <div
        className={`flex-shrink-0 w-64 cursor-pointer snap-start transition-all duration-300 hover:scale-105 rounded-xl overflow-hidden
          ${isSelected 
            ? 'bg-white/20 border border-white/30 shadow-2xl backdrop-blur-lg' 
            : 'bg-black/40 border border-white/10 hover:bg-white/10 backdrop-blur-md'
          }`}
        onClick={handleClick}
      >
        <div className="relative w-full h-32 group">
          <Image
            src={video.snippet.thumbnails.medium.url}
            alt={video.snippet.title}
            width={256}
            height={128}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-all duration-300"></div>
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
            <Play className="h-8 w-8 text-white drop-shadow-lg" fill="white" />
          </div>
          {isSelected && (
            <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded">
              Selected
            </div>
          )}
        </div>
        <div className="p-3">
          <h3 className="font-semibold line-clamp-2 text-xs text-white/90 leading-tight mb-1">
            {video.snippet.title}
          </h3>
          <p className="text-xs text-white/60 mb-2 truncate">{video.snippet.channelTitle}</p>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <Eye className="h-3 w-3 text-white/70" />
              <span className="text-xs text-white/70">{formatNumber(statistics.viewCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <ThumbsUp className="h-3 w-3 text-white/70" />
              <span className="text-xs text-white/70">{formatNumber(statistics.likeCount)}</span>
            </div>
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-white/70" />
              <span className="text-xs text-white/70">{formatNumber(statistics.commentCount)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  });

  const CommentItem = memo<CommentItemProps>(function CommentItem({ comment }) {
    const commentText = comment.snippet.topLevelComment.snippet.textDisplay;
    const likeCount = comment.snippet.topLevelComment.snippet.likeCount;
    const replyCount = comment.snippet.totalReplyCount;
    
    return (
      <div className="p-4 bg-black/30 border border-white/10 rounded-lg transition-all hover:bg-white/5 backdrop-blur-sm">
        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p 
              className="text-sm whitespace-pre-line text-white/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: commentText }}
            />
            <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
              <div className="flex items-center gap-1">
                <ThumbsUp className="h-3 w-3" />
                <span>{likeCount}</span>
              </div>
              {replyCount > 0 && (
                <div className="flex items-center gap-1">
                  <MessageSquare className="h-3 w-3" />
                  <span>{replyCount} replies</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  });

  const LoadingSkeleton = () => (
    <div className="flex gap-4 py-4">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="flex-shrink-0 w-64 bg-black/40 rounded-xl overflow-hidden animate-pulse backdrop-blur-md">
          <div className="w-full h-32 bg-white/10" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-white/10 rounded w-3/4" />
            <div className="h-2 bg-white/10 rounded w-1/2" />
            <div className="flex gap-3 mt-4">
              <div className="h-2 bg-white/10 rounded w-12" />
              <div className="h-2 bg-white/10 rounded w-12" />
              <div className="h-2 bg-white/10 rounded w-12" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  useEffect(() => {
    const fetchData = async (): Promise<void> => {
      if (!query) return;
      
      try {
        setLoading(true);
        setError(null);
        setSelectedVideo(null);
        setSelectedVideoTitle('');
        setComments(null);
        setCommentsError(null);
        setShowAnalysis(false);
        setCommentAnalysis(null);
        
        const data = await searchYouTubeVideos(query);
        setVideos(data.items);
        setNextPageToken(data.nextPageToken);
      } catch (err) {
        setError({
          message: err instanceof Error ? err.message : 'Failed to fetch data',
          code: 'FETCH_ERROR'
        });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [query]);

  // Show analysis component if active
  if (showAnalysis) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8">
        <CommentAnalysis 
          commentAnalysis={commentAnalysis}
          isAnalyzing={isAnalyzing}
          onBackToComments={handleBackToComments}
        />
      </div>
    );
  }

  if (loading && !videos.length) {
    return (
      <div className="w-full max-w-7xl mx-auto p-8 space-y-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-4xl font-bold text-red-600">YouTube Videos</h2>
          <p className="text-sm text-white/60">Searching for &quot;{query}&quot;...</p>
        </div>
        <LoadingSkeleton />
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-4xl font-bold text-red-600">YouTube Videos</h2>
        <div className="flex items-center gap-4"> 
          <p className="text-sm text-white/60">Search: &quot;{query}&quot;</p>
          <span className="text-sm text-white/40">
            {videos.length} video{videos.length !== 1 ? 's' : ''}
          </span>
      
          {nextPageToken && !loadingMore && (
            <button
              onClick={loadMoreVideos}
              disabled={loading || loadingMore}
              className="flex items-center gap-2 px-4 py-2 text-sm bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 disabled:opacity-50 transition-all backdrop-blur-sm text-white/80"
            >
              Load More <ChevronRight className="h-4 w-4" />
            </button>
          )}
          {loadingMore && (
            <div className="flex items-center gap-2 text-white/60">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Loading more...</span>
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/20 text-red-400 rounded-lg flex items-center gap-2 border border-red-500/30 backdrop-blur-sm">
          <AlertTriangle className="h-4 w-4" />
          <p>{error.message}</p>
        </div>
      )}

      <div 
        className="relative overflow-x-auto scrollbar-hide select-none"
        ref={videosSliderRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <div className="flex gap-4 py-4">
          {videos.map((video, index) => {
            const videoId = getVideoId(video);
            if (!videoId) return null;
            
            return (
              <VideoCard
                key={`youtube-video-${videoId}-${index}`}
                video={video}
                isSelected={selectedVideo === videoId}
                onClick={() => handleVideoSelect(video)}
              />
            );
          })}
        </div>
      </div>

      {selectedVideo && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-white/90">Comments</h3>
              {selectedVideoTitle && (
                <p className="text-sm text-white/60 mt-1 line-clamp-2">
                  Video: {selectedVideoTitle}
                </p>
              )}
            </div>
            <div className="flex items-center gap-4">
              {comments?.items && (
                <span className="text-sm text-white/60">
                  {comments.items.length} comment{comments.items.length !== 1 ? 's' : ''}
                </span>
              )}
              {comments?.items && comments.items.length > 0 && (
                <button
                  onClick={handleAnalyzeComments}
                  disabled={isAnalyzing}
                  className="flex items-center gap-2 px-4 py-2 text-sm bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all text-white font-medium"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <BarChart2 className="h-4 w-4" />
                      Analyze Comments
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
          
          {commentsLoading ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-white/60 mb-4">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading comments...</span>
              </div>
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-black/30 border border-white/10 rounded-lg p-4 animate-pulse backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/10 rounded w-full" />
                      <div className="h-3 bg-white/10 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : commentsError ? (
            <div className="p-8 text-center bg-black/20 border border-white/10 rounded-lg backdrop-blur-sm">
              <AlertTriangle className="h-8 w-8 mx-auto mb-3 text-red-400" />
              <p className="text-red-400 font-semibold mb-2">Error loading comments</p>
              <p className="text-white/60 text-sm mb-4">{commentsError}</p>
              <button
                onClick={() => fetchComments(selectedVideo)}
                className="mt-4 px-4 py-2 text-sm bg-white/10 border border-white/20 rounded-lg hover:bg-white/20 transition-all backdrop-blur-sm text-white/80"
              >
                Retry
              </button>
            </div>
          ) : !comments?.items || comments.items.length === 0 ? (
            <div className="p-8 text-center bg-black/20 border border-white/10 rounded-lg backdrop-blur-sm">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 text-white/40" />
              <p className="text-white/60">No comments available for this video.</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto pr-2 scrollbar-hide">
              {comments.items.slice(0, 20).map((comment) => (
                <CommentItem key={comment.id} comment={comment} />
              ))}
              {comments.items.length > 20 && (
                <p className="text-center text-sm text-white/40 pt-2">
                  Showing 20 of {comments.items.length} comments
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

YouTubeVideos.displayName = 'YouTubeVideos';

export default memo(YouTubeVideos);