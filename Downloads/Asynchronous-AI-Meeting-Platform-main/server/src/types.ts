export type UUID = string;

export interface Meeting {
  id: UUID;
  subject: string;
  details: string;
  createdAt: number;
  status: "pending" | "active" | "paused" | "completed";
}

export interface Participant {
  id: UUID;
  meetingId: UUID;
  email: string;
  inviteCode: string; // unique URL token
  initialInput?: string;
  submittedAt?: number;
}

export interface Whiteboard {
  keyFacts: string[];
  decisions: string[];
  actionItems: string[];
}

export interface ConversationTurn {
  id: UUID;
  meetingId: UUID;
  role: "moderator" | "persona" | "human";
  speaker: string; // email, persona name, or "host"
  content: string;
  createdAt: number;
}

export interface Report {
  id: UUID;
  meetingId: UUID;
  summary: string;
  highlights: string[];
  decisions: string[];
  actionItems: string[];
  visualMapMermaid: string;
  createdAt: number;
}

export interface MCP {
  identity: string;
  objectives: string[];
  rules: string[];
  outputFormat: string;
  tools?: string[]; // for moderator
}

export interface Persona {
  name: string;
  mcp: MCP;
}
