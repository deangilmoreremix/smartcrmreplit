import { useCallback, useRef } from 'react';

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const useRateLimiter = (config: RateLimitConfig = { maxRequests: 5, windowMs: 60000 }) => {
  const requestsRef = useRef<number[]>([]);

  const isRateLimited = useCallback(() => {
    const now = Date.now();
    const windowStart = now - config.windowMs;

    // Remove old requests outside the window
    requestsRef.current = requestsRef.current.filter(timestamp => timestamp > windowStart);

    // Check if we're over the limit
    return requestsRef.current.length >= config.maxRequests;
  }, [config.maxRequests, config.windowMs]);

  const recordRequest = useCallback(() => {
    requestsRef.current.push(Date.now());
  }, []);

  const executeWithRateLimit = useCallback(async <T>(
    operation: () => Promise<T>,
    onRateLimited?: () => void
  ): Promise<T | null> => {
    if (isRateLimited()) {
      onRateLimited?.();
      return null;
    }

    recordRequest();
    return operation();
  }, [isRateLimited, recordRequest]);

  const getRemainingRequests = useCallback(() => {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    requestsRef.current = requestsRef.current.filter(timestamp => timestamp > windowStart);
    return Math.max(0, config.maxRequests - requestsRef.current.length);
  }, [config.maxRequests, config.windowMs]);

  const getTimeUntilReset = useCallback(() => {
    if (requestsRef.current.length === 0) return 0;

    const oldestRequest = Math.min(...requestsRef.current);
    const resetTime = oldestRequest + config.windowMs;
    return Math.max(0, resetTime - Date.now());
  }, [config.windowMs]);

  return {
    isRateLimited,
    executeWithRateLimit,
    getRemainingRequests,
    getTimeUntilReset,
  };
};