import type { UUID, ConversationTurn } from './types.js';
import { Response } from 'express';

export interface Client {
  meetingId: UUID;
  res: Response;
}

const clients: Client[] = [];

export function addClient(meetingId: UUID, res: Response) {
  clients.push({ meetingId, res });
  res.on('close', () => {
    const idx = clients.findIndex((c) => c.res === res);
    if (idx >= 0) clients.splice(idx, 1);
  });
}

export function broadcastTurn(turn: ConversationTurn) {
  const data = JSON.stringify(turn);
  for (const c of clients) {
    if (c.meetingId === turn.meetingId) {
      c.res.write(`event: turn\n`);
      c.res.write(`data: ${data}\n\n`);
    }
  }
}

export function broadcastStatus(meetingId: UUID, status: string) {
  const payload = JSON.stringify({ type: 'status', status });
  for (const c of clients) {
    if (c.meetingId === meetingId) {
      c.res.write(`event: status\n`);
      c.res.write(`data: ${payload}\n\n`);
    }
  }
}
