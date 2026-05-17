/**
 * Simple in-process rate limiter. Works correctly in single-process deployments
 * (Node.js, Docker with one replica). In multi-instance / serverless deployments
 * each instance maintains its own counter, so the effective limit is
 * maxRequests * instanceCount. Upgrade to a Redis-backed counter when running
 * multiple replicas.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Returns true if the request is allowed, false if the rate limit is exceeded.
 *
 * @param key          Unique key — typically `${userId}:${endpoint}`
 * @param maxRequests  Maximum allowed requests per window
 * @param windowMs     Window duration in milliseconds
 */
export function checkRateLimit(key: string, maxRequests: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= maxRequests) return false;
  bucket.count++;
  return true;
}
