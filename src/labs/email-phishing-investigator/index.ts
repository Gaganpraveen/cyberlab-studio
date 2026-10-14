import { MailWarning } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const emailPhishingInvestigatorLab: LabDefinition = {
  id: 'email-phishing-investigator',
  title: 'Email Phishing Investigator',
  tagline:
    'Read the headers, auth results, and links of three fictional messages and tell the two phishing attempts from the one that just sounds scary.',
  description:
    'A hands-on email-forensics triage over fictional messages. Inspect From addresses, Return-Path, SPF/DKIM/DMARC results, and link href-vs-text mismatches to classify each message as phishing or safe. One message is a domain-lookalike spoof that fails authentication, one is a display-name spoof whose real gmail sender passes its own auth, and one is a legitimate but urgent invoice — the false-positive trap. Scoring rewards evidence-based verdicts over tone, the core idea behind measuring a phishing program. Learn SPF, DKIM, DMARC, lookalike domains, and why false positives matter.',
  difficulty: 'intermediate',
  estimatedMinutes: 20,
  mode: 'simulation',
  engine: 'Deterministic email-forensics triage',
  topicIds: ['HUM-02', 'FOR-06'],
  icon: MailWarning,
  objectives: [
    'Read email headers: From, Return-Path, Reply-To, and the Received chain',
    'Interpret SPF, DKIM, and DMARC results and their limits',
    'Spot a lookalike sender domain and a display-name spoof',
    'Catch a link whose visible text points to a different host than its href',
    'Judge messages on evidence, not tone, and avoid false positives',
  ],
  component: lazy(() => import('./EmailPhishingLab')),
  challenges,
};
