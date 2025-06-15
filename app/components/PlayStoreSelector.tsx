"use client";

import React, { useEffect, useState, useRef, memo } from 'react';
import Image from 'next/image';
import {
  ChevronRight,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import { searchApps } from '@/app/api/playstoreAnalyticsApi'; 
import { Skeleton } from "@/app/components/ui/skeleton";
import AppAnalysis from '@/app/components/PlayStoreAnalysis';
import type { AppBasic } from '@/app/api/playstoreAnalyticsApi';

// Error state interface
interface ErrorState {
  message: string;
  code: string;
}

// Props interface for the component
interface AppSelectionProps {
  query: string;
}

// Loading skeleton component for apps
const AppCardSkeleton = memo(() => (
  <div className="flex-shrink-0 w-32 snap-start">
    <div className="flex flex-col items-center gap-2 p-2">
      <Skeleton className="w-20 h-20 rounded-xl" />
      <div className="w-full space-y-1">
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-2 w-3/4 mx-auto" />
      </div>
    </div>
  </div>
));
AppCardSkeleton.displayName = 'AppCardSkeleton';

// AppCard component with glassmorphism styling
const AppCard = memo(({ 
  app, 
  isSelected, 
  onClick 
}: { 
  app: AppBasic, 
  isSelected: boolean,
  onClick: () => void
}) => (
  <div
    className={`flex-shrink-0 w-32 cursor-pointer snap-start transition-all duration-300 hover:scale-105
      ${isSelected ? 'transform scale-105' : ''}`}
    onClick={onClick}
  >
    <div className="flex flex-col items-center gap-2 p-2">
      <div className={`relative w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden transition-all duration-300
        ${isSelected 
          ? 'ring-2 ring-white/30 ring-offset-2 ring-offset-transparent shadow-xl shadow-white/10' 
          : 'hover:shadow-lg hover:ring-1 hover:ring-white/20'
        }`}>
        <Image
          src={app.app_icon}
          alt={app.app_name}
          fill
          sizes="80px"
          className="object-cover"
        />
        {/* Selection indicator overlay */}
        {isSelected && (
          <div className="absolute inset-0 bg-white/10 backdrop-blur-sm flex items-center justify-center">
            <div className="w-6 h-6 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center border border-white/30">
              <svg 
                className="w-3 h-3 text-white" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                />
              </svg>
            </div>
          </div>
        )}
      </div>
      <div className="text-center min-w-0 w-full">
        <h3 className={`font-medium text-xs line-clamp-2 transition-colors duration-300
          ${isSelected ? 'text-white font-semibold' : 'text-white/80 hover:text-white'}`}>
          {app.app_name}
        </h3>
      </div>
    </div>
  </div>
));
AppCard.displayName = 'AppCard';

// Main App Selection component
const AppSelection: React.FC<AppSelectionProps> = ({ query }) => {
  const [apps, setApps] = useState<AppBasic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<ErrorState | null>(null);
  const [selectedApp, setSelectedApp] = useState<string | null>(null);
  const [appSelectionComplete, setAppSelectionComplete] = useState<boolean>(false);
  
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
  const handleAppSelect = (appId: string) => {
    if (appId === selectedApp && appSelectionComplete) return;
    setSelectedApp(appId);
  };
  
  // Handle proceeding to analysis after app selection
  const handleProceedToAnalysis = async () => {
    if (!selectedApp) return;
    setAppSelectionComplete(true);
  };
  
  // Handle going back to app selection
  const handleBackToSelection = () => {
    setAppSelectionComplete(false);
  };

  // Initial data fetching
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        setSelectedApp(null);
        setAppSelectionComplete(false);
        
        const appData = await searchApps(query);
        setApps(appData);
        
        if (appData.length > 0) {
          setSelectedApp(appData[0].app_id);
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

  // Scroll to left and right buttons for app slider
  const scrollLeftBtn = () => {
    if (appsSliderRef.current) {
      appsSliderRef.current.scrollBy({ left: -256, behavior: 'smooth' });
    }
  };

  const scrollRightBtn = () => {
    if (appsSliderRef.current) {
      appsSliderRef.current.scrollBy({ left: 256, behavior: 'smooth' });
    }
  };

  // Render loading state
  if (loading && !apps.length) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6">
        <header className="mb-6">
          <h1 className="text-3xl font-bold mb-2">App Analytics</h1>
          <p className="text-lg opacity-70">Searching for: <span className="font-medium text-white">&quot;{query}&quot;</span></p>
        </header>

        <div className="space-y-8">
          <section className="mb-6">
            <Skeleton className="h-7 w-56 mb-3" />
            <Skeleton className="h-5 w-80" />
          </section>

          {/* Glassmorphism card container for loading */}
          <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="relative">
              <div className="apps-slider mx-6 px-2">
                <div className="flex gap-4 py-4">
                  {[...Array(6)].map((_, i) => (
                    <AppCardSkeleton key={i} />
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-center mt-6">
            <Skeleton className="h-10 w-40 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  // If app analysis is selected, show the Analysis component
  if (appSelectionComplete && selectedApp) {
    return (
      <AppAnalysis 
        appId={selectedApp} 
        appName={apps.find(app => app.app_id === selectedApp)?.app_name || ''} 
        onBackToSelection={handleBackToSelection} 
      />
    );
  }

  // Otherwise show the selection UI
  return (
    <div className="max-w-6xl mx-auto px-4 py-6">
      <header className="mb-6">
        <h1 className="text-3xl font-bold mb-2">App Analytics</h1>
        <p className="text-lg opacity-70">Results for: <span className="font-medium text-white">&quot;{query}&quot;</span></p>
      </header>

      <div className="space-y-8">
        {error && (
          <div className="p-3 bg-red-500/10 backdrop-blur-sm text-red-400 rounded-xl flex items-center gap-2 mb-4 border border-red-500/20">
            <AlertTriangle className="h-4 w-4" />
            <p>{error.message}</p>
          </div>
        )}

        <section className="mb-6">
          <h2 className="text-2xl font-bold mb-3">Select an app to analyze</h2>
          <p className="text-lg opacity-70">
            Choose an app below to analyze its reviews and get comprehensive insights.
          </p>
        </section>
      
        {/* Glassmorphism card container for apps */}
        <div className="relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-2xl">
          <button 
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 rounded-full flex items-center justify-center border border-white/20 shadow-lg"
            onClick={scrollLeftBtn}
          >
            <ChevronRight className="h-4 w-4 rotate-180 text-white/80" />
          </button>
          
          <div 
            className="apps-slider relative overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent mx-6 px-2"
            ref={appsSliderRef}
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onMouseMove={handleMouseMove}
          >
            <div className="flex gap-4 py-4 px-2">
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
          
          <button 
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-8 h-8 bg-white/10 backdrop-blur-sm hover:bg-white/20 transition-all duration-200 rounded-full flex items-center justify-center border border-white/20 shadow-lg"
            onClick={scrollRightBtn}
          >
            <ChevronRight className="h-4 w-4 text-white/80" />
          </button>
        </div>
        
        {/* Glassmorphism analyze button */}
        {selectedApp && (
          <div className="flex justify-center mt-6">
            <button 
              onClick={handleProceedToAnalysis}
              className="px-8 py-3 text-base font-medium flex items-center gap-3 hover:scale-105 transition-all duration-300 bg-white/10 backdrop-blur-sm border border-white/20 rounded-xl shadow-lg hover:bg-white/15 hover:shadow-xl hover:border-white/30 text-white"
            >
              Analyze Selected App
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default memo(AppSelection);