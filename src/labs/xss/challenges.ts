import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';

const lab = 'xss';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'xss-fire',
    labId: lab,
    title: 'Make it run',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['WEB-05'],
    prompt:
      'The comment page echoes your text straight into the HTML. On the **Comment** tab, leave rendering set to **Vulnerable**, post one of the preset payloads, and get it to execute inside the sandbox. The lab marks this solved the moment the sandbox reports that your payload ran.',
    hints: [
      'A `<script>` tag runs when the page is parsed; an `<img src=x onerror=…>` runs when the broken image fails to load.',
      'The payloads only send a harmless signal back to the lab — nothing leaves your browser.',
    ],
    solution:
      'Because the comment is inserted as raw HTML, the browser treats your `<script>` or `<img onerror>` as real markup and runs it. That is reflected/stored cross-site scripting: the server handed attacker-controlled text to the browser as code. In a real app that code would run with the victim&rsquo;s session and could read cookies, make requests, or rewrite the page.',
  },
  {
    id: 'xss-escape',
    labId: lab,
    title: 'What the browser sees',
    difficulty: 'beginner',
    points: 15,
    kind: 'answer',
    topicIds: ['WEB-05', 'WEB-07'],
    prompt:
      'Output encoding replaces HTML-significant characters with entities so they display as text instead of markup. **What does a `<` character become** once it is HTML-escaped?',
    hints: [
      'Switch rendering to Safe and look at how the same payload is shown.',
      'It is a four-character HTML entity that starts with an ampersand and ends with a semicolon.',
    ],
    acceptedHashes: [hashAnswer('&lt;'), hashAnswer('lt'), hashAnswer('&lt'), hashAnswer('lt;')],
    solution:
      'A `<` becomes `&lt;`. Once escaped, the browser renders the literal characters `<script>` as visible text rather than starting a tag, so the payload can never open an element or an event handler. Encoding the five HTML-significant characters (ampersand, less-than, greater-than, and the two quote marks) for the HTML context is the core defense.',
  },
  {
    id: 'xss-fix',
    labId: lab,
    title: 'Neutralize it',
    difficulty: 'intermediate',
    points: 20,
    kind: 'task',
    topicIds: ['WEB-07'],
    prompt:
      'Switch rendering to **Safe** and post the same payload again. Confirm from the grade panel that **every** preset payload is now inert. The lab marks this solved once the safe renderer reports all payloads neutralized.',
    hints: [
      'Safe mode escapes the comment before it reaches the page.',
      'The sandbox should show your payload as plain text and report no execution.',
    ],
    solution:
      'Escaping the comment on output turns every payload into harmless text, so none of them execute. The fix belongs at the point where data is written into the page, encoded for that specific context (HTML body, attribute, URL, or JavaScript) — not at input, where you cannot yet know how the value will later be used.',
  },
  {
    id: 'xss-defense',
    labId: lab,
    title: 'Name the fix',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['WEB-07'],
    prompt:
      'In a few words, **what is the primary defense** against this kind of XSS — the technique that makes user input render as text instead of markup?',
    hints: [
      'It is what Safe mode does to the comment before inserting it.',
      'Also called escaping; it is applied on output, for the context the data lands in.',
    ],
    acceptedHashes: [
      hashAnswer('output encoding'),
      hashAnswer('encoding'),
      hashAnswer('escaping'),
      hashAnswer('output escaping'),
      hashAnswer('html encoding'),
      hashAnswer('html escaping'),
      hashAnswer('contextual output encoding'),
      hashAnswer('contextual encoding'),
      hashAnswer('escaping output'),
      hashAnswer('encode output'),
    ],
    solution:
      'Contextual output encoding (escaping) is the primary defense: encode untrusted data for the exact context it is written into, at the moment it is written. Modern frameworks (React, Angular, Vue) do this automatically for HTML text, which is why you must be careful with escape hatches like `dangerouslySetInnerHTML`.',
  },
  {
    id: 'xss-csp',
    labId: lab,
    title: 'Defense in depth',
    difficulty: 'intermediate',
    points: 15,
    kind: 'answer',
    topicIds: ['WEB-07'],
    prompt:
      'Even when output encoding is missed, a strict policy on the response can stop an injected script from running. **Name the HTTP response header** that restricts which scripts a page is allowed to execute, as a second layer of defense.',
    hints: [
      'It is set by the server on the response and read by the browser.',
      'Its common three-letter abbreviation is CSP.',
    ],
    acceptedHashes: [
      hashAnswer('content-security-policy'),
      hashAnswer('content security policy'),
      hashAnswer('csp'),
      hashAnswer('content-security-policy header'),
    ],
    solution:
      'A Content-Security-Policy (CSP) tells the browser which sources of script, style, and other content are allowed. A strong CSP (no inline script, no `unsafe-eval`, a tight `script-src`) can stop an injected payload from running even if encoding is missed. It is defense in depth, not a replacement for output encoding.',
  },
  {
    id: 'xss-type',
    labId: lab,
    title: 'Classify it',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['WEB-05'],
    prompt:
      'The payload here is saved as a comment and then runs for **everyone** who later views the page. **Which type of XSS** is that? (One word is enough.)',
    hints: [
      'Contrast it with reflected XSS, which only fires from a crafted link.',
      'The payload persists on the server and affects later visitors.',
    ],
    acceptedHashes: [
      hashAnswer('stored'),
      hashAnswer('stored xss'),
      hashAnswer('persistent'),
      hashAnswer('persistent xss'),
      hashAnswer('stored (persistent)'),
    ],
    solution:
      'This is stored (persistent) XSS: the payload is saved server-side and served to every later visitor, so one injection can hit many victims. Reflected XSS, by contrast, is echoed back from a single request and must be delivered per-victim (often via a crafted link); DOM-based XSS happens entirely in client-side JavaScript.',
  },
];
