/**
 * Circuit Breaker Pattern Implementation
 *
 * Prevents cascade failures when external services are down or degraded.
 * Implements the classic Circuit Breaker pattern with CLOSED, OPEN, and HALF_OPEN states.
 *
 * Based on FUTURE-IMPROVEMENTS.md Section 6.1A
 */

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Timeout for each request in milliseconds */
  timeout: number;
  /** Percentage of failures (0-100) that will trip the circuit */
  errorThresholdPercentage: number;
  /** Time to wait before attempting recovery in milliseconds */
  resetTimeout: number;
  /** Minimum number of requests before the circuit can be tripped */
  volumeThreshold: number;
  /** Name/identifier for this circuit breaker (for logging) */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  totalRequests: number;
  failureRate: number;
  consecutiveFailures: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  nextAttemptTime?: Date;
}

export type StateChangeHandler = (
  from: CircuitState,
  to: CircuitState,
  stats: CircuitBreakerStats
) => void;

export interface CircuitBreakerEvents {
  onOpen?: StateChangeHandler;
  onClose?: StateChangeHandler;
  onHalfOpen?: StateChangeHandler;
  onSuccess?: (stats: CircuitBreakerStats) => void;
  onFailure?: (error: Error, stats: CircuitBreakerStats) => void;
  onTimeout?: (stats: CircuitBreakerStats) => void;
}

/**
 * Circuit Breaker Error Types
 */
export class CircuitBreakerError extends Error {
  constructor(message: string, public readonly stats: CircuitBreakerStats) {
    super(message);
    this.name = 'CircuitBreakerError';
  }
}

export class CircuitOpenError extends CircuitBreakerError {
  constructor(stats: CircuitBreakerStats) {
    super('Circuit breaker is OPEN - request rejected', stats);
    this.name = 'CircuitOpenError';
  }
}

export class CircuitTimeoutError extends CircuitBreakerError {
  constructor(timeout: number, stats: CircuitBreakerStats) {
    super(`Request timed out after ${timeout}ms`, stats);
    this.name = 'CircuitTimeoutError';
  }
}

/**
 * Circuit Breaker Implementation
 *
 * Wraps async functions with circuit breaker logic to prevent cascade failures.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker(callGeminiAPI, {
 *   timeout: 30000,
 *   errorThresholdPercentage: 50,
 *   resetTimeout: 60000,
 *   volumeThreshold: 5,
 *   name: 'gemini-api'
 * });
 *
 * breaker.on('open', () => {
 *   console.warn('Gemini circuit OPEN - falling back to Claude');
 * });
 *
 * const result = await breaker.execute(prompt);
 * ```
 */
export class CircuitBreaker<T extends (...args: any[]) => Promise<any>> {
  private state: CircuitState = 'CLOSED';
  private failures = 0;
  private successes = 0;
  private consecutiveFailures = 0;
  private lastFailureTime?: Date;
  private lastSuccessTime?: Date;
  private nextAttemptTime?: Date;
  private readonly config: Required<CircuitBreakerConfig>;
  private readonly events: CircuitBreakerEvents = {};

  // Rolling window for calculating failure rate
  private readonly requestWindow: Array<{ success: boolean; timestamp: number }> = [];
  private readonly windowDuration = 60000; // 1 minute rolling window

  constructor(
    private readonly fn: T,
    config: CircuitBreakerConfig,
    events?: CircuitBreakerEvents
  ) {
    this.config = {
      name: config.name || 'unnamed',
      ...config,
    };
    if (events) {
      this.events = events;
    }
  }

  /**
   * Register event handlers
   */
  on(event: 'open', handler: StateChangeHandler): this;
  on(event: 'close', handler: StateChangeHandler): this;
  on(event: 'half-open', handler: StateChangeHandler): this;
  on(event: 'success', handler: (stats: CircuitBreakerStats) => void): this;
  on(event: 'failure', handler: (error: Error, stats: CircuitBreakerStats) => void): this;
  on(event: 'timeout', handler: (stats: CircuitBreakerStats) => void): this;
  on(event: string, handler: any): this {
    switch (event) {
      case 'open':
        this.events.onOpen = handler;
        break;
      case 'close':
        this.events.onClose = handler;
        break;
      case 'half-open':
        this.events.onHalfOpen = handler;
        break;
      case 'success':
        this.events.onSuccess = handler;
        break;
      case 'failure':
        this.events.onFailure = handler;
        break;
      case 'timeout':
        this.events.onTimeout = handler;
        break;
    }
    return this;
  }

  /**
   * Execute the wrapped function with circuit breaker protection
   */
  async execute(...args: Parameters<T>): Promise<ReturnType<T>> {
    // Check if circuit is OPEN
    if (this.state === 'OPEN') {
      if (this.nextAttemptTime && Date.now() < this.nextAttemptTime.getTime()) {
        throw new CircuitOpenError(this.getStats());
      }
      // Time to try recovery - transition to HALF_OPEN
      this.transitionTo('HALF_OPEN');
    }

    // Execute with timeout
    try {
      const result = await this.executeWithTimeout(args);
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error as Error);
      throw error;
    }
  }

  /**
   * Execute the function with a timeout
   */
  private async executeWithTimeout(args: Parameters<T>): Promise<ReturnType<T>> {
    return new Promise<ReturnType<T>>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        const error = new CircuitTimeoutError(this.config.timeout, this.getStats());
        if (this.events.onTimeout) {
          this.events.onTimeout(this.getStats());
        }
        reject(error);
      }, this.config.timeout);

      this.fn(...args)
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.consecutiveFailures = 0;
    this.lastSuccessTime = new Date();
    this.addToWindow(true);

    if (this.events.onSuccess) {
      this.events.onSuccess(this.getStats());
    }

    // If in HALF_OPEN and successful, close the circuit
    if (this.state === 'HALF_OPEN') {
      this.transitionTo('CLOSED');
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(error: Error): void {
    this.failures++;
    this.consecutiveFailures++;
    this.lastFailureTime = new Date();
    this.addToWindow(false);

    if (this.events.onFailure) {
      this.events.onFailure(error, this.getStats());
    }

    // Check if we should trip the circuit
    if (this.shouldTrip()) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Add request result to rolling window
   */
  private addToWindow(success: boolean): void {
    const now = Date.now();
    this.requestWindow.push({ success, timestamp: now });

    // Clean old entries outside the window
    const cutoff = now - this.windowDuration;
    while (this.requestWindow.length > 0 && this.requestWindow[0].timestamp < cutoff) {
      this.requestWindow.shift();
    }
  }

  /**
   * Check if circuit should be tripped
   */
  private shouldTrip(): boolean {
    // If in HALF_OPEN, any failure trips the circuit
    if (this.state === 'HALF_OPEN') {
      return true;
    }

    // Check volume threshold
    const totalRequests = this.requestWindow.length;
    if (totalRequests < this.config.volumeThreshold) {
      return false;
    }

    // Check error threshold percentage
    const failureRate = this.getFailureRate();
    return failureRate >= this.config.errorThresholdPercentage;
  }

  /**
   * Calculate current failure rate from rolling window
   */
  private getFailureRate(): number {
    if (this.requestWindow.length === 0) {
      return 0;
    }

    const failures = this.requestWindow.filter((r) => !r.success).length;
    return (failures / this.requestWindow.length) * 100;
  }

  /**
   * Transition to a new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    if (oldState === newState) {
      return;
    }

    this.state = newState;

    // Set next attempt time for OPEN state
    if (newState === 'OPEN') {
      this.nextAttemptTime = new Date(Date.now() + this.config.resetTimeout);
    } else {
      this.nextAttemptTime = undefined;
    }

    // Emit state change event
    const stats = this.getStats();
    switch (newState) {
      case 'OPEN':
        if (this.events.onOpen) {
          this.events.onOpen(oldState, newState, stats);
        }
        console.warn(
          `[CircuitBreaker:${this.config.name}] Circuit OPEN - too many failures (${stats.failureRate.toFixed(1)}% failure rate)`
        );
        break;
      case 'CLOSED':
        if (this.events.onClose) {
          this.events.onClose(oldState, newState, stats);
        }
        console.info(`[CircuitBreaker:${this.config.name}] Circuit CLOSED - service recovered`);
        break;
      case 'HALF_OPEN':
        if (this.events.onHalfOpen) {
          this.events.onHalfOpen(oldState, newState, stats);
        }
        console.info(
          `[CircuitBreaker:${this.config.name}] Circuit HALF_OPEN - testing service recovery`
        );
        break;
    }
  }

  /**
   * Get current statistics
   */
  getStats(): CircuitBreakerStats {
    const totalRequests = this.failures + this.successes;
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      totalRequests,
      failureRate: this.getFailureRate(),
      consecutiveFailures: this.consecutiveFailures,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
      nextAttemptTime: this.nextAttemptTime,
    };
  }

  /**
   * Reset the circuit breaker to initial state
   */
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.successes = 0;
    this.consecutiveFailures = 0;
    this.lastFailureTime = undefined;
    this.lastSuccessTime = undefined;
    this.nextAttemptTime = undefined;
    this.requestWindow.length = 0;
  }

  /**
   * Manually open the circuit
   */
  forceOpen(): void {
    this.transitionTo('OPEN');
  }

  /**
   * Manually close the circuit
   */
  forceClose(): void {
    this.transitionTo('CLOSED');
  }

  /**
   * Get current state
   */
  getState(): CircuitState {
    return this.state;
  }
}

/**
 * Factory function to create a circuit breaker
 */
export function createCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  config: CircuitBreakerConfig,
  events?: CircuitBreakerEvents
): CircuitBreaker<T> {
  return new CircuitBreaker(fn, config, events);
}

/**
 * Pre-configured circuit breaker configurations
 */
export const CircuitBreakerConfigs = {
  /** Gemini AI API - high timeout, moderate threshold */
  gemini: {
    timeout: 30000, // 30s for AI processing
    errorThresholdPercentage: 50,
    resetTimeout: 60000, // Try again after 1 min
    volumeThreshold: 5,
    name: 'gemini-api',
  } as CircuitBreakerConfig,

  /** Claude AI API - high timeout, moderate threshold */
  claude: {
    timeout: 30000, // 30s for AI processing
    errorThresholdPercentage: 50,
    resetTimeout: 60000, // Try again after 1 min
    volumeThreshold: 5,
    name: 'claude-api',
  } as CircuitBreakerConfig,

  /** Google Search API - lower timeout, stricter threshold */
  googleSearch: {
    timeout: 10000, // 10s for search
    errorThresholdPercentage: 40,
    resetTimeout: 120000, // Try again after 2 min (might be rate limited)
    volumeThreshold: 3,
    name: 'google-search',
  } as CircuitBreakerConfig,

  /** Delivery platform scrapers - moderate settings */
  platformScraper: {
    timeout: 20000, // 20s for page load
    errorThresholdPercentage: 60,
    resetTimeout: 300000, // Try again after 5 min (platform might have changed)
    volumeThreshold: 5,
    name: 'platform-scraper',
  } as CircuitBreakerConfig,
};

/**
 * Pre-configured circuit breaker instances
 * These are singletons that can be shared across the application
 */
export class CircuitBreakers {
  private static instances = new Map<string, CircuitBreaker<any>>();

  /**
   * Get or create a circuit breaker for Gemini API
   */
  static getGeminiBreaker<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    events?: CircuitBreakerEvents
  ): CircuitBreaker<T> {
    const key = 'gemini';
    if (!this.instances.has(key)) {
      const breaker = createCircuitBreaker(fn, CircuitBreakerConfigs.gemini, events);
      this.instances.set(key, breaker);
    }
    return this.instances.get(key)!;
  }

  /**
   * Get or create a circuit breaker for Claude API
   */
  static getClaudeBreaker<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    events?: CircuitBreakerEvents
  ): CircuitBreaker<T> {
    const key = 'claude';
    if (!this.instances.has(key)) {
      const breaker = createCircuitBreaker(fn, CircuitBreakerConfigs.claude, events);
      this.instances.set(key, breaker);
    }
    return this.instances.get(key)!;
  }

  /**
   * Get or create a circuit breaker for Google Search API
   */
  static getGoogleSearchBreaker<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    events?: CircuitBreakerEvents
  ): CircuitBreaker<T> {
    const key = 'google-search';
    if (!this.instances.has(key)) {
      const breaker = createCircuitBreaker(fn, CircuitBreakerConfigs.googleSearch, events);
      this.instances.set(key, breaker);
    }
    return this.instances.get(key)!;
  }

  /**
   * Get or create a circuit breaker for platform scrapers
   */
  static getPlatformScraperBreaker<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    platformName: string,
    events?: CircuitBreakerEvents
  ): CircuitBreaker<T> {
    const key = `platform-scraper-${platformName}`;
    if (!this.instances.has(key)) {
      const config = {
        ...CircuitBreakerConfigs.platformScraper,
        name: `platform-scraper-${platformName}`,
      };
      const breaker = createCircuitBreaker(fn, config, events);
      this.instances.set(key, breaker);
    }
    return this.instances.get(key)!;
  }

  /**
   * Reset all circuit breakers
   */
  static resetAll(): void {
    for (const breaker of this.instances.values()) {
      breaker.reset();
    }
  }

  /**
   * Get statistics for all circuit breakers
   */
  static getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    for (const [key, breaker] of this.instances.entries()) {
      stats.set(key, breaker.getStats());
    }
    return stats;
  }

  /**
   * Clear all circuit breaker instances (useful for testing)
   */
  static clearInstances(): void {
    this.instances.clear();
  }
}

/**
 * Integration with PlatformHealthMonitor
 *
 * This function creates a circuit breaker that also records events to the PlatformHealthMonitor
 */
export function createPlatformCircuitBreaker<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  platformName: string,
  recordEvent?: (event: { platform: string; success: boolean; response_time_ms: number; error?: string }) => void
): CircuitBreaker<T> {
  const config = {
    ...CircuitBreakerConfigs.platformScraper,
    name: `platform-${platformName}`,
  };

  const events: CircuitBreakerEvents = {
    onSuccess: (_stats) => {
      if (recordEvent) {
        recordEvent({
          platform: platformName,
          success: true,
          response_time_ms: 0, // Would need to track actual time
        });
      }
    },
    onFailure: (error, _stats) => {
      if (recordEvent) {
        recordEvent({
          platform: platformName,
          success: false,
          response_time_ms: 0,
          error: error.message,
        });
      }
    },
    onOpen: (_from, _to, _stats) => {
      console.warn(
        `[Platform:${platformName}] Circuit breaker OPEN - platform may be down or changed.`
      );
    },
  };

  return createCircuitBreaker(fn, config, events);
}
