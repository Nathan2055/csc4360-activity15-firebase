/**
 * Background queue for persona generation
 * Prevents N parallel LLM calls on meeting start
 */

import { generatePersonaFromInput } from "./gemini.js";
import { db } from "../db.js";
import { generateId, now, toJson } from "../util.js";
import { Persona, MCP } from "../types.js";

interface PersonaGenerationJob {
  meetingId: string;
  participantId: string;
  input: string;
  meetingSubject: string;
  timestamp: number;
}

export class PersonaQueue {
  private queue: PersonaGenerationJob[] = [];
  private processing = false;
  private activeJobs = new Map<string, Promise<void>>();
  
  /**
   * Queue persona generation for a meeting
   */
  async queuePersonaGeneration(
    meetingId: string,
    participantId: string,
    input: string,
    meetingSubject: string
  ): Promise<void> {
    // Check if already queued or processing
    const jobKey = `${meetingId}:${participantId}`;
    if (this.activeJobs.has(jobKey)) {
      return this.activeJobs.get(jobKey)!;
    }
    
    // Check if persona already exists
    const existing = db
      .prepare("SELECT id FROM personas WHERE meetingId = ? AND participantId = ?")
      .get(meetingId, participantId);
    
    if (existing) {
      console.log(`[PersonaQueue] Persona already exists for ${jobKey}`);
      return Promise.resolve();
    }
    
    // Create a promise that resolves when the persona is generated
    const promise = new Promise<void>((resolve, reject) => {
      this.queue.push({
        meetingId,
        participantId,
        input,
        meetingSubject,
        timestamp: now(),
      });
      
      // Store resolve/reject callbacks
      const originalJob = this.queue[this.queue.length - 1];
      (originalJob as any)._resolve = resolve;
      (originalJob as any)._reject = reject;
    });
    
    this.activeJobs.set(jobKey, promise);
    
    // Start processing if not already running
    if (!this.processing) {
      this.processQueue();
    }
    
    return promise;
  }
  
  /**
   * Queue all personas for a meeting
   */
  async queueAllPersonasForMeeting(
    meetingId: string,
    inputs: Array<{ participantId: string; content: string }>,
    meetingSubject: string
  ): Promise<void> {
    console.log(
      `[PersonaQueue] Queueing ${inputs.length} persona generations for meeting ${meetingId}`
    );
    
    const promises = inputs.map(inp =>
      this.queuePersonaGeneration(
        meetingId,
        inp.participantId,
        inp.content,
        meetingSubject
      )
    );
    
    // Don't wait for all to complete - they'll process in background
    Promise.all(promises).catch(error => {
      console.error(`[PersonaQueue] Error generating personas:`, error);
    });
  }
  
  /**
   * Process the queue sequentially
   */
  private async processQueue(): Promise<void> {
    if (this.processing) return;
    this.processing = true;
    
    console.log(`[PersonaQueue] Starting queue processing with ${this.queue.length} jobs`);
    
    while (this.queue.length > 0) {
      const job = this.queue.shift()!;
      const jobKey = `${job.meetingId}:${job.participantId}`;
      
      try {
        console.log(
          `[PersonaQueue] Processing persona generation for ${jobKey} ` +
          `(${this.queue.length} remaining in queue)`
        );
        
        // Generate persona (goes through rate limiter in gemini.ts)
        const { name, mcp } = await generatePersonaFromInput(
          job.input,
          job.meetingSubject
        );
        
        // Save to database
        const persona: Persona = {
          id: generateId("per"),
          meetingId: job.meetingId,
          participantId: job.participantId,
          role: "persona",
          name,
          mcp,
          createdAt: now(),
        };
        
        db.prepare(
          "INSERT INTO personas (id, meetingId, participantId, role, name, mcp, createdAt) " +
          "VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).run(
          persona.id,
          persona.meetingId,
          persona.participantId,
          persona.role,
          persona.name,
          toJson(persona.mcp),
          persona.createdAt
        );
        
        console.log(`[PersonaQueue] Successfully generated persona: ${name}`);
        
        // Resolve the promise
        if ((job as any)._resolve) {
          (job as any)._resolve();
        }
        
      } catch (error) {
        console.error(`[PersonaQueue] Error processing job ${jobKey}:`, error);
        
        // Reject the promise
        if ((job as any)._reject) {
          (job as any)._reject(error);
        }
      } finally {
        // Clean up active job tracking
        this.activeJobs.delete(jobKey);
      }
    }
    
    console.log('[PersonaQueue] Queue processing complete');
    this.processing = false;
  }
  
  /**
   * Check if all personas for a meeting have been generated
   */
  async areAllPersonasReady(meetingId: string, expectedCount: number): Promise<boolean> {
    const count = db
      .prepare(
        "SELECT COUNT(*) as count FROM personas WHERE meetingId = ? AND role = 'persona'"
      )
      .get(meetingId) as { count: number };
    
    return count.count >= expectedCount;
  }
  
  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      activeJobs: this.activeJobs.size,
    };
  }
}

// Singleton instance
export const personaQueue = new PersonaQueue();
