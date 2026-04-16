/**
 * Simple in-memory rate limiter for Edge runtime
 * Uses a sliding window approach
 *
 * Note: This is for single-server deployments only.
 * For multi-server setups, use Redis or a distributed rate limiter.
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimit = new Map<string, RateLimitEntry>();

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
}

/**
 * Check if a request should be rate limited
 * @param key - Unique identifier for the rate limit (e.g., IP address)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds
 * @returns Object with limited status and remaining count
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = rateLimit.get(key);

  // If no entry exists or the window has expired, create a new one
  if (!entry || now > entry.resetTime) {
    rateLimit.set(key, { count: 1, resetTime: now + windowMs });
    return { limited: false, remaining: limit - 1 };
  }

  // Increment the count
  entry.count++;

  // Check if limit exceeded
  if (entry.count > limit) {
    return { limited: true, remaining: 0 };
  }

  return { limited: false, remaining: limit - entry.count };
}

/**
 * Clean up expired entries periodically
 * This prevents memory leaks from accumulating old entries
 */
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimit.entries()) {
      if (now > entry.resetTime) {
        rateLimit.delete(key);
      }
    }
  }, 60000); // Run every minute
}
