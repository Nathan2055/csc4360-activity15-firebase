import "dotenv/config";
import http from "node:http";
import { app } from "./routes.js";
import { createRealtime } from "./realtime.js";
import { setBroadcasters } from "./realtimeBus.js";
import { createAuthRoutes } from "./auth.js";

createAuthRoutes(app);

const server = http.createServer(app);
const realtime = createRealtime(server);
setBroadcasters(realtime);
export { realtime };

const PORT = Number(process.env.PORT || 4000);
server.listen(PORT, () => {
  console.log(`A²MP backend running on http://localhost:${PORT}`);
  
  // Show development mode status
  if (process.env.DEV_MODE === 'true') {
    console.log('📊 Development Mode: Enabled');
    console.log(`   - Engine tick: ${process.env.ENGINE_TICK_MS || 8000}ms`);
    console.log(`   - Max turns per meeting: ${process.env.MAX_TURNS_PER_MEETING || 20}`);
    console.log('   - API quota per key: 15 RPM, 1M TPM, 1500 RPD (Free tier)');
  }
});

// Lightweight engine loop to advance meetings periodically
import { db } from "./db.js";
import { getMeeting } from "./services/meetingService.js";
import { runOneTurn, attemptConclusion, generateFinalReport } from "./services/conversationService.js";

const TICK_MS = Number(process.env.ENGINE_TICK_MS || 8000);
setInterval(async () => {
  try {
    const rows = db.prepare("SELECT id, status FROM meetings WHERE status = 'running'").all() as { id: string; status: string }[];
    
    if (rows.length === 0) {
      // Only log occasionally to avoid spam
      if (Math.random() < 0.1) { // 10% chance
        console.log('[Engine] No active meetings');
      }
    }
    
    for (const r of rows) {
      try {
        const meeting = getMeeting(r.id);
        
        // Double-check status (might have changed since query)
        if (meeting.status !== 'running') {
          console.log(`[Engine] Meeting ${r.id} status changed to ${meeting.status}, skipping`);
          continue;
        }
        
        const result = await runOneTurn(meeting, []);
        
        // Check if meeting was paused by repetition detection
        if (result.paused) {
          console.log(`[Engine] Meeting ${r.id} was auto-paused - waiting for human input`);
          continue;
        }
        
        if (result.waiting) {
          console.log(`[Engine] Meeting ${r.id} is waiting (${result.moderatorNotes})`);
          continue;
        }
        
        if (result.concluded) {
          // Meeting concluded directly (e.g., max turns, moderator selected "none")
          console.log(`[Engine] Meeting ${r.id} concluded - generating final report`);
          
          // Verify meeting is still running before generating report
          const finalCheck = getMeeting(r.id);
          if (finalCheck.status !== 'running') {
            console.warn(`[Engine] Meeting ${r.id} status changed to ${finalCheck.status} - skipping report generation`);
            continue;
          }
          
          await generateFinalReport(finalCheck);
          continue;
        }
        
        // If not concluded yet, check if we should conclude
        // Re-fetch meeting in case status changed during runOneTurn
        const updatedMeeting = getMeeting(r.id);
        if (updatedMeeting.status !== 'running') {
          console.log(`[Engine] Meeting ${r.id} status changed during turn, skipping conclusion check`);
          continue;
        }
        
        const check = await attemptConclusion(updatedMeeting);
        if (check.conclude) {
          console.log(`[Engine] Meeting ${r.id} ready to conclude - generating final report`);
          
          // Triple-check status before generating report (meeting could have been paused during attemptConclusion)
          const preReportCheck = getMeeting(r.id);
          if (preReportCheck.status !== 'running') {
            console.warn(`[Engine] Meeting ${r.id} status changed to ${preReportCheck.status} after conclusion check - skipping report`);
            continue;
          }
          
          await generateFinalReport(preReportCheck);
        }
      } catch (meetingErr) {
        console.error(`Engine loop error for meeting ${r.id}:`, meetingErr);
        // Continue processing other meetings rather than crashing entire loop
      }
    }
  } catch (err) {
    console.error("Engine loop error", err);
  }
}, TICK_MS);
