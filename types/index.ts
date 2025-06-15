// Reddit Related Types
export interface RedditPost {
  title: string;
  subreddit: string;
  upvotes: number;
  comments: number;
  body: string;
}

// Analysis Result Interfaces
export interface AnalysisResult {
  success: boolean;
  data?: {
    analysis: string;
    rawPosts: RedditPost[];
    timestamp: string;
  };
  error?: string;
}

// AI API Interfaces
export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIRequest {
  model: string;
  messages: AIMessage[];
  temperature: number;
  max_tokens: number;
}

export interface AIResponseChoice {
  index: number;
  message: {
    role: string;
    content: string;
  };
  finish_reason: string;
}

export interface AIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: AIResponseChoice[];
}

// Dataset and Visualization Types
export interface ChartDataset {
  label: string;
  data: number[];
}

export interface HistoricTrendDataset extends ChartDataset {
  borderColor?: string;
  tension?: number;
}

export interface BaseChartData {
  title: string;
  labels: string[];
}

export interface HistoricTrendData extends BaseChartData {
  datasets: HistoricTrendDataset[];
}

export interface DistributionData extends BaseChartData {
  data: number[];
}

// Comprehensive Market Analysis Structure
export interface MarketAnalysisData {
  historicTrend: HistoricTrendData;
  marketShare: DistributionData;
  sentiment: DistributionData;
  regional: DistributionData;
  demographics: DistributionData;
  priceDistribution: DistributionData;
}

// Styling and Configuration Types
export interface ChartColors {
  line: string;
  pie: string[];
  bar: string;
}

export interface ChartOptions {
  responsive: boolean;
  maintainAspectRatio: boolean;
  plugins: {
    title: {
      display: boolean;
      text: string;
    };
    legend?: {
      position: 'top' | 'right' | 'bottom' | 'left';
      labels?: {
        fontSize?: number;
      };
    };
  };
}

// Component and Prop Types
export type ComponentProps = {
  query: string;
  className?: string;
  onDataLoaded?: (data: MarketAnalysisData) => void;
  onError?: (error: Error) => void;
};

export type TrendAnalysisProps = ComponentProps;

// Error Handling Types
export interface APIErrorResponse {
  error: {
    message: string;
    type: string;
    code: string;
  };
}

// State Management Types
export interface AnalysisState {
  loading: boolean;
  error: string | null;
  data: MarketAnalysisData | null;
}

// Search Component Types
export interface SearchComponentConfig {
  name: string;
  component: React.ComponentType<ComponentProps>;
  propType: 'query' | 'keyword';
}

export interface SearchFormProps {
  query: string;
  setQuery: (query: string) => void;
  handleSearch: (e: React.FormEvent<HTMLFormElement>) => void;
  isSearching: boolean;
}

export interface ResultsSectionProps {
  submittedQuery: string;
  activeComponents: string[];
}

export interface SpecializedQueries {
  [key: string]: string;
}

export interface QueryProps {
  query: string;
}

export interface KeywordProps {
  keyword: string;
}