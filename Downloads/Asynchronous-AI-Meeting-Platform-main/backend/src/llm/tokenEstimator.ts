/**
 * Token estimation utilities for Gemini API calls
 * Helps with rate limiting and usage tracking
 */

/**
 * Rough token estimation for text
 * Rule of thumb: ~4 characters per token for English text
 */
export function estimateTokens(text: string): number {
  // Remove extra whitespace
  const normalized = text.replace(/\s+/g, ' ').trim();
  
  // Rough estimation: 4 chars per token
  const charCount = normalized.length;
  const estimate = Math.ceil(charCount / 4);
  
  return estimate;
}

/**
 * Estimate tokens for a JSON object
 */
export function estimateTokensForJson(obj: any): number {
  const jsonString = JSON.stringify(obj);
  return estimateTokens(jsonString);
}

/**
 * Estimate input tokens for a Gemini prompt
 */
export function estimateInputTokens(systemPrompt: string, userPrompt: string): number {
  return estimateTokens(systemPrompt) + estimateTokens(userPrompt);
}

/**
 * Estimate output tokens based on expected response type
 */
export function estimateOutputTokens(responseType: 'short' | 'medium' | 'long' | 'json'): number {
  switch (responseType) {
    case 'short':
      return 200; // ~50-100 words
    case 'medium':
      return 400; // ~150-250 words
    case 'long':
      return 800; // ~300-500 words
    case 'json':
      return 600; // JSON responses with structure
    default:
      return 400;
  }
}

/**
 * Calculate max output tokens to enforce limits
 */
export function getMaxOutputTokens(responseType: 'short' | 'medium' | 'long' | 'json'): number {
  switch (responseType) {
    case 'short':
      return 300; // Increased from 200 to avoid truncation
    case 'medium':
      return 500;
    case 'long':
      return 1000;
    case 'json':
      return 800;
    default:
      return 500;
  }
}

/**
 * Extract token usage from Gemini response
 */
export function extractTokenUsage(response: any): {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
} | null {
  try {
    // Check for usage metadata in response
    const usageMetadata = response?.usageMetadata;
    
    if (usageMetadata) {
      return {
        inputTokens: usageMetadata.promptTokenCount || 0,
        outputTokens: usageMetadata.candidatesTokenCount || 0,
        totalTokens: usageMetadata.totalTokenCount || 0,
      };
    }
    
    return null;
  } catch (error) {
    console.error('[TokenEstimator] Error extracting token usage:', error);
    return null;
  }
}

/**
 * Log token usage comparison
 */
export function logTokenUsage(
  operation: string,
  estimated: { input: number; output: number; total: number },
  actual: { inputTokens: number; outputTokens: number; totalTokens: number } | null
): void {
  if (!actual) {
    console.log(
      `[TokenUsage] ${operation} - Estimated: ${estimated.total} tokens ` +
      `(in: ${estimated.input}, out: ${estimated.output})`
    );
    return;
  }
  
  const estimatedTotal = estimated.total;
  const actualTotal = actual.totalTokens;
  const difference = actualTotal - estimatedTotal;
  const percentDiff = estimatedTotal > 0 
    ? ((difference / estimatedTotal) * 100).toFixed(1) 
    : '0';
  
  console.log(
    `[TokenUsage] ${operation}\n` +
    `  Estimated: ${estimatedTotal} tokens (in: ${estimated.input}, out: ${estimated.output})\n` +
    `  Actual:    ${actualTotal} tokens (in: ${actual.inputTokens}, out: ${actual.outputTokens})\n` +
    `  Difference: ${difference > 0 ? '+' : ''}${difference} (${percentDiff}%)`
  );
}

/**
 * Calculate total estimated tokens for a request
 */
export function calculateTotalEstimate(
  inputTokens: number,
  outputTokens: number
): number {
  return inputTokens + outputTokens;
}
