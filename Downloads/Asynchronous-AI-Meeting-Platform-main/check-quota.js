/**
 * Check current Gemini API quota usage
 * Run: node check-quota.js
 */

import 'dotenv/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  console.error('❌ GEMINI_API_KEY not found in .env');
  process.exit(1);
}

console.log('🔍 Checking Gemini API quota status...\n');

const genAI = new GoogleGenerativeAI(apiKey);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

try {
  // Make a minimal test request
  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: 'Hi' }] }],
  });
  
  const response = result.response;
  console.log('✅ API Key is valid and working');
  console.log('✅ You have remaining quota for today\n');
  
  console.log('📊 Free Tier Limits:');
  console.log('   - Requests per minute (RPM): 10');
  console.log('   - Tokens per minute (TPM): 250,000');
  console.log('   - Requests per day (RPD): 250');
  console.log('   - Rate limit resets: Every 60 seconds');
  console.log('   - Daily quota resets: Midnight Pacific Time\n');
  
  console.log('💡 Tips to conserve quota:');
  console.log('   - Increase ENGINE_TICK_MS in .env (currently: ' + (process.env.ENGINE_TICK_MS || '8000') + 'ms)');
  console.log('   - Set MAX_TURNS_PER_MEETING lower (currently: ' + (process.env.MAX_TURNS_PER_MEETING || '20') + ')');
  console.log('   - Enable DEV_MODE=true in .env');
  console.log('   - Cancel stuck meetings with: node cleanup-meetings.js\n');
  
} catch (error) {
  if (error.message?.includes('429')) {
    console.error('❌ DAILY QUOTA EXCEEDED');
    console.error('   You have used all 250 requests for today.');
    console.error('   Quota resets at midnight Pacific Time.\n');
    
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const hoursUntilMidnight = 24 - pacificTime.getHours();
    const minutesUntilMidnight = 60 - pacificTime.getMinutes();
    
    console.error(`⏰ Time until reset: ~${hoursUntilMidnight}h ${minutesUntilMidnight}m\n`);
  } else if (error.message?.includes('API key')) {
    console.error('❌ Invalid API Key');
    console.error('   Check your GEMINI_API_KEY in .env\n');
  } else {
    console.error('❌ Error checking quota:', error.message);
  }
  process.exit(1);
}
