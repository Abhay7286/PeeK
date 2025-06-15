import React from "react";
import ImageResult from "@/app/components/ImageResult";
import GoogleAnalytics from "@/app/components/GoogleAnalytics";
import PlayStoreAnalytics from "@/app/components/PlayStoreSelector";
import RedditAnalytics from "@/app/components/RedditAnalytics";
import YouTubeVideos from "@/app/components/YoutubeVideos";
import QuoraAnalysis from "@/app/components/QuoraAnalysis";
import XAnalytics from "@/app/components/XAnalytics";
import FacebookAdsAnalytics from "@/app/components/FacebookAdsAnalytics";
import StrategyAnalysis from "@/app/components/StrategyAnalysis";

interface QueryProps {
  query: string;
}

interface KeywordProps {
  keyword: string;
}

export type SearchComponentConfig = 
  | {
      name: string;
      component: React.ComponentType<QueryProps>;
      propType: 'query';
    }
  | {
      name: string;
      component: React.ComponentType<KeywordProps>;
      propType: 'keyword';
    };

export const SEARCH_COMPONENTS: SearchComponentConfig[] = [
  { name: 'ImageResult', component: ImageResult, propType: 'query' },
  { name: 'GoogleAnalytics', component: GoogleAnalytics, propType: 'query' },
  { name: 'PlayStoreAnalytics', component: PlayStoreAnalytics, propType: 'query' },
  { name: 'RedditAnalytics', component: RedditAnalytics, propType: 'query' },
  { name: 'YouTubeVideos', component: YouTubeVideos, propType: 'query' },
  { name: 'QuoraAnalysis', component: QuoraAnalysis, propType: 'query' },
  { name: 'XAnalytics', component: XAnalytics, propType: 'query' },
  { name: 'FacebookAdsAnalysis', component: FacebookAdsAnalytics, propType: 'keyword' },
  { name: 'StrategyAnalysis', component: StrategyAnalysis, propType: 'query' },
];