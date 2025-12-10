import { reviewHandlers } from './review';
import { syncHandlers } from './sync';
import { scrapingHandlers } from './scraping';
import { authHandlers } from './auth';

// Export all handlers combined
export const handlers = [
  ...reviewHandlers,
  ...syncHandlers,
  ...scrapingHandlers,
  ...authHandlers,
];
