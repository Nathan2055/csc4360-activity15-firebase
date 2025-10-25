/**
 * Token-aware rate limiter for Google AI Studio API
 * Enforces: RPM: 10, TPM: 250,000, RDP: 250
 */

export interface RateLimits {
  requestsPerMinute: number;
  tokensPerMinute: number;
  requestsPerDay: number;
}

export interface TokenUsage {
  estimatedInput: number;
  estimatedOutput: number;
  actualInput?: number;
  actualOutput?: number;
  actualTotal?: number;
}

interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: any) => void;
  estimatedTokens: number;
  priority: number;
  timestamp: number;
}

export class GeminiRateLimiter {
  private readonly limits: RateLimits;
  
  // Token buckets
  private tokensAvailable: number;
  private requestsAvailable: number;
  private dailyRequestsAvailable: number;
  
  // Timestamps for bucket refill
  private lastMinuteReset: number;
  private lastDayReset: number;
  private lastRefillLogTime: number = 0; // Track when we last logged refill
  private lastRequestTime: number = 0; // Track last request for burst prevention
  
  // Queue for pending requests
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  
  // Usage tracking
  private totalEstimatedTokens = 0;
  private totalActualTokens = 0;
  private totalRequests = 0;
  
  constructor(limits?: Partial<RateLimits>) {
    this.limits = {
      requestsPerMinute: limits?.requestsPerMinute ?? 15,
      tokensPerMinute: limits?.tokensPerMinute ?? 1_000_000,
      requestsPerDay: limits?.requestsPerDay ?? 1500,
    };
    
    this.tokensAvailable = this.limits.tokensPerMinute;
    this.requestsAvailable = this.limits.requestsPerMinute;
    this.dailyRequestsAvailable = this.limits.requestsPerDay;
    this.lastMinuteReset = Date.now();
    this.lastDayReset = Date.now();
    
    // Start the bucket refill timer
    this.startRefillTimer();
  }
  
  /**
   * Schedule a request with token estimation and priority
   */
  async scheduleRequest<T>(
    execute: () => Promise<T>,
    estimatedTokens: number,
    priority = 0
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push({
        execute,
        resolve,
        reject,
        estimatedTokens,
        priority,
        timestamp: Date.now(),
      });
      
      // Sort queue by priority (higher first), then by timestamp (older first)
      this.queue.sort((a, b) => {
        if (a.priority !== b.priority) return b.priority - a.priority;
        return a.timestamp - b.timestamp;
      });
      
      // Start processing if not already running
      if (!this.processing) {
        this.processQueue();
      }
    });
  }
  
  /**
   * Process the request queue with rate limiting
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    
    while (this.queue.length > 0) {
      // Refill buckets if needed
      this.refillBuckets();
      
      const request = this.queue[0];
      
      // BURST PREVENTION: Enforce minimum 4-second delay between requests
      // This prevents hitting undocumented per-second burst limits
      const timeSinceLastRequest = Date.now() - this.lastRequestTime;
      const minDelayMs = 4000; // 4 seconds = max ~15 requests per minute
      
      if (this.lastRequestTime > 0 && timeSinceLastRequest < minDelayMs) {
        const waitMs = minDelayMs - timeSinceLastRequest;
        console.log(`[RateLimiter] Burst prevention: waiting ${waitMs}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitMs));
      }
      
      // Check if we have capacity
      if (!this.canProcessRequest(request.estimatedTokens)) {
        // Wait and retry
        await this.waitForCapacity(request.estimatedTokens);
        continue;
      }
      
      // Remove from queue and process
      this.queue.shift();
      
      // Reserve capacity
      this.reserveCapacity(request.estimatedTokens);
      
      // Update last request time
      this.lastRequestTime = Date.now();
      
      try {
        const result = await request.execute();
        request.resolve(result);
      } catch (error) {
        request.reject(error);
      }
    }
    
    this.processing = false;
  }
  
  /**
   * Check if we can process a request with given token estimate
   */
  private canProcessRequest(estimatedTokens: number): boolean {
    return (
      this.requestsAvailable >= 1 &&
      this.tokensAvailable >= estimatedTokens &&
      this.dailyRequestsAvailable >= 1
    );
  }
  
  /**
   * Reserve capacity for a request
   */
  private reserveCapacity(estimatedTokens: number): void {
    this.requestsAvailable -= 1;
    this.tokensAvailable -= estimatedTokens;
    this.dailyRequestsAvailable -= 1;
    this.totalEstimatedTokens += estimatedTokens;
    this.totalRequests += 1;
  }
  
  /**
   * Reconcile token usage after API response
   */
  reconcileUsage(estimatedTokens: number, actualTokens: number): void {
    const difference = actualTokens - estimatedTokens;
    
    // Adjust available tokens based on actual usage
    this.tokensAvailable -= difference;
    this.totalActualTokens += actualTokens;
    
    // Log if estimate was significantly off
    if (Math.abs(difference) > estimatedTokens * 0.2) {
      console.warn(
        `[RateLimiter] Token estimate off by ${difference} ` +
        `(estimated: ${estimatedTokens}, actual: ${actualTokens})`
      );
    }
  }
  
  /**
   * Wait for capacity to become available
   */
  private async waitForCapacity(estimatedTokens: number): Promise<void> {
    const now = Date.now();
    
    // Calculate wait times for each limit
    const timeUntilMinuteReset = 60_000 - (now - this.lastMinuteReset);
    const timeUntilDayReset = 86_400_000 - (now - this.lastDayReset);
    
    let waitTime = 1000; // Default 1 second
    
    if (this.requestsAvailable < 1) {
      waitTime = Math.max(waitTime, timeUntilMinuteReset);
    }
    
    if (this.tokensAvailable < estimatedTokens) {
      waitTime = Math.max(waitTime, timeUntilMinuteReset);
    }
    
    if (this.dailyRequestsAvailable < 1) {
      waitTime = Math.max(waitTime, timeUntilDayReset);
      console.error('⚠️  [RateLimiter] DAILY QUOTA EXHAUSTED! No more API calls until midnight PT.');
    } else if (this.dailyRequestsAvailable <= 20) {
      console.warn(`⚠️  [RateLimiter] LOW DAILY QUOTA: Only ${this.dailyRequestsAvailable} requests remaining!`);
    }
    
    console.log(
      `[RateLimiter] Waiting ${waitTime}ms for capacity. ` +
      `Requests: ${this.requestsAvailable}/${this.limits.requestsPerMinute}, ` +
      `Tokens: ${this.tokensAvailable}/${this.limits.tokensPerMinute}, ` +
      `Daily: ${this.dailyRequestsAvailable}/${this.limits.requestsPerDay}`
    );
    
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  /**
   * Refill token buckets based on elapsed time
   */
  private refillBuckets(): void {
    const now = Date.now();
    
    // Refill minute-based buckets
    if (now - this.lastMinuteReset >= 60_000) {
      this.tokensAvailable = this.limits.tokensPerMinute;
      this.requestsAvailable = this.limits.requestsPerMinute;
      this.lastMinuteReset = now;
      
      // Only log once per minute to avoid spam
      if (now - this.lastRefillLogTime >= 60_000) {
        console.log('[RateLimiter] Minute buckets refilled');
        this.lastRefillLogTime = now;
      }
    }
    
    // Refill daily bucket
    if (now - this.lastDayReset >= 86_400_000) {
      this.dailyRequestsAvailable = this.limits.requestsPerDay;
      this.lastDayReset = now;
      console.log('[RateLimiter] Daily bucket refilled');
    }
  }
  
  /**
   * Start automatic bucket refill timer
   */
  private startRefillTimer(): void {
    setInterval(() => {
      this.refillBuckets();
      
      // Resume processing if queue has items
      if (this.queue.length > 0 && !this.processing) {
        this.processQueue();
      }
    }, 10_000); // Check every 10 seconds
  }
  
  /**
   * Get current status
   */
  getStatus() {
    return {
      queue: {
        length: this.queue.length,
        processing: this.processing,
      },
      buckets: {
        requests: `${this.requestsAvailable}/${this.limits.requestsPerMinute}`,
        tokens: `${this.tokensAvailable}/${this.limits.tokensPerMinute}`,
        dailyRequests: `${this.dailyRequestsAvailable}/${this.limits.requestsPerDay}`,
      },
      usage: {
        totalRequests: this.totalRequests,
        totalEstimatedTokens: this.totalEstimatedTokens,
        totalActualTokens: this.totalActualTokens,
        estimateAccuracy: this.totalActualTokens > 0 
          ? `${((this.totalEstimatedTokens / this.totalActualTokens) * 100).toFixed(1)}%`
          : 'N/A',
      },
    };
  }
}
