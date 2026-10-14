import { describe, expect, it } from 'vitest';

import { expandWikiLinks } from './Markdown';

describe('expandWikiLinks', () => {
  it('turns a bare term id into a link labelled with its words', () => {
    expect(expandWikiLinks('Turn on [[stack-canary]] checks.')).toBe(
      'Turn on [stack canary](term:stack-canary) checks.',
    );
  });

  it('uses the display text after the pipe', () => {
    expect(expandWikiLinks('[[aslr|Address randomization]]')).toBe(
      '[Address randomization](term:aslr)',
    );
  });

  it('reads the escaped pipe that table cells need', () => {
    expect(expandWikiLinks('| [[nx-bit\\|NX bit]] | blocks code on the stack |')).toBe(
      '| [NX bit](term:nx-bit) | blocks code on the stack |',
    );
  });

  it('leaves ordinary brackets alone', () => {
    const text = 'Indexes like grid[i][j] and [[Not a term]] stay as written.';
    expect(expandWikiLinks(text)).toBe(text);
  });
});
