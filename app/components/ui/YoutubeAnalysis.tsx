import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import { Eye, ThumbsUp, MessageSquare, Loader2, ChevronRight } from 'lucide-react';
import { YouTubeVideo, VideoStatistics, ErrorState } from 'app/types/youtube';
import { searchYouTubeVideos, getVideoStatistics } from '@/app/api/youtube';
import { Card, CardContent } from '@/app/components/ui/card';

// Ensure VideoStatistics type is strict
const ensureVideoStatistics = (stats: Partial<VideoStatistics>): VideoStatistics => ({
  viewCount: stats.viewCount || '0',
  likeCount: stats.likeCount || '0',
  commentCount: stats.commentCount || '0'
});

const YouTubeVideos: React.FC<{ query: string }> = ({ query }) => {
  const [videos, setVideos] = useState<YouTubeVideo[]>([]);
  const [statistics, setStatistics] = useState<Record<string, VideoStatistics>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [nextPageToken, setNextPageToken] = useState<string | undefined>();
  
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [startX, setStartX] = useState<number>(0);
  const [scrollLeft, setScrollLeft] = useState<number>(0);
  
  const videosSliderRef = useRef<HTMLDivElement>(null);
  const videosTrackRef = useRef<HTMLDivElement>(null);

  const formatNumber = (num: string) => {
    const n = parseInt(num);
    if (isNaN(n)) return 'N/A';
    if (n >= 1000000) return `${(n/1000000).toFixed(1)}M`;
    if (n >= 1000) return `${(n/1000).toFixed(1)}K`;
    return n.toString();
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videosSliderRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - videosSliderRef.current.offsetLeft);
    setScrollLeft(videosSliderRef.current.scrollLeft);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    if (videosTrackRef.current) {
      videosTrackRef.current.style.transform = "translateX(0px)";
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!videosSliderRef.current || !videosTrackRef.current) return;
    if (isDragging) {
      e.preventDefault();
      const x = e.pageX - videosSliderRef.current.offsetLeft;
      const walk = (x - startX) * 2;
      videosSliderRef.current.scrollLeft = scrollLeft - walk;
    } else {
      const slider = videosSliderRef.current;
      const track = videosTrackRef.current;
      const sliderWidth = slider.offsetWidth;
      const trackWidth = track.scrollWidth;
      const maxScroll = trackWidth - sliderWidth;
      const mouseX = e.clientX - slider.getBoundingClientRect().left;
      const percentage = mouseX / sliderWidth;
      const scrollAmount = percentage * maxScroll;
      track.style.transform = `translateX(-${scrollAmount}px)`;
    }
  };

  const loadMoreVideos = async () => {
    if (!nextPageToken) return;
    try {
      const data = await searchYouTubeVideos(query, nextPageToken);
      const newVideos = [...videos, ...data.items];
      setVideos(newVideos);
      setNextPageToken(data.nextPageToken);

      const newVideoIds = data.items.map(video => video.id.videoId);
      const newStats = await getVideoStatistics(newVideoIds);
      
      // Use functional update with type-safe conversion
      setStatistics(prevStats => {
        const updatedStats: Record<string, VideoStatistics> = { ...prevStats };
        Object.entries(newStats).forEach(([key, value]) => {
          updatedStats[key] = ensureVideoStatistics(value);
        });
        return updatedStats;
      });
    } catch (err) {
      setError({
        message: err instanceof Error ? err.message : 'Failed to load more videos',
        code: 'LOAD_MORE_ERROR'
      });
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const data = await searchYouTubeVideos(query);
        setVideos(data.items);
        setNextPageToken(data.nextPageToken);

        const videoIds = data.items.map(video => video.id.videoId);
        const stats = await getVideoStatistics(videoIds);
        
        // Convert stats to strict VideoStatistics type
        const processedStats: Record<string, VideoStatistics> = {};
        Object.entries(stats).forEach(([key, value]) => {
          processedStats[key] = ensureVideoStatistics(value);
        });
        
        setStatistics(processedStats);
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

  if (loading && !videos.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin" size={40} />
      </div>
    );
  }

  return (
    <div className="youtube-videos-container space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">YouTube Videos</h2>
        <div className="flex items-center">
          <p className="text-sm text-muted-foreground mr-2">Scroll, drag, or hover to explore</p>
          {nextPageToken && (
            <button
              onClick={loadMoreVideos}
              disabled={loading}
              className="flex items-center text-sm text-primary hover:bg-primary/10 p-2 rounded-md transition-colors"
            >
              Load More <ChevronRight className="ml-1 h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-700 rounded-lg">
          <p>{error.message}</p>
        </div>
      )}

      <div 
        className="youtube-videos-slider"
        ref={videosSliderRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        onMouseMove={handleMouseMove}
      >
        <div 
          className="youtube-videos-track flex gap-4 py-4 px-8"
          ref={videosTrackRef}
        >
          {videos.map((video) => (
            <Card
              key={`youtube-video-${video.id.videoId}`}
              className={`youtube-video-card flex-shrink-0 w-72 cursor-pointer snap-start transition-shadow hover:shadow-lg
                ${selectedVideo === video.id.videoId ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setSelectedVideo(video.id.videoId)}
            >
              <CardContent className="p-0">
                <div className="relative w-full h-40">
                  <Image
                    src={video.snippet.thumbnails.medium.url}
                    alt={video.snippet.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    className="object-cover"
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold line-clamp-2">{video.snippet.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{video.snippet.channelTitle}</p>
                  <div className="flex gap-4 mt-2">
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">{formatNumber(statistics[video.id.videoId]?.viewCount || '0')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-4 w-4" />
                      <span className="text-sm">{formatNumber(statistics[video.id.videoId]?.likeCount || '0')}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-4 w-4" />
                      <span className="text-sm">{formatNumber(statistics[video.id.videoId]?.commentCount || '0')}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default YouTubeVideos;