/**
 * Retry logic with exponential backoff and RetryInfo support
 * Handles Google AI API errors and rate limit responses
 */

export interface RetryConfig {
  maxRetries: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export interface RetryInfo {
  retryDelayMs?: number;
  retryAfter?: string; // HTTP Retry-After header
}

/**
 * Extract retry information from error
 */
function extractRetryInfo(error: any): RetryInfo | null {
  try {
    // Check for Google's RetryInfo in error details
    if (error?.details) {
      for (const detail of error.details) {
        if (detail['@type']?.includes('RetryInfo')) {
          const retryDelay = detail.retryDelay;
          if (retryDelay) {
            // Convert duration to milliseconds
            const seconds = parseInt(retryDelay.seconds || '0', 10);
            const nanos = parseInt(retryDelay.nanos || '0', 10);
            const totalMs = seconds * 1000 + Math.floor(nanos / 1_000_000);
            return { retryDelayMs: totalMs };
          }
        }
      }
    }
    
    // Check for HTTP Retry-After header
    if (error?.response?.headers?.['retry-after']) {
      return { retryAfter: error.response.headers['retry-after'] };
    }
    
    // Check error message for rate limit info
    if (error?.message) {
      const match = error.message.match(/retry after (\d+) seconds?/i);
      if (match) {
        return { retryDelayMs: parseInt(match[1], 10) * 1000 };
      }
    }
    
    return null;
  } catch (e) {
    return null;
  }
}

/**
 * Parse Retry-After header
 */
function parseRetryAfter(retryAfter: string): number {
  // If it's a number, it's seconds
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) {
    return seconds * 1000;
  }
  
  // If it's a date, calculate difference
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }
  
  return 0;
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: any): boolean {
  // Rate limit errors
  if (error?.status === 429) return true;
  if (error?.code === 'RESOURCE_EXHAUSTED') return true;
  
  // Server errors
  if (error?.status >= 500 && error?.status < 600) return true;
  
  // Network errors
  if (error?.code === 'ECONNRESET') return true;
  if (error?.code === 'ETIMEDOUT') return true;
  if (error?.code === 'ENOTFOUND') return true;
  
  // Google API specific errors
  if (error?.message?.includes('quota')) return true;
  if (error?.message?.includes('rate limit')) return true;
  
  return false;
}

/**
 * Calculate retry delay with exponential backoff
 */
function calculateRetryDelay(
  attemptNumber: number,
  config: RetryConfig,
  retryInfo: RetryInfo | null
): number {
  // Honor provider's retry advice if available
  if (retryInfo?.retryDelayMs) {
    console.log(
      `[Retry] Using provider-specified delay: ${retryInfo.retryDelayMs}ms`
    );
    return Math.min(retryInfo.retryDelayMs, config.maxDelayMs);
  }
  
  if (retryInfo?.retryAfter) {
    const delayMs = parseRetryAfter(retryInfo.retryAfter);
    console.log(
      `[Retry] Using Retry-After header delay: ${delayMs}ms`
    );
    return Math.min(delayMs, config.maxDelayMs);
  }
  
  // Exponential backoff with jitter
  const exponentialDelay = config.initialDelayMs * Math.pow(
    config.backoffMultiplier,
    attemptNumber
  );
  
  // Add jitter (±20%)
  const jitter = exponentialDelay * 0.2 * (Math.random() - 0.5);
  const delayWithJitter = exponentialDelay + jitter;
  
  return Math.min(delayWithJitter, config.maxDelayMs);
}

/**
 * Execute a function with retry logic
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  operationName: string,
  config: Partial<RetryConfig> = {}
): Promise<T> {
  const retryConfig: RetryConfig = {
    maxRetries: config.maxRetries ?? 3,
    initialDelayMs: config.initialDelayMs ?? 1000,
    maxDelayMs: config.maxDelayMs ?? 60_000,
    backoffMultiplier: config.backoffMultiplier ?? 2,
  };
  
  let lastError: any;
  
  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Don't retry if not retryable
      if (!isRetryableError(error)) {
        console.error(
          `[Retry] ${operationName} failed with non-retryable error:`,
          error?.message || error
        );
        throw error;
      }
      
      // Don't retry if we've exhausted attempts
      if (attempt >= retryConfig.maxRetries) {
        console.error(
          `[Retry] ${operationName} failed after ${attempt} retries:`,
          error?.message || error
        );
        throw error;
      }
      
      // Extract retry information
      const retryInfo = extractRetryInfo(error);
      
      // Calculate delay
      const delayMs = calculateRetryDelay(attempt, retryConfig, retryInfo);
      
      console.warn(
        `[Retry] ${operationName} failed (attempt ${attempt + 1}/${retryConfig.maxRetries + 1}). ` +
        `Retrying in ${delayMs}ms...`,
        error?.message || error
      );
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delayMs));
    }
  }
  
  // This should never be reached, but TypeScript requires it
  throw lastError;
}

/**
 * Default retry config for Gemini API calls
 */
export const GEMINI_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  initialDelayMs: 2000,
  maxDelayMs: 120_000, // 2 minutes max
  backoffMultiplier: 2,
};
