import { MousePointerClick } from 'lucide-react';
import { lazy } from 'react';

import type { LabDefinition } from '../types';
import { challenges } from './challenges';

export const csrfClickjackingLab: LabDefinition = {
  id: 'csrf-clickjacking',
  title: 'CSRF and Clickjacking',
  tagline:
    'Forge a transfer with a cross-site request, hijack a click through a transparent frame, then shut both down.',
  description:
    'Two attacks that abuse a logged-in victim&rsquo;s browser. Fire a cross-site request forgery that rides the victim&rsquo;s session cookie to move money, then stop it with SameSite cookies and an anti-CSRF token. Then frame the real bank in a transparent layer to steal a click (clickjacking), and refuse the frame with a Content-Security-Policy frame-ancestors directive.',
  difficulty: 'intermediate',
  estimatedMinutes: 30,
  mode: 'simulation',
  engine: 'Deterministic browser and server trust model',
  topicIds: ['WEB-06', 'WEB-08', 'WEB-07'],
  icon: MousePointerClick,
  objectives: [
    'Forge a state-changing cross-site request that rides a session cookie',
    'Block CSRF by withholding the cookie with SameSite',
    'Block CSRF with an anti-CSRF token the attacker origin cannot read',
    'Hijack a click by framing the real site under a decoy',
    "Refuse framing with Content-Security-Policy frame-ancestors 'none'",
  ],
  component: lazy(() => import('./CsrfClickjackingLab')),
  challenges,
};
