import { nanoid } from 'nanoid';
import { getReportByMeeting, insertReport, listTurns } from './db.js';
import type { UUID, Report, ConversationTurn } from './types.js';
import { generateText } from './gemini.js';

export async function ensureReport(meetingId: UUID): Promise<Report> {
  const existing = getReportByMeeting(meetingId) as Report | undefined;
  if (existing) return existing;

  const turns = listTurns(meetingId) as ConversationTurn[];
  const transcript = turns.map(t => `${t.speaker}: ${t.content}`).join('\n');

  const summaryText = await generateText({
    system: 'You create structured meeting summaries for executives.',
    prompt: `Summarize the following transcript. Provide JSON with fields: summary, highlights[string[]], decisions[string[]], actionItems[string[]].\n\n${transcript}`,
  });

  let summary = summaryText;
  let highlights: string[] = [];
  let decisions: string[] = [];
  let actionItems: string[] = [];
  try {
    const j = JSON.parse(summaryText.replace(/^```(json)?/,'').replace(/```$/,''));
    summary = j.summary || summary;
    if (Array.isArray(j.highlights)) highlights = j.highlights;
    if (Array.isArray(j.decisions)) decisions = j.decisions;
    if (Array.isArray(j.actionItems)) actionItems = j.actionItems;
  } catch {}

  const mermaid = buildMermaidFromTurns(turns);

  const report: Report = {
    id: nanoid(),
    meetingId,
    summary,
    highlights,
    decisions,
    actionItems,
    visualMapMermaid: mermaid,
    createdAt: Date.now(),
  };
  insertReport.run({ ...report, highlights: JSON.stringify(report.highlights), decisions: JSON.stringify(report.decisions), actionItems: JSON.stringify(report.actionItems) });
  return report;
}

function buildMermaidFromTurns(turns: ConversationTurn[]): string {
  // Simple conversation graph
  const nodes = new Set<string>();
  const edges: Array<[string,string]> = [];
  for (let i = 0; i < turns.length - 1; i++) {
    const a = turns[i].speaker;
    const b = turns[i+1].speaker;
    nodes.add(a); nodes.add(b);
    edges.push([a,b]);
  }
  let mermaid = 'graph LR\n';
  for (const n of nodes) mermaid += ` ${nodeId(n)}[${escapeLabel(n)}]\n`;
  for (const [a,b] of edges) mermaid += ` ${nodeId(a)} --> ${nodeId(b)}\n`;
  return mermaid;
}

function nodeId(name: string): string {
  return name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
}

function escapeLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}
