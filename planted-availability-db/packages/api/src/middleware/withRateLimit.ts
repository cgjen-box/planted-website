/**
 * Rate Limiting Wrapper for Firebase Cloud Functions v2
 *
 * Wraps onRequest handlers with rate limiting using Firestore for tracking.
 * Works with Firebase v2 functions that don't use Express middleware.
 */

import type { Request, Response } from 'express';
import { getFirestore } from '@pad/database';

export interface RateLimitConfig {
  windowMs: number; // Time window in milliseconds
  maxRequests: number; // Max requests per window
  keyPrefix?: string; // Prefix for rate limit keys (e.g., 'public', 'admin')
}

type RequestHandler = (req: Request, res: Response) => Promise<void>;

const defaultConfig: RateLimitConfig = {
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 60, // 60 requests per minute
  keyPrefix: 'api',
};

/**
 * Extract rate limit key from request (IP-based)
 */
function getRateLimitKey(req: Request, prefix: string): string {
  // Firebase Cloud Functions set x-forwarded-for for the real client IP
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwardedFor === 'string' ? forwardedFor.split(',')[0].trim() : req.ip) || 'unknown';

  // Sanitize IP for use as Firestore document ID
  const sanitizedIp = ip.replace(/[/.]/g, '_');
  return `${prefix}_${sanitizedIp}`;
}

/**
 * Check and update rate limit in Firestore
 */
async function checkRateLimit(
  key: string,
  windowMs: number,
  maxRequests: number
): Promise<{
  allowed: boolean;
  remaining: number;
  resetTime?: number;
}> {
  const db = getFirestore();
  const rateLimitRef = db.collection('rate_limits').doc(key);

  return db.runTransaction(async (transaction) => {
    const doc = await transaction.get(rateLimitRef);
    const now = Date.now();

    if (!doc.exists) {
      // First request from this key
      transaction.set(rateLimitRef, {
        count: 1,
        windowStart: now,
        expiresAt: now + windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const data = doc.data()!;
    const windowStart = data.windowStart as number;

    // Check if window has expired
    if (now - windowStart > windowMs) {
      // Reset window
      transaction.set(rateLimitRef, {
        count: 1,
        windowStart: now,
        expiresAt: now + windowMs,
      });
      return { allowed: true, remaining: maxRequests - 1 };
    }

    const currentCount = data.count as number;

    if (currentCount >= maxRequests) {
      // Rate limit exceeded
      const resetTime = windowStart + windowMs;
      return {
        allowed: false,
        remaining: 0,
        resetTime,
      };
    }

    // Increment count
    transaction.update(rateLimitRef, {
      count: currentCount + 1,
    });

    return {
      allowed: true,
      remaining: maxRequests - currentCount - 1,
    };
  });
}

/**
 * Wrap a Firebase onRequest handler with rate limiting
 *
 * @example
 * export const myHandler = onRequest(options, withRateLimit(
 *   async (req, res) => {
 *     // Your handler logic
 *   },
 *   { maxRequests: 30 } // Optional custom config
 * ));
 */
export function withRateLimit(
  handler: RequestHandler,
  config: Partial<RateLimitConfig> = {}
): RequestHandler {
  const { windowMs, maxRequests, keyPrefix } = { ...defaultConfig, ...config };

  return async (req: Request, res: Response) => {
    try {
      const key = getRateLimitKey(req, keyPrefix!);
      const result = await checkRateLimit(key, windowMs, maxRequests);

      // Set rate limit headers
      res.set('X-RateLimit-Limit', maxRequests.toString());
      res.set('X-RateLimit-Remaining', result.remaining.toString());

      if (!result.allowed) {
        const retryAfter = Math.ceil((result.resetTime! - Date.now()) / 1000);
        res.set('Retry-After', retryAfter.toString());
        res.status(429).json({
          error: 'Too many requests',
          message: 'Rate limit exceeded. Please try again later.',
          retryAfter,
        });
        return;
      }

      // Rate limit passed, call the actual handler
      await handler(req, res);
    } catch (error) {
      // If rate limiting fails, allow the request but log the error
      console.error('Rate limiting error:', error);
      await handler(req, res);
    }
  };
}

// Pre-configured wrappers for different API tiers
export const publicRateLimit = (handler: RequestHandler) =>
  withRateLimit(handler, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 60, // 60 requests per minute
    keyPrefix: 'public',
  });

export const strictRateLimit = (handler: RequestHandler) =>
  withRateLimit(handler, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 10, // 10 requests per minute (for expensive operations)
    keyPrefix: 'strict',
  });

export const adminRateLimit = (handler: RequestHandler) =>
  withRateLimit(handler, {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 200, // 200 requests per minute
    keyPrefix: 'admin',
  });
