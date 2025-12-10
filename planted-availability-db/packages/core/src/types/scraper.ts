export type ScraperStatus = 'pending' | 'running' | 'completed' | 'failed' | 'partial' | 'cancelled';

export interface ScraperStats {
  venues_checked: number;
  venues_updated: number;
  dishes_found: number;
  dishes_updated: number;
  errors: number;
}

export interface ScraperError {
  message: string;
  url?: string;
  stack?: string;
}

export interface ScraperProgress {
  current: number;
  total: number;
  percentage: number;
}

export interface ScraperCosts {
  searchQueries: number;
  aiCalls: number;
  estimated: number;
}

export interface ScraperLogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface ScraperRun {
  id: string;
  scraper_id: string;
  started_at: Date;
  completed_at?: Date;
  status: ScraperStatus;
  stats: ScraperStats;
  errors?: ScraperError[];
  next_run?: Date;
  progress?: ScraperProgress;
  costs?: ScraperCosts;
  logs?: ScraperLogEntry[];
  cancelledAt?: Date;
  cancelledBy?: string;
  config?: Record<string, any>; // Store the configuration used for this run
}

export interface ScraperConfig {
  id: string;
  name: string;
  market: string[];
  type: 'retail' | 'restaurant' | 'delivery';
  schedule: string; // cron expression
  rateLimit: {
    requestsPerSecond: number;
    maxConcurrent: number;
  };
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  enabled: boolean;
}

export interface ScraperResult {
  venues: Partial<import('./venue.js').Venue>[];
  dishes: Partial<import('./dish.js').Dish>[];
  promotions: Partial<import('./promotion.js').Promotion>[];
  errors: ScraperError[];
}

export type CreateScraperRunInput = Omit<ScraperRun, 'id'>;
