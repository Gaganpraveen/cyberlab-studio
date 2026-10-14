import { hashAnswer } from '../answers';
import type { ChallengeDefinition } from '../types';
import { PHISH_FLAG } from './engine';

const lab = 'email-phishing-investigator';

export const challenges: ChallengeDefinition[] = [
  {
    id: 'phish-flag',
    labId: lab,
    title: 'Triage the inbox',
    difficulty: 'intermediate',
    points: 25,
    kind: 'flag',
    topicIds: ['FOR-06'],
    prompt:
      'Classify all three messages correctly — the two phishing attempts as phishing and the real one as safe. Get all three right and a flag appears. Submit it.',
    hints: [
      'Judge on evidence (headers, auth, links), not on how urgent the message sounds.',
      'One message is scary but legitimate: real domain, all auth passes, link matches.',
    ],
    acceptedHashes: [hashAnswer(PHISH_FLAG)],
    solution: `The two phishing messages give themselves away in the headers — a lookalike sender domain that fails SPF/DMARC, and a display name that claims to be IT while the real address is a gmail account. The overdue invoice looks alarming but every check passes, so it is safe. The flag is **${PHISH_FLAG}**. Phishing triage is evidence over tone.`,
  },
  {
    id: 'phish-report-spoof',
    labId: lab,
    title: 'Catch the domain spoof',
    difficulty: 'beginner',
    points: 15,
    kind: 'task',
    topicIds: ['FOR-06'],
    prompt:
      'Report the payroll message (the one from acme-hr-portal.example) as phishing. The lab marks this solved when you classify it correctly.',
    hints: [
      'Compare the sender domain to the real one, and read the SPF/DMARC results.',
      'acme-hr-portal.example is not acme.example, and its auth fails.',
    ],
    solution:
      'The payroll message is a domain-lookalike spoof: acme-hr-portal.example is a different domain from acme.example, SPF and DMARC both fail, the Return-Path points to an unrelated external host (sketchy-host.test), and the visible link text (acme.example) does not match its href. Any one of these is a red flag; together they are conclusive.',
  },
  {
    id: 'phish-spf',
    labId: lab,
    title: 'Name the sender check',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['FOR-06'],
    prompt:
      'Which email-authentication check verifies that the connecting server&rsquo;s IP is authorized to send for the envelope-sender domain (the Return-Path / MAIL FROM)? (Three-letter acronym.)',
    hints: ['It is a DNS TXT record listing allowed senders.', 'Sender Policy Framework.'],
    acceptedHashes: [hashAnswer('SPF'), hashAnswer('sender policy framework')],
    solution:
      '**SPF** (Sender Policy Framework) is a DNS record naming which servers may send mail for a domain. The receiver checks the connecting IP against it. SPF alone is weak (it checks the envelope, not the visible From), which is why DKIM and DMARC exist.',
  },
  {
    id: 'phish-dmarc',
    labId: lab,
    title: 'Name the alignment policy',
    difficulty: 'intermediate',
    points: 10,
    kind: 'answer',
    topicIds: ['FOR-06'],
    prompt:
      'Which policy ties SPF and DKIM to the visible From domain and tells receivers what to do (none / quarantine / reject) when they fail? (Five-letter acronym.)',
    hints: [
      'It adds alignment and a reporting feedback loop on top of SPF and DKIM.',
      'Domain-based Message Authentication, Reporting and Conformance.',
    ],
    acceptedHashes: [hashAnswer('DMARC'), hashAnswer('dmarc')],
    solution:
      '**DMARC** ties SPF and DKIM results to the domain the user actually sees (alignment) and publishes a policy — none, quarantine, or reject — plus a reporting channel. A domain with `p=reject` makes the payroll-style lookalike much harder, because receivers drop unaligned mail.',
  },
  {
    id: 'phish-lookalike',
    labId: lab,
    title: 'Name the imitation domain',
    difficulty: 'beginner',
    points: 10,
    kind: 'answer',
    topicIds: ['HUM-02'],
    prompt:
      'A domain registered to imitate a real one — like payrnents.example for payments.example, or acme-hr-portal.example for acme.example — is generally called a ____ domain. (One word; related terms accepted.)',
    hints: [
      'It looks almost right at a glance.',
      'Typosquat / lookalike / homograph all describe it.',
    ],
    acceptedHashes: [
      hashAnswer('lookalike'),
      hashAnswer('lookalike domain'),
      hashAnswer('typosquat'),
      hashAnswer('typosquatting'),
      hashAnswer('homograph'),
      hashAnswer('cousin domain'),
    ],
    solution:
      'A **lookalike** (or typosquat / cousin / homograph) domain imitates a trusted one so a glance accepts it. Defenses: register the obvious variants, show the real domain prominently, and teach users to read the full address, not the display name.',
  },
  {
    id: 'phish-fp',
    labId: lab,
    title: 'Name the measurement mistake',
    difficulty: 'intermediate',
    points: 10,
    kind: 'answer',
    topicIds: ['HUM-02'],
    prompt:
      'Reporting the legitimate overdue-invoice email as phishing is an example of a ____ — flagging something benign as malicious. (Two words.)',
    hints: [
      'Same term as in detection metrics.',
      'Too many of these erode trust in the report button.',
    ],
    acceptedHashes: [
      hashAnswer('false positive'),
      hashAnswer('a false positive'),
      hashAnswer('false positives'),
      hashAnswer('false alarm'),
    ],
    solution:
      'Flagging a legitimate message as phishing is a **false positive**. Phishing programs are measured on both catch rate and false positives: if reporting real mail gets people scolded, they stop reporting, and the real phish gets through. Good training rewards evidence-based judgment, not blanket suspicion.',
  },
];
