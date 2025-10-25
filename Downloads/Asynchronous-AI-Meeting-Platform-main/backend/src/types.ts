export type UUID = string;

export type MeetingStatus =
  | "awaiting_inputs"
  | "running"
  | "paused"
  | "completed";

export interface Meeting {
  id: UUID;
  subject: string;
  details: string;
  createdAt: number;
  status: MeetingStatus;
  whiteboard: Whiteboard;
}

export interface Participant {
  id: UUID;
  meetingId: UUID;
  email: string;
  token: string;
  hasSubmitted: boolean;
  createdAt: number;
}

export interface ParticipantInput {
  id: UUID;
  participantId: UUID;
  content: string;
  createdAt: number;
}

export interface Persona {
  id: UUID;
  meetingId: UUID;
  participantId?: UUID | null;
  role: "persona" | "moderator";
  name: string;
  mcp: MCP;
  createdAt: number;
}

export interface ConversationTurn {
  id: UUID;
  meetingId: UUID;
  speaker: string; // e.g., "Moderator", "AI:Alice", "Human:Host"
  message: string;
  createdAt: number;
  metadata?: Record<string, unknown> | null;
}

export interface Report {
  id: UUID;
  meetingId: UUID;
  summary: string;
  highlights: string[];
  decisions: string[];
  actionItems: string[];
  visualMap: ConversationGraph;
  createdAt: number;
}

export interface Whiteboard {
  keyFacts: string[];
  decisions: string[];
  actionItems: string[];
}

export interface ConversationGraph {
  nodes: { id: string; label: string }[];
  edges: { from: string; to: string }[];
}

// MCP structures
export interface MCP {
  identity: string;
  objectives: string[];
  rules: string[];
  outputFormat: string; // brief guidance text for the LLM's output
  tools?: string[]; // tool names available (for moderator)
}
