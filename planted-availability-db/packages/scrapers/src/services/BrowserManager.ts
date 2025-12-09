/**
 * Browser Manager
 *
 * Manages browser instances for scraping platforms that require JavaScript rendering.
 * Implements fallback strategies and resource pooling for resilience.
 */

import puppeteer, { Browser, Page } from 'puppeteer';
import { recordPlatformEvent, type DeliveryPlatformName } from './PlatformHealthMonitor.js';

export interface BrowserManagerConfig {
  maxBrowsers: number;
  pageTimeout: number; // ms
  navigationTimeout: number; // ms
  maxPagesPerBrowser: number;
  headless: boolean;
}

export interface PageResult {
  html: string;
  url: string;
  status: number;
  responseTime: number;
}

const DEFAULT_CONFIG: BrowserManagerConfig = {
  maxBrowsers: 2,
  pageTimeout: 30000,
  navigationTimeout: 60000,
  maxPagesPerBrowser: 10,
  headless: true,
};

interface BrowserInstance {
  browser: Browser;
  pageCount: number;
  createdAt: Date;
  lastUsed: Date;
}

class BrowserManager {
  private config: BrowserManagerConfig;
  private browsers: BrowserInstance[] = [];

  constructor(config: Partial<BrowserManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Get or create a browser instance
   */
  private async getBrowser(): Promise<BrowserInstance> {
    // Find an available browser
    const available = this.browsers.find(
      (b) => b.pageCount < this.config.maxPagesPerBrowser
    );

    if (available) {
      return available;
    }

    // Create new browser if under limit
    if (this.browsers.length < this.config.maxBrowsers) {
      const browser = await this.launchBrowser();
      const instance: BrowserInstance = {
        browser,
        pageCount: 0,
        createdAt: new Date(),
        lastUsed: new Date(),
      };
      this.browsers.push(instance);
      return instance;
    }

    // Wait for an available browser
    return new Promise((resolve) => {
      const checkInterval = setInterval(() => {
        const available = this.browsers.find(
          (b) => b.pageCount < this.config.maxPagesPerBrowser
        );
        if (available) {
          clearInterval(checkInterval);
          resolve(available);
        }
      }, 100);
    });
  }

  /**
   * Launch a new browser instance
   */
  private async launchBrowser(): Promise<Browser> {
    return puppeteer.launch({
      headless: this.config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu',
        '--window-size=1920,1080',
        // Additional stealth args
        '--disable-blink-features=AutomationControlled',
      ],
      defaultViewport: {
        width: 1920,
        height: 1080,
      },
    });
  }

  /**
   * Fetch a page using the browser
   */
  async fetchPage(
    url: string,
    options: {
      platform?: DeliveryPlatformName;
      country?: string;
      waitForSelector?: string;
      waitForTimeout?: number;
    } = {}
  ): Promise<PageResult> {
    const { platform, country, waitForSelector, waitForTimeout } = options;
    const startTime = Date.now();
    let page: Page | null = null;
    let instance: BrowserInstance | null = null;

    try {
      instance = await this.getBrowser();
      instance.pageCount++;
      instance.lastUsed = new Date();

      page = await instance.browser.newPage();

      // Set realistic headers
      await page.setUserAgent(
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      );

      await page.setExtraHTTPHeaders({
        'Accept-Language': 'en-US,en;q=0.9,de;q=0.8',
      });

      // Enable request interception for performance
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        // Block unnecessary resources
        if (['image', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      // Navigate to page
      const response = await page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: this.config.navigationTimeout,
      });

      // Wait for specific selector if provided
      if (waitForSelector) {
        await page.waitForSelector(waitForSelector, {
          timeout: this.config.pageTimeout,
        });
      }

      // Additional wait if specified
      if (waitForTimeout) {
        await new Promise((resolve) => setTimeout(resolve, waitForTimeout));
      }

      const html = await page.content();
      const status = response?.status() || 200;
      const responseTime = Date.now() - startTime;

      // Record success
      if (platform) {
        await recordPlatformEvent({
          platform,
          success: true,
          response_time_ms: responseTime,
          url,
          country,
        });
      }

      return { html, url, status, responseTime };
    } catch (error) {
      const responseTime = Date.now() - startTime;

      // Record failure
      if (platform) {
        await recordPlatformEvent({
          platform,
          success: false,
          response_time_ms: responseTime,
          error: error instanceof Error ? error.message : String(error),
          url,
          country,
        });
      }

      throw error;
    } finally {
      if (page) {
        await page.close().catch(() => {});
      }
      if (instance) {
        instance.pageCount--;
      }
    }
  }

  /**
   * Fetch a page with fallback - try HTTP first, then browser
   */
  async fetchWithFallback(
    url: string,
    httpFetcher: () => Promise<string>,
    options: {
      platform?: DeliveryPlatformName;
      country?: string;
      waitForSelector?: string;
    } = {}
  ): Promise<{ html: string; usedBrowser: boolean }> {
    try {
      // Try HTTP first (faster, less resource-intensive)
      const html = await httpFetcher();
      return { html, usedBrowser: false };
    } catch (httpError) {
      console.warn(
        `HTTP fetch failed for ${url}, falling back to browser:`,
        httpError instanceof Error ? httpError.message : httpError
      );

      // Fallback to browser
      try {
        const result = await this.fetchPage(url, options);
        return { html: result.html, usedBrowser: true };
      } catch (browserError) {
        console.error(
          `Browser fetch also failed for ${url}:`,
          browserError instanceof Error ? browserError.message : browserError
        );
        throw browserError;
      }
    }
  }

  /**
   * Clean up old or stale browser instances
   */
  async cleanup(): Promise<void> {
    const now = Date.now();
    const maxAge = 5 * 60 * 1000; // 5 minutes

    for (const instance of [...this.browsers]) {
      const age = now - instance.createdAt.getTime();
      const idleTime = now - instance.lastUsed.getTime();

      // Close browsers that are old or idle
      if (age > maxAge || (idleTime > 60000 && instance.pageCount === 0)) {
        await instance.browser.close().catch(() => {});
        this.browsers = this.browsers.filter((b) => b !== instance);
      }
    }
  }

  /**
   * Shutdown all browsers
   */
  async shutdown(): Promise<void> {
    for (const instance of this.browsers) {
      await instance.browser.close().catch(() => {});
    }

    this.browsers = [];
  }

  /**
   * Get current browser pool status
   */
  getStatus(): {
    activeBrowsers: number;
    totalPages: number;
    maxBrowsers: number;
  } {
    return {
      activeBrowsers: this.browsers.length,
      totalPages: this.browsers.reduce((sum, b) => sum + b.pageCount, 0),
      maxBrowsers: this.config.maxBrowsers,
    };
  }
}

// Singleton instance
let browserManager: BrowserManager | null = null;

export function getBrowserManager(config?: Partial<BrowserManagerConfig>): BrowserManager {
  if (!browserManager) {
    browserManager = new BrowserManager(config);
  }
  return browserManager;
}

export async function shutdownBrowserManager(): Promise<void> {
  if (browserManager) {
    await browserManager.shutdown();
    browserManager = null;
  }
}
