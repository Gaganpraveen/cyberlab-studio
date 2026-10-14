/**
 * A deterministic email-forensics model: a small set of fictional messages,
 * each with headers, authentication results (SPF/DKIM/DMARC), links, and a
 * ground-truth verdict. The learner reviews the evidence and classifies each
 * message as phishing or safe. Nothing is sent or fetched — every address,
 * header, and link is fictional and inert.
 *
 * Two messages are phishing (one domain-lookalike spoof that fails SPF/DMARC,
 * one display-name spoof whose real sender passes its own auth) and one is a
 * legitimate but urgent-sounding invoice (the false-positive trap). Scoring
 * rewards verdicts based on evidence, not tone — the core idea of phishing
 * measurement.
 */

export const PHISH_FLAG = 'CTF{headers_dont_lie}';

export type AuthState = 'pass' | 'fail' | 'none';

export interface MailLink {
  text: string;
  href: string;
}

export interface Indicator {
  label: string;
  detail: string;
}

export interface Email {
  id: string;
  subject: string;
  fromDisplay: string;
  fromAddr: string;
  returnPath: string;
  replyTo: string;
  received: string;
  spf: AuthState;
  dkim: AuthState;
  dmarc: AuthState;
  links: MailLink[];
  body: string;
  /** Ground truth. */
  isPhish: boolean;
  /** Red flags present in this message (empty for the legitimate one). */
  indicators: Indicator[];
}

export const EMAILS: Email[] = [
  {
    id: 'payroll-spoof',
    subject: 'Urgent: update your direct deposit before payroll closes',
    fromDisplay: 'Acme Payroll',
    fromAddr: 'payroll@acme-hr-portal.com',
    returnPath: 'bounce@mailer.sketchy-host.ru',
    replyTo: 'payroll@acme-hr-portal.com',
    received: 'from mail.sketchy-host.ru (unknown sender IP, not an Acme relay)',
    spf: 'fail',
    dkim: 'none',
    dmarc: 'fail',
    links: [{ text: 'https://acme.com/payroll', href: 'http://acme-hr-portal.com/login?u=emp' }],
    body: 'Payroll closes in 1 hour. Confirm your bank details now or your paycheck will be delayed.',
    isPhish: true,
    indicators: [
      {
        label: 'Lookalike sender domain',
        detail: 'acme-hr-portal.com is not the real acme.com domain.',
      },
      {
        label: 'SPF and DMARC fail',
        detail: 'The sending server is not authorized for the domain.',
      },
      {
        label: 'Return-Path to an unrelated host',
        detail: 'Replies and bounces go to a .ru host with no link to Acme.',
      },
      {
        label: 'Link text does not match the href',
        detail: 'The visible link says acme.com but points to acme-hr-portal.com.',
      },
      { label: 'Urgency and financial pretext', detail: 'Pressure to act fast about money.' },
    ],
  },
  {
    id: 'it-reset',
    subject: 'Mailbox full — re-authenticate now to keep receiving mail',
    fromDisplay: 'IT Help Desk (it@acme.com)',
    fromAddr: 'acme.it.support.9921@gmail.com',
    returnPath: 'acme.it.support.9921@gmail.com',
    replyTo: 'acme.it.support.9921@gmail.com',
    received: 'from mail-sor.google.com (a genuine Gmail relay)',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    links: [{ text: 'Verify account', href: 'https://acme-sso.verify-now.xyz/login' }],
    body: 'Your mailbox is full. Re-authenticate within 24 hours or lose access.',
    isPhish: true,
    indicators: [
      {
        label: 'Display-name spoof',
        detail: 'The name claims it@acme.com but the real address is a gmail.com account.',
      },
      {
        label: 'Auth passes for the wrong domain',
        detail:
          'SPF/DKIM/DMARC pass for gmail.com — not for acme.com. Auth proves the sender, not the brand.',
      },
      {
        label: 'Link to an unrelated domain',
        detail: 'acme-sso.verify-now.xyz has nothing to do with acme.com.',
      },
      { label: 'Urgency and access threat', detail: 'Act within 24 hours or lose access.' },
    ],
  },
  {
    id: 'legit-invoice',
    subject: 'Action required: invoice #4471 is overdue',
    fromDisplay: 'Acme Billing',
    fromAddr: 'billing@acme.com',
    returnPath: 'billing@acme.com',
    replyTo: 'billing@acme.com',
    received: 'from mail.acme.com (an authorized Acme relay)',
    spf: 'pass',
    dkim: 'pass',
    dmarc: 'pass',
    links: [{ text: 'https://acme.com/invoices/4471', href: 'https://acme.com/invoices/4471' }],
    body: 'Invoice #4471 is 14 days overdue. Please review it in the billing portal.',
    isPhish: false,
    indicators: [],
  },
];

export type Verdict = 'phish' | 'safe';

export function correctVerdict(email: Email): Verdict {
  return email.isPhish ? 'phish' : 'safe';
}

export function isCorrect(email: Email, verdict: Verdict): boolean {
  return verdict === correctVerdict(email);
}

export interface TriageScore {
  decided: number;
  correct: number;
  total: number;
  falsePositives: number;
  falseNegatives: number;
  allCorrect: boolean;
  flag?: string;
}

/** Score a set of verdicts (email id -> verdict). */
export function scoreTriage(verdicts: Record<string, Verdict>): TriageScore {
  let correct = 0;
  let falsePositives = 0;
  let falseNegatives = 0;
  let decided = 0;
  for (const email of EMAILS) {
    const v = verdicts[email.id];
    if (!v) continue;
    decided += 1;
    if (isCorrect(email, v)) correct += 1;
    else if (v === 'phish' && !email.isPhish) falsePositives += 1;
    else if (v === 'safe' && email.isPhish) falseNegatives += 1;
  }
  const total = EMAILS.length;
  const allCorrect = correct === total;
  return {
    decided,
    correct,
    total,
    falsePositives,
    falseNegatives,
    allCorrect,
    ...(allCorrect ? { flag: PHISH_FLAG } : {}),
  };
}

/** A link is deceptive when its visible text is a URL to a different host than its href. */
export function linkIsDeceptive(link: MailLink): boolean {
  const host = (s: string): string | null => {
    const m = s.match(/^https?:\/\/([^/]+)/i);
    return m && m[1] ? m[1].toLowerCase() : null;
  };
  const textHost = host(link.text);
  const hrefHost = host(link.href);
  if (!textHost || !hrefHost) return false;
  return textHost !== hrefHost;
}
