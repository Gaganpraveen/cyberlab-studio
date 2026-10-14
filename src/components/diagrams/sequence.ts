/**
 * A tiny text format for sequence diagrams in lessons, rendered as SVG.
 *
 *   ```sequence
 *   title: Logging in with a session cookie
 *   participant B as Browser
 *   participant S as Server
 *   B -> S: POST /login
 *   S --> B: Set-Cookie: session=…
 *   note B: The browser stores the cookie
 *   B -x S: Forged request is rejected
 *   ```
 *
 * `->` is a request, `-->` a reply, `-x` a message that is blocked or
 * rejected. `note: …` spans every participant; `note B: …` sits over one.
 * Participants appear in order of declaration, then first use.
 */

export type MessageStyle = 'request' | 'response' | 'blocked';

export interface Participant {
  id: string;
  label: string;
}

export type SequenceStep =
  | { kind: 'message'; from: string; to: string; text: string; style: MessageStyle }
  | { kind: 'note'; over?: string; text: string };

export interface SequenceDiagram {
  title?: string;
  participants: Participant[];
  steps: SequenceStep[];
}

const ID = '[A-Za-z0-9_][\\w-]*';
const PARTICIPANT = new RegExp(`^participant\\s+(${ID})(?:\\s+as\\s+(.+))?$`, 'i');
const MESSAGE = new RegExp(`^(${ID})\\s*(-->|->|-x)\\s*(${ID})\\s*:\\s*(.+)$`);
const NOTE = new RegExp(`^note(?:\\s+(${ID}))?\\s*:\\s*(.+)$`, 'i');

const STYLE: Record<string, MessageStyle> = { '->': 'request', '-->': 'response', '-x': 'blocked' };

export function parseSequence(source: string): { diagram: SequenceDiagram; errors: string[] } {
  const diagram: SequenceDiagram = { participants: [], steps: [] };
  const errors: string[] = [];
  const known = new Map<string, Participant>();

  const ensure = (id: string) => {
    if (!known.has(id)) {
      const participant = { id, label: id };
      known.set(id, participant);
      diagram.participants.push(participant);
    }
  };

  source.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) return;

    const title = /^title\s*:\s*(.+)$/i.exec(line);
    if (title) {
      diagram.title = title[1]!.trim();
      return;
    }

    const participant = PARTICIPANT.exec(line);
    if (participant) {
      const id = participant[1]!;
      const label = participant[2]?.trim() || id;
      const existing = known.get(id);
      if (existing) existing.label = label;
      else {
        const created = { id, label };
        known.set(id, created);
        diagram.participants.push(created);
      }
      return;
    }

    const message = MESSAGE.exec(line);
    if (message) {
      const [, from, arrow, to, text] = message;
      ensure(from!);
      ensure(to!);
      diagram.steps.push({
        kind: 'message',
        from: from!,
        to: to!,
        text: text!.trim(),
        style: STYLE[arrow!]!,
      });
      return;
    }

    const note = NOTE.exec(line);
    if (note) {
      const over = note[1];
      if (over && !known.has(over)) {
        errors.push(`Line ${index + 1}: note over unknown participant "${over}"`);
        return;
      }
      diagram.steps.push(
        over
          ? { kind: 'note', over, text: note[2]!.trim() }
          : { kind: 'note', text: note[2]!.trim() },
      );
      return;
    }

    errors.push(`Line ${index + 1}: could not read "${line}"`);
  });

  if (diagram.participants.length === 0)
    errors.push('A sequence diagram needs at least one message');
  return { diagram, errors };
}
