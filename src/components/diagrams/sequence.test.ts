import { describe, expect, it } from 'vitest';

import { parseSequence } from './sequence';

describe('parseSequence', () => {
  it('reads participants, messages of each style, notes and a title', () => {
    const { diagram, errors } = parseSequence(`
      title: Login
      participant B as Browser
      participant S as Web server
      B -> S: POST /login
      S --> B: 302 Found
      note B: stores the cookie
      B -x S: forged request
      note: all traffic uses TLS
    `);
    expect(errors).toEqual([]);
    expect(diagram.title).toBe('Login');
    expect(diagram.participants).toEqual([
      { id: 'B', label: 'Browser' },
      { id: 'S', label: 'Web server' },
    ]);
    expect(diagram.steps.map((s) => (s.kind === 'message' ? s.style : 'note'))).toEqual([
      'request',
      'response',
      'note',
      'blocked',
      'note',
    ]);
  });

  it('creates participants on first use, in order', () => {
    const { diagram } = parseSequence(
      'Client -> DNS: where is example.com?\nDNS --> Client: 192.0.2.10',
    );
    expect(diagram.participants.map((p) => p.id)).toEqual(['Client', 'DNS']);
  });

  it('reports lines it cannot read and notes over unknown participants', () => {
    const { errors } = parseSequence('A -> B: hi\nthis is not valid\nnote Z: who?');
    expect(errors).toHaveLength(2);
    expect(errors[0]).toMatch(/Line 2/);
    expect(errors[1]).toMatch(/unknown participant "Z"/);
  });

  it('keeps colons inside message text', () => {
    const { diagram } = parseSequence('A -> B: Host: shop.example');
    expect(diagram.steps[0]).toMatchObject({ text: 'Host: shop.example' });
  });
});
